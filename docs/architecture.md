# Architecture technique — État de Crise

> Document de référence. Mettre à jour à chaque MODE DELTA qui modifie une couche majeure.

---

## 1. Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework mobile | React Native (Expo SDK 54) | expo-router v4 |
| Langage | TypeScript strict (`strict: true`) | 5.x |
| Navigation | expo-router (file-based) | v4 |
| Persistance locale | AsyncStorage (`@react-native-async-storage`) | — |
| Backend | Supabase (Edge Functions Deno, Postgres) | — |
| Auth | Supabase Auth (Google / Apple OAuth) | — |
| Tests | Node `node:test` + `tsx` (zéro dépendance) | Node 20 |
| Icons | `@expo/vector-icons` (MaterialCommunityIcons, Feather) | — |
| Animations | React Native core (`Animated`) | — |
| Alias module | `@/*` → `./` (tsconfig + Metro) | — |

**Contrainte Expo :** ne pas ajouter de native module non géré par Expo (pas de `react-native link`). Tout ajout doit passer par `expo install` ou être du JS pur.

---

## 2. Structure des dossiers

```
app/                  Écrans (expo-router) — un fichier = une route
  _layout.tsx         Layout racine, providers globaux
  dashboard.tsx       Hub principal (mode crise classique)
  buildings.tsx       Ministères mode stratégie
  ranking-global.tsx  Classement mondial
  ...

components/           Composants UI réutilisables (pas de logique métier)
config/
  features.ts         Feature flags compile-time (8 flags)
constants/
  uiTokens.ts         PALETTE, FONT, RADIUS — source de vérité visuelle
context/
  GameContext.tsx     État du jeu classique (crises, jauges, temps)
  StrategyContext.tsx État du jeu stratégie (bâtiments, ressources, news)
  AuthContext.tsx     Session Supabase + flags isLinked/isEnabled
core/                 Transformations d'état PURES — zéro import React/Expo
  computeState.ts     applyIndicatorEffects, applyRewards, applyHiddenPolitics
  gameSelectors.ts    computeMandateScore, computeAvailableActions
  gameRules.ts        Règles métier testables
  commands.ts         Types de commandes (anti-double-clic)
data/                 Données statiques (buildings, events, pays, doctrines…)
docs/                 Ce dossier — documentation technique
hooks/
  useCommand.ts       Anti-double-clic (useRef sync + useState JSX)
  useColors.ts        Thème dynamique
logic/                Moteurs de jeu (fonctions pures, testables)
  newsEngine.ts       Sélection et application des crises news
  botEngine.ts        IA des bots de classement
  buildingEngine.ts   Calcul coûts, upgrades, production
  operationEngine.ts  Opérations militaires/diplomatiques
  tensionEngine.ts    Tension nationale composite
  realTimeEngine.ts   Avancement du temps réel en jeu
  ... (50+ moteurs)
services/             Appels réseau + file offline
  AllianceService.ts  CRUD alliances via Edge Functions
  SpyService.ts       Opérations d'espionnage
  CyberService.ts     Opérations cyber
  SyncService.ts      Cloud save (upload/download, conflict resolution)
  RankedService.ts    Journal anti-triche + soumission score classé
  OfflineQueue.ts     File offline générique (retry, backoff, idempotence)
  TelemetryService.ts Buffer local télémétrie (aucun envoi automatique)
storage/
  strategyStorage.ts  Chargement/sauvegarde locale + appel SyncService
  saveMigrations.ts   Migrations versionnées v1→v3 (jamais de perte)
  saveSlots.ts        Gestion 6 emplacements de sauvegarde
  balanceStorage.ts   Stats d'équilibrage (local, dev only)
tests/golden/         Tests de non-régression sur les moteurs core/
types/
  strategy.ts         Types principaux (StrategyGameState, ResourceKey…)
  units.ts            Types unités militaires
utils/
  validators.ts       Validateurs runtime défensifs (null, pas de throw)
  responsive.ts       Helpers layout responsive
supabase/functions/   Edge Functions Deno (backend — ne pas modifier côté client)
```

---

