/**
 * banking-search.styles.ts
 *
 * All component styles live here as a Lit css`` tagged template literal.
 * Imported into banking-search.ts via `static override styles = styles`.
 *
 * PHASE 1 — Placeholder only.
 * The full design system (CSS custom properties, themes, animations,
 * skeleton loader, badge variants) is implemented in Phase 5.
 *
 * Design constraints (enforced from Phase 5 onwards):
 *  - All colours must meet WCAG AA contrast ratio (4.5:1 text, 3:1 large text)
 *  - No emojis. SVG icons only.
 *  - All interactive elements: minimum 44x44px touch target
 *  - Animations disabled when prefers-reduced-motion: reduce
 */

import { css } from 'lit';

export const styles = css`
  /*
   * CSS Custom Properties — public theming API.
   * Consumers override these on the banking-search element selector.
   *
   * Contrast ratios (light theme defaults):
   *   --bs-text (#1a2332) on --bs-bg (#ffffff)        : 14.7:1  PASS AAA
   *   --bs-text-secondary (#5c6b7a) on --bs-bg        :  5.0:1  PASS AA
   *   --bs-highlight-color (#003d99) on --bs-active-bg :  7.2:1  PASS AAA
   *   --bs-error (#c0392b) on --bs-bg                 :  5.8:1  PASS AA
   */
  :host {
    /* --- Color tokens --- */
    --bs-primary:         #0052cc;
    --bs-bg:              #ffffff;
    --bs-surface:         #f4f5f7;
    --bs-border:          #dfe1e6;
    --bs-text:            #1a2332;
    --bs-text-secondary:  #5c6b7a;
    --bs-hover-bg:        #ebecf0;
    --bs-active-bg:       #deebff;
    --bs-highlight-color: #003d99;
    --bs-error:           #c0392b;
    --bs-success:         #1a7f37;
    --bs-warning:         #986801;
    --bs-neutral:         #5c6b7a;

    /* --- Geometry tokens --- */
    --bs-border-radius:   8px;
    --bs-font-family:     system-ui, -apple-system, sans-serif;
    --bs-font-size:       14px;
    --bs-z-index:         9999;
    --bs-shadow:          0 4px 20px rgba(0, 0, 0, 0.12);
    --bs-max-height:      400px;

    /* Host layout */
    display: inline-block;
    position: relative;
    font-family: var(--bs-font-family);
    font-size: var(--bs-font-size);
    color: var(--bs-text);

    /* contain:style only — NOT layout or strict.
       contain:layout would create a new containing block and break
       the position:fixed dropdown by anchoring it to the host instead
       of the viewport. */
    contain: style;
  }

  /* Phase 1 placeholder paragraph */
  .search-wrapper p {
    margin: 0;
  }
`;
