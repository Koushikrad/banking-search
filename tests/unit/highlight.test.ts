/**
 * highlight.test.ts
 * @author Koushik R.
 *
 * Unit tests for the highlight utility.
 * Runs in Vitest with jsdom — the DocumentFragment and DOM APIs are provided
 * by jsdom without needing a real browser.
 */

import { describe, it, expect } from 'vitest';
import { highlight } from '../../src/utils/highlight';

/** Helper: serialise a DocumentFragment to an HTML string for easy assertion. */
function fragmentToHtml(fragment: DocumentFragment): string {
  const div = document.createElement('div');
  div.appendChild(fragment.cloneNode(true));
  return div.innerHTML;
}

describe('highlight', () => {
  it('returns plain text when term is empty', () => {
    const fragment = highlight('Primary Checking', '');
    expect(fragmentToHtml(fragment)).toBe('Primary Checking');
  });

  it('returns plain text when term is only whitespace', () => {
    const fragment = highlight('Primary Checking', '   ');
    expect(fragmentToHtml(fragment)).toBe('Primary Checking');
  });

  it('returns plain text when term has no match', () => {
    const fragment = highlight('Primary Checking', 'xyz');
    expect(fragmentToHtml(fragment)).toBe('Primary Checking');
  });

  it('wraps a matching substring in a <mark> element', () => {
    const fragment = highlight('Primary Checking', 'Check');
    expect(fragmentToHtml(fragment)).toBe('Primary <mark>Check</mark>ing');
  });

  it('matching is case-insensitive', () => {
    const fragment = highlight('Primary Checking', 'checking');
    expect(fragmentToHtml(fragment)).toBe('Primary <mark>Checking</mark>');
  });

  it('matches at the start of the string', () => {
    const fragment = highlight('Savings Account', 'Sav');
    expect(fragmentToHtml(fragment)).toBe('<mark>Sav</mark>ings Account');
  });

  it('matches at the end of the string', () => {
    const fragment = highlight('Savings Account', 'ount');
    expect(fragmentToHtml(fragment)).toBe('Savings Acc<mark>ount</mark>');
  });

  it('matches the entire string', () => {
    const fragment = highlight('loan', 'loan');
    expect(fragmentToHtml(fragment)).toBe('<mark>loan</mark>');
  });

  it('handles multiple non-overlapping matches', () => {
    const fragment = highlight('abc abc abc', 'abc');
    expect(fragmentToHtml(fragment)).toBe(
      '<mark>abc</mark> <mark>abc</mark> <mark>abc</mark>',
    );
  });

  it('escapes regex special characters in the term — dot does not act as wildcard', () => {
    const fragment = highlight('a.b.c', '.');
    // "." should only match literal dots, not every character
    expect(fragmentToHtml(fragment)).toBe('a<mark>.</mark>b<mark>.</mark>c');
  });

  it('escapes regex special characters — parens do not cause a syntax error', () => {
    const fragment = highlight('fee (waived)', '(waived)');
    expect(fragmentToHtml(fragment)).toBe('fee <mark>(waived)</mark>');
  });

  it('escapes regex special characters — asterisk does not cause a syntax error', () => {
    expect(() => highlight('test*value', '*')).not.toThrow();
  });

  it('does not inject HTML — angle brackets in text are escaped', () => {
    const fragment = highlight('<script>alert(1)</script>', 'script');
    const html = fragmentToHtml(fragment);
    // Should not contain a real <script> tag — only text-node encoded entities
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;');
  });

  it('returns a DocumentFragment', () => {
    const result = highlight('hello', 'ell');
    expect(result).toBeInstanceOf(DocumentFragment);
  });
});
