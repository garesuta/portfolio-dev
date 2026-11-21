// Beat 2: galaxy convergence. Fixed full-viewport backdrop behind every later beat.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RANGE, story } from '../lib/story';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const q = new URLSearchParams(location.search);
const backdrop = $('.backdrop');
const chrome = $('.chrome');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const showStill = () => { backdrop.dataset.static = 'true'; };

// ---------------------------------------------------------------- scroll story (pure function of scroll; reverses on scroll-up)
const converge = $('.converge');
const beat = () => story(-converge.getBoundingClientRect().top / innerHeight);
const ambient = $('.ambient');
function storyChrome() {
  const s = beat();
  chrome.classList.toggle('in', s.labelsShown);
  chrome.style.setProperty('--copy-opacity', String(s.labelOpacity));
  ambient.style.opacity = String(s.ambient);
}
addEventListener('scroll', storyChrome, { passive: true });
addEventListener('resize', storyChrome);
storyChrome();

if (q.has('still')) showStill();
else {
  try { boot(); } catch (err) { console.warn('[astra] falling back to poster:', err); showStill(); }
}

function boot() {
// ---------------------------------------------------------------- constants (paths.json / scene.json)
const SVG_ORIGIN = [115, 170], SVG_SCALE = 9.7 / 325;
const PATHS = [ // spiral galaxy, astra-poster style: flat-on, 5 arms x 1.5 turns, one star lane per arm
  { d: 'M128.0 170.0L128.2 168.6L128.3 167.2L128.3 165.7L128.1 164.2L127.7 162.7L127.1 161.2L126.4 159.7L125.5 158.3L124.5 157.0L123.2 155.7L121.9 154.6L120.3 153.6L118.7 152.7L116.9 152.0L115.0 151.4L113.0 151.1L111.0 151.0L108.8 151.0L106.7 151.4L104.6 151.9L102.4 152.7L100.3 153.7L98.3 155.0L96.4 156.5L94.6 158.2L93.0 160.2L91.5 162.4L90.3 164.7L89.3 167.3L88.5 170.0L88.0 172.8L87.8 175.8L87.9 178.8L88.4 181.8L89.2 184.9L90.3 188.0L91.8 190.9L93.6 193.8L95.7 196.5L98.2 199.1L101.0 201.4L104.1 203.5L107.5 205.3L111.1 206.7L115.0 207.8L119.0 208.5L123.2 208.8L127.5 208.6L131.9 208.0L136.3 206.9L140.6 205.3L144.9 203.2L149.0 200.6L152.9 197.5L156.5 194.0L159.8 190.0L162.8 185.5L165.4 180.7L167.4 175.5L169.0 170.0L170.0 164.2L170.4 158.2L170.1 152.1L169.2 145.9L167.6 139.6L165.4 133.4L162.4 127.4L158.7 121.5L154.3 115.9L149.2 110.7L143.5 106.0L137.2 101.7L130.3 98.1L122.9 95.2L115.0 92.9L106.8 91.5L98.2 91.0L89.4 91.3L80.5 92.6L71.6 94.9L62.8 98.1L54.1 102.4L45.8 107.7L37.8 113.9L30.4 121.2L23.6 129.3L17.6 138.3L12.4 148.2L8.2 158.8L5.0 170.0', depth: 0.62, phase: 0.16, speed: 0.025, strong: true },
  { d: 'M119.0 157.6L117.8 157.0L116.4 156.4L115.0 156.0L113.5 155.8L112.0 155.7L110.4 155.7L108.8 156.0L107.1 156.4L105.5 157.0L104.0 157.8L102.5 158.7L101.0 159.8L99.7 161.2L98.4 162.6L97.4 164.3L96.4 166.0L95.6 168.0L95.1 170.0L94.7 172.1L94.6 174.3L94.7 176.6L95.0 178.9L95.6 181.2L96.4 183.5L97.5 185.7L98.9 187.9L100.5 190.0L102.4 191.9L104.5 193.6L106.8 195.2L109.4 196.5L112.1 197.6L115.0 198.4L118.0 199.0L121.2 199.2L124.4 199.0L127.7 198.6L131.0 197.7L134.3 196.5L137.5 195.0L140.6 193.0L143.5 190.7L146.2 188.0L148.7 185.0L151.0 181.7L152.9 178.1L154.4 174.1L155.6 170.0L156.4 165.7L156.6 161.1L156.5 156.5L155.8 151.8L154.6 147.1L152.9 142.5L150.6 137.9L147.8 133.5L144.5 129.3L140.7 125.4L136.4 121.8L131.7 118.7L126.5 115.9L120.9 113.7L115.0 112.0L108.8 111.0L102.4 110.5L95.8 110.8L89.1 111.8L82.4 113.5L75.7 115.9L69.2 119.1L62.9 123.1L56.9 127.8L51.4 133.3L46.3 139.4L41.7 146.2L37.8 153.6L34.6 161.6L32.3 170.0L30.7 178.9L30.1 188.0L30.5 197.5L31.9 207.0L34.3 216.6L37.8 226.1L42.4 235.4L48.1 244.3L54.8 252.9L62.5 260.8L71.3 268.1L81.0 274.6', depth: -0.46, phase: 0.72, speed: -0.018, strong: false },
  { d: 'M104.5 162.4L103.5 163.3L102.5 164.5L101.7 165.7L101.0 167.0L100.4 168.5L100.0 170.0L99.7 171.6L99.6 173.3L99.7 175.0L99.9 176.7L100.4 178.4L101.0 180.2L101.8 181.8L102.9 183.5L104.1 185.0L105.5 186.5L107.1 187.8L108.8 189.0L110.8 190.0L112.8 190.8L115.0 191.4L117.3 191.8L119.7 191.9L122.1 191.9L124.6 191.5L127.0 190.9L129.5 190.0L131.9 188.8L134.2 187.3L136.4 185.6L138.5 183.6L140.4 181.3L142.1 178.8L143.5 176.1L144.7 173.1L145.5 170.0L146.1 166.7L146.3 163.3L146.2 159.9L145.7 156.3L144.8 152.8L143.5 149.3L141.8 145.9L139.7 142.6L137.2 139.4L134.4 136.5L131.1 133.8L127.5 131.4L123.6 129.3L119.5 127.7L115.0 126.4L110.3 125.6L105.5 125.3L100.5 125.5L95.5 126.2L90.5 127.5L85.5 129.3L80.6 131.7L75.8 134.7L71.3 138.3L67.1 142.4L63.3 147.0L59.9 152.1L56.9 157.7L54.6 163.6L52.8 170.0L51.6 176.7L51.2 183.6L51.4 190.7L52.5 197.8L54.3 205.0L56.9 212.2L60.4 219.2L64.6 225.9L69.7 232.3L75.5 238.3L82.1 243.8L89.4 248.7L97.4 252.9L105.9 256.3L115.0 258.8L124.5 260.5L134.4 261.1L144.5 260.7L154.7 259.2L165.0 256.6L175.2 252.9L185.2 248.0L194.8 241.9L204.0 234.7', depth: 0.78, phase: 0.38, speed: 0.021, strong: true },
  { d: 'M104.5 177.6L105.1 178.9L105.9 180.1L106.8 181.3L107.9 182.4L109.0 183.4L110.4 184.3L111.8 185.0L113.4 185.6L115.0 186.1L116.7 186.4L118.5 186.5L120.3 186.4L122.2 186.2L124.1 185.7L125.9 185.0L127.7 184.1L129.5 183.0L131.1 181.7L132.7 180.2L134.1 178.5L135.3 176.6L136.4 174.6L137.3 172.3L138.0 170.0L138.4 167.5L138.6 165.0L138.5 162.4L138.1 159.7L137.4 157.1L136.4 154.4L135.2 151.8L133.6 149.4L131.7 147.0L129.6 144.8L127.1 142.8L124.4 141.0L121.5 139.4L118.3 138.1L115.0 137.2L111.5 136.6L107.8 136.4L104.1 136.5L100.3 137.1L96.5 138.0L92.8 139.4L89.1 141.2L85.5 143.5L82.1 146.1L79.0 149.2L76.1 152.7L73.5 156.5L71.3 160.7L69.5 165.2L68.2 170.0L67.3 175.0L67.0 180.2L67.2 185.5L68.0 190.9L69.3 196.4L71.3 201.7L73.9 207.0L77.1 212.1L80.9 216.9L85.3 221.4L90.3 225.5L95.8 229.2L101.7 232.3L108.2 234.9L115.0 236.8L122.2 238.1L129.6 238.5L137.2 238.3L144.9 237.1L152.6 235.2L160.3 232.3L167.8 228.6L175.0 224.1L181.9 218.6L188.4 212.4L194.3 205.3L199.5 197.5L204.0 188.9L207.7 179.7L210.4 170.0L212.2 159.8L212.9 149.2L212.4 138.3L210.8 127.3L208.0 116.3L204.0 105.3', depth: -0.7, phase: 0.58, speed: -0.016, strong: false },
  { d: 'M119.0 182.4L120.4 182.2L121.8 181.8L123.2 181.3L124.6 180.6L125.9 179.8L127.1 178.8L128.3 177.7L129.4 176.4L130.3 175.0L131.1 173.4L131.8 171.8L132.3 170.0L132.6 168.2L132.7 166.2L132.6 164.3L132.4 162.3L131.9 160.3L131.1 158.3L130.2 156.3L129.0 154.5L127.6 152.7L126.0 151.0L124.1 149.5L122.1 148.1L119.9 147.0L117.5 146.0L115.0 145.3L112.4 144.9L109.6 144.7L106.8 144.8L104.0 145.2L101.1 145.9L98.3 147.0L95.5 148.4L92.8 150.0L90.3 152.0L87.9 154.4L85.7 157.0L83.8 159.9L82.1 163.0L80.8 166.4L79.8 170.0L79.1 173.8L78.9 177.7L79.0 181.7L79.6 185.8L80.7 189.8L82.1 193.9L84.1 197.8L86.5 201.6L89.4 205.3L92.7 208.7L96.4 211.8L100.5 214.5L105.0 216.9L109.9 218.8L115.0 220.3L120.4 221.2L126.0 221.6L131.7 221.3L137.5 220.5L143.3 219.0L149.1 216.9L154.7 214.1L160.2 210.7L165.4 206.6L170.2 201.9L174.6 196.5L178.6 190.7L181.9 184.2L184.7 177.3L186.8 170.0L188.1 162.3L188.6 154.4L188.3 146.2L187.1 137.9L185.0 129.6L181.9 121.4L178.0 113.3L173.1 105.5L167.2 98.1L160.5 91.2L152.9 84.9L144.5 79.3L135.3 74.4L125.5 70.5L115.0 67.6L104.0 65.7L92.7 64.9L81.0 65.4', depth: 0.42, phase: 0.08, speed: 0.03, strong: true },
];
const COLORS = ['#94CCF4', '#D7EDFF', '#FFC77D', '#E8AC62', '#FFF2D9']; // hero blue, ice, hero gold, amber, cream
const COLOR_WEIGHTS = [.2, .14, .26, .12, .28];
const P = { pathDepth: 1.4, densityFalloff: .22, sizeFalloff: .45, starSize: 2.05, intensity: 1.35, flowSpeed: .8, twinkleSpeed: .62, clusterStrength: .66 };
const DELTA_CAP = .05;
const HOVER = { radius: .34, push: .09, swirl: 1.8 }; // swirl: rad/s at the cursor; // hero hoverPush falloff (NDC); ponytail: push doubled from the hero's .045, which is invisible on the sparse field
const ACROSS = .13;  // ponytail: arm half-width in world units, tuned against poster.webp
const COUNTS = { strong: 1500, weak: 1050, cluster: 1500, background: 900 }; // ponytail: source adapts counts per device profile

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NoToneMapping;
backdrop.prepend(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden', 'true');
renderer.domElement.addEventListener('webglcontextlost', showStill);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#000000');
const camera = new THREE.PerspectiveCamera(42, 1, .1, 80);
camera.position.set(0, 0, 8);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .4, .4, .35); // ponytail: source is .7 / threshold .08 in a mipmap-blur bloom; UnrealBloom at .08 hazes and boxes, so tuned by eye
if (bloom.strength > 0) composer.addPass(bloom);
composer.addPass(new OutputPass());

// shape group: authored transform + interaction rotation layered on top
const shape = new THREE.Group();          // fitted to viewport
const spin = new THREE.Group();           // drag / keys / auto-rotate
shape.add(spin);
scene.add(shape);

const U = {
  uTime: { value: 0 }, uIntro: { value: 0 }, uTilt: { value: 0 }, uDisperse: { value: 0 },
  uScatterSize: { value: new THREE.Vector2(10, 6) }, uPx: { value: 1 },
  uHover: { value: new THREE.Vector3() }, uSwirl: { value: 0 }, uViewport: { value: new THREE.Vector2(1, 1) },
};

function rng(seed: number) {
  let t = seed >>> 0;
  return () => { let e = (t += 0x6d2b79f5); e = Math.imul(e ^ (e >>> 15), 1 | e); e ^= e + Math.imul(e ^ (e >>> 7), 61 | e); return ((e ^ (e >>> 14)) >>> 0) / 4294967296; };
}
const rand = rng(27);
const palette = COLORS.map(c => new THREE.Color(c));
function pickColor() {
  let r = rand();
  for (let i = 0; i < palette.length; i++) { r -= COLOR_WEIGHTS[i]; if (r <= 0) return palette[i]; }
  return palette[4];
}

// ---------------------------------------------------------------- path textures (native SVG sampling)
const SAMPLES = 512;
const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.style.cssText = 'position:absolute;width:0;height:0';
svg.append(svgPath);
document.body.append(svg);
const pathTextures = PATHS.map(cfg => {
  svgPath.setAttribute('d', cfg.d);
  const len = svgPath.getTotalLength(), data = new Float32Array(SAMPLES * 4);
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / (SAMPLES - 1), pt = svgPath.getPointAtLength(t * len);
    const z = Math.sin(t * Math.PI * 1.35 + cfg.phase) * cfg.depth * P.pathDepth * Math.sin(t * Math.PI);
    data.set([(pt.x - SVG_ORIGIN[0]) * SVG_SCALE, (SVG_ORIGIN[1] - pt.y) * SVG_SCALE, z * .35, 1], i * 4); // ponytail: z damped .35 so the authored silhouette survives perspective
  }
  const tex = new THREE.DataTexture(data, SAMPLES, 1, THREE.RGBAFormat, THREE.FloatType);
  tex.needsUpdate = true;
  return tex;
});
svg.remove();
// bounding box of the numeral in world units (for fitting)
const BOX = { minX: -110 * SVG_SCALE, maxX: 110 * SVG_SCALE, minY: -110 * SVG_SCALE, maxY: 110 * SVG_SCALE }; // galaxy disc

