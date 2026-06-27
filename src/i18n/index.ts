import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Lang } from '@/types'
import { fr } from './fr'
import { ar } from './ar'
import { en } from './en'

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
    en: { translation: en }
  },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }
})

export function applyLang(lang: Lang): void {
  void i18n.changeLanguage(lang)
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

export default i18n
