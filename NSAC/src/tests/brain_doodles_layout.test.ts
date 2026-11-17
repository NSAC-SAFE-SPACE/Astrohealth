import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrainSvg } from '../features/mental/BrainDoodles';
import { BRAIN_DOODLE_CONFIG, findBrainPlacements, findBrainPlacementsWithDiagnostics, findFreeSpacePlacements } from '../ui/decorative/doodleLayout';
import { BODY_DOODLES } from '../features/body/BodyDoodles';
import { BODY_ZONE_CONFIG } from '../engine/config/bodyZones';
import { BODY_MEASURE_CONFIG } from '../engine/config/bodyMeasures';
import { DECORATIVE_DOODLE_CONFIG } from '../ui/decorative/decorationConfig';

const rect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

describe('placement décoratif des cerveaux', () => {
  it('rend les formes dans un vrai élément SVG', () => {
    const markup = renderToStaticMarkup(React.createElement(BrainSvg, { variant: 'profile' }));
    expect(markup).toMatch(/^<svg[^>]+viewBox="0 0 160 120"/);
    expect(markup).toContain('<path');
  });

  it('garde les dessins hors du contenu avec la marge de sécurité et sans chevauchement', () => {
    const page = rect(0, 0, 1280, 1600);
    const content = rect(240, 80, 1040, 1400);
    const protectedBlock = rect(10, 700, 130, 850);
    const placements = findBrainPlacements(page, content, [protectedBlock], 3);
    expect(placements).toHaveLength(3);
    for (const item of placements) {
      const box = rect(item.x, item.y, item.x + item.width, item.y + item.height);
      expect(
        box.right + BRAIN_DOODLE_CONFIG.safetyMargin <= content.left ||
        box.left - BRAIN_DOODLE_CONFIG.safetyMargin >= content.right
      ).toBe(true);
      expect(box.left).toBeGreaterThanOrEqual(page.left + BRAIN_DOODLE_CONFIG.edgeMargin);
      expect(box.right).toBeLessThanOrEqual(page.right - BRAIN_DOODLE_CONFIG.edgeMargin);
      expect(box.top).toBeGreaterThanOrEqual(page.top + BRAIN_DOODLE_CONFIG.edgeMargin);
      expect(box.bottom).toBeLessThanOrEqual(page.bottom - BRAIN_DOODLE_CONFIG.edgeMargin);
      expect(box.right - box.left).toBeLessThanOrEqual((content.left - page.left - BRAIN_DOODLE_CONFIG.safetyMargin - BRAIN_DOODLE_CONFIG.edgeMargin) * 0.8);
      expect(
        box.right + BRAIN_DOODLE_CONFIG.safetyMargin <= protectedBlock.left ||
        box.left - BRAIN_DOODLE_CONFIG.safetyMargin >= protectedBlock.right ||
        box.bottom + BRAIN_DOODLE_CONFIG.safetyMargin <= protectedBlock.top ||
        box.top - BRAIN_DOODLE_CONFIG.safetyMargin >= protectedBlock.bottom
      ).toBe(true);
    }
    for (let index = 0; index < placements.length; index++) {
      for (const other of placements.slice(index + 1)) {
        const a = placements[index];
        const b = other;
        expect(a.x + a.width + 24 <= b.x || b.x + b.width + 24 <= a.x || a.y + a.height + 24 <= b.y || b.y + b.height + 24 <= a.y).toBe(true);
      }
    }
  });

  it('n’affiche rien quand les marges sont trop étroites, comme sur téléphone', () => {
    const page = rect(0, 0, 390, 1200);
    const content = rect(16, 0, 374, 1180);
    expect(findBrainPlacements(page, content, [], 1)).toEqual([]);
  });

  it('utilise au plus le nombre de zones demandé sur les largeurs intermédiaires', () => {
    const page = rect(0, 0, 768, 1400);
    const content = rect(96, 20, 672, 1300);
    const placements = findBrainPlacements(page, content, [], 2);
    expect(placements.length).toBeLessThanOrEqual(2);
    placements.forEach((item) => {
      expect(item.width).toBeLessThanOrEqual((96 - BRAIN_DOODLE_CONFIG.safetyMargin - BRAIN_DOODLE_CONFIG.edgeMargin) * 0.8);
    });
  });

  it('trouve cinq emplacements dans les marges latérales visibles à 1280 px', () => {
    const page = rect(288, 0, 1268, 1800);
    const content = rect(442, 80, 1114, 1650);
    const placements = findBrainPlacements(page, content, [], BRAIN_DOODLE_CONFIG.maxDesktop);
    expect(placements).toHaveLength(BRAIN_DOODLE_CONFIG.maxDesktop);
    placements.forEach((placement) => {
      expect(placement.width).toBeCloseTo(96);
      expect(placement.x + placement.width + BRAIN_DOODLE_CONFIG.safetyMargin <= content.left || placement.x - BRAIN_DOODLE_CONFIG.safetyMargin >= content.right).toBe(true);
    });
  });

  it('réduit la marge de sécurité à 12 px quand 24 px bloquent une zone', () => {
    const page = rect(0, 0, 900, 1200);
    const content = rect(120, 0, 780, 1180);
    const result = findBrainPlacementsWithDiagnostics(page, content, [], 1);
    expect(result.placements).toHaveLength(1);
    expect(result.safetyMargin).toBe(12);
  });

  it.each([
    { width: 1280, page: rect(288, 0, 1268, 1800), content: rect(442, 80, 1114, 1650), count: 3 },
    { width: 768, page: rect(288, 0, 768, 2400), content: rect(288, 0, 768, 2200), count: 0 },
    { width: 390, page: rect(0, 0, 390, 2400), content: rect(16, 0, 374, 2200), count: 0 }
  ])('ne chevauche jamais le contenu à $width px dans les étapes overview, saisie et résultat', ({ page, content, count }) => {
    for (const pageHeight of [page.bottom, 2200, 1400]) {
      const measuredPage = { ...page, bottom: page.top + pageHeight };
      const measuredContent = { ...content, bottom: Math.min(content.bottom, measuredPage.bottom - 8) };
      const placements = findBrainPlacements(measuredPage, measuredContent, [], 3);
      expect(placements).toHaveLength(count);
      for (const item of placements) {
        const box = rect(item.x, item.y, item.x + item.width, item.y + item.height);
        expect(box.right + BRAIN_DOODLE_CONFIG.safetyMargin <= measuredContent.left || box.left - BRAIN_DOODLE_CONFIG.safetyMargin >= measuredContent.right).toBe(true);
      }
    }
  });

  it('garde les limites flottantes exactes afin de ne pas éliminer le vide entre deux colonnes', () => {
    const page = { left: 570, top: 148, right: 1626, bottom: 2962.5 };
    const blocks = [
      rect(570, 148, 1626, 265),
      rect(570, 301, 1115.2666625976562, 981),
      rect(1135.2666015625, 301, 1375.2666015625, 1739),
      rect(1395.2666015625, 301, 1625.9999389648438, 1739),
      rect(570, 1775, 1626, 2700.5),
      rect(570, 2736.5, 1626, 2962.5)
    ];
    expect(findFreeSpacePlacements(page, blocks, 2, DECORATIVE_DOODLE_CONFIG.body).placements.length).toBeGreaterThan(0);
  });

  it('fusionne les tranches libres séparées par les bords de cartes dans la colonne voisine', () => {
    const page = rect(336, 148, 1220, 2424.5);
    const blocks = [
      rect(336, 148, 1220, 265),
      rect(336, 301, 790.7333374023438, 1033),
      rect(810.7333374023438, 301, 1220, 807),
      rect(810.7333374023438, 827, 1220, 1143),
      rect(336, 1237, 1220, 2162.5),
      rect(336, 2198.5, 1220, 2424.5)
    ];
    const placements = findFreeSpacePlacements(page, blocks, 2, DECORATIVE_DOODLE_CONFIG.body).placements;
    expect(placements.length).toBeGreaterThan(0);
    expect(placements[0].width).toBeGreaterThanOrEqual(96);
  });

  it('trouve un emplacement visible à côté du titre de Mon corps au premier écran desktop', () => {
    const page = rect(336, 148, 1220, 2424.5);
    const blocks = [
      rect(336, 148, 1008, 265),
      rect(336, 301, 790.7333374023438, 1033),
      rect(810.7333374023438, 301, 1220, 807),
      rect(810.7333374023438, 827, 1220, 1143),
      rect(336, 1237, 1220, 2162.5),
      rect(336, 2198.5, 1220, 2424.5)
    ];
    const placements = findFreeSpacePlacements(page, blocks, 2, DECORATIVE_DOODLE_CONFIG.body).placements;
    expect(placements.length).toBeGreaterThan(0);
    expect(placements[0].y).toBeLessThan(301);
  });
});

