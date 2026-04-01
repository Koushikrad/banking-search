# `<banking-search>` — Smart Search Web Component

A production-ready search web component for banking applications. Drop it into any framework — React, Vue, Angular, or plain HTML — with no adapter layer required.

**[Live Demo](https://koushikr.github.io/banking-search/demo/)** &nbsp;·&nbsp; 113 tests passing &nbsp;·&nbsp; Zero runtime dependencies beyond Lit

---

## Table of Contents

- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Component API](#component-api)
- [Events](#events)
- [Theming](#theming)
- [Framework Usage](#framework-usage)
- [Testing](#testing)
- [Browser Support](#browser-support)

---

## Technology Stack

### Lit — Web Component Framework

**Why Lit over vanilla Custom Elements, Stencil.js, or FAST?**

| | Vanilla CE | Stencil.js | FAST | **Lit** |
|---|---|---|---|---|
| Bundle size | 0KB | ~15KB | ~10KB | **~5KB** |
| Reactive properties | Manual | Decorator | Decorator | **Decorator** |
| Shadow DOM | Manual | Built-in | Built-in | **Built-in** |
| Compile step | None | Heavy | Moderate | **Light (TS only)** |
| Framework wrappers | None | Auto-generated | None | **None needed** |

Vanilla Custom Elements require hundreds of lines of boilerplate to implement reactive properties and efficient DOM diffing. Stencil.js generates framework-specific wrappers we do not need and introduces a heavy compile pipeline. FAST (Microsoft) is well-engineered but more opinionated toward a design-system ecosystem.

Lit hits the exact middle: it is a thin layer (~5KB) over the native Custom Elements and Shadow DOM APIs, adding only reactive properties and a tagged template literal renderer. No virtual DOM, no proprietary runtime — just the platform.

Lit is maintained by Google and is used in production by Google, Adobe, GitHub, and others.

---

### Vite — Build Tool

- **Dev server**: Native ESM — no bundling step, instant startup, instant HMR
- **Library mode**: `build.lib` generates ESM (`banking-search.js`) and UMD (`banking-search.umd.js`) in a single command with zero Rollup config needed
- **TypeScript**: First-class, no separate `tsc` watch process required
- **Alternative considered**: Webpack — significantly more config, slower cold start, no built-in library mode

---

### TypeScript — Type Safety

The public API is fully typed (`SearchResultItem`, `SearchResultGroup`, `BsSearchDetail`, etc.). These interfaces serve a dual purpose: they enforce correctness at compile time and act as living documentation for consumers. Lit's decorators (`@property`, `@state`, `@query`) require TypeScript to work correctly with class field semantics (`useDefineForClassFields: false` is essential for decorator compatibility).

---

### Vitest — Unit Testing

- Same transform pipeline as Vite — zero separate config, instant test startup
- Compatible with the Jest API — no new patterns to learn
- jsdom environment for testing Shadow DOM without a real browser
- `@open-wc/testing` adds `fixture()` for mounting Lit components in tests with proper lifecycle

---

### No Third-Party Positioning Library

The brief permitted positioning libraries. We chose not to use one — deliberately.

The dropdown is positioned using `getBoundingClientRect()` + `position: fixed` + `ResizeObserver`, updated inside `requestAnimationFrame` to batch reads before writes. This approach:

- Demonstrates direct knowledge of browser layout APIs
- Has no dependency surface that could break across versions
- Works correctly inside Shadow DOM (Popper.js, for example, assumes it can walk the full light DOM)
- `position: fixed` anchors to the viewport rather than a scroll parent, so no scroll-parent traversal hacks are needed for stacking

---

### Web Standards Used

This component is built on platform APIs, not abstractions over them:

| API | Usage |
|---|---|
| Custom Elements v1 | Component registration and lifecycle |
| Shadow DOM v1 | Style isolation — zero leakage in either direction |
| CSS Custom Properties | Theming API — 20 `--bs-*` tokens piercing Shadow DOM |
| `ResizeObserver` | Reposition dropdown when host element resizes |
| `IntersectionObserver` | Pagination sentinel — fires `bs:load-more` when end of list scrolls into view |
| `AbortController` | Request cancellation pattern via `requestId` in event detail |
| `prefers-color-scheme` | `theme="auto"` follows OS preference without JavaScript |
| `prefers-reduced-motion` | Disables open/close transitions for vestibular sensitivity |
| ARIA 1.2 combobox pattern | `role="combobox"`, `aria-activedescendant`, `aria-expanded`, `aria-controls` |
| `getBoundingClientRect` + `rAF` | Layout-thrash-free positioning engine |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
git clone https://github.com/koushikr/banking-search.git
cd banking-search
npm install
```

### Development server

```bash
npm run dev
```

Opens `http://localhost:5173/demo/` — the full interactive demo. Edit any source file and the browser updates instantly via Vite HMR.

### Run tests

```bash
npm test              # run all 113 unit tests once
npm run test:watch    # watch mode
npm run test:ui       # Vitest UI — visual test explorer
npm run test:coverage # coverage report
```

### Build library

```bash
npm run build
```

Outputs to `dist/`:
- `banking-search.js` — ESM, tree-shakeable
- `banking-search.umd.js` — UMD for CDN / `<script>` tags
- `banking-search.d.ts` — TypeScript declarations

---

## Component API

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `"Search..."` | Input placeholder text |
| `min-chars` | `number` | `2` | Characters required before search fires |
| `debounce-ms` | `number` | `300` | Input debounce delay in milliseconds |
| `page-size` | `number` | `10` | Items revealed per scroll page |
| `has-more` | `boolean` | `false` | Signals more pages available; activates load-more sentinel |
| `highlight-matches` | `boolean` | `false` | Bold-highlights matched substrings in results |
| `loading` | `boolean` | `false` | Shows loading skeleton |
| `disabled` | `boolean` | `false` | Disables all interaction |
| `error` | `string` | — | Error code: `network` `timeout` `rate-limited` `unauthorized` `server` `unknown` |
| `theme` | `string` | `"auto"` | `light` `dark` `auto` (follows OS preference) |
| `no-results-text` | `string` | `"No results found"` | Empty state message |
| `hint` | `string` | — | Helper text shown below the input, above filters |
| `search-label` | `string` | `"Search"` | `aria-label` on the input (i18n) |

### JavaScript Properties

Set programmatically after mount — not reflected as attributes.

| Property | Type | Description |
|---|---|---|
| `results` | `SearchResultItem[] \| SearchResultGroup[]` | Set search results. Flat array = no group headers. Grouped array = sticky group headers. Component does not append — host must accumulate pages. |
| `filters` | `FilterOption[]` | Filter chips. First chip with `id: 'all'` is treated as the "no filter" option. |
| `renderItem` | `(item: SearchResultItem) => HTMLElement \| null` | Custom row renderer. Component attaches ARIA attributes. Falls back to built-in template when null. |

### Named Slots

| Slot | Replaces |
|---|---|
| `slot="no-results"` | Built-in empty state panel |
| `slot="error"` | Built-in error panel |

```html
<banking-search>
  <div slot="no-results">No accounts found. <a href="/help">Need help?</a></div>
  <div slot="error">Something went wrong. <a href="/support">Contact support</a></div>
</banking-search>
```

---

## Data Structures

The `results` property accepts either a **flat array** or a **grouped array**. The component detects the shape automatically — no extra configuration needed.

### `SearchResultItem`

A single result row.

```typescript
interface SearchResultItem {
  id: string;           // Stable unique identifier
  type: string;         // 'account' | 'transaction' | 'customer' | 'card' | 'loan' | any string
  title: string;        // Primary display text — highlighted on match
  subtitle?: string;    // Secondary text, e.g. "****4821 · Chase Bank"
  badge?: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'neutral';
  };
  icon?: string;        // Icon key — falls back to `type`, then 'generic'
  url?: string;         // Optional navigation URL on selection
  meta?: Record<string, string>; // Key-value pairs shown in tooltip on hover
}
```

### `SearchResultGroup`

Wraps items under a labelled section header.

```typescript
interface SearchResultGroup {
  groupId: string;      // Stable group identifier, e.g. 'accounts'
  label: string;        // Display label, e.g. 'Accounts'
  total?: number;       // Server-side hit count — shown as "(N total)" in header
  items: SearchResultItem[];
}
```

### Flat vs. grouped

```js
// Flat — single list, no headers
el.results = [
  { id: 'acc-1', type: 'account', title: 'Primary Checking', subtitle: '****4821' },
  { id: 'txn-1', type: 'transaction', title: 'Amazon Purchase', badge: { label: '-$234', variant: 'error' } },
];

// Grouped — sticky section header per group
el.results = [
  {
    groupId: 'accounts',
    label: 'Accounts',
    total: 24,           // "Accounts (24 total)" in header
    items: [
      { id: 'acc-1', type: 'account', title: 'Primary Checking', subtitle: '****4821' },
    ],
  },
  {
    groupId: 'transactions',
    label: 'Transactions',
    total: 312,
    items: [
      { id: 'txn-1', type: 'transaction', title: 'Amazon Purchase', badge: { label: '-$234', variant: 'error' } },
    ],
  },
];
```

The `type` field resolves a built-in SVG icon. Built-in values: `account`, `transaction`, `customer`, `card`, `loan`. Any other string falls back to a generic icon.

---

## Lazy Loading (Infinite Scroll)

The component implements **lazy loading** via the **IntersectionObserver sentinel pattern** — a standard browser technique for infinite scroll without scroll event listeners.

### How it works

1. A 1px invisible sentinel element is rendered at the bottom of the results list
2. An `IntersectionObserver` watches the sentinel with `root` set to the dropdown container (not the viewport)
3. When the sentinel scrolls into view — whether by mouse scroll or arrow key navigation — and `has-more="true"` is set, the component fires `bs:load-more`
4. The host fetches the next page, appends to its accumulated result set, and re-sets `el.results`
5. When the backend signals no more pages, the host removes `has-more` and the sentinel is deactivated

This approach is more efficient than scroll event listeners: the browser handles intersection detection natively off the main thread with zero throttling needed.

### Host contract

The component **never appends internally** — it replaces its state on every `el.results =` assignment. The host owns page accumulation:

```js
let accumulated = [];

el.addEventListener('bs:search', async ({ detail }) => {
  accumulated = [];                          // reset on new search
  el.setAttribute('loading', '');
  const page = await api.search(detail.term, detail.filters, 1);
  accumulated = page.items;
  el.results = accumulated;
  el.toggleAttribute('has-more', page.hasMore);
  el.removeAttribute('loading');
});

el.addEventListener('bs:load-more', async ({ detail }) => {
  const page = await api.search(detail.term, detail.filters, detail.page);
  accumulated = [...accumulated, ...page.items];  // host accumulates
  el.results = accumulated;                       // component replaces
  if (!page.hasMore) el.removeAttribute('has-more');
});
```

For **grouped results**, merge by `groupId` before re-setting:

```js
page.groups.forEach(newGroup => {
  const existing = accumulated.find(g => g.groupId === newGroup.groupId);
  if (existing) existing.items.push(...newGroup.items);
  else accumulated.push(newGroup);
});
el.results = [...accumulated];
```

The `page` counter in `bs:load-more` detail is 1-based and increments automatically. `requestId` lets you pair it with an `AbortController` to cancel in-flight requests when a new `bs:search` fires mid-load.

---

## Events

All events bubble and are composed — they cross Shadow DOM boundaries in every framework.

| Event | Detail | When |
|---|---|---|
| `bs:search` | `{ term, filters, filter, requestId }` | Debounced input (≥ min-chars). Use `requestId` with `AbortController` to cancel stale requests. |
| `bs:select` | `{ item }` | User selects a result (click or Enter) |
| `bs:filter-change` | `{ filters, filter }` | Active filter set changes |
| `bs:load-more` | `{ term, filters, filter, page, requestId }` | Scroll sentinel enters view with `has-more=true`. Host must accumulate results and re-set `el.results`. |
| `bs:clear` | `{}` | Input cleared |
| `bs:open` | `{}` | Dropdown opens |
| `bs:close` | `{}` | Dropdown closes |
| `bs:retry` | `{ term, filters, filter }` | Retry clicked after an error |
| `bs:error` | `{ code, term, filters, filter, timestamp }` | Error attribute set — for observability logging |

> `filters` is the full active set (e.g. `['accounts', 'cards']`). `filter` is a backward-compat alias — the first non-all filter, or `'all'`. Single-filter hosts can ignore `filters` and read `filter` unchanged.

### Integration pattern

```js
const el = document.getElementById('search');
let controller;

el.filters = [
  { id: 'all',          label: 'All'          },
  { id: 'accounts',     label: 'Accounts'     },
  { id: 'transactions', label: 'Transactions' },
];

el.addEventListener('bs:search', async ({ detail }) => {
  controller?.abort();
  controller = new AbortController();
  el.setAttribute('loading', '');
  el.removeAttribute('error');
  try {
    const data = await fetchResults(detail.term, detail.filters, controller.signal);
    el.results = data;
  } catch (err) {
    if (err.name !== 'AbortError') el.setAttribute('error', 'network');
  } finally {
    el.removeAttribute('loading');
  }
});

el.addEventListener('bs:select', ({ detail }) => router.navigate(detail.item.url));
```

---

## Theming

The component exposes 20 CSS custom properties. Set them on any ancestor — they pierce Shadow DOM by design.

```css
banking-search {
  --bs-primary:         #0066cc;
  --bs-bg:              #ffffff;
  --bs-surface:         #f8f9fa;
  --bs-border:          #dee2e6;
  --bs-text:            #212529;
  --bs-text-secondary:  #6c757d;
  --bs-hover-bg:        #f0f4f8;
  --bs-active-bg:       #e8f0fe;
  --bs-highlight-color: #0066cc;
  --bs-shadow:          0 4px 20px rgba(0,0,0,.12);
  --bs-radius:          10px;
}
```

**Dark mode** — sync the component to your page theme without JavaScript:

```css
/* Only overrides auto-mode components — respects explicit theme="light" or theme="dark" */
[data-theme="dark"] banking-search[theme="auto"] {
  --bs-bg:            #1a1d23;
  --bs-surface:       #22262f;
  --bs-border:        #3a3f4b;
  --bs-text:          #f0f4f8;
  --bs-text-secondary:#8b95a4;
}
```

| `theme` value | Behaviour |
|---|---|
| `light` | Always light — page CSS cannot override |
| `dark` | Always dark — page CSS cannot override |
| `auto` | Follows `prefers-color-scheme`; inherits `--bs-*` overrides from parent |

---

## Keyboard Navigation

| Key | Action |
|---|---|
| `↓` / `↑` | Navigate results; `↓` from input enters listbox |
| `Enter` | Select highlighted result |
| `Escape` | Close dropdown, return focus to input |
| `Home` / `End` | Jump to first / last result |
| `Tab` | Close dropdown, continue tab order |
| `←` / `→` | Navigate filter chips |
| `Space` / `Enter` on chip | Toggle filter |

---

## Framework Usage

### React

```jsx
import 'banking-search';
import { useEffect, useRef } from 'react';

export function SearchBar({ onSelect }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    el.filters = [{ id: 'all', label: 'All' }, { id: 'accounts', label: 'Accounts' }];
    const onSearch = async ({ detail }) => { /* fetch → el.results = data */ };
    el.addEventListener('bs:search', onSearch);
    el.addEventListener('bs:select', onSelect);
    return () => {
      el.removeEventListener('bs:search', onSearch);
      el.removeEventListener('bs:select', onSelect);
    };
  }, [onSelect]);

  return <banking-search ref={ref} placeholder="Search..." min-chars="2" highlight-matches />;
}
```

### Vue

```vue
<template>
  <banking-search ref="searchEl" placeholder="Search..." min-chars="2"
    highlight-matches @bs:search="onSearch" @bs:select="onSelect" />
</template>

<script setup>
import 'banking-search';
import { ref, onMounted } from 'vue';
const searchEl = ref(null);
onMounted(() => {
  searchEl.value.filters = [{ id: 'all', label: 'All' }];
});
</script>
```

### Angular

```typescript
// app.module.ts
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
@NgModule({ schemas: [CUSTOM_ELEMENTS_SCHEMA] })

// component.ts
import 'banking-search';
```
```html
<banking-search #el placeholder="Search..." min-chars="2" highlight-matches
  (bs:search)="onSearch($event)" (bs:select)="onSelect($event)">
</banking-search>
```

---

## Testing

```bash
npm test              # 113 unit tests (Vitest + jsdom)
npm run test:watch    # watch mode during development
npm run test:ui       # Vitest browser UI
npm run test:coverage # V8 coverage report
```

### Test structure

| File | Tests | Covers |
|---|---|---|
| `debounce.test.ts` | 7 | Debounce fires once, resets on rapid calls, cancel |
| `highlight.test.ts` | 14 | Case-insensitive match, XSS prevention, special chars |
| `positioning.test.ts` | 13 | Below/above flip, edge clamping, min-width |
| `banking-search-keyboard.test.ts` | 23 | Arrow nav, Enter, Escape, Home/End, Tab focus trap, `aria-*` |
| `banking-search-pagination.test.ts` | 47 | Load-more, multi-select filters, `has-more` lifecycle |
| `banking-search-extensibility.test.ts` | 9 | `renderItem`, named slots, `hint` attribute |

---

## Browser Support

| Browser | Version | Notes |
|---|---|---|
| Chrome / Edge | 89+ | Full support |
| Firefox | 90+ | Full support |
| Safari | 15.4+ | Full support |
| iOS Safari | 15.4+ | Touch targets 44px, zoom-prevention on input |

Requires Custom Elements v1, Shadow DOM v1, `ResizeObserver`, and `IntersectionObserver` — all baseline-supported in enterprise browsers as of 2024.

> **Future: Popover API** — The current `position: fixed` engine is solid and self-contained. The native Popover API (`.showPopover()`, top-layer) could replace it to escape all z-index/stacking-context constraints without JavaScript. Deferred due to Safari support arriving only in 2024; the architecture is designed as a drop-in swap when browser support warrants it.

---

## Project Structure

```
src/
├── components/banking-search/
│   ├── banking-search.ts          # LitElement — full component
│   ├── banking-search.styles.ts   # CSS (Shadow DOM, tokens, themes)
│   └── banking-search.types.ts    # Public TypeScript interfaces
├── utils/
│   ├── debounce.ts                # Generic typed debounce with .cancel()
│   ├── highlight.ts               # XSS-safe <mark> injection
│   └── positioning.ts             # Pure positioning function (testable)
└── index.ts                       # Barrel export + customElements.define()

demo/
└── index.html                     # Interactive demo — 8 scenarios, playground

tests/unit/
├── debounce.test.ts
├── highlight.test.ts
├── positioning.test.ts
├── banking-search-keyboard.test.ts
├── banking-search-pagination.test.ts
└── banking-search-extensibility.test.ts
```

---

## License

MIT
