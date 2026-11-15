import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, ArrowRight, ArrowLeft, Heart, Activity, Thermometer, Droplet, Moon, ShieldAlert, Bone } from 'lucide-react';
import { useAstroStore } from '../store/useAstroStore';
import { StatusBadge } from './StatusBadge';
import { assessGlucose } from '../engine/scores/glucose';
import { assessMeasurement } from '../engine/status';
import {
  HeartRateForecaster,
  BloodPressureForecaster,
  TemperatureForecaster,
  GlucoseForecaster
} from '../engine';
import type { Metric, GlucoseContext, LatencyBucket, BoneSite, BoneMethod, Status, Assessment, ForecastResult } from '../types';
import { defaultSleepLogValues, SleepLogFields } from './SleepLogFields';

interface MeasureModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMetric?: Metric;
}

export const MeasureModal: React.FC<MeasureModalProps> = ({
  isOpen,
  onClose,
  initialMetric = 'heartRate'
}) => {
  const { t } = useTranslation();
  const { addMeasurement, addSleepLog, astronaut } = useAstroStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [metric, setMetric] = useState<Metric>(initialMetric);

  // General numeric value
  const [value, setValue] = useState<string>('72');
  const [bpDiaValue, setBpDiaValue] = useState<string>('80');

  // Glucose context
  const [glucoseContext, setGlucoseContext] = useState<GlucoseContext>('fasting');

  // Sleep dedicated fields
  const [sleepValues, setSleepValues] = useState(defaultSleepLogValues);

  // Result state
  const [resultAssessment, setResultAssessment] = useState<{
    status: Status;
    title: string;
    phrase1: string;
    phrase2: string;
    actions: string[];
    isAnomaly?: boolean;
    forecast?: ForecastResult | null;
  } | null>(null);
  const [completedMeasurements, setCompletedMeasurements] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setMetric(initialMetric);
    setValue('72');
    setBpDiaValue('80');
    setGlucoseContext('fasting');
    setSleepValues(defaultSleepLogValues);
    setResultAssessment(null);
    setCompletedMeasurements([]);
  }, [isOpen, initialMetric]);

  if (!isOpen) return null;

  const METRIC_OPTIONS: { id: Metric; label: string; unit: string; icon: any; protocol: string[] }[] = [
    {
      id: 'heartRate',
      label: 'Fréquence cardiaque',
      unit: 'bpm',
      icon: Heart,
      protocol: [
        'Asseyez-vous au calme pendant au moins 2 minutes.',
        'Placez le capteur ou vos deux doigts sur le pouls radial.',
        'Respirez calmement sans parler pendant le comptage.'
      ]
    },
    {
      id: 'bpSys',
      label: 'Pression artérielle',
      unit: 'mmHg',
      icon: Activity,
      protocol: [
        'Reposez votre bras sur le support à hauteur du cœur.',
        'Enfilez le brassard automatique sans serrer excessivement.',
        'Déclenchez la mesure en restant parfaitement immobile.'
      ]
    },
    {
      id: 'glucose',
      label: 'Glycémie capillaire',
      unit: astronaut.bloodGlucoseUnit || 'mg/dL',
      icon: Droplet,
      protocol: [
        'Désinfectez le bout du doigt et laissez sécher à l’air.',
        'Insérez la bandelette neuve dans le lecteur de glycémie.',
        'Déposez une goutte de sang et attendez le décompte (5 sec).'
      ]
    },
    {
      id: 'temperature',
      label: 'Température corporelle',
      unit: '°C',
      icon: Thermometer,
      protocol: [
        'Vérifiez la propreté de la sonde tympanique ou infrarouge.',
        'Placez la sonde délicatement dans le conduit auditif.',
        'Attendez le signal sonore de confirmation.'
      ]
    },
    {
      id: 'sleepQuality',
      label: 'Sommeil & Récupération',
      unit: '/100',
      icon: Moon,
      protocol: [
        'À remplir le matin au réveil dans votre couchette.',
        'Estimez vos heures effectives de sommeil et l’heure de coucher.',
        'Indiquez votre niveau d’énergie et la facilité d’endormissement.'
      ]
    },
    {
      id: 'radiationDose',
      label: 'Lecture du dosimètre (radiations)',
      unit: 'mSv',
      icon: ShieldAlert,
      protocol: [
        'Retirez le dosimètre actif de son clip de combinaison.',
        'Lisez la valeur de dose cumulée affichée sur l’écran LCD.',
        'Vérifiez l’absence de voyant de surcharge (flare).'
      ]
    }
  ];

  const currentOption = METRIC_OPTIONS.find((m) => m.id === metric) || METRIC_OPTIONS[0];

  const handleSave = async () => {
    let completedTitle = '';
    if (metric === 'sleepQuality') {
      await addSleepLog({
        date: new Date().toISOString().split('T')[0],
        ...sleepValues,
        latencyBucket: sleepValues.latencyBucket as LatencyBucket
      });

      completedTitle = `Sommeil : ${sleepValues.hours} h`;
      setResultAssessment({
        status: sleepValues.hours >= 7 ? 'normal' : sleepValues.hours >= 5.5 ? 'watch' : 'action',
        title: 'Nuit enregistrée avec succès',
        phrase1: `${sleepValues.hours} heures de repos enregistrées avec un ressenti de ${sleepValues.restfulness}/5.`,
        phrase2: 'La qualité de récupération a été intégrée à vos tendances physiologiques.',
        actions: [
          'Hydratez-vous dès le lever pour compenser la perte insensible.',
          'Conservez une routine d’éclairage circadien progressive.'
        ]
      });
    } else {
      const numVal = parseFloat(value);
      if (isNaN(numVal)) return;

      await addMeasurement(metric, numVal, currentOption.unit, metric === 'glucose' ? glucoseContext : undefined);

      let forecast: ForecastResult | null = null;
      if (metric === 'heartRate') {
        const f = new HeartRateForecaster(numVal);
        forecast = f.predict('7d');
      } else if (metric === 'bpSys') {
        const diaNum = parseFloat(bpDiaValue);
        if (!isNaN(diaNum)) {
          await addMeasurement('bpDia', diaNum, 'mmHg');
        }
        const f = new BloodPressureForecaster(numVal, isNaN(diaNum) ? 80 : diaNum);
        forecast = f.predict('7d');
      } else if (metric === 'temperature') {
        const f = new TemperatureForecaster(numVal);
        forecast = f.predict('7d');
      } else if (metric === 'glucose') {
        const f = new GlucoseForecaster(numVal);
        forecast = f.predict('7d');
      }

      if (metric === 'glucose') {
        const res = assessGlucose(numVal, glucoseContext, undefined, astronaut.bloodGlucoseUnit);
        completedTitle = `Glycémie : ${numVal} ${currentOption.unit}`;
        setResultAssessment({
          status: res.status,
          title: `Glycémie : ${numVal} ${currentOption.unit}`,
          phrase1: res.explanation,
          phrase2: `Mesure consignée dans le profil métabolique.`,
          actions: res.actions,
          isAnomaly: res.isPlausibilityAnomaly,
          forecast
        });
      } else {
        const res = assessMeasurement(metric, numVal);
        const titleText =
          metric === 'bpSys' && bpDiaValue
            ? `Pression artérielle : ${numVal} / ${bpDiaValue} mmHg`
            : `${currentOption.label} : ${numVal} ${currentOption.unit}`;
        completedTitle = titleText;

        setResultAssessment({
          status: res.status,
          title: titleText,
          phrase1: res.explanation,
          phrase2: 'Donnée synchronisée localement dans la télémétrie de bord.',
          actions: res.actions,
          forecast
        });
      }
    }
    setCompletedMeasurements((previous) => [...previous, completedTitle]);
    setStep(4);
  };

  const repeatCurrentMeasurement = () => {
    setResultAssessment(null);
    setValue(metric === 'bpSys' ? '120' : metric === 'temperature' ? '36.6' : metric === 'glucose' ? '85' : '72');
    setBpDiaValue('80');
    setGlucoseContext('fasting');
    setSleepValues(defaultSleepLogValues);
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-border flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-border flex items-center justify-between bg-surface">
          <div>
            <h2 className="font-serif text-xl font-bold text-slate-text">
              {t('measurementModal.title')}
            </h2>
            <p className="text-xs text-slate-muted">
              Étape {step} sur 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-muted hover:bg-slate-border/50 hover:text-slate-text transition-colors"
            aria-label={t('measurementModal.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* STEP 1: Choose metric */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-body font-semibold text-slate-text">
                {t('measurementModal.step1')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {METRIC_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = metric === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setMetric(opt.id);
                        if (opt.id === 'bpSys') setValue('120');
                        else if (opt.id === 'temperature') setValue('36.6');
                        else if (opt.id === 'glucose') setValue('85');
                        else if (opt.id === 'radiationDose') setValue('36.5');
                        else setValue('72');
                      }}
                      className={`min-h-[56px] p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary-light text-primary font-semibold'
                          : 'border-slate-border bg-white text-slate-text hover:bg-surface'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-surface text-slate-muted'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{opt.label}</div>
                        <div className="text-xs text-slate-muted">{opt.unit}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Protocol */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-border">
                <currentOption.icon className="w-6 h-6 text-primary" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-text">
                    Protocole de mesure : {currentOption.label}
                  </h3>
                  <p className="text-xs text-slate-muted">3 consignes à respecter</p>
                </div>
              </div>

              <div className="space-y-3">
                {currentOption.protocol.map((stepText, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-surface border border-slate-border">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-slate-text">{stepText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Entry form */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-body font-semibold text-slate-text">
                {t('measurementModal.step3')} : {currentOption.label}
              </h3>

              {metric === 'sleepQuality' ? (
                <SleepLogFields values={sleepValues} onChange={setSleepValues} />
              ) : (
                <div className="space-y-4">
                  {metric === 'glucose' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-text mb-1.5">
                        {t('measurementModal.glucoseContext')} (obligatoire)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['fasting', 'post_meal', 'random'] as GlucoseContext[]).map((ctx) => (
                          <button
                            key={ctx}
                            type="button"
                            onClick={() => setGlucoseContext(ctx)}
                            className={`p-2.5 rounded-lg border text-xs font-semibold text-center ${
                              glucoseContext === ctx
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-slate-text border-slate-border'
                            }`}
                          >
                            {ctx === 'fasting'
                              ? t('measurementModal.fasting')
                              : ctx === 'post_meal'
                              ? t('measurementModal.postMeal')
                              : t('measurementModal.random')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-text mb-1">
                      {metric === 'bpSys' ? 'Pression systolique (mmHg)' : `${t('measurementModal.enterValue')} (${currentOption.unit})`}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={metric === 'temperature' ? '0.1' : '1'}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full h-16 px-4 rounded-xl border border-slate-border text-3xl font-bold text-slate-text pr-16"
                        autoFocus
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-muted text-sm font-semibold">
                        {currentOption.unit}
                      </span>
                    </div>
                  </div>

                  {metric === 'bpSys' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-text mb-1">
                        Pression diastolique (mmHg)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          value={bpDiaValue}
                          onChange={(e) => setBpDiaValue(e.target.value)}
                          className="w-full h-16 px-4 rounded-xl border border-slate-border text-3xl font-bold text-slate-text pr-16"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-muted text-sm font-semibold">
                          mmHg
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Results */}
          {step === 4 && resultAssessment && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-border">
                <h3 className="font-serif text-lg font-bold text-slate-text">
                  {resultAssessment.title}
                </h3>
                <StatusBadge status={resultAssessment.status} />
              </div>

              {resultAssessment.isAnomaly && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-sm font-medium">
                  ⚠️ Contrôle de plausibilité : valeur inhabituelle détectée. Consignée avec demande de contre-mesure immédiate.
                </div>
              )}

              <div className="space-y-2 text-body-sm text-slate-text">
                <p>{resultAssessment.phrase1}</p>
                <p className="text-slate-muted">{resultAssessment.phrase2}</p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-xs uppercase tracking-wider font-semibold text-slate-muted">
                  Actions recommandées :
                </div>
                <div className="space-y-2">
                  {resultAssessment.actions.map((act, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-surface border border-slate-border text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              {resultAssessment.forecast && (
                <div className="p-4 rounded-xl bg-surface border border-slate-border space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                    Prévision physiologique à 7 jours
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-serif text-2xl font-bold text-slate-text">
                      ~{resultAssessment.forecast.value} {currentOption.unit}
                    </span>
                    <span className="text-xs text-slate-muted font-medium">
                      (fourchette estimée : {resultAssessment.forecast.low} à {resultAssessment.forecast.high} {currentOption.unit})
                    </span>
                  </div>
                  {resultAssessment.forecast.drivers.length > 0 && (
                    <p className="text-xs text-slate-muted italic pt-1">
                      {resultAssessment.forecast.drivers[0].explanation}
                    </p>
                  )}
                </div>
              )}

              {completedMeasurements.length > 1 && (
                <div className="rounded-xl border border-slate-border p-4 space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-muted">
                    Mesures enregistrées dans cette série
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-text">
                    {completedMeasurements.map((measurement, index) => (
                      <li key={`${index}-${measurement}`}>{measurement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 border-t border-slate-border bg-surface flex items-center justify-between">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep((prev) => (prev - 1) as any)}
              className="px-4 py-2.5 rounded-lg border border-slate-border text-slate-text font-medium text-sm flex items-center gap-2 hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('measurementModal.back')}
            </button>
          ) : (
            <div />
          )}

          {step < 3 && (
            <button
              onClick={() => setStep((prev) => (prev + 1) as any)}
              className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium text-sm flex items-center gap-2 hover:bg-primary-hover shadow-xs"
            >
              {t('measurementModal.next')}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium text-sm flex items-center gap-2 hover:bg-primary-hover shadow-xs"
            >
              <Check className="w-4 h-4" />
              {t('measurementModal.confirm')}
            </button>
          )}

          {step === 4 && (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => {
                  setResultAssessment(null);
                  setStep(1);
                }}
                className="px-4 py-2.5 rounded-lg border border-slate-border text-slate-text font-medium text-sm hover:bg-white"
              >
                {t('measurementModal.nextMetric')}
              </button>
              <button
                onClick={repeatCurrentMeasurement}
                className="px-4 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-hover shadow-xs"
              >
                {t('measurementModal.repeat')}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-slate-border text-slate-text font-medium text-sm hover:bg-white"
              >
                {t('measurementModal.finish')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
