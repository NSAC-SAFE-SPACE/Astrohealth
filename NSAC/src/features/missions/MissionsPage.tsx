import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAstroStore } from '../../store/useAstroStore';
import {
  Award,
  Flame,
  CheckCircle2,
  Circle,
  Dumbbell,
  Droplet,
  Moon,
  Sparkles,
  Rocket,
  Shield,
  Radio,
  Clock,
  Compass
} from 'lucide-react';
import type { MissionEnvironment } from '../../types';

export const MissionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    activityEvents,
    measurements,
    astronaut,
    logActivityEvent
  } = useAstroStore();

  // Register view event on mount
  useEffect(() => {
    logActivityEvent('view');
  }, [logActivityEvent]);

  // Dynamic streak calculation: consecutive days with state >= 1 ending today
  const todayStr = new Date().toISOString().split('T')[0];
  const eventMap = new Map<string, number>();
  activityEvents.forEach((ev) => {
    const current = eventMap.get(ev.date) || 0;
    if (ev.type === 'measurement') eventMap.set(ev.date, 2);
    else if (current < 1) eventMap.set(ev.date, 1);
  });

  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 140; i++) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000).toISOString().split('T')[0];
    const state = eventMap.get(d) || 0;
    if (state >= 1) {
      streak++;
    } else {
      break;
    }
  }

  const measurementCount = activityEvents.filter((e) => e.type === 'measurement').length;
  const hasMeasurementToday = (eventMap.get(todayStr) || 0) === 2;

  // 3 Today Missions with interactive toggle
  const [completedMissions, setCompletedMissions] = useState<Record<string, boolean>>({
    mission1: hasMeasurementToday,
    mission2: true, // Daily 2h workout logged by default
    mission3: false
  });

  const toggleMission = (id: string) => {
    setCompletedMissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const TODAY_MISSIONS = [
    {
      id: 'mission1',
      title: 'Auto-évaluation matinale des constantes vitales',
      desc: 'Enregistrer au moins une mesure au repos (pouls, tension artérielle ou température).',
      icon: Clock,
      tag: 'Physiologie',
      autoCompleted: hasMeasurementToday
    },
    {
      id: 'mission2',
      title: 'Contre-mesure physique : 2h d’entraînement ARED & T2',
      desc: 'Séance sur machine de musculation sous charge et tapis pour stimuler le squelette et le myocarde.',
      icon: Dumbbell,
      tag: 'Microgravité',
      autoCompleted: false
    },
    {
      id: 'mission3',
      title: 'Contrôle métabolique ou bilan bien-être OMS-5',
      desc: 'Saisir la glycémie capillaire ou évaluer la vitalité psychologique hebdomadaire.',
      icon: Droplet,
      tag: 'Régularité',
      autoCompleted: false
    }
  ];

  // Orbital Discipline Badges strictly tied to regularity and streak
  const BADGES = [
    {
      id: 'firstContact',
      unlocked: measurementCount >= 1,
      icon: Rocket,
      requirement: '≥ 1 mesure'
    },
    {
      id: 'lowOrbit',
      unlocked: streak >= 7,
      icon: Award,
      requirement: 'Série ≥ 7 jours'
    },
    {
      id: 'orbitalDiscipline',
      unlocked: streak >= 14,
      icon: Compass,
      requirement: 'Série ≥ 14 jours'
    },
    {
      id: 'lunarTrajectory',
      unlocked: streak >= 30,
      icon: Sparkles,
      requirement: 'Série ≥ 30 jours'
    },
    {
      id: 'martianEndurance',
      unlocked: streak >= 60,
      icon: Flame,
      requirement: 'Série ≥ 60 jours'
    },
    {
      id: 'guardian',
      unlocked: measurementCount >= 100,
      icon: Shield,
      requirement: '≥ 100 mesures'
    }
  ];

  // Operational reminder tailored to astronaut environment (F-09)
  const envKey = astronaut.mission as MissionEnvironment;
  const envReminder = (t(`missions.environmentReminders.${envKey}`, { returnObjects: true }) as {
    title: string;
    text: string;
  }) || {
    title: 'Protocole de bord',
    text: 'Respecter le planning d’auto-évaluation et d’exercice.'
  };

  return (
    <div className="space-y-10 sm:space-y-12 max-w-4xl mx-auto">
      {/* Title */}
      <section className="pb-4 border-b border-slate-border">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-text">
          {t('missions.title')}
        </h1>
        <p className="text-body-sm text-slate-muted max-w-prose mt-1">
          {t('missions.subtitle')}
        </p>
      </section>

      {/* 1. Streak Banner with Active Regularity Status */}
      <section className="bg-surface p-6 sm:p-8 rounded-2xl border border-slate-border flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-5">
          <div className="w-18 h-18 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-9 h-9" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
              {t('missions.currentStreak')}
            </div>
            <div className="font-serif text-3xl sm:text-4xl font-bold text-slate-text mt-0.5">
              {streak} {t('missions.days')}
            </div>
            <div className="text-xs text-slate-muted mt-1">
              {measurementCount} auto-évaluations enregistrées au total
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-muted text-center sm:text-right max-w-xs leading-relaxed">
          La régularité quotidienne garantit la précision des filtres de Kalman et alimente le rapport confidentiel du chirurgien de vol.
        </div>
      </section>

      {/* 2. Operational Environment Reminder Card (F-09) */}
      <section className="bg-primary-light/50 p-6 sm:p-7 rounded-2xl border border-primary/25 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          <Radio className="w-4 h-4 text-primary" />
          <span>{t('missions.environmentReminderTitle')} : {astronaut.mission.replace('_', ' ')}</span>
        </div>
        <h2 className="font-serif text-xl font-bold text-slate-text">
          {envReminder.title}
        </h2>
        <p className="text-sm text-slate-text leading-relaxed">
          {envReminder.text}
        </p>
      </section>

      {/* 3. Three Today's Missions (Max 3, strictly based on regularity) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-slate-text">
            {t('missions.todayMissions')}
          </h2>
          <span className="text-xs font-bold text-slate-muted uppercase tracking-wider">
            {Object.values(completedMissions).filter(Boolean).length} / 3 terminées
          </span>
        </div>

        <div className="space-y-3">
          {TODAY_MISSIONS.map((m) => {
            const isDone = !!completedMissions[m.id];
            const Icon = m.icon;

            return (
              <div
                key={m.id}
                onClick={() => toggleMission(m.id)}
                className={`min-h-[72px] p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isDone
                    ? 'bg-surface/50 border-slate-border/80 opacity-90'
                    : 'bg-white border-slate-border shadow-xs hover:border-primary/50'
                }`}
                role="checkbox"
                aria-checked={isDone}
                tabIndex={0}
                onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && toggleMission(m.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${isDone ? 'bg-slate-200 text-slate-500' : 'bg-primary-light text-primary'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-prose">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {m.tag}
                      </span>
                      <h3 className={`text-base font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-text'}`}>
                        {m.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-muted">{m.desc}</p>
                  </div>
                </div>

                <div className="shrink-0 p-1">
                  {isDone ? (
                    <CheckCircle2 className="w-7 h-7 text-status-normal" />
                  ) : (
                    <Circle className="w-7 h-7 text-slate-300 hover:text-primary transition-colors" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Orbital Discipline Badges (Strictly regularity-based) */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-bold text-slate-text">
            {t('missions.badgesTitle')}
          </h2>
          <p className="text-xs text-slate-muted">
            Attribués uniquement pour l’assiduité des enregistrements, sans jamais récompenser une valeur biologique particulière.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {BADGES.map((b) => {
            const Icon = b.icon;
            const badgeData = (t(`missions.badges.${b.id}`, { returnObjects: true }) as {
              name: string;
              desc: string;
            }) || { name: b.id, desc: '' };

            return (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                  b.unlocked
                    ? 'bg-white border-slate-border shadow-xs'
                    : 'bg-surface/50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      b.unlocked
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/25'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-serif text-base font-bold text-slate-text">
                        {badgeData.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-muted leading-relaxed">{badgeData.desc}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-border/60 flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-slate-muted">{b.requirement}</span>
                  {b.unlocked ? (
                    <span className="text-status-normal bg-status-normal/10 px-2 py-0.5 rounded-full font-bold">
                      Débloqué
                    </span>
                  ) : (
                    <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Verrouillé
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
