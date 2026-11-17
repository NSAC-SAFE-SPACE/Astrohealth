import React from 'react';
import { DecorativeDoodleLayer } from '../../ui/decorative/DecorativeDoodleLayer';
import { DECORATIVE_DOODLE_CONFIG } from '../../ui/decorative/decorationConfig';
import { BODY_DOODLES } from './BodyDoodles';
import type { BodyZoneId } from '../../engine/config/bodyZones';

export function BodyDecorativeLayer({ selectedZone, selectedIndicator, suspended }: {
  selectedZone: BodyZoneId | null;
  selectedIndicator?: string;
  suspended: boolean;
}) {
  return <DecorativeDoodleLayer
    items={BODY_DOODLES}
    config={DECORATIVE_DOODLE_CONFIG.body}
    strategy="free"
    selectedZone={selectedZone ?? undefined}
    selectedIndicator={selectedIndicator}
    persistentVisibility
    suspended={suspended}
  />;
}