## 3. Rôle de chaque moteur / service clé

### `context/StrategyContext.tsx`
Cerveau du mode stratégie. Détient `StrategyGameState` en mémoire React, gère toutes les
mutations via des actions (upgradeBuilding, launchOperation, resolveNews…), orchestre les
timers de temps réel, et persiste via `strategyStorage`. **Ne jamais dupliquer sa logique
dans un écran.** Les écrans lisent `useStrategy()` et appellent ses actions — ils ne
modifient jamais l'état directement.

Dépendances critiques : `buildingEngine`, `newsEngine`, `missionEngine`, `realTimeEngine`,
`RankedService` (events anti-triche), `SyncService` (cloud save).

### `context/GameContext.tsx`
Cerveau du mode crise classique (jauges, événements, mandats, opposition). Même principe
que `StrategyContext` — les écrans lisent `useGame()`, n'écrivent pas directement.

### `logic/newsEngine.ts`
Sélectionne les événements news à déclencher selon l'état courant du joueur :
- Score de pertinence par événement (profil de faiblesses + conditions + rareté)
- Cooldown par événement (évite la répétition)
- Pool top-5 pour garantir la variété
- Distingue news automatiques (affichées dans le journal) et interactives (décision requise)

**Modifier avec précaution** : un biais dans la sélection affecte directement la difficulté
perçue.

### `services/RankedService.ts`
Journal local des décisions pour le mode classé. Flux :
1. `startRankedRun()` → POST `/ranked-start` → méta locale (`runId`, `seed`)
2. `recordEvent()` → append au journal local (AsyncStorage)
3. `submitRankedRun()` → POST `/ranked-submit` avec hash d'intégrité
4. `retryPendingSubmission()` → retry au prochain lancement si réseau indisponible

**Ne jamais confier la validation du score au client.** Toute vérification de légitimité
est côté serveur (Edge Function `/ranked-submit`). Le client n'a pas à décider si une run
est valide.

### `services/SyncService.ts`
Cloud save — stratégie last-write-wins basée sur le timestamp serveur.
- `scheduleUpload()` : fire-and-forget après chaque sauvegarde locale
- `downloadSave()` : valide la réponse via `validateCloudSave()` avant de l'utiliser
- `syncOnLaunch()` : compare timestamps local vs cloud, retourne une résolution explicite

**Invariant :** les tokens JWT ne sont jamais persistés dans AsyncStorage. `setAccessToken()`
est appelé par `AuthContext` à chaque changement de session.

### `services/AllianceService.ts`
CRUD alliances via `/alliance-list`, `/alliance-invite`, `/alliance-respond`.
- Les données réseau passent par `filterValid([], validateAlliance)` avant usage
- Les invitations offline passent par `OfflineQueue.enqueueAllianceInvite()`

### `services/SpyService.ts`
Opérations d'espionnage asynchrones (résolution côté serveur).
- `launchSpyOp()` : POST `/spy-launch`
- `fetchSpyOps()` : GET `/spy-resolve` — filtre via `filterValid([], validateSpyOp)`

### `services/CyberService.ts`
Cyberattaques asynchrones.
- `launchCyberOp()` : POST `/cyber-launch`
- `fetchCyberOps()` : GET `/cyber-resolve` — filtre sent/received via `filterValid`

### `services/OfflineQueue.ts`
File générique pour les actions réseau non critiques. États : `queued → sending →
success / retrying → failed`. Backoff exponentiel (10s→300s), max 5 tentatives,
idempotence par `id`. Tokens jamais persistés — `flushQueue(token)` reçoit un token
frais. Flux migré : `alliance_invite`. À appeler au lancement après auth ready.

### `storage/saveMigrations.ts`
Migrations versionnées `v1 → CURRENT_SAVE_VERSION`. Règle absolue :
- **Jamais de suppression de champ** — on ajoute les manquants avec des valeurs par défaut
- **Jamais de crash** — chaque chemin retourne quelque chose d'utilisable
- Bumper `CURRENT_SAVE_VERSION` à chaque ajout de champ obligatoire dans `StrategyGameState`

