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
  Info
} from 'lucide-react';
import type { Status, Metric } from '../../types';

export const BodyPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    cardioScore,
    boneLossScore,
    radiationProjection,
    latestAssessments,
    measurements,
    astronaut
  } = useAstroStore();

  const [selectedZone, setSelectedZone] = useState<BodyZoneKey>('heart');
  const [viewMode, setViewMode] = useState<'body' | 'list'>('body');
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);

  // Set list view by default on smaller mobile screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('list');
    }
  }, []);

  // Compute status for each of the 5 zones
  const zoneStatuses: Record<BodyZoneKey, Status> = {
    heart: cardioScore?.status || 'normal',
    bone: boneLossScore?.status || 'normal',
    belly: latestAssessments.get('glucose')?.status || 'normal',
    skin: latestAssessments.get('temperature')?.status || 'normal',
    radiation: radiationProjection?.status || 'normal'
  };

  // Get zone specific data and explanations
  const getZoneContent = (zone: BodyZoneKey) => {
    switch (zone) {
      case 'heart':
        return {
          title: 'Cœur & Système cardiovasculaire',
          metricKey: 'heartRate' as Metric,
          status: zoneStatuses.heart,
          latestMeasure: `${cardioScore?.meanSys || 118} / 78 mmHg · ${cardioScore?.meanHr || 68} bpm`,
          forecast7d: '119 mmHg (fourchette : 115 - 124 mmHg)',
          isProjectionSimple: false,
          whatIsIt: 'Surveille la régulation de la pression artérielle et le débit cardiaque en impesanteur.',
          spaceEffect: 'En microgravité, les fluides corporels migrent vers la partie supérieure du corps, réduisant le volume plasmatique et augmentant le risque d’intolérance orthostatique au retour.',
          couplingInfluences: [
            'Sommeil court ou fragmenté des 3 derniers jours (+3 à 6 bpm).',
            'Séance quotidienne d’ergomètre ou tapis roulant (stabilisation de la tension de repos).',
            'Niveau de stress / charge mentale.'
          ],
          whatToDo: [
            'Maintenir 2h d’exercice physique par jour.',
            'Consommer la ration hydrique et électrolytique prescrite.',
            'Surveiller toute sensation de vertige lors des transitions posturales.'
          ],
          compositeScore: cardioScore
        };
      case 'bone':
        return {
          title: 'Os & Masse musculaire',
          metricKey: 'boneProxy' as Metric,
          status: zoneStatuses.bone,
          latestMeasure: boneLossScore ? `Perte moyenne : -${boneLossScore.value}% (${boneLossScore.meanRatePerMonth}%/mois)` : 'Densité de base conservée',
          forecast7d: 'Variation estimée à 30 jours : -0.2% (intervalle : -0.1% à -0.4%)',
          isProjectionSimple: false,
          whatIsIt: 'Évalue la déminéralisation du squelette porteur (rachis lombaire, col fémoral, hanche totale).',
          spaceEffect: 'L’absence de gravité supprime la contrainte mécanique sur les os, entraînant une résorption osseuse par les ostéoclastes supérieure à la formation osseuse.',
          couplingInfluences: [
            'Exercice sur machine de résistance (ARED) : ralentit significativement le déclin osseux.',
            'Apport régulier en calcium et vitamine D de bord.'
          ],
          whatToDo: [
            'Ne sauter aucune session d’exercice de musculation sous charge.',
            'Prendre le supplément quotidien de vitamine D3.',
            'Effectuer le bilan échographique/DXA programmé.'
          ],
          compositeScore: boneLossScore
        };
      case 'belly': {
        const glu = latestAssessments.get('glucose');
        return {
          title: 'Ventre & Métabolisme (Glycémie)',
          metricKey: 'glucose' as Metric,
          status: zoneStatuses.belly,
          latestMeasure: glu ? `${glu.value} ${astronaut.bloodGlucoseUnit || 'mg/dL'} (${glu.status})` : '88 mg/dL',
          forecast7d: '86 mg/dL (fourchette : 78 - 94 mg/dL)',
          isProjectionSimple: false,
          whatIsIt: 'Contrôle la régulation glucidique et la stabilité du métabolisme énergétique en orbite.',
          spaceEffect: 'La microgravité et le confinement peuvent induire une résistance transitoire à l’insuline et modifier la flore intestinale.',
          couplingInfluences: [
            'Apport glucidique des rations lyophilisées.',
            'Sommeil récupérateur : une dette de sommeil perturbe la tolérance au glucose.',
            'Dépense énergétique musculaire.'
          ],
          whatToDo: [
            'Privilégier les aliments à index glycémique bas.',
            'S’hydrater abondamment tout au long de la journée.',
            'Re-mesurer 2h après le prochain repas principal.'
          ],
          compositeScore: null
        };
      }
      case 'skin':
        return {
          title: 'Peau & Thermorégulation',
          metricKey: 'temperature' as Metric,
          status: zoneStatuses.skin,
          latestMeasure: '36.7 °C (tympanique)',
          forecast7d: '36.6 °C (fourchette : 36.4 - 36.9 °C)',
          isProjectionSimple: false,
          whatIsIt: 'Surveille la température corporelle centrale et les réponses immunitaires / inflammatoires.',
          spaceEffect: 'La transpiration ne s’évacue pas par convection naturelle en microgravité (effet « fièvre spatiale » pendant l’effort).',
          couplingInfluences: [
            'Ventilation locale de cabine.',
            'Intensité de l’entraînement physique récent.',
            'Hydratation cutanée et immunité.'
          ],
          whatToDo: [
            'Veiller au bon fonctionnement des ventilateurs de cabine personnelle.',
            'Bien s’éponger après l’exercice physique.',
            'Signaler toute sensation fébrile durable $\\ge 38$ °C au chirurgien de bord.'
          ],
          compositeScore: null
        };
      case 'radiation':
        return {
          title: 'Exposition aux Radiations',
          metricKey: 'radiationDose' as Metric,
          status: zoneStatuses.radiation,
          latestMeasure: radiationProjection ? `${radiationProjection.currentCumulative_mSv} mSv (Total carrière : ${radiationProjection.totalCareerDose_mSv} mSv)` : '35 mSv',
          forecast7d: radiationProjection ? `Projection à 30 jours : ${radiationProjection.projected30d.nominal} mSv (fourchette min/max observée : ${radiationProjection.projected30d.min} - ${radiationProjection.projected30d.max} mSv)` : '--',
          isProjectionSimple: true,
          whatIsIt: 'Dose cumulée de rayonnements ionisants (rayons cosmiques galactiques et vent solaire).',
          spaceEffect: 'Au-delà du bouclier magnétique terrestre, les rayonnements traversent la coque et augmentent les risques à long terme.',
          couplingInfluences: [
            'Environnement orbital / stellaire actuel (orbite basse vs espace profond).',
            'Activité solaire et éjections de masse coronale (SPE).'
          ],
          whatToDo: radiationProjection?.actions || [
            'Relever quotidiennement la dose affichée sur le dosimètre.',
            'En cas d’alerte éruption solaire (SPE), rejoindre sans délai la zone protégée (storm shelter).'
          ],
          compositeScore: radiationProjection
        };
    }
  };

  const currentContent = getZoneContent(selectedZone);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Title & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-border">
        <div>
          <h1 className="font-serif text-3xl font-bold text-slate-text">
            {t('body.title')}
          </h1>
          <p className="text-body-sm text-slate-muted max-w-prose">
            {t('body.selectZone')}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-slate-border self-start sm:self-auto">
          <button
            onClick={() => setViewMode('body')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
              viewMode === 'body'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-muted hover:text-slate-text'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{t('body.viewBody')}</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-muted hover:text-slate-text'
            }`}
          >
            <List className="w-4 h-4" />
            <span>{t('body.viewList')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Body Silhouette vs Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Silhouette (or List view) */}
        <div className="lg:col-span-5 bg-surface p-6 rounded-2xl border border-slate-border flex flex-col items-center justify-center">
          {viewMode === 'body' ? (
            <div className="w-full space-y-4">
              <div className="text-center text-xs text-slate-muted font-semibold uppercase tracking-wider">
                Silhouette interactive // Cliquez sur un organe
              </div>
              <Silhouette
                selectedZone={selectedZone}
                onSelectZone={(zone) => setSelectedZone(zone)}
                zoneStatuses={zoneStatuses}
              />
              {/* Quick selector pill row under silhouette */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {(['heart', 'bone', 'belly', 'skin', 'radiation'] as BodyZoneKey[]).map((zone) => {
                  const isSelected = selectedZone === zone;
                  return (
                    <button
                      key={zone}
                      onClick={() => setSelectedZone(zone)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-white text-slate-text border-slate-border hover:bg-slate-50'
                      }`}
                    >
                      {zone === 'heart'
                        ? 'Cœur'
                        : zone === 'bone'
                        ? 'Os'
                        : zone === 'belly'
                        ? 'Ventre'
                        : zone === 'skin'
                        ? 'Peau'
                        : 'Radiations'}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* List View */
            <div className="w-full space-y-2">
              {(['heart', 'bone', 'belly', 'skin', 'radiation'] as BodyZoneKey[]).map((zone) => {
                const content = getZoneContent(zone);
                const isSelected = selectedZone === zone;
                return (
                  <button
                    key={zone}
                    onClick={() => setSelectedZone(zone)}
                    className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-white border-primary shadow-xs ring-1 ring-primary'
                        : 'bg-white/60 border-slate-border hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-text">{content.title}</div>
                      <div className="text-xs text-slate-muted">{content.latestMeasure}</div>
                    </div>
                    <StatusBadge status={content.status} size="sm" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Comprehensive Detail Panel */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-border shadow-xs space-y-6">
          {/* Panel Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-border gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-text">
                {currentContent.title}
              </h2>
              <div className="text-sm text-slate-muted mt-1">
                {t('body.panel.lastMeasure')} : <strong className="text-slate-text font-semibold">{currentContent.latestMeasure}</strong>
              </div>
            </div>
            <StatusBadge status={currentContent.status} size="md" />
          </div>

          {/* 7-day Forecast / Projection */}
          <div className="p-4 rounded-xl bg-surface border border-slate-border space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
              <GitBranch className="w-4 h-4 text-primary" />
              <span>{t('body.panel.forecast7d')}</span>
            </div>
            <p className="text-body-sm font-semibold text-slate-text">
              {currentContent.forecast7d}
            </p>
            {currentContent.isProjectionSimple && (
              <p className="text-xs text-slate-muted italic pt-1">
                {t('body.panel.projectionNote')}
              </p>
            )}
          </div>

          {/* Composite score component breakdown (if applicable) */}
          {currentContent.compositeScore && 'components' in currentContent.compositeScore && (
            <div className="space-y-3 p-4 rounded-xl bg-surface/60 border border-slate-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  {t('body.panel.compositeDetails')}
                </span>
                <span className="text-xs font-medium text-slate-muted bg-white px-2 py-0.5 rounded-md border border-slate-border">
                  {currentContent.compositeScore.confidence === 'complete' ? t('body.panel.complete') : t('body.panel.partial')}
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                {currentContent.compositeScore.components.map((comp: any) => (
                  <div key={comp.key} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-text">
                      <span className="capitalize">{comp.key.replace(/_/g, ' ')}</span>
                      <span>{comp.value} / 100</span>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, comp.value))}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-muted leading-tight">{comp.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Physiological Coupling Influences */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-accent" />
              <span>{t('body.panel.influences')}</span>
            </div>
            <ul className="space-y-1.5">
              {currentContent.couplingInfluences.map((inf, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-text">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <span>{inf}</span>
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
            <ul className="space-y-1.5">
              {currentContent.whatToDo.map((act, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-text">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-normal mt-2 shrink-0" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom Action Button */}
          <div className="pt-2">
            <button
              onClick={() => setIsMeasureModalOpen(true)}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('body.panel.measureNow')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guided Measure Stepper Modal */}
      <MeasureModal
        isOpen={isMeasureModalOpen}
        onClose={() => setIsMeasureModalOpen(false)}
        initialMetric={currentContent.metricKey}
      />
    </div>
  );
};
