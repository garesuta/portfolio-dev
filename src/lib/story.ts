// Scroll story timeline: one pure function from scroll position to beat state.
// u = viewport heights the galaxy spacer's top has passed the viewport top.
// Every value depends on u alone, so scrolling back undoes it.

/** Height of the galaxy spacer, in viewport heights. */
export const SPACER_VH = 3;
/** The About word reveal starts when its top reaches 60% of the viewport, i.e. at u = SPACER_VH - 0.6. */
export const ABOUT_REVEAL_U = SPACER_VH - 0.6;
// ponytail: tuned by eye at 1200x750; retune if SPACER_VH changes
export const RANGE = { intro: [-0.4, 1], labelsIn: 0.6, disperse: [1.6, 2.3] } as const;

export const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
export const smoothstep = (x: number, a: number, b: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export interface Beat {
  /** galaxy convergence progress, 0 = scattered, 1 = formed */
  intro: number;
  /** dispersal into the backdrop field, 0..1 */
  disperse: number;
  labelsShown: boolean;
  labelOpacity: number;
  /** galaxy tilt back, radians */
  tilt: number;
  /** canvas opacity: 1, dimming to 0.4 once dispersed */
  fieldOpacity: number;
  ambient: number;
}

export function story(u: number): Beat {
  const intro = clamp01((u - RANGE.intro[0]) / (RANGE.intro[1] - RANGE.intro[0]));
  const disperse = smoothstep(u, RANGE.disperse[0], RANGE.disperse[1]);
  return {
    intro,
    disperse,
    labelsShown: intro >= RANGE.labelsIn && disperse < 0.02,
    labelOpacity: 1 - smoothstep(u, RANGE.disperse[0], RANGE.disperse[0] + 0.25),
    tilt: -1.05 * Math.sin((Math.min(disperse / 0.75, 1) * Math.PI) / 2),
    fieldOpacity: 1 - 0.6 * disperse,
    ambient: 0.55 * intro * (1 - 0.6 * disperse),
  };
}
