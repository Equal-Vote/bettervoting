// https://dev.to/adrai/how-to-properly-internationalize-a-react-application-using-i18next-3hdb
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.yaml';
import ptBR from './pt-BR.yaml';
import pl from './pl.yaml';
import es from './es.yaml';
import de from './de.yaml';

i18n
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: true,
    returnObjects: true,
    // I may need to add whitelist for commaListSeparator in util.tsx to be accurate, but it didn't work
    // https://github.com/i18next/react-i18next/issues/475
    // whitelist: ['en'],
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: {
        translation: en
      },
      'pt-BR': {
        translation: ptBR
      },
      'es': {
        translation: es
      },
      'pl': {
        translation: pl
      },
      'de': {
        translation: de
      },
    }
  });

export default i18n;