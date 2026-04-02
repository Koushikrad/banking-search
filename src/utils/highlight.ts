/**
 * @author Koushik R.
 *
 * Wraps matched substrings in <mark> elements inside a DocumentFragment.
 * Safe against XSS: the search term is regex-escaped and all content is
 * inserted as Text nodes — never via innerHTML.
 *
 *   highlight('Primary Checking', 'check')
 *   // → "Primary " + <mark>Check</mark> + "ing"
 */

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param text - Full string to search within (e.g. a result title).
 * @param term - Search term. Case-insensitive. Empty string returns text as-is.
 */
export function highlight(text: string, term: string): DocumentFragment {
  const fragment = document.createDocumentFragment();

  if (!term.trim()) {
    fragment.appendChild(document.createTextNode(text));
    return fragment;
  }

  const escaped = escapeRegExp(term);
  // Capturing group keeps the matched segments in the split() result.
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  // Separate non-stateful regex avoids lastIndex issues with the global flag.
  const matchRegex = new RegExp(`^${escaped}$`, 'i');

  for (const part of parts) {
    if (part === '') continue;
    if (matchRegex.test(part)) {
      const mark = document.createElement('mark');
      mark.textContent = part;
      fragment.appendChild(mark);
    } else {
      fragment.appendChild(document.createTextNode(part));
    }
  }

  return fragment;
}
