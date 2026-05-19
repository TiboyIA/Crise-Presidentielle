# Cartographie fonctionnelle — État de Crise

> Référence statique : décrit CE QUI EXISTE. Mettre à jour après chaque MODE DELTA qui
> ajoute ou modifie un module. Complémente `architecture.md` (couches techniques) et
> `change_guidelines.md` (règles de modification).

---

## 1. Vue d'ensemble — deux modes, un hub

Le jeu comporte **deux modes de jeu distincts** cohabitant dans la même app :

| Mode | Contexte React | Hub principal | Nature |
|---|---|---|---|
| **Mode Crise Classique** | `GameContext` | `dashboard.tsx` | Tour par tour — crises, jauges, élections |
| **Mode Stratégie** | `StrategyContext` | `dashboard.tsx` (onglet stratégie) | Temps réel — bâtiments, ressources, opérations |

`dashboard.tsx` consomme les deux contextes simultanément et sert de portail vers tous les
écrans. `app/index.tsx` est l'écran de création de partie (choix pays, nom, doctrine,
mode classé optionnel).

---

## 2. Flux général

```
Joueur
  │
  ▼
index.tsx ──── choix pays / nom / doctrine ──→ StrategyContext.initGame()
                                                      │
                                                      ▼
dashboard.tsx ◄──── useGame() + useStrategy() ────────┤
  │                                                    │
  ├── actions joueur (choix événement, upgrade, op...) │
  │        │                                           │
  │        ▼                                           │
  │   moteur logique (logic/ ou core/)                 │
  │        │                                           │
  │        ▼                                           │
  │   mutation d'état (GameContext / StrategyContext)  │
  │        │                                           │
  │        ▼                                           │
  │   strategyStorage / AsyncStorage ◄─────────────────┘
  │        │
  │        ▼
  │   SyncService (cloud save, fire-and-forget)
  │
  ├── actions réseau (alliances, spy, cyber, classement)
  │        │
  │        ▼
  │   services/ ──→ Supabase Edge Functions
  │        │
  │        └── (si offline) OfflineQueue ──→ retry au prochain lancement
  │
  └── achats / compte ──→ purchases / Supabase Auth
```

---

## 3. Modules

---

### 3.1 Dashboard national

**Rôle :** Hub principal — agrège jauges, ressources, navigation et alertes en temps réel.

**Écrans :** `app/dashboard.tsx`

**Fichiers principaux :**
- `context/GameContext.tsx` — jauges, événements, opposition, guerre hybride
- `context/StrategyContext.tsx` — ressources, classement, missions
- `components/GaugeBar.tsx`, `ResourceStrip.tsx`, `HudHeader.tsx`, `TimeBar.tsx`
- `components/CrisisChyron.tsx`, `AlertTicker.tsx`, `FranceMap.tsx`

**Données utilisées :** `StrategyGameState` entier + état GameContext entier

**Actions joueur :**
- Navigation vers tous les sous-écrans
- Gestion des événements de crise (via `EventModal`)
- Consultation des jauges en temps réel

**Dépendances :**
- `GameContext` + `StrategyContext` (tous deux requis)
- `RankedService.recordEvent()` à chaque action classée
- `AllianceService.fetchAlliances()` au montage

**Risques si modifié :**
- Point d'entrée de tous les systèmes — une régression ici affecte tout
- Les re-renders fréquents (tick toutes les quelques secondes) rendent les optimisations
  `React.memo` critiques sur les sous-composants
- Ne jamais déplacer les hooks après un `if (!state)` conditionnel

---

### 3.2 Ressources

**Rôle :** 7 ressources du mode stratégie générées en continu par les bâtiments.

**Écrans :** `app/dashboard.tsx` (bande `ResourceStrip`), `app/buildings.tsx`

**Fichiers principaux :**
- `types/strategy.ts` → `StrategyResources`, `ResourceKey`, `RESOURCE_LABELS`, `RESOURCE_ICONS`
- `logic/buildingEngine.ts` → `accumulateResources()`, `canAfford()`, `deductCost()`
- `logic/resources.ts` → `INITIAL_RESOURCES`
- `context/StrategyContext.tsx` → timer de production toutes les N secondes

