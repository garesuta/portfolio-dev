# Astro multi-page site with vanilla three.js, not Next.js

The portfolio is built on Astro as a plain multi-page site, with vanilla three.js (WebGL) on Main and native cross-document view transitions between pages. Next.js + React Three Fiber, Teen's CV headline stack, was considered and rejected. We'd already decided that the universe gives way: live 3D on Main only, calm reading pages elsewhere. That favours pages that ship no 3D or framework JavaScript, built-in content collections for Work, Writing and Lab, and porting the hand-written prototype shaders unchanged. Next would load React and its runtime on every route and need the shaders wrapped in R3F. (Choose the stack: `.scratch/portfolio-spec/issues/03-choose-the-stack.md`.)

## Consequences

- Firefox has no cross-document view transitions, so it switches pages instantly instead of fading. Content is never lost.
- Leaving Main destroys its WebGL context, and returning rebuilds it, including shader compiles.
- Moving to Astro's `<ClientRouter />` later is a contained change if every browser must fade.