// ---------------------------------------------------------------- shared GLSL
const COMMON = /* glsl */`
  uniform float uTime, uIntro, uTilt, uDisperse, uPx;
  uniform vec2 uScatterSize, uViewport;
  uniform vec3 uHover;     // ndc x, y, strength
  uniform float uSwirl;    // accumulated orbit angle while hovering
  attribute float seedA, seedB, seedC;
  attribute float starScale, starBrightness, starOpacity, twinklePhase, twinkleRate, background;
  attribute vec3 starColor;
  varying float vBrightness; varying vec3 vColor; varying float vOpacity; varying float vRay;

  // --- verbatim from opening.glsl
  vec3 astraIntroMotion(vec3 position, vec3 scattered, float progress, float seed, float travelSeed) {
    if (progress >= 1.0) return position;
    float start = 0.14 + seed * 0.18;
    float duration = 0.58 + travelSeed * 0.1;
    float local = clamp((progress - start) / duration, 0.0, 1.0);
    float smoothPull = local * local * local * (local * (local * 6.0 - 15.0) + 10.0);
    float pull = mix(smoothPull, sin(smoothPull * 3.14159265359 * 0.5), 0.5);
    float angle = sin(pull * 3.14159265359) * (0.44 + seed * 0.22);
    float c = cos(angle);
    float s = sin(angle);
    vec3 orbiting = vec3(scattered.x * c - scattered.y * s, scattered.x * s + scattered.y * c, scattered.z);
    return mix(orbiting, position, pull);
  }
  float astraParticleRevealProgress(float progress, float seed) {
    float delay = seed * 0.015;
    return smoothstep(delay, 0.14 + delay, progress) * mix(0.2, 1.0, smoothstep(0.2, 1.0, progress));
  }
  // ---
  vec3 tiltSpiral(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c); }

  // Shared tail: scattered field, intro pull, scroll dispersal, reveal, size, repel.
  void finish(vec3 shapePos, float sizeEnv) {
    vec3 scattered = vec3((seedA - 0.5) * uScatterSize.x, (seedB - 0.5) * uScatterSize.y, (seedC - 0.5) * 0.5);
    // scattered/background positions live in camera-facing space; convert the shape position into it
    vec4 shapeWorld = modelMatrix * vec4(tiltSpiral(shapePos, uTilt), 1.0);
    vec3 dest = mix(shapeWorld.xyz, scattered, background);
    // scroll: the numeral disperses into the field; drift keeps it alive
    vec3 field = scattered + vec3(sin(uTime * 0.05 + seedB * 6.28), cos(uTime * 0.04 + seedA * 6.28), 0.0) * 0.12;
    dest = mix(dest, field, uDisperse * (1.0 - background));
    vec3 pos = astraIntroMotion(dest, scattered, mix(uIntro, 1.0, background), seedC, seedB);

    float twinkle = 0.86 + 0.14 * sin(twinklePhase + uTime * ${P.twinkleSpeed.toFixed(2)} * twinkleRate);
    vBrightness = ${P.intensity.toFixed(2)} * starBrightness * twinkle;
    vColor = starColor;
    vRay = smoothstep(1.45, 2.8, starBrightness) * (1.0 - background);

    float reveal = astraParticleRevealProgress(uIntro, seedC);
    reveal = mix(reveal, min(reveal, 0.2), background * (1.0 - uDisperse));
    vOpacity = starOpacity * (0.92 + twinkle * 0.08) * smoothstep(0.0, 0.08, reveal);
    float size = uPx * (0.35 + starScale * sizeEnv * 3.8) * (0.97 + twinkle * 0.03) * sqrt(reveal);

    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
    // Hover whirlpool: orbit the cursor (inner stars faster) + the hero's push; mix by strength so release glides straight back.
    vec2 aspectV = vec2(uViewport.x / uViewport.y, 1.0);
    vec2 rel = (gl_Position.xy / gl_Position.w - uHover.xy) * aspectV;
    float d = length(rel);
    float influence = 1.0 - smoothstep(0.0, ${HOVER.radius.toFixed(3)}, d);
    float ang = influence * influence * uSwirl;
    vec2 orbit = vec2(rel.x * cos(ang) - rel.y * sin(ang), rel.x * sin(ang) + rel.y * cos(ang));
    orbit += rel / max(d, 0.045) * influence * ${HOVER.push.toFixed(3)};
    gl_Position.xy = (uHover.xy + mix(rel, orbit, uHover.z) / aspectV) * gl_Position.w;

    vOpacity *= min(1.0, size / 2.0);
    gl_PointSize = clamp(size, 2.0, 40.0);
  }`;

