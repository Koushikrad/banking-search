# Smart Search Web Component — Implementation Plan

## 1. Overview & Technology Decisions

### Why Lit?
- Lightweight (~5KB) reactive library built on native Web Component standards
- First-class Shadow DOM, reactive properties, and tagged template literals
- No heavy compile pipeline (unlike Stencil.js) — just TypeScript + Vite
- Endorsed by Google, battle-tested in production across frameworks

### Why Vite?
- Near-instant dev server, native ESM, minimal config
- Handles TypeScript, CSS, and library bundling out of the box

### Why Vitest + @web/test-runner?
- Vitest for unit/utility tests (fast, Vite-native)
- @web/test-runner + @open-wc/testing for real browser DOM tests against the actual custom element

### No other third-party libraries
- Positioning: hand-rolled using `getBoundingClientRect()` + `position: fixed` + `ResizeObserver`
- No lodash, no Popper.js, no icon packs

### No emojis — anywhere
- **No emojis in:** UI rendering, demo page, error messages, loading states, test descriptions, test data, README, or code comments
- **Use icons instead:** Inline SVG or a minimal SVG sprite for all visual symbols (search icon, clear ×, warning triangle, spinner, etc.)
- Rationale: Emojis render inconsistently across OS/browser/screen reader combinations and are unprofessional in a banking context

---

## 2. Component Name & Public API

**Custom element tag:** `<banking-search>`

### Attributes / Reflected Properties

| Attribute            | Type                   | Default              | Description                                      |
|----------------------|------------------------|----------------------|--------------------------------------------------|
| `placeholder`        | `string`               | `"Search..."`        | Input placeholder text                           |
| `debounce-ms`        | `number`               | `300`                | Milliseconds to debounce input before firing event |
| `min-chars`          | `number`               | `2`                  | Minimum characters before search fires           |
| `max-results`        | `number`               | `10`                 | Cap on visible results per group                 |
| `theme`              | `light \| dark \| auto`| `auto`               | Color scheme; `auto` follows `prefers-color-scheme` |
| `loading`            | `boolean`              | `false`              | Shows a loading skeleton/spinner                 |
| `disabled`           | `boolean`              | `false`              | Disables interaction                             |
| `highlight-matches`  | `boolean`              | `true`               | Bold-highlights matched substrings in results    |
| `no-results-text`    | `string`               | `"No results found"` | Empty-state message                              |
| `search-label`       | `string`               | `"Search"`           | `aria-label` on the input (i18n)                 |

### Attributes / Reflected Properties (continued)

| Attribute    | Type     | Default                   | Description                                           |
|--------------|----------|---------------------------|-------------------------------------------------------|
| `hint`       | `string` | `"Type {n}+ characters…"` | Hint shown before min-chars threshold is reached      |

> **Note:** No validation error is shown for min/max chars. The component silently waits. This is a search input, not a form field — the user hasn't done anything wrong. A neutral `hint` text is sufficient.

### JavaScript Properties (not reflected as attributes)

| Property      | Type                                            | Description                                              |
|---------------|-------------------------------------------------|----------------------------------------------------------|
| `results`     | `SearchResult[]`                                | Set programmatically — triggers re-render                |
| `filters`     | `FilterOption[]`                                | Available filter chips                                   |
| `renderItem`  | `((item: SearchResultItem) => HTMLElement) \| null` | Optional custom item renderer. Return a DOM node. Falls back to default template if not set. |

### Custom Events Emitted

| Event               | `detail` shape                        | When fired                          |
|---------------------|---------------------------------------|-------------------------------------|
| `bs:search`         | `{ term: string, filter: string }`    | Debounced input change (≥ min-chars) |
| `bs:select`         | `{ item: SearchResultItem }`          | User selects a result               |
| `bs:filter-change`  | `{ filter: string }`                  | Active filter changes               |
| `bs:clear`          | `{}`                                  | Input cleared                       |
| `bs:open`           | `{}`                                  | Dropdown opens                      |
| `bs:close`          | `{}`                                  | Dropdown closes                     |
| `bs:retry`          | `{ term: string, filter: string }`    | Retry button clicked after an error  |
| `bs:error`          | `{ code: string, term: string, filter: string, timestamp: number }` | Error attribute set — for host observability logging |

### Named Slots (Extensibility)

| Slot name       | Purpose                                                                |
|-----------------|------------------------------------------------------------------------|
| `no-results`    | Replaces default empty-state UI. Use when you need branded empty states.|
| `error`         | Replaces default error panel. Use for custom error + support link.     |

**Usage:**
```html
<banking-search>
  <div slot="no-results">No accounts found. <a href="/help">Need help?</a></div>
  <div slot="error">Something went wrong. <a href="/support">Contact support</a></div>
</banking-search>
```
If the slot is not provided, the component renders its built-in default for that state.

### CSS Custom Properties (Theming API)

```css
/* Colors */
--bs-primary:          #0066cc
--bs-bg:               #ffffff
--bs-surface:          #f8f9fa
--bs-border:           #dee2e6
--bs-text:             #212529
--bs-text-secondary:   #6c757d
--bs-hover-bg:         #e9ecef
--bs-active-bg:        #cfe2ff
--bs-highlight-color:  #0044aa
--bs-error:            #dc3545

/* Geometry */
--bs-border-radius:    8px
--bs-font-family:      system-ui, sans-serif
--bs-font-size:        14px
--bs-z-index:          9999
--bs-shadow:           0 4px 20px rgba(0,0,0,0.12)
--bs-max-height:       400px
```

---

## 3. Data Structure

Designed to cover every banking entity while remaining extensible:

```typescript
// Base result — every entity must satisfy this
interface SearchResultItem {
  id:        string;                          // Unique stable identifier
  type:      'account' | 'transaction' | 'customer' | 'card' | 'loan' | string;
  title:     string;                          // Primary display line
  subtitle?: string;                          // Secondary line (e.g., account number)
  badge?:    { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' };
  icon?:     string;                          // Semantic icon key (svg sprite / data-uri)
  meta?:     Record<string, string>;          // Arbitrary key/value pairs for tooltip or detail
  url?:      string;                          // Optional navigation href on selection
}

// Results can be flat or grouped
type SearchResults = SearchResultItem[] | SearchResultGroup[];

interface SearchResultGroup {
  groupId:  string;
  label:    string;                           // e.g., "Accounts", "Customers"
  total?:   number;                           // Total server-side hits
  items:    SearchResultItem[];
}

interface FilterOption {
  id:       string;                           // e.g., "all", "accounts", "transactions"
  label:    string;
  count?:   number;                           // Optional badge count
}
```

