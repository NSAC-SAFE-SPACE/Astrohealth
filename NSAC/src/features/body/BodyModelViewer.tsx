import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Environment } from '@react-three/drei/core/Environment.js';
import { Html } from '@react-three/drei/web/Html.js';
import { Lightformer } from '@react-three/drei/core/Lightformer.js';
import { OrbitControls } from '@react-three/drei/core/OrbitControls.js';
import { useGLTF } from '@react-three/drei/core/Gltf.js';
import { useProgress } from '@react-three/drei/core/Progress.js';
import { Box3, DoubleSide, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import type { Group, Object3D } from 'three';
import { bodyZoneMarkerTargets, raycastBodyZoneMarker, type BodySurfacePoint } from '../../engine/config/bodyMarkers';
import { BODY_MEASURE_CONFIG, getBodyIndicatorStatus, type BodyMeasureStatus } from '../../engine/config/bodyMeasures';
import { BODY_MODEL_METADATA, BODY_ZONE_CONFIG, type BodyHitVolume, type BodyZoneId } from '../../engine/config/bodyZones';
import { get_body_measures, type BodyMeasuresData } from '../../services/bodyMeasures';
import { useAstroStore } from '../../store/useAstroStore';

const STATUS_COLOR: Record<BodyMeasureStatus | 'missing', string> = {
  normal: '#23936a', watch: '#d18a00', action: '#c43f48', missing: '#9aa3af'
};
const MODEL_COLOR = '#d9dce1';

class SceneErrorBoundary extends React.Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, _info: ErrorInfo) { console.error('Échec du rendu du modèle corporel', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function LoadingLabel() {
  const { progress } = useProgress();
  return <Html center><div className="rounded-lg border border-slate-border bg-white/95 px-3 py-2 text-sm text-slate-text shadow-sm">Chargement du modèle… {Math.round(progress)}%</div></Html>;
}

function zoneStatus(zoneId: BodyZoneId, values: BodyMeasuresData | null): BodyMeasureStatus | 'missing' {
  if (!values) return 'missing';
  const zone = BODY_ZONE_CONFIG.find((item) => item.id === zoneId)!;
  const statuses = BODY_MEASURE_CONFIG.indicators.filter((indicator) => zone.indicatorIds.includes(indicator.id))
    .map((indicator) => getBodyIndicatorStatus(indicator, values)).filter((status): status is BodyMeasureStatus => status !== null);
  if (!statuses.length) return 'missing';
  if (statuses.includes('action')) return 'action';
  if (statuses.includes('watch')) return 'watch';
  return 'normal';
}

function HitShape({ volume, zoneId, debug, onSelect, onHover }: {
  volume: BodyHitVolume; zoneId: BodyZoneId; debug: boolean;
  onSelect: (zone: BodyZoneId) => void; onHover: (zone: BodyZoneId | null) => void;
}) {
  const invisible = { transparent: true, opacity: 0, colorWrite: false, depthWrite: false } as const;
  const wireframe = { color: '#e11d48', wireframe: true, depthTest: false, depthWrite: false, side: DoubleSide } as const;
  const events = {
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onHover(zoneId); },
    onPointerOut: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onHover(null); },
    onClick: (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(zoneId); }
  };

  if (volume.shape === 'sphere') return <mesh position={volume.center} renderOrder={debug ? 10 : 0} {...events}>
    <sphereGeometry args={[volume.radius, 18, 14]} /><meshBasicMaterial {...(debug ? wireframe : invisible)} />
  </mesh>;
  if (volume.shape === 'box') return <mesh position={volume.center} renderOrder={debug ? 10 : 0} {...events}>
    <boxGeometry args={volume.size} /><meshBasicMaterial {...(debug ? wireframe : invisible)} />
  </mesh>;

  const from = new Vector3(...volume.from);
  const to = new Vector3(...volume.to);
  const direction = to.clone().sub(from);
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
  const length = direction.length();
  return <mesh position={from.add(to).multiplyScalar(0.5)} quaternion={quaternion} renderOrder={debug ? 10 : 0} {...events}>
    <capsuleGeometry args={[volume.radius, Math.max(0.01, length - volume.radius * 2), 5, 10]} />
    <meshBasicMaterial {...(debug ? wireframe : invisible)} />
  </mesh>;
}

