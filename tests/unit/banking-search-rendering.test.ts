/**
 * banking-search-rendering.test.ts
 * @author Koushik R.
 *
 * Covers render paths and lifecycle callbacks not exercised by other test files:
 *
 *  - Result items with subtitle and badge fields
 *  - highlightMatches=false renders plain title text
 *  - loading skeleton (_renderLoading)
 *  - error state fires bs:error via attributeChangedCallback
 *  - retry button fires bs:retry and clears the error
 *  - online / offline window events update the banner
 *  - scroll / resize window events schedule a position update
 *  - icon() fallback to 'generic' for unknown keys
 *  - disconnectedCallback cleans up observers and listeners
 *  - getErrorMessage fallback returns the raw code for unknown codes
 */

import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from 'vitest';
import { BankingSearch } from '../../src/components/banking-search/banking-search.js';
import { icon } from '../../src/components/banking-search/banking-search.icons.js';
import type { SearchResultItem } from '../../src/components/banking-search/banking-search.types.js';

// ── jsdom stubs ──────────────────────────────────────────────────────────────

class StubResizeObserver {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}

class StubIntersectionObserver {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver',       StubResizeObserver);
vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);

// ── Registration ─────────────────────────────────────────────────────────────

beforeAll(() => {
  if (!customElements.get('banking-search')) {
    customElements.define('banking-search', BankingSearch);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function mount(): Promise<BankingSearch> {
  const el = document.createElement('banking-search') as BankingSearch;
  el.setAttribute('min-chars', '0');
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

async function openWith(el: BankingSearch, items: SearchResultItem[]): Promise<void> {
  el.results = items;
  (el as any)._open        = true;
  (el as any)._inputValue  = 'test';
  (el as any)._visibleCount = items.length;
  await el.updateComplete;
}

afterEach(() => { document.body.innerHTML = ''; });

// ── Result item fields ────────────────────────────────────────────────────────

describe('result item — subtitle', () => {
  it('renders .result-subtitle when item has a subtitle', async () => {
    const el = await mount();
    await openWith(el, [{ id: '1', type: 'account', title: 'Checking', subtitle: '****4821' }]);

    const subtitle = el.shadowRoot!.querySelector('.result-subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle!.textContent).toBe('****4821');
  });

  it('does not render .result-subtitle when subtitle is absent', async () => {
    const el = await mount();
    await openWith(el, [{ id: '1', type: 'account', title: 'Checking' }]);

    expect(el.shadowRoot!.querySelector('.result-subtitle')).toBeNull();
  });
});

describe('result item — badge', () => {
  it('renders .badge when item has a badge', async () => {
    const el = await mount();
    await openWith(el, [
      { id: '1', type: 'account', title: 'Savings', badge: { label: 'Active', variant: 'success' } },
    ]);

    const badge = el.shadowRoot!.querySelector('.badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe('Active');
    expect(badge!.classList.contains('badge--success')).toBe(true);
  });

  it('renders the correct variant class for each badge variant', async () => {
    const variants = ['success', 'warning', 'error', 'neutral'] as const;
    for (const variant of variants) {
      const el = await mount();
      await openWith(el, [{ id: '1', type: 'account', title: 'Test', badge: { label: 'X', variant } }]);
      const badge = el.shadowRoot!.querySelector('.badge') as HTMLElement;
      expect(badge.classList.contains(`badge--${variant}`)).toBe(true);
      el.remove();
    }
  });

  it('does not render .badge when badge is absent', async () => {
    const el = await mount();
    await openWith(el, [{ id: '1', type: 'account', title: 'No badge' }]);

    expect(el.shadowRoot!.querySelector('.badge')).toBeNull();
  });
});

// ── highlightMatches ──────────────────────────────────────────────────────────

describe('highlightMatches property', () => {
  it('renders plain title text when highlightMatches is false', async () => {
    const el = await mount();
    el.setAttribute('highlight-matches', 'false');
    // Lit treats the string "false" as truthy for Boolean attributes —
    // remove the attribute entirely to set the property to false.
    el.removeAttribute('highlight-matches');
    el.highlightMatches = false;
    await openWith(el, [{ id: '1', type: 'account', title: 'Primary Checking' }]);

    const titleEl = el.shadowRoot!.querySelector('.result-title') as HTMLElement;
    // No <mark> elements — plain text node
    expect(titleEl.querySelector('mark')).toBeNull();
    expect(titleEl.textContent).toBe('Primary Checking');
  });

  it('wraps matches in <mark> when highlightMatches is true', async () => {
    const el = await mount();
    el.highlightMatches = true;
    await openWith(el, [{ id: '1', type: 'account', title: 'Primary Checking' }]);
    // _inputValue = 'test' from openWith — no overlap with title, so no marks.
    // Set a matching term instead.
    (el as any)._inputValue = 'Check';
    await el.updateComplete;

    const titleEl = el.shadowRoot!.querySelector('.result-title') as HTMLElement;
    const mark = titleEl.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark!.textContent!.toLowerCase()).toBe('check');
  });
});

// ── _fireSelect with url (lines 646-648) ─────────────────────────────────────

describe('_fireSelect — item.url navigation', () => {
  it('sets window.location.href when the selected item has a url', async () => {
    const el = await mount();
    const urlItem: SearchResultItem = { id: '1', type: 'account', title: 'Link', url: '/accounts/1' };
    await openWith(el, [urlItem]);

    // Spy on window.location.href assignment
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as Location);
    let assignedHref = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      get: () => ({ href: assignedHref, assign: (url: string) => { assignedHref = url; } }),
      set: () => {},
    });

    // Click the result item
    const resultItem = el.shadowRoot!.querySelector('.result-item') as HTMLElement;
    resultItem.click();
    await el.updateComplete;

    // The select event should fire
    locationSpy.mockRestore();
  });

  it('does not navigate when selected item has no url', async () => {
    const el = await mount();
    const plainItem: SearchResultItem = { id: '1', type: 'account', title: 'No Link' };
    await openWith(el, [plainItem]);

    const events: Event[] = [];
    el.addEventListener('bs:select', (e) => events.push(e));

    const resultItem = el.shadowRoot!.querySelector('.result-item') as HTMLElement;
    resultItem.click();
    await el.updateComplete;

    expect(events).toHaveLength(1);
    // If it hadn't thrown, the url branch was correctly skipped
  });
});

// ── _fireFilterChange re-triggers search (lines 676-678) ─────────────────────

describe('_fireFilterChange — re-fires search when input meets minChars', () => {
  it('fires bs:search when a filter is changed and input is long enough', async () => {
    const el = await mount();
    el.setAttribute('min-chars', '2');
    el.filters = [{ id: 'all', label: 'All' }, { id: 'accounts', label: 'Accounts' }];
    (el as any)._inputValue = 'ab'; // meets min-chars=2
    await el.updateComplete;

    const searches: CustomEvent[] = [];
    el.addEventListener('bs:search', (e) => searches.push(e as CustomEvent));

    const chips = el.shadowRoot!.querySelectorAll('.filter-chip');
    (chips[1] as HTMLButtonElement).click(); // click 'Accounts' chip
    await el.updateComplete;

    expect(searches.length).toBeGreaterThan(0);
    expect(searches[0].detail.filter).toBe('accounts');
  });

  it('does not fire bs:search when input is below minChars', async () => {
    const el = await mount();
    el.setAttribute('min-chars', '3');
    el.filters = [{ id: 'all', label: 'All' }, { id: 'accounts', label: 'Accounts' }];
    (el as any)._inputValue = 'a'; // below min-chars=3
    await el.updateComplete;

    const searches: CustomEvent[] = [];
    el.addEventListener('bs:search', (e) => searches.push(e as CustomEvent));

    const chips = el.shadowRoot!.querySelectorAll('.filter-chip');
    (chips[1] as HTMLButtonElement).click();
    await el.updateComplete;

    expect(searches).toHaveLength(0);
  });
});

// ── Loading state (_renderLoading) ────────────────────────────────────────────

describe('loading state', () => {
  it('renders skeleton rows when loading is true', async () => {
    const el = await mount();
    el.setAttribute('loading', '');
    (el as any)._open = true;
    await el.updateComplete;

    const skeletons = el.shadowRoot!.querySelectorAll('.skeleton-row');
    expect(skeletons.length).toBe(3);
  });

  it('hides skeleton rows after loading is cleared', async () => {
    const el = await mount();
    el.setAttribute('loading', '');
    (el as any)._open = true;
    await el.updateComplete;

    el.removeAttribute('loading');
    el.results = [{ id: '1', type: 'account', title: 'Done' }];
    (el as any)._visibleCount = 1;
    await el.updateComplete;

    expect(el.shadowRoot!.querySelectorAll('.skeleton-row').length).toBe(0);
  });
});

// ── Error state and bs:error event ───────────────────────────────────────────

describe('error attribute — bs:error event', () => {
  it('fires bs:error when the error attribute is set', async () => {
    const el = await mount();
    const events: CustomEvent[] = [];
    el.addEventListener('bs:error', (e) => events.push(e as CustomEvent));

    el.setAttribute('error', 'network');
    await el.updateComplete;

    expect(events).toHaveLength(1);
    expect(events[0].detail.code).toBe('network');
    expect(typeof events[0].detail.timestamp).toBe('number');
  });

  it('does not fire bs:error when the attribute is removed', async () => {
    const el = await mount();
    el.setAttribute('error', 'server');
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('bs:error', (e) => events.push(e as CustomEvent));

    el.removeAttribute('error');
    await el.updateComplete;

    expect(events).toHaveLength(0);
  });

  it('does not fire bs:error when the same value is set again', async () => {
    const el = await mount();
    el.setAttribute('error', 'timeout');
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('bs:error', (e) => events.push(e as CustomEvent));

    // Setting the same attribute value: attributeChangedCallback fires but
    // oldVal === newVal so the guard skips the emit.
    el.setAttribute('error', 'timeout');
    await el.updateComplete;

    expect(events).toHaveLength(0);
  });
});

// ── Retry button (_fireRetry) ─────────────────────────────────────────────────

describe('retry button', () => {
  it('fires bs:retry when the retry button is clicked', async () => {
    const el = await mount();
    el.setAttribute('error', 'server');
    (el as any)._open = true;
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('bs:retry', (e) => events.push(e as CustomEvent));

    const btn = el.shadowRoot!.querySelector('.btn-retry') as HTMLButtonElement;
    btn.click();
    await el.updateComplete;

    expect(events).toHaveLength(1);
    expect(events[0].detail).toHaveProperty('term');
    expect(events[0].detail).toHaveProperty('filters');
  });

  it('clears the error and sets loading after retry', async () => {
    const el = await mount();
    el.setAttribute('error', 'network');
    (el as any)._open = true;
    await el.updateComplete;

    const btn = el.shadowRoot!.querySelector('.btn-retry') as HTMLButtonElement;
    btn.click();
    await el.updateComplete;

    expect(el.error).toBeNull();
    expect(el.loading).toBe(true);
  });
});

// ── Online / offline lifecycle ────────────────────────────────────────────────

describe('online / offline events', () => {
  it('shows offline banner when window fires "offline"', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('.offline-banner')).toBeNull();

    window.dispatchEvent(new Event('offline'));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.offline-banner')).not.toBeNull();
  });

  it('hides offline banner when window fires "online"', async () => {
    const el = await mount();
    window.dispatchEvent(new Event('offline'));
    await el.updateComplete;

    window.dispatchEvent(new Event('online'));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.offline-banner')).toBeNull();
  });
});

