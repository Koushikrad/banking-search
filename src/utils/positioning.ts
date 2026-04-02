/**
 * @author Koushik R.
 *
 * Pure dropdown positioning — no DOM access, fully unit-testable.
 *
 * Takes the anchor's bounding rect, the dropdown height, and the viewport size.
 * Returns { top, left, width, placement } to apply via element.style.
 *
 * Placement logic:
 *   - Prefers below. Flips above only when there is strictly more room there.
 *   - Clamps left so the right edge never escapes the viewport.
 *   - Width always matches the anchor so the dropdown lines up flush.
 *
 * Uses position:fixed (not absolute) so placement is always relative to the
 * viewport — immune to scroll position, overflow:hidden ancestors, and
 * unpredictable positioned parents.
 */

/** Output of getBoundingClientRect() on the anchor element. */
export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface PositionResult {
  top: number;
  left: number;
  width: number;
  placement: 'below' | 'above';
}

const OFFSET = 4; // gap between anchor and dropdown edge
const MARGIN = 8; // minimum distance from any viewport edge

export function computePosition(
  anchor: AnchorRect,
  dropdownHeight: number,
  viewport: Viewport,
): PositionResult {
  const spaceBelow = viewport.height - (anchor.top + anchor.height) - MARGIN;
  const spaceAbove = anchor.top - MARGIN;

  const placement: 'below' | 'above' =
    spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove ? 'below' : 'above';

  const rawTop =
    placement === 'below'
      ? anchor.top + anchor.height + OFFSET
      : anchor.top - dropdownHeight - OFFSET;

  // Clamp so the dropdown never escapes the top edge of the viewport,
  // mirroring the left-edge clamp below. Without this, "above" placement
  // near the top of the screen produces a negative top — the first few
  // result items scroll out of view above the viewport.
  const top = Math.max(MARGIN, rawTop);

  let left = anchor.left;
  if (left + anchor.width > viewport.width - MARGIN) {
    left = viewport.width - anchor.width - MARGIN;
  }
  left = Math.max(MARGIN, left);

  return { top, left, width: anchor.width, placement };
}