### `utils/validators.ts`
Validateurs runtime défensifs pour les données externes (réseau, AsyncStorage).
- Retournent `T | null` — jamais de throw
- `filterValid<T>(items, validator)` pour les tableaux serveur
- `devWarn()` logge en DEV uniquement

---

## 4. Règles à respecter

### Sauvegarde
- Tout nouveau champ dans `StrategyGameState` doit avoir une valeur par défaut dans `saveMigrations.ts`
- Bumper `CURRENT_SAVE_VERSION` **à chaque** ajout de champ obligatoire
- Ne jamais écraser un champ existant lors d'une migration — utiliser `?? defaultValue`
- Toujours tester le chargement d'une sauvegarde v(n-1) après modification

### Classement et anti-triche
- La validation d'un score classé est **toujours côté serveur**
- `RankedService` enregistre les événements mais n'interprète pas leur validité
- Ne jamais exposer dans l'UI une information qui permet de calculer le score sans la soumission

### Expo / Metro
- Pas de `require()` dynamique dans les modules `core/` (casse Metro tree-shaking)
- Préférer `expo install <package>` à `npm install` pour garantir la compatibilité SDK
- `__DEV__` est un global Metro — utilisable dans `services/` et `config/`, pas dans `core/`
- Ne pas importer React Native dans `core/` ni dans `utils/` (les golden tests tournent avec Node pur)

### Séparation des couches
```
app/          →  lit context/, appelle actions
context/      →  détient l'état, appelle logic/ et services/
logic/        →  fonctions pures, aucun effet de bord
core/         →  transformations d'état PURES, testables avec node:test
services/     →  effets de bord réseau, AsyncStorage
storage/      →  AsyncStorage uniquement
utils/        →  helpers purs (pas de React, pas de réseau)
```

---

## 5. Ajouter une nouvelle feature en MODE DELTA

```
1. Identifier la couche cible
   - Nouvelle logique métier pure  → logic/monMoteur.ts
   - Nouveau type d'état           → types/strategy.ts + saveMigrations.ts
   - Appel réseau                  → services/MonService.ts (+ OfflineQueue si offline-resilient)
   - Nouvel écran                  → app/mon-ecran.tsx
   - Flag désactivable             → config/features.ts

2. Ne pas modifier StrategyContext directement si possible
   - Préférer un nouveau moteur dans logic/ appelé depuis le Context
   - Les mutations d'état restent dans le Context

3. Valider les données externes
   - Toute réponse réseau passe par utils/validators.ts
   - Utiliser filterValid() pour les tableaux

4. Ajouter la migration si nécessaire
   - Nouveau champ StrategyGameState → migration dans saveMigrations.ts
   - Bumper CURRENT_SAVE_VERSION

5. Feature flag si la feature peut être désactivée sans restructuration
   - Ajouter dans config/features.ts
   - Guard après les hooks dans l'écran : if (!FEATURES.maFeature) return <FeatureUnavailable>

6. Tester (voir section 6)
```

---

## 6. Comment tester après modification

### Tests automatisés (moteurs `core/`)
```bash
npm run test:golden
# Ou directement :
npx tsx --tsconfig tsconfig.json tests/run.ts
```
Ces tests couvrent : `computeState`, `gameSelectors`, `buildingUpgrade`, `research`,
`saveMigrations`. Un test en échec = régression dans un moteur fondamental.

### Vérification TypeScript (obligatoire avant commit)
```bash
npx tsc --noEmit
# Ignorer les erreurs supabase/functions/ (Deno — hors scope client)
```

### Checklist manuelle après un MODE DELTA

| Vérification | Comment |
|---|---|
| Sauvegarde existante chargeable | Lancer l'app avec une save v(n-1) en AS |
| Nouvelle feature désactivable | Basculer le flag dans `features.ts` |
| Pas de régression dashboard | Vérifier que les jauges s'affichent correctement |
| Pas de régression classement | Vérifier `ranking.tsx` et `ranking-global.tsx` |
| Données réseau invalides | Tester avec une réponse JSON malformée (DEV console) |
| TypeScript propre | `tsc --noEmit` zéro erreur hors Deno |
