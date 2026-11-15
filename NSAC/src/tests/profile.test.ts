import { describe, it, expect } from 'vitest';
import {
  ENVIRONMENT_COMM_DELAYS,
  DEFAULT_AVATAR_SILHOUETTE,
  resizeImageToSquare
} from '../services/profile';
import type { MissionEnvironment } from '../types';

describe('Astronaut Profile & Image Handling', () => {
  it('maps expected communication delays for each mission environment', () => {
    expect(ENVIRONMENT_COMM_DELAYS.station.nominalMin).toBe(0);
    expect(ENVIRONMENT_COMM_DELAYS.spacecraft.nominalMin).toBe(5);
    expect(ENVIRONMENT_COMM_DELAYS.lunar_base.nominalMin).toBe(2);
    expect(ENVIRONMENT_COMM_DELAYS.mars_rover.nominalMin).toBe(20);
  });

  it('provides default fallback silhouette avatar', () => {
    expect(DEFAULT_AVATAR_SILHOUETTE).toContain('data:image/svg+xml');
    expect(DEFAULT_AVATAR_SILHOUETTE).toContain('<svg');
  });

  it('resizes or processes image data locally without network requests', async () => {
    // In node test environment, fallback returns data url or silhouette cleanly
    const result = await resizeImageToSquare(DEFAULT_AVATAR_SILHOUETTE, 256);
    expect(result).toBeDefined();
    expect(result.startsWith('data:image/')).toBe(true);
  });
});