**Example payload:**
```json
[
  {
    "groupId": "accounts",
    "label": "Accounts",
    "total": 3,
    "items": [
      {
        "id": "acc-001",
        "type": "account",
        "title": "Primary Checking",
        "subtitle": "****4821",
        "badge": { "label": "Active", "variant": "success" },
        "icon": "account",
        "meta": { "balance": "$12,450.00", "branch": "Downtown" }
      }
    ]
  }
]
```

---

## 4. Component Architecture

### File Structure

```
search-component/
├── src/
│   ├── components/
│   │   └── banking-search/
│   │       ├── banking-search.ts        # Main Lit component class
│   │       ├── banking-search.styles.ts # css`` template literal — all styles
│   │       └── banking-search.types.ts  # TypeScript interfaces (re-exported)
│   ├── utils/
│   │   ├── positioning.ts              # Dropdown placement engine
│   │   ├── highlight.ts                # Search term → HTML mark utility
│   │   └── debounce.ts                 # Generic debounce
│   └── index.ts                        # Barrel export + auto-registration
├── demo/
│   ├── index.html                      # Full demo page
│   ├── demo.ts                         # Mock data + event wiring
│   └── demo.css                        # Demo page styles (not component)
├── tests/
│   ├── banking-search.test.ts          # Component integration tests
│   ├── positioning.test.ts             # Unit tests for positioning logic
│   └── highlight.test.ts               # Unit tests for highlight utility
├── vite.config.ts                      # Library build config
├── vitest.config.ts
├── web-test-runner.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

### Internal Component Structure (Shadow DOM)

```
<banking-search> (host)
└── Shadow Root
    ├── <div class="search-wrapper">
    │   ├── <div class="input-row" role="combobox" aria-expanded aria-haspopup="listbox"
    │   │         aria-owns="results-listbox">
    │   │   ├── <span class="icon-search" aria-hidden="true">
    │   │   ├── <input type="search" autocomplete="off"
    │   │   │         aria-autocomplete="list" aria-controls="results-listbox"
    │   │   │         aria-activedescendant aria-label=${searchLabel}>
    │   │   ├── <button class="btn-clear" aria-label="Clear search"> (conditional)
    │   │   └── <span class="spinner" aria-hidden="true"> (conditional)
    │   └── <div class="filter-bar" role="radiogroup" aria-label="Filter results">
    │       ├── <button role="radio" aria-checked tabindex="0|-1"> × N visible chips
    │       └── <button aria-haspopup="listbox" aria-expanded> More (N) ▾  (overflow)
    └── <div id="results-listbox" role="listbox" aria-label="Search results"
              class="dropdown" style="position:fixed; top:?; left:?">
        ├── <div aria-live="polite" aria-atomic="true" class="sr-only"> (result count)
        ├── <ul role="group" aria-labelledby> × N groups
        │   ├── <li role="presentation" class="group-header">
        │   └── <li id="result-{id}" role="option" aria-selected tabindex="-1"> × N
        │       ├── <span class="result-icon" aria-hidden="true">
        │       ├── <div class="result-content">
        │       │   ├── <span class="result-title"> (with <mark> for highlights)
        │       │   └── <span class="result-subtitle">
        │       └── <span class="result-badge">
        ├── <slot name="no-results"> / built-in empty state (conditional)
        ├── <slot name="error"> / built-in error panel (conditional)
        └── Loading skeleton (conditional, aria-busy on listbox)
```

---

## 5. Memory Management & Lifecycle

Every listener, observer, and timer registered in the component **must** be torn down in `disconnectedCallback()` to prevent memory leaks when the element is removed from the DOM. Below is the complete inventory.

### Listeners registered in `connectedCallback` / first render

| Resource | Registration | Teardown |
|---|---|---|
| `ResizeObserver` on host | `this._resizeObserver = new ResizeObserver(...); this._resizeObserver.observe(this)` | `this._resizeObserver.disconnect()` |
| `scroll` on `window` | `window.addEventListener('scroll', this._onScroll, { passive: true })` | `window.removeEventListener('scroll', this._onScroll)` |
| `resize` on `window` | `window.addEventListener('resize', this._onResize, { passive: true })` | `window.removeEventListener('resize', this._onResize)` |
| `focusout` on host (click-outside + keyboard tab-out) | `this.addEventListener('focusout', this._onFocusOut)` | `this.removeEventListener('focusout', this._onFocusOut)` |
| Debounce timer | `this._debounceTimer = setTimeout(...)` | `clearTimeout(this._debounceTimer)` |
| In-flight fetch | `this._abortController = new AbortController()` | `this._abortController.abort()` |

### Critical implementation notes

```typescript
// Store ALL bound references as class fields so the same reference is
// used for both add and remove — arrow function fields handle `this` binding
private _onScroll = () => this._updatePosition();
private _onResize = () => this._updatePosition();

