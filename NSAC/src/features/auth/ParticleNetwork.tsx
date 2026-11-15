import { useEffect, useRef } from 'react';

type Particle = { x: number; y: number; vx: number; vy: number; radius: number; phase: number };
const CONNECTION_RADIUS = 136;
const POINTER_RADIUS = 190;

export function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !host || !context) return;
    const ctx = context;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const touchMode = window.matchMedia('(pointer: coarse)');
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let pointer = { x: -10_000, y: -10_000, active: false };
    let resizeObserver: ResizeObserver | undefined;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = width * height;
      const density = touchMode.matches ? 0.000055 : 0.00009;
      const count = Math.max(28, Math.min(110, Math.round(area * density)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: 0.8 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2
      }));
    };

    const setPointer = (clientX: number, clientY: number, active = true) => {
      const rect = host.getBoundingClientRect();
      pointer = { x: clientX - rect.left, y: clientY - rect.top, active };
    };
    const onMouseMove = (event: MouseEvent) => setPointer(event.clientX, event.clientY);
    const onMouseLeave = () => { pointer.active = false; };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) setPointer(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => { pointer.active = false; };

    const draw = (time: number) => {
      if (!lastFrame) lastFrame = time;
      const dt = Math.min(2, (time - lastFrame) / 16.67);
      lastFrame = time;
      elapsed += dt;
      ctx.clearRect(0, 0, width, height);

      for (const particle of particles) {
        if (!reducedMotion.matches) {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          if (particle.x < -8 || particle.x > width + 8) particle.vx *= -1;
          if (particle.y < -8 || particle.y > height + 8) particle.vy *= -1;
        }
      }

      const maxDistance = touchMode.matches ? 105 : CONNECTION_RADIUS;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist >= maxDistance) continue;
          const midpointX = (a.x + b.x) / 2;
          const midpointY = (a.y + b.y) / 2;
          const cursorDist = pointer.active ? Math.hypot(midpointX - pointer.x, midpointY - pointer.y) : Infinity;
          const cursorBoost = cursorDist < POINTER_RADIUS ? 1 - cursorDist / POINTER_RADIUS : 0;
          const alpha = (1 - dist / maxDistance) * (0.2 + cursorBoost * 0.78);
          const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          gradient.addColorStop(0, `rgba(230, 181, 75, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(255, 226, 153, ${Math.min(1, alpha * 1.4)})`);
          gradient.addColorStop(1, `rgba(196, 139, 37, ${alpha})`);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.55 + cursorBoost * 0.65;
          ctx.shadowColor = `rgba(224, 171, 62, ${cursorBoost * 0.6})`;
          ctx.shadowBlur = cursorBoost * 8;
          ctx.stroke();

          if (!reducedMotion.matches && cursorBoost > 0.45 && (i * 7 + j) % 11 === 0) {
            const pulse = (elapsed * 0.012 + (i + j) * 0.137) % 1;
            const px = a.x + dx * -pulse;
            const py = a.y + dy * -pulse;
            ctx.beginPath();
            ctx.arc(px, py, 1.35, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 242, 204, ${cursorBoost * 0.95})`;
            ctx.shadowColor = '#e5b64f';
            ctx.shadowBlur = 10;
            ctx.fill();
          }
        }
      }

      for (const particle of particles) {
        const dist = pointer.active ? Math.hypot(particle.x - pointer.x, particle.y - pointer.y) : Infinity;
        const glow = dist < POINTER_RADIUS ? 1 - dist / POINTER_RADIUS : 0;
        const twinkle = reducedMotion.matches ? 0 : (Math.sin(elapsed * 0.025 + particle.phase) + 1) * 0.12;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius + glow * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(213, 157, 48, ${0.38 + twinkle + glow * 0.62})`;
        ctx.shadowColor = `rgba(239, 188, 73, ${0.18 + glow * 0.8})`;
        ctx.shadowBlur = 3 + glow * 12;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (!reducedMotion.matches) frame = window.requestAnimationFrame(draw);
    };

    resize();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
    } else window.addEventListener('resize', resize);
    host.addEventListener('mousemove', onMouseMove, { passive: true });
    host.addEventListener('mouseleave', onMouseLeave);
    host.addEventListener('touchmove', onTouchMove, { passive: true });
    host.addEventListener('touchend', onTouchEnd, { passive: true });
    const onMotionPreference = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      if (!reducedMotion.matches) frame = window.requestAnimationFrame(draw);
      else draw(performance.now());
    };
    window.addEventListener('resize', resize);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      host.removeEventListener('mousemove', onMouseMove);
      host.removeEventListener('mouseleave', onMouseLeave);
      host.removeEventListener('touchmove', onTouchMove);
      host.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full" />;
}
