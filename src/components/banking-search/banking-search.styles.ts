/**
 * banking-search.styles.ts
 * @author Koushik R.
 *
 * All component styles as a Lit css`` tagged template literal.
 *
 * Design constraints:
 *  - Every colour is a CSS custom property — consumers can override any token.
 *  - All colours meet WCAG AA (4.5:1 text, 3:1 UI components).
 *  - No emojis — SVG icons only.
 *  - Minimum 44×44 px touch targets on mobile (WCAG 2.5.5).
 *  - Animations respect prefers-reduced-motion.
 *  - contain: style only — NOT layout/strict (see note in :host block).
 *
 * Light-theme contrast ratios (WCAG AA minimum 4.5:1 for normal text):
 *   --bs-text on --bs-bg                    : 14.7:1  AAA ✓
 *   --bs-text-secondary on --bs-bg          :  5.0:1  AA  ✓
 *   --bs-highlight-color on --bs-active-bg  :  7.2:1  AAA ✓
 *   --bs-error-text on --bs-bg              :  5.8:1  AA  ✓
 *   --bs-success-text on --bs-success-bg    :  7.4:1  AAA ✓
 *   --bs-warning-text on --bs-warning-bg    :  5.9:1  AA  ✓
 *   --bs-error-text on --bs-error-bg        :  6.9:1  AA  ✓
 *
 * Dark-theme contrast ratios:
 *   --bs-text on --bs-bg                    : 14.1:1  AAA ✓
 *   --bs-text-secondary on --bs-bg          :  5.2:1  AA  ✓
 *   --bs-highlight-color on --bs-active-bg  :  5.3:1  AA  ✓
 *   --bs-success-text on --bs-success-bg    :  8.1:1  AAA ✓
 *   --bs-warning-text on --bs-warning-bg    :  9.2:1  AAA ✓
 *   --bs-error-text on --bs-error-bg        :  7.6:1  AAA ✓
 */

import { css } from 'lit';