disconnectedCallback() {
  super.disconnectedCallback();
  clearTimeout(this._debounceTimer);
  this._abortController?.abort();
  this._resizeObserver?.disconnect();
  window.removeEventListener('scroll', this._onScroll);
  window.removeEventListener('resize', this._onResize);
  // scroll listeners on ancestor scroll containers (if any)
  this._scrollParents.forEach(el =>
    el.removeEventListener('scroll', this._onScroll)
  );
}
```

### `focusout` + `relatedTarget` for click-outside and keyboard tab-out

We use a single `focusout` listener on the host instead of a document-level `pointerdown`. This handles both cases:

- **Mouse click outside**: clicking outside moves focus away → `focusout` fires, `relatedTarget` is outside → close
- **Keyboard Tab away**: `focusout` fires naturally → same logic closes the dropdown

The key is checking `e.relatedTarget` (where focus is **going**) against both the host's light DOM (`this.contains()`) and its Shadow DOM internals (`this.shadowRoot?.contains()`). Result items have `tabindex="-1"`, so clicking them moves focus into the shadow root — `relatedTarget` will be the result item, and `shadowRoot.contains()` returns true → we don't close prematurely before the `click` event fires.

```typescript
private _onFocusOut = (e: FocusEvent): void => {
  const related = e.relatedTarget as Node | null;
  // Focus moved to a light DOM child or shadow DOM internal — stay open
  if (related && (this.contains(related) || this.shadowRoot?.contains(related))) return;
  this._close();
};
```

> **Why not `pointerdown` on document?** It requires a document-level listener (more cleanup, wider blast radius), doesn't handle keyboard Tab-out, and Shadow DOM event retargeting makes `e.target` unreliable. `focusout` with `relatedTarget` is the correct, minimal, self-contained solution.

### Scroll parent detection
When the component lives inside a scrollable container (not `window`), that container's scroll must also trigger repositioning. On `connectedCallback`, walk the DOM tree upward and collect every ancestor with `overflow: auto | scroll`. Register passive scroll listeners on each. Store them all in `this._scrollParents: Element[]` and remove them all in `disconnectedCallback`.

### AbortController for in-flight requests
The component does **not** make fetch calls itself — it fires `bs:search` events and the host app calls back with `results`. However, the component exposes a `requestId` in the event detail so the host can implement cancellation:

```typescript
// Event detail
{ term, filter, requestId: crypto.randomUUID() }

// Host pattern
let controller: AbortController;
el.addEventListener('bs:search', async ({ detail }) => {
  controller?.abort();
  controller = new AbortController();
  try {
    const data = await fetchResults(detail.term, detail.filter, controller.signal);
    el.results = data;
    el.removeAttribute('loading');
  } catch (e) {
    if (e.name !== 'AbortError') el.setAttribute('error', e.message);
  }
});
```

---

## 6. Performance Strategy

### Debounce vs. Throttle
Input uses **debounce** (fire after user stops typing), not throttle. Default 300ms. Configurable via `debounce-ms` attribute. The pending debounce timer is cancelled on `disconnectedCallback` and on every new keypress.

### Race condition — stale responses
Even with debouncing, fast network responses from earlier searches can arrive after newer ones. The host uses `AbortController` per the pattern above. Additionally, the component tracks a monotonic `_searchSeq: number` counter and ignores any `results` setter call that belongs to an older sequence (communicated via `requestId`).

### Batched DOM reads — no layout thrashing
The positioning engine follows the **read-then-write** pattern inside a single `requestAnimationFrame`:

```typescript
private _updatePosition() {
  cancelAnimationFrame(this._rafId);
  this._rafId = requestAnimationFrame(() => {
    // All getBoundingClientRect() calls (reads) first
    const rect = this._wrapper.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    // Then all style mutations (writes)
    this._dropdown.style.top = `${...}px`;
    this._dropdown.style.left = `${...}px`;
  });
}
```

`this._rafId` is stored and `cancelAnimationFrame(this._rafId)` called in `disconnectedCallback`.

### Lit's reactive update batching
Lit schedules DOM updates asynchronously in a microtask. Multiple property changes in a single synchronous block produce **one** DOM update. Never bypass this with direct DOM mutations outside render.

### Large result sets
If `results` contains more than `max-results` items per group, only `max-results` are rendered plus a "Show N more" button. This prevents unbounded DOM growth. No full virtual scrolling required at this scale, but the architecture leaves room for it.

### GPU compositing for dropdown
```css
.dropdown {
  will-change: transform;   /* promote to compositor layer */
  transform: translateZ(0); /* force GPU layer */
}
```
This prevents jank when the dropdown opens/repositions.

### CSS containment
```css
:host {
  /* IMPORTANT: Use contain:style ONLY — never contain:layout or contain:strict.
     contain:layout creates a new containing block, which makes position:fixed
     children position relative to the host instead of the viewport. This breaks
     the dropdown positioning engine entirely. */
  contain: style;
}
```

---

## 7. Positioning Engine

The dropdown uses `position: fixed` and is appended to the Shadow Root (not the document body, to preserve Shadow DOM encapsulation). Position is calculated via:

```
getBoundingClientRect(inputWrapper) → { top, left, width, height }

Viewport space below  = window.innerHeight - (top + height)
Viewport space above  = top

Place below if space below ≥ dropdownHeight OR space below ≥ space above
Otherwise place above (flip)

Adjust left to never overflow viewport right edge
```

**Re-calculation triggers:**
- `ResizeObserver` on the host element
- `scroll` event listener (passive, on `window` + nearest scroll parent)
- `resize` event on `window`

All listeners cleaned up in `disconnectedCallback()`.

---

## 8. API Error Handling & Component States

The component owns its visual states — the host simply sets attributes/properties and the component renders the correct UI.

### All possible states (mutually exclusive)

| State | Trigger | Visual | ARIA |
|---|---|---|---|
| **idle** | Initial / after clear | Empty input, no dropdown | Default |
| **loading** | `loading` attr set | Skeleton rows in dropdown | `aria-busy="true"` on listbox |
| **results** | `results` set with items | Result rows | `aria-busy="false"` |
| **empty** | `results` set as `[]` | "No results found" illustration | `aria-live` announces "0 results" |
| **error** | `error` attr set with message | Error panel + Retry button | `role="alert"` fires immediately |
| **disabled** | `disabled` attr | Greyed input, no interaction | `aria-disabled="true"` |
| **rate-limited** | `error="rate-limited"` | "Too many requests, try again in Xs" | `role="alert"` |

### Error attribute values

```typescript
// Host sets one of these string values on the `error` attribute:
type ErrorCode =
  | 'network'        // fetch failed / offline
  | 'timeout'        // request exceeded threshold
  | 'rate-limited'   // HTTP 429
  | 'unauthorized'   // HTTP 401/403 — show generic message, not raw error
  | 'server'         // HTTP 5xx
  | 'unknown';       // catch-all

