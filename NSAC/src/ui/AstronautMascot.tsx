import { useEffect, useRef } from 'react';

export const ASTRONAUT_MASCOT_ENABLED = true;
const MASCOT_SCALE = 1.28;
const VISOR_DARK = '#4a4f57';
const GREY_MID = '#9aa0a8';
const GREY_LIGHT = '#d9dce1';
const GOLD = '#e7b653';
const AVOID_RADIUS = 150;

type Edge = 'left' | 'right' | 'top' | 'bottom';
type Curve = 'incline' | 'wave' | 'arc' | 'spiral';
type Point = { x: number; y: number };
type Flight = {
  start: Point;
  end: Point;
  duration: number;
  startedAt: number;
  curve: Curve;
  amplitude: number;
};

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const getMascotWidth = (viewportWidth: number) => clamp(viewportWidth * 0.21 * MASCOT_SCALE, 150 * MASCOT_SCALE, 230 * MASCOT_SCALE);

function choosePoint(edge: Edge, width: number, height: number, mascotWidth: number, mascotHeight: number): Point {
  const padX = mascotWidth * 1.2;
  const padY = mascotHeight * 1.2;
  if (edge === 'left') return { x: -padX, y: randomBetween(-padY, height + padY) };
  if (edge === 'right') return { x: width + padX, y: randomBetween(-padY, height + padY) };
  if (edge === 'top') return { x: randomBetween(-padX, width + padX), y: -padY };
  return { x: randomBetween(-padX, width + padX), y: height + padY };
}

function makeFlight(now: number, width: number, height: number, mascotWidth: number): Flight {
  const edges: Edge[] = ['left', 'right', 'top', 'bottom'];
  const startEdge = edges[Math.floor(Math.random() * edges.length)];
  const endEdges = edges.filter((edge) => edge !== startEdge);
  const endEdge = endEdges[Math.floor(Math.random() * endEdges.length)];
  const mascotHeight = mascotWidth * (130 / 220);
  const start = choosePoint(startEdge, width, height, mascotWidth, mascotHeight);
  const end = choosePoint(endEdge, width, height, mascotWidth, mascotHeight);
  const curves: Curve[] = ['incline', 'wave', 'arc', 'spiral'];
  return {
    start,
    end,
    duration: randomBetween(30_000, 60_000),
    startedAt: now,
    curve: curves[Math.floor(Math.random() * curves.length)],
    amplitude: randomBetween(22, Math.min(width, height) * 0.11)
  };
}

function getPathPoint(flight: Flight, t: number): Point {
  const progress = clamp(t, 0, 1);
  const dx = flight.end.x - flight.start.x;
  const dy = flight.end.y - flight.start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const perpendicular = { x: -dy / length, y: dx / length };
  let offset = 0;
  if (flight.curve === 'incline') offset = Math.sin(Math.PI * progress) * flight.amplitude * 0.42;
  if (flight.curve === 'wave') offset = Math.sin(progress * Math.PI * 3) * Math.sin(Math.PI * progress) * flight.amplitude;
  if (flight.curve === 'arc') offset = Math.sin(Math.PI * progress) * flight.amplitude;
  if (flight.curve === 'spiral') {
    offset = flight.amplitude * (1 - progress) * (Math.sin(progress * Math.PI * 2) + 0.45 * (1 - Math.cos(progress * Math.PI * 2)));
  }
  return {
    x: flight.start.x + dx * progress + perpendicular.x * offset,
    y: flight.start.y + dy * progress + perpendicular.y * offset
  };
}