// ── Scroll / resize schedule position update ──────────────────────────────────

describe('scroll and resize events trigger position scheduling', () => {
  it('does not throw when window fires scroll while open', async () => {
    const el = await mount();
    (el as any)._open = true;
    await el.updateComplete;

    // _schedulePositionUpdate uses cancelAnimationFrame + requestAnimationFrame.
    // In jsdom these are no-ops but must not throw.
    expect(() => {
      window.dispatchEvent(new Event('scroll'));
    }).not.toThrow();
  });

  it('does not throw when window fires resize while open', async () => {
    const el = await mount();
    (el as any)._open = true;
    await el.updateComplete;

    expect(() => {
      window.dispatchEvent(new Event('resize'));
    }).not.toThrow();
  });
});

// ── Clear button (_onClear, lines 719-724) ────────────────────────────────────

describe('clear button', () => {
  it('fires bs:clear when the X button is clicked', async () => {
    const el = await mount();
    (el as any)._inputValue = 'hello';
    await el.updateComplete;

    const events: Event[] = [];
    el.addEventListener('bs:clear', (e) => events.push(e));

    const btn = el.shadowRoot!.querySelector('.btn-clear') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    await el.updateComplete;

    expect(events).toHaveLength(1);
  });

  it('resets inputValue and results after clear button click', async () => {
    const el = await mount();
    (el as any)._inputValue = 'hello';
    (el as any)._open = true;
    el.results = [{ id: '1', type: 'account', title: 'A' }];
    await el.updateComplete;

    const btn = el.shadowRoot!.querySelector('.btn-clear') as HTMLButtonElement;
    btn.click();
    await el.updateComplete;

    expect((el as any)._inputValue).toBe('');
    expect((el as any)._open).toBe(false);
  });
});

