import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Silhouette, BodyZoneKey } from '../../ui/Silhouette';
import { StatusBadge } from '../../ui/StatusBadge';
import { MeasureModal } from '../../ui/MeasureModal';
import { useAstroStore } from '../../store/useAstroStore';
import {
  Heart,
  Shield,
  Droplet,
  Thermometer,
  Zap,
  List,
  Eye,
  PlusCircle,
  HelpCircle,
  Rocket,
  GitBranch,
  CheckCircle,
  Activity
} from 'lucide-react';
import {
  BloodPressureForecaster,
  HeartRateForecaster,
  GlucoseForecaster,
  TemperatureForecaster,
  BoneMassForecaster,
  ParentContextMap
} from '../../engine';
import type { Status, Metric } from '../../types';

export const BodyPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isFrench = i18n.language.startsWith('fr');

  const {
    cardioScore,
    boneLossScore,
    radiationProjection,
    latestAssessments,
    measurements,
    sleepLogs,
    astronaut,
    missionDay,
    logActivityEvent
  } = useAstroStore();

  const [selectedZone, setSelectedZone] = useState<BodyZoneKey>('heart');
  const [viewMode, setViewMode] = useState<'body' | 'list'>('body');
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);

  // Default to list view on mobile screens (< 768px)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('list');
    }
    // Register activity 'view' event for consulting body models
    logActivityEvent('view');
  }, [logActivityEvent]);

  // Log view when astronaut switches zones
  const handleSelectZone = (zone: BodyZoneKey) => {
    setSelectedZone(zone);
    logActivityEvent('view');
  };

  // Compute status for each of the 5 zones
  const zoneStatuses: Record<BodyZoneKey, Status> = {
    heart: cardioScore?.status || latestAssessments.get('heartRate')?.status || 'normal',
    bone: boneLossScore?.status || 'normal',
    belly: latestAssessments.get('glucose')?.status || 'normal',
    skin: latestAssessments.get('temperature')?.status || 'normal',
    radiation: radiationProjection?.status || 'normal'
  };

  // Build parent coupling context map from latest state
  const latestSleep = sleepLogs.length > 0 ? sleepLogs[sleepLogs.length - 1].hours : 7.5;
  const latestHr = latestAssessments.get('heartRate')?.value || cardioScore?.meanHr || 68;
  const latestSys = latestAssessments.get('bpSys')?.value || cardioScore?.meanSys || 118;
  const latestDia = latestAssessments.get('bpDia')?.value || 78;
  const latestTemp = latestAssessments.get('temperature')?.value || 36.7;
  const latestGlu = latestAssessments.get('glucose')?.value || 88;

  const parentsContext: ParentContextMap = {
    sleep: { value: latestSleep, unit: 'h' },
    exercise: { value: 60, unit: 'min' },
    mood: { value: 72, unit: '/100' },
    temperature: { value: latestTemp, unit: '°C' },
    heartRate: { value: latestHr, unit: 'bpm' },
    bloodPressure: { value: latestSys, unit: 'mmHg' }
  };

  // Dynamic zone content with forecasters and coupling
  const getZoneContent = (zone: BodyZoneKey) => {
    switch (zone) {
      case 'heart': {
        const bpForecaster = new BloodPressureForecaster(latestSys, latestDia);
        const bpPred = bpForecaster.predict('7d', parentsContext);
        const hrForecaster = new HeartRateForecaster(latestHr);
        const hrPred = hrForecaster.predict('7d', parentsContext);

        const drivers = [...bpPred.drivers, ...hrPred.drivers];
        const influences = drivers.length > 0
          ? drivers.map((d) => (isFrench ? d.explanation : d.explanationEn || d.explanation))
          : [
              isFrench
                ? 'Sommeil régulier : stabilisation du tonus cardiovasculaire.'
                : 'Regular sleep: cardiovascular stabilization.',
              isFrench
                ? 'Séance quotidienne de tapis ou ergomètre : maintien de la contractilité cardiaque.'
                : 'Daily treadmill or cycle session: maintenance of cardiac contractility.'
            ];

        return {
          zoneKey: 'heart' as BodyZoneKey,
          title: t('body.zones.heart'),
          metricKey: 'heartRate' as Metric,
          status: zoneStatuses.heart,
          latestMeasure: `${latestSys} / ${latestDia} mmHg · ${latestHr} bpm`,
          forecast7d: isFrench
            ? `~${bpPred.value} / ${latestDia} mmHg (fourchette : ${bpPred.low} à ${bpPred.high} mmHg) · ~${hrPred.value} bpm`
            : `~${bpPred.value} / ${latestDia} mmHg (range: ${bpPred.low} to ${bpPred.high} mmHg) · ~${hrPred.value} bpm`,
          isProjectionSimple: false,
          whatIsIt: t('body.zoneDetails.heart.whatIsIt'),
          spaceEffect: t('body.zoneDetails.heart.spaceEffect'),
          couplingInfluences: influences,
          whatToDo: t('body.zoneDetails.heart.whatToDo', { returnObjects: true }) as string[],
          compositeScore: cardioScore
        };
      }

      case 'bone': {
        const boneForecaster = new BoneMassForecaster(missionDay, 60);
        const bonePred = boneForecaster.predict('30d');

        const influences = bonePred.drivers.length > 0
          ? bonePred.drivers.map((d) => (isFrench ? d.explanation : d.explanationEn || d.explanation))
          : [
              isFrench
                ? 'Exercice sous charge ARED : ralentissement majeur de la résorption osseuse.'
                : 'ARED resistive exercise: major dampening of bone resorption.',
              isFrench
                ? 'Supplémentation en vitamine D3 et apport calcique équilibré.'
                : 'Vitamin D3 supplementation and balanced calcium intake.'
            ];

        return {
          zoneKey: 'bone' as BodyZoneKey,
          title: t('body.zones.bone'),
          metricKey: 'boneProxy' as Metric,
          status: zoneStatuses.bone,
          latestMeasure: boneLossScore
            ? isFrench
              ? `Perte moyenne : -${boneLossScore.value}% (${boneLossScore.meanRatePerMonth}%/mois)`
              : `Average loss: -${boneLossScore.value}% (${boneLossScore.meanRatePerMonth}%/month)`
            : isFrench
            ? 'Densité minérale de base conservée'
            : 'Nominal baseline density preserved',
          forecast7d: isFrench
            ? `Projection à 30 jours : -${bonePred.value}% (fourchette : -${bonePred.low}% à -${bonePred.high}%)`
            : `30-day projection: -${bonePred.value}% (range: -${bonePred.low}% to -${bonePred.high}%)`,
          isProjectionSimple: false,
          whatIsIt: t('body.zoneDetails.bone.whatIsIt'),
          spaceEffect: t('body.zoneDetails.bone.spaceEffect'),
          couplingInfluences: influences,
          whatToDo: t('body.zoneDetails.bone.whatToDo', { returnObjects: true }) as string[],
          compositeScore: boneLossScore
        };
      }

      case 'belly': {
        const gluForecaster = new GlucoseForecaster(latestGlu);
        const gluPred = gluForecaster.predict('7d', parentsContext);
        const unit = astronaut.bloodGlucoseUnit || 'mg/dL';

        const influences = gluPred.drivers.length > 0
          ? gluPred.drivers.map((d) => (isFrench ? d.explanation : d.explanationEn || d.explanation))
          : [
              isFrench
                ? 'Apports réguliers des rations alimentaires spatiales lyophilisées.'
                : 'Regular nutritional intake from spaceflight lyophilized rations.',
              isFrench
                ? 'Qualité de la récupération nocturne et sensibilité à l’insuline.'
                : 'Nocturnal rest quality and insulin sensitivity.'
            ];

        return {
          zoneKey: 'belly' as BodyZoneKey,
          title: t('body.zones.belly'),
          metricKey: 'glucose' as Metric,
          status: zoneStatuses.belly,
          latestMeasure: `${latestGlu} ${unit}`,
          forecast7d: isFrench
            ? `~${gluPred.value} ${unit} (fourchette : ${gluPred.low} à ${gluPred.high} ${unit})`
            : `~${gluPred.value} ${unit} (range: ${gluPred.low} to ${gluPred.high} ${unit})`,
          isProjectionSimple: false,
          whatIsIt: t('body.zoneDetails.belly.whatIsIt'),
          spaceEffect: t('body.zoneDetails.belly.spaceEffect'),
          couplingInfluences: influences,
          whatToDo: t('body.zoneDetails.belly.whatToDo', { returnObjects: true }) as string[],
          compositeScore: null
        };
      }

      case 'skin': {
        const tempForecaster = new TemperatureForecaster(latestTemp);
        const tempPred = tempForecaster.predict('7d', parentsContext);

        const influences = tempPred.drivers.length > 0
          ? tempPred.drivers.map((d) => (isFrench ? d.explanation : d.explanationEn || d.explanation))
          : [
              isFrench
                ? 'Rythme circadien veille/sommeil (amplitude physiologique journalière ±0,35 °C).'
                : 'Circadian wake/sleep cycle (daily physiological amplitude ±0.35 °C).',
              isFrench
                ? 'Évacuation thermique par les ventilateurs de cabine personnelle.'
                : 'Convective heat dissipation through crew quarters ventilation.'
            ];

        return {
          zoneKey: 'skin' as BodyZoneKey,
          title: t('body.zones.skin'),
          metricKey: 'temperature' as Metric,
          status: zoneStatuses.skin,
          latestMeasure: `${latestTemp} °C`,
          forecast7d: isFrench
            ? `~${tempPred.value} °C (fourchette : ${tempPred.low} à ${tempPred.high} °C)`
            : `~${tempPred.value} °C (range: ${tempPred.low} to ${tempPred.high} °C)`,
          isProjectionSimple: false,
          whatIsIt: t('body.zoneDetails.skin.whatIsIt'),
          spaceEffect: t('body.zoneDetails.skin.spaceEffect'),
          couplingInfluences: influences,
          whatToDo: t('body.zoneDetails.skin.whatToDo', { returnObjects: true }) as string[],
          compositeScore: null
        };
      }

      case 'radiation': {
        const currentMsv = radiationProjection ? radiationProjection.currentCumulative_mSv : 35.4;
        const careerMsv = radiationProjection ? radiationProjection.totalCareerDose_mSv : 124.2;
        const projNom = radiationProjection ? radiationProjection.projected30d.nominal : 42.1;
        const projMin = radiationProjection ? radiationProjection.projected30d.min : 39.5;
        const projMax = radiationProjection ? radiationProjection.projected30d.max : 45.0;

        return {
          zoneKey: 'radiation' as BodyZoneKey,
          title: t('body.zones.radiation'),
          metricKey: 'radiationDose' as Metric,
          status: zoneStatuses.radiation,
          latestMeasure: isFrench
            ? `${currentMsv} mSv (Total carrière : ${careerMsv} mSv)`
            : `${currentMsv} mSv (Career total: ${careerMsv} mSv)`,
          forecast7d: isFrench
            ? `Projection à 30 jours : ~${projNom} mSv (fourchette : ${projMin} à ${projMax} mSv)`
            : `30-day projection: ~${projNom} mSv (range: ${projMin} to ${projMax} mSv)`,
          isProjectionSimple: true,
          whatIsIt: t('body.zoneDetails.radiation.whatIsIt'),
          spaceEffect: t('body.zoneDetails.radiation.spaceEffect'),
          couplingInfluences: [
            isFrench
              ? 'Environnement orbital actuel (flux continu de rayons cosmiques galactiques GCR).'
              : 'Current orbital trajectory (continuous galactic cosmic ray GCR background).',
            isFrench
              ? 'Activité de la couronne solaire et surveillance des éjections coronales.'
              : 'Solar corona activity and coronal mass ejection alert surveillance.'
          ],
          whatToDo: t('body.zoneDetails.radiation.whatToDo', { returnObjects: true }) as string[],
          compositeScore: radiationProjection
        };
      }
    }
  };

  const currentContent = getZoneContent(selectedZone);

  const ZONE_LIST: BodyZoneKey[] = ['heart', 'bone', 'belly', 'skin', 'radiation'];

  return (
    <div className="space-y-8 sm:space-y-10 max-w-5xl mx-auto">
      {/* Header & View Mode Switcher */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-border">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-text">
            {t('body.title')}
          </h1>
          <p className="text-body-sm text-slate-muted max-w-prose mt-1">
            {t('body.selectZone')}
          </p>
        </div>

        {/* View Toggle: Body View / List View (List default on mobile) */}
        <div className="flex items-center gap-1.5 p-1 bg-surface rounded-xl border border-slate-border self-start sm:self-auto">
          <button
            onClick={() => setViewMode('body')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
              viewMode === 'body'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-muted hover:text-slate-text'
            }`}
            aria-pressed={viewMode === 'body'}
          >
            <Eye className="w-4 h-4" />
            <span>{t('body.viewBody')}</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-muted hover:text-slate-text'
            }`}
            aria-pressed={viewMode === 'list'}
          >
            <List className="w-4 h-4" />
            <span>{t('body.viewList')}</span>
          </button>
        </div>
      </section>

      {/* Main Grid: Silhouette/List column + Lateral Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Silhouette or List selector */}
        <div className="lg:col-span-5 bg-surface p-6 rounded-2xl border border-slate-border flex flex-col items-center justify-center">
          {viewMode === 'body' ? (
            <div className="w-full space-y-4">
              <div className="text-center text-xs text-slate-muted font-semibold uppercase tracking-wider">
                {isFrench ? 'Silhouette interactive // Touchez une zone' : 'Interactive Silhouette // Select an organ'}
              </div>

              {/* Interactive Vector Silhouette with click targets */}
              <Silhouette
                selectedZone={selectedZone}
                onSelectZone={handleSelectZone}
                zoneStatuses={zoneStatuses}
              />

              {/* Quick organ chips row under silhouette */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {ZONE_LIST.map((zone) => {
                  const isSelected = selectedZone === zone;
                  const label =
                    zone === 'heart'
                      ? 'Cœur'
                      : zone === 'bone'
                      ? 'Os'
                      : zone === 'belly'
                      ? 'Ventre'
                      : zone === 'skin'
                      ? 'Peau'
                      : 'Radiations';
                  return (
                    <button
                      key={zone}
                      onClick={() => handleSelectZone(zone)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-white text-slate-text border-slate-border hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* List View (default on mobile) */
            <div className="w-full space-y-3">
              {ZONE_LIST.map((zone) => {
                const content = getZoneContent(zone);
                const isSelected = selectedZone === zone;
                const Icon =
                  zone === 'heart'
                    ? Heart
                    : zone === 'bone'
                    ? Shield
                    : zone === 'belly'
                    ? Droplet
                    : zone === 'skin'
                    ? Thermometer
                    : Zap;

                return (
                  <button
                    key={zone}
                    onClick={() => handleSelectZone(zone)}
                    className={`w-full min-h-[56px] p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-white border-primary shadow-xs ring-2 ring-primary/20'
                        : 'bg-white/70 border-slate-border hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-surface text-primary'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-text">{content.title}</div>
                        <div className="text-xs text-slate-muted">{content.latestMeasure}</div>
                      </div>
                    </div>
                    <StatusBadge status={content.status} size="sm" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Lateral Detail Panel */}
        <section
          aria-labelledby="zone-panel-heading"
          className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-border shadow-xs space-y-6"
        >
          {/* Panel Header: Title + Latest measurement + Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-border gap-3">
            <div>
              <h2 id="zone-panel-heading" className="font-serif text-2xl font-bold text-slate-text">
                {currentContent.title}
              </h2>
              <div className="text-sm text-slate-muted mt-1">
                {t('body.panel.lastMeasure')} : <strong className="text-slate-text font-semibold">{currentContent.latestMeasure}</strong>
              </div>
            </div>
            <StatusBadge status={currentContent.status} size="md" />
          </div>

          {/* 7-day Forecast with confidence interval */}
          <div className="p-4 rounded-xl bg-surface border border-slate-border space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
              <Activity className="w-4 h-4 text-primary" />
              <span>{t('body.panel.forecast7d')}</span>
            </div>
            <p className="text-body font-semibold text-slate-text">
              {currentContent.forecast7d}
            </p>
            {currentContent.isProjectionSimple && (
              <p className="text-xs text-slate-muted italic pt-1">
                {t('body.panel.projectionNote')}
              </p>
            )}
          </div>

          {/* Clinical Purpose & Spaceflight Effect */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-border bg-surface/50 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span>{t('body.panel.whatIsIt')}</span>
              </div>
              <p className="text-sm text-slate-text leading-relaxed">
                {currentContent.whatIsIt}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-border bg-surface/50 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
                <Rocket className="w-4 h-4 text-primary" />
                <span>{t('body.panel.spaceEffect')}</span>
              </div>
              <p className="text-sm text-slate-text leading-relaxed">
                {currentContent.spaceEffect}
              </p>
            </div>
          </div>

          {/* Physiological Coupling Influences (from coupling.json & forecasters) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-accent" />
              <span>{t('body.panel.influences')}</span>
            </div>
            <ul className="space-y-2">
              {currentContent.couplingInfluences.map((inf, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-surface border border-slate-border/80 text-sm text-slate-text">
                  <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{inf}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actionable Guidance (Que faire) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-status-normal" />
              <span>{t('body.panel.whatToDo')}</span>
            </div>
            <ul className="space-y-2">
              {currentContent.whatToDo.map((act, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-surface border border-slate-border/80 text-sm text-slate-text">
                  <span className="w-2 h-2 rounded-full bg-status-normal mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{act}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Button: "Faire une mesure" */}
          <div className="pt-2">
            <button
              onClick={() => setIsMeasureModalOpen(true)}
              className="w-full min-h-[52px] px-6 py-3.5 rounded-xl bg-primary text-white font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary-hover shadow-xs transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{t('body.panel.measureNow')}</span>
            </button>
          </div>
        </section>
      </div>

      {/* Guided Measure Stepper Modal (pre-selected with this zone's metric) */}
      <MeasureModal
        isOpen={isMeasureModalOpen}
        onClose={() => setIsMeasureModalOpen(false)}
        initialMetric={currentContent.metricKey}
      />
    </div>
  );
};
