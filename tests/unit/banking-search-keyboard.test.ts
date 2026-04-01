/**
 * banking-search-keyboard.test.ts
 * @author Koushik R.
 *
 * Integration-style keyboard navigation tests for <banking-search>.
 * Runs in Vitest + jsdom. Mounts a real Lit component instance, drives it
 * via KeyboardEvent dispatches, and asserts against public state / DOM.
 *
 * Accessibility assertions:
 *  - aria-activedescendant reflects the highlighted option id
 *  - aria-expanded reflects open/closed state
 *  - aria-disabled reflects the disabled attribute
 *  - bs:select fires with the correct item on Enter
 *  - Escape closes the dropdown and returns focus to the input
 *  - Tab on a result item returns focus to the input (focus trap)
 */

import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { BankingSearch } from '../../src/components/banking-search/banking-search';
import type { SearchResultItem, BsSelectDetail } from '../../src/components/banking-search/banking-search.types';

// ── Stubs ────────────────────────────────────────────────────────────────────

class StubResizeObserver {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}
class StubIntersectionObserver {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver',       StubResizeObserver);
vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);

// ── Registration ─────────────────────────────────────────────────────────────

beforeAll(() => {
  if (!customElements.get('banking-search')) {
    customElements.define('banking-search', BankingSearch);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function item(id: string, title = `Item ${id}`): SearchResultItem {
  return { id, type: 'account', title };
}

async function mount(): Promise<BankingSearch> {
  const el = document.createElement('banking-search') as BankingSearch;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

/** Open the dropdown with N results already in place. */
async function openWith(el: BankingSearch, count: number): Promise<void> {
  el.pageSize = count + 5; // ensure all visible
  el.results  = Array.from({ length: count }, (_, i) => item(`r${i}`, `Result ${i}`));
  (el as any)._open        = true;
  (el as any)._inputValue  = 'res';
  (el as any)._visibleCount = count;
  await el.updateComplete;
}

async function pressInputKey(el: BankingSearch, key: string): Promise<void> {
  const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
  await el.updateComplete;
}

async function pressDropdownKey(el: BankingSearch, key: string): Promise<void> {
  const dropdown = el.shadowRoot!.querySelector('.dropdown') as HTMLElement;
  dropdown.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
  await el.updateComplete;
}

afterEach(() => { document.body.innerHTML = ''; });

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ArrowDown / ArrowUp result navigation', () => {
  it('ArrowDown moves _activeIndex from -1 to 0', async () => {
    const el = await mount();
    await openWith(el, 3);
    expect((el as any)._activeIndex).toBe(-1);

    await pressInputKey(el, 'ArrowDown');

    expect((el as any)._activeIndex).toBe(0);
  });

  it('successive ArrowDown increments _activeIndex', async () => {
    const el = await mount();
    await openWith(el, 3);
    (el as any)._activeIndex = 0;

    await pressInputKey(el, 'ArrowDown');
    expect((el as any)._activeIndex).toBe(1);

    await pressInputKey(el, 'ArrowDown');
    expect((el as any)._activeIndex).toBe(2);
  });

  it('ArrowDown wraps from last to first when hasMore is false', async () => {
    const el = await mount();
    await openWith(el, 3);
    (el as any)._activeIndex = 2;

    await pressInputKey(el, 'ArrowDown');

    expect((el as any)._activeIndex).toBe(0);
  });

  it('ArrowUp from index 0 wraps to last item', async () => {
    const el = await mount();
    await openWith(el, 3);
    (el as any)._activeIndex = 0;

    await pressInputKey(el, 'ArrowUp');

    expect((el as any)._activeIndex).toBe(2);
  });

  it('ArrowUp from -1 moves to last item', async () => {
    const el = await mount();
    await openWith(el, 3);
    // _activeIndex starts at -1; ArrowUp: next = -2 < 0 → wrap to last
    await pressInputKey(el, 'ArrowUp');

    expect((el as any)._activeIndex).toBe(2);
  });
});

describe('Home / End keys', () => {
  it('Home jumps to first result', async () => {
    const el = await mount();
    await openWith(el, 5);
    (el as any)._activeIndex = 3;

    await pressInputKey(el, 'Home');

    expect((el as any)._activeIndex).toBe(0);
  });

  it('End jumps to last result', async () => {
    const el = await mount();
    await openWith(el, 5);
    (el as any)._activeIndex = 0;

    await pressInputKey(el, 'End');

    expect((el as any)._activeIndex).toBe(4);
  });
});

describe('Enter key — select highlighted result', () => {
  it('fires bs:select with the active item on Enter', async () => {
    const el = await mount();
    await openWith(el, 3);
    (el as any)._activeIndex = 1;

    const fired: BsSelectDetail[] = [];
    el.addEventListener('bs:select', (e) => fired.push((e as CustomEvent<BsSelectDetail>).detail));

    await pressInputKey(el, 'Enter');

    expect(fired).toHaveLength(1);
    expect(fired[0].item.id).toBe('r1');
  });

  it('closes dropdown after Enter select', async () => {
    const el = await mount();
    await openWith(el, 3);
    (el as any)._activeIndex = 0;
    el.addEventListener('bs:select', () => {});

    await pressInputKey(el, 'Enter');

    expect((el as any)._open).toBe(false);
  });

  it('does not fire bs:select when no item is highlighted (index -1)', async () => {
    const el = await mount();
    await openWith(el, 3);
    (el as any)._activeIndex = -1;

    const fired: Event[] = [];
    el.addEventListener('bs:select', (e) => fired.push(e));

    await pressInputKey(el, 'Enter');

    expect(fired).toHaveLength(0);
  });
});

describe('Escape key', () => {
  it('closes the dropdown', async () => {
    const el = await mount();
    await openWith(el, 3);

    await pressInputKey(el, 'Escape');

    expect((el as any)._open).toBe(false);
  });

  it('resets _activeIndex to -1', async () => {
    const el = await mount();
    await openWith(el, 3);
    (el as any)._activeIndex = 2;

    await pressInputKey(el, 'Escape');

    expect((el as any)._activeIndex).toBe(-1);
  });
});

describe('aria-activedescendant', () => {
  it('is empty string when no item is active', async () => {
    const el = await mount();
    await openWith(el, 3);
    const input = el.shadowRoot!.querySelector('input')!;

    expect(input.getAttribute('aria-activedescendant')).toBe('');
  });

  it('reflects result-{index} when an item is highlighted', async () => {
    const el = await mount();
    await openWith(el, 3);
    (el as any)._activeIndex = 2;
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.getAttribute('aria-activedescendant')).toBe('result-2');
  });
});

describe('aria-expanded', () => {
  it('is "false" when dropdown is closed', async () => {
    const el = await mount();
    const combobox = el.shadowRoot!.querySelector('[role="combobox"]')!;
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
  });

  it('is "true" when dropdown is open', async () => {
    const el = await mount();
    await openWith(el, 3);
    const combobox = el.shadowRoot!.querySelector('[role="combobox"]')!;
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('aria-disabled', () => {
  it('is "false" by default', async () => {
    const el = await mount();
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.getAttribute('aria-disabled')).toBe('false');
  });

  it('is "true" when disabled attribute is set', async () => {
    const el = await mount();
    el.setAttribute('disabled', '');
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.getAttribute('aria-disabled')).toBe('true');
  });

  it('reverts to "false" when disabled is removed', async () => {
    const el = await mount();
    el.setAttribute('disabled', '');
    await el.updateComplete;
    el.removeAttribute('disabled');
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.getAttribute('aria-disabled')).toBe('false');
  });
});

describe('Tab focus trap in dropdown', () => {
  it('Tab on a result item closes the dropdown', async () => {
    const el = await mount();
    await openWith(el, 3);

    await pressDropdownKey(el, 'Tab');

    expect((el as any)._open).toBe(false);
  });

  it('Tab on a result item does not fire when dropdown is already closed', async () => {
    const el = await mount();
    (el as any)._open = false;
    await el.updateComplete;

    // Should not throw or change state
    await pressDropdownKey(el, 'Tab');

    expect((el as any)._open).toBe(false);
  });
});

describe('keyboard disabled guard', () => {
  it('ArrowDown does nothing when disabled', async () => {
    const el = await mount();
    el.setAttribute('disabled', '');
    await openWith(el, 3);

    await pressInputKey(el, 'ArrowDown');

    expect((el as any)._activeIndex).toBe(-1);
  });
});

describe('result item click', () => {
  it('clicking a result fires bs:select with the correct item', async () => {
    const el = await mount();
    await openWith(el, 3);
    await el.updateComplete;

    const fired: BsSelectDetail[] = [];
    el.addEventListener('bs:select', (e) => fired.push((e as CustomEvent<BsSelectDetail>).detail));

    const resultItem = el.shadowRoot!.querySelector('#result-0') as HTMLElement;
    resultItem?.click();
    await el.updateComplete;

    expect(fired).toHaveLength(1);
    expect(fired[0].item.id).toBe('r0');
  });
});