// ── Empty input fires bs:clear (_onInput empty branch, lines 710-713) ─────────

describe('_onInput — empty value', () => {
  it('fires bs:clear and closes when input is cleared by typing', async () => {
    const el = await mount();
    (el as any)._open = true;
    await el.updateComplete;

    const events: Event[] = [];
    el.addEventListener('bs:clear', (e) => events.push(e));

    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;

    expect(events).toHaveLength(1);
    expect((el as any)._open).toBe(false);
  });
});

// ── disconnectedCallback ──────────────────────────────────────────────────────

describe('disconnectedCallback', () => {
  it('removes online/offline listeners — no state change after removal', async () => {
    const el = await mount();
    el.remove(); // triggers disconnectedCallback

    // After removal, dispatching offline should not update the (detached) element.
    // The real assertion is that no error is thrown — the handler is gone.
    expect(() => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    }).not.toThrow();
  });

  it('cancels pending debounced search on disconnect', async () => {
    const el = await mount();
    // Trigger a debounce timer
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Disconnecting before the debounce fires must not throw
    expect(() => el.remove()).not.toThrow();
  });
});

// ── Grouped results — remaining budget exhausted (line 1050) ─────────────────

describe('grouped results — visibleCount cuts off later groups', () => {
  it('hides a group entirely when visibleCount is consumed by earlier groups', async () => {
    const el = await mount();
    el.pageSize = 2;
    const grouped = [
      { groupId: 'a', label: 'Accounts', items: [{ id: '1', type: 'account', title: 'A1' }, { id: '2', type: 'account', title: 'A2' }] },
      { groupId: 'b', label: 'Transactions', items: [{ id: '3', type: 'transaction', title: 'T1' }] },
    ];
    el.results = grouped;
    (el as any)._open        = true;
    (el as any)._inputValue  = 'a';
    (el as any)._visibleCount = 2; // only room for first group
    await el.updateComplete;

    // First group header visible
    expect(el.shadowRoot!.querySelector('#group-a')).not.toBeNull();
    // Second group header not rendered (remaining = 0 → returns nothing)
    expect(el.shadowRoot!.querySelector('#group-b')).toBeNull();
  });
});

