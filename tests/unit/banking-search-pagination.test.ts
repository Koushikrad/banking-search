/**
 * banking-search-pagination.test.ts
 * @author Koushik R.
 *
 * Unit tests for the pagination / lazy-loading behaviour added to
 * <banking-search>. Runs in Vitest with jsdom.
 *
 * Strategy:
 *  - Mount a real BankingSearch instance in jsdom.
 *  - Access private state via (el as any) — acceptable for white-box unit tests.
 *  - Mock ResizeObserver and IntersectionObserver (not in jsdom).
 *  - Await el.updateComplete before asserting rendered state.
 */

import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { BankingSearch } from '../../src/components/banking-search/banking-search';
import type {
  SearchResultItem,
  SearchResultGroup,
  BsLoadMoreDetail,
} from '../../src/components/banking-search/banking-search.types';

// ── jsdom stubs ──────────────────────────────────────────────────────────────

// jsdom does not implement ResizeObserver or IntersectionObserver.
// Stub both so connectedCallback / _setupSentinelObserver don't throw.
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

vi.stubGlobal('ResizeObserver',    StubResizeObserver);
vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);

// ── Element registration ─────────────────────────────────────────────────────

beforeAll(() => {
  if (!customElements.get('banking-search')) {
    customElements.define('banking-search', BankingSearch);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function item(id: string): SearchResultItem {
  return { id, type: 'account', title: `Item ${id}` };
}

function items(count: number): SearchResultItem[] {
  return Array.from({ length: count }, (_, i) => item(`i${i + 1}`));
}

/** Mount, attach to DOM, wait for first Lit render. */
async function mount(): Promise<BankingSearch> {
  const el = document.createElement('banking-search') as BankingSearch;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

// ── Teardown ─────────────────────────────────────────────────────────────────

afterEach(() => {
  document.body.innerHTML = '';
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('_allFlatResults()', () => {
  it('returns empty array when no results set', async () => {
    const el = await mount();
    expect((el as any)._allFlatResults()).toHaveLength(0);
  });

  it('returns all items from a flat results array', async () => {
    const el = await mount();
    el.results = items(12);
    expect((el as any)._allFlatResults()).toHaveLength(12);
  });

  it('flattens grouped results across all groups', async () => {
    const el = await mount();
    const grouped: SearchResultGroup[] = [
      { groupId: 'a', label: 'A', items: items(3) },
      { groupId: 'b', label: 'B', items: items(5) },
    ];
    el.results = grouped;
    expect((el as any)._allFlatResults()).toHaveLength(8);
  });
});

describe('_flatResults()', () => {
  it('defaults to pageSize when _visibleCount is 0', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results = items(20);
    // _visibleCount starts at 0 until a search fires — falls back to pageSize
    expect((el as any)._visibleCount).toBe(0);
    expect((el as any)._flatResults()).toHaveLength(5);
  });

  it('returns _visibleCount items after window expansion', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results = items(20);
    (el as any)._visibleCount = 10;
    expect((el as any)._flatResults()).toHaveLength(10);
  });

  it('never exceeds total available items', async () => {
    const el = await mount();
    el.pageSize = 10;
    el.results = items(4);
    expect((el as any)._flatResults()).toHaveLength(4);
  });

  it('respects _visibleCount cap against total', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results = items(8);
    (el as any)._visibleCount = 50; // larger than total
    expect((el as any)._flatResults()).toHaveLength(8);
  });
});

describe('results setter', () => {
  it('skips update on reference-equal assignment', async () => {
    const el = await mount();
    const data = items(3);
    el.results = data;
    const spy = vi.spyOn(el, 'requestUpdate');
    el.results = data; // same reference
    expect(spy).not.toHaveBeenCalled();
  });

  it('expands _visibleCount by pageSize when _loadingMore is true', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results = items(5);
    (el as any)._visibleCount  = 5;
    (el as any)._loadingMore   = true;

    el.results = items(10); // host appended a new page
    expect((el as any)._visibleCount).toBe(10);
    expect((el as any)._loadingMore).toBe(false);
  });

  it('does not change _visibleCount when _loadingMore is false', async () => {
    const el = await mount();
    el.pageSize = 5;
    (el as any)._visibleCount = 7;
    (el as any)._loadingMore  = false;

    el.results = items(10);
    expect((el as any)._visibleCount).toBe(7);
  });
});

describe('_fireSearch() pagination reset', () => {
  it('resets _visibleCount to pageSize on a new search', async () => {
    const el = await mount();
    el.pageSize = 5;
    (el as any)._visibleCount  = 20;
    (el as any)._inputValue    = 'acc';

    (el as any)._fireSearch('acc');
    expect((el as any)._visibleCount).toBe(5);
  });

  it('resets _page to 1 on a new search', async () => {
    const el = await mount();
    (el as any)._page       = 4;
    (el as any)._inputValue = 'acc';

    (el as any)._fireSearch('acc');
    expect((el as any)._page).toBe(1);
  });

  it('clears _loadingMore on a new search', async () => {
    const el = await mount();
    (el as any)._loadingMore = true;
    (el as any)._inputValue  = 'acc';

    (el as any)._fireSearch('acc');
    expect((el as any)._loadingMore).toBe(false);
  });
});

describe('_onLoadMore()', () => {
  it('expands _visibleCount when in-memory items exceed visible window', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results  = items(15);
    (el as any)._visibleCount = 5;

    (el as any)._onLoadMore();

    expect((el as any)._visibleCount).toBe(10);
    expect((el as any)._loadingMore).toBe(false);
  });

  it('caps _visibleCount at total in-memory count', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results  = items(7);
    (el as any)._visibleCount = 5;

    (el as any)._onLoadMore();

    expect((el as any)._visibleCount).toBe(7);
  });

  it('fires bs:load-more when hasMore=true and all in-memory items are visible', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results  = items(5);
    el.setAttribute('has-more', '');
    (el as any)._visibleCount  = 5;
    (el as any)._page          = 1;
    (el as any)._inputValue    = 'test';
    (el as any)._activeFilter  = 'all';
    await el.updateComplete;

    const fired: BsLoadMoreDetail[] = [];
    el.addEventListener('bs:load-more', (e: Event) => {
      fired.push((e as CustomEvent<BsLoadMoreDetail>).detail);
    });

    (el as any)._onLoadMore();

    expect(fired).toHaveLength(1);
    expect(fired[0].page).toBe(2);
    expect(fired[0].term).toBe('test');
    expect(fired[0].filter).toBe('all');
    expect(fired[0].requestId).toBeTruthy();
    expect((el as any)._loadingMore).toBe(true);
  });

  it('does not fire bs:load-more when in-memory items still exceed visible window', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results  = items(12);
    el.setAttribute('has-more', '');
    (el as any)._visibleCount = 5;

    const fired: Event[] = [];
    el.addEventListener('bs:load-more', (e) => fired.push(e));

    (el as any)._onLoadMore();

    expect(fired).toHaveLength(0);
    expect((el as any)._visibleCount).toBe(10);
  });

  it('does not fire bs:load-more when hasMore is false even if at end', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results  = items(5);
    el.removeAttribute('has-more'); // no more server pages
    (el as any)._visibleCount = 5;

    const fired: Event[] = [];
    el.addEventListener('bs:load-more', (e) => fired.push(e));

    (el as any)._onLoadMore();

    expect(fired).toHaveLength(0);
  });

  it('increments _page on each server-side load-more trigger', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results  = items(5);
    el.setAttribute('has-more', '');
    (el as any)._visibleCount  = 5;
    (el as any)._page          = 1;
    (el as any)._inputValue    = 'x';
    await el.updateComplete;

    el.addEventListener('bs:load-more', () => {});
    (el as any)._onLoadMore();

    expect((el as any)._page).toBe(2);
  });
});

