# Inventaire Intelligent — Plateforme SaaS de Gestion et Traçabilité des Actifs

Plateforme SaaS internationale multi-tenant de gestion patrimoniale et de traçabilité des actifs (Asset Tracking) pour les entreprises de l'espace UEMOA et à l'international. Zéro saisie manuelle, lutte contre le vol et la fraude, conformité comptable automatisée.

## Branches

| Branche | Rôle |
|---------|------|
| `main` | Production stable |
| `dev` | Intégration continue |
| `feature/frontend-neya` | Développement UI/UX Next.js |
| `feature/security-zombre` | Sécurité & infrastructure |

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js (App Router) + Tailwind CSS + Lucide React |
| Backend (API REST) | Node.js / NestJS |
| Base de données | PostgreSQL managé + Prisma ORM |
| Cartographie | Leaflet.js (OpenStreetMap) / Mapbox |
| Offline | IndexedDB / LocalStorage (sync batch) |
| Internationalisation | Français & Anglais (i18n natif) |
| Infrastructure | Docker / Nginx / VPS sécurisé + chiffrement AES-256 |

## Écosystème Matériel Supporté

| Type d'actif | Technologie |
|--------------|-------------|
| Petit matériel & mobilier | Stickers RFID passifs UHF (865-868 MHz) / Tags NFC |
| Matériel critique (laptops, serveurs) | Tags BLE Jimi IoT (Série PB) |
| Véhicules & engins lourds | Balises GPS Teltonika LTE Cat-1 |
| Bâtiments & terrains | Tags durcis anti-vandalisme (béton / gaine technique) |
| Connectivité terrain | SIM M2M Hologram (roaming multi-opérateurs) |

## Fonctionnalités Clés

- **Multi-tenant hermétique** — isolation stricte par entreprise (`Company` → `companyId`)
- **Enrôlement terrain** — flash tag → photo → saisie prix → liaison instantanée à la fiche Asset
- **Cartographie en temps réel** — historique GPS des déplacements sur carte (Leaflet/Mapbox)
- **Mode Hors-Ligne (Offline-First)** — scans stockés localement, synchronisation automatique par batch
- **Amortissements comptables** — calcul automatique de la Valeur Nette Comptable (VNC) selon normes locales
- **Chiffrement fort** — AES-256 sur toutes les données sensibles au repos
- **Conformité** — ARCEP + CIL (Burkina Faso)

## Modèle de Données (Prisma)

`Company` · `User` (roles: ADMIN, MANAGER, AGENT) · `Asset` · `Tag` (QR, RFID, BLE, GPS) · `LocationHistory`

## Démarrage rapide

```bash
git clone https://github.com/LnDevAi/inventaire-intelligent.git
cd inventaire-intelligent
cp .env.example .env
# Backend NestJS
cd backend && npm install && npm run start:dev
# Frontend Next.js
cd frontend && npm install && npm run dev
```

## Contributeurs

- [@MoussaNEYA](https://github.com/MoussaNEYA) — Frontend Next.js & UI/UX
- [@Yamalr](https://github.com/Yamalr) — Backend NestJS & Sécurité
- [@burkinabe](https://github.com/burkinabe) — Tests, CI/CD & Intégrations matérielles

---

**E-DEFENCE** · Ouaga 2000, derrière INSD, vers Rectorat UCAO · Ouagadougou, Burkina Faso
[www.edefence.tech](https://www.edefence.tech) · info@edefence.tech