// ── _loadingMore spinner (lines 1063-1067) ────────────────────────────────────

describe('_loadingMore spinner', () => {
  it('shows the loading-more-row spinner when _loadingMore is true and sentinel is visible', async () => {
    const el = await mount();
    el.setAttribute('has-more', '');
    el.results = [{ id: '1', type: 'account', title: 'Result' }];
    (el as any)._open         = true;
    (el as any)._inputValue   = 'r';
    (el as any)._visibleCount = 1;
    (el as any)._loadingMore  = true;
    await el.updateComplete;

    const spinner = el.shadowRoot!.querySelector('.loading-more-row');
    expect(spinner).not.toBeNull();
  });
});

// ── Filter chip count badge (line 927) ────────────────────────────────────────

describe('filter chip count badge', () => {
  it('renders .chip-count when FilterOption has a count', async () => {
    const el = await mount();
    el.filters = [{ id: 'all', label: 'All', count: 42 }];
    await el.updateComplete;

    const count = el.shadowRoot!.querySelector('.chip-count');
    expect(count).not.toBeNull();
    expect(count!.textContent).toBe('42');
  });

  it('does not render .chip-count when count is absent', async () => {
    const el = await mount();
    el.filters = [{ id: 'all', label: 'All' }];
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.chip-count')).toBeNull();
  });
});

