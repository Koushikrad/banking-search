/**
 * @author Koushik R.
 *
 * Importing this module auto-registers <banking-search> as a custom element.
 * All public types are re-exported for TypeScript consumers.
 *
 *   import 'banking-search';                         // registers the element
 *   import type { SearchResultItem } from 'banking-search';
 */

import { BankingSearch } from './components/banking-search/banking-search.js';

// Guard against double-registration in micro-frontend setups where multiple
// bundles may import this module independently.
if (!customElements.get('banking-search')) {
  customElements.define('banking-search', BankingSearch);
}

export { BankingSearch };

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
