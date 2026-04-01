/**
 * banking-search.ts
 * @author Koushik R.
 *
 * The <banking-search> custom element — a framework-agnostic smart search
 * component for banking applications. Supports grouped results, filter chips,
 * keyboard navigation, light/dark/auto theming, and full WCAG AA accessibility.
 *
 * Built with Lit for reactive rendering and Shadow DOM style isolation.
 * No third-party positioning libraries — layout is hand-rolled via
 * getBoundingClientRect() + position: fixed + ResizeObserver.
 */

import { LitElement, html, nothing } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

import { styles } from './banking-search.styles.js';
import { icon } from './banking-search.icons.js';
import { highlight } from '../../utils/highlight.js';
import { debounce } from '../../utils/debounce.js';
import { computePosition } from '../../utils/positioning.js';
import type { DebouncedFn } from '../../utils/debounce.js';
import type {
  SearchResults,
  SearchResultItem,
  SearchResultGroup,
  FilterOption,
  RenderItemFn,
  BsSearchDetail,
  BsSelectDetail,
  BsFilterChangeDetail,
  BsRetryDetail,
  BsErrorDetail,
  BsLoadMoreDetail,
} from './banking-search.types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Number of filter chips shown before the "+N more" toggle button appears.
 * Keeps the filter bar to a single compact row on first render.
 */
const FILTERS_VISIBLE = 4;

// ---------------------------------------------------------------------------
// Type guard — distinguishes flat vs grouped results
// ---------------------------------------------------------------------------
function isGrouped(results: SearchResults): results is SearchResultGroup[] {
  return (
    results.length > 0 &&
    typeof (results[0] as SearchResultGroup).groupId === 'string'
  );
}

// ---------------------------------------------------------------------------
// Error code → human-safe display message
// Never display raw server error strings — always map to these safe messages.
// ---------------------------------------------------------------------------
const ERROR_MESSAGES: Record<string, string> = {
  network:      'Unable to connect. Check your connection and try again.',
  timeout:      'Search is taking longer than expected. Try a more specific term.',
  'rate-limited': 'Too many requests. Please wait a moment and try again.',
  unauthorized: 'You do not have permission to perform this search.',
  server:       'Something went wrong on our end. Please try again.',
  unknown:      'An unexpected error occurred. Please try again.',
};

