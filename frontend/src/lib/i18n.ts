import i18next from "i18next";
import { initReactI18next } from "react-i18next";

const STORAGE_KEY = "inventaire_lang";

const fr = {
  nav: {
    admin: "Admin",
    profile: "Profil",
    logout: "Déconnexion",
  },
  status: {
    ACTIVE: "Actifs",
    IN_MAINTENANCE: "Maintenance",
    DISPOSED: "Cédés",
    LOST: "Perdus",
    STOLEN: "Volés",
  },
  modules: {
    assets: "Liste des biens",
    enroll: "Enrôler un tag",
    scan: "Scan terrain",
    map: "Carte GPS",
    reports: "Rapports",
  },
  dashboard: {
    title: "Tableau de bord",
    loading: "Chargement...",
    total_assets: "Actifs totaux",
    book_value: "Valeur nette",
    depreciation: "Dépréciation",
    active_assets: "Actifs actifs",
    by_status: "Répartition par statut",
    by_tag: "Répartition par tag",
    quick_access: "Accès rapide",
    enroll_first: "Enrôler un premier tag →",
    no_tag: "Aucun tag actif",
    no_recent: "Aucun actif récent",
  },
};

const en = {
  nav: {
    admin: "Admin",
    profile: "Profile",
    logout: "Sign out",
  },
  status: {
    ACTIVE: "Active",
    IN_MAINTENANCE: "Maintenance",
    DISPOSED: "Disposed",
    LOST: "Lost",
    STOLEN: "Stolen",
  },
  modules: {
    assets: "Asset list",
    enroll: "Enroll a tag",
    scan: "Field scan",
    map: "GPS map",
    reports: "Reports",
  },
  dashboard: {
    title: "Dashboard",
    loading: "Loading...",
    total_assets: "Total assets",
    book_value: "Net book value",
    depreciation: "Depreciation",
    active_assets: "Active assets",
    by_status: "Status breakdown",
    by_tag: "Tag breakdown",
    quick_access: "Quick access",
    enroll_first: "Enroll your first tag →",
    no_tag: "No active tag",
    no_recent: "No recent assets",
  },
};

const savedLang =
  typeof window !== "undefined"
    ? (localStorage.getItem(STORAGE_KEY) ?? "fr")
    : "fr";

i18next.use(initReactI18next).init({
  lng: savedLang,
  fallbackLng: "fr",
  resources: { fr: { translation: fr }, en: { translation: en } },
  interpolation: { escapeValue: false },
});

export function toggleLang() {
  const next = i18next.language === "fr" ? "en" : "fr";
  i18next.changeLanguage(next);
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next);
}

export function currentLang() {
  return i18next.language as "fr" | "en";
}

export default i18next;
