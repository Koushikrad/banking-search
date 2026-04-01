/**
 * banking-search.types.ts
 * @author Koushik R.
 *
 * Public TypeScript interfaces and types for the <banking-search> component.
 * This file has zero runtime footprint — it is erased entirely at compile time.
 *
 * Consumers using the ESM build can import types directly from 'banking-search'.
 * All types are re-exported via src/index.ts.
 */

// ---------------------------------------------------------------------------
// Search Result Items
// ---------------------------------------------------------------------------

/**
 * Badge attached to a result row.
 * The variant drives the colour token applied in banking-search.styles.ts.
 *
 * - success  → green  (e.g. "Active", "Approved")
 * - warning  → amber  (e.g. "Pending", "Flagged")
 * - error    → red    (e.g. "Blocked", "Declined")
 * - neutral  → grey   (e.g. "Archived", "Inactive")
 */
export interface ResultBadge {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'neutral';
}

/**
 * A single search result row.
 *
 * The `type` field is a plain string rather than a strict union so the host
 * can extend it with domain-specific entity types (e.g. 'branch', 'product')
 * without modifying this file. The component uses `type` only to resolve an
 * icon key — unknown types fall back to a generic icon.
 */
export interface SearchResultItem {
  /** Stable unique identifier — used as the `id` on the `role="option"` element. */
  id: string;

  /**
   * Entity type used to resolve the icon.
   * Built-in values: 'account' | 'transaction' | 'customer' | 'card' | 'loan'
   * Custom values are accepted and fall back to the generic icon.
   */
  type: 'account' | 'transaction' | 'customer' | 'card' | 'loan' | string;

  /** Primary display text — rendered in the title line and highlighted on match. */
  title: string;

  /** Secondary display text (e.g. masked account number "****4821"). */
  subtitle?: string;

  /** Optional status badge shown on the right of the row. */
  badge?: ResultBadge;

  /**
   * Icon key resolved to an SVG symbol.
   * Falls back to `type` if omitted. Falls back to 'generic' if the key is unknown.
   * No emojis — SVG icons only.
   */
  icon?: string;

  /**
   * Arbitrary key-value pairs surfaced in a detail tooltip on hover/focus.
   * Values must be plain strings (no HTML).
   * Example: { balance: '$12,450.00', branch: 'Downtown' }
   */
  meta?: Record<string, string>;

  /**
   * Optional navigation URL. When set, selecting the item navigates here
   * in addition to firing the bs:select event. When absent, only the event fires.
   */
  url?: string;
}

// ---------------------------------------------------------------------------
// Grouped results
// ---------------------------------------------------------------------------

/**
 * A labelled group of results (e.g. "Accounts", "Transactions").
 *
 * The component accepts either a flat `SearchResultItem[]` or a
 * `SearchResultGroup[]`. The shape of the array drives rendering:
 *
 *   Flat array   → single list, no group headers
 *   Grouped array → each group gets a sticky header + item rows
 *
 * The `has-more` attribute does NOT override this choice — grouping is
 * always determined by what the host puts into `el.results`. This means
 * grouped results are fully supported alongside `has-more` pagination,
 * subject to one host-side responsibility: page accumulation (see below).
 *
 * ## Grouped Pagination Contract (has-more = true + grouped results)
 *
 * When `has-more` is true and the component fires `bs:load-more`, the host
 * fetches the next page. If the backend returns grouped results, the host
 * MUST merge the new page into the existing accumulated groups before
 * setting `el.results` — the component replaces its internal state on each
 * assignment, it does not append internally.
 *
 * The host is responsible for this merge:
 *
 * ```typescript
 * // Host-side accumulation pattern for grouped pagination:
 * let accumulated: SearchResultGroup[] = [];
 *
 * el.addEventListener('bs:load-more', async ({ detail }) => {
 *   const page = await api.search(detail); // returns SearchResultGroup[]
 *
 *   page.groups.forEach((newGroup: SearchResultGroup) => {
 *     const existing = accumulated.find(g => g.groupId === newGroup.groupId);
 *     if (existing) {
 *       existing.items.push(...newGroup.items); // merge into existing group
 *     } else {
 *       accumulated.push(newGroup);             // new group from this page
 *     }
 *   });
 *
 *   el.results = [...accumulated]; // always set the full accumulated state
 *   // has-more stays true until the backend signals the last page
 *   if (!page.hasMore) el.removeAttribute('has-more');
 * });
 *
 * // On new search, reset accumulated:
 * el.addEventListener('bs:search', async ({ detail }) => {
 *   accumulated = [];
 *   // ... fetch page 1 ...
 * });
 * ```
 *
 * ## Flat Pagination Contract (has-more = true + flat results)
 *
 * Simpler — the host concatenates pages into a flat array:
 *
 * ```typescript
 * let accumulated: SearchResultItem[] = [];
 *
 * el.addEventListener('bs:load-more', async ({ detail }) => {
 *   const page = await api.search(detail);
 *   accumulated = [...accumulated, ...page.items];
 *   el.results = accumulated;
 *   if (!page.hasMore) el.removeAttribute('has-more');
 * });
 * ```
 */
export interface SearchResultGroup {
  /** Stable group identifier (e.g. 'accounts', 'transactions'). */
  groupId: string;