const STAR_FRAG = /* glsl */`
  varying float vBrightness; varying vec3 vColor; varying float vOpacity; varying float vRay;
  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    float disc = 1.0 - smoothstep(0.08, 1.0, length(p));
    float core = pow(disc, 2.2);
    float h = exp(-abs(p.y) * 28.0) * (1.0 - smoothstep(0.18, 1.0, abs(p.x)));
    float v = exp(-abs(p.x) * 28.0) * (1.0 - smoothstep(0.18, 1.0, abs(p.y)));
    float alpha = max(core, max(h, v) * 0.28 * vRay) * vOpacity;
    if (alpha <= 0.001) discard;
    float whiteCore = core * smoothstep(0.9, 2.8, vBrightness) * 0.82;
    float colorEnergy = 1.0 - min(vColor.r, min(vColor.g, vColor.b));
    gl_FragColor = vec4(mix(vColor, vec3(1.0), whiteCore) * vBrightness * (1.0 + colorEnergy * 0.42), alpha);
  }`;

const material = (extraUniforms: Record<string, THREE.IUniform>, vertexShader: string) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
  uniforms: { ...U, ...extraUniforms }, vertexShader, fragmentShader: STAR_FRAG,
});

function starAttributes(count: number, opts: { strong?: boolean; background?: boolean }) {
  const a: Record<string, number[]> = { orbitProgress: [], across: [], depthOff: [], seedA: [], seedB: [], seedC: [], starScale: [], starBrightness: [], starOpacity: [], twinklePhase: [], twinkleRate: [], background: [], starColor: [] };
  for (let i = 0; i < count; i++) {
    const r = rand();
    const env = Math.sin(Math.PI * r);
    const h = ACROSS * THREE.MathUtils.lerp(.35, 1, env) * (.22 + .78 * rand());
    const hero = !opts.background && rand() < (opts.strong ? .085 : .055) * THREE.MathUtils.lerp(.22, 1, env);
    a.orbitProgress.push(r);
    a.across.push((rand() + rand() - 1) * h);
    a.depthOff.push((rand() + rand() - 1) * h * .65);
    a.seedA.push(rand()); a.seedB.push(rand()); a.seedC.push(rand());
    a.starScale.push((hero ? .85 + 1.25 * rand() : .12 + .68 * Math.pow(rand(), 2.4)) * P.starSize * (opts.background ? .55 : 1));
    a.starBrightness.push((hero ? 2 + 1.5 * rand() : .56 + .78 * rand()) * (opts.strong === false ? .82 : 1) * (opts.background ? .7 : 1));
    a.starOpacity.push(.82 + .16 * rand());
    a.twinklePhase.push(rand() * Math.PI * 2); a.twinkleRate.push(.65 + .7 * rand());
    a.background.push(opts.background ? 1 : 0);
    const c = opts.background ? (rand() < .5 ? palette[0] : palette[4]) : pickColor();
    a.starColor.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  for (const [k, v] of Object.entries(a)) geo.setAttribute(k, new THREE.Float32BufferAttribute(v, k === 'starColor' ? 3 : 1));
  return geo;
}

// ---------------------------------------------------------------- the five streams
PATHS.forEach((cfg, i) => {
  const geo = starAttributes(cfg.strong ? COUNTS.strong : COUNTS.weak, { strong: cfg.strong });
  const mat = material({ uPath: { value: pathTextures[i] }, uOffset: { value: cfg.phase } }, /* glsl */`
    #define SAMPLES ${SAMPLES}.0
    uniform sampler2D uPath;
    uniform float uOffset;
    attribute float orbitProgress, across, depthOff;
    ${COMMON}
    vec3 samplePath(float t) {
      float s = clamp(t, 0.0, 1.0) * (SAMPLES - 1.0), i = floor(s);
      vec3 a = texture2D(uPath, vec2((i + 0.5) / SAMPLES, 0.5)).xyz;
      vec3 b = texture2D(uPath, vec2((min(i + 1.0, SAMPLES - 1.0) + 0.5) / SAMPLES, 0.5)).xyz;
      return mix(a, b, fract(s));
    }
    void main() {
      float layer = clamp(starScale * 0.34 + depthOff * 0.8, 0.0, 1.0);
      float phase = fract(orbitProgress + uOffset * (0.42 + 1.65 * layer));
      float t = phase + ${P.densityFalloff.toFixed(2)} * sin(phase * 6.2831853) / 6.2831853;
      float middle = sin(clamp(t, 0.0, 1.0) * 3.14159265);
      float sizeEnv = mix(1.0, 0.14 + 0.86 * pow(max(middle, 0.0), 0.68), ${P.sizeFalloff.toFixed(2)})
        * smoothstep(0.0, 0.055, t) * (1.0 - smoothstep(0.945, 1.0, t));
      vec3 p = samplePath(t);
      vec3 tangent = normalize(samplePath(t + 0.002) - samplePath(t - 0.002));
      vec3 normal = vec3(-tangent.y, tangent.x, 0.0);
      float wave = uTime * (0.28 + layer * 0.31) + twinklePhase;
      p.xy += (0.04 + layer * 0.05) * middle * vec2(sin(wave + p.y), cos(wave * 0.73 + p.x * 0.6));
      p += normal * across + vec3(0.0, 0.0, depthOff);
      finish(p, sizeEnv);
    }`);
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  spin.add(pts);
  pts.userData.cfg = cfg;
});

// ---------------------------------------------------------------- center cluster + background field
{
  const geo = starAttributes(COUNTS.cluster, { strong: true });
  const pos = geo.getAttribute('position');
  for (let i = 0; i < COUNTS.cluster; i++) {
    const r = Math.sqrt(-2 * Math.log(1 - rand() * .999)) * .2 * P.clusterStrength, a = rand() * Math.PI * 2; // galaxy core: dense so bloom makes the white glow
    pos.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, (rand() - .5) * .3);
  }
  const mat = material({}, /* glsl */`
    ${COMMON}
    void main() {
      float l = length(position.xy) / 0.4;
      float swirl = uTime * 0.12 * (1.2 - min(l, 1.0));
      vec3 p = vec3(position.x * cos(swirl) - position.y * sin(swirl), position.x * sin(swirl) + position.y * cos(swirl), position.z);
      finish(p, 0.65);
    }`);
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  spin.add(pts);
}
{
  const geo = starAttributes(COUNTS.background, { background: true });
  const mat = material({}, /* glsl */`${COMMON} void main() { finish(vec3(0.0), 1.0); }`);
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
}