describe('décorations de Mon corps', () => {
  it('rend les onze dessins comme SVG décoratifs sans texte', () => {
    expect(BODY_DOODLES).toHaveLength(11);
    expect(DECORATIVE_DOODLE_CONFIG.body.maxDesktop).toBe(2);
    expect(DECORATIVE_DOODLE_CONFIG.body.maxTablet).toBe(1);
    expect(DECORATIVE_DOODLE_CONFIG.body.maxMobile).toBe(1);
    expect(DECORATIVE_DOODLE_CONFIG.body.maxOpacity).toBeGreaterThanOrEqual(0.9);
    expect(DECORATIVE_DOODLE_CONFIG.body.restingOpacity).toBeGreaterThanOrEqual(0.8);
    expect(DECORATIVE_DOODLE_CONFIG.body.maxSize).toBeGreaterThanOrEqual(175);
    const zoneIds = new Set<string>(BODY_ZONE_CONFIG.map((zone) => zone.id));
    const indicatorIds = new Set<string>(BODY_MEASURE_CONFIG.indicators.map((indicator) => indicator.id));
    for (const doodle of BODY_DOODLES) {
      const markup = renderToStaticMarkup(doodle.render as React.ReactElement);
      expect(markup).toContain('<svg');
      expect(markup).not.toMatch(/<text\b|<image\b/);
      expect(doodle.zones?.length).toBeGreaterThan(0);
      expect(doodle.indicators?.length).toBeGreaterThan(0);
      for (const zone of doodle.zones ?? []) expect(zoneIds.has(zone)).toBe(true);
      for (const indicator of doodle.indicators ?? []) expect(indicatorIds.has(indicator)).toBe(true);
    }
  });

  it.each([
    { name: 'desktop 1920', page: rect(570, 112, 1626, 2967), blocks: [rect(570, 112, 1626, 229), rect(570, 265, 1115, 945), rect(1135, 265, 1626, 1743), rect(570, 1779, 1626, 2500)], expected: true },
    { name: 'desktop compact 1280', page: rect(336, 112, 1220, 3836), blocks: [rect(336, 112, 1220, 229), rect(336, 265, 791, 997), rect(811, 265, 1220, 2659), rect(336, 2695, 1220, 3500)], expected: true },
    { name: 'tablet 768', page: rect(0, 0, 768, 2800), blocks: [rect(0, 0, 768, 200), rect(0, 220, 768, 1000), rect(0, 1020, 768, 2670), rect(0, 2690, 768, 2800)], expected: false },
    { name: 'mobile 390', page: rect(0, 0, 390, 2800), blocks: [rect(0, 0, 390, 200), rect(0, 220, 390, 1000), rect(0, 1020, 390, 2670), rect(0, 2690, 390, 2800)], expected: false }
  ])('place sans recouvrir de bloc protégé en $name', ({ page, blocks, expected }) => {
    const result = findFreeSpacePlacements(page, blocks, 2, DECORATIVE_DOODLE_CONFIG.body);
    expect(result.placements.length > 0).toBe(expected);
    for (const doodle of result.placements) {
      const box = rect(doodle.x, doodle.y, doodle.x + doodle.width, doodle.y + doodle.height);
      expect(box.left).toBeGreaterThanOrEqual(page.left + DECORATIVE_DOODLE_CONFIG.body.edgeMargin);
      expect(box.right).toBeLessThanOrEqual(page.right - DECORATIVE_DOODLE_CONFIG.body.edgeMargin);
      expect(box.top).toBeGreaterThanOrEqual(page.top + DECORATIVE_DOODLE_CONFIG.body.edgeMargin);
      expect(box.bottom).toBeLessThanOrEqual(page.bottom - DECORATIVE_DOODLE_CONFIG.body.edgeMargin);
      for (const block of blocks) {
        expect(box.right + 24 <= block.left || box.left - 24 >= block.right || box.bottom + 24 <= block.top || box.top - 24 >= block.bottom).toBe(true);
      }
    }
  });
});