function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? code;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class BankingSearch extends LitElement {
  static override styles = styles;

  // -------------------------------------------------------------------------
  // Reflected attributes — set via HTML or JS property
  // -------------------------------------------------------------------------

  /** Placeholder text shown inside the search input. */
  @property({ type: String })
  placeholder = 'Search...';

  /**
   * Milliseconds to wait after the user stops typing before firing bs:search.
   * Attribute: debounce-ms
   */
  @property({ type: Number, attribute: 'debounce-ms' })
  debounceMs = 300;

  /**
   * Minimum characters required before bs:search fires.
   * Below this threshold the hint text is shown instead.
   * Attribute: min-chars
   */
  @property({ type: Number, attribute: 'min-chars' })
  minChars = 2;

  /**
   * Number of results to render per page / batch.
   * Controls both the initial visible count and how many more are loaded
   * each time the user scrolls to the bottom of the dropdown.
   * Attribute: page-size
   */
  @property({ type: Number, attribute: 'page-size' })
  pageSize = 10;

  /**
   * Set by the host to indicate the server has more pages beyond what is
   * currently in `results`. When true and the user scrolls to the bottom,
   * the component fires `bs:load-more` so the host can fetch the next page.
   * Attribute: has-more (boolean)
   */
  @property({ type: Boolean, attribute: 'has-more', reflect: true })
  hasMore = false;

  /**
   * Color scheme. 'auto' follows the OS prefers-color-scheme media query.
   * Reflected so CSS :host([theme="dark"]) selectors work.
   * Attribute: theme
   */
  @property({ type: String, reflect: true })
  theme: 'light' | 'dark' | 'auto' = 'auto';

  /**
   * Shows a loading skeleton in the dropdown while the host fetch is in-flight.
   * Attribute: loading (boolean)
   */
  @property({ type: Boolean, reflect: true })
  loading = false;

  /**
   * Disables all interaction.
   * Attribute: disabled (boolean)
   */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * When true, matched substrings in result titles are wrapped in <mark>.
   * Attribute: highlight-matches
   */
  @property({ type: Boolean, attribute: 'highlight-matches' })
  highlightMatches = true;

  /**
   * Message shown when results is an empty array.
   * Attribute: no-results-text
   */
  @property({ type: String, attribute: 'no-results-text' })
  noResultsText = 'No results found';

  /**
   * aria-label on the input element (i18n support).
   * Attribute: search-label
   */
  @property({ type: String, attribute: 'search-label' })
  searchLabel = 'Search';

  /**
   * Hint shown below the input when fewer than minChars have been typed.
   * Use "{n}" as a token — replaced with the minChars value at render time.
   * Attribute: hint
   */
  @property({ type: String })
  hint = 'Type {n}+ characters to search';

  /**
   * Error code or safe display message set by the host after a failed fetch.
   * Mapped to human-safe strings via ERROR_MESSAGES.
   * Attribute: error
   */
  @property({ type: String, reflect: true })
  error: string | null = null;

  // -------------------------------------------------------------------------
  // JavaScript-only properties
  // -------------------------------------------------------------------------

  /**
   * Search results — set by the host after a bs:search event.
   * Accepts flat SearchResultItem[] or grouped SearchResultGroup[].
   * Reference-equality guard prevents unnecessary re-renders.
   */
  get results(): SearchResults {
    return this._results;
  }
  set results(value: SearchResults) {
    if (value === this._results) return;
    this._results = value;
    // When the host appends a new page of results, expand the visible window
    // to show the newly added items and mark the in-flight request as done.
    if (this._loadingMore) {
      this._visibleCount += this.pageSize;
      this._loadingMore = false;
    }
    this.requestUpdate('results');
  }
  private _results: SearchResults = [];

  /**
   * Filter chips shown in the filter bar.
   * Set by the host: el.filters = [{ id: 'all', label: 'All' }, ...]
   */
  get filters(): FilterOption[] {
    return this._filters;
  }
  set filters(value: FilterOption[]) {
    if (value === this._filters) return;
    this._filters = value;
    this.requestUpdate('filters');
  }
  private _filters: FilterOption[] = [];

  /**
   * Optional custom item renderer.
   * When set, called per result item instead of the built-in template.
   * Must return a plain HTMLElement — do not use innerHTML with user data.
   */
  renderItem: RenderItemFn | null = null;

  // -------------------------------------------------------------------------
  // Internal reactive state — changes trigger re-render
  // -------------------------------------------------------------------------

  @state() private _open = false;
  @state() private _activeIndex = -1;
  @state() private _activeFilter = 'all';
  @state() private _offline = false;
  @state() private _inputValue = '';

  /** How many results are currently rendered. Starts at pageSize, grows on each load. */
  @state() private _visibleCount = 0;

  /** Current page number sent in bs:load-more (1-based). */
  @state() private _page = 1;

  /** True while a bs:load-more request is in-flight — prevents duplicate fires. */
  @state() private _loadingMore = false;

  /** Whether the filter bar is showing all chips or only the first FILTERS_VISIBLE. */
  @state() private _filtersExpanded = false;

  // -------------------------------------------------------------------------
  // Shadow DOM element refs (resolved after first render)
  // -------------------------------------------------------------------------

  @query('.search-wrapper') private _wrapperEl!: HTMLElement;
  @query('.dropdown')       private _dropdownEl!: HTMLElement;

  // -------------------------------------------------------------------------
  // Private internals — not reactive, managed manually
  // -------------------------------------------------------------------------

  private _debounced: DebouncedFn<[string]> | null = null;

  /** Monotonic counter — increments on each search, used to detect stale responses. */
  private _searchSeq = 0;

  /** requestAnimationFrame ID for scroll/resize position updates. */
  private _rafId = 0;

  /** ResizeObserver watches the host element for size changes. */
  private _resizeObserver: ResizeObserver | null = null;

  /**
   * IntersectionObserver watches the sentinel element at the bottom of the
   * results list. Uses root: _dropdownEl (not the viewport) because the
   * dropdown is overflow-y: auto — items are clipped by the dropdown container,
   * not the viewport, so viewport-based intersection would never fire.
   */
  private _sentinelObserver: IntersectionObserver | null = null;

  /**
   * Scroll parents detected in connectedCallback.
   * We register passive scroll listeners on each so the dropdown repositions
   * correctly when the component is inside a scrollable container.
   */
  private _scrollParents: Element[] = [];

  // -------------------------------------------------------------------------
  // Bound handler references
  // Stored as arrow-function fields so the SAME reference is used for both
  // addEventListener and removeEventListener. Arrow functions also bind `this`.
  // -------------------------------------------------------------------------

  /**
   * Closes the dropdown when focus genuinely leaves the component.
   *
   * Why focusout + relatedTarget instead of pointerdown on document:
   *  - No document-level listener needed — focusout bubbles, registered on `this`.
   *  - Handles keyboard Tab-away naturally — pointerdown would miss that entirely.
   *  - Simpler cleanup — no document.removeEventListener needed.
   *
   * Why relatedTarget instead of composedPath():
   *  - relatedTarget is where focus is GOING — exactly what we need.
   *  - composedPath() on a focusout listener registered on `this` always includes
   *    `this`, so it can't tell us whether focus stayed inside or moved outside.
   *  - Result items have tabindex="-1": clicking them moves focus INTO the shadow
   *    root, so relatedTarget is the result item → shadowRoot.contains() = true
   *    → we don't close prematurely before the click event fires _fireSelect().
   */
  private _onFocusOut = (e: FocusEvent): void => {
    const related = e.relatedTarget as Node | null;
    if (related && (this.contains(related) || this.shadowRoot?.contains(related))) return;
    this._close();
  };

  private _onOnline  = (): void => { this._offline = false; };
  private _onOffline = (): void => { this._offline = true;  };

  /**
   * Scroll/resize: schedule a position update via rAF to batch rapid events.
   * cancelAnimationFrame ensures only the last call in a rapid burst runs.
   */
  private _onScroll = (): void => { this._schedulePositionUpdate(); };
  private _onResize = (): void => { this._schedulePositionUpdate(); };

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    this._offline = !navigator.onLine;
    this._rebuildDebounce();

    // Focus-based close (covers click-outside + keyboard Tab-away)
    this.addEventListener('focusout', this._onFocusOut);

    // Online/offline detection
    window.addEventListener('online',  this._onOnline);
    window.addEventListener('offline', this._onOffline);

    // Dropdown repositioning — window scroll + resize
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });

    // Dropdown repositioning — host size changes (e.g., parent container resize)
    this._resizeObserver = new ResizeObserver(() => this._schedulePositionUpdate());
    this._resizeObserver.observe(this);

    // Dropdown repositioning — scrollable ancestor containers
    this._scrollParents = this._findScrollParents();
    this._scrollParents.forEach(el =>
      el.addEventListener('scroll', this._onScroll, { passive: true }),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    this._debounced?.cancel();
    this.removeEventListener('focusout', this._onFocusOut);
    window.removeEventListener('online',  this._onOnline);
    window.removeEventListener('offline', this._onOffline);
    window.removeEventListener('scroll',  this._onScroll);
    window.removeEventListener('resize',  this._onResize);

    cancelAnimationFrame(this._rafId);

    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    this._sentinelObserver?.disconnect();
    this._sentinelObserver = null;

    this._scrollParents.forEach(el =>
      el.removeEventListener('scroll', this._onScroll),
    );
    this._scrollParents = [];
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('debounceMs')) {
      this._rebuildDebounce();
    }
    /**
     * Reposition the dropdown after every Lit render while open.
     *
     * Why call _updatePosition() here instead of in a rAF?
     * updated() is called synchronously after Lit commits the DOM.
     * The browser has not yet painted, so reading layout (getBoundingClientRect)
     * here triggers a synchronous layout recalc — but the result is immediately
     * used to set the position. By the time the browser actually paints, the
     * dropdown is already at the correct coordinates. No visible flash.
     *
     * The rAF pattern is reserved for scroll/resize where we want to throttle
     * rapid events to ~60 fps — not needed after a Lit render.
     */
    if (this._open) {
      this._updatePosition();
      this._setupSentinelObserver();
    } else {
      // Disconnect when closed — no point observing a hidden sentinel
      this._sentinelObserver?.disconnect();
      this._sentinelObserver = null;
    }

    // Scroll the keyboard-active item into the dropdown's visible area.
    // Triggered when _activeIndex changes (arrow keys / Home / End) or when
    // _visibleCount grows (arrow-key expansion reveals a previously hidden item).
    // Both changes are batched into one render by Lit, so the item is in the
    // DOM by the time updated() runs — safe to read its bounding rect here.
    if (
      this._open &&
      this._activeIndex >= 0 &&
      (changed.has('_activeIndex') || changed.has('_visibleCount'))
    ) {
      this._scrollActiveIntoView();
    }

    // If has-more flips to false while a load was in-flight, clear the flag
    if (changed.has('hasMore') && !this.hasMore && this._loadingMore) {
      this._loadingMore = false;
    }
  }

  // -------------------------------------------------------------------------
  // Positioning engine
  // -------------------------------------------------------------------------

  /**
   * Walks up the light DOM from the host, collecting every ancestor that
   * creates a scroll container (overflow: auto | scroll on any axis).
   * Called once in connectedCallback — the result is stored and cleaned up
   * in disconnectedCallback.
   */
  private _findScrollParents(): Element[] {
    const parents: Element[] = [];
    let el: Element | null = this.parentElement;
    while (el && el !== document.documentElement) {
      const { overflow, overflowX, overflowY } = getComputedStyle(el);
      if (/auto|scroll/.test(overflow + overflowX + overflowY)) {
        parents.push(el);
      }
      el = el.parentElement;
    }
    return parents;
  }

  /**
   * Throttles rapid scroll/resize events to one position update per animation
   * frame. cancelAnimationFrame on each call ensures only the trailing edge fires.
   */
  private _schedulePositionUpdate(): void {
    cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(() => this._updatePosition());
  }

  /**
   * Ensures the keyboard-active result item is visible inside the dropdown.
   *
   * Why getBoundingClientRect instead of scrollIntoView?
   *  - scrollIntoView() also scrolls every ancestor up to the viewport, which
   *    would jerk the page when the dropdown is near the bottom of a long page.
   *  - Using viewport coordinates from getBoundingClientRect on both the item
   *    and the dropdown lets us calculate exactly how much to adjust scrollTop
   *    inside the dropdown alone — no other scroll containers are touched.
   *
   * Called from updated() after Lit commits the DOM so the new item is
   * guaranteed to be in the tree before we query its position.
   */
  private _scrollActiveIntoView(): void {
    if (this._activeIndex < 0 || !this._dropdownEl) return;
    const item = this.shadowRoot?.querySelector(
      `#result-${this._activeIndex}`,
    ) as HTMLElement | null;
    if (!item) return;

    const itemRect = item.getBoundingClientRect();
    const dropRect = this._dropdownEl.getBoundingClientRect();

    if (itemRect.top < dropRect.top) {
      // Item is above the visible area — scroll up just enough
      this._dropdownEl.scrollTop -= dropRect.top - itemRect.top;
    } else if (itemRect.bottom > dropRect.bottom) {
      // Item is below the visible area — scroll down just enough
      this._dropdownEl.scrollTop += itemRect.bottom - dropRect.bottom;
    }
  }

  /**
   * Reads the anchor rect and dropdown size, then writes top/left/width to the
   * dropdown element. All reads happen before any writes to avoid layout thrashing.
   *
   * Delegated to computePosition() (pure function in positioning.ts) for the
   * actual geometry — keeping this method as a thin DOM I/O layer.
   */
  private _updatePosition(): void {
    if (!this._open || !this._wrapperEl || !this._dropdownEl) return;

    // ── Read phase — all getBoundingClientRect before any style mutations ──
    const anchorRect   = this._wrapperEl.getBoundingClientRect();
    const dropdownHeight = this._dropdownEl.scrollHeight;

    // ── Compute ────────────────────────────────────────────────────────────
    const result = computePosition(
      anchorRect,
      dropdownHeight,
      { width: window.innerWidth, height: window.innerHeight },
    );

    // ── Write phase ────────────────────────────────────────────────────────
    this._dropdownEl.style.top   = `${result.top}px`;
    this._dropdownEl.style.left  = `${result.left}px`;
    this._dropdownEl.style.width = `${result.width}px`;
    // data-placement lets CSS optionally adjust border-radius based on direction
    this._dropdownEl.dataset.placement = result.placement;
  }

  // -------------------------------------------------------------------------
  // Pagination / lazy loading
  // -------------------------------------------------------------------------

  /**
   * Wires up the IntersectionObserver on the sentinel element.
   * Called after every render while the dropdown is open so the observer
   * always points to the current sentinel DOM node.
   *
   * root: this._dropdownEl — critical. The dropdown is overflow-y: auto,
   * so items are clipped by the dropdown container, not the viewport.
   * Using root: null (viewport) would never fire for items inside a
   * scrollable container. We observe intersection relative to the dropdown.
   */
  private _setupSentinelObserver(): void {
    this._sentinelObserver?.disconnect();
    this._sentinelObserver = null;

    const sentinel = this.shadowRoot?.querySelector('.load-sentinel');
    if (!sentinel || !this._dropdownEl) return;

    this._sentinelObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !this._loadingMore) {
          this._onLoadMore();
        }
      },
      { root: this._dropdownEl, threshold: 0.1 },
    );

    this._sentinelObserver.observe(sentinel);
  }

  /**
   * Fired when the sentinel scrolls into view.
   *
   * Two things happen (independently, not mutually exclusive):
   *  1. Client-side: if there are more items already in memory beyond
   *     _visibleCount, expand the window by pageSize.
   *  2. Server-side: if has-more is true (host signals more pages exist),
   *     fire bs:load-more so the host can fetch the next page.
   */
  private _onLoadMore(): void {
    const allItems = this._allFlatResults();
    const hasMoreClientSide = this._visibleCount < allItems.length;

    if (hasMoreClientSide) {
      this._visibleCount = Math.min(this._visibleCount + this.pageSize, allItems.length);
    }

    if (this.hasMore && !hasMoreClientSide) {
      // All in-memory items are shown — need a server fetch
      this._loadingMore = true;
      this._page++;
      const detail: BsLoadMoreDetail = {
        term:      this._inputValue,
        filter:    this._activeFilter,
        page:      this._page,
        requestId: crypto.randomUUID(),
      };
      this._emit('bs:load-more', detail);
    }
  }

  // -------------------------------------------------------------------------
  // Debounce management
  // -------------------------------------------------------------------------

  private _rebuildDebounce(): void {
    this._debounced?.cancel();
    this._debounced = debounce((term: string) => {
      this._fireSearch(term);
    }, this.debounceMs);
  }

  // -------------------------------------------------------------------------
  // Event helpers
  // -------------------------------------------------------------------------

  private _emit<T>(name: string, detail: T): void {
    this.dispatchEvent(
      new CustomEvent<T>(name, {
        detail,
        bubbles: true,
        composed: true, // crosses Shadow DOM boundaries so host can listen
      }),
    );
  }

  private _fireSearch(term: string): void {
    if (term.length < this.minChars) return;
    this._searchSeq++;
    // Reset pagination state on every new search
    this._visibleCount = this.pageSize;
    this._page = 1;
    this._loadingMore = false;
    const detail: BsSearchDetail = {
      term,
      filter: this._activeFilter,
      requestId: crypto.randomUUID(),
    };
    const wasOpen = this._open;
    this._open = true;
    this._emit('bs:search', detail);
    if (!wasOpen) this._emit('bs:open', {});
  }

  private _fireSelect(item: SearchResultItem): void {
    const detail: BsSelectDetail = { item };
    this._emit('bs:select', detail);
    if (item.url) {
      window.location.href = item.url;
    }
    this._close();
  }

  private _fireFilterChange(filterId: string): void {
    this._activeFilter = filterId;
    this._emit('bs:filter-change', { filter: filterId } as BsFilterChangeDetail);
    if (this._inputValue.length >= this.minChars) {
      this._fireSearch(this._inputValue);
    }
  }

  private _fireRetry(): void {
    const detail: BsRetryDetail = {
      term: this._inputValue,
      filter: this._activeFilter,
    };
    this._emit('bs:retry', detail);
    this.loading = true;
    this.error = null;
  }

  private _close(): void {
    if (!this._open) return;
    this._open = false;
    this._activeIndex = -1;
    this._emit('bs:close', {});
  }

  // -------------------------------------------------------------------------
  // Input handlers
  // -------------------------------------------------------------------------

  private _onInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const value = input.value;
    this._inputValue = value;
    this._activeIndex = -1;

    if (!value) {
      this._close();
      this._emit('bs:clear', {});
      return;
    }

    this._debounced?.(value);
  }

  private _onClear(): void {
    this._inputValue = '';
    this._results = [];
    this._close();
    this._emit('bs:clear', {});
    this.shadowRoot?.querySelector('input')?.focus();
  }

  private _onKeydown(e: KeyboardEvent): void {
    if (this.disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this._open && this._inputValue.length >= this.minChars) {
          this._open = true;
        }
        this._moveFocus(1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this._moveFocus(-1);
        break;

      case 'Escape':
        e.preventDefault();
        this._close();
        this.shadowRoot?.querySelector('input')?.focus();
        break;

      case 'Enter':
        if (this._activeIndex >= 0) {
          e.preventDefault();
          const item = this._flatResults()[this._activeIndex];
          if (item) this._fireSelect(item);
        }
        break;

      case 'Home':
        if (this._open) {
          e.preventDefault();
          this._activeIndex = 0;
        }
        break;

      case 'End':
        if (this._open) {
          e.preventDefault();
          const last = this._flatResults().length - 1;
          if (last >= 0) this._activeIndex = last;
        }
        break;
    }
  }

  private _moveFocus(direction: 1 | -1): void {
    const items = this._flatResults();
    if (!items.length) return;
    const next = this._activeIndex + direction;
    if (next < 0) {
      this._activeIndex = items.length - 1;
    } else if (next >= items.length) {
      // Arrow past last visible item — expand window if more items exist in memory
      const allItems = this._allFlatResults();
      if (next < allItems.length) {
        // Reveal one more item so focus can land on it
        this._visibleCount = Math.min(this._visibleCount + 1, allItems.length);
        this._activeIndex = next;
      } else {
        // No more items in memory — wrap to top
        this._activeIndex = 0;
      }
    } else {
      this._activeIndex = next;
    }
  }

  // -------------------------------------------------------------------------
  // Result helpers
  // -------------------------------------------------------------------------

  /**
   * All items across all groups — no slicing.
   * Used to calculate how many items exist vs how many are visible.
   */
  private _allFlatResults(): SearchResultItem[] {
    if (!this._results.length) return [];
    if (isGrouped(this._results)) {
      return this._results.flatMap(g => g.items);
    }
    return this._results as SearchResultItem[];
  }

  /**
   * Items currently visible — sliced to _visibleCount (or pageSize on first render).
   * Used for keyboard index tracking and aria-activedescendant.
   */
  private _flatResults(): SearchResultItem[] {
    const count = this._visibleCount > 0 ? this._visibleCount : this.pageSize;
    return this._allFlatResults().slice(0, count);
  }

  // -------------------------------------------------------------------------
  // Error observability — emit bs:error when the error attribute is set
  // -------------------------------------------------------------------------

  override attributeChangedCallback(
    name: string,
    oldVal: string | null,
    newVal: string | null,
  ): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name === 'error' && newVal !== null && newVal !== oldVal) {
      const detail: BsErrorDetail = {
        code:      newVal,
        term:      this._inputValue,
        filter:    this._activeFilter,
        timestamp: Date.now(),
      };
      this._emit('bs:error', detail);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  override render() {
    const hasValue     = this._inputValue.length > 0;
    const belowMinChars = hasValue && this._inputValue.length < this.minChars;
    const flatItems    = this._flatResults();

    return html`
      <div class="search-wrapper">

        ${this._offline ? html`
          <div class="offline-banner" role="alert">
            <span class="offline-icon" aria-hidden="true">${unsafeSVG(icon('offline'))}</span>
            You are offline — search unavailable
          </div>` : nothing}

        <div
          class="input-row"
          role="combobox"
          aria-expanded=${this._open ? 'true' : 'false'}
          aria-haspopup="listbox"
          aria-owns="results-listbox"
        >
          <span class="icon-search" aria-hidden="true">${unsafeSVG(icon('search'))}</span>

          <input
            type="search"
            autocomplete="off"
            spellcheck="false"
            .value=${this._inputValue}
            placeholder=${this.placeholder}
            aria-label=${this.searchLabel}
            aria-autocomplete="list"
            aria-controls="results-listbox"
            aria-activedescendant=${this._activeIndex >= 0 ? `result-${this._activeIndex}` : ''}
            ?disabled=${this.disabled}
            @input=${this._onInput}
            @keydown=${this._onKeydown}
          />

          ${hasValue && !this.disabled ? html`
            <button
              class="btn-clear"
              type="button"
              aria-label="Clear search"
              @click=${this._onClear}
            >${unsafeSVG(icon('clear'))}</button>` : nothing}

          ${this.loading ? html`
            <span class="spinner" aria-hidden="true" role="status"></span>` : nothing}
        </div>

        ${this._filters.length > 0 ? html`
          <div
            class="filter-bar"
            role="radiogroup"
            aria-label="Filter results"
          >
            ${(this._filtersExpanded
                ? this._filters
                : this._filters.slice(0, FILTERS_VISIBLE)
              ).map(f => html`
              <button
                class="filter-chip ${this._activeFilter === f.id ? 'active' : ''}"
                role="radio"
                aria-checked=${this._activeFilter === f.id ? 'true' : 'false'}
                tabindex=${this._activeFilter === f.id ? '0' : '-1'}
                @click=${() => this._fireFilterChange(f.id)}
              >
                ${f.label}
                ${f.count !== undefined
                  ? html`<span class="chip-count">${f.count}</span>`
                  : nothing}
              </button>
            `)}
            ${this._filters.length > FILTERS_VISIBLE ? html`
              <button
                class="btn-more-filters"
                type="button"
                aria-expanded=${this._filtersExpanded ? 'true' : 'false'}
                aria-label=${this._filtersExpanded
                  ? 'Show fewer filters'
                  : `Show ${this._filters.length - FILTERS_VISIBLE} more filters`}
                @click=${() => { this._filtersExpanded = !this._filtersExpanded; }}
              >
                ${this._filtersExpanded
                  ? 'Show less'
                  : `+${this._filters.length - FILTERS_VISIBLE} more`}
              </button>
            ` : nothing}
          </div>` : nothing}

        ${belowMinChars ? html`
          <p class="search-hint" role="status" aria-live="polite">
            ${this.hint.replace('{n}', String(this.minChars))}
          </p>` : nothing}

        <div
          id="results-listbox"
          role="listbox"
          aria-label="Search results"
          aria-busy=${this.loading ? 'true' : 'false'}
          class="dropdown ${this._open ? 'open' : ''}"
        >
          <!-- Screen-reader live region: announces result count changes -->
          <div class="sr-only" aria-live="polite" aria-atomic="true">
            ${this._open && !this.loading && !this.error
              ? `${flatItems.length} result${flatItems.length === 1 ? '' : 's'} found`
              : ''}
          </div>

          ${this.error
            ? this._renderError()
            : this.loading
              ? this._renderLoading()
              : this._open && !this._results.length
                ? this._renderEmpty()
                : this._open
                  ? this._renderResults()
                  : nothing}
        </div>

      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Render sub-sections
  // -------------------------------------------------------------------------

  private _renderError() {
    return html`
      <div class="error-panel" role="alert">
        <span class="error-icon" aria-hidden="true">${unsafeSVG(icon('warning'))}</span>
        <p class="error-message">${getErrorMessage(this.error ?? 'unknown')}</p>
        <button class="btn-retry" type="button" @click=${this._fireRetry}>
          Try again
        </button>
      </div>
    `;
  }

  private _renderLoading() {
    return html`
      ${[0, 1, 2].map(() => html`
        <div class="skeleton-row" aria-hidden="true">
          <div class="skeleton-icon"></div>
          <div class="skeleton-lines">
            <div class="skeleton-line skeleton-line--title"></div>
            <div class="skeleton-line skeleton-line--sub"></div>
          </div>
        </div>
      `)}
    `;
  }

  private _renderEmpty() {
    return html`
      <slot name="no-results">
        <p class="empty-state">${this.noResultsText}</p>
      </slot>
    `;
  }

  private _renderResults() {
    const visibleCount = this._visibleCount > 0 ? this._visibleCount : this.pageSize;
    const allCount     = this._allFlatResults().length;
    // Show sentinel when more items exist in memory OR server has more pages
    const hasMoreToShow = visibleCount < allCount || this.hasMore;

    let listContent;
    if (isGrouped(this._results)) {
      let remaining    = visibleCount;
      let globalIndex  = 0;
      listContent = html`${this._results.map(group => {
        if (remaining <= 0) return nothing;
        const visibleItems = group.items.slice(0, remaining);
        remaining -= visibleItems.length;
        return html`
          <ul role="group" aria-labelledby="group-${group.groupId}" class="result-group">
            <li
              id="group-${group.groupId}"
              role="presentation"
              class="group-header"
            >
              ${group.label}
              ${group.total !== undefined
                ? html`<span class="group-total">(${group.total} total)</span>`
                : nothing}
            </li>
            ${visibleItems.map(item => {
              const idx = globalIndex++;
              return this._renderItem(item, idx);
            })}
          </ul>
        `;
      })}`;
    } else {
      const flat = (this._results as SearchResultItem[]).slice(0, visibleCount);
      listContent = html`
        <ul role="group" class="result-group">
          ${flat.map((item, idx) => this._renderItem(item, idx))}
        </ul>
      `;
    }

    return html`
      ${listContent}
      ${hasMoreToShow ? html`
        ${this._loadingMore ? html`
          <div class="loading-more-row" aria-hidden="true">
            <span class="spinner"></span>
          </div>
        ` : nothing}
        <div class="load-sentinel" aria-hidden="true"></div>
      ` : nothing}
    `;
  }

  private _renderItem(item: SearchResultItem, index: number) {
    const isActive = this._activeIndex === index;

    if (this.renderItem) {
      const node = this.renderItem(item);
      node.setAttribute('role', 'option');
      node.setAttribute('id', `result-${index}`);
      node.setAttribute('aria-selected', isActive ? 'true' : 'false');
      node.setAttribute('tabindex', '-1');
      node.addEventListener('click', () => this._fireSelect(item));
      return html`${node}`;
    }

    const iconKey = item.icon ?? item.type;

    /**
     * Search term highlighting:
     * highlight() returns a DocumentFragment with matched substrings wrapped
     * in <mark> elements. It is XSS-safe — text nodes only, no innerHTML.
     * Lit renders DocumentFragment values directly via its ChildPart.
     * Falls back to plain text when highlightMatches is false or no term.
     */
    const titleContent =
      this.highlightMatches && this._inputValue
        ? highlight(item.title, this._inputValue)
        : item.title;

    return html`
      <li
        id="result-${index}"
        role="option"
        aria-selected=${isActive ? 'true' : 'false'}
        tabindex="-1"
        class="result-item ${isActive ? 'active' : ''}"
        @click=${() => this._fireSelect(item)}
      >
        <span class="result-icon" aria-hidden="true">${unsafeSVG(icon(iconKey))}</span>
        <div class="result-content">
          <span class="result-title">${titleContent}</span>
          ${item.subtitle
            ? html`<span class="result-subtitle">${item.subtitle}</span>`
            : nothing}
        </div>
        ${item.badge
          ? html`<span class="badge badge--${item.badge.variant}">${item.badge.label}</span>`
          : nothing}
      </li>
    `;
  }
}