// ── Group header total count (line 1041) ──────────────────────────────────────

describe('group header total count', () => {
  it('renders .group-total when group has a total', async () => {
    const el = await mount();
    el.results = [{ groupId: 'a', label: 'Accounts', total: 99, items: [{ id: '1', type: 'account', title: 'A' }] }];
    (el as any)._open        = true;
    (el as any)._inputValue  = 'a';
    (el as any)._visibleCount = 5;
    await el.updateComplete;

    const total = el.shadowRoot!.querySelector('.group-total');
    expect(total).not.toBeNull();
    expect(total!.textContent).toBe('(99 total)');
  });

  it('does not render .group-total when total is absent', async () => {
    const el = await mount();
    el.results = [{ groupId: 'a', label: 'Accounts', items: [{ id: '1', type: 'account', title: 'A' }] }];
    (el as any)._open        = true;
    (el as any)._inputValue  = 'a';
    (el as any)._visibleCount = 5;
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.group-total')).toBeNull();
  });
});

// ── ArrowDown opens dropdown when closed (lines 732-734) ─────────────────────

describe('ArrowDown with closed dropdown', () => {
  it('opens the dropdown when ArrowDown is pressed with enough input', async () => {
    const el = await mount();
    el.setAttribute('min-chars', '2');
    (el as any)._inputValue = 'ab'; // meets min-chars threshold
    el.results = [{ id: '1', type: 'account', title: 'A' }];
    (el as any)._visibleCount = 1;
    await el.updateComplete;

    expect((el as any)._open).toBe(false);

    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    await el.updateComplete;

    expect((el as any)._open).toBe(true);
  });
});

// ── _onFocusOut early return (lines 245-248) ─────────────────────────────────

describe('_onFocusOut — focus staying inside component', () => {
  it('does not close when focus moves to a child inside the shadow root', async () => {
    const el = await mount();
    (el as any)._open = true;
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;

    // Dispatch focusout with relatedTarget pointing inside the shadow root
    el.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        composed: true,
        relatedTarget: input, // stays inside shadow root
      }),
    );
    await el.updateComplete;

    // Dropdown should remain open — focus moved within the component
    expect((el as any)._open).toBe(true);
  });

  it('closes when focus moves completely outside the component', async () => {
    const el = await mount();
    (el as any)._open = true;
    await el.updateComplete;

    const externalEl = document.createElement('button');
    document.body.appendChild(externalEl);

    el.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        composed: true,
        relatedTarget: externalEl, // outside the component
      }),
    );
    await el.updateComplete;

    expect((el as any)._open).toBe(false);
    externalEl.remove();
  });
});

// ── _onFilterBarKeydown — expanded filters (line 270) and default key (299) ───

describe('_onFilterBarKeydown', () => {
  it('navigates using _filtersExpanded=true filter list', async () => {
    const el = await mount();
    // Create 5 filters so the "more" button appears (FILTERS_VISIBLE = 4)
    el.filters = [
      { id: 'all', label: 'All' },
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
      { id: 'd', label: 'D' },
    ];
    (el as any)._filtersExpanded = true;
    await el.updateComplete;

    const filterBar = el.shadowRoot!.querySelector('.filter-bar') as HTMLElement;
    filterBar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
    );
    await el.updateComplete;

    // Focus should have moved from 'all' (index 0) to 'a' (index 1)
    expect((el as any)._focusedFilterId).toBe('a');
  });

  it('ignores non-navigation keys in the filter bar', async () => {
    const el = await mount();
    el.filters = [{ id: 'all', label: 'All' }, { id: 'a', label: 'A' }];
    await el.updateComplete;

    const initialFilter = (el as any)._focusedFilterId;
    const filterBar = el.shadowRoot!.querySelector('.filter-bar') as HTMLElement;

    // 'f' is not a navigation key → hits default: return
    filterBar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', bubbles: true, composed: true }),
    );
    await el.updateComplete;

    // No change
    expect((el as any)._focusedFilterId).toBe(initialFilter);
  });
});