**Données utilisées :** `state.resources: StrategyResources`

**Actions joueur :** Passives (accumulation automatique) — dépensées via bâtiments / opérations / unités

**Ressources :** `money`, `influence`, `energy`, `intelligence`, `technology`, `military`, `cyberDefense`

**Dépendances :** `buildingEngine` (production), `realTimeEngine` (avancement temps réel)

**Risques si modifié :**
- Ajouter une ressource → bumper `CURRENT_SAVE_VERSION` + migration
- Modifier les taux de production → impact direct sur l'équilibrage de toutes les actions

---

### 3.3 Bâtiments (Ministères)

**Rôle :** 11 bâtiments upgradables qui produisent des ressources et débloquent des opérations.

**Écrans :** `app/buildings.tsx`

**Fichiers principaux :**
- `data/buildings.ts` → `BUILDINGS`, `INITIAL_BUILDINGS`, définitions des 11 bâtiments
- `logic/buildingEngine.ts` → `startUpgrade()`, `collectUpgrades()`, `isUnlocked()`, `formatDuration()`
- `logic/simulationClock.ts` → `currentGameHour()`, `gameHoursToRealMs()`
- `context/StrategyContext.tsx` → action `upgradeBuilding()`

**Données utilisées :** `state.buildings: PlayerBuilding[]`

**Actions joueur :**
- Améliorer un bâtiment (coût ressources + durée réelle)
- Accélérer (premium) — si implémenté
- Collecter une amélioration terminée

**Dépendances :** `resources` (coûts), `simulationClock` (durées), `operationEngine` (prérequis bâtiments)

**Risques si modifié :**
- `upgradeEndsAtGameHour` est la source de vérité (vs anciens `upgradeEndTime`) — ne pas confondre
- Changer `maxLevel` dans `BuildingDef` → vérifier que les saves existantes restent valides
- `INITIAL_BUILDINGS` doit contenir tous les `BuildingId` — un manquant crashe le fast-path

---

### 3.4 Recherche stratégique

**Rôle :** Arbre de recherche débloquant des bonus permanents (production, opérations, unités).

**Écrans :** `app/strategy-research.tsx`

**Fichiers principaux :**
- `data/strategyResearch.ts` → `STRATEGY_RESEARCH`, `STRATEGY_RESEARCH_LIST`
- `types/strategyResearch.ts` → `StrategyResearchId`, `StrategyResearchState`, `DEFAULT_RESEARCH_STATE`
- `context/StrategyContext.tsx` → action `unlockResearch()`

**Données utilisées :** `state.strategyResearch: StrategyResearchState`

**Actions joueur :**
- Débloquer une recherche (coût ressources, prérequis)
- Consulter l'arbre et les bonus

**Dépendances :** `resources` (coûts), `buildingEngine` (prérequis éventuels)

**Risques si modifié :**
- `DEFAULT_RESEARCH_STATE` doit correspondre à tous les IDs — migration v2 l'initialise
- Les bonus de recherche impactent balance globale — tester avec `npm run test:golden`

---

### 3.5 Unités militaires

**Rôle :** Entraînement et gestion de 4 branches militaires (Terre, Air, Mer, Soutien) +
doctrines militaires.

**Écrans :** `app/forces-armees.tsx`

**Fichiers principaux :**
- `data/units.ts` → `UNITS`, `UNIT_LIST`, `BRANCH_LABELS`, `BRANCH_COLORS`
- `data/militaryDoctrines.ts` → `MILITARY_DOCTRINES`, `MILITARY_DOCTRINE_LIST`
- `types/units.ts` → `PlayerUnit`, `TrainingQueueEntry`, `UnitId`, `MilitaryDoctrineId`
- `logic/militaryEngine.ts` → `calculateMilitaryPower()`, `getOperationUnitBonus()`, `calculateDailyUpkeep()`
- `context/StrategyContext.tsx` → actions `trainUnit()`, `setMilitaryDoctrine()`

**Données utilisées :** `state.playerUnits`, `state.trainingQueue`, `state.militaryDoctrine`

