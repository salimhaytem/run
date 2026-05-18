import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
  fr: {
    translation: {
      tabs: { map: 'Carte', feed: 'Feed', run: 'Run', crews: 'Crews', profile: 'Profil' },
      auth: { login: 'Connexion', register: "S'inscrire", email: 'Email', password: 'Mot de passe' },
      run: { start: 'Démarrer', pause: 'Pause', resume: 'Reprendre', stop: 'Terminer', recap: 'Récap' },
      sos: { title: 'SOS Pacer', activate: 'Besoin d\'un pacer', credits: 'Crédits' },
      map: { nearby: 'Runners proches', events: 'Événements', partners: 'Partenaires' },
    },
  },
  ar: {
    translation: {
      tabs: { map: 'الخريطة', feed: 'المنشورات', run: 'الجري', crews: 'الفرق', profile: 'الملف' },
    },
  },
};

const locale = Localization.getLocales()[0]?.languageCode ?? 'fr';

i18n.use(initReactI18next).init({
  resources,
  lng: locale.startsWith('ar') ? 'ar' : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
