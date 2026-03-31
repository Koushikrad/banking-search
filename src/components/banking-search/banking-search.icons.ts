/**
 * banking-search.icons.ts
 * @author Koushik R.
 *
 * SVG icon registry for the <banking-search> component.
 *
 * All icons are 16x16 viewBox, stroke-based, and aria-hidden.
 * No emojis, no external icon packs — fully self-contained.
 *
 * To add a new icon:
 *  1. Add a key-value entry to ICONS below.
 *  2. Use the key as the `icon` field on a SearchResultItem, or pass it
 *     directly to the icon() helper.
 *  3. Unknown keys fall back to 'generic' automatically.
 */

const ICONS: Record<string, string> = {
  search: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  clear: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  account: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M2 6h12" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,

  transaction: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path d="M2 5h12M10 2l3 3-3 3M14 11H2M6 8l-3 3 3 3"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  customer: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/>
    <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  card: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M1 7h14" stroke="currentColor" stroke-width="1.5"/>
    <rect x="3" y="9.5" width="3" height="1.5" rx="0.5" fill="currentColor"/>
  </svg>`,

  loan: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path d="M8 2v12M5 5s0-2 3-2 3 2 3 2-0 2-3 2-3 2-3 2 0 2 3 2 3-2 3-2"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  warning: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path d="M8 2L14.5 13H1.5L8 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M8 6v3M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  offline: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path d="M2 2l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M9.5 4.5A5 5 0 0114 9M6.5 4.5A5 5 0 002 9M4.5 7A3.5 3.5 0 018 5.5M11.5 7A3.5 3.5 0 018 5.5M6.5 10a2 2 0 013 0M8 13v.5"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  generic: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
};

/**
 * Returns the SVG string for the given icon key.
 * Falls back to the 'generic' icon for any unknown key.
 */
export function icon(key: string): string {
  return ICONS[key] ?? ICONS['generic'];
}
