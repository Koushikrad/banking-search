/**
 * positioning.test.ts
 * @author Koushik R.
 *
 * Unit tests for the computePosition() pure function.
 * No DOM, no Lit — just plain arithmetic verified against expectations.
 *
 * The four viewport-edge scenarios we must always handle:
 *  1. Enough space below → places dropdown below the anchor
 *  2. More space above than below → flips above
 *  3. Right edge overflow → shifts left to stay within viewport
 *  4. Left edge clamp → never goes below 8px from left edge
 */

import { describe, it, expect } from 'vitest';
import { computePosition } from '../../src/utils/positioning';

// Shared fixtures
const VIEWPORT = { width: 800, height: 600 };

// A typical anchor near the top-left — plenty of space below and to the right
const ANCHOR_DEFAULT = { top: 100, left: 50, width: 400, height: 48 };

describe('computePosition — placement (below vs above)', () => {
  it('places below when there is enough space below for the full dropdown', () => {
    const result = computePosition(ANCHOR_DEFAULT, 200, VIEWPORT);
    expect(result.placement).toBe('below');
  });

  it('top is below the anchor bottom when placed below', () => {
    const result = computePosition(ANCHOR_DEFAULT, 200, VIEWPORT);
    // top must be greater than anchor.top + anchor.height
    expect(result.top).toBeGreaterThan(ANCHOR_DEFAULT.top + ANCHOR_DEFAULT.height);
  });

  it('flips above when there is more space above than below', () => {
    // Anchor near the bottom of the viewport — lots of space above, little below
    const anchor = { top: 520, left: 50, width: 400, height: 48 };
    const result = computePosition(anchor, 200, VIEWPORT);
    expect(result.placement).toBe('above');
  });

  it('top is above the anchor top when flipped above', () => {
    const anchor = { top: 520, left: 50, width: 400, height: 48 };
    const result = computePosition(anchor, 200, VIEWPORT);
    expect(result.top).toBeLessThan(anchor.top);
  });

  it('prefers below when space below equals space above', () => {
    // Anchor exactly in the middle of a 600px viewport with a 48px anchor
    // space below ≈ space above
    const anchor = { top: 276, left: 50, width: 400, height: 48 };
    const result = computePosition(anchor, 100, VIEWPORT);
    expect(result.placement).toBe('below');
  });

  it('prefers below even when the dropdown does not fully fit below, if below >= above', () => {
    // 80px below, 120px above — but dropdown is 200px.
    // Neither fits, but below (80) < above (120), so it flips above.
    const anchor = { top: 128, left: 50, width: 400, height: 48 };
    const result = computePosition(anchor, 200, { width: 800, height: 200 });
    // space below = 200 - (128+48) - 8 = 16; space above = 128 - 8 = 120
    expect(result.placement).toBe('above');
  });
});

describe('computePosition — horizontal clamping', () => {
  it('width always matches the anchor width', () => {
    const result = computePosition(ANCHOR_DEFAULT, 200, VIEWPORT);
    expect(result.width).toBe(ANCHOR_DEFAULT.width);
  });

  it('left is flush with the anchor when no overflow', () => {
    const result = computePosition(ANCHOR_DEFAULT, 200, VIEWPORT);
    expect(result.left).toBe(ANCHOR_DEFAULT.left);
  });

  it('clamps left to prevent right-edge overflow (8px margin)', () => {
    // anchor.left + anchor.width = 50 + 700 = 750 but viewport width is 800
    // 750 <= 800 - 8 = 792, so no clamp needed. Let's push it over:
    const anchor = { top: 100, left: 400, width: 400, height: 48 };
    // 400 + 400 = 800 > 800 - 8 (792) → should clamp left to 800 - 400 - 8 = 392
    const result = computePosition(anchor, 200, VIEWPORT);
    expect(result.left + result.width).toBeLessThanOrEqual(VIEWPORT.width - 8);
    expect(result.left).toBe(VIEWPORT.width - anchor.width - 8); // 392
  });

  it('never lets left go below 8px even if anchor is off screen left', () => {
    // Anchor starting at a negative left (e.g. component partially off screen)
    const anchor = { top: 100, left: -30, width: 200, height: 48 };
    const result = computePosition(anchor, 200, VIEWPORT);
    expect(result.left).toBeGreaterThanOrEqual(8);
  });

  it('applies left clamp even after right-edge adjustment pushes into negative', () => {
    // Very wide dropdown on a narrow viewport
    const narrowViewport = { width: 200, height: 600 };
    const anchor = { top: 100, left: 0, width: 220, height: 48 };
    const result = computePosition(anchor, 200, narrowViewport);
    // Right-edge clamp: left = 200 - 220 - 8 = -28 → then left-edge clamp → 8
    expect(result.left).toBeGreaterThanOrEqual(8);
  });
});

describe('computePosition — top edge clamping (above placement)', () => {
  it('clamps top to 8px when above placement would produce a negative top', () => {
    // Anchor near the top of a short viewport — flips above but raw top is negative
    // anchor.top=50, dropdownHeight=200: raw top = 50 - 200 - 4 = -154 → clamped to 8
    const anchor = { top: 50, left: 50, width: 400, height: 48 };
    const shortViewport = { width: 800, height: 120 };
    const result = computePosition(anchor, 200, shortViewport);
    expect(result.placement).toBe('above');
    expect(result.top).toBeGreaterThanOrEqual(8);
  });

  it('does not clamp top when above placement stays within viewport', () => {
    // anchor.top=400, dropdownHeight=200: raw top = 400 - 200 - 4 = 196 — no clamp
    const anchor = { top: 400, left: 50, width: 400, height: 48 };
    const result = computePosition(anchor, 200, VIEWPORT);
    expect(result.placement).toBe('above');
    expect(result.top).toBe(196);
  });
});

describe('computePosition — offset gap', () => {
  it('has a 4px gap between anchor bottom and dropdown top (placement below)', () => {
    const result = computePosition(ANCHOR_DEFAULT, 200, VIEWPORT);
    const expectedTop = ANCHOR_DEFAULT.top + ANCHOR_DEFAULT.height + 4;
    expect(result.top).toBe(expectedTop);
  });

  it('has a 4px gap between dropdown bottom and anchor top (placement above)', () => {
    const anchor = { top: 520, left: 50, width: 400, height: 48 };
    const dropdownHeight = 200;
    const result = computePosition(anchor, dropdownHeight, VIEWPORT);
    const expectedTop = anchor.top - dropdownHeight - 4;
    expect(result.top).toBe(expectedTop);
  });
});
