import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BodyMeasuresPanel } from './BodyMeasuresPanel';
import { BodyZonesPanel } from './BodyZonesPanel';
import type { BodyMeasureKey } from '../../engine/config/bodyMeasures';
import type { BodyZoneId } from '../../engine/config/bodyZones';
import { useAstroStore } from '../../store/useAstroStore';
import { buildBodyPrediction, getBodyKeyFromApiField } from '../../services/predictionCompleteness';
import { PredictionPanel } from '../../ui/PredictionPanel';

const BodyModelViewer = lazy(() => import('./BodyModelViewer'));

export const BodyPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const logActivityEvent = useAstroStore((state) => state.logActivityEvent);
  const { astronaut, measurements } = useAstroStore();
  const [focusFieldKey, setFocusFieldKey] = useState<BodyMeasureKey | null>(null);
  const [selectedZone, setSelectedZone] = useState<BodyZoneId>('thorax');

  useEffect(() => { logActivityEvent('view'); }, [logActivityEvent]);

  useEffect(() => {
    const requestedField = (location.state as { focusFieldKey?: BodyMeasureKey } | null)?.focusFieldKey;
    if (!requestedField) return;
    setFocusFieldKey(requestedField);
    window.setTimeout(() => document.getElementById('body-measures')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const requestMeasure = (key: BodyMeasureKey) => {
    setFocusFieldKey(key);
    window.setTimeout(() => document.getElementById('body-measures')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const prediction = useMemo(() => buildBodyPrediction(measurements, astronaut.id), [measurements, astronaut.id]);

  return <div className="mx-auto max-w-6xl space-y-7 sm:space-y-9">
    <header className="border-b border-slate-border pb-5">
      <h1 className="font-serif text-3xl font-bold text-slate-text sm:text-4xl">{t('body.title')}</h1>
      <p className="mt-2 max-w-prose text-body-sm text-slate-muted">Choisissez une zone pour consulter les indicateurs corporels mesurés et leur historique. Les données affichées sont celles du profil connecté.</p>
    </header>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
      <Suspense fallback={<section className="flex min-h-[28rem] items-center justify-center rounded-2xl border border-slate-border bg-white text-sm text-slate-muted">Chargement du modèle 3D…</section>}>
        <BodyModelViewer selectedZone={selectedZone} onZoneSelect={setSelectedZone} />
      </Suspense>
      <BodyZonesPanel onRequestMeasure={requestMeasure} selectedZone={selectedZone} onSelectZone={setSelectedZone} />
    </div>
    <BodyMeasuresPanel focusFieldKey={focusFieldKey} onFieldFocused={() => setFocusFieldKey(null)} />
    <PredictionPanel kind="body" astronautId={astronaut.id} payload={prediction.payload} missing={prediction.missing} total={13} onMissingField={(field) => {
      const key = getBodyKeyFromApiField(field.key);
      if (key) requestMeasure(key);
    }} />
  </div>;
};
