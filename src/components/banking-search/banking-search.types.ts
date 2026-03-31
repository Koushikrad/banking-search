/**
 * banking-search.types.ts
 *
 * Single source of truth for all public TypeScript interfaces and types.
 * This file has zero runtime footprint — it is erased entirely at compile time.
 *
 * Consumers who use the ESM build can import from 'banking-search' directly;
 * all types are re-exported via src/index.ts.
 */

// ---------------------------------------------------------------------------
// Search Result Items
// ---------------------------------------------------------------------------

/**
 * Badge attached to a result row.
 * Variant drives the colour token applied in banking-search.styles.ts.
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
 * `type` is a plain string (not a strict union) so the host can extend it
 * with domain-specific entity types (e.g. 'branch', 'product') without
 * modifying this file. The component uses `type` only to resolve an icon
 * key — unknown types fall back to a generic icon.
 */
export interface SearchResultItem {
  /** Stable unique identifier — used as the `id` on the `role="option"` element. */
  id: string;

  /**
   * Entity type, used to resolve the icon.
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
   * If omitted, falls back to `type`. If the key is unknown, uses 'generic'.
   * No emojis — SVG only.
   */
  icon?: string;

  /**
   * Arbitrary key-value pairs surfaced in a detail tooltip on hover/focus.
   * Values must be plain strings (no HTML).
   * Example: { balance: '$12,450.00', branch: 'Downtown' }
   */
  meta?: Record<string, string>;

  /**
   * Optional navigation URL. When set, selecting the item navigates to this URL
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
 * The host sets `el.filters = [...]` to populate the chip row.
 */
export interface FilterOption {
  /** Stable identifier sent in bs:search and bs:filter-change event details. */
  id: string;

  /** Display label on the chip (e.g. "All", "Accounts"). */
  label: string;

  /**
   * Optional count badge on the chip.
   * Useful for showing total results per category.
   */
  count?: number;
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/**
 * String values the host may set on the `error` attribute.
 * The component maps each code to a human-safe display message.
 * Never pass raw server error strings — use these codes or a safe custom message.
 */
export type ErrorCode =
  | 'network'      // fetch failed / offline
  | 'timeout'      // request exceeded threshold
  | 'rate-limited' // HTTP 429
  | 'unauthorized' // HTTP 401/403 — show generic message only
  | 'server'       // HTTP 5xx
  | 'unknown';     // catch-all

// ---------------------------------------------------------------------------
// Custom event detail shapes
// ---------------------------------------------------------------------------

/** Detail shape for the `bs:search` event. */
export interface BsSearchDetail {
  term: string;
  filter: string;
  /** Monotonic ID per search invocation — used by the host for AbortController cancellation. */
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

/** Detail shape for the `bs:error` event (for host observability logging). */
export interface BsErrorDetail {
  code: string;
  term: string;
  filter: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// renderItem callback
// ---------------------------------------------------------------------------

/**
 * Optional custom item renderer.
 * If set on the `renderItem` property, called once per result item.
 * Must return a plain HTMLElement — no framework components, no innerHTML with user data.
 * Falls back to the default template when null.
 */
export type RenderItemFn = (item: SearchResultItem) => HTMLElement;