// Or a custom message string for display
```

### Error state rendering

```
┌─────────────────────────────────────┐
│  ⚠  Unable to fetch results         │
│     Check your connection and        │
│     [Try again]  ←── fires bs:retry  │
└─────────────────────────────────────┘
```

- Error panel has `role="alert"` so screen readers announce it immediately (no need to focus)
- Retry button fires `bs:retry` custom event with the last `{ term, filter }` so the host can re-execute the search
- Error message text is configurable via `error-text` attribute (never display raw server messages)
- During loading after a retry: switches back to `loading` state — error is cleared
- Previous stale results are **not** shown during error (cleared alongside error state) to avoid confusion in a banking context

### bs:error event

The component also **emits** `bs:error` when it receives an `error` attribute — allowing the host to log to observability tools:

```typescript
// detail shape
{ code: ErrorCode; term: string; filter: string; timestamp: number }
```

### Timeout state
If the host detects a timeout, it sets `error="timeout"`. The component renders a distinct message:
> "Search is taking longer than expected. Try a more specific term."

### Offline detection
The component itself listens to `window` `online`/`offline` events. When offline it shows a persistent banner **above** any error state: "You are offline — search unavailable." This listener is also cleaned up in `disconnectedCallback`.

```typescript
private _onOnline  = () => { this._offline = false; };
private _onOffline = () => { this._offline = true;  };

connectedCallback() {
  window.addEventListener('online',  this._onOnline);
  window.addEventListener('offline', this._onOffline);
  this._offline = !navigator.onLine; // initial state
}

disconnectedCallback() {
  window.removeEventListener('online',  this._onOnline);
  window.removeEventListener('offline', this._onOffline);
}
```

### Host integration pattern (complete)

```javascript
const el = document.querySelector('banking-search');

el.addEventListener('bs:search', async ({ detail }) => {
  el.setAttribute('loading', '');
  el.removeAttribute('error');
  try {
    const data = await fetchWithTimeout(
      `/api/search?q=${encodeURIComponent(detail.term)}&filter=${detail.filter}`,
      { signal: currentController.signal, timeout: 5000 }
    );
    el.results = data;
  } catch (err) {
    if (err.name === 'AbortError') return; // user typed again, ignore
    el.setAttribute('error', classifyError(err));
    el.dispatchEvent(/* bs:error logging */);
  } finally {
    el.removeAttribute('loading');
  }
});

el.addEventListener('bs:retry', ({ detail }) => {
  // Re-fire search with same term/filter
  el.dispatchEvent(new CustomEvent('bs:search', { detail }));
});
```

---

## 9. Keyboard & Interaction Model

### Input Field
| Key         | Action                                              |
|-------------|-----------------------------------------------------|
| Any char    | Debounced → fire `bs:search`                        |
| `ArrowDown` | Move focus into listbox, highlight first result     |
| `ArrowUp`   | Move focus into listbox, highlight last result      |
| `Escape`    | Close dropdown, return focus to input               |
| `Tab`       | Close dropdown naturally                            |

### Listbox (results)
| Key         | Action                                              |
|-------------|-----------------------------------------------------|
| `ArrowDown` | Move to next option (wraps)                         |
| `ArrowUp`   | Move to previous option (wraps to input at top)     |
| `Enter`     | Select highlighted option → fire `bs:select`        |
| `Escape`    | Close dropdown, return focus to input               |
| `Home`      | Jump to first option                                |
| `End`       | Jump to last option                                 |
| `Tab`       | Close dropdown, natural tab order                   |

### Filter chips
| Key         | Action                                              |
|-------------|-----------------------------------------------------|
| `Enter/Space`| Select filter → fire `bs:filter-change`, re-search |
| Arrow keys  | Navigate between chips (roving tabindex)            |

### Mouse / Touch
- Click result → select
- Click outside component → close (via `pointerdown` on document)
- Touch scroll inside listbox → does not close dropdown
- Clear button tap → clears input, fires `bs:clear`, closes dropdown

---

## 10. Accessibility Checklist

- [ ] `role="combobox"` pattern (ARIA 1.2 spec)
- [ ] `aria-expanded` reflects open/closed state
- [ ] `aria-activedescendant` points to currently highlighted `role="option"`
- [ ] `aria-controls` links input to listbox
- [ ] `aria-live="polite"` region announces result count changes ("3 results found")
- [ ] `aria-busy="true"` on listbox while loading
- [ ] `aria-disabled` on input when `disabled` attribute set
- [ ] All icon-only buttons have `aria-label`
- [ ] Search icon is `aria-hidden="true"`
- [ ] Filter chips use `role="radio"` + `aria-checked`
- [ ] Group headers use `role="presentation"` (not interactive)
- [ ] Highlighted text uses `<mark>` element with sufficient contrast ratio
- [ ] Focus never leaves component until user intentionally tabs out
- [ ] `prefers-reduced-motion` respected — no transitions when set
- [ ] Minimum 44×44px touch targets on mobile
- [ ] Color contrast: all text meets WCAG AA (4.5:1)

---

## 11. Theming System

### Dark theme via CSS custom properties
Host element sets theme class; consumers override via CSS custom properties on the element:

```css
/* Light (default) */
banking-search {
  --bs-bg: #ffffff;
  --bs-text: #212529;
}

/* Dark */
banking-search[theme="dark"] {
  --bs-bg: #1a1d23;
  --bs-text: #f8f9fa;
}

