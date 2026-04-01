/**
 * positioning.ts
 * @author Koushik R.
 *
 * Pure dropdown positioning engine — no DOM access, fully unit-testable.
 *
 * Receives the anchor element's bounding rect (from getBoundingClientRect),
 * the expected dropdown height, and the current viewport dimensions.
 * Returns { top, left, width, placement } to apply via element.style.
 *
 * Placement rules (in priority order):
 *  1. Place BELOW the anchor if there is enough space below for the full
 *     dropdown height, or if the space below >= space above.
 *  2. Flip ABOVE otherwise (more room above than below).
 *  3. Clamp left: if the dropdown would overflow the right viewport edge,
 *     shift it left until it fits (keeping an 8px safety margin).
 *  4. Never let the left edge go below 8px (left-edge clamp).
 *  5. Width always matches the anchor width so the dropdown lines up.
 *
 * Why position:fixed instead of position:absolute?
 *  - Absolute positioning requires a positioned ancestor, which can be
 *    unpredictable when the component is used across different page layouts.
 *  - Fixed positioning is always relative to the viewport, making placement
 *    deterministic regardless of scroll, overflow, or stacking context.
 *  - The containing block issue (contain:layout breaks fixed) is explicitly
 *    avoided: we use contain:style only on :host (see banking-search.styles.ts).
 */

/** Bounding rect of the anchor element (output of getBoundingClientRect). */
export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Current viewport dimensions. */
export interface Viewport {
  width: number;
  height: number;
}

/** Where and how to render the dropdown. */
export interface PositionResult {
  /** CSS `top` value in pixels — apply as `element.style.top`. */
  top: number;
  /** CSS `left` value in pixels — apply as `element.style.left`. */
  left: number;
  /** Dropdown width in pixels — matches anchor width. */
  width: number;
  /** Whether the dropdown is rendered below or above the anchor. */
  placement: 'below' | 'above';
}

/** Pixel gap between the anchor edge and the dropdown. */
const OFFSET = 4;

/** Minimum pixel distance from any viewport edge. */
const MARGIN = 8;

/**
 * Computes the viewport-relative position for a fixed-position dropdown.
 *
 * @param anchor         - getBoundingClientRect() of the anchor element.
 * @param dropdownHeight - Current or estimated scrollHeight of the dropdown.
 * @param viewport       - { width: window.innerWidth, height: window.innerHeight }.
 * @returns              - { top, left, width, placement } ready to apply via style.
 */
export function computePosition(
  anchor: AnchorRect,
  dropdownHeight: number,
  viewport: Viewport,
): PositionResult {
  // Available space below the anchor bottom and above the anchor top,
  // both reduced by MARGIN to keep the dropdown away from viewport edges.
  const spaceBelow = viewport.height - (anchor.top + anchor.height) - MARGIN;
  const spaceAbove = anchor.top - MARGIN;

  // Prefer below — only flip above if there is strictly more space above.
  const placement: 'below' | 'above' =
    spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove ? 'below' : 'above';

  const top =
    placement === 'below'
      ? anchor.top + anchor.height + OFFSET
      : anchor.top - dropdownHeight - OFFSET;

  // Left: start flush with the anchor, then clamp so the right edge stays
  // within the viewport, then ensure the left edge stays above MARGIN.
  let left = anchor.left;
  if (left + anchor.width > viewport.width - MARGIN) {
    left = viewport.width - anchor.width - MARGIN;
  }
  left = Math.max(MARGIN, left);

  return { top, left, width: anchor.width, placement };
}