**Actions joueur :**
- Entraîner des unités (coût ressources + temps)
- Choisir une doctrine militaire
- Consulter la file d'entraînement
- Gérer le moral / upkeep quotidien

**Dépendances :** `simulationClock` (durées), `operationEngine` (bonus unités sur opérations)

**Risques si modifié :**
- `trainingQueue` est persisté — une modification du format casse les saves en cours d'entraînement
- `calculateDailyUpkeep()` impact ressources — modifier prudemment

---

### 3.6 Opérations diplomatiques

**Rôle :** 10 types d'opérations contre 20 pays IA (espionnage local, cyber local, diplomatie,
sanctions, traités, opération militaire…). Distinct des opérations async serveur (spy/cyber).

**Écrans :** `app/operations.tsx`

**Fichiers principaux :**
- `logic/operationEngine.ts` → `OPERATIONS`, `canLaunchOperation()`, `resolveOperation()`, `updateRelationScore()`
- `data/countries.ts` → `COUNTRIES`, `COUNTRY_LIST`, `getInitialRelations()`
- `types/strategy.ts` → `OperationType`, `OperationDef`, `OperationResult`, `CountryRelation`
- `context/StrategyContext.tsx` → action `launchOperation()`
- `hooks/useCommand.ts` → anti-double-clic

**Données utilisées :** `state.relations: CountryRelation[]` (cooldowns, scores, intel révélée)

**Actions joueur :**
- Choisir un pays cible
- Lancer une opération (coût ressources + cooldown)
- Voir résultat (succès/échec, delta relation, XP, points classement)

**Dépendances :** `buildingEngine` (prérequis bâtiments), `militaryEngine` (bonus unités),
`RankedService` (enregistrement événement si run classée)

**Risques si modifié :**
- `operationCooldowns` dans `CountryRelation` est un `Partial<Record<OperationType, number>>`
  — ajouter un type d'opération ne casse pas les saves existantes
- `resolveOperation()` est testable en golden test — ajouter un test si la formule change

---

### 3.7 Carte mondiale

**Rôle :** Visualisation SVG interactive des 20 pays avec relations, menaces, hotspots.

**Écrans :** `app/worldmap.tsx`

**Fichiers principaux :**
- `data/mapWorld.ts`, `data/isoCountryMap.ts`, `data/mapGeo.ts` → géodonnées SVG
- `data/mapLayers.ts`, `data/mapLabelAnchors.ts` → couches visuelles
- `logic/hotspotEngine.ts` → `generateHotspots()`, `getHotspotColor()`
- `react-native-svg`, `react-native-gesture-handler`, `react-native-reanimated` → zoom/pan/tap

**Données utilisées :** `state.relations`, `state.resources`

**Actions joueur :**
- Pinch/pan/zoom sur la carte
- Taper un pays → naviguer vers opérations avec ce pays pré-sélectionné
- Voir statut de relation par couleur

**Dépendances :** `operationEngine` (relations), `hotspotEngine` (anomalies)

**Risques si modifié :**
- `react-native-svg` et `react-native-reanimated` sont des modules natifs Expo — ne pas
  ajouter de modules SVG alternatifs sans passer par `expo install`
- Les calculs SVG (Path, cercles) sont coûteux — ne pas ajouter de recalculs en boucle

---

### 3.8 Journal de Crise

**Rôle :** Fil d'actualités du mode stratégie — événements automatiques et décisions
interactives urgentes (choix présidentiel requis).

**Écrans :** `app/journal-crise.tsx`

**Fichiers principaux :**
- `logic/newsEngine.ts` → `selectNextNews()`, `applyAutoNews()`, `applyInteractiveNews()`,
  `shouldTriggerNews()`, `queueNews()`, `DEFAULT_NEWS_STATE`
