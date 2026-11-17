import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import en from './en.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('astrohealth_lang') || 'fr' : 'fr';

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en }
  },
  lng: savedLang,
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false
  }
});

if (typeof document !== 'undefined') document.documentElement.lang = savedLang;
i18n.on('languageChanged', (lang) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lang.startsWith('fr') ? 'fr' : 'en';
});

export function changeLanguage(lang: 'fr' | 'en') {
  i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem('astrohealth_lang', lang);
  }
}

export default i18n;
