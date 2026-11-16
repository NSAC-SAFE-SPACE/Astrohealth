export type DecorativeDoodleConfig = {
  enabled: boolean;
  maxDesktop: number;
  maxTablet: number;
  maxMobile: number;
  durationMs: readonly number[];
  pauseMs: readonly number[];
  maxOpacity: number;
  restingOpacity: number;
  focusedOpacity: number;
  reducedOpacity: number;
  safetyMargin: number;
  edgeMargin: number;
  minZoneSize: number;
  maxSize: number;
  minFreeSpace: number;
  selectionBias: number;
  dimOnAnyFocus: boolean;
};

export const DECORATIVE_DOODLE_CONFIG = {
  mental: {
    enabled: true,
    maxDesktop: 5,
    maxTablet: 3,
    maxMobile: 1,
    durationMs: [10_800, 12_600, 13_800],
    pauseMs: [2_500, 4_000],
    maxOpacity: 0.32,
    restingOpacity: 0.26,
    focusedOpacity: 0.025,
    reducedOpacity: 0.16,
    safetyMargin: 24,
    edgeMargin: 8,
    minZoneSize: 96,
    maxSize: 96,
    minFreeSpace: 120,
    selectionBias: 0.7,
    dimOnAnyFocus: true
  },
  body: {
    enabled: true,
    maxDesktop: 2,
    maxTablet: 1,
    maxMobile: 1,
    durationMs: [11_400, 12_600, 13_800],
    pauseMs: [3_000, 4_000],
    maxOpacity: 0.22,
    restingOpacity: 0.16,
    focusedOpacity: 0.025,
    reducedOpacity: 0.1,
    safetyMargin: 24,
    edgeMargin: 8,
    minZoneSize: 96,
    maxSize: 96,
    minFreeSpace: 96,
    selectionBias: 0.7,
    dimOnAnyFocus: false
  }
} satisfies Record<'mental' | 'body', DecorativeDoodleConfig>;
