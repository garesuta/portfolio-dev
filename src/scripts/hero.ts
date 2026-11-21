// Beat 1: hero. Two-stream gold/blue field with the sun and blue-star bodies (from the openai hero extraction).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const q = new URLSearchParams(location.search);
const scene$ = document.querySelector<HTMLElement>('.scene')!;
const type$ = document.querySelector<HTMLElement>('.type')!;

function showStill() { scene$.querySelector('.field')?.remove(); scene$.dataset.still = 'true'; } // plain dark field, name stays visible

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (q.has('still') || reduced) showStill();
else {
  try { boot(); } catch (err) { console.warn('[hero] falling back to still:', err); showStill(); }
}

function boot() {
// ---------------------------------------------------------------- constants (layout.json)
const REF_W = 1358, REF_H = 764, WORLD_H = 10.9, CX = 679, CY = 382;
const W = (x: number, y: number, z = 0) => new THREE.Vector3((x - CX) * WORLD_H / REF_H, (CY - y) * WORLD_H / REF_H, z);
const SUN = W(859, 251), STAR = W(472, 530);
const SUN_R = 26 * WORLD_H / REF_H;
const GOLD = '#FFC77D', BLUE = '#94CCF4';
const PALETTE: Record<Color, string[]> = {
  gold: [GOLD, '#FFE5BD', '#E8AC62', '#FFF2D9', '#FFFAF0'],
  blue: [BLUE, '#D7EDFF', '#639EC4', '#B8E0FA', '#F2FAFF'],
};
type Color = 'gold' | 'blue';
interface StreamCfg { color: Color; pts: [number, number][]; phase: number; speed: number; strong: boolean; endWidth?: number; followup?: number }
const PATHS: StreamCfg[] = [
  { color: 'gold', pts: [[-110,420],[80,191],[303,78],[523,98],[682,103],[800,166],[859,251]], phase: .16, speed: .025, strong: true },
  { color: 'gold', pts: [[-96,430],[91,202],[311,90],[530,110],[688,115],[806,178],[859,251]], phase: .72, speed: -.018, strong: false },
  { color: 'blue', pts: [[1468,350],[1273,557],[1050,690],[830,666],[670,662],[544,619],[472,530]], phase: .38, speed: .021, strong: true, endWidth: .22, followup: .6 },
  { color: 'blue', pts: [[1454,340],[1262,546],[1042,678],[823,654],[664,650],[538,607],[472,530]], phase: .58, speed: -.016, strong: false, endWidth: .22, followup: .6 },
];
const STARS = { size: 1.65, densityFalloff: .08, sizeFalloff: .12, twinkleSpeed: .45 };
const TRAIL_DISPERSION = .56, MIN_POINT = 2, BLOOM = .4;
const INTRO = { sun: [.6, 1.65] as const, blue: 1.77, trail: 2.6, title: 4.37, rate: 25 / 12, cap: .1 };
const ACROSS = .09; // ponytail: stream base width, tuned against hero-still (source value lives in shared renderer)

// ---------------------------------------------------------------- renderer
const field = document.createElement('div');
field.className = 'field';
const handles = document.createElement('div');
handles.className = 'handles';
handles.innerHTML = '<span class="sunHandle"></span><span class="starHandle"></span>';
field.append(handles);
scene$.insertBefore(field, type$);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NoToneMapping;
field.prepend(renderer.domElement);
renderer.domElement.addEventListener('webglcontextlost', showStill);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#03101A'); // not setClearColor: that bakes sRGB values into the composer's linear target
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100);
camera.position.z = 10;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), BLOOM, .72, .62);
if (bloom.strength > 0) composer.addPass(bloom);
composer.addPass(new OutputPass());

// shared per-frame values
const U = {
  time: { value: 0 },
  hover: { value: new THREE.Vector3() },   // ndc x, y, strength
  aspect: { value: 1 },
  px: { value: 1 },                        // device px per reference px of the contained frame
};

