import { describe, expect, it } from 'vitest';
import { ABOUT_REVEAL_U, RANGE, story } from './story';

describe('scroll story', () => {
  it('before the start: galaxy unformed, field dark, no labels', () => {
    const s = story(-1);
    expect(s.intro).toBe(0);
    expect(s.disperse).toBe(0);
    expect(s.labelsShown).toBe(false);
    expect(s.ambient).toBe(0);
  });

  it('mid-convergence: progress between 0 and 1, labels not yet in', () => {
    const s = story(0);
    expect(s.intro).toBeGreaterThan(0);
    expect(s.intro).toBeLessThan(1);
    expect(s.labelsShown).toBe(false);
  });

  it('during the hold: fully formed, labels shown, not dispersed, upright', () => {
    for (const u of [1, 1.3, 1.55]) {
      const s = story(u);
      expect(s.intro).toBe(1);
      expect(s.labelsShown).toBe(true);
      expect(s.disperse).toBe(0);
      expect(s.tilt).toBeCloseTo(0);
      expect(s.fieldOpacity).toBe(1);
    }
  });

  it('after dispersal: labels hidden, field at 40%', () => {
    const s = story(2.5);
    expect(s.disperse).toBe(1);
    expect(s.labelsShown).toBe(false);
    expect(s.labelOpacity).toBe(0);
    expect(s.fieldOpacity).toBeCloseTo(0.4);
  });

  it('same state whether reached scrolling down or up', () => {
    const down = [-1, 0, 0.5, 1.2, 1.8, 2.5].map(story);
    const up = [2.5, 1.8, 1.2, 0.5, 0, -1].map(story).reverse();
    expect(up).toEqual(down);
  });

  it('dispersal completes before the About reveal starts', () => {
    expect(RANGE.disperse[1]).toBeLessThanOrEqual(ABOUT_REVEAL_U);
    expect(story(ABOUT_REVEAL_U).disperse).toBe(1);
  });
});
