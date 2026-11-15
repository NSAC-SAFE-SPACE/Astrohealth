import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MeasureModal } from '../../ui/MeasureModal';
import { useAstroStore } from '../../store/useAstroStore';
import type { Astronaut } from '../../types';
import { getSessionMatricule, getSessionUser, updateRegisteredUser } from './auth';
import { MentalPage } from '../mental/MentalPage';

export const InitialMeasurePage: React.FC = () => {
  const matricule = getSessionMatricule();
  const navigate = useNavigate();
  const { updateAstronautProfile } = useAstroStore();
  const [age, setAge] = useState(''); const [sex, setSex] = useState<Astronaut['sex'] | ''>('');
  const [height, setHeight] = useState(''); const [weight, setWeight] = useState('');
  const [step, setStep] = useState<1 | 2>(1); const [showMeasure, setShowMeasure] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  React.useEffect(() => { getSessionUser().then((user) => setSessionValid(Boolean(user))); }, []);
  if (!matricule || sessionValid === false) return <Navigate to="/auth" replace />;
  if (sessionValid === null) return null;
  const valid = Number(age) >= 18 && Number(age) <= 100 && sex !== '' && Number(height) >= 100 && Number(height) <= 250 && Number(weight) >= 30 && Number(weight) <= 300;
  const saveProfile = async () => {
    await updateRegisteredUser(matricule, { age: Number(age), sex: sex as Astronaut['sex'], weightKg: Number(weight), heightCm: Number(height), profileComplete: false });
    await updateAstronautProfile({ age: Number(age), sex: sex as Astronaut['sex'], weightKg: Number(weight), heightCm: Number(height), profileComplete: false });
    setStep(2);
  };
  const finish = async () => { await updateRegisteredUser(matricule, { profileComplete: true }); await updateAstronautProfile({ profileComplete: true }); navigate('/'); };
  return <main className="min-h-screen bg-surface p-5 sm:p-8"><div className="mx-auto max-w-3xl space-y-6"><section className="rounded-2xl border border-slate-border bg-white p-6 sm:p-9"><header><p className="text-sm font-semibold text-primary">Astrohealth · Première utilisation</p><h1 className="mt-2 font-serif text-3xl font-bold">Étape {step} sur 2</h1><div className="mt-4 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-primary transition-all" style={{ width: step === 1 ? '50%' : '100%' }}/></div></header>{step === 1 ? <div className="mt-6 space-y-5"><p className="text-slate-muted">Ces informations sont enregistrées une seule fois dans votre profil.</p><label className="block space-y-2">Âge (18–100 ans)<input type="number" min="18" max="100" value={age} onChange={(e) => setAge(e.target.value)} className="w-full rounded-lg border p-3"/></label><label className="block space-y-2">Sexe<select value={sex} onChange={(e) => setSex(e.target.value as Astronaut['sex'])} className="w-full rounded-lg border p-3"><option value="">Sélectionner</option><option value="female">Femme</option><option value="male">Homme</option></select></label><label className="block space-y-2">Taille (cm, 100–250)<input type="number" min="100" max="250" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full rounded-lg border p-3"/></label><label className="block space-y-2">Poids (kg, 30–300)<input type="number" min="30" max="300" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-lg border p-3"/></label><button disabled={!valid} onClick={saveProfile} className="w-full rounded-xl bg-primary py-3.5 font-semibold text-white disabled:opacity-50">Enregistrer et continuer</button></div> : <div className="mt-6 space-y-6"><p className="text-slate-muted">Commencez par une mesure physique, puis complétez le questionnaire Psyché avant de terminer.</p><button onClick={() => setShowMeasure(true)} className="rounded-xl bg-primary px-6 py-3 font-semibold text-white">Première mesure physique</button><div className="rounded-xl border border-slate-border p-5"><MentalPage /></div><button onClick={finish} className="w-full rounded-xl border border-primary py-3 font-semibold text-primary">Terminer et ouvrir l’accueil</button></div>}</section></div><MeasureModal isOpen={showMeasure} onClose={() => setShowMeasure(false)} /></main>;
};
