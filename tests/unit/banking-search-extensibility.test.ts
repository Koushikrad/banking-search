import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import '../../src/index.js';
import type { BankingSearch } from '../../src/components/banking-search/banking-search.js';
import type { SearchResultItem } from '../../src/components/banking-search/banking-search.types.js';

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

vi.stubGlobal('ResizeObserver', StubResizeObserver);
vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);

const mockItems: SearchResultItem[] = [
  { id: '1', type: 'account', title: 'Test Account' },
];

describe('banking-search extensibility hooks', () => {
  let el: BankingSearch;

  afterEach(() => {
    el?.remove();
  });

  async function mount(): Promise<BankingSearch> {
    const el = await fixture<BankingSearch>(
      html`<banking-search min-chars="0"></banking-search>`
    );
    return el;
  }

  async function openWith(el: BankingSearch, data: SearchResultItem[]) {
    el.results = data;
    (el as any)._open = true;
    (el as any)._inputValue = 'test';
    (el as any)._visibleCount = data.length;
    await el.updateComplete;
  }

  describe('renderItem callback', () => {
    it('overrides default rendering and attaches a11y attributes', async () => {
      el = await mount();
      el.renderItem = (item) => {
        const div = document.createElement('div');
        div.className = 'my-custom-item';
        div.textContent = `Custom: ${item.title}`;
        return div;
      };

      await openWith(el, [...mockItems]);

      // Assert the fallback item didn't render
      const defaultItem = el.shadowRoot!.querySelector('.result-item');
      expect(defaultItem).toBeNull();

      // Assert custom item rendered
      const customItem = el.shadowRoot!.querySelector('.my-custom-item') as HTMLElement;
      expect(customItem).to.exist;
      expect(customItem.textContent).toBe('Custom: Test Account');

      // Assert component attached ARIA attributes
      expect(customItem.getAttribute('role')).toBe('option');
      expect(customItem.getAttribute('id')).toBe('result-0');
      expect(customItem.getAttribute('aria-selected')).toBe('false');
      expect(customItem.getAttribute('tabindex')).toBe('-1');
    });

    it('fires bs:select when the custom element is clicked', async () => {
      el = await mount();
      el.renderItem = (item) => {
        const div = document.createElement('div');
        div.className = 'custom-click-target';
        return div;
      };

      await openWith(el, [...mockItems]);

      const spy = vi.fn();
      el.addEventListener('bs:select', spy);

      const customItem = el.shadowRoot!.querySelector('.custom-click-target') as HTMLElement;
      customItem.click();

      expect(spy).toHaveBeenCalledOnce();
      const detail = spy.mock.calls[0][0].detail;
      expect(detail.item).to.deep.equal(mockItems[0]);
    });
  });

  describe('named slots', () => {
    it('slot="no-results" overrides the default empty state panel', async () => {
      el = await fixture<BankingSearch>(html`
        <banking-search min-chars="0" no-results-text="Default message">
          <div slot="no-results" class="custom-empty">Nothing found here custom</div>
        </banking-search>
      `);

      await openWith(el, []);

      const slotEl = el.shadowRoot!.querySelector('slot[name="no-results"]') as HTMLSlotElement;
      expect(slotEl).to.exist;

      // Default fallback should NOT be rendered when slot is provided
      const assignedNodes = slotEl.assignedNodes({ flatten: true });
      const customNode = assignedNodes.find(n => (n as HTMLElement).classList?.contains('custom-empty')) as HTMLElement;
      expect(customNode).to.exist;
      expect(customNode.textContent).to.equal('Nothing found here custom');
    });

    it('slot="error" overrides the default error panel', async () => {
      el = await fixture<BankingSearch>(html`
        <banking-search min-chars="0" error="network">
          <div slot="error" class="custom-error">Custom error message</div>
        </banking-search>
      `);

      await openWith(el, []);

      const slotEl = el.shadowRoot!.querySelector('slot[name="error"]') as HTMLSlotElement;
      expect(slotEl).to.exist;

      const assignedNodes = slotEl.assignedNodes({ flatten: true });
      const customNode = assignedNodes.find(n => (n as HTMLElement).classList?.contains('custom-error')) as HTMLElement;
      expect(customNode).to.exist;
      expect(customNode.textContent).to.equal('Custom error message');
      
      // Let's also verify that setting error opens the dropdown and shows the error
      expect(el.shadowRoot!.querySelector('.dropdown')?.classList.contains('open')).toBe(true);
    });
  });
});
