import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MissionEnvironment } from '../../types';
import { signIn, signUp } from './auth';
import { AstronautMascot } from '../../ui/AstronautMascot';
import { useAstroStore } from '../../store/useAstroStore';

const missions: { value: MissionEnvironment; label: string }[] = [
  { value: 'station', label: 'Station spatiale' }, { value: 'spacecraft', label: 'Vaisseau spatial' },
  { value: 'lunar_base', label: 'Base lunaire' }, { value: 'mars_rover', label: 'Mission martienne' }
];
export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState(''); const [matricule, setMatricule] = useState('');
  const [mission, setMission] = useState<MissionEnvironment | ''>(''); const [error, setError] = useState('');
  const [failures, setFailures] = useState(0); const [blockedUntil, setBlockedUntil] = useState(0); const [now, setNow] = useState(Date.now());
  const busy = now < blockedUntil;
  React.useEffect(() => { if (!busy) return; const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer); }, [busy]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!name.trim() || !matricule.trim() || !mission) { setError('Tous les champs sont obligatoires.'); return; }
    try {
      const user = tab === 'login' ? await signIn(name, matricule, mission as MissionEnvironment) : await signUp(name, matricule, mission as MissionEnvironment);
      await useAstroStore.getState().selectAstronautProfile(user.id);
      setFailures(0); navigate(user.profileComplete ? '/' : '/mesure-initiale');
    } catch (cause) {
      const next = failures + 1; setFailures(next); if (next >= 5) { setBlockedUntil(Date.now() + 30_000); setFailures(0); }
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue.');
    }
  };
  const inputClass = 'w-full rounded-xl border border-slate-border bg-white px-4 py-3.5 font-normal transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/40 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10';
  return <main className="relative isolate min-h-screen overflow-hidden bg-surface flex items-center justify-center p-5 sm:p-8"><div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"><div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl"/><div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-cyan-200/20 blur-3xl"/><div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(#174a70 0.7px, transparent 0.7px)', backgroundSize: '24px 24px' }}/></div><AstronautMascot/><section className="auth-card relative z-10 w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-7 shadow-[0_24px_80px_rgba(20,55,85,0.12)] backdrop-blur-sm sm:p-10"><header className="mb-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white font-serif text-2xl font-bold shadow-lg shadow-primary/20">A</div><h1 className="mt-4 font-serif text-3xl font-bold tracking-tight">Astrohealth</h1><p className="mt-1 text-sm text-slate-muted">Suivi de santé en mission</p></header><div role="tablist" aria-label="Accès au compte" className="mb-7 grid grid-cols-2 rounded-xl bg-surface p-1"><button id="tab-login" role="tab" aria-selected={tab === 'login'} aria-controls="auth-panel" type="button" onClick={() => { setTab('login'); setError(''); }} className={`rounded-lg py-3 font-semibold transition-all duration-200 ${tab === 'login' ? 'bg-white text-primary shadow-sm' : 'text-slate-muted hover:text-slate-text'}`}>Connexion</button><button id="tab-signup" role="tab" aria-selected={tab === 'signup'} aria-controls="auth-panel" type="button" onClick={() => { setTab('signup'); setError(''); }} className={`rounded-lg py-3 font-semibold transition-all duration-200 ${tab === 'signup' ? 'bg-white text-primary shadow-sm' : 'text-slate-muted hover:text-slate-text'}`}>Inscription</button></div><form id="auth-panel" role="tabpanel" aria-labelledby={tab === 'login' ? 'tab-login' : 'tab-signup'} onSubmit={submit} className="space-y-5"><label className="block space-y-2 text-sm font-semibold">Nom<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></label><label className="block space-y-2 text-sm font-semibold">Matricule<input autoComplete="username" value={matricule} onChange={(e) => setMatricule(e.target.value)} className={inputClass} required /></label><label className="block space-y-2 text-sm font-semibold">Mission spatiale<select value={mission} onChange={(e) => setMission(e.target.value as MissionEnvironment)} className={inputClass} required><option value="">Sélectionner une mission</option>{missions.map((m) => <option value={m.value} key={m.value}>{m.label}</option>)}</select></label>{error && <p role="alert" aria-live="polite" className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">{error}{busy ? ` Réessayez dans ${Math.ceil((blockedUntil - now) / 1000)} secondes.` : ''}</p>}<button disabled={!name.trim() || !matricule.trim() || !mission || busy} className="w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-md shadow-primary/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">{busy ? 'Veuillez patienter…' : tab === 'login' ? 'Se connecter' : 'Créer mon compte'}</button></form></section></main>;
};
