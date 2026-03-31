/**
 * src/index.ts
 * @author Koushik R.
 *
 * Public entry point for the banking-search library.
 *
 * Importing this file auto-registers <banking-search> as a custom element.
 * All public types are re-exported so TypeScript consumers get full type
 * coverage without a separate @types package.
 *
 * Usage:
 *   import 'banking-search';                          // registers the element
 *   import type { SearchResultItem } from 'banking-search';  // types only
 */

import { BankingSearch } from './components/banking-search/banking-search.js';

// Guard against double-registration errors that can occur in micro-frontend
// setups where multiple bundles may import this module independently.
if (!customElements.get('banking-search')) {
  customElements.define('banking-search', BankingSearch);
}

// Re-export the class for consumers who want to extend or instanceof-check it.
export { BankingSearch };

// Re-export all public types.
export type {
  SearchResultItem,
  SearchResultGroup,
  SearchResults,
  FilterOption,
  ResultBadge,
  ErrorCode,
  RenderItemFn,
  BsSearchDetail,
  BsSelectDetail,
  BsFilterChangeDetail,
  BsRetryDetail,
  BsErrorDetail,
} from './components/banking-search/banking-search.types.js';
