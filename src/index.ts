/**
 * src/index.ts — Public entry point for the banking-search library.
 *
 * Importing this file auto-registers <banking-search> as a custom element.
 * All public types are re-exported so TypeScript consumers get them
 * without a separate @types package.
 *
 * Usage:
 *   import 'banking-search';                     // side-effect: registers element
 *   import type { SearchResultItem } from 'banking-search'; // types
 */

import { BankingSearch } from './components/banking-search/banking-search.js';

// Register the custom element. Guard prevents double-registration errors
// when multiple bundles import this file (e.g. micro-frontend setups).
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
