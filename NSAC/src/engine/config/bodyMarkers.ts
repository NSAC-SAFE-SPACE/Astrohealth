import { Raycaster, Vector3 } from 'three';
import { BODY_MODEL_METADATA, BODY_ZONE_CONFIG, type BodyHitVolume, type BodyZoneId } from './bodyZones';
import type { Object3D } from 'three';

export interface BodySurfacePoint {
  position: Vector3;
  normal: Vector3;
}

function volumeCenter(volume: BodyHitVolume): Vector3 {
  if (volume.shape === 'capsule') return new Vector3(...volume.from).add(new Vector3(...volume.to)).multiplyScalar(0.5);
  return new Vector3(...volume.center);
}

/** Raycast origins in the unnormalized GLB coordinate system (feet at y=0). */
export function bodyZoneMarkerTargets(zoneId: BodyZoneId): Vector3[] {
  if (zoneId === 'whole_body') return [new Vector3(BODY_MODEL_METADATA.heightMeters * 0.06, BODY_MODEL_METADATA.heightMeters * 0.59, 0)];
  const volumes = BODY_ZONE_CONFIG.find((zone) => zone.id === zoneId)?.volumes ?? [];
  if (zoneId === 'arms_hands') {
    return volumes.filter((volume) => volume.shape === 'capsule').filter((_, index) => index === 1 || index === 3)
      .map((volume) => new Vector3(...volume.to));
  }
  return volumes.slice(0, 1).map(volumeCenter);
}

/** Find the actual model surface for a zone marker, returning a point in model-local coordinates. */
export function raycastBodyZoneMarker(model: Object3D, target: Vector3, zoneId: BodyZoneId): BodySurfacePoint | null {
  const raycaster = new Raycaster(new Vector3(target.x, target.y, 2), new Vector3(0, 0, -1));
  const hit = raycaster.intersectObject(model, true)[0];
  if (!hit) {
    console.warn(`[BodyModelViewer] Aucun impact du marqueur ${zoneId} à`, target.toArray());
    return null;
  }
  const normal = hit.face?.normal.clone().transformDirection(hit.object.matrixWorld) ?? new Vector3(0, 0, 1);
  return { position: hit.point.clone().addScaledVector(normal, 0.012), normal };
}

export function normalizedBodyPoint(point: Vector3, center: Vector3, scale: number): Vector3 {
  return point.clone().sub(center).multiplyScalar(scale);
}

