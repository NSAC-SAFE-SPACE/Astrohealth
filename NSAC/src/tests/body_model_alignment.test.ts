import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { Box3, Quaternion, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bodyZoneMarkerTargets, normalizedBodyPoint, raycastBodyZoneMarker } from '../engine/config/bodyMarkers';
import { BODY_MODEL_METADATA, BODY_ZONE_CONFIG, type BodyZoneId } from '../engine/config/bodyZones';

async function loadModel() {
  const bytes = await readFile(new URL('../../public/models/human.glb', import.meta.url));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  gltf.scene.updateMatrixWorld(true);
  return gltf.scene;
}

describe('3D body marker alignment', () => {
  it('raycasts the five anatomical zone markers onto the provided GLB at expected height fractions', async () => {
    const model = await loadModel();
    const bounds = new Box3().setFromObject(model);
    const height = bounds.max.y - bounds.min.y;
    const center = bounds.getCenter(new Vector3());
    const scale = 1.75 / height;
    const expected: Array<[BodyZoneId, number]> = [
      ['head_eyes', 0.93], ['thorax', 0.73], ['abdomen', 0.59], ['pelvis_spine', 0.5], ['arms_hands', 0.57]
    ];

    for (const [zoneId, fraction] of expected) {
      const points = bodyZoneMarkerTargets(zoneId).map((target) => raycastBodyZoneMarker(model, target, zoneId));
      expect(points.length, `${zoneId} ray hits`).toBe(zoneId === 'arms_hands' ? 2 : 1);
      for (const point of points) {
        expect(point).not.toBeNull();
        const marker = point!;
        expect(marker.position.x).toBeGreaterThanOrEqual(bounds.min.x - 1e-4);
        expect(marker.position.x).toBeLessThanOrEqual(bounds.max.x + 1e-4);
        expect(marker.position.y).toBeGreaterThanOrEqual(bounds.min.y - 1e-4);
        expect(marker.position.y).toBeLessThanOrEqual(bounds.max.y + 1e-4);

        const hit = new Raycaster(new Vector3(marker.position.x, marker.position.y, 2), new Vector3(0, 0, -1))
          .intersectObject(model, true)[0];
        expect(hit).toBeDefined();
        expect(marker.position.distanceTo(hit.point)).toBeLessThan(0.02);

        const normalized = normalizedBodyPoint(marker.position, center, scale);
        const normalizedMinY = (bounds.min.y - center.y) * scale;
        const normalizedHeight = height * scale;
        const actualFraction = (normalized.y - normalizedMinY) / normalizedHeight;
        expect(Math.abs(actualFraction - fraction)).toBeLessThanOrEqual(0.04);
      }
    }

    const arms = bodyZoneMarkerTargets('arms_hands');
    expect(Math.abs(Math.abs(arms[0].x) / height - 0.37)).toBeLessThanOrEqual(0.04);
    expect(Math.abs(Math.abs(arms[1].x) / height - 0.37)).toBeLessThanOrEqual(0.04);

    const wholeBody = raycastBodyZoneMarker(model, bodyZoneMarkerTargets('whole_body')[0], 'whole_body');
    const abdomen = raycastBodyZoneMarker(model, bodyZoneMarkerTargets('abdomen')[0], 'abdomen');
    expect(wholeBody).not.toBeNull();
    expect(abdomen).not.toBeNull();
    expect(Math.abs(wholeBody!.position.x - abdomen!.position.x)).toBeGreaterThan(0.05 * height);
    expect(Math.abs(wholeBody!.position.y / height - 0.59)).toBeLessThanOrEqual(0.04);
  });

  it('keeps surface offsets attached under shared scale, zoom-independent local coordinates, and rotation', async () => {
    const model = await loadModel();
    const marker = raycastBodyZoneMarker(model, bodyZoneMarkerTargets('thorax')[0], 'thorax');
    expect(marker).not.toBeNull();
    const localHit = new Raycaster(new Vector3(marker!.position.x, marker!.position.y, 2), new Vector3(0, 0, -1)).intersectObject(model, true)[0].point;
    for (const scale of [0.65, 1, 1.8]) {
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
      const transformedMarker = marker!.position.clone().multiplyScalar(scale).applyQuaternion(rotation);
      const transformedHit = localHit.clone().multiplyScalar(scale).applyQuaternion(rotation);
      expect(transformedMarker.distanceTo(transformedHit)).toBeCloseTo(0.012 * scale, 3);
      const rearFacingNormal = marker!.normal.clone().applyQuaternion(rotation);
      expect(rearFacingNormal.dot(new Vector3(0, 0, 1))).toBeLessThan(0);
    }
    expect(BODY_ZONE_CONFIG.find((zone) => zone.id === 'whole_body')?.indicatorIds).toContain('temperature');
    expect(BODY_MODEL_METADATA.file).toBe('/models/human.glb');
  });
});