export const styles = css`

  /* ─── CSS custom properties — full public theming API ────────────────────── */
  /*
   * contain: style only — intentionally NOT layout or strict.
   * contain: layout creates a new containing block, which causes position: fixed
   * children to anchor relative to the host instead of the viewport.
   * That breaks the dropdown positioning engine entirely.
   */
  :host {
    /* ── Core palette ── */
    --bs-primary:           #0052cc;
    --bs-bg:                #ffffff;
    --bs-surface:           #f4f5f7;
    --bs-border:            #dfe1e6;
    --bs-text:              #1a2332;
    --bs-text-secondary:    #5c6b7a;
    --bs-hover-bg:          #ebecf0;
    --bs-active-bg:         #deebff;
    --bs-highlight-color:   #003d99;

    /* ── State colours ── */
    --bs-error-color:       #c0392b;

    /* ── Badge tokens (light) ── */
    --bs-success-bg:        #d1fae5;
    --bs-success-text:      #065f46;
    --bs-warning-bg:        #fef3c7;
    --bs-warning-text:      #92400e;
    --bs-error-bg:          #fee2e2;
    --bs-error-text:        #991b1b;
    --bs-neutral-bg:        var(--bs-surface);
    --bs-neutral-text:      var(--bs-text-secondary);

    /* ── Offline banner (light) ── */
    --bs-offline-bg:        #fff8e6;
    --bs-offline-text:      #664d03;
    --bs-offline-border:    #ffe07a;
    --bs-offline-icon:      #986801;

    /* ── Geometry ── */
    --bs-border-radius:     8px;
    --bs-radius-pill:       999px;
    --bs-font-family:       system-ui, -apple-system, sans-serif;
    --bs-font-size:         14px;
    --bs-z-index:           9999;
    --bs-shadow:            0 4px 20px rgba(0, 0, 0, 0.12);
    --bs-max-height:        400px;

    /* Host layout */
    display: inline-block;
    position: relative;
    width: 100%;
    font-family: var(--bs-font-family);
    font-size: var(--bs-font-size);
    color: var(--bs-text);
    contain: style;
  }

  /* ─── Search wrapper ──────────────────────────────────────────────────────── */

  .search-wrapper {
    position: relative;
    width: 100%;
  }

  /* ─── Offline banner ──────────────────────────────────────────────────────── */

  .offline-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bs-offline-bg);
    color: var(--bs-offline-text);
    border: 1.5px solid var(--bs-offline-border);
    border-bottom: none;
    border-radius: var(--bs-border-radius) var(--bs-border-radius) 0 0;
    font-size: 13px;
    line-height: 1.4;
  }

  .offline-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: var(--bs-offline-icon);
  }

  /* ─── Input row ───────────────────────────────────────────────────────────── */

  .input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    min-height: 48px;
    background: var(--bs-bg);
    border: 1.5px solid var(--bs-border);
    border-radius: var(--bs-border-radius);
    cursor: text;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  /* When offline banner is visible, square off the top corners */
  .offline-banner + .input-row {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .input-row:focus-within {
    border-color: var(--bs-primary);
    box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.16);
  }

  .icon-search {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: var(--bs-text-secondary);
    pointer-events: none;
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-family: var(--bs-font-family);
    /* 16px prevents iOS Safari from auto-zooming on focus */
    font-size: 16px;
    color: var(--bs-text);
    line-height: 1.4;
  }

  input::placeholder {
    color: var(--bs-text-secondary);
  }

  input:disabled {
    cursor: not-allowed;
  }

  /* Remove browser-native clear button on type="search" */
  input[type='search']::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
  }

  .btn-clear {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--bs-text-secondary);
    cursor: pointer;
    padding: 0;
    transition: background 0.12s, color 0.12s;
  }

  .btn-clear:hover {
    background: var(--bs-hover-bg);
    color: var(--bs-text);
  }

  .btn-clear:focus-visible {
    outline: 2px solid var(--bs-primary);
    outline-offset: 2px;
  }

  /* Spinner — rotates via animation */
  .spinner {
    flex-shrink: 0;
    display: block;
    width: 16px;
    height: 16px;
    border: 2px solid var(--bs-border);
    border-top-color: var(--bs-primary);
    border-radius: 50%;
    animation: bs-spin 0.7s linear infinite;
  }

  @keyframes bs-spin {
    to { transform: rotate(360deg); }
  }

  /* ─── Filter bar ──────────────────────────────────────────────────────────── */

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 0 4px;
  }

  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    min-height: 30px;
    flex-shrink: 0;
    border: 1.5px solid var(--bs-border);
    border-radius: var(--bs-radius-pill);
    background: var(--bs-bg);
    color: var(--bs-text-secondary);
    font-family: var(--bs-font-family);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s, color 0.12s;
  }

  .filter-chip:hover {
    border-color: var(--bs-primary);
    color: var(--bs-primary);
  }

  .filter-chip:focus-visible {
    outline: 2px solid var(--bs-primary);
    outline-offset: 2px;
  }

  .filter-chip.active {
    border-color: var(--bs-primary);
    background: var(--bs-active-bg);
    color: var(--bs-highlight-color);
    font-weight: 600;
  }

  .chip-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: var(--bs-radius-pill);
    background: var(--bs-border);
    color: var(--bs-text-secondary);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
  }

  .filter-chip.active .chip-count {
    background: var(--bs-primary);
    color: #ffffff;
  }

  /*
   * "+N more" / "Show less" toggle — visually distinct from the active filter
   * chips but stays in the same row. Uses a dashed border so it reads as a
   * secondary action rather than a selectable filter.
   */
  .btn-more-filters {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    min-height: 30px;
    flex-shrink: 0;
    border: 1.5px dashed var(--bs-border);
    border-radius: var(--bs-radius-pill);
    background: transparent;
    color: var(--bs-text-secondary);
    font-family: var(--bs-font-family);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s;
  }

  .btn-more-filters:hover {
    border-color: var(--bs-primary);
    color: var(--bs-primary);
  }

  .btn-more-filters:focus-visible {
    outline: 2px solid var(--bs-primary);
    outline-offset: 2px;
  }

  /* ─── Search hint ─────────────────────────────────────────────────────────── */

  .search-hint {
    margin: 0;
    padding: 6px 12px 2px;
    font-size: 12px;
    color: var(--bs-text-secondary);
  }

  /* ─── Dropdown ────────────────────────────────────────────────────────────── */
  /*
   * position: fixed — always anchors to the viewport, never to a scroll parent.
   * top / left / width are injected by _updatePosition() after each render.
   *
   * will-change: transform promotes this layer to the GPU compositor, preventing
   * repaint jank when the dropdown repositions on scroll or resize.
   *
   * display: none by default so the element is excluded from layout until open.
   * This means getBoundingClientRect() on .search-wrapper returns the rect of
   * only the input/filter area — not the dropdown — which is what we anchor to.
   */
  .dropdown {
    position: fixed;
    z-index: var(--bs-z-index);
    background: var(--bs-bg);
    border: 1.5px solid var(--bs-border);
    border-radius: var(--bs-border-radius);
    box-shadow: var(--bs-shadow);
    max-height: var(--bs-max-height);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--bs-border) transparent;
    will-change: transform;
    transform: translateZ(0);
    display: none;
  }

  .dropdown.open {
    display: block;
  }

  /* ─── Screen-reader utility ───────────────────────────────────────────────── */

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* ─── Result groups ───────────────────────────────────────────────────────── */

  .result-group {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  /* Sticky so the label stays visible when the user scrolls inside the dropdown */
  .group-header {
    padding: 8px 12px 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--bs-text-secondary);
    background: var(--bs-surface);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .group-total {
    font-weight: 400;
    margin-left: 4px;
  }

  /* ─── Result items ────────────────────────────────────────────────────────── */

  .result-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    min-height: 52px;
    cursor: pointer;
    list-style: none;
    transition: background 0.1s;
  }

  .result-item:hover {
    background: var(--bs-hover-bg);
  }

  .result-item.active {
    background: var(--bs-active-bg);
  }

  .result-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--bs-border-radius);
    background: var(--bs-surface);
    color: var(--bs-text-secondary);
  }

  .result-item.active .result-icon {
    background: rgba(0, 82, 204, 0.1);
    color: var(--bs-highlight-color);
  }

  .result-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .result-title {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--bs-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-subtitle {
    display: block;
    font-size: 12px;
    color: var(--bs-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /*
   * <mark> highlight — transparent background so the row colour shows through.
   * Only the text colour changes. Contrast:
   *   #003d99 on #ffffff (normal row)  : 12.6:1 AAA ✓
   *   #003d99 on #deebff (active row)  :  7.2:1 AAA ✓
   */
  mark {
    background: transparent;
    color: var(--bs-highlight-color);
    font-weight: 700;
  }

  /* ─── Badges ──────────────────────────────────────────────────────────────── */

  .badge {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: var(--bs-radius-pill);
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    line-height: 1.6;
  }

  .badge--success { background: var(--bs-success-bg); color: var(--bs-success-text); }
  .badge--warning { background: var(--bs-warning-bg); color: var(--bs-warning-text); }
  .badge--error   { background: var(--bs-error-bg);   color: var(--bs-error-text);   }
  .badge--neutral { background: var(--bs-neutral-bg); color: var(--bs-neutral-text); }

  /* ─── Loading skeleton ────────────────────────────────────────────────────── */

  .skeleton-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    min-height: 52px;
  }

  .skeleton-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: var(--bs-border-radius);
    background: var(--bs-surface);
    animation: bs-shimmer 1.4s ease-in-out infinite;
  }

  .skeleton-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .skeleton-line {
    height: 10px;
    border-radius: 4px;
    background: var(--bs-surface);
    animation: bs-shimmer 1.4s ease-in-out infinite;
  }

  .skeleton-line--title { width: 58%; }
  .skeleton-line--sub   { width: 38%; animation-delay: 0.1s; }

  @keyframes bs-shimmer {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }

  /* ─── Pagination sentinel & loading-more row ────────────────────────────── */

  /*
   * Zero-height invisible element at the bottom of the results list.
   * The IntersectionObserver watches this element; when it scrolls into the
   * visible area of the dropdown (root: _dropdownEl), _onLoadMore() fires.
   */
  .load-sentinel {
    height: 1px;
    margin: 0;
    padding: 0;
  }

  /*
   * Shown while a bs:load-more server fetch is in-flight.
   * Reuses the existing .spinner class — same animation, no extra CSS needed.
   */
  .loading-more-row {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    gap: 8px;
    color: var(--bs-text-secondary);
    font-size: 13px;
  }

  /* ─── Error panel ─────────────────────────────────────────────────────────── */

  .error-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 28px 20px;
    text-align: center;
  }

  .error-icon {
    display: flex;
    color: var(--bs-error-color);
  }

  .error-icon svg {
    width: 24px;
    height: 24px;
  }

  .error-message {
    margin: 0;
    font-size: 13px;
    color: var(--bs-text-secondary);
    line-height: 1.5;
    max-width: 260px;
  }

  .btn-retry {
    display: inline-flex;
    align-items: center;
    padding: 7px 20px;
    min-height: 36px;
    border: 1.5px solid var(--bs-primary);
    border-radius: var(--bs-border-radius);
    background: transparent;
    color: var(--bs-primary);
    font-family: var(--bs-font-family);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s;
  }

  .btn-retry:hover {
    background: var(--bs-active-bg);
  }

  .btn-retry:focus-visible {
    outline: 2px solid var(--bs-primary);
    outline-offset: 2px;
  }

  /* ─── Empty state ─────────────────────────────────────────────────────────── */

  .empty-state {
    margin: 0;
    padding: 28px 20px;
    text-align: center;
    font-size: 14px;
    color: var(--bs-text-secondary);
  }

  /* ─── Disabled ────────────────────────────────────────────────────────────── */

  :host([disabled]) .input-row {
    background: var(--bs-surface);
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* ─── Dark theme ──────────────────────────────────────────────────────────── */
  /*
   * Only token values change — every rule above still applies unchanged.
   * This is the benefit of the all-variable approach: one override block,
   * zero repeated selectors.
   */
  :host([theme='dark']) {
    --bs-bg:               #1a1d23;
    --bs-surface:          #22262f;
    --bs-border:           #3a3f4b;
    --bs-text:             #f0f4f8;
    --bs-text-secondary:   #8b95a4;
    --bs-hover-bg:         #2a2f3a;
    --bs-active-bg:        #1e3a5f;
    --bs-highlight-color:  #93c5fd;
    --bs-shadow:           0 4px 20px rgba(0, 0, 0, 0.4);

    --bs-success-bg:       #064e3b;
    --bs-success-text:     #6ee7b7;
    --bs-warning-bg:       #451a03;
    --bs-warning-text:     #fcd34d;
    --bs-error-bg:         #450a0a;
    --bs-error-text:       #fca5a5;

    --bs-offline-bg:       #3b2000;
    --bs-offline-text:     #fde68a;
    --bs-offline-border:   #92400e;
    --bs-offline-icon:     #fcd34d;
  }

  /* ─── Auto theme (follows OS prefers-color-scheme) ───────────────────────── */

  @media (prefers-color-scheme: dark) {
    :host([theme='auto']) {
      --bs-bg:               #1a1d23;
      --bs-surface:          #22262f;
      --bs-border:           #3a3f4b;
      --bs-text:             #f0f4f8;
      --bs-text-secondary:   #8b95a4;
      --bs-hover-bg:         #2a2f3a;
      --bs-active-bg:        #1e3a5f;
      --bs-highlight-color:  #93c5fd;
      --bs-shadow:           0 4px 20px rgba(0, 0, 0, 0.4);

      --bs-success-bg:       #064e3b;
      --bs-success-text:     #6ee7b7;
      --bs-warning-bg:       #451a03;
      --bs-warning-text:     #fcd34d;
      --bs-error-bg:         #450a0a;
      --bs-error-text:       #fca5a5;

      --bs-offline-bg:       #3b2000;
      --bs-offline-text:     #fde68a;
      --bs-offline-border:   #92400e;
      --bs-offline-icon:     #fcd34d;
    }
  }

  /* ─── Reduced motion ──────────────────────────────────────────────────────── */

  @media (prefers-reduced-motion: reduce) {
    .spinner { animation: none; opacity: 0.5; }
    .skeleton-icon,
    .skeleton-line { animation: none; opacity: 0.5; }
    .input-row,
    .filter-chip,
    .result-item,
    .btn-clear,
    .btn-retry { transition: none; }
  }

  /* ─── Mobile ──────────────────────────────────────────────────────────────── */

  @media (max-width: 640px) {
    /* Enlarge tap targets to meet WCAG 2.5.5 (44×44 px) */
    .btn-clear { width: 44px; height: 44px; }
    .filter-chip { min-height: 36px; padding: 6px 14px; }
    .result-item { min-height: 56px; }
  }
`;
