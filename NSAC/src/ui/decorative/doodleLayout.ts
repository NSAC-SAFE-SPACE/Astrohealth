import { DECORATIVE_DOODLE_CONFIG, type DecorativeDoodleConfig } from './decorationConfig';

export const BRAIN_DOODLE_CONFIG = DECORATIVE_DOODLE_CONFIG.mental;
export type BrainVariant = 'profile' | 'constellation' | 'top' | 'orbit' | 'network';

export type DoodleVariant = string;
type Rect = { left: number; top: number; right: number; bottom: number };
export type DoodlePlacement = { x: number; y: number; width: number; height: number; zone: string };
export type PlacementRejection = DoodlePlacement & { reason: string };
export type PlacementDiagnostics = { placements: DoodlePlacement[]; rejected: PlacementRejection[]; safetyMargin: number | null; reason?: string; freeSpaceCount?: number };
export type BrainPlacement = DoodlePlacement;
export type BrainPlacementDiagnostics = PlacementDiagnostics;

const OVERLAP_GAP = 24;
const SAFETY_MARGINS = [24, 18, 12] as const;

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** The Mental page uses lateral rails to preserve its existing composition. */
export function findRailPlacements(page: Rect, content: Rect, protectedRects: Rect[] = [], requested = 3, config: DecorativeDoodleConfig = BRAIN_DOODLE_CONFIG): PlacementDiagnostics {
  const edge = config.edgeMargin;
  const zoneHeight = page.bottom - page.top - edge * 2;
  const rejected: PlacementRejection[] = [];

  for (const margin of SAFETY_MARGINS) {
    const rails = [
      { name: 'left', left: page.left + edge, right: content.left - margin },
      { name: 'right', left: content.right + margin, right: page.right - edge }
    ];
    const viableRails = rails.filter((rail) => rail.right - rail.left >= config.minZoneSize);
    if (!viableRails.length) continue;
    const result: DoodlePlacement[] = [];
    rejected.length = 0;

    for (const rail of viableRails) {
      const zoneWidth = rail.right - rail.left;
      const width = Math.min(config.maxSize, zoneWidth * 0.8);
      const height = width * 0.75;
      const capacity = Math.max(1, Math.floor((zoneHeight + OVERLAP_GAP) / (height + OVERLAP_GAP)));
      const count = Math.min(capacity, Math.max(1, Math.ceil(requested / viableRails.length)));
      for (let index = 0; index < count; index++) {
        const usableHeight = Math.max(0, zoneHeight - height);
        const y = page.top + edge + (count === 1 ? usableHeight / 2 : usableHeight * index / (count - 1));
        const x = rail.left + (zoneWidth - width) / 2;
        const placement = { x, y, width, height, zone: `${rail.name}-${index}` };
        const box = { left: x, right: x + width, top: y, bottom: y + height };
        if (protectedRects.some((rect) => intersects(expand(rect, margin), box))) {
          rejected.push({ ...placement, reason: `intersection avec contenu (marge ${margin}px)` });
          continue;
        }
        if (result.some((item) => intersects(expand({ left: item.x, right: item.x + item.width, top: item.y, bottom: item.y + item.height }, OVERLAP_GAP), box))) {
          rejected.push({ ...placement, reason: 'chevauchement avec un autre dessin' });
          continue;
        }
        result.push(placement);
        if (result.length >= requested) return { placements: result, rejected, safetyMargin: margin };
      }
    }
    if (result.length) return { placements: result, rejected, safetyMargin: margin };
  }
  return {
    placements: [], rejected, safetyMargin: null,
    reason: rejected.length ? 'Toutes les zones candidates intersectent un bloc protégé.' : `Aucune gouttière latérale ne dépasse ${config.minZoneSize}px.`
  };
}

export function findBrainPlacements(page: Rect, content: Rect, protectedRects: Rect[] = [], requested = 3): BrainPlacement[] {
  return findRailPlacements(page, content, protectedRects, requested).placements;
}

export function findBrainPlacementsWithDiagnostics(page: Rect, content: Rect, protectedRects: Rect[] = [], requested = 3): BrainPlacementDiagnostics {
  return findRailPlacements(page, content, protectedRects, requested);
}

/**
 * Finds free grid cells formed by the page edges and real protected blocks. This is used by
 * dense pages such as Mon corps, where useful whitespace can sit below one column rather than
 * beside the whole content column.
 */
