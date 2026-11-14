import React, { useState } from 'react';
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
  Clock,
  Sparkles
} from 'lucide-react';

export const MissionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { activityEvents } = useAstroStore();

  const [completedMissions, setCompletedMissions] = useState<Record<string, boolean>>({
    mission1: true,
    mission2: false,
    mission3: true
  });

  // Calculate streak from activity events
  const todayStr = new Date().toISOString().split('T')[0];
  const measurementCount = activityEvents.filter((e) => e.type === 'measurement').length;

  const toggleMission = (id: string) => {
    setCompletedMissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const TODAY_MISSIONS = [
    {
      id: 'mission1',
      title: 'Contre-mesure osseuse : 2h d’exercice de résistance',
      desc: 'Séance sur machine ARED pour stimuler la charge squelettique et limiter la résorption minérale.',
      icon: Dumbbell,
      tag: 'Physique'
    },
    {
      id: 'mission2',
      title: 'Enregistrement de la glycémie post-repas',
      desc: 'Contrôler la tolérance glucidique 2 heures après la ration du midi.',
      icon: Droplet,
      tag: 'Métabolisme'
    },
    {
      id: 'mission3',
      title: 'Auto-évaluation de la nuit au réveil',
      desc: 'Consigner les heures de sommeil, la latence et le ressenti d’énergie matinal.',
      icon: Moon,
      tag: 'Récupération'
    }
  ];

  const BADGES = [
    {
      id: 'b1',
      name: 'Régularité Lunaire',
      desc: '7 jours consécutifs avec au moins une auto-évaluation enregistrée.',
      unlocked: true,
      icon: Award
    },
    {
      id: 'b2',
      name: 'Discipline Martienne',
      desc: '30 jours consécutifs de protocole d’exercice et de mesures.',
      unlocked: true,
      icon: Flame
    },
    {
      id: 'b3',
      name: 'Sentinelle Circadienne',
      desc: '14 journaux de sommeil détaillés complétés avec régularité.',
      unlocked: false,
      icon: Clock
    },
    {
      id: 'b4',
      name: 'Maître de l’Impesanteur',
      desc: 'Assiduité exemplaire aux 3 missions quotidiennes pendant 10 jours.',
      unlocked: false,
      icon: Sparkles
    }
  ];

  return (
    <div className="space-y-12 max-w-4xl">
      {/* Title */}
      <div className="pb-4 border-b border-slate-border">
        <h1 className="font-serif text-3xl font-bold text-slate-text">
          {t('missions.title')}
        </h1>
        <p className="text-body-sm text-slate-muted max-w-prose">
          {t('missions.subtitle')}
        </p>
      </div>

      {/* Streak Callout Card */}
      <section className="bg-surface p-6 sm:p-8 rounded-2xl border border-slate-border flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-8 h-8" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
              {t('missions.currentStreak')}
            </div>
            <div className="font-serif text-3xl font-bold text-slate-text">
              18 {t('missions.days')}
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-muted text-center sm:text-right max-w-xs">
          Votre assiduité assure la robustesse du modèle prédictif et préserve votre santé en vol autonome.
        </div>
      </section>

      {/* 3 Today Missions (Max 3) */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-slate-text">
          {t('missions.todayMissions')}
        </h2>

        <div className="space-y-3">
          {TODAY_MISSIONS.map((m) => {
            const isDone = !!completedMissions[m.id];
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => toggleMission(m.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isDone
                    ? 'bg-surface/50 border-slate-border/80 opacity-90'
                    : 'bg-white border-slate-border shadow-xs hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${isDone ? 'bg-slate-200 text-slate-500' : 'bg-primary-light text-primary'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-prose">
                    <div className="flex items-center gap-2">
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

                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-6 h-6 text-status-normal" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300 hover:text-primary transition-colors" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Orbital Discipline Badges */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-slate-text">
          {t('missions.badgesTitle')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BADGES.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border flex items-start gap-4 transition-all ${
                  b.unlocked
                    ? 'bg-surface border-slate-border'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    b.unlocked
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-base font-bold text-slate-text">
                      {b.name}
                    </h3>
                    {b.unlocked && (
                      <span className="text-[10px] uppercase font-bold text-status-normal bg-status-normal/10 px-2 py-0.5 rounded-full">
                        Débloqué
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-muted leading-relaxed">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