function rng(seed: number) {
  let t = seed >>> 0;
  return () => { let e = (t += 0x6d2b79f5); e = Math.imul(e ^ (e >>> 15), 1 | e); e ^= e + Math.imul(e ^ (e >>> 7), 61 | e); return ((e ^ (e >>> 14)) >>> 0) / 4294967296; };
}
const smoothstep = (x: number, a: number, b: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const smootherstep = (x: number, a: number, b: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * t * (t * (t * 6 - 15) + 10); };

const HOVER_GLSL = /* glsl */`
  uniform vec3 uHover;
  uniform float uAspect;
  void hoverPush(inout vec4 clip) {
    vec2 aspect = vec2(uAspect, 1.0);
    vec2 away = (clip.xy / clip.w - uHover.xy) * aspect;
    float d = length(away);
    float influence = 1.0 - smoothstep(0.0, 0.30, d);
    clip.xy += clip.w * away / max(d, 0.045) / aspect * influence * uHover.z * 0.045;
  }`;

// Shared by stars and dust: guide bend + trail width.
const STREAM_GLSL = /* glsl */`
  uniform vec4 uGuide;
  uniform float uEndWidth;
  // Cubic Bézier displacement anchored upstream: the stream end follows the dragged body.
  vec2 streamOffset(float t) { return t * t * (t * uGuide.xy + 3.0 * (1.0 - t) * uGuide.zw); }
  float trailSpread(float t) {
    float taper = mix(1.0, uEndWidth, smoothstep(0.94, 1.0, t));
    return taper * (1.0 + ${TRAIL_DISPERSION.toFixed(2)} * 18.0 * pow(1.0 - clamp(t, 0.0, 1.0), 1.35));
  }`;

const STAR_FRAG = /* glsl */`
  varying float vBrightness;
  varying vec3 vColor;
  varying float vOpacity;
  varying float vRay;
  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    float disc = 1.0 - smoothstep(0.08, 1.0, length(p));
    float core = pow(disc, 2.2);
    float h = exp(-abs(p.y) * 28.0) * (1.0 - smoothstep(0.18, 1.0, abs(p.x)));
    float v = exp(-abs(p.x) * 28.0) * (1.0 - smoothstep(0.18, 1.0, abs(p.y)));
    float rays = max(h, v) * 0.28 * vRay;
    float alpha = max(core, rays) * vOpacity;
    if (alpha <= 0.001) discard;
    float whiteCore = core * smoothstep(0.9, 2.8, vBrightness) * 0.82;
    float colorEnergy = 1.0 - min(vColor.r, min(vColor.g, vColor.b));
    gl_FragColor = vec4(mix(vColor, vec3(1.0), whiteCore) * vBrightness * (1.0 + colorEnergy * 0.42), alpha);
  }`;

// ---------------------------------------------------------------- guides (drag springs, verbatim model)
const guide = () => ({ held: false, target: new THREE.Vector2(), tip: new THREE.Vector2(), prev: new THREE.Vector2(), tipV: new THREE.Vector2(), bend: new THREE.Vector2(), bendV: new THREE.Vector2() });
type Guide = ReturnType<typeof guide>;
const guides: Record<Color, Guide> = { gold: guide(), blue: guide() };
function stepGuide(g: Guide, dt: number) {
  g.prev.copy(g.tip);
  const free = !g.held;
  if (g.tip.distanceToSquared(g.target) + g.bend.distanceToSquared(g.target) + g.tipV.lengthSq() + g.bendV.lengthSq() < 1e-7) {
    g.tip.copy(g.target); g.bend.copy(g.target); g.tipV.set(0, 0); g.bendV.set(0, 0); return;
  }
  const d = Math.min(dt, .05), n = Math.max(1, Math.ceil(120 * d)), h = d / n * (free ? .18 : 1), k = free ? 225 : 420;
  for (let i = 0; i < n; i++) for (const a of ['x', 'y'] as const) {
    g.tipV[a] += ((g.target[a] - g.tip[a]) * k - 30 * g.tipV[a]) * h;
    g.tip[a] += g.tipV[a] * h;
    g.bendV[a] += ((g.tip[a] - g.bend[a]) * 80 - 10 * g.bendV[a]) * h;
    g.bend[a] += g.bendV[a] * h;
  }
}

// ---------------------------------------------------------------- path streams
const streams = PATHS.map((cfg, idx) => {
  const curve = new THREE.CurvePath<THREE.Vector3>();
  const v = cfg.pts.map(([x, y]) => W(x, y));
  curve.add(new THREE.CubicBezierCurve3(v[0], v[1], v[2], v[3]));
  curve.add(new THREE.CubicBezierCurve3(v[3], v[4], v[5], v[6]));
  const N = 512, tex = new Float32Array(N * 4), p = new THREE.Vector3();
  for (let i = 0; i < N; i++) { curve.getPointAt(i / (N - 1), p); tex.set([p.x, p.y, p.z, 1], i * 4); }
  const pathTex = new THREE.DataTexture(tex, N, 1, THREE.RGBAFormat, THREE.FloatType);
  pathTex.needsUpdate = true;

  const rand = rng(6281 + idx * 977);
  const initial = cfg.strong ? 900 : 650;
  const count = Math.round(initial * (1 + (cfg.followup ?? 0)));
  const A = (n: number) => new Float32Array(count * n);
  const attr = { orbitProgress: A(1), across: A(1), depthOff: A(1), starScale: A(1), starBrightness: A(1), starOpacity: A(1), twinklePhase: A(1), twinkleRate: A(1), followup: A(1), starColor: A(3) };
  const pal = PALETTE[cfg.color].map(c => new THREE.Color(c));
  const heroBase = cfg.strong ? .085 : .055;
  let best = -1, bestI = 0;
  for (let i = 0; i < count; i++) {
    const r = rand();
    const l = r + STARS.densityFalloff * Math.sin(r * Math.PI * 2) / (Math.PI * 2);
    const env = THREE.MathUtils.lerp(Math.sin(Math.PI * l), 1, smoothstep(l, .5, 1));
    const isFollow = i >= initial;
    const h = ACROSS * (isFollow ? 1.9 : 1) * THREE.MathUtils.lerp(.3, 1, env) * (.22 + .78 * rand());
    let across = (rand() + rand() - 1) * h;
    const depth = (rand() + rand() - 1) * h * .65;
    const hero = rand() < THREE.MathUtils.lerp(heroBase * .22, heroBase, env);
    if (hero && cfg.followup) across = THREE.MathUtils.clamp(across, -.09, .09);
    const scale = (hero ? .85 + 1.25 * rand() : .12 + .68 * Math.pow(rand(), 2.4)) * STARS.size;
    const bright = (hero ? 2 + 1.5 * rand() : .56 + .78 * rand()) * (cfg.strong ? 1 : .82);
    const cr = rand();
    const c = pal[cr < .36 ? 0 : cr < .52 ? 1 : cr < .64 ? 2 : cr < .74 ? 3 : 4];
    attr.orbitProgress[i] = r; attr.across[i] = across; attr.depthOff[i] = depth;
    attr.starScale[i] = scale; attr.starBrightness[i] = bright; attr.starOpacity[i] = .82 + .16 * rand();
    attr.twinklePhase[i] = rand() * Math.PI * 2; attr.twinkleRate[i] = .65 + .7 * rand();
    attr.followup[i] = isFollow ? 1 : 0; attr.starColor.set([c.r, c.g, c.b], i * 3);
    if (!isFollow && scale > best) { best = scale; bestI = i; }
  }
  // one guaranteed flare per stream
  attr.starScale[bestI] = Math.max(attr.starScale[bestI], (cfg.strong ? 2.2 : 2.05) * STARS.size);
  attr.starBrightness[bestI] = Math.max(attr.starBrightness[bestI], cfg.strong ? 3.35 : 2.85);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  for (const [k, a] of Object.entries(attr)) geo.setAttribute(k, new THREE.BufferAttribute(a, k === 'starColor' ? 3 : 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: {
      uPath: { value: pathTex }, uGuide: { value: new THREE.Vector4() },
      uOffset: { value: 0 }, uDir: { value: Math.sign(cfg.speed) }, uFade: { value: 0 }, uFollowupReveal: { value: 1 },
      uEndWidth: { value: cfg.endWidth ?? 1 }, uTime: U.time, uHover: U.hover, uAspect: U.aspect, uPx: U.px,
    },
    vertexShader: /* glsl */`
      #define SAMPLES 512.0
      attribute float orbitProgress, across, depthOff, starScale, starBrightness, starOpacity, twinklePhase, twinkleRate, followup;
      attribute vec3 starColor;
      uniform sampler2D uPath;
      uniform float uOffset, uDir, uFade, uFollowupReveal, uTime, uPx;
      varying float vBrightness; varying vec3 vColor; varying float vOpacity; varying float vRay;
      ${HOVER_GLSL}
      ${STREAM_GLSL}
      vec3 samplePath(float t) {
        float s = clamp(t, 0.0, 1.0) * (SAMPLES - 1.0);
        float i = floor(s);
        vec3 a = texture2D(uPath, vec2((i + 0.5) / SAMPLES, 0.5)).xyz;
        vec3 b = texture2D(uPath, vec2((min(i + 1.0, SAMPLES - 1.0) + 0.5) / SAMPLES, 0.5)).xyz;
        return mix(a, b, fract(s));
      }
      void main() {
        float layer = clamp(starScale * 0.34 + depthOff * 0.8, 0.0, 1.0);
        float cruise = 0.42 + 1.65 * layer;              // nearer, brighter stars cruise faster
        float phase = fract(orbitProgress + uOffset * cruise);
        float t = phase + ${STARS.densityFalloff.toFixed(2)} * sin(phase * 6.2831853) / 6.2831853;

        float middle = mix(sin(clamp(t, 0.0, 1.0) * 3.14159265), 1.0, smoothstep(0.5, 1.0, t));
        float sizeEnv = mix(1.0, 0.14 + 0.86 * pow(max(middle, 0.0), 0.68), ${STARS.sizeFalloff.toFixed(2)});
        float endVis = smoothstep(0.0, 0.055, t);

        vec3 pos = samplePath(t);
        pos.xy += streamOffset(t);
        float belly = sin(t * 3.14159265);
        float strain = min(length(uGuide.xy - uGuide.zw), 4.0);
        float drift = (0.18 + layer * 0.38 + strain * 0.35) * belly;
        float wave = uTime * (0.28 + layer * 0.31) + twinklePhase;
        pos.xy += drift * vec2(sin(wave + pos.y), cos(wave * 0.73 + pos.x * 0.6)) * 0.35;
        vec3 tangent = normalize(samplePath(t + 0.002) - samplePath(t - 0.002));
        vec3 normal = vec3(-tangent.y, tangent.x, 0.0);
        float spread = trailSpread(t);
        pos += normal * across * spread + vec3(0.0, 0.0, depthOff * spread);
        pos.xy += normal.xy * across * strain * belly;

        float twinkle = 0.86 + 0.14 * sin(twinklePhase + uTime * ${STARS.twinkleSpeed.toFixed(2)} * twinkleRate);
        float brightW = smoothstep(1.35, 1.65, starBrightness);
        vBrightness = starBrightness * twinkle;
        vColor = starColor;

        // Spatial reveal: each star fades in by distance from source plus its own seed.
        float fromSource = uDir > 0.0 ? orbitProgress : 1.0 - orbitProgress;
        float seed = fract(twinklePhase / 6.2831853);
        float fadeStart = 0.54 * fromSource + 0.2 * seed;
        float follow = followup > 0.5 ? smoothstep(0.2 * seed, 0.8 + 0.2 * seed, uFollowupReveal) : 1.0;
        vOpacity = follow * starOpacity * smoothstep(fadeStart, fadeStart + 0.26, uFade) * endVis * (0.92 + twinkle * 0.08);
        vRay = smoothstep(1.45, 2.8, starBrightness);

        float size = uPx * (0.35 + starScale * sizeEnv * endVis * 3.8) * (0.97 + twinkle * 0.03);
        vOpacity *= min(1.0, size / ${MIN_POINT.toFixed(1)});
        gl_PointSize = max(size, ${MIN_POINT.toFixed(1)});
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        hoverPush(gl_Position);
      }`,
    fragmentShader: STAR_FRAG,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 2;
  scene.add(points);

  // Orbital dust: faint white pinpoints fixed along the path, drifting along the tangent.
  const dRand = rng(0x9e3779b9 ^ (idx + 1) * 0x85ebca6b);
  const dn = Math.round((cfg.strong ? 150 : 90) * 1.2);
  const dPos: number[] = [], dOff: number[] = [], dTan: number[] = [], dProg: number[] = [], dPhase: number[] = [], dOp: number[] = [], dScale: number[] = [];
  const P = new THREE.Vector3(), T = new THREE.Vector3();
  for (let i = 0; i < dn; i++) {
    const t = dRand() < .5 ? (dRand() + dRand() + dRand()) / 3 : (i + .92 * dRand()) / dn;
    const env = THREE.MathUtils.lerp(Math.sin(Math.PI * t), 1, smoothstep(t, .5, 1));
    curve.getPointAt(t, P); curve.getTangentAt(t, T).normalize();
    const tight = dRand() < .68, w = (tight ? .03 : .3) * THREE.MathUtils.lerp(1, .18 + .82 * Math.pow(env, .68), 1);
    const a = (dRand() + dRand() - 1) * w, z = (dRand() + dRand() - 1) * w * .7;
    dOff.push(-T.y * a, T.x * a, z); dPos.push(P.x - T.y * a, P.y + T.x * a, P.z + z); dTan.push(T.x, T.y, T.z);
    dProg.push(t); dPhase.push(dRand());
    dOp.push(smoothstep(t, 0, .07) * (tight ? 1 : .72) * (.38 + .58 * dRand()));
    dScale.push(dRand() * (tight ? 1 : .72));
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.Float32BufferAttribute(dPos, 3));
  for (const [k, a, n] of [['trailOffset', dOff, 3], ['driftTangent', dTan, 3], ['progress', dProg, 1], ['driftPhase', dPhase, 1], ['dustOpacity', dOp, 1], ['dustScale', dScale, 1]] as const)
    dGeo.setAttribute(k, new THREE.Float32BufferAttribute(a, n));
  const dust = new THREE.Points(dGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: mat.uniforms, // same guide / fade / time uniforms as the stars
    vertexShader: /* glsl */`
      attribute vec3 trailOffset, driftTangent;
      attribute float progress, driftPhase, dustOpacity, dustScale;
      uniform float uDir, uFade, uTime, uPx;
      varying float vBrightness; varying vec3 vColor; varying float vOpacity; varying float vRay;
      ${HOVER_GLSL}
      ${STREAM_GLSL}
      void main() {
        float cycle = fract(driftPhase + uTime * 0.2);
        vec3 pos = position + trailOffset * (trailSpread(progress) - 1.0) + driftTangent * (cycle - 0.5) * 0.35 * uDir;
        pos.xy += streamOffset(progress);
        pos.xy += trailOffset.xy * min(length(uGuide.xy - uGuide.zw), 4.0) * sin(progress * 3.14159265);
        float fromSource = uDir > 0.0 ? progress : 1.0 - progress;
        float fadeStart = 0.54 * fromSource + 0.2 * driftPhase;
        vOpacity = dustOpacity * smoothstep(fadeStart, fadeStart + 0.26, uFade)
          * smoothstep(0.0, 0.1, cycle) * (1.0 - smoothstep(0.9, 1.0, cycle));
        vBrightness = 2.0 * 0.3;
        vColor = vec3(1.0);
        vRay = 0.0;
        float size = uPx * (1.0 + dustScale * 1.35);
        vOpacity *= min(1.0, size / ${MIN_POINT.toFixed(1)});
        gl_PointSize = max(size, ${MIN_POINT.toFixed(1)});
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        hoverPush(gl_Position);
      }`,
    fragmentShader: STAR_FRAG,
  }));
  dust.frustumCulled = false;
  dust.renderOrder = 2;
  scene.add(dust);
  return { cfg, mat };
});

// ---------------------------------------------------------------- background sky + blue star
const sky = (() => {
  const rand = rng(1664525);
  const pos: number[] = [], col: number[] = [], size: number[] = [], bright: number[] = [];
  const blue = new THREE.Color(BLUE), cream = new THREE.Color('#FFF2D9');
  const halfW = REF_W * 1.4 / 2, halfH = REF_H * 1.4 / 2; // overscan so other aspect ratios stay filled
  for (let i = 0; i < 640; i++) {
    const v = W(CX + (rand() * 2 - 1) * halfW, CY + (rand() * 2 - 1) * halfH, -2);
    pos.push(v.x, v.y, v.z);
    const c = rand() < .8 ? blue : cream; col.push(c.r, c.g, c.b);
    size.push(1.0 + 2.6 * Math.pow(rand(), 2)); bright.push(.25 + .75 * rand());
  }
  // the blue star itself: big flare point, offset by the blue guide in-shader
  pos.push(STAR.x, STAR.y, .5); col.push(blue.r, blue.g, blue.b); size.push(28); bright.push(3.8);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('starSize', new THREE.Float32BufferAttribute(size, 1));
  geo.setAttribute('brightness', new THREE.Float32BufferAttribute(bright, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, vertexColors: true, toneMapped: false,
    uniforms: { uGlint: { value: 0 }, uBlueTip: { value: new THREE.Vector2() }, uSpread: { value: 0 }, uTime: U.time, uHover: U.hover, uAspect: U.aspect, uPx: U.px },
    vertexShader: /* glsl */`
      attribute float starSize, brightness;
      uniform float uGlint, uSpread, uTime, uPx;
      uniform vec2 uBlueTip;
      varying float vBrightness; varying vec3 vColor; varying float vOpacity; varying float vRay;
      ${HOVER_GLSL}
      void main() {
        vRay = step(20.0, starSize);
        float seed = fract(brightness * 23.7 + position.x * 3.1);
        vBrightness = brightness * mix(0.75 + 0.25 * sin(seed * 40.0 + uTime * 0.45 * (0.6 + seed)), uGlint, vRay);
        vColor = color;
        vOpacity = vRay > 0.5 ? smoothstep(0.0, 0.2, uGlint) : 0.8;
        vec3 p = position;
        if (vRay > 0.5) p.xy += uBlueTip;
        else p.xy *= 1.0 + uSpread * (0.05 + brightness * 0.08);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        if (vRay < 0.5) hoverPush(gl_Position);
        gl_PointSize = max(1.0, starSize * uPx);
      }`,
    fragmentShader: STAR_FRAG,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 1;
  scene.add(pts);
  return mat;
})();

// ---------------------------------------------------------------- sun (procedural surface + corona)
const SUN_RIM = /* glsl */`
  vec3 sunRim(vec3 color, float radius, float bloomScale) {
    float edge = radius - 1.0;
    float rim = exp(-pow(edge / 0.045, 2.0)) + exp(-pow(edge / 0.11, 2.0)) * 0.22;
    vec3 warmGold = vec3(color.r, max(color.g, color.r * 0.7), color.b);
    return mix(warmGold, vec3(1.0), 0.12) * rim * 1.25 * bloomScale;
  }`;
const sunU = {
  uReveal: { value: 0 }, uWhiteHeat: { value: .12 }, uColor: { value: new THREE.Color(GOLD) },
  uBloomScale: { value: .5 / .7 }, uDrift: { value: new THREE.Vector3() },
};
const sunGroup = new THREE.Group();
scene.add(sunGroup);
const sunAnchor = new THREE.Group();
sunAnchor.position.set(SUN.x, SUN.y, .6);
sunGroup.add(sunAnchor);

const sunSurface = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 48), new THREE.ShaderMaterial({
  uniforms: sunU, toneMapped: false,
  vertexShader: /* glsl */`
    varying vec3 vNormal; varying vec3 vLocal;
    void main() { vNormal = normalize(normalMatrix * normal); vLocal = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uReveal, uWhiteHeat, uBloomScale; uniform vec3 uColor, uDrift;
    varying vec3 vNormal; varying vec3 vLocal;
    ${SUN_RIM}
    float hash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
    float noise(vec3 p) {
      vec3 c = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(c), hash(c + vec3(1,0,0)), f.x), mix(hash(c + vec3(0,1,0)), hash(c + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(c + vec3(0,0,1)), hash(c + vec3(1,0,1)), f.x), mix(hash(c + vec3(0,1,1)), hash(c + vec3(1,1,1)), f.x), f.y), f.z);
    }
    void main() {
      vec3 n = normalize(vNormal); float facing = max(n.z, 0.0); vec3 s = normalize(vLocal);
      float broad = noise(s * 5.0 + vec3(7.1, 2.8, 4.3) + uDrift);
      float cells = noise(s * 15.0 + broad * 2.2 + uDrift.yzx * 2.0);
      float grain = mix(0.5, noise(s * 42.0 + uDrift.zxy * 4.0), 1.0 - smoothstep(0.5, 1.5, length(fwidth(s * 42.0))));
      float heat = mix(0.5, smoothstep(0.15, 0.85, broad * 0.45 + cells * 0.4 + grain * 0.15), 0.45); // source .18: lost to clipping without its tone mapping
      float energy = 1.0 - min(uColor.r, min(uColor.g, uColor.b));
      vec3 deep = uColor * vec3(1.0, mix(1.0, 0.62, energy), 1.0);
      vec3 gold = vec3(uColor.r, max(uColor.g, uColor.r * 0.48), uColor.b);
      vec3 hot = vec3(uColor.r, max(uColor.g, uColor.r * 0.92), uColor.b);
      vec3 col = mix(mix(deep, gold, smoothstep(0.12, 0.58, heat)), hot, smoothstep(0.5, 0.88, heat));
      float round_ = mix(0.5, 1.0, sqrt(facing)) * (0.9 + 0.1 * dot(n, normalize(vec3(-0.4, 0.5, 1.0))));
      vec3 e = col * mix(1.1, 2.2, heat) * round_ * (1.0 + energy * 0.15);
      e = mix(uColor * 0.335 * 4.0 * uBloomScale, e, smoothstep(0.0, 0.4, facing));
      float limb = sqrt(max(1.0 - facing * facing, 0.0));
      e += sunRim(uColor, limb, uBloomScale);
      e = mix(e, vec3(2.2) * mix(0.65, 1.0, sqrt(facing)) + sunRim(vec3(1.0), limb, uBloomScale), uWhiteHeat);
      e *= mix(0.78, 1.0, smoothstep(0.0, 0.75, facing));
      gl_FragColor = vec4(e * 0.62 * uReveal, 1.0); // ponytail: 0.62 keeps mottling below clip; source relies on its own tone mapping
    }`,
}));
sunSurface.renderOrder = 5; // drawn after the stars, opaque: occludes them
sunAnchor.add(sunSurface);

const corona = new THREE.Mesh(new THREE.PlaneGeometry(14 * SUN_R, 14 * SUN_R), new THREE.ShaderMaterial({
  uniforms: sunU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
  vertexShader: /* glsl */`varying vec2 vPoint; void main() { vPoint = (uv - 0.5) * 14.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uReveal, uWhiteHeat, uBloomScale; uniform vec3 uColor; varying vec2 vPoint;
    ${SUN_RIM}
    void main() {
      float r = length(vPoint);
      if (r < 0.97) discard;                       // surface already drawn
      float outside = max(r - 1.0, 0.0);
      float halo = (exp(-outside * 4.8) * 0.28 + exp(-outside * 1.15) * 0.055) * (1.0 - smoothstep(4.5, 7.0, r));
      vec3 glow = mix(uColor, vec3(1.0), uWhiteHeat);
      gl_FragColor = vec4((glow * halo * 4.0 * uBloomScale + sunRim(glow, r, uBloomScale)) * uReveal, 1.0);
    }`,
}));
corona.renderOrder = 6;
sunAnchor.add(corona);

// ---------------------------------------------------------------- body hover lights + blue-star rays
function bodyLight(parent: THREE.Object3D, at: THREE.Vector3, radius: number, color: string, star: boolean, z: number) {
  const u = { uBodyHover: { value: new THREE.Vector3() }, uTint: { value: new THREE.Color(color) } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * radius, 2 * radius), new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vPoint; void main() { vPoint = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      varying vec2 vPoint; uniform vec3 uBodyHover, uTint;
      void main() {
        ${star ? `
        vec2 p = abs(vPoint);
        float along = max(p.x, p.y), across = min(p.x, p.y);
        float taper = 1.0 - smoothstep(0.0, 0.94, along);
        float width = max(0.012 + 0.05 * taper, fwidth(across) * 0.65);
        float ray = exp(-across / width) * taper;
        float facing = clamp(dot(vPoint / max(length(vPoint), 0.001), uBodyHover.xy) * 1.6, -1.0, 1.0);
        float light = ray * (0.40 + 0.23 * facing);` : `
        vec2 o = vPoint - uBodyHover.xy * 0.55;
        float light = 0.28 * exp(-7.0 * dot(o, o)) * (1.0 - smoothstep(0.7, 1.0, length(vPoint)));`}
        gl_FragColor = vec4(uTint, light * uBodyHover.z);
      }`,
  }));
  m.position.set(at.x, at.y, z);
  m.renderOrder = 7;
  parent.add(m);
  return { mesh: m, u, radius };
}
const blueGroup = new THREE.Group();
scene.add(blueGroup);
const lights = {
  gold: { ...bodyLight(sunGroup, SUN, .86, GOLD, false, 1.1), start: INTRO.sun[0] },
  blue: { ...bodyLight(blueGroup, STAR, .56, BLUE, true, 1.1), start: INTRO.blue },
};

// ponytail: stands in for the source's starburst lens-flare pass (long horizontal streak on the blue star)
const blueRays = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.ShaderMaterial({
  uniforms: { uGlint: { value: 0 }, uTint: { value: new THREE.Color(BLUE) } },
  transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
  vertexShader: `varying vec2 vPoint; void main() { vPoint = (uv - 0.5) * 9.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    varying vec2 vPoint; uniform float uGlint; uniform vec3 uTint;
    void main() {
      vec2 p = abs(vPoint);
      float h = exp(-p.y * 95.0) * exp(-p.x * 0.85) + exp(-p.y * 12.0) * exp(-p.x * 1.0) * 0.24;
      float v = (exp(-p.x * 95.0) * exp(-p.y * 1.3) + exp(-p.x * 12.0) * exp(-p.y * 1.5) * 0.24) * 0.6;
      float rays = (h + v) * (1.0 - smoothstep(2.8, 4.4, max(p.x, p.y)));
      gl_FragColor = vec4(mix(uTint, vec3(1.0), 0.3) * rays * 2.2 * uGlint, 1.0);
    }`,
}));
blueRays.position.set(STAR.x, STAR.y, .6);
blueRays.renderOrder = 4;
blueGroup.add(blueRays);

// ---------------------------------------------------------------- sizing (contain the 1358×764 frame)
let frameW = REF_W, pxPerWorld = 1, cssW = 1, cssH = 1;
function resize() {
  const r = field.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(cssW, cssH, false);
  composer.setPixelRatio(dpr);
  composer.setSize(cssW, cssH);
  frameW = Math.min(cssW, REF_W * cssH / REF_H);
  pxPerWorld = REF_H * frameW / (REF_W * WORLD_H);
  camera.left = -cssW / 2 / pxPerWorld; camera.right = cssW / 2 / pxPerWorld;
  camera.top = cssH / 2 / pxPerWorld; camera.bottom = -cssH / 2 / pxPerWorld;
  camera.updateProjectionMatrix();
  U.aspect.value = cssW / cssH;
  U.px.value = frameW / REF_W * dpr;
}
new ResizeObserver(resize).observe(field);
resize();

// ---------------------------------------------------------------- pointer: hover + drag
const pointer = { x: 0, y: 0, active: false };
let drag: { id: number; color: Color; x: number; y: number } | null = null;
field.addEventListener('pointermove', (e) => {
  const r = field.getBoundingClientRect();
  if (!drag) { pointer.x = (e.clientX - r.left) / r.width * 2 - 1; pointer.y = 1 - (e.clientY - r.top) / r.height * 2; pointer.active = e.pointerType === 'mouse' && !e.buttons; return; }
  if (e.pointerId !== drag.id || !guides[drag.color].held) return;
  const hr = handles.getBoundingClientRect(), o = WORLD_H / hr.height;
  const cx = Math.min(r.right, Math.max(r.left, e.clientX)), cy = Math.min(r.bottom, Math.max(r.top, e.clientY));
  guides[drag.color].target.set((cx - drag.x) * o, (drag.y - cy) * o);
});
field.addEventListener('pointerleave', () => { pointer.active = false; });
const release = (e: PointerEvent) => {
  if (!drag || e.pointerId !== drag.id) return;
  const g = guides[drag.color];
  if (g.held) { g.held = false; g.target.set(0, 0); }
  drag = null;
};
for (const [sel, color] of [['.sunHandle', 'gold'], ['.starHandle', 'blue']] as const) {
  const el = handles.querySelector<HTMLElement>(sel)!;
  el.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0 || drag) return;
    const g = guides[color], o = WORLD_H / handles.getBoundingClientRect().height;
    drag = { id: e.pointerId, color, x: e.clientX - g.tip.x / o, y: e.clientY + g.tip.y / o };
    g.tipV.multiplyScalar(.18); g.bendV.multiplyScalar(.18); g.held = true; g.target.copy(g.tip);
    el.setPointerCapture(e.pointerId);
    pointer.active = false;
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) el.addEventListener(ev, release);
}

// pause while off-screen (the converge canvas takes over)
let heroHidden = false;
new IntersectionObserver(([e]) => { heroHidden = !e.isIntersecting; }).observe(field);

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
let elapsed = 0, time = 0, frames = 0, revealed = false;
const damp = (a: number, b: number, l: number, dt: number) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-l * dt));

renderer.setAnimationLoop(() => {
  try {
    const dt = clock.getDelta();
    if (heroHidden) return;
    time += Math.min(dt, .1);
    elapsed += INTRO.rate * Math.min(dt, INTRO.cap);
    const p = THREE.MathUtils.clamp(scrollY / Math.max(innerHeight, 1), 0, 1);
    const ease = p * (2 - p);
    U.time.value = time;

    // guides → bodies, handles, stream ends
    for (const color of ['gold', 'blue'] as const) {
      const g = guides[color];
      stepGuide(g, dt);
      (color === 'gold' ? sunGroup : blueGroup).position.set(g.tip.x, g.tip.y, 0);
      handles.style.setProperty(`--${color}-x`, `${g.tip.x * pxPerWorld}px`);
      handles.style.setProperty(`--${color}-y`, `${-g.tip.y * pxPerWorld}px`);
    }
    sky.uniforms.uBlueTip.value.copy(guides.blue.tip);

    // intro
    const sunReveal = smootherstep(elapsed, ...INTRO.sun);
    const glint = smootherstep(elapsed - INTRO.blue, 0, 1.05);
    sunU.uReveal.value = sunReveal;
    sunU.uDrift.value.set(.12, .072, -.096).multiplyScalar(time * .25);
    sky.uniforms.uGlint.value = glint;
    sky.uniforms.uSpread.value = ease;
    blueRays.material.uniforms.uGlint.value = glint;
    for (const s of streams) {
      const u = s.mat.uniforms, gold = s.cfg.color === 'gold';
      const g = guides[s.cfg.color];
      u.uGuide.value.set(g.tip.x, g.tip.y, g.bend.x, g.bend.y);
      u.uOffset.value = s.cfg.phase + (time + 12 * ease) * s.cfg.speed;
      u.uFade.value = THREE.MathUtils.clamp((elapsed - (gold ? INTRO.sun[0] : INTRO.blue)) / INTRO.trail, 0, 1);
      if (!gold) u.uFollowupReveal.value = THREE.MathUtils.clamp((elapsed - INTRO.blue - INTRO.trail) / INTRO.trail, 0, 1);
    }

    // hover
    const hv = U.hover.value;
    hv.set(pointer.x, pointer.y, damp(hv.z, pointer.active ? 1 : 0, 14, dt));
    for (const L of Object.values(lights)) {
      const bh = L.u.uBodyHover.value, k = 1 - Math.exp(-14 * dt);
      let target = 0;
      if (pointer.active) {
        L.mesh.getWorldPosition(tmp).project(camera);
        const span = 2 * L.radius * pxPerWorld;
        const dx = (pointer.x - tmp.x) * cssW / span, dy = (pointer.y - tmp.y) * cssH / span;
        target = 1 - smoothstep(Math.hypot(dx, dy), .35, 1);
        if (target > 0) { bh.x = THREE.MathUtils.lerp(bh.x, dx, k); bh.y = THREE.MathUtils.lerp(bh.y, dy, k); }
      }
      bh.z = THREE.MathUtils.lerp(bh.z, target * smootherstep(elapsed, L.start, L.start + 1.05), k);
    }

    composer.render(dt);
    if (++frames === 2) { field.dataset.ready = 'true'; }
    if (!revealed && elapsed >= INTRO.title) { revealed = true; field.dataset.starsRevealed = 'true'; handles.dataset.ready = 'true'; }
  } catch (err) {
    console.warn('[hero] renderer error, falling back to still:', err);
    renderer.setAnimationLoop(null);
    showStill();
  }
});
}