/* Auto — inside component via @media */
@media (prefers-color-scheme: dark) {
  :host([theme="auto"]) { /* dark overrides */ }
}
```

Consumer can partially or fully override any token for brand alignment.

---

## 12. Testing Strategy

### Unit Tests (Vitest)
- `debounce.ts` — timing correctness
- `highlight.ts` — edge cases: no match, case-insensitive, special regex chars, overlapping matches, XSS prevention
- `positioning.ts` — flip logic for all 4 viewport edge scenarios

### Integration Tests (@web/test-runner + @open-wc/testing)
- **Rendering**: Shadow DOM structure, slots, attribute reflection
- **Input interaction**: typing triggers `bs:search` after debounce, clear button appears/disappears
- **Keyboard navigation**: full arrow/enter/escape flow
- **Filter chips**: selection updates active filter, re-emits `bs:search`
- **Result selection**: `bs:select` fires with correct item payload
- **Loading state**: skeleton shown, `aria-busy` set, keyboard navigation disabled during load
- **Empty state**: custom `no-results-text` rendered, `aria-live` announces 0 results
- **Error states**: `error="network"`, `error="timeout"`, `error="rate-limited"` each render correct message + `role="alert"`
- **Retry flow**: `bs:retry` event fires with last `{ term, filter }` when Retry button clicked
- **Offline state**: offline banner appears when `navigator.onLine` is false
- **Stale result clearing**: setting `error` attr clears previous results
- **Grouped vs flat results**: both formats render correctly
- **Click-outside**: closes dropdown
- **Accessibility**: aria attributes correct at each state transition
- **Theming**: CSS custom property inheritance through Shadow DOM
- **Events**: all custom events have correct `bubbles: true, composed: true`
- **Memory / lifecycle**: after `remove()`, no lingering listeners (spy on `removeEventListener`)
- **Race conditions**: rapid input changes → only last response reflected in DOM

---

## 13. Build & Distribution

### Outputs (via Vite library mode)
| File                          | Format | Use case                      |
|-------------------------------|--------|-------------------------------|
| `dist/banking-search.js`      | ESM    | Modern bundlers / `<script type="module">` |
| `dist/banking-search.umd.js`  | UMD    | Legacy CMS, CDN drop-in       |
| `dist/banking-search.d.ts`    | Types  | TypeScript consumers          |

### Usage
```html
<!-- CDN / drop-in -->
<script type="module" src="banking-search.js"></script>
<banking-search
  placeholder="Search accounts, customers..."
  theme="light"
  min-chars="2"
  debounce-ms="300"
></banking-search>

<script>
  const el = document.querySelector('banking-search');

  el.filters = [
    { id: 'all', label: 'All' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'customers', label: 'Customers' },
  ];

  el.addEventListener('bs:search', async ({ detail }) => {
    const data = await fetchResults(detail.term, detail.filter);
    el.results = data;
  });

  el.addEventListener('bs:select', ({ detail }) => {
    router.navigate(detail.item.url);
  });
