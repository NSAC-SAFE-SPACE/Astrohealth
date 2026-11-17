import React, { useEffect, useMemo, useRef, useState } from 'react';
import './decorative-doodles.css';
import { DECORATIVE_DOODLE_CONFIG, type DecorativeDoodleConfig } from './decorationConfig';
import { findFreeSpacePlacements, findRailPlacements, type DoodlePlacement, type PlacementDiagnostics } from './doodleLayout';

const OVERLAP_GAP = 24;

export type DecorativeDoodle = {
  id: string;
  render: React.ReactNode;
  zones?: readonly string[];
  indicators?: readonly string[];
};

type Slot = DoodlePlacement & { doodleId: string; key: number; duration: number; delay: number; dimmed?: boolean };

function isVisible(element: Element): boolean {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
}

function isFormControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function isRelated(doodle: DecorativeDoodle | undefined, zone?: string, indicator?: string, items?: DecorativeDoodle[]): boolean {
  if (indicator && items?.some((item) => item.indicators?.includes(indicator))) return Boolean(doodle?.indicators?.includes(indicator));
  return Boolean(doodle && ((zone && doodle.zones?.includes(zone)) || (indicator && doodle.indicators?.includes(indicator))));
}

function overlaps(a: DoodlePlacement, b: DoodlePlacement, gap = 0): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

function chooseDoodle(items: DecorativeDoodle[], previous: { zone: string; doodleId: string }[], placement: DoodlePlacement, zone: string | undefined, indicator: string | undefined, reservedIds: string[] = []): DecorativeDoodle {
  const indicatorRelated = indicator ? items.filter((item) => item.indicators?.includes(indicator)) : [];
  const zoneRelated = zone ? items.filter((item) => item.zones?.includes(zone)) : [];
  const related = indicatorRelated.length ? indicatorRelated : zoneRelated;
  const relatedUnused = related.filter((item) => !reservedIds.includes(item.id));
  const preferred = related.length && relatedUnused.length ? relatedUnused : items.filter((item) => !reservedIds.includes(item.id));
  const uniquePool = preferred.length ? preferred : (related.length ? related : items);
  const notRepeated = uniquePool.filter((item) => !previous.some((old) => old.zone === placement.zone && old.doodleId === item.id));
  const pool = notRepeated.length ? notRepeated : uniquePool;
  return pool[Math.floor(Math.random() * pool.length)] ?? items[0];
}