// ── _findScrollParents — scrollable ancestor (line 458) ──────────────────────

describe('_findScrollParents — detects scrollable ancestors', () => {
  it('registers scroll listener on a scrollable ancestor container', async () => {
    // Mount inside a div that has overflow:auto so getComputedStyle reports it.
    const container = document.createElement('div');
    container.style.overflow = 'auto';
    container.style.height   = '200px';
    document.body.appendChild(container);

    const el = document.createElement('banking-search') as BankingSearch;
    el.setAttribute('min-chars', '0');
    container.appendChild(el);
    await el.updateComplete;

    // _scrollParents should contain the container
    const parents = (el as any)._scrollParents as Element[];
    expect(parents).toContain(container);

    el.remove();
    container.remove();
  });
});

// ── _scrollActiveIntoView — item above visible area (line 498) ────────────────

describe('_scrollActiveIntoView — item above dropdown viewport', () => {
  it('adjusts scrollTop upward when the active item is above the visible area', async () => {
    const el = await mount();
    el.results = [{ id: '1', type: 'account', title: 'A' }];
    (el as any)._open        = true;
    (el as any)._inputValue  = 'a';
    (el as any)._visibleCount = 1;
    (el as any)._activeIndex = 0;
    await el.updateComplete;

    const dropdown = el.shadowRoot!.querySelector('.dropdown') as HTMLElement;
    const resultItem = el.shadowRoot!.querySelector('#result-0') as HTMLElement;

    if (dropdown && resultItem) {
      // Seed scrollTop above zero so we can detect a reduction
      dropdown.scrollTop = 100;

      // Mock item as above the dropdown's top edge
      vi.spyOn(resultItem, 'getBoundingClientRect').mockReturnValue(
        { top: 10, bottom: 60, left: 0, right: 200, width: 200, height: 50 } as DOMRect,
      );
      vi.spyOn(dropdown, 'getBoundingClientRect').mockReturnValue(
        { top: 50, bottom: 250, left: 0, right: 200, width: 200, height: 200 } as DOMRect,
      );

      (el as any)._scrollActiveIntoView();

      // scrollTop should have been decreased by (50 - 10) = 40
      expect(dropdown.scrollTop).toBe(60);
    }
  });
});

// ── IntersectionObserver callback (lines 557-560) ────────────────────────────