describe('_moveFocus() auto-expand', () => {
  it('expands visible window by 1 when arrowing past last visible item', async () => {
    const el = await mount();
    el.pageSize = 3;
    el.results  = items(6);
    (el as any)._visibleCount  = 3;
    (el as any)._activeIndex   = 2; // on last visible item

    (el as any)._moveFocus(1);

    expect((el as any)._visibleCount).toBe(4);
    expect((el as any)._activeIndex).toBe(3);
  });

  it('wraps to top when arrowing past the last item in the full set', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results  = items(5);
    (el as any)._visibleCount  = 5;
    (el as any)._activeIndex   = 4; // on last item

    (el as any)._moveFocus(1);

    expect((el as any)._activeIndex).toBe(0);
    expect((el as any)._visibleCount).toBe(5); // unchanged — nothing to expand
  });

  it('wraps to last visible item when arrowing up from index 0', async () => {
    const el = await mount();
    el.pageSize = 5;
    el.results  = items(5);
    (el as any)._visibleCount  = 5;
    (el as any)._activeIndex   = 0;

    (el as any)._moveFocus(-1);

    expect((el as any)._activeIndex).toBe(4);
  });

  it('does nothing when there are no results', async () => {
    const el = await mount();
    (el as any)._activeIndex = -1;

    (el as any)._moveFocus(1);

    expect((el as any)._activeIndex).toBe(-1);
  });
});