function SurfaceMarker({ surface, color, active, label, onSelect, onHover }: {
  surface: BodySurfacePoint; color: string; active: boolean; label?: string;
  onSelect: () => void; onHover: (hovered: boolean) => void;
}) {
  const markerRef = useRef<Group>(null);
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.updateWorldMatrix(true, false);
    const position = marker.getWorldPosition(new Vector3());
    const normal = surface.normal.clone().transformDirection(marker.matrixWorld);
    const toCamera = camera.position.clone().sub(position).normalize();
    marker.visible = normal.dot(toCamera) > 0.05;
  });

  return <group ref={markerRef} position={surface.position}>
    {active && <mesh><sphereGeometry args={[0.066, 18, 12]} /><meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} /></mesh>}
    <mesh onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(); }} onPointerOver={(event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onHover(true); }} onPointerOut={() => onHover(false)}>
      <sphereGeometry args={[0.034, 16, 12]} /><meshBasicMaterial color={color} depthTest />
    </mesh>
    {label && <Html position={[0.06, 0.05, 0]} distanceFactor={4} style={{ pointerEvents: 'none' }}>
      <span className="whitespace-nowrap rounded-md border border-slate-border bg-white/95 px-2 py-1 text-[11px] font-semibold text-slate-text">{label}</span>
    </Html>}
  </group>;
}

function ModelScene({ selectedZone, onZoneSelect, debug, values }: {
  selectedZone: BodyZoneId; onZoneSelect: (zone: BodyZoneId) => void; debug: boolean; values: BodyMeasuresData | null;
}) {
  const { scene } = useGLTF(BODY_MODEL_METADATA.file);
  const [hoveredZone, setHoveredZone] = useState<BodyZoneId | null>(null);
  const { model, center, fitScale, markers } = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node: Object3D) => {
      const mesh = node as Mesh;
      if (mesh.isMesh) {
        mesh.material = new MeshStandardMaterial({ color: MODEL_COLOR, roughness: 0.9, metalness: 0 });
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    const bounds = new Box3().setFromObject(clone);
    const midpoint = bounds.getCenter(new Vector3());
    const height = bounds.max.y - bounds.min.y;
    clone.updateMatrixWorld(true);
    const markers = new Map<BodyZoneId, BodySurfacePoint[]>();
    for (const zone of BODY_ZONE_CONFIG.filter((item) => item.access === 'model')) {
      markers.set(zone.id, bodyZoneMarkerTargets(zone.id).flatMap((target) => {
        const point = raycastBodyZoneMarker(clone, target, zone.id);
        return point ? [point] : [];
      }));
    }
    markers.set('whole_body', bodyZoneMarkerTargets('whole_body').flatMap((target) => {
      const point = raycastBodyZoneMarker(clone, target, 'whole_body');
      return point ? [point] : [];
    }));
    return { model: clone, center: midpoint, fitScale: height > 0 ? 1.75 / height : 1, markers };
  }, [scene]);

  return <>
    <ambientLight intensity={1.2} />
    <directionalLight position={[2.5, 4, 3]} intensity={1.4} />
    <directionalLight position={[-3, 1, -2]} intensity={0.45} />
    <Environment resolution={32} frames={1}>
      <Lightformer form="rect" intensity={1.1} position={[0, 3, 2]} scale={[4, 2, 1]} />
      <Lightformer form="rect" intensity={0.45} position={[-3, 0, -2]} scale={[3, 3, 1]} />
    </Environment>
    <group position={center.clone().multiplyScalar(-fitScale)} scale={fitScale}>
        {debug && <axesHelper args={[0.35]} position={[0, BODY_MODEL_METADATA.heightMeters / 2, 0]} />}
        <primitive object={model} />
        {BODY_ZONE_CONFIG.filter((zone) => zone.access === 'model').map((zone) => {
          const color = STATUS_COLOR[zoneStatus(zone.id, values)];
          const isActive = selectedZone === zone.id || hoveredZone === zone.id;
          return <group key={zone.id}>
            {zone.volumes.map((volume, index) => <HitShape key={`${zone.id}-${index}`} volume={volume} zoneId={zone.id} debug={debug} onSelect={onZoneSelect} onHover={setHoveredZone} />)}
            {(markers.get(zone.id) ?? []).map((surface, index) => <SurfaceMarker key={`${zone.id}-marker-${index}`} surface={surface} color={color} active={isActive} label={selectedZone === zone.id && index === 0 ? zone.label : undefined} onSelect={() => onZoneSelect(zone.id)} onHover={(hovered) => setHoveredZone(hovered ? zone.id : null)} />)}
          </group>;
        })}
        {(markers.get('whole_body') ?? []).map((surface, index) => <SurfaceMarker key={`whole-body-marker-${index}`} surface={surface} color={STATUS_COLOR[zoneStatus('whole_body', values)]} active={selectedZone === 'whole_body' || hoveredZone === 'whole_body'} label={selectedZone === 'whole_body' ? 'Corps entier · température incluse' : undefined} onSelect={() => onZoneSelect('whole_body')} onHover={(hovered) => setHoveredZone(hovered ? 'whole_body' : null)} />)}
    </group>
    <OrbitControls makeDefault target={[0, 0, 0]} enablePan={false} enableDamping={false} minDistance={2.2} maxDistance={5.8} minPolarAngle={0.08} maxPolarAngle={Math.PI - 0.08} />
  </>;
}