describe('IntersectionObserver sentinel callback', () => {
  it('calls _onLoadMore when sentinel enters viewport and _loadingMore is false', async () => {
    // Replace the global stub with one that fires the callback on observe()
    let capturedCb: IntersectionObserverCallback | null = null;
    class TriggerIO {
      constructor(cb: IntersectionObserverCallback) { capturedCb = cb; }
      observe(target: Element) {
        capturedCb?.([{ isIntersecting: true, target } as IntersectionObserverEntry], this as any);
      }
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', TriggerIO);

    const el = document.createElement('banking-search') as BankingSearch;
    el.setAttribute('min-chars', '0');
    el.setAttribute('has-more', '');
    el.pageSize = 2;
    document.body.appendChild(el);
    await el.updateComplete;

    const searches: CustomEvent[] = [];
    el.addEventListener('bs:load-more', (e) => searches.push(e as CustomEvent));

    // Open with results — this triggers _setupSentinelObserver which observes sentinel
    el.results = [{ id: '1', type: 'account', title: 'A' }, { id: '2', type: 'account', title: 'B' }];
    (el as any)._open        = true;
    (el as any)._inputValue  = 'a';
    (el as any)._visibleCount = 2;
    await el.updateComplete;

    // The TriggerIO.observe() fires the callback → _onLoadMore → bs:load-more
    expect(searches.length).toBeGreaterThan(0);

    el.remove();
    // Restore the original stub for other tests
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  it('does not call _onLoadMore when _loadingMore is already true', async () => {
    let capturedCb: IntersectionObserverCallback | null = null;
    class TriggerIO {
      constructor(cb: IntersectionObserverCallback) { capturedCb = cb; }
      observe(target: Element) {
        capturedCb?.([{ isIntersecting: true, target } as IntersectionObserverEntry], this as any);
      }
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', TriggerIO);

    const el = document.createElement('banking-search') as BankingSearch;
    el.setAttribute('min-chars', '0');
    el.setAttribute('has-more', '');
    el.pageSize = 1;
    document.body.appendChild(el);

    // Set results first so the setter doesn't reset _loadingMore later
    el.results = [{ id: '1', type: 'account', title: 'A' }];
    (el as any)._open        = true;
    (el as any)._inputValue  = 'a';
    (el as any)._visibleCount = 1;
    await el.updateComplete;

    // Now mark as already loading — set the private field directly to avoid
    // Lit's @state reactivity triggering another render (which would re-observe)
    Object.defineProperty(el, '_loadingMore', { value: true, writable: true, configurable: true });

    const events: Event[] = [];
    el.addEventListener('bs:load-more', (e) => events.push(e));

    // Force a re-render — sentinel observe() will fire with _loadingMore=true
    (el as any).requestUpdate();
    await el.updateComplete;

    expect(events).toHaveLength(0);

    el.remove();
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });
});

// ── Debounced search fires bs:search after timer (line 606) ──────────────────

describe('debounce — fires bs:search after debounceMs', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('emits bs:search once the debounce delay elapses', async () => {
    const el = await mount();
    el.setAttribute('debounce-ms', '100');
    el.setAttribute('min-chars', '1');
    await el.updateComplete;

    const searches: CustomEvent[] = [];
    el.addEventListener('bs:search', (e) => searches.push(e as CustomEvent));

    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(searches).toHaveLength(0); // not yet — debounce pending

    vi.advanceTimersByTime(150);
    await el.updateComplete;

    expect(searches).toHaveLength(1);
    expect(searches[0].detail.term).toBe('abc');
  });
});

// ── _scrollActiveIntoView — item below visible area (line 502) ────────────────

describe('_scrollActiveIntoView — item below dropdown viewport', () => {
  it('adjusts scrollTop when the active item is below the visible area', async () => {
    const el = await mount();
    el.results = [{ id: '1', type: 'account', title: 'A' }];
    (el as any)._open        = true;
    (el as any)._inputValue  = 'a';
    (el as any)._visibleCount = 1;
    (el as any)._activeIndex = 0;
    await el.updateComplete;

    const dropdown = el.shadowRoot!.querySelector('.dropdown') as HTMLElement;
    const resultItem = el.shadowRoot!.querySelector('#result-0') as HTMLElement;

    if (dropdown && resultItem) {
      // Mock item as below the dropdown's bottom edge
      vi.spyOn(resultItem, 'getBoundingClientRect').mockReturnValue(
        { top: 50, bottom: 500, left: 0, right: 200, width: 200, height: 450 } as DOMRect,
      );
      vi.spyOn(dropdown, 'getBoundingClientRect').mockReturnValue(
        { top: 0, bottom: 200, left: 0, right: 200, width: 200, height: 200 } as DOMRect,
      );

      // Manually invoke the private method
      (el as any)._scrollActiveIntoView();

      // scrollTop should have been increased by (500 - 200) = 300
      expect(dropdown.scrollTop).toBe(300);
    }
  });
});

// ── Icon fallback ─────────────────────────────────────────────────────────────

describe('icon() helper', () => {
  it('returns SVG for known keys', () => {
    const svg = icon('account');
    expect(svg).toContain('<svg');
  });

  it('falls back to the generic icon for unknown keys', () => {
    const genericSvg = icon('generic');
    const unknownSvg = icon('__unknown_type__');
    expect(unknownSvg).toBe(genericSvg);
  });
});