</script>
```

---

## 14. Demo Application

The demo (`demo/index.html`) will showcase:

1. **Live search** — mock banking dataset (accounts, transactions, customers) with simulated 300ms network delay
2. **Grouped results** — results rendered by category with group headers and counts
3. **All filter states** — chips that narrow results by entity type
4. **Light / Dark / Auto themes** — toggle buttons in the demo UI
5. **Loading skeleton** — visible during simulated async fetch
6. **Empty state** — no results found messaging
7. **Keyboard-only walkthrough** — callout in demo explaining keyboard navigation
8. **Framework agnostic usage** — demo shows the element in a plain HTML page, proving zero framework dependency

---

## 15. Implementation Phases

Each phase ends with a **Review Checkpoint** — user reviews the output, we discuss before proceeding. No phase starts without sign-off on the previous.

---

### Phase 1 — Project Scaffold & Build Pipeline
**Goal:** Working project skeleton you can `npm run dev` and see a blank page, `npm test` runs (no tests yet), `npm run build` produces ESM output.

- [x] `npm create vite@latest . --template vanilla-ts` (inside search-component/)
- [x] Install: `lit`, `@lit/reactive-element`
- [x] Install dev: `typescript`, `vitest`, `@vitest/ui`, `@web/test-runner`, `@open-wc/testing`, `axe-core`, `@axe-core/playwright`
- [x] `vite.config.ts` — library mode: `entry: src/index.ts`, formats: `['es', 'umd']`, external: `['lit']`
- [x] `tsconfig.json` — strict mode, decorators enabled (`experimentalDecorators`, `useDefineForClassFields: false`)
- [x] `vitest.config.ts` — jsdom environment for unit tests
- [x] `web-test-runner.config.mjs` — Playwright, Chromium, for real DOM tests
- [x] Create folder structure: `src/components/banking-search/`, `src/utils/`, `src/controllers/`, `tests/`
- [x] `src/components/banking-search/banking-search.types.ts` — all TypeScript interfaces
- [x] `src/index.ts` — barrel export + `customElements.define('banking-search', BankingSearch)`
- [x] `package.json` scripts: `dev`, `build`, `test`, `test:browser`, `test:ui`

**Review Checkpoint 1:** Build runs, types compile with zero errors, dev server starts.
**STATUS: COMPLETE — commit `e082470`**

---

### Phase 2 — Core Component Shell
**Goal:** Component registers, renders a real input in Shadow DOM, `bs:search` fires on debounced typing, `bs:clear` fires on clear.

- [x] `banking-search.styles.ts` — base CSS (input row, layout, spinner, no themes yet)
- [x] `banking-search.ts` — `LitElement` class with all `@property()` / `@state()` declarations, results/filters setters, renderItem property, full render() with all states
- [x] `src/utils/debounce.ts` — generic typed debounce with `.cancel()`
- [x] `src/utils/highlight.ts` — XSS-safe `<mark>` injection via DOM Text nodes, regex-safe escaping
- [x] Wire `input` event → debounce → emit `bs:search`
- [x] Wire clear button → emit `bs:clear`, reset state
- [x] Wire `results` setter → re-render listbox (flat and grouped)
- [x] **Unit tests:** `debounce.test.ts` (7 tests), `highlight.test.ts` (14 tests) — 21/21 passing

**Review Checkpoint 2:** Type in the dev page → see `bs:search` in console. Set `el.results = [...]` → see results render.
**STATUS: COMPLETE — commit `0bbc1dc`**

---

### Deviations & Late Additions (running log)

Decisions made during implementation that differ from the original plan, or features added mid-build. Kept here so the plan stays honest.

| # | Original plan | What actually shipped | Why |
|---|---|---|---|
| 1 | `max-results` attribute (cap per group) | Replaced with `page-size` + `has-more` (pagination system) | Richer UX — scroll/arrow-key to load more rather than hard cap |
| 2 | Click-outside via `pointerdown` on `document` | `focusout` + `relatedTarget` + `shadowRoot.contains()` | Handles keyboard Tab-out for free; no document-level listener; Shadow DOM retargeting is simpler with `relatedTarget` |
| 3 | Filter overflow as a dropdown (`role="listbox"`) | Collapse/expand toggle with "+N more" dashed button | Simpler UX for a filter bar; no nested ARIA listbox needed; revisit if axe audit flags |
| 4 | `BsSearchDetail` with `{ term, filter }` | Added `requestId: string` to every search-related event | Enables `AbortController` cancellation pattern on the host side |
| 5 | `bs:load-more` event — not in original plan | Added with `{ term, filter, page, requestId }` detail | Required by pagination system; documented in `banking-search.types.ts` |
| 6 | `aria-expanded` as boolean property | Must be string `'true'`/`'false'` | Lit renders boolean properties as empty-string attributes; ARIA requires the string value |
| 7 | `_onFocusOut` using `composedPath()` | Uses `relatedTarget` check | `composedPath()` always includes `this` when registered on `this`; `relatedTarget` correctly identifies where focus is going |
| 8 | `_unsafeSvg()` home-rolled via `innerHTML` | Lit's `unsafeSVG()` directive | Official API; no manual template cloning |
| 9 | `"dev": "vite demo"` script | `"dev": "vite"` | Setting root to `demo/` broke `vite.config.ts` pickup |
| 10 | `min-chars="2"` in demo | Changed to `min-chars="1"` | Easier to demo pagination and results during review |
| 11 | `ArrowUp` from first result wraps to input | Wraps within listbox (to last item) | Consistent with most combobox implementations; re-raising if accessibility audit disagrees |
| 12 | Multi-select filters | Not in original plan | User request — planned as Phase 4b |
| 13 | Demo property playground | Not in original plan | User request — planned in Phase 8 |

---

### Phase 3 — Dropdown Positioning & State Machine
**Goal:** Dropdown opens in the right place, repositions on scroll/resize, closes on click-outside. All component states (idle/loading/results/empty/error) render correctly.

- [x] `src/utils/positioning.ts` — `computePosition(anchorRect, dropdownHeight, viewport)` — pure function, fully testable
- [x] Wire `position: fixed` dropdown to positioning engine via `_updatePosition()` in `updated()`
- [x] `ResizeObserver` on host → reposition
- [x] Passive scroll listeners on `window` + scroll parents via `_findScrollParents()`
- [x] `focusout` on host → close when focus leaves component (handles both mouse click-outside and keyboard Tab-out); uses `relatedTarget` + `shadowRoot.contains()` for correctness
- [x] `disconnectedCallback()` — complete teardown: debounce, focusout, online/offline, scroll, resize, rAF, ResizeObserver, scroll parents
- [x] Full state machine in `render()`:
  - `error` state — error panel with Retry button, `role="alert"`, `bs:retry` event
  - `loading` state — skeleton rows, `aria-busy="true"`
  - `results` state — item rows with `renderItem` or default template + `highlight()` wired
  - `empty` state — `slot="no-results"` fallback, `aria-live` announce
  - `idle` state — closed dropdown
- [x] Offline banner (`online`/`offline` window events)
- [x] `bs:open` / `bs:close` events (guarded — only fire on actual state change)
- [x] Complete `banking-search.styles.ts` — all classes, all tokens as CSS custom properties, dark/auto themes, skeleton shimmer, badge variants, mobile, reduced-motion
- [x] Switched from `_unsafeSvg()` template hack to Lit's `unsafeSVG()` directive
- [x] Fixed `aria-expanded` to emit string `'true'`/`'false'` (not boolean)
- [x] Fixed `_onFocusOut` — now uses `relatedTarget` correctly instead of broken `composedPath()` check
- [x] Fixed `"dev"` script: `vite demo` → `vite` so `vite.config.ts` is picked up and demo opens at `/demo/`
- [x] **Unit tests:** `positioning.test.ts` — 13 tests covering all 4 viewport edge scenarios + gap offset
- [x] **Build:** `dist/banking-search.js` (62KB ESM) + `dist/banking-search.umd.cjs` — clean, zero TS errors

**Review Checkpoint 3:** Dropdown opens below/above input correctly, focusout closes, all states visible in dev page.
**STATUS: COMPLETE**

---

### Phase 4 — Keyboard Navigation & Full Accessibility
**Goal:** Fully keyboard-operable. Screen reader announces state changes. WCAG AA compliant.

- [x] Input keydown handler: `ArrowDown` → focus first result, `Escape` → close + return focus
- [x] Listbox keydown handler: `ArrowDown/Up` wrap, `Enter` → select, `Home/End`, `Tab` → close
- [x] `aria-activedescendant` on input pointing to highlighted option `id`
- [x] Scroll highlighted item into view — `_scrollActiveIntoView()` via `getBoundingClientRect` diff; avoids `scrollIntoView()` which also scrolls the page
- [x] Filter chips — roving tabindex + `_onFilterBarKeydown`: `ArrowLeft/Right/Up/Down` navigate chips, wraps at edges; `Home/End` jump to first/last; arrow nav limited to currently rendered (visible) chips
- [x] **DEVIATION:** More button is a collapse/expand toggle (not a dropdown) — shows first `FILTERS_VISIBLE=4` chips + "+N more" dashed pill; clicking expands to show all. Simpler UX, no nested listbox needed. Original plan called for an overflow dropdown with `role="listbox"` — revisit only if axe audit flags it.
- [x] `aria-live="polite"` announces result count — done in Phase 3
- [x] `aria-busy="true/false"` on listbox during loading — done in Phase 3
- [ ] `aria-disabled="true"` on `<input>` when `disabled` attr is set (CSS opacity exists but ARIA attr missing)
- [ ] Focus trap: `Tab` from last result wraps back to input (not outside component)
- [ ] **Integration tests:** full keyboard flow — arrow nav, enter select, escape close, filter chip nav, More button expand/collapse

**Review Checkpoint 4:** Navigate entire component keyboard-only. Run axe-core — zero violations.
**STATUS: ~80% COMPLETE — remaining items: aria-disabled, focus trap, integration tests**

---

### Phase 4b — Multi-Select Filter Chips *(new — added from user feedback)*
**Goal:** Let users combine multiple filters (e.g. "Accounts + Cards"). "All" is mutually exclusive.

**Behaviour rules:**
- Zero or more non-All filters can be active simultaneously
- Clicking "All" → clears every other filter, sets `_activeFilters = ['all']`
- Clicking a non-All filter when "All" is active → deselects "All", activates clicked filter
- If last specific filter is deselected → auto-fall-back to `['all']` (never allow zero active)
- Visual: active chips show a filled/checkmark style; multiple chips can show active simultaneously

**API changes (breaking — document in migration notes):**
- Internal state: `_activeFilter: string` → `_activeFilters: string[]`
- `bs:filter-change` detail: `{ filter: string }` → `{ filters: string[] }`
- `bs:search` detail: adds `filters: string[]`, keeps `filter: string` as compat alias (`filters[0]` or `'all'`)
- Filter bar ARIA: `role="radiogroup"` + `role="radio"` → `role="group"` + buttons with `aria-pressed`
- Keyboard: `Space` / `Enter` toggles rather than always selects; arrow keys still navigate

**Plan items:**
- [ ] Replace `_activeFilter: string` with `_activeFilters: string[]` state
- [ ] Update `_fireFilterChange` to accept toggle logic + "All" mutual-exclusion
- [ ] Update `bs:filter-change` and `bs:search` event detail shapes + types file
- [ ] Update chip render: `role="group"` + `aria-pressed` instead of radiogroup/radio
- [ ] Update chip CSS: multi-active visual (current active style works; verify with N active chips)
- [ ] Update demo: `bs:filter-change` handler receives `filters[]`; search filters mock data by multiple types
- [ ] Update unit tests for new toggle logic
- [ ] Update `BsFilterChangeDetail` and `BsSearchDetail` types

**Review Checkpoint 4b:** Select "Accounts" + "Cards" → results show both entity types. "All" clears both.

---

### Phase 5 — Theming, Visual Polish & Mobile
**Goal:** Light/dark/auto themes work. Looks production-quality. Mobile-ready.

- [ ] Complete `banking-search.styles.ts` — all CSS custom properties wired up
- [ ] Dark theme via `:host([theme="dark"])` overrides
- [ ] Auto theme via `@media (prefers-color-scheme: dark)` on `:host([theme="auto"])`
- [ ] Loading skeleton — CSS animation (`@keyframes shimmer`), `prefers-reduced-motion` off
- [ ] Badge variants: success (green), warning (amber), error (red), neutral (grey)
- [ ] Group header style (subtle label + count)
- [ ] `<mark>` highlight style — contrast-safe
- [ ] Mobile: 44×44px touch targets, `font-size: 16px` on input (prevents iOS zoom), responsive filter bar
- [ ] Filter overflow "More" button styled consistently with chips
- [ ] Smooth open/close transition (`clip-path` or `opacity + transform`, disabled when `prefers-reduced-motion`)
- [ ] **Visual review:** all states, both themes, mobile viewport

**Review Checkpoint 5:** Full visual polish pass — demo looks interview-ready.

---

### Phase 6 — Extensibility Features
**Goal:** `renderItem` and named slots work correctly, documented with tests.

- [ ] `renderItem` property — if set, call per item and insert returned node. Type: `(item: SearchResultItem) => HTMLElement`
- [ ] `slot="no-results"` — if slotted content exists, hide built-in empty state
- [ ] `slot="error"` — if slotted content exists, hide built-in error panel
- [ ] Detect slot presence via `slotchange` event and `slot.assignedNodes()`
- [ ] **Integration tests:** renderItem overrides default, slots replace built-ins

**Review Checkpoint 6:** Custom item rendering works. Named slots work.

---

### Phase 7 — Comprehensive Test Suite
**Goal:** Every feature is covered. Axe passes. No regressions possible.

**Unit Tests (Vitest):**
- [ ] `debounce.ts` — fires once after delay, resets on rapid calls, cleanup
- [ ] `highlight.ts` — no match, case-insensitive, special regex chars, XSS prevention, empty term, overlapping
- [ ] `positioning.ts` — below/above flip, right-edge clamp, min-width, fully inside viewport

**Integration Tests (@web/test-runner):**
- [ ] Renders Shadow DOM structure — all required ARIA attributes present
- [ ] `bs:search` fires after debounce with correct detail
- [ ] `bs:search` does NOT fire below min-chars
- [ ] Clear button shows/hides based on input value
- [ ] `bs:clear` fires, input clears, dropdown closes
- [ ] Results render: flat array, grouped array, `renderItem` override
- [ ] Loading state: skeleton visible, `aria-busy="true"`, keyboard nav disabled
- [ ] Empty state: default message, `slot="no-results"` override
- [ ] Error state: `role="alert"`, correct message per error code, retry button
- [ ] `bs:retry` fires with last `{ term, filter }` on retry click
- [ ] `slot="error"` overrides built-in error panel
- [ ] Offline banner appears when `navigator.onLine` is false
- [ ] Keyboard: ArrowDown enters listbox, ArrowUp wraps, Enter selects, Escape returns focus
- [ ] Filter chip selection → `bs:filter-change`, re-renders chips with active state
- [ ] Overflow More button → dropdown with hidden filters, selection updates active
- [ ] `bs:select` fires with correct item on click and Enter
- [ ] `url` in item → selection navigates (no `url` → only event)
- [ ] Click outside → dropdown closes, `bs:close` fires
- [ ] All custom events have `bubbles: true, composed: true`
- [ ] After `element.remove()` → listeners cleaned up (no errors, no calls)
- [ ] Rapid input → only last search fires (stale prevention)
- [ ] `theme="dark"` → dark CSS vars applied
- [ ] `disabled` attr → input disabled, no events fire

**Accessibility (axe-core):**
- [ ] Zero violations in idle state
- [ ] Zero violations in results state
- [ ] Zero violations in loading state
- [ ] Zero violations in error state
- [ ] Zero violations in empty state

**Review Checkpoint 7:** All tests green. Coverage report reviewed.

---

### Phase 8 — Demo Application & README
**Goal:** Professional demo page + documentation that an interviewer can open and immediately understand.

**Demo page (`demo/index.html`):**
- [x] 47+ mock items across 11 banking entity types
- [x] 12 filter chips (triggers More button)
- [x] Simulated async delay + loading state
- [x] Theme toggle (Light / Dark / Auto) + page dark mode toggle
- [x] Error simulation buttons (network, timeout, rate-limited, server)
- [x] Offline simulation button
- [x] Paginated scenario with `has-more` — demonstrates scroll + arrow-key pagination
- [x] Event log panel — live stream of all custom events with timestamps
- [x] Code snippet panel showing integration example
- [ ] Custom `renderItem` example toggle
- [ ] Keyboard shortcut callout: `Tab` to focus, `↓` to navigate, `Enter` to select, `Esc` to close

**Property Playground card *(new — added from user feedback):***
Add an interactive card in the demo that lets visitors tweak every host-settable attribute in real time and see the component react — so an interviewer can explore the full API without reading code.

Controls to include:
| Control | Type | Property |
|---|---|---|
| Placeholder text | `<input type="text">` | `placeholder` attr |
| Min chars | `<input type="range" min=0 max=5>` | `min-chars` attr |
| Debounce (ms) | `<input type="range" min=0 max=1500>` | `debounce-ms` attr |
| Page size | `<input type="range" min=1 max=20>` | `page-size` attr |
| Highlight matches | toggle | `highlight-matches` attr |
| Disabled | toggle | `disabled` attr |
| No-results text | `<input type="text">` | `no-results-text` attr |
| Hint text | `<input type="text">` | `hint` attr |

Each control updates the attribute on `<banking-search>` immediately. Current attribute value displayed alongside each control.

- [ ] Implement property playground card in `demo/index.html`
- [ ] Each control reads initial value from the element's current attribute
- [ ] Debounce/page-size/min-chars use sliders with live value readout
- [ ] Boolean attrs (highlight-matches, disabled) use styled toggle switches
- [ ] Text attrs (placeholder, no-results-text, hint) use `<input type="text">` with live binding

**README.md:**
- [ ] Project overview + screenshot
- [ ] Installation (`npm install` / CDN snippet)
- [ ] Quick start (5 lines)
- [ ] Full attribute API table
- [ ] JavaScript properties table
- [ ] Events table with detail shapes
- [ ] CSS custom properties table
- [ ] Slots documentation
- [ ] `renderItem` usage example
- [ ] Keyboard shortcuts table
- [ ] Theming guide (light/dark/custom brand)
- [ ] Testing instructions (`npm test`, `npm run test:browser`)
- [ ] Browser support matrix
- [ ] **Future enhancements note** — document two forward-looking ideas for maintainers:
  - **Popover API:** The current `position: fixed` positioning engine is solid, but the native `Popover` API (`.showPopover()`) could replace it to escape all z-index/stacking-context constraints by using the browser's top-layer. Deferred due to enterprise banking browser support requirements (~91% global as of 2026); architecture is designed so it can be adopted as a drop-in future enhancement.
  - **`locales` object for i18n:** The current approach uses individual string attributes (`no-results-text`, `search-label`, etc.) which are self-documenting in HTML. A future enhancement could expose a single `el.locales = { clear: '...', noResults: '...', loading: '...' }` object property for teams needing to fully localise all internal strings in one call.

**Review Checkpoint 8 (Final):** Open demo — full walkthrough. Read README cold. Final QA: keyboard-only, VoiceOver, mobile viewport.

---

## 16. Key Quality Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Style isolation | Shadow DOM | Prevents style leakage in both directions |
| Dropdown in Shadow Root vs `<body>` | Fixed inside Shadow Root | Avoids `document.body` coupling while `position:fixed` handles stacking |
| Highlight safety | Escape user input before regex, use `<mark>` not `innerHTML` directly | Prevents XSS |
| Event model | `bubbles: true, composed: true` on all custom events | Works across Shadow DOM boundaries in any host framework |
| Focus management | Explicit `focus()` calls, never `outline: none` without custom style | WCAG 2.1 guideline 2.4.7 |
| Reduced motion | `@media (prefers-reduced-motion)` disables transitions | Respects vestibular disorder needs |
| Touch targets | 44×44px minimum on all interactive elements | WCAG 2.5.5 (AAA) + iOS HIG |
| Color contrast | All text WCAG AA (4.5:1), large text 3:1 | Legal compliance in financial sector |
| Memory leaks | Arrow-field bound methods, all torn down in `disconnectedCallback` | Prevents ghost listeners after component removal |
| Positioning performance | `requestAnimationFrame` batching, `cancelAnimationFrame` on repeated triggers | Avoids layout thrashing from rapid scroll/resize events |
| Dropdown stacking strategy | `position: fixed` inside Shadow Root + `contain: style` (NOT layout) | `Popover` API considered; deferred for enterprise browser support — architecture supports future migration |
| Click/tab-outside detection | `focusout` on host + `relatedTarget` + `shadowRoot.contains()` | `pointerdown` on document missed keyboard Tab-out; `composedPath()` unreliable when listener is on `this`; `relatedTarget` correctly identifies where focus is going, including shadow DOM internals |
| Error display | Never show raw server errors; map to user-safe strings | Security — no internal path/stack leakage to UI |
| Stale response prevention | `requestId` in `bs:search` detail; host uses AbortController | Prevents older responses overwriting newer results |
| Offline resilience | Internal `online`/`offline` listener + `navigator.onLine` check | Component self-heals without host involvement |
| GPU compositing | `will-change: transform` on dropdown | Smooth open/reposition without main-thread paint |
| CSS containment | `contain: style` on host (NOT layout) | `contain:layout` breaks `position:fixed` dropdown by creating new containing block |
| No emojis | Inline SVG / SVG sprite for all icons; zero emojis in UI, tests, demo, docs, and code | Emojis render inconsistently across OS/browser/screen readers; unprofessional in a financial product |
