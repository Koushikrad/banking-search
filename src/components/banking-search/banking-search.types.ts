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
 * The component accepts either a flat SearchResultItem[] or SearchResultGroup[].
 */
export interface SearchResultGroup {
  /** Stable group identifier (e.g. 'accounts', 'transactions'). */
  groupId: string;

  /** Display label for the group header row. */
  label: string;

  /**
   * Total server-side hit count for this group.
   * May exceed items.length when the server returns a subset.
   * Displayed as "(N total)" next to the group header when present.
   */
  total?: number;

  items: SearchResultItem[];
}

/**
 * The `results` property accepts either:
 * - A flat array of items (no grouping, rendered as a single list)
 * - An array of groups (each group renders a header + its items)
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
  filter: string;
}

/** Detail shape for the `bs:retry` event. */
export interface BsRetryDetail {
  term: string;
  filter: string;
}

/** Detail shape for the `bs:error` event — used by the host for observability logging. */
export interface BsErrorDetail {
  code: string;
  term: string;
  filter: string;
  timestamp: number;
}

/**
 * Detail shape for the `bs:load-more` event.
 * Fired when the user scrolls to the bottom of the results and `has-more` is true.
 * The host should fetch the next page and append items to `el.results`.
 */
export interface BsLoadMoreDetail {
  term: string;
  filter: string;
  /** 1-based page number — increments on each load-more trigger. */
  page: number;
  /** Stable ID per request — use to cancel in-flight fetches on new searches. */
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
