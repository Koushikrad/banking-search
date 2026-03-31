/**
 * highlight.ts
 * @author Koushik R.
 *
 * XSS-safe search term highlighting utility.
 *
 * Takes a plain text string and a search term, and returns a
 * DocumentFragment where matched substrings are wrapped in <mark> elements.
 *
 * Security model:
 *  - The search term is sanitised through escapeRegExp() before being used
 *    in a RegExp — special regex characters cannot cause injection.
 *  - Matched and unmatched segments are inserted as Text nodes, never
 *    as innerHTML. This is the only safe way to insert user-controlled
 *    content into the DOM.
 *  - No emojis. The <mark> element handles visual styling via CSS.
 *
 * Usage:
 *   const fragment = highlight('Primary Checking', 'check');
 *   element.appendChild(fragment);
 *   // Renders: "Primary " + <mark>Check</mark> + "ing"
 */

/**
 * Escapes characters that have special meaning in a RegExp pattern.
 * Prevents a search term like "a.b" from matching "aXb".
 */
function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a DocumentFragment with matched substrings wrapped in <mark> elements.
 *
 * @param text   - The full string to search within (e.g. a result title).
 * @param term   - The search term to highlight. Case-insensitive match.
 * @returns        A DocumentFragment ready to append to a DOM node.
 *                 If term is empty or has no match, returns a fragment
 *                 containing a single Text node of the full text.
 */
export function highlight(text: string, term: string): DocumentFragment {
  const fragment = document.createDocumentFragment();

  if (!term.trim()) {
    fragment.appendChild(document.createTextNode(text));
    return fragment;
  }

  const escaped = escapeRegExp(term);
  // The capturing group ensures split() includes the matched segments
  // in the resulting array, not just the segments between matches.
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  // Build a separate non-stateful regex for match testing to avoid
  // lastIndex issues with the global flag on the split regex.
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