  /** Display label for the group header row. */
  label: string;

  /**
   * Total server-side hit count for this group.
   * May exceed `items.length` when the server returns a subset.
   * Rendered as "(N total)" next to the group header when present.
   */
  total?: number;

  /** Result rows belonging to this group. */
  items: SearchResultItem[];
}

/**
 * The `results` property on `<banking-search>` accepts either:
 *
 * - **`SearchResultItem[]`** — flat list, no group headers rendered.
 * - **`SearchResultGroup[]`** — renders a sticky header per group.
 *
 * The component detects the mode by checking for the presence of `groupId`
 * on the first element (see `isGrouped()` in banking-search.ts). This means
 * the **host controls grouping by choosing which shape to provide** — the
 * `has-more` attribute has no bearing on this decision.
 *
 * See `SearchResultGroup` docs above for the full pagination contract.
 */
export type SearchResults = SearchResultItem[] | SearchResultGroup[];

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

/**
 * A single filter chip shown in the filter bar.
 * Set via: el.filters = [...]
 */
export interface FilterOption {
  /** Stable identifier sent in bs:search and bs:filter-change event details. */
  id: string;

  /** Display label on the chip (e.g. "All", "Accounts"). */
  label: string;

  /**
   * Optional count badge shown on the chip.
   * Useful for displaying total results per category.
   */
  count?: number;
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/**
 * String values the host may set on the `error` attribute.
 * The component maps each code to a human-safe display message.
 * Never pass raw server error strings — always use these codes or a safe custom message.
 */
export type ErrorCode =
  | 'network'      // fetch failed / offline
  | 'timeout'      // request exceeded threshold
  | 'rate-limited' // HTTP 429
  | 'unauthorized' // HTTP 401/403 — renders a generic message only
  | 'server'       // HTTP 5xx
  | 'unknown';     // catch-all

// ---------------------------------------------------------------------------
// Custom event detail shapes
// ---------------------------------------------------------------------------

/** Detail shape for the `bs:search` event. */
export interface BsSearchDetail {
  term: string;
  /**
   * All currently active filter IDs.
   * "all" means no specific filter is applied.
   * Multiple specific filters may be active simultaneously.
   */
  filters: string[];
  /**
   * Backward-compatible alias — the first active non-"all" filter, or "all".
   * Hosts that only support single-select can read this field unchanged.
   */
  filter: string;
  /** Monotonic ID per search invocation — lets the host cancel in-flight requests. */
  requestId: string;
}

/** Detail shape for the `bs:select` event. */
export interface BsSelectDetail {
  item: SearchResultItem;
}

/** Detail shape for the `bs:filter-change` event. */
export interface BsFilterChangeDetail {
  /** All currently active filter IDs. */
  filters: string[];
  /** Backward-compatible alias — first active non-"all" filter, or "all". */
  filter: string;
}

/** Detail shape for the `bs:retry` event. */
export interface BsRetryDetail {
  term: string;
  filters: string[];
  filter: string; // compat alias
}

/** Detail shape for the `bs:error` event — used by the host for observability logging. */
export interface BsErrorDetail {
  code: string;
  term: string;
  filters: string[];
  filter: string; // compat alias
  timestamp: number;
}

/**
 * Detail shape for the `bs:load-more` event.
 *
 * Fired when the sentinel element at the bottom of the dropdown scrolls into
 * view AND `has-more` is true (set by the host on the element attribute).
 *
 * The host must:
 * 1. Fetch the next page using `term`, `filters`, and `page`.
 * 2. Accumulate all results fetched so far (merge grouped or concatenate flat).
 * 3. Set the full accumulated result on `el.results`.
 * 4. Remove the `has-more` attribute when the backend signals no more pages.
 *
 * Use `requestId` with an AbortController to cancel stale requests if the
 * user triggers a new `bs:search` before the load-more fetch completes.
 *
 * Example:
 * ```typescript
 * el.addEventListener('bs:load-more', async ({ detail }) => {
 *   controller?.abort();
 *   controller = new AbortController();
 *   try {
 *     const page = await api.search(detail, controller.signal);
 *     accumulated = [...accumulated, ...page.items]; // or merge groups
 *     el.results = accumulated;
 *     if (!page.hasMore) el.removeAttribute('has-more');
 *   } catch (err) {
 *     if (err.name !== 'AbortError') el.setAttribute('error', 'network');
 *   }
 * });
 * ```
 */
export interface BsLoadMoreDetail {
  term: string;
  /** All currently active filter IDs — pass to the backend as-is. */
  filters: string[];
  /** Backward-compatible alias — first active non-"all" filter, or "all". */
  filter: string;
  /** 1-based page number — increments by 1 on each load-more trigger. Resets to 1 on new search. */
  page: number;
  /** Unique ID for this request — use with AbortController to cancel stale fetches. */
  requestId: string;
}

// ---------------------------------------------------------------------------
// Custom item renderer
// ---------------------------------------------------------------------------

/**
 * Optional callback for rendering a custom result row.
 * When set on the `renderItem` property, called once per result item.
 * Must return a plain HTMLElement — no innerHTML with user-supplied data.
 * Falls back to the built-in template when null.
 */
export type RenderItemFn = (item: SearchResultItem) => HTMLElement;