export function AstronautMascot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const flightSvgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ASTRONAUT_MASCOT_ENABLED) return;
    const container = containerRef.current;
    const flightSvg = flightSvgRef.current;
    if (!container || !flightSvg) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let mascotWidth = getMascotWidth(viewportWidth);
    let flight: Flight | null = null;
    let pauseUntil = 0;
    let frame = 0;
    let pausedAt: number | null = null;
    let lastFrameAt = 0;
    let currentAngle: number | null = null;
    let repulsion = { x: 0, y: 0, vx: 0, vy: 0 };
    let pointer: Point | null = null;

    const setStaticPosition = () => {
      flightSvg.style.transform = `translate3d(${viewportWidth * 0.06}px, ${viewportHeight * 0.66}px, 0)`;
    };
    const updateSize = () => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      mascotWidth = getMascotWidth(viewportWidth);
      flightSvg.style.width = `${mascotWidth}px`;
      if (reducedMotion.matches) setStaticPosition();
    };
    const updatePlayback = () => {
      const shouldPause = document.hidden || reducedMotion.matches;
      container.querySelectorAll<SVGElement>('[data-mascot-motion], .astro-mascot-star').forEach((element) => {
        element.style.animationPlayState = shouldPause ? 'paused' : 'running';
      });
      if (shouldPause) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        if (document.hidden && pausedAt === null) pausedAt = performance.now();
        if (reducedMotion.matches) {
          pausedAt = null;
          flight = null;
          setStaticPosition();
        }
        return;
      }
      if (pausedAt !== null) {
        const pausedDuration = performance.now() - pausedAt;
        if (flight) flight.startedAt += pausedDuration;
        if (pauseUntil) pauseUntil += pausedDuration;
        pausedAt = null;
      }
      if (!frame) frame = window.requestAnimationFrame(animate);
    };
    const updatePointer = (event: PointerEvent) => { pointer = { x: event.clientX, y: event.clientY }; };
    const clearPointer = () => { pointer = null; };

    const animate = (now: number) => {
      frame = 0;
      if (document.hidden || reducedMotion.matches) return;
      const dt = lastFrameAt ? Math.min(0.05, (now - lastFrameAt) / 1000) : 1 / 60;
      lastFrameAt = now;
      if (!flight && now >= pauseUntil) flight = makeFlight(now, viewportWidth, viewportHeight, mascotWidth);

      if (flight) {
        const t = clamp((now - flight.startedAt) / flight.duration, 0, 1);
        const point = getPathPoint(flight, t);
        const ahead = getPathPoint(flight, Math.min(1, t + 0.003));
        const direction = Math.atan2(ahead.y - point.y, ahead.x - point.x) * (180 / Math.PI);
        let target = { x: 0, y: 0 };
        if (pointer) {
          const center = { x: point.x + mascotWidth / 2, y: point.y + (mascotWidth * 130 / 220) / 2 };
          const dx = center.x - pointer.x;
          const dy = center.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < AVOID_RADIUS && distance > 0.01) {
            const strength = (1 - distance / AVOID_RADIUS) * 44;
            target = { x: (dx / distance) * strength, y: (dy / distance) * strength };
          }
        }
        const spring = 18;
        const damping = Math.exp(-8 * dt);
        repulsion.vx = (repulsion.vx + (target.x - repulsion.x) * spring * dt) * damping;
        repulsion.vy = (repulsion.vy + (target.y - repulsion.y) * spring * dt) * damping;
        repulsion.x += repulsion.vx * dt;
        repulsion.y += repulsion.vy * dt;
        const eased = t * t * (3 - 2 * t);
        const bank = Math.sin(eased * Math.PI * 2) * 2;
        const desiredAngle = direction + bank;
        if (currentAngle === null) currentAngle = desiredAngle;
        const angleDelta = ((desiredAngle - currentAngle + 540) % 360) - 180;
        currentAngle += angleDelta * (1 - Math.exp(-5 * dt));
        flightSvg.style.transform = `translate3d(${point.x + repulsion.x}px, ${point.y + repulsion.y}px, 0) rotate(${currentAngle}deg)`;
        if (t >= 1) {
          flight = null;
          pauseUntil = now + randomBetween(900, 2200);
          repulsion = { x: 0, y: 0, vx: 0, vy: 0 };
        }
      }
      if (!document.hidden && !reducedMotion.matches) frame = window.requestAnimationFrame(animate);
    };

    updateSize();
    setStaticPosition();
    window.addEventListener('resize', updateSize, { passive: true });
    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerup', clearPointer, { passive: true });
    window.addEventListener('pointercancel', clearPointer, { passive: true });
    window.addEventListener('blur', clearPointer);
    document.addEventListener('visibilitychange', updatePlayback);
    reducedMotion.addEventListener('change', updatePlayback);
    updatePlayback();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('pointerup', clearPointer);
      window.removeEventListener('pointercancel', clearPointer);
      window.removeEventListener('blur', clearPointer);
      document.removeEventListener('visibilitychange', updatePlayback);
      reducedMotion.removeEventListener('change', updatePlayback);
    };
  }, []);

  if (!ASTRONAUT_MASCOT_ENABLED) return null;

  return (
    <div ref={containerRef} className="astro-mascot-layer" aria-hidden="true">
      <svg className="astro-mascot-sky" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="astro-mascot-star star-twinkle-a" d="M125 52v8m-4-4h8" />
        <path className="astro-mascot-star star-twinkle-b" d="M294 112v7m-3.5-3.5h7" />
        <path className="astro-mascot-star star-twinkle-c" d="M485 44v9m-4.5-4.5h9" />
        <path className="astro-mascot-star star-twinkle-a" d="M675 91v7m-3.5-3.5h7" />
        <path className="astro-mascot-star star-twinkle-b" d="M852 40v9m-4.5-4.5h9" />
        <path className="astro-mascot-star star-twinkle-c" d="M1024 106v8m-4-4h8" />
        <path className="astro-mascot-star star-twinkle-a" d="M1190 54v9m-4.5-4.5h9" />
        <path className="astro-mascot-star star-twinkle-b" d="M1352 126v7m-3.5-3.5h7" />
        <circle className="astro-mascot-star star-twinkle-c" cx="204" cy="169" r="2.3" />
        <circle className="astro-mascot-star star-twinkle-a" cx="563" cy="156" r="2" />
        <circle className="astro-mascot-star star-twinkle-b" cx="934" cy="173" r="2.4" />
        <circle className="astro-mascot-star star-twinkle-c" cx="1282" cy="178" r="2" />
      </svg>

      <svg ref={flightSvgRef} className="astro-mascot-flight" style={{ width: `clamp(${150 * MASCOT_SCALE}px, ${21 * MASCOT_SCALE}vw, ${230 * MASCOT_SCALE}px)` }} viewBox="0 0 220 130" aria-hidden="true" focusable="false">
        <g className="astro-mascot-rocket" data-mascot-motion>
          <path d="M56 83 Q68 67 91 68 L170 73 Q191 76 207 88 Q191 101 170 103 L91 108 Q68 109 56 94Z" fill="#ffffff" stroke={GREY_MID} strokeWidth="4" strokeLinejoin="round" />
          <path d="M165 73 Q188 76 207 88 Q188 100 165 103Z" fill={GREY_LIGHT} stroke={GREY_MID} strokeWidth="4" strokeLinejoin="round" />
          <path d="M68 75 Q53 64 43 70 Q51 83 56 88Z" fill={GREY_LIGHT} stroke={GREY_MID} strokeWidth="4" strokeLinejoin="round" />
          <path d="M68 101 Q53 112 43 106 Q51 93 56 88Z" fill={GREY_LIGHT} stroke={GREY_MID} strokeWidth="4" strokeLinejoin="round" />
          <circle cx="144" cy="87" r="12" fill="#ffffff" stroke={GREY_MID} strokeWidth="4" />
          <path className="astro-mascot-flame astro-mascot-flame-one" data-mascot-motion d="M43 79 Q22 88 42 98 Q35 88 43 79Z" fill={GOLD} stroke={GREY_MID} strokeWidth="3" strokeLinejoin="round" />
          <path className="astro-mascot-flame astro-mascot-flame-two" data-mascot-motion d="M43 82 Q30 88 43 94 Q40 88 43 82Z" fill={GOLD} stroke={GREY_MID} strokeWidth="2.5" strokeLinejoin="round" />
        </g>

        <g className="astro-mascot-rider" data-mascot-motion>
          <path d="M77 71 Q68 76 73 83 L91 86 Q98 86 98 80" fill="none" stroke={GREY_MID} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M96 70 Q106 75 103 82 L91 87" fill="none" stroke={GREY_MID} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M79 50 Q88 44 100 50 L107 73 Q94 82 75 72Z" fill="#ffffff" stroke={GREY_LIGHT} strokeWidth="4" strokeLinejoin="round" />
          <path d="M77 56 Q67 61 69 70" fill="none" stroke={GREY_LIGHT} strokeWidth="7" strokeLinecap="round" />
          <circle cx="69" cy="72" r="4.5" fill="#ffffff" stroke={GREY_MID} strokeWidth="2.5" />
          <path d="M103 56 Q112 60 111 68" fill="none" stroke={GREY_LIGHT} strokeWidth="7" strokeLinecap="round" />
          <circle cx="111" cy="70" r="4.5" fill="#ffffff" stroke={GREY_MID} strokeWidth="2.5" />
          <rect x="86" y="58" width="12" height="11" rx="3" fill={GREY_LIGHT} stroke={GREY_MID} strokeWidth="2.5" />
          {/* Large helmet and matte dark-grey visor */}
          <circle cx="91" cy="34" r="28" fill="#ffffff" stroke={GREY_LIGHT} strokeWidth="4" />
          <circle cx="65" cy="37" r="5" fill={GREY_MID} stroke={GREY_MID} strokeWidth="2.5" />
          <circle cx="117" cy="37" r="5" fill={GREY_MID} stroke={GREY_MID} strokeWidth="2.5" />
          <path d="M75 34 Q76 18 92 17 Q108 18 108 34 Q107 48 92 51 Q77 48 75 34Z" fill={VISOR_DARK} stroke={GREY_MID} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M82 26 Q87 21 93 21" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="25" r="2" fill="#ffffff" />
          <circle cx="85" cy="35" r="1.7" fill="#ffffff" />
          <circle cx="98" cy="35" r="1.7" fill="#ffffff" />
          <path d="M87 41 Q91 45 96 41" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