- `data/newsEvents.ts` → `NEWS_EVENT_MAP` (catalogue des événements)
- `components/NewsCard.tsx`, `components/InteractiveNewsModal.tsx`
- `logic/tensionEngine.ts` → `computeNationalTension()` (contexte d'urgence)
- `context/StrategyContext.tsx` → actions `resolveInteractiveNews()`, `dismissNews()`, `markNewsRead()`

**Données utilisées :** `state.news` → `{ pendingIds, log, actionCount, lastReadAt, cooldowns }`

**Actions joueur :**
- Filtrer par type (cyber, économie, social, diplomatie…)
- Répondre à une décision interactive (choix A/B, effet immédiat)
- Dismisser une news

**Dépendances :** `tensionEngine`, `newsEngine` (sélection probabiliste)

**Risques si modifié :**
- `newsEngine` a un biais de sélection probabiliste — modifier le scoring change la difficulté perçue
- `pendingIds` et `log` doivent rester synchronisés — ne jamais vider l'un sans l'autre
- Avec > 50 entrées dans `log`, migrer vers `FlatList` (voir `performance_budget.md`)

---

### 3.9 Missions journalières

**Rôle :** 3 missions quotidiennes générées aléatoirement — progression + récompenses ressources.

**Écrans :** `app/missions.tsx`

**Fichiers principaux :**
- `logic/missionEngine.ts` → `generateDailyMissions()`, `checkMissionProgress()`,
  `missionsExpired()`, `timeUntilReset()`, `getMissionDef()`
- `data/missions.ts` → pool de définitions de missions
- `types/strategy.ts` → `MissionDef`, `PlayerMission`, `MissionType`
- `context/StrategyContext.tsx` → action `collectMissionReward()`
- `components/MissionCard.tsx`

**Données utilisées :** `state.missions: PlayerMission[]`

**Actions joueur :**
- Consulter la progression des missions actives
- Collecter la récompense d'une mission terminée
- Attendre la rotation quotidienne (compte à rebours)

**Dépendances :** `buildingEngine`, `operationEngine`, `resourceEngine` (progression auto)

**Risques si modifié :**
- Les missions expirent à minuit UTC — `timeUntilReset()` dépend du clock système
- `checkMissionProgress()` est appelé à chaque action — garder O(1) par mission

---

### 3.10 Classement local (bots)

**Rôle :** Classement simulé en local — le joueur contre des bots IA qui progressent en parallèle.

**Écrans :** `app/ranking.tsx`

**Fichiers principaux :**
- `logic/botEngine.ts` → `updateBotRanking()`, `getPlayerRank()`, `getRankTitle()`, `getTitleIcon()`
- `logic/botStrategyEngine.ts` → comportements IA des bots
- `data/bots.ts` → pool de bots (nom, pays, personnalité, taux de croissance)
- `types/strategy.ts` → `BotPlayer`, `RankEntry`
- `logic/powerEngine.ts` → `calculateGlobalPower()`, `calculatePresidentXP()`, `xpToLevel()`
- `context/StrategyContext.tsx` → mise à jour `state.ranking` à chaque tick

**Données utilisées :** `state.ranking: RankEntry[]`, `state.stats`

**Actions joueur :**
- Consulter son rang parmi les bots
- Voir son titre (Leader Mondial, Superpuissance…)
- Accéder au classement mondial (→ `ranking-global.tsx`)
- Vérifier invitations d'alliance en attente

**Dépendances :** `botEngine`, `AllianceService` (compte invitations), `RankedService` (soumission en attente)

**Risques si modifié :**
- `state.ranking` est recalculé côté client — ne jamais s'en servir pour un score classé
- `updateBotRanking()` est appelé fréquemment — rester O(n log n) max

---

### 3.11 Mode classé (classement mondial)

**Rôle :** Soumission de scores à un serveur pour un classement mondial authentique.
Protection anti-triche via journal d'événements validé côté serveur.

**Écrans :** `app/ranking.tsx` (badge + lien), `app/ranking-global.tsx` (leaderboard mondial),
`app/index.tsx` (activation mode classé)

**Fichiers principaux :**
- `services/RankedService.ts` → `startRankedRun()`, `recordEvent()`, `submitRankedRun()`,
  `retryPendingSubmission()`, `hasPendingSubmission()`
- `logic/rankedScoreFormula.ts` → formule de calcul du score
- `utils/validators.ts` → `validateLeaderboardEntry()`, `filterValid()`
- `app/ranking-global.tsx` → `FlatList` paginée + filtre pays

**Données utilisées :** `AsyncStorage` (journal local + méta run), Supabase `/ranked-start`,
`/ranked-submit`

**Actions joueur :**
- Activer le mode classé à la création de partie
- Voir son score mondial
- Soumettre automatiquement en fin de run (ou au prochain lancement si hors ligne)

**Dépendances :** `StrategyContext` (événements), `AuthContext` (token), `OfflineQueue` (retry)

**Risques si modifié :**
- **JAMAIS valider le score côté client** — toute logique de validation appartient à l'Edge Function
- `recordEvent()` est appelé à chaque action classée — rester synchrone et rapide
- Le `hash` d'intégrité doit correspondre côté serveur — modifier la formule = invalider toutes les runs en cours

---

### 3.12 Alliances

**Rôle :** Alliances joueur-à-joueur — invitations, acceptations, bonus partagés, expiration.

**Écrans :** `app/alliances.tsx`, `app/player-profile.tsx` (invitation depuis profil)

**Fichiers principaux :**
- `services/AllianceService.ts` → `fetchAlliances()`, `respondToAlliance()`,
  `computeAllianceBonuses()`, `ALLIANCE_BONUS_PER_ACTIVE`
- `services/OfflineQueue.ts` → `enqueueAllianceInvite()` (offline fallback)
- `utils/validators.ts` → `validateAlliance()`, `filterValid()`
- `config/features.ts` → `FEATURES.enableAlliances`

**Données utilisées :** Supabase `/alliance-list`, `/alliance-invite`, `/alliance-respond`

**Actions joueur :**
- Envoyer une invitation (depuis profil d'un joueur du leaderboard)
- Accepter/refuser une invitation reçue
- Consulter ses alliances actives et leurs bonus
- Voir la date d'expiration

**Dépendances :** `AuthContext` (token), `OfflineQueue` (invite offline), `ranking-global.tsx` (profils)

**Risques si modifié :**
- Si `FEATURES.enableAlliances = false` → `FeatureUnavailable` affiché, aucun appel réseau
- Les invitations offline (`enqueueAllianceInvite`) doivent être idempotentes (même `id` = pas de doublon)

---

### 3.13 Espionnage (ops async serveur)

**Rôle :** Opérations d'espionnage asynchrones résolues côté serveur — le résultat
arrive après un délai réel.

**Écrans :** `app/spy-ops.tsx`

**Fichiers principaux :**
- `services/SpyService.ts` → `launchSpyOp()`, `fetchSpyOps()`
- `utils/validators.ts` → `validateSpyOp()`, `filterValid()`
- `config/features.ts` → `FEATURES.enableSpyOps`

**Données utilisées :** Supabase `/spy-launch`, `/spy-resolve`

**Actions joueur :**
- Lancer une opération d'espionnage contre un joueur adverse
- Consulter les opérations en cours et leurs résultats
- Voir les opérations reçues (adversaires qui l'ont espionné)

**Dépendances :** `AuthContext` (token), `OfflineQueue` (futur : `enqueueSpyLaunch()`)

**Risques si modifié :**
- `fetchSpyOps()` retourne `[]` sur erreur — ne jamais throw
- L'écran vérifie `auth.isEnabled` — pas d'appel réseau si non connecté

---

### 3.14 Cyberattaques (ops async serveur)

**Rôle :** Attaques et défenses cyber asynchrones entre joueurs — debuff/bonus temporaires.

**Écrans :** `app/cyber-ops.tsx`

**Fichiers principaux :**
- `services/CyberService.ts` → `launchCyberOp()`, `fetchCyberOps()`
- `utils/validators.ts` → `validateCyberOp()`, `filterValid()`
- `config/features.ts` → `FEATURES.enableCyberOps`

**Données utilisées :** Supabase `/cyber-launch`, `/cyber-resolve`

**Actions joueur :**
- Lancer une cyberattaque contre un joueur
- Voir les attaques reçues (+ debuff `pending_debuff_pct` en cours)
- Consulter l'historique des opérations sent/received

**Dépendances :** `AuthContext` (token)

**Risques si modifié :**
- `pending_debuff_pct` est un `number | null` — valider le type avant usage
- `FEATURES.enableCyberOps = false` → `FeatureUnavailable` affiché proprement

---

### 3.15 Sauvegarde locale

**Rôle :** Persistance de `StrategyGameState` dans AsyncStorage. 6 emplacements de sauvegarde.
Migrations versionnées sans perte de données.

**Écrans :** `app/saves.tsx`

**Fichiers principaux :**
- `storage/strategyStorage.ts` → `saveStrategy()`, `loadStrategy()` (slot principal)
- `storage/saveSlots.ts` → `saveToSlot()`, `loadFromSlot()`, `deleteSlot()`, slots 1-6
- `storage/saveMigrations.ts` → `migrateSave()`, `CURRENT_SAVE_VERSION = 3`
- `utils/validators.ts` → `isValidStrategyGameState()` (garde fast-path)

**Données utilisées :** `AsyncStorage` clés : `strategy_save_v1`, `save_slot_1`..`save_slot_6`

**Actions joueur :**
- Sauvegarder dans un emplacement
- Charger depuis un emplacement
- Supprimer un emplacement
- Voir date et métadonnées de chaque slot

**Dépendances :** `StrategyContext` (état à persister), `SyncService` (upload après chaque save)

**Risques si modifié :**
- **Ne jamais supprimer un champ de `StrategyGameState`** — marquer `deprecated` + garder 2 versions
- **Toujours bumper `CURRENT_SAVE_VERSION`** quand un champ obligatoire est ajouté
- Tester le chargement d'une save v(n-1) après chaque modification de migration

---

### 3.16 Cloud Save

**Rôle :** Synchronisation de la sauvegarde principale vers Supabase. Stratégie last-write-wins
basée sur le timestamp serveur.

**Fichiers principaux :**
- `services/SyncService.ts` → `scheduleUpload()`, `downloadSave()`, `syncOnLaunch()`
- `utils/validators.ts` → `validateCloudSave()`

**Données utilisées :** Supabase `/sync-upload`, `/sync-download`

**Actions joueur :** Automatique (fire-and-forget après chaque sauvegarde locale)

**Dépendances :** `AuthContext` (token — jamais persisté), `strategyStorage` (source locale)

**Risques si modifié :**
- Le JWT **ne doit jamais être persisté** — `setAccessToken()` fourni par `AuthContext` uniquement
- `downloadSave()` valide via `validateCloudSave()` avant usage — ne pas court-circuiter
- Conflit cloud vs local → `syncOnLaunch()` retourne une résolution explicite, pas un crash

---

### 3.17 Compte sécurisé (Auth)

**Rôle :** Authentification OAuth (Google / Apple) via Supabase Auth. Conditionne l'accès
au classement mondial, alliances, spy, cyber et cloud save.

**Écrans :** `app/account-link.tsx`, `app/settings.tsx`

**Fichiers principaux :**
- `context/AuthContext.tsx` → `useAuth()`, `isLinked`, `isEnabled`, `accessToken`, `setAccessToken()`
- `app/_layout.tsx` → provider racine Auth + Strategy + Game

**Données utilisées :** Supabase Auth (session en mémoire)

**Actions joueur :**
- Lier son compte Google ou Apple
- Se déconnecter / changer de compte
- Récupérer une partie sauvegardée en cloud

**Dépendances :** Tous les services réseau dépendent de `auth.accessToken`

**Risques si modifié :**
- `isEnabled` vs `isLinked` : `isEnabled` = compte actif + non banni ; `isLinked` = juste lié
- Ne jamais stocker le token dans AsyncStorage (invariant documenté dans `architecture.md`)
- Le flux de `setAccessToken()` doit précéder tout appel `flushQueue()` ou `retryPendingSubmission()`

---

### 3.18 Achats (Shop)

**Rôle :** Achats in-app — pays jouables, doctrines, cosmétiques (portraits, thèmes UI),
emplacements de sauvegarde bonus, scénarios.

**Écrans :** `app/shop.tsx`

**Fichiers principaux :**
- `lib/purchases.ts` → `purchasePack()`, `restorePurchases()`
- `lib/entitlements.ts` → `useEntitlements()`, `isPackFree()`
- `data/countryPacks.ts`, `data/doctrinesPacks.ts` → catalogues
- `data/portraits.ts`, `data/themes.ts` → cosmétiques
- `services/GameSecurityService.ts` → vérification intégrité (anti-triche achats)
- `data/shopImages.ts` → assets visuels

**Données utilisées :** Entitlements (local + serveur Apple/Google)

**Actions joueur :**
- Acheter un pack pays / doctrine / cosmétique
- Restaurer des achats
- Voir les packs disponibles par catégorie

**Dépendances :** `GameSecurityService`, `lib/entitlements`

**Risques si modifié :**
- Les achats ne doivent jamais être simulés côté client — vérifier via `isPackFree()` + entitlements
- `restorePurchases()` doit être accessible et fonctionnel sur iOS

---

### 3.19 Chat global

**Rôle :** Chat textuel entre joueurs authentifiés. Quota de 10 messages par 24h.

**Écrans :** `app/chat.tsx`

**Fichiers principaux :**
- `services/ChatService.ts` → `fetchChat()`, `sendChatMessage()`, `reportMessage()`
- `context/AuthContext.tsx` → token requis

**Données utilisées :** Supabase (endpoint chat)

**Actions joueur :**
- Envoyer un message (max 200 caractères, quota 10/24h)
- Rafraîchir le fil
- Signaler un message

**Dépendances :** `AuthContext` (token)

**Risques si modifié :**
- Quota côté serveur — ne pas implémenter de limite côté client (confiance dans le 409)
- Modération : `reportMessage()` → Edge Function ; ne pas logger le contenu localement

---

### 3.20 Mode Crise Classique (GameContext)

**Rôle :** Mode campagne principal — gouverner via des choix binaires face à des crises.
Jauges, mandats, oppositions, élections, guerre hybride, ministres, régions.

**Écrans :** `app/dashboard.tsx` (HUB), `app/journal.tsx`, `app/election.tsx`,
`app/cabinet.tsx`, `app/regions.tsx`, `app/nation.tsx`, `app/stats.tsx`,
`app/promises.tsx`, `app/mandate-review.tsx`, `app/briefing.tsx`, `app/game-over.tsx`

**Fichiers principaux :**
- `context/GameContext.tsx` — cerveau du mode, détient toutes les jauges
- `logic/crisisEngine.ts` → `applyChoice()`, effets sur jauges/ministres/régions
- `logic/electionEngine.ts` → `computeElection()` — résultats électoraux
- `logic/mediaEngine.ts` → `applyEndOfTurnDrift()`, `revealScandal()`
- `logic/cascadeEngine.ts` → `scheduleCascadeFromChoice()`, `fireDueConsequences()`
- `logic/oppositionLines.ts` → `tickAttackLines()`
- `logic/hybridWarfare.ts` → `tickHostilePower()`, `shouldIssueUltimatum()`
- `logic/warEngine.ts` → `startWar()`, `tickWar()`, `judgeWar()`, `endWar()`
- `logic/regionDynamics.ts` → tensions régionales, candidats
- `logic/ministerDynamics.ts` → fidélité, scandale
- `data/events.ts` → catalogue d'événements (crises)
- `data/ministers.ts` → pool ministres
- `data/regions.ts`, `data/franceGeo.ts` → régions françaises

**Données utilisées :** État complet `GameContext` (non persisté dans `StrategyGameState`)

**Actions joueur :**
- Choisir une option face à un événement de crise
- Nommer / renvoyer un ministre
- Lancer une réforme
- Tenir / briser une promesse de campagne
- Gérer les régions en tension
- Appliquer des contre-mesures à la guerre hybride

**Dépendances :** `core/computeState.ts`, `core/gameSelectors.ts` (calculs mandats),
`data/events.ts` (pool de crises)

**Risques si modifié :**
- `GameContext` est le plus grand fichier du projet — toute modification doit rester dans le contexte,
  ne pas dupliquer la logique dans les écrans
- Les crises en cascade (`cascadeEngine`) peuvent déclencher des effets différés — tester les
  scenarios multi-turns
- `warEngine` a ses propres états internes — ne pas coupler avec `StrategyContext`

---

### 3.21 File offline (OfflineQueue)

**Rôle :** File générique pour les actions réseau non critiques. Retry avec backoff,
idempotence, survie aux redémarrages.

**Fichiers principaux :**
- `services/OfflineQueue.ts` → `enqueue()`, `flushQueue()`, `pruneQueue()`,
  `enqueueAllianceInvite()`, `getQueueSnapshot()`

**Données utilisées :** `AsyncStorage` clé `offline_queue_v1`

**États d'un item :** `queued → sending → success / retrying → failed`

**Backoff :** 10s → 20s → 40s … → 300s max, 5 tentatives max

**Dépendances :** `AllianceService` (flux alliance_invite déjà migré)

**Risques si modifié :**
- **Ne jamais stocker de JWT dans la queue** — `flushQueue(token)` reçoit un token frais
- Rejet HTTP 409/422 → `failed` définitif sans retry
- `flushQueue()` doit être appelé après auth ready au lancement (pas encore câblé — voir section 4)

---

## 4. État actuel des flux partiellement implémentés

| Flux | Statut | Fichier | Action requise |
|---|---|---|---|
| `flushQueue` au lancement | Non câblé | `app/_layout.tsx` | Appeler après `auth ready` |
| `pruneQueue` | Non câblé | `app/_layout.tsx` | Appeler 1x/semaine (vieilles entrées) |
| `enqueueSpyLaunch()` | Non implémenté | `services/OfflineQueue.ts` | Ajouter si offline requis pour spy |
| `enqueueCyberLaunch()` | Non implémenté | `services/OfflineQueue.ts` | Ajouter si offline requis pour cyber |
| `FlatList` journal-crise | Non migré | `app/journal-crise.tsx` | À faire si `news.log` > 50 entrées |
| `FlatList` ranking local | Non migré | `app/ranking.tsx` | À faire si `state.ranking` > 30 bots |

---

## 5. Modules critiques — résumé des risques

| Module | Risque principal | Garde-fou |
|---|---|---|
| `StrategyContext` | Mutation d'état directe depuis un écran | Les écrans lisent `useStrategy()`, n'écrivent jamais |
| `saveMigrations` | Perte de save au bump de version | `?? defaultValue` partout, tests golden |
| `RankedService` | Triche sur le score | Validation **uniquement** côté serveur |
| `newsEngine` | Biais de sélection → difficulté brisée | Biais = recalibrage complet nécessaire |
| `cascadeEngine` | Effets différés invisibles | Tester scenarios multi-turns après modification |
| `AllianceService` | Race condition invite double | Idempotence via `OfflineQueue` |
| `dashboard.tsx` | Re-renders trop fréquents | `React.memo` sur sous-composants, `useMemo` avant guards |
| `AuthContext` | JWT persisté | `setAccessToken()` en mémoire uniquement, jamais AsyncStorage |

---

## 6. Schéma de dépendances inter-modules

```
index.tsx
  └─► StrategyContext.initGame()
        ├─► buildingEngine      (production ressources)
        ├─► newsEngine          (sélection actualités)
        ├─► missionEngine       (missions journalières)
        ├─► botEngine           (classement simulé)
        ├─► operationEngine     (ops diplomatiques)
        ├─► militaryEngine      (unités, doctrine)
        ├─► realTimeEngine      (avancement temps réel)
        ├─► simulationClock     (heure jeu)
        ├─► powerEngine         (score global, XP)
        ├─► core/computeState   (transformations pures)
        ├─► core/gameSelectors  (score mandat)
        └─► strategyStorage     (lecture/écriture)
              ├─► saveMigrations  (migrations versionnées)
              └─► SyncService     (cloud save)

GameContext (mode crise classique)
  ├─► crisisEngine, electionEngine, mediaEngine
  ├─► cascadeEngine, oppositionLines, hybridWarfare, warEngine
  ├─► regionDynamics, ministerDynamics
  └─► core/computeState, core/gameSelectors

Services réseau (auth requis)
  ├─► AllianceService ──► OfflineQueue (fallback)
  ├─► SpyService
  ├─► CyberService
  ├─► RankedService ──► Edge Function /ranked-submit (validation)
  ├─► SyncService   ──► Edge Function /sync-*
  └─► ChatService
```