// ---------------------------------------------------------------- fit + resize
let cssW = 1, cssH = 1;
function resize() {
  cssW = innerWidth; cssH = innerHeight;
  const dpr = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(dpr); renderer.setSize(cssW, cssH, false);
  composer.setPixelRatio(dpr); composer.setSize(cssW, cssH);
  camera.aspect = cssW / cssH; camera.updateProjectionMatrix();
  const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), visW = visH * camera.aspect;
  // poster: numeral fills ~88% of height; on tall screens fit width instead
  const s = Math.min(.66 * visH / (BOX.maxY - BOX.minY), .44 * visW / (BOX.maxX - BOX.minX)); // ponytail: width cap keeps the side labels clear of the disc
  shape.scale.setScalar(s);
  shape.position.set(-(BOX.minX + BOX.maxX) / 2 * s, -(BOX.minY + BOX.maxY) / 2 * s + (cssW < 768 ? visH * .061 : 0), 0);
  U.uScatterSize.value.set(visW * 1.12, visH * 1.12);
  U.uViewport.value.set(cssW, cssH);
  U.uPx.value = dpr * Math.min(cssH / 900, cssW / 700) * .72;
  if (reduced) requestRender();
}
// declared before the first resize(): under reduced motion it schedules a render (TDZ crash in the prototype)
let pending = false;
function requestRender() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; try { frame(); } catch (e) { showStill(); } }); }
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- hover: whole page (text sits above the canvas)
const pointer = { x: 0, y: 0, active: false };
addEventListener('pointermove', (e) => {
  pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = 1 - e.clientY / innerHeight * 2;
  pointer.active = e.pointerType === 'mouse' && !e.buttons;
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let time = 0;
const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt));

