/**
 * @author Koushik R.
 *
 * Public TypeScript interfaces for <banking-search>.
 * Import from 'banking-search' — all types are re-exported via src/index.ts.
 */

// -- Result items -------------------------------------------------------------

/** Status badge shown on the right side of a result row. */
export interface ResultBadge {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'neutral';
}

/**
 * A single result row. `type` is an open string so hosts can add custom entity
 * types (e.g. 'branch') without touching this file — unknown types fall back
 * to a generic icon.
 */
export interface SearchResultItem {
  /** Used as the DOM id on the listbox option element. */
  id: string;
  /** Resolves the row icon. Built-in: 'account' | 'transaction' | 'customer' | 'card' | 'loan'. */
  type: 'account' | 'transaction' | 'customer' | 'card' | 'loan' | string;
  /** Primary text — highlighted on search match. */
  title: string;
  /** Secondary text, e.g. a masked account number "****4821". */
  subtitle?: string;
  badge?: ResultBadge;
  /** Icon key. Falls back to `type`, then 'generic' if unknown. */
  icon?: string;
  /** Key-value pairs shown in a hover tooltip. Values must be plain strings. */
  meta?: Record<string, string>;
  /** When set, selecting this item navigates here in addition to firing bs:select. */
  url?: string;
}

// -- Grouped results ----------------------------------------------------------

/**
 * Wraps result rows under a labelled section header.
 *
 * Pass a SearchResultGroup[] to el.results to get sticky group headers.
 * Pass a SearchResultItem[] for a flat list with no headers.
 *
 * The component detects the mode from the data shape — has-more and grouping
 * are independent. For paginated grouped results the host is responsible for
 * merging pages by groupId before re-assigning el.results. See README for the
 * full accumulation pattern.
 */
export interface SearchResultGroup {
  groupId: string;
  /** Rendered as the section header, e.g. "Accounts". */
  label: string;
  /** Server-side total hit count. Shown as "(N total)" in the header when present. */
  total?: number;
  items: SearchResultItem[];
}

export type SearchResults = SearchResultItem[] | SearchResultGroup[];

// -- Filter chips -------------------------------------------------------------

/** A single chip in the filter bar. Set via el.filters = [...]. */
export interface FilterOption {
  /** Sent in bs:search and bs:filter-change detail. */
  id: string;
  label: string;
  /** Optional count badge on the chip. */
  count?: number;
}

// -- Error codes --------------------------------------------------------------

/**
 * Pass one of these to the `error` attribute. The component maps each code to
 * a safe user-facing message — never pass raw server error strings.
 */
export type ErrorCode =
  | 'network'       // fetch failed / offline
  | 'timeout'       // request exceeded threshold
  | 'rate-limited'  // HTTP 429
  | 'unauthorized'  // HTTP 401/403
  | 'server'        // HTTP 5xx
  | 'unknown';      // catch-all

// -- Event detail shapes ------------------------------------------------------

export interface BsSearchDetail {
  term: string;
  /** Full set of active filter IDs. "all" means no specific filter is applied. */
  filters: string[];
  /** First active non-"all" filter, or "all". Compat alias for single-select hosts. */
  filter: string;
  /** Unique per invocation — use with AbortController to cancel stale requests. */
  requestId: string;
}

export interface BsSelectDetail {
  item: SearchResultItem;
}

export interface BsFilterChangeDetail {
  filters: string[];
  filter: string; // compat alias
}

export interface BsRetryDetail {
  term: string;
  filters: string[];
  filter: string; // compat alias
}

/** Emitted when the error attribute is set — useful for observability logging. */
export interface BsErrorDetail {
  code: string;
  term: string;
  filters: string[];
  filter: string; // compat alias
  timestamp: number;
}

/**
 * Emitted when the IntersectionObserver sentinel scrolls into view and
 * has-more is true. Fetch the next page using `term`, `filters`, and `page`,
 * then accumulate and re-set el.results. Remove has-more when done.
 */
export interface BsLoadMoreDetail {
  term: string;
  filters: string[];
  filter: string; // compat alias
  /** 1-based, increments per load-more trigger, resets to 1 on new search. */
  page: number;
  requestId: string;
}

// -- Custom renderer ----------------------------------------------------------

/**
 * Optional callback for rendering a custom result row.
 * Return a plain HTMLElement — do not use innerHTML with user data.
 * The component attaches ARIA attributes (role, id, aria-selected, tabindex).
 */
export type RenderItemFn = (item: SearchResultItem) => HTMLElement;
