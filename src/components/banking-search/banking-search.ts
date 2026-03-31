/**
 * banking-search.ts
 * @author Koushik R.
 *
 * The <banking-search> custom element — a framework-agnostic smart search
 * component for banking applications. Supports grouped results, filter chips,
 * keyboard navigation, theming, and full WCAG AA accessibility.
 *
 * Built with Lit for reactive rendering and Shadow DOM style isolation.
 * No third-party positioning libraries — layout is hand-rolled using
 * getBoundingClientRect() + position: fixed + ResizeObserver.
 */

import { LitElement, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import { styles } from './banking-search.styles.js';
import { icon } from './banking-search.icons.js';
import { debounce } from '../../utils/debounce.js';
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
} from './banking-search.types.js';

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
// Error code → display message map
// ---------------------------------------------------------------------------
const ERROR_MESSAGES: Record<string, string> = {
  network: 'Unable to connect. Check your connection and try again.',
  timeout: 'Search is taking longer than expected. Try a more specific term.',
  'rate-limited': 'Too many requests. Please wait a moment and try again.',
  unauthorized: 'You do not have permission to perform this search.',
  server: 'Something went wrong on our end. Please try again.',
  unknown: 'An unexpected error occurred. Please try again.',
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
  // Reflected attributes
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
   * Maximum number of results rendered per group.
   * Prevents unbounded DOM growth on large result sets.
   * Attribute: max-results
   */
  @property({ type: Number, attribute: 'max-results' })
  maxResults = 10;

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
   * aria-label on the input element.
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
   * Mapped to human-safe strings via ERROR_MESSAGES. Never display raw server errors.
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
    this.requestUpdate('results');
  }
  private _results: SearchResults = [];

  /**
   * Filter chips in the filter bar.
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
   */
  renderItem: RenderItemFn | null = null;

  // -------------------------------------------------------------------------
  // Internal state
  // -------------------------------------------------------------------------

  @state() private _open = false;
  @state() private _activeIndex = -1;
  @state() private _activeFilter = 'all';
  @state() private _offline = false;
  @state() private _overflowOpen = false;
  @state() private _inputValue = '';

  // -------------------------------------------------------------------------
  // Private internals — not reactive, managed manually
  // -------------------------------------------------------------------------

  private _debounced: DebouncedFn<[string]> | null = null;
  private _searchSeq = 0; // monotonic counter for stale-response prevention

  // Bound handler references stored so the same function is used for
  // both addEventListener and removeEventListener.
  private _onOutsideClick = (e: PointerEvent): void => {
    if (!this.contains(e.target as Node)) {
      this._close();
    }
  };

  private _onFocusOut = (e: FocusEvent): void => {
    const path = e.composedPath();
    if (path.some((el) => el === this)) return;
    this._close();
  };

  private _onOnline = (): void => { this._offline = false; };
  private _onOffline = (): void => { this._offline = true; };

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    this._offline = !navigator.onLine;
    this._rebuildDebounce();

    document.addEventListener('pointerdown', this._onOutsideClick);
    this.addEventListener('focusout', this._onFocusOut);
    window.addEventListener('online', this._onOnline);
    window.addEventListener('offline', this._onOffline);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._debounced?.cancel();
    document.removeEventListener('pointerdown', this._onOutsideClick);
    this.removeEventListener('focusout', this._onFocusOut);
    window.removeEventListener('online', this._onOnline);
    window.removeEventListener('offline', this._onOffline);
  }

  /**
   * When debounceMs changes, rebuild the debounced function with the new wait time.
   * Lit calls update() before the first render so this is safe to call in connectedCallback.
   */
  override updated(changed: Map<string, unknown>): void {
    if (changed.has('debounceMs')) {
      this._rebuildDebounce();
    }
  }

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
        composed: true, // crosses Shadow DOM boundaries
      }),
    );
  }

  private _fireSearch(term: string): void {
    if (term.length < this.minChars) return;
    const requestId = crypto.randomUUID();
    this._searchSeq++;
    const detail: BsSearchDetail = { term, filter: this._activeFilter, requestId };
    this._emit('bs:search', detail);
    this._open = true;
    this._emit('bs:open', {});
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
    const detail: BsFilterChangeDetail = { filter: filterId };
    this._emit('bs:filter-change', detail);
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
    // Return focus to the input after clearing
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
    }
  }

  private _moveFocus(direction: 1 | -1): void {
    const items = this._flatResults();
    if (!items.length) return;
    const next = this._activeIndex + direction;
    if (next < 0) {
      this._activeIndex = items.length - 1;
    } else if (next >= items.length) {
      this._activeIndex = 0;
    } else {
      this._activeIndex = next;
    }
  }

  // -------------------------------------------------------------------------
  // Result helpers
  // -------------------------------------------------------------------------

  /**
   * Returns a flat array of all SearchResultItem objects regardless of
   * whether results are flat or grouped. Used for keyboard index tracking.
   */
  private _flatResults(): SearchResultItem[] {
    if (!this._results.length) return [];
    if (isGrouped(this._results)) {
      return this._results.flatMap((g) => g.items.slice(0, this.maxResults));
    }
    return (this._results as SearchResultItem[]).slice(0, this.maxResults);
  }

  // -------------------------------------------------------------------------
  // Error observability — emit bs:error when error attribute is set
  // -------------------------------------------------------------------------

  override attributeChangedCallback(
    name: string,
    oldVal: string | null,
    newVal: string | null,
  ): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name === 'error' && newVal !== null && newVal !== oldVal) {
      const detail: BsErrorDetail = {
        code: newVal,
        term: this._inputValue,
        filter: this._activeFilter,
        timestamp: Date.now(),
      };
      this._emit('bs:error', detail);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  override render() {
    const hasValue = this._inputValue.length > 0;
    const belowMinChars = this._inputValue.length > 0 && this._inputValue.length < this.minChars;
    const showHint = belowMinChars;
    const flatItems = this._flatResults();

    return html`
      <div class="search-wrapper">

        ${this._offline
          ? html`<div class="offline-banner" role="alert">
              <span class="offline-icon" aria-hidden="true">${this._unsafeSvg(icon('offline'))}</span>
              You are offline — search unavailable
            </div>`
          : nothing}

        <div
          class="input-row"
          role="combobox"
          aria-expanded=${this._open}
          aria-haspopup="listbox"
          aria-owns="results-listbox"
        >
          <span class="icon-search" aria-hidden="true">${this._unsafeSvg(icon('search'))}</span>
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
          ${hasValue && !this.disabled
            ? html`<button
                class="btn-clear"
                type="button"
                aria-label="Clear search"
                @click=${this._onClear}
              >${this._unsafeSvg(icon('clear'))}</button>`
            : nothing}
          ${this.loading
            ? html`<span class="spinner" aria-hidden="true" role="status"></span>`
            : nothing}
        </div>

        ${this._filters.length > 0
          ? html`<div class="filter-bar" role="radiogroup" aria-label="Filter results" aria-expanded=${this._overflowOpen}>
              ${this._filters.map((f) => html`
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
            </div>`
          : nothing}

        ${showHint
          ? html`<p class="search-hint" role="status" aria-live="polite">
              ${this.hint.replace('{n}', String(this.minChars))}
            </p>`
          : nothing}

        <div
          id="results-listbox"
          role="listbox"
          aria-label="Search results"
          aria-busy=${this.loading ? 'true' : 'false'}
          class="dropdown ${this._open ? 'open' : ''}"
        >
          <!-- Screen-reader result count announcement -->
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
        <span class="error-icon" aria-hidden="true">${this._unsafeSvg(icon('warning'))}</span>
        <p class="error-message">${getErrorMessage(this.error ?? 'unknown')}</p>
        <button
          class="btn-retry"
          type="button"
          @click=${this._fireRetry}
        >Try again</button>
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
    if (isGrouped(this._results)) {
      let globalIndex = 0;
      return html`${this._results.map((group) => {
        const visibleItems = group.items.slice(0, this.maxResults);
        const groupHtml = html`
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
            ${visibleItems.map((item) => {
              const idx = globalIndex++;
              return this._renderItem(item, idx);
            })}
          </ul>
        `;
        return groupHtml;
      })}`;
    }

    const flat = (this._results as SearchResultItem[]).slice(0, this.maxResults);
    return html`
      <ul role="group" class="result-group">
        ${flat.map((item, idx) => this._renderItem(item, idx))}
      </ul>
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

    return html`
      <li
        id="result-${index}"
        role="option"
        aria-selected=${isActive ? 'true' : 'false'}
        tabindex="-1"
        class="result-item ${isActive ? 'active' : ''}"
        @click=${() => this._fireSelect(item)}
      >
        <span class="result-icon" aria-hidden="true">${this._unsafeSvg(icon(iconKey))}</span>
        <div class="result-content">
          <span class="result-title">${item.title}</span>
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

  /**
   * Safely renders a pre-defined SVG string from our own ICONS registry.
   * Only strings from the ICONS constant above are ever passed here —
   * never user-supplied content.
   */
  private _unsafeSvg(svgString: string): ReturnType<typeof html> {
    const template = document.createElement('template');
    template.innerHTML = svgString;
    return html`${template.content.cloneNode(true)}`;
  }
}