function frame() {
  const dt = Math.min(clock.getDelta(), DELTA_CAP);
  if (!reduced) time += dt;
  const u = -converge.getBoundingClientRect().top / innerHeight, s = story(u);
  if (u < RANGE.intro[0] - .2 && !reduced) return;   // hero still covers the screen
  U.uTime.value = time;
  U.uIntro.value = s.intro;

  // after the hold: tilt back + disperse into the field, dim it to 40% behind About / Stack
  U.uTilt.value = s.tilt;
  U.uDisperse.value = s.disperse;
  renderer.domElement.style.opacity = String(s.fieldOpacity);

  const auto = reduced ? 0 : .42 * .25 * Math.sin(time * .22); // ponytail: auto-rotate amplitude scaled down; source pairs it with face-forward easing
  shape.rotation.set(.08, -.06 + auto, -.025);

  const hv = U.uHover.value;
  hv.set(pointer.x, pointer.y, damp(hv.z, pointer.active ? 1 : 0, 14, dt));
  U.uSwirl.value = hv.z > .01 ? U.uSwirl.value + HOVER.swirl * dt : 0;

  composer.render(dt);
}
if (reduced) { addEventListener('scroll', requestRender, { passive: true }); requestRender(); }
else renderer.setAnimationLoop(() => {
  try { frame(); } catch (err) { console.warn('[astra] renderer error, poster fallback:', err); renderer.setAnimationLoop(null); showStill(); }
});
}