function CanvasFallback() {
  return <div className="flex h-full min-h-80 items-center justify-center p-6 text-center text-sm text-slate-muted">Le modèle 3D ne peut pas être rendu dans ce navigateur. Utilisez la liste des zones pour consulter les mesures.</div>;
}

export default function BodyModelViewer({ selectedZone, onZoneSelect }: { selectedZone: BodyZoneId; onZoneSelect: (zone: BodyZoneId) => void }) {
  const { astronaut, measurements } = useAstroStore();
  const matricule = astronaut.matricule ?? astronaut.id;
  const [values, setValues] = useState<BodyMeasuresData | null>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [debug, setDebug] = useState(false);
  const [sceneError, setSceneError] = useState(false);

  useEffect(() => {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    setWebglAvailable(Boolean(gl));
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }, []);

  useEffect(() => {
    let active = true;
    setValues(null);
    if (!matricule) return () => { active = false; };
    void get_body_measures(matricule).then((data) => { if (active) setValues(data); }).catch(() => { if (active) setValues(null); });
    return () => { active = false; };
  }, [matricule, measurements]);

  return <section className="overflow-hidden rounded-2xl border border-slate-border bg-white" aria-label="Modèle 3D interactif du corps humain">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-border px-4 py-4 sm:px-5">
      <div><p className="text-sm font-semibold text-primary">Modèle corporel</p><h2 className="font-serif text-xl font-bold">Tourner et sélectionner</h2><p className="mt-1 text-xs text-slate-muted">Glissez pour tourner · molette ou pincement pour zoomer</p></div>
      <button type="button" onClick={() => setDebug((current) => !current)} aria-pressed={debug} className="min-h-10 rounded-lg border border-slate-border px-3 py-2 text-xs font-semibold text-slate-muted hover:bg-surface">{debug ? 'Masquer les zones' : 'Voir les zones debug'}</button>
    </header>
    <div className="relative h-[26rem] bg-gradient-to-b from-slate-50 to-white sm:h-[32rem]">
      {webglAvailable === null && <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-slate-muted">Initialisation du rendu…</div>}
      {webglAvailable === false || sceneError ? <CanvasFallback /> : webglAvailable && <SceneErrorBoundary fallback={<CanvasFallback />}>
        <Canvas aria-label="Corps humain 3D, faites glisser pour le tourner" frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 3.4], fov: 36, near: 0.1, far: 30 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} onError={() => setSceneError(true)}>
          <Suspense fallback={<LoadingLabel />}>
            <ModelScene selectedZone={selectedZone} onZoneSelect={onZoneSelect} debug={debug} values={values} />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>}
    </div>
    <footer className="flex items-center justify-between gap-3 border-t border-slate-border px-4 py-3 text-xs text-slate-muted sm:px-5">
      <span>Faites aussi une sélection dans la liste accessible des zones.</span>
      <button type="button" onClick={() => onZoneSelect('whole_body')} className="min-h-10 shrink-0 rounded-lg border border-primary px-3 py-2 font-semibold text-primary hover:bg-primary/5">Corps entier</button>
    </footer>
  </section>;
}

useGLTF.preload(BODY_MODEL_METADATA.file);