export function findFreeSpacePlacements(page: Rect, protectedRects: Rect[], requested: number, config: DecorativeDoodleConfig): PlacementDiagnostics {
  const rejected: PlacementRejection[] = [];
  for (const margin of SAFETY_MARGINS) {
    const bounds = {
      left: page.left + config.edgeMargin,
      right: page.right - config.edgeMargin,
      top: page.top + config.edgeMargin,
      bottom: page.bottom - config.edgeMargin
    };
    const obstacles = protectedRects.map((rect) => clip(expand(rect, margin), bounds)).filter((rect): rect is Rect => rect !== null);
    const xs = unique([bounds.left, bounds.right, ...obstacles.flatMap((rect) => [rect.left, rect.right])]);
    const ys = unique([bounds.top, bounds.bottom, ...obstacles.flatMap((rect) => [rect.top, rect.bottom])]);
    const cells: Array<{ rect: Rect; key: string }> = [];

    // Sweep each horizontal band and merge consecutive free vertical slices. A card
    // boundary in the other column must not split a genuinely large blank column.
    for (let xi = 0; xi < xs.length - 1; xi++) {
      const left = xs[xi];
      const right = xs[xi + 1];
      if (right - left < config.minFreeSpace) continue;
      let runTop: number | null = null;
      let runBottom = 0;
      const addRun = (bottom: number) => {
        if (runTop !== null && bottom - runTop >= config.minFreeSpace) {
          cells.push({ rect: { left, right, top: runTop, bottom }, key: `free-${xi}-${cells.length}` });
        }
        runTop = null;
      };
      for (let yi = 0; yi < ys.length - 1; yi++) {
        const top = ys[yi];
        const bottom = ys[yi + 1];
        const slice = { left, right, top, bottom };
        const free = !obstacles.some((obstacle) => intersects(obstacle, slice));
        if (free) {
          if (runTop === null) runTop = top;
          runBottom = bottom;
        } else if (runTop !== null) addRun(runBottom);
      }
      if (runTop !== null) addRun(runBottom);
    }

    cells.sort((a, b) => {
      const aTop = a.rect.top < page.top + 300;
      const bTop = b.rect.top < page.top + 300;
      if (aTop !== bTop) return aTop ? -1 : 1;
      return (b.rect.right - b.rect.left) * (b.rect.bottom - b.rect.top) - (a.rect.right - a.rect.left) * (a.rect.bottom - a.rect.top);
    });
    const placements: DoodlePlacement[] = [];
    for (const [index, cell] of cells.entries()) {
      const freeWidth = cell.rect.right - cell.rect.left;
      const freeHeight = cell.rect.bottom - cell.rect.top;
      const width = Math.min(config.maxSize, freeWidth * 0.88, (freeHeight / 0.75) * 0.88);
      const height = width * 0.75;
      if (width < config.minZoneSize || height > freeHeight * 0.88) {
        rejected.push({ x: cell.rect.left, y: cell.rect.top, width, height, zone: cell.key, reason: 'zone trop petite après la marge de sécurité' });
        continue;
      }
      const x = cell.rect.left + (freeWidth - width) / 2;
      const y = cell.rect.top + (freeHeight - height) / 2;
      const box = { left: x, right: x + width, top: y, bottom: y + height };
      if (placements.some((item) => intersects(expand({ left: item.x, right: item.x + item.width, top: item.y, bottom: item.y + item.height }, OVERLAP_GAP), box))) continue;
      placements.push({ x, y, width, height, zone: cell.key });
      if (placements.length >= requested) break;
    }
    if (placements.length) return { placements, rejected, safetyMargin: margin, freeSpaceCount: cells.length };
    if (margin === SAFETY_MARGINS[SAFETY_MARGINS.length - 1]) return { placements: [], rejected, safetyMargin: margin, freeSpaceCount: cells.length, reason: `Aucun emplacement utilisable parmi ${cells.length} zones libres.` };
  }
  return { placements: [], rejected, safetyMargin: null, freeSpaceCount: 0, reason: `Aucun espace libre d’au moins ${config.minFreeSpace}px.` };
}

function expand(rect: Rect, amount: number): Rect {
  return { left: rect.left - amount, right: rect.right + amount, top: rect.top - amount, bottom: rect.bottom + amount };
}

function clip(rect: Rect, bounds: Rect): Rect | null {
  const clipped = { left: Math.max(rect.left, bounds.left), right: Math.min(rect.right, bounds.right), top: Math.max(rect.top, bounds.top), bottom: Math.min(rect.bottom, bounds.bottom) };
  return clipped.right > clipped.left && clipped.bottom > clipped.top ? clipped : null;
}

function unique(values: number[]): number[] {
  // Keep measured float boundaries intact: rounding one edge can create a false overlap
  // with an adjacent protected rectangle, especially when gutters are narrow.
  return [...new Set(values)].sort((a, b) => a - b);
}
