import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  User,
  Brain,
  TrendingUp,
  Target,
  Settings,
  PlusCircle,
  Globe,
  Radio,
  LogOut
} from 'lucide-react';
import { useAstroStore } from '../store/useAstroStore';
import { changeLanguage } from '../i18n';
import { MeasureModal } from './MeasureModal';
import { clearSession, getSessionMatricule } from '../features/auth/auth';
import type { Metric } from '../types';

export const Layout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { astronaut, mentalDraftActive } = useAstroStore();
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);
  const [initialMeasureMetric, setInitialMeasureMetric] = useState<Metric>('heartRate');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('fr') ? 'en' : 'fr';
    changeLanguage(newLang);
  };

  const openMeasure = (metric: Metric = 'heartRate') => {
    setInitialMeasureMetric(metric);
    setIsMeasureModalOpen(true);
  };

  const navItems = [
    { to: '/', label: t('nav.home'), icon: Home },
    { to: '/corps', label: t('nav.body'), icon: User },
    { to: '/mental', label: t('nav.mental'), icon: Brain },
    { to: '/historique', label: t('nav.history'), icon: TrendingUp },
    { to: '/missions', label: t('nav.missions'), icon: Target }
  ];

  const accountControl = <div className="relative">
    <button type="button" aria-label={`Compte de ${astronaut.name}`} aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)} className="flex max-w-[14rem] items-center gap-2 rounded-xl border border-slate-border bg-white px-3 py-2 text-left hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-light font-semibold text-primary">{astronaut.name.slice(0, 1).toUpperCase() || 'A'}</span>
      <span className="hidden min-w-0 sm:block"><span className="block truncate text-sm font-semibold">{astronaut.name}</span><span className="block truncate text-xs text-slate-muted">{astronaut.matricule ?? getSessionMatricule()}</span></span>
    </button>
    {profileMenuOpen && <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-border bg-white p-2 shadow-lg">
      <div className="border-b border-slate-border px-3 py-2"><p className="truncate text-sm font-semibold">{astronaut.name}</p><p className="truncate text-xs text-slate-muted">Matricule : {astronaut.matricule ?? getSessionMatricule()}</p></div>
      <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setLogoutConfirmOpen(true); }} className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-text hover:bg-surface"><LogOut className="h-4 w-4"/>Se déconnecter</button>
    </div>}
  </div>;

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row text-slate-text">
      {/* Desktop Sidebar (w-72) */}
      <aside className="hidden md:flex flex-col justify-between w-72 bg-surface border-r border-slate-border p-6 fixed inset-y-0 left-0 z-30 select-none">
        <div className="space-y-8">
          {/* Logo & Call sign */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-serif font-bold text-xl shadow-xs">
              A
            </div>
            <div>
              <div className="font-serif font-bold text-lg text-slate-text tracking-tight flex items-center gap-2">
                Astrohealth
                <span className="w-2 h-2 rounded-full bg-status-normal inline-block" />
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                <span className="block">{astronaut.mission.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Quick measurement button */}
          <button
            onClick={() => openMeasure()}
            className="w-full h-12 px-4 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors shadow-xs"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{t('home.measureButton')}</span>
          </button>

          {/* Navigation Links (5 entries) */}
          <nav className="space-y-1.5" aria-label="Menu principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all min-h-[48px] ${
                    isActive
                      ? 'bg-primary-light text-primary font-semibold border-l-4 border-primary'
                      : 'text-slate-text hover:bg-white hover:text-primary'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom items: discreet settings, language switch, comm status */}
        <div className="space-y-4 pt-4 border-t border-slate-border">
          <div className="flex items-center justify-between text-xs text-slate-muted px-2">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-accent" />
              <span>Délai Terre : {astronaut.commDelayMinutes || 0} min</span>
            </div>
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1 rounded-md border border-slate-border hover:bg-white font-semibold text-primary flex items-center gap-1"
              title="Changer de langue / Switch language"
            >
              <Globe className="w-3 h-3" />
              <span>{i18n.language.startsWith('fr') ? 'EN' : 'FR'}</span>
            </button>
          </div>

          <NavLink
            to="/reglages"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors min-h-[44px] ${
              location.pathname === '/reglages'
                ? 'bg-primary-light text-primary font-semibold'
                : 'text-slate-muted hover:text-slate-text hover:bg-white'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>{t('nav.settings')}</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:pl-72 min-h-screen">
        <div className="hidden h-16 items-center justify-end px-8 md:flex">{accountControl}</div>
        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-slate-border sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-serif font-bold text-base">
              A
            </div>
            <span className="font-serif font-bold text-base text-slate-text">Astrohealth</span>
          </div>

          <div className="flex items-center gap-2">
            {accountControl}
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 rounded-md border border-slate-border text-xs font-semibold text-primary"
            >
              {i18n.language.startsWith('fr') ? 'EN' : 'FR'}
            </button>
            <button
              onClick={() => openMeasure()}
              className="p-2 rounded-lg bg-primary text-white"
              aria-label={t('home.measureButton')}
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-8 md:p-12 max-w-6xl w-full mx-auto pb-24 md:pb-12">
      <Outlet context={{ openMeasure }} />
        </main>

        {/* Permanent Educational Disclaimer Footer */}
        <footer className="px-6 py-4 border-t border-slate-border bg-surface text-center text-xs text-slate-muted select-none">
          <div className="max-w-prose mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>{t('app.disclaimer')}</span>
            <span className="text-slate-400">Expédition 72 // NASA Hackathon Challenge</span>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar (Horizontal 5 items) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-border flex items-center justify-around p-2 z-30 shadow-md"
        aria-label="Menu mobile"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center p-2 rounded-lg min-h-[48px] min-w-[48px] text-xs font-medium ${
                isActive ? 'text-primary font-bold' : 'text-slate-muted hover:text-slate-text'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] leading-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Global Guided Measure Stepper Modal */}
      <MeasureModal
        isOpen={isMeasureModalOpen}
        onClose={() => setIsMeasureModalOpen(false)}
        initialMetric={initialMeasureMetric}
      />
      {logoutConfirmOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLogoutConfirmOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="logout-title" className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-border bg-white p-6 shadow-xl">
          <div><h2 id="logout-title" className="font-serif text-xl font-bold">Se déconnecter ?</h2><p className="mt-2 text-sm text-slate-muted">Voulez-vous vous déconnecter ?</p>{mentalDraftActive && <p className="mt-2 rounded-lg bg-surface p-3 text-sm text-slate-text">Les réponses non enregistrées seront perdues.</p>}</div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setLogoutConfirmOpen(false)} className="min-h-10 rounded-lg border border-slate-border px-4 text-sm font-semibold">Annuler</button><button type="button" onClick={() => { clearSession(); setLogoutConfirmOpen(false); navigate('/auth', { replace: true }); }} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white">Se déconnecter</button></div>
        </section>
      </div>}
    </div>
  );
};
