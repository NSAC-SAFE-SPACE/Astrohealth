import type { Astronaut, MissionEnvironment } from '../types';
import { db } from '../db';

/**
 * Default embedded SVG silhouette for astronaut profile (100% offline, zero network)
 */
export const DEFAULT_AVATAR_SILHOUETTE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><rect width="256" height="256" fill="%23F5F8FB"/><circle cx="128" cy="96" r="48" fill="%23AEB9C5"/><path d="M48 220 c0 -44 36 -72 80 -72 s80 28 80 72 Z" fill="%23AEB9C5"/></svg>`;

/**
 * Standard communication delays per mission environment according to NASA standards
 */
export const ENVIRONMENT_COMM_DELAYS: Record<MissionEnvironment, { nominalMin: number; rangeText: string }> = {
  station: { nominalMin: 0, rangeText: '< 1 seconde (orbite basse terrestre)' },
  spacecraft: { nominalMin: 5, rangeText: '2 à 8 minutes (transit translunaire / interplanétaire)' },
  lunar_base: { nominalMin: 2, rangeText: '1.3 seconde à 2 minutes (base lunaire Artemis)' },
  mars_rover: { nominalMin: 20, rangeText: '4 à 24 minutes (mission martienne de longue durée)' }
};

/**
 * Resizes an image file or Data URL client-side to a square target resolution (256x256 px)
 * using an HTML5 Canvas. Strictly offline, never transmits image data.
 */
export async function resizeImageToSquare(
  fileOrDataUrl: File | string,
  targetSize: number = 256
): Promise<string> {
  return new Promise((resolve, reject) => {
    let srcUrl: string;
    let shouldRevoke = false;

    if (typeof fileOrDataUrl === 'string') {
      srcUrl = fileOrDataUrl;
    } else {
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        srcUrl = URL.createObjectURL(fileOrDataUrl);
        shouldRevoke = true;
      } else {
        // Fallback for non-browser environments
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrDataUrl);
        return;
      }
    }

    // In a browser environment, use HTML Image and Canvas
    if (typeof Image !== 'undefined' && typeof document !== 'undefined') {
      const img = new Image();
      img.onload = () => {
        if (shouldRevoke) URL.revokeObjectURL(srcUrl);

        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(srcUrl);
          return;
        }

        // Center crop to square
        const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
        const startX = ((img.naturalWidth || img.width) - minSide) / 2;
        const startY = ((img.naturalHeight || img.height) - minSide) / 2;

        ctx.drawImage(
          img,
          startX,
          startY,
          minSide,
          minSide,
          0,
          0,
          targetSize,
          targetSize
        );

        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };

      img.onerror = (e) => {
        if (shouldRevoke) URL.revokeObjectURL(srcUrl);
        reject(new Error('Erreur lors du chargement de l’image'));
      };

      img.src = srcUrl;
    } else {
      // Fallback
      resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : DEFAULT_AVATAR_SILHOUETTE);
    }
  });
}

/**
 * Updates astronaut profile in IndexedDB and recalculates mission environment parameters
 */
export async function persistAstronautProfile(
  astronautId: string,
  updates: Partial<Astronaut>
): Promise<Astronaut> {
  const current = (await db.astronauts.get(astronautId)) || {
    id: astronautId,
    name: 'Astronaute',
    age: 40,
    sex: 'male' as const,
    weightKg: 75,
    mission: 'station' as const
  };

  const updated: Astronaut = {
    ...current,
    ...updates
  };

  // Keep comm delay synchronized if environment changes and user hasn't explicitly overwritten
  if (updates.mission && updates.commDelayMinutes === undefined) {
    updated.commDelayMinutes = ENVIRONMENT_COMM_DELAYS[updates.mission].nominalMin;
  }

  await db.astronauts.put(updated);
  return updated;
}