export function DecorativeDoodleLayer({
  items,
  config,
  strategy,
  selectedZone,
  selectedIndicator,
  persistentVisibility = false,
  suspended = false
}: {
  items: DecorativeDoodle[];
  config: DecorativeDoodleConfig;
  strategy: 'rails' | 'free';
  selectedZone?: string;
  selectedIndicator?: string;
  persistentVisibility?: boolean;
  suspended?: boolean;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.visibilityState === 'hidden');
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [diagnostics, setDiagnostics] = useState<PlacementDiagnostics>({ placements: [], rejected: [], safetyMargin: null });
  const previousRef = useRef<{ zone: string; doodleId: string }[]>([]);
  const slotsRef = useRef<Slot[]>([]);
  const selectionRef = useRef<string | null>(null);
  const holdUntilRef = useRef(0);
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const debug = import.meta.env.DEV && new URLSearchParams(`${window.location.search}&${window.location.hash.split('?')[1] ?? ''}`).get('decorDebug') === '1';
  slotsRef.current = slots;

  useEffect(() => {
    const page = layerRef.current?.parentElement;
    const content = page?.querySelector<HTMLElement>('[data-decor-content]');
    if (!page || !content || !config.enabled || items.length === 0) return;

    let recalcFrame = 0;
    let selectionTimer = 0;
    const selectionKey = `${selectedZone ?? ''}|${selectedIndicator ?? ''}`;
    const selectionChanged = selectionRef.current !== null && selectionRef.current !== selectionKey;
    selectionRef.current = selectionKey;

    const measure = (force = false) => {
      if (!force && performance.now() < holdUntilRef.current) return;
      setSlots([]);
      cancelAnimationFrame(recalcFrame);
      recalcFrame = requestAnimationFrame(() => {
        const pageRect = page.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const protectedRects = [...page.querySelectorAll<HTMLElement>('[data-decor-avoid]')]
          .filter(isVisible).map((element) => {
            const rect = element.getBoundingClientRect();
            return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
          });
        const requested = reduced ? 1 : window.innerWidth < 640 ? config.maxMobile : window.innerWidth < 1024 ? config.maxTablet : config.maxDesktop;
        const result = strategy === 'rails'
          ? findRailPlacements(
              { left: pageRect.left, right: pageRect.right, top: pageRect.top, bottom: pageRect.bottom },
              { left: contentRect.left, right: contentRect.right, top: contentRect.top, bottom: contentRect.bottom },
              protectedRects, requested, config
            )
          : findFreeSpacePlacements({ left: pageRect.left, right: pageRect.right, top: pageRect.top, bottom: pageRect.bottom }, protectedRects, requested, config);
        const local = result.placements.map((placement) => ({ ...placement, x: placement.x - pageRect.left, y: placement.y - pageRect.top }));
        setDiagnostics({
          ...result,
          placements: result.placements.map((placement) => ({ ...placement, x: placement.x - pageRect.left, y: placement.y - pageRect.top })),
          rejected: result.rejected.map((placement) => ({ ...placement, x: placement.x - pageRect.left, y: placement.y - pageRect.top }))
        });
        if (debug) console.info('[DecorativeDoodles] placement', {
          strategy, viewport: `${window.innerWidth}x${window.innerHeight}`, protectedBlocks: protectedRects.length,
          candidates: result.placements.length + result.rejected.length, placements: result.placements,
          rejected: result.rejected, safetyMargin: result.safetyMargin, reason: result.reason
        });
        setSlots((current) => {
          const usedIds: string[] = [];
          const next = local.map((placement, index) => {
            const old = current[index];
            const item = chooseDoodle(items, previousRef.current, placement, selectedZone, selectedIndicator, usedIds);
            usedIds.push(item.id);
            const dimmed = Boolean((selectedZone || selectedIndicator) && !isRelated(item, selectedZone, selectedIndicator, items));
            const same = old?.zone === placement.zone && old.doodleId === item.id && Math.abs(old.x - placement.x) < 1 && Math.abs(old.y - placement.y) < 1;
            return same ? { ...placement, ...old, dimmed, delay: reduced ? 0 : index * 1600 } : {
              ...placement, doodleId: item.id, key: Date.now() + Math.floor(Math.random() * 1_000_000),
              duration: config.durationMs[Math.floor(Math.random() * config.durationMs.length)], delay: reduced ? 0 : index * 1600, dimmed
            };
          });
          previousRef.current = next.map((slot) => ({ zone: slot.zone, doodleId: slot.doodleId }));
          return next;
        });
      });
    };

    if (selectionChanged && slotsRef.current.length) {
      holdUntilRef.current = performance.now() + 600;
      setSlots((current) => current.map((slot) => ({ ...slot, dimmed: !isRelated(itemsById.get(slot.doodleId), selectedZone, selectedIndicator, items) })));
      selectionTimer = window.setTimeout(() => { holdUntilRef.current = 0; measure(true); }, 600);
    } else {
      holdUntilRef.current = 0;
      measure();
    }

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(page);
    resizeObserver.observe(content);
    const mutationObserver = new MutationObserver(() => measure());
    mutationObserver.observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style', 'open'] });
    const onResize = () => measure();
    window.addEventListener('resize', onResize, { passive: true });
    const onFocusIn = (event: FocusEvent) => {
      if (config.dimOnAnyFocus || isFormControl(event.target)) setFocused(true);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (config.dimOnAnyFocus) setFocused(content.contains(event.relatedTarget as Node | null));
      else setFocused(isFormControl(event.relatedTarget));
    };
    const onPointerOver = (event: PointerEvent) => {
      if (!config.dimOnAnyFocus && isFormControl(event.target)) setFocused(true);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!config.dimOnAnyFocus && isFormControl(event.target) && !isFormControl(event.relatedTarget)) setFocused(false);
    };
    content.addEventListener('focusin', onFocusIn);
    content.addEventListener('focusout', onFocusOut);
    content.addEventListener('pointerover', onPointerOver);
    content.addEventListener('pointerout', onPointerOut);
    return () => {
      cancelAnimationFrame(recalcFrame);
      window.clearTimeout(selectionTimer);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', onResize);
      content.removeEventListener('focusin', onFocusIn);
      content.removeEventListener('focusout', onFocusOut);
      content.removeEventListener('pointerover', onPointerOver);
      content.removeEventListener('pointerout', onPointerOut);
    };
  }, [config, debug, items, itemsById, reduced, selectedIndicator, selectedZone, strategy]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (reduced || suspended || slots.length === 0) return;
    let remaining = Math.max(...slots.map((slot, index) => slot.delay + slot.duration + config.pauseMs[index % config.pauseMs.length]));
    let started = 0;
    let timer = 0;
    const schedule = () => {
      started = performance.now();
      timer = window.setTimeout(() => {
        const page = layerRef.current?.parentElement;
        const content = page?.querySelector<HTMLElement>('[data-decor-content]');
        if (!page || !content) return;
        const pageRect = page.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const protectedRects = [...page.querySelectorAll<HTMLElement>('[data-decor-avoid]')].filter(isVisible).map((element) => {
          const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        });
        const count = window.innerWidth < 640 ? config.maxMobile : window.innerWidth < 1024 ? config.maxTablet : config.maxDesktop;
        const alternativeResult = strategy === 'rails'
          ? findRailPlacements({ left: pageRect.left, right: pageRect.right, top: pageRect.top, bottom: pageRect.bottom }, { left: contentRect.left, right: contentRect.right, top: contentRect.top, bottom: contentRect.bottom }, protectedRects, Math.max(count * 4, count), config)
          : findFreeSpacePlacements({ left: pageRect.left, right: pageRect.right, top: pageRect.top, bottom: pageRect.bottom }, protectedRects, Math.max(count * 4, count), config);
        const alternatives = alternativeResult.placements.map((item) => ({ ...item, x: item.x - pageRect.left, y: item.y - pageRect.top }));
        const oldZones = new Set(slots.map((slot) => slot.zone));
        const newZones = alternatives.filter((candidate) => !oldZones.has(candidate.zone));
        const next: Slot[] = [];
        for (const candidate of (newZones.length ? newZones : alternatives)) {
          if (next.some((other) => overlaps(candidate, other, OVERLAP_GAP))) continue;
          const item = chooseDoodle(items, previousRef.current, candidate, selectedZone, selectedIndicator, next.map((slot) => slot.doodleId));
          next.push({ ...candidate, doodleId: item.id, key: Date.now() + Math.floor(Math.random() * 1_000_000), duration: config.durationMs[Math.floor(Math.random() * config.durationMs.length)], delay: next.length * 1600, dimmed: Boolean((selectedZone || selectedIndicator) && !isRelated(item, selectedZone, selectedIndicator, items)) });
          if (next.length >= count) break;
        }
        previousRef.current = next.map((slot) => ({ zone: slot.zone, doodleId: slot.doodleId }));
        setSlots(next);
      }, remaining);
    };
    if (document.visibilityState !== 'hidden') schedule();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { window.clearTimeout(timer); remaining = Math.max(0, remaining - (performance.now() - started)); }
      else schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [config, items, selectedIndicator, selectedZone, slots, reduced, strategy, suspended]);

  return <>
    <div ref={layerRef} aria-hidden="true" className={`decorative-doodle-layer${focused ? ' is-focused' : ''}${hidden ? ' is-hidden' : ''}${reduced ? ' is-reduced' : ''}${suspended ? ' is-suspended' : ''}${persistentVisibility ? ' is-looping' : ''}${debug ? ' is-debug' : ''}`} data-active-count={slots.length} data-engine-active={String(config.enabled)} data-free-space-count={diagnostics.freeSpaceCount ?? diagnostics.placements.length + diagnostics.rejected.length} data-valid-placement-count={diagnostics.placements.length} data-rejected-placement-count={diagnostics.rejected.length} data-selected-zone={selectedZone ?? ''} data-selected-indicator={selectedIndicator ?? ''}>
      {debug && <>
        {diagnostics.placements.map((zone) => <div key={`debug-${zone.zone}`} className="decorative-doodle-debug-zone" style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height }} title={`zone libre : ${zone.zone}`} />)}
        {diagnostics.rejected.slice(0, 40).map((zone, index) => <div key={`reject-${zone.zone}-${index}`} className="decorative-doodle-debug-zone is-rejected" style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height }} title={zone.reason} />)}
      </>}
      {slots.map((slot) => <div key={slot.key} data-doodle-id={slot.doodleId} data-placement-zone={slot.zone} className={`decorative-doodle${slot.dimmed ? ' is-dimmed' : ''}`} style={{ left: slot.x, top: slot.y, width: slot.width, height: slot.height, animationDuration: `${slot.duration}ms`, animationDelay: `${slot.delay}ms`, '--peak-opacity': config.maxOpacity, '--resting-opacity': config.restingOpacity, '--focused-opacity': config.focusedOpacity, '--reduced-opacity': config.reducedOpacity } as React.CSSProperties}>
        <div className={`decorative-doodle-art doodle-${slot.doodleId}`}>{itemsById.get(slot.doodleId)?.render}</div>
      </div>)}
    </div>
    {debug && <span className="decorative-doodle-debug-status" title={diagnostics.reason}>{`Moteur ${config.enabled ? 'actif' : 'arrêté'} · zones libres ${diagnostics.freeSpaceCount ?? diagnostics.placements.length + diagnostics.rejected.length} · valides ${diagnostics.placements.length} · refusés ${diagnostics.rejected.length} · affichés ${slots.length} · sélection ${selectedZone ?? 'aucune'} / ${selectedIndicator ?? 'aucun'} · ${reduced ? 'mouvement réduit' : hidden ? 'onglet masqué · pause' : suspended ? 'interaction 3D · pause' : 'cycle animé'}`} · {slots.map((slot) => `${slot.doodleId}@${Math.round(slot.x)},${Math.round(slot.y)} ${slot.width}×${slot.height}`).join(' ; ')}{diagnostics.reason ? ` · ${diagnostics.reason}` : ''}</span>}
  </>;
}

