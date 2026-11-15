import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Layout } from './ui/Layout';
import { HomePage } from './features/home/HomePage';
import { BodyPage } from './features/body/BodyPage';
import { MentalPage } from './features/mental/MentalPage';
import { HistoryPage } from './features/history/HistoryPage';
import { MissionsPage } from './features/missions/MissionsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { useAstroStore } from './store/useAstroStore';
import { AuthPage } from './features/auth/AuthPage';
import { InitialMeasurePage } from './features/auth/InitialMeasurePage';
import { AUTH_LOGOUT_EVENT, getSessionMatricule, getSessionUser, clearSession, clearSessionFromAnotherTab } from './features/auth/auth';

const AuthGuard: React.FC = () => {
  const [valid, setValid] = React.useState<boolean | null>(null);
  const navigate = useNavigate();
  const resetForLogout = useAstroStore((state) => state.resetForLogout);
  useEffect(() => {
    let active = true;
    getSessionUser().then((user) => { if (active) { if (user && getSessionMatricule()) setValid(true); else { clearSession(); setValid(false); } } });
    const onLogout = () => { resetForLogout(); setValid(false); navigate('/auth', { replace: true }); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'astrohealth.logoutSignal' && event.newValue) clearSessionFromAnotherTab();
    };
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('astrohealth.auth') : null;
    channel?.addEventListener('message', (event) => { if (event.data?.type === 'logout') clearSessionFromAnotherTab(); });
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);
    window.addEventListener('storage', onStorage);
    return () => { active = false; channel?.close(); window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout); window.removeEventListener('storage', onStorage); };
  }, [navigate, resetForLogout]);
  return valid === null ? null : valid ? <Outlet /> : <Navigate to="/auth" replace />;
};

export const App: React.FC = () => {
  const { init, isLoading } = useAstroStore();

  useEffect(() => {
    init();
  }, [init]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white font-serif text-3xl font-bold shadow-md animate-pulse mb-4">
          A
        </div>
        <h1 className="font-serif text-2xl font-bold text-slate-text">Astrohealth</h1>
        <p className="text-sm text-slate-muted mt-1">Chargement de la télémétrie locale hors ligne...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<AuthGuard />}>
        <Route path="/mesure-initiale" element={<InitialMeasurePage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="corps" element={<BodyPage />} />
          <Route path="mental" element={<MentalPage />} />
          <Route path="historique" element={<HistoryPage />} />
          <Route path="missions" element={<MissionsPage />} />
          <Route path="reglages" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
