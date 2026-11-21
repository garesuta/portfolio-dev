// Beats 3–6: scroll-scrubbed reveals (from the bombay about/stack extraction).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
  const about = document.querySelector<HTMLElement>('#about')!;
  const stack = document.querySelector<HTMLElement>('#my-stack')!;
  gsap.from(about.querySelectorAll('.word'), {
    opacity: 0.12, ease: 'none', stagger: 0.1,
    scrollTrigger: { trigger: about, start: 'top 60%', end: 'bottom 70%', scrub: 0.5 },
  });
  gsap.from(stack.querySelectorAll('.category, li'), {
    opacity: 0, y: 40, ease: 'none', stagger: 0.4,
    scrollTrigger: { trigger: stack, start: 'top 80%', end: 'bottom 80%', scrub: 0.5 },
  });
  for (const sec of document.querySelectorAll<HTMLElement>('.timeline')) {
    gsap.from(sec.querySelectorAll('.category, .job, .school'), {
      opacity: 0, y: 40, ease: 'none', stagger: 0.4,
      // end on the last row, not the padded section, so the page ends after it finishes
      scrollTrigger: { trigger: sec, start: 'top 80%', endTrigger: sec.lastElementChild, end: 'bottom 75%', scrub: 0.5 },
    });
  }
  gsap.to(stack, {
    opacity: 0, y: -150,
    scrollTrigger: { trigger: stack, start: 'bottom 50%', end: 'bottom 10%', scrub: 1 },
  });
});
document.fonts.ready.then(() => ScrollTrigger.refresh());
