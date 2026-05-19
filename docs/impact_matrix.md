# Matrice d'impact des modifications — État de Crise

> Avant toute modification, lire la ligne correspondante ici.
> Complémente `change_guidelines.md` (comment faire) et `functional_map.md` (quoi est quoi).
>
> Colonnes :
> - **Système** — ce qu'on modifie
> - **Fichiers principaux** — où toucher
> - **Modules impactés** — ce qui peut casser ailleurs
> - **Risques** — ce qui peut mal tourner
> - **Tests à faire** — vérifications minimales avant de marquer terminé

---

## Index rapide

| # | Système modifié |
|---|---|
| 1 | [Ressources (`StrategyResources`)](#1-ressources) |
| 2 | [Bâtiments](#2-bâtiments) |
| 3 | [Recherche stratégique](#3-recherche-stratégique) |
| 4 | [Unités militaires](#4-unités-militaires) |
| 5 | [Opérations diplomatiques (IA locale)](#5-opérations-diplomatiques) |
| 6 | [Journal de Crise (`newsEngine`)](#6-journal-de-crise) |
| 7 | [Missions journalières](#7-missions-journalières) |
| 8 | [Classement local (bots)](#8-classement-local-bots) |
| 9 | [Mode classé (Supabase)](#9-mode-classé) |
| 10 | [Alliances](#10-alliances) |
| 11 | [Espionnage async](#11-espionnage-async) |
| 12 | [Cyberattaques async](#12-cyberattaques-async) |
| 13 | [Sauvegarde locale & migrations](#13-sauvegarde-locale--migrations) |
| 14 | [Cloud Save](#14-cloud-save) |
| 15 | [Auth / Compte sécurisé](#15-auth--compte-sécurisé) |
| 16 | [StrategyGameState (type)](#16-strategygamestate-type) |
| 17 | [StrategyContext (actions)](#17-strategycontext-actions) |
| 18 | [Mode Crise Classique — Jauges](#18-mode-crise-classique--jauges) |
| 19 | [Mode Crise Classique — Événements (crises)](#19-mode-crise-classique--événements) |
| 20 | [Mode Crise Classique — Ministres](#20-mode-crise-classique--ministres) |
| 21 | [Mode Crise Classique — Élections](#21-mode-crise-classique--élections) |
| 22 | [Mode Crise Classique — Guerre hybride](#22-mode-crise-classique--guerre-hybride) |
| 23 | [File offline (OfflineQueue)](#23-file-offline-offlinequeue) |
| 24 | [Achats (Shop)](#24-achats-shop) |
| 25 | [Chat global](#25-chat-global) |
| 26 | [Feature flags](#26-feature-flags) |
| 27 | [Horloge de simulation (`simulationClock`)](#27-horloge-de-simulation) |
| 28 | [Carte mondiale (`worldmap`)](#28-carte-mondiale) |
| 29 | [Télémétrie locale](#29-télémétrie-locale) |
| 30 | [Dashboard (hub principal)](#30-dashboard) |

---

## 1. Ressources

**Fichiers principaux :** `types/strategy.ts` (`StrategyResources`), `logic/resources.ts`,
`logic/buildingEngine.ts`, `context/StrategyContext.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Bâtiments | Coûts d'upgrade payés en ressources |
| Opérations | Coût de chaque opération diplomatique |
| Unités militaires | Coût d'entraînement + upkeep quotidien |
| Recherche | Coût de chaque branche de recherche |
| Missions | Certaines missions ciblent des seuils de ressources |
| Classement local | `calculateGlobalPower()` dépend des ressources |
| Sauvegarde | `state.resources` persisté — migration si nouveau champ |
| Validators | `isValidStrategyGameState()` vérifie les champs critiques |

**Risques :**
- Ajouter une ressource → crashe les saves existantes si non migrée
- Modifier `INITIAL_RESOURCES` → déséquilibre le début de partie
- Changer l'accumulation (taux ou timer) → impact global sur tous les coûts
- Renommer une clé `ResourceKey` → tout le code qui l'utilise en dur casse

**Tests à faire :**
```
[ ] Nouvelle partie : ressources initialisées correctement
[ ] Upgrade bâtiment : ressources déduites et production reflétée
[ ] Opération : coût déduit, ressources non négatives
[ ] Sauvegarde v(n-1) chargeable sans crash
[ ] npx tsc --noEmit — zéro erreur
[ ] npm run test:golden (buildingEngine, computeState)
```

---

## 2. Bâtiments

**Fichiers principaux :** `data/buildings.ts`, `logic/buildingEngine.ts`,
`context/StrategyContext.tsx` (action `upgradeBuilding`), `app/buildings.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Ressources | Production par bâtiment modifiée |
| Opérations | Certaines ops nécessitent un bâtiment à un niveau minimum |
| Recherche | Prérequis de bâtiment pour certaines branches |
| Missions | Missions de type `upgrade_building` |
| Sauvegarde | `state.buildings: PlayerBuilding[]` persisté |
| `simulationClock` | `upgradeEndsAtGameHour` source de vérité des durées |

**Risques :**
- Changer `maxLevel` → les saves avec `level > nouveau maxLevel` deviennent incohérentes
- Supprimer un `BuildingId` → `INITIAL_BUILDINGS` incomplet → crash au chargement
- Modifier `upgradeEndsAtGameHour` sans respecter `migrateRealMsTimestamp()` → durées corrompues
- Changer les coûts sans ajuster les données → missions deviennent impossibles

**Tests à faire :**
```
[ ] Upgrade d'un bâtiment : durée, coût, production post-upgrade corrects
[ ] Bâtiment déjà au max : bouton upgrade désactivé
[ ] Save v(n-1) avec upgrade en cours : se charge et termine normalement
[ ] Opération nécessitant ce bâtiment : unlock correct
[ ] npm run test:golden (buildingUpgrade)
```

---

## 3. Recherche stratégique

**Fichiers principaux :** `data/strategyResearch.ts`, `types/strategyResearch.ts`,
`context/StrategyContext.tsx` (action `unlockResearch`), `app/strategy-research.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Ressources | Coût de chaque recherche |
| Bâtiments | Certaines recherches ont des prérequis de bâtiments |
| Opérations | Certaines recherches débloquent ou améliorent des opérations |
| Sauvegarde | `state.strategyResearch` persisté (migration v2) |

**Risques :**
- Ajouter un ID de recherche → doit être présent dans `DEFAULT_RESEARCH_STATE` ou migré
- Modifier les prérequis d'une branche → joueurs qui avaient débloqué une branche "locked" rétroactivement

**Tests à faire :**
```
[ ] Débloquer une recherche : coût déduit, bonus appliqué
[ ] Prérequis non rempli : branche inaccessible
[ ] Save v(n-1) sans le nouveau champ : s'initialise via DEFAULT_RESEARCH_STATE
[ ] npx tsc --noEmit — zéro erreur
```

---

## 4. Unités militaires

**Fichiers principaux :** `data/units.ts`, `data/militaryDoctrines.ts`, `types/units.ts`,
`logic/militaryEngine.ts`, `context/StrategyContext.tsx`, `app/forces-armees.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Ressources | Coût d'entraînement + `calculateDailyUpkeep()` |
| Opérations | `getOperationUnitBonus()` modifie les résultats d'opérations |
| Classement | `calculateMilitaryPower()` contribue à `calculateGlobalPower()` |
| Sauvegarde | `state.playerUnits`, `state.trainingQueue`, `state.militaryDoctrine` persistés |

**Risques :**
- Modifier `TrainingQueueEntry` → saves avec des entrées en cours d'entraînement corrompues
- Changer `UnitId` → références dans les saves deviennent invalides
- Modifier `calculateDailyUpkeep()` → drain de ressources inattendu pour les saves existantes

**Tests à faire :**
```
[ ] Entraîner une unité : durée et coût corrects
[ ] File d'entraînement avec 2 unités en cours : order préservé après sauvegarde/chargement
[ ] Changer de doctrine militaire : bonus appliqué aux opérations
[ ] Save v(n-1) avec unités : se charge sans crash
[ ] Upkeep quotidien : ressources déduites correctement
```

---

## 5. Opérations diplomatiques

**Fichiers principaux :** `logic/operationEngine.ts`, `data/countries.ts`,
`types/strategy.ts` (`OperationType`, `CountryRelation`), `context/StrategyContext.tsx`,
`app/operations.tsx`, `hooks/useCommand.ts`

| Modules impactés | Pourquoi |
|---|---|
| Ressources | Coût de chaque opération |
| Relations pays | `CountryRelation.score` et `operationCooldowns` modifiés |
| Classement | `state.stats.rankingPoints` mis à jour après opération réussie |
| Mode classé | `recordEvent()` enregistré si run classée active |
| Unités | `getOperationUnitBonus()` influe sur le résultat |
| Missions | Missions de type `launch_operation` et `win_operation` |
| Carte mondiale | Statut de relation reflété visuellement |

**Risques :**
- Ajouter un `OperationType` → `operationCooldowns` est un `Partial<Record>` — compatible
  mais les saves existantes n'ont pas ce cooldown
- Modifier `resolveOperation()` → impact direct sur l'équilibre du jeu
- Changer le format de `OperationResult` → screens affichant le résultat peuvent crasher

**Tests à faire :**
```
[ ] Opération réussie : ressources déduites, relation mise à jour, points attribués
[ ] Opération échouée : feedback correct, état rollback propre
[ ] Cooldown : bouton désactivé pendant la durée
[ ] Double-clic : une seule opération lancée (useCommand)
[ ] Prérequis bâtiment : opération bloquée si bâtiment insuffisant
[ ] Mission complétée automatiquement après opération
[ ] recordEvent() appelé si mode classé actif
```

---

## 6. Journal de Crise

**Fichiers principaux :** `logic/newsEngine.ts`, `data/newsEvents.ts`,
`types/strategy.ts` (`NewsType`, `NewsUrgency`), `context/StrategyContext.tsx`,
`app/journal-crise.tsx`, `components/NewsCard.tsx`, `components/InteractiveNewsModal.tsx`

| Modules impactés | Pourquoi |
|---|---|
| `tensionEngine` | `computeNationalTension()` utilisé dans le modal interactif |
| Mémoire politique (`publicMemory`) | Certains choix génèrent des `DecisionTrace` |
| Conséquences différées | Choix d'une news interactive peut déclencher des cascades |
| Sauvegarde | `state.news` (log, pendingIds, cooldowns) persisté |
| Mode classé | `recordEvent()` sur les décisions interactives |

**Risques :**
- Modifier le scoring de `selectNextNews()` → biais de sélection = difficulté brisée
- Vider `pendingIds` sans mettre à jour `log` → news disparaissent sans trace
- Ajouter un `NewsType` → les filtres dans `journal-crise.tsx` doivent être mis à jour
- Modifier `NewsEvent` dans `newsEvents.ts` → save avec des IDs orphelins dans `pendingIds`

**Tests à faire :**
```
[ ] Événement mineur : apparaît dans le log avec le bon type et urgence
[ ] Événement interactif : modal s'ouvre, choix disponibles, effet appliqué
[ ] Dismiss news : sortie de pendingIds, aucune entrée dans le log
[ ] Filtre par type : seules les news du type sélectionné affichées
[ ] Save avec news en attente : rechargement → news toujours en attente
[ ] 50+ entrées dans le log : pas de freeze (FlatList ou useMemo)
```

---

## 7. Missions journalières

**Fichiers principaux :** `logic/missionEngine.ts`, `data/missions.ts`,
`types/strategy.ts` (`MissionDef`, `PlayerMission`), `context/StrategyContext.tsx`,
`app/missions.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Ressources | Récompenses en ressources |
| Opérations | Missions de type `launch_operation` — progress auto |
| Bâtiments | Missions de type `upgrade_building` |
| Classement | Missions `reach_power` dépendent de `calculateGlobalPower()` |
| Sauvegarde | `state.missions: PlayerMission[]` persisté |

**Risques :**
- Modifier les IDs dans `data/missions.ts` → saves avec `defId` orphelins (missions disparaissent)
- Changer `timeUntilReset()` → rotation décalée = missions jamais renouvelées ou trop fréquentes
- Ajouter un `MissionType` sans implémenter sa progression dans `checkMissionProgress()` → stuck à 0%

**Tests à faire :**
```
[ ] Missions générées au lancement : 3 missions distinctes, pas de doublons
[ ] Complétion automatique après l'action correspondante
[ ] Collecte de récompense : ressources créditées, mission marquée complète
[ ] Rotation : après expiration, 3 nouvelles missions générées
[ ] Save : missions en cours rechargées avec progression correcte
```

---

## 8. Classement local (bots)

**Fichiers principaux :** `logic/botEngine.ts`, `logic/botStrategyEngine.ts`,
`data/bots.ts`, `logic/powerEngine.ts`, `context/StrategyContext.tsx`, `app/ranking.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Ressources | `calculateGlobalPower()` dépend des ressources |
| Bâtiments | Niveau des bâtiments contribue à la puissance |
| Unités | `calculateMilitaryPower()` dans la formule de puissance |
| Mode classé | `rankingPoints` affiché ici, soumis au classement mondial |
| Alliances | Invitations affichées sur cet écran |
| Sauvegarde | `state.ranking`, `state.stats` persistés |

**Risques :**
- Modifier `calculateGlobalPower()` → formule de score cassée pour le mode classé **et** local
- Changer `growthPerHour` des bots → courbe de difficulté brisée
- `state.ranking` recalculé côté client — toute "triche" locale est inoffensive sur le score classé

**Tests à faire :**
```
[ ] Classement trié correctement après une action (upgrade, op réussie)
[ ] Rang du joueur correct par rapport aux bots
[ ] Titre (Leader Mondial, Superpuissance…) cohérent avec le rang
[ ] Badge invitation alliance visible si invitations en attente
[ ] Lien vers classement mondial fonctionnel
```

---

## 9. Mode classé

**Fichiers principaux :** `services/RankedService.ts`, `logic/rankedScoreFormula.ts`,
`app/ranking-global.tsx`, `app/index.tsx`, `utils/validators.ts` (`validateLeaderboardEntry`)

| Modules impactés | Pourquoi |
|---|---|
| `StrategyContext` | `recordEvent()` appelé à chaque action classée |
| `AuthContext` | Token requis pour `startRankedRun()` et `submitRankedRun()` |
| `OfflineQueue` | Retry de soumission si hors ligne |
| Classement local | Même formule de puissance (`calculateGlobalPower`) |
| Supabase | Edge Functions `/ranked-start`, `/ranked-submit` |

**Risques :**
- Modifier la formule de score (`rankedScoreFormula.ts`) → invalide toutes les runs en cours
- Modifier `recordEvent()` → journal incomplet → rejet par le serveur
- Valider le score côté client → triche triviale (règle absolue : **validation serveur uniquement**)
- Modifier le hash d'intégrité → mismatch serveur → toutes les soumissions rejetées

**Tests à faire :**
```
[ ] Démarrer une run classée : runId et seed reçus, méta stockée en local
[ ] recordEvent() : journal local croît correctement à chaque action
[ ] Soumettre : données envoyées, résultat reflété dans ranking-global.tsx
[ ] Hors ligne : soumission mise en queue, retry au prochain lancement
[ ] Leaderboard mondial : entrées filtrées via validateLeaderboardEntry()
[ ] JSON malformé du serveur : ne crashe pas l'écran
```

---

## 10. Alliances

**Fichiers principaux :** `services/AllianceService.ts`, `services/OfflineQueue.ts`,
`utils/validators.ts` (`validateAlliance`), `app/alliances.tsx`, `app/player-profile.tsx`,
`config/features.ts` (`enableAlliances`)

| Modules impactés | Pourquoi |
|---|---|
| `AuthContext` | Token requis pour chaque appel |
| `OfflineQueue` | `enqueueAllianceInvite()` si hors ligne |
| Classement local | `computeAllianceBonuses()` potentiellement appliqué aux ressources |
| `ranking.tsx` | Compte d'invitations en attente affiché |

**Risques :**
- Modifier `Alliance` interface sans mettre à jour `validateAlliance()` → entrées ignorées silencieusement
- Double invite depuis `player-profile.tsx` → idempotence via `OfflineQueue` (même `id`)
- `FEATURES.enableAlliances = false` → appel réseau effectué quand même si le guard est absent

**Tests à faire :**
```
[ ] FEATURES.enableAlliances = false : FeatureUnavailable affiché, aucun appel réseau
[ ] Envoyer une invitation (online) : statut "pending" visible chez les deux joueurs
[ ] Envoyer une invitation (offline) : statut "queued" visible, envoyée au prochain lancement
[ ] Accepter / refuser : statut mis à jour, bonus calculés
[ ] JSON malformé du serveur : filterValid() ignore les entrées invalides, pas de crash
```

---

## 11. Espionnage async

**Fichiers principaux :** `services/SpyService.ts`, `utils/validators.ts` (`validateSpyOp`),
`app/spy-ops.tsx`, `config/features.ts` (`enableSpyOps`)

| Modules impactés | Pourquoi |
|---|---|
| `AuthContext` | Token requis |
| Classement mondial | Résultats d'espionnage peuvent affecter le score adversaire |

**Risques :**
- `fetchSpyOps()` retourne `[]` sur erreur — ne jamais throw ni afficher d'erreur fatale
- Modifier `SpyOp` sans mettre à jour `validateSpyOp()` → données ignorées silencieusement
- `FEATURES.enableSpyOps = false` → guard manquant dans le service → appel réseau quand même

**Tests à faire :**
```
[ ] FEATURES.enableSpyOps = false : FeatureUnavailable, aucun appel réseau
[ ] Lancer une op spy : réponse du serveur correctement parsée
[ ] Résultats spy : affichés après résolution serveur (refresh manuel ou pull-to-refresh)
[ ] JSON malformé : filterValid() filtre, aucun crash
[ ] Sans auth : écran redirige ou affiche état vide propre
```

---

## 12. Cyberattaques async

**Fichiers principaux :** `services/CyberService.ts`, `utils/validators.ts` (`validateCyberOp`),
`app/cyber-ops.tsx`, `config/features.ts` (`enableCyberOps`)

| Modules impactés | Pourquoi |
|---|---|
| `AuthContext` | Token requis |
| Ressources joueur | `pending_debuff_pct` réduit temporairement la production |

**Risques :**
- `pending_debuff_pct` est `number | null` — usage sans vérification de type → NaN dans les calculs
- Deux arrays distincts `sent` / `received` — les confondre = affichage inversé

**Tests à faire :**
```
[ ] FEATURES.enableCyberOps = false : FeatureUnavailable, aucun appel réseau
[ ] Lancer une cyberattaque : entrée visible dans "sent"
[ ] Attaque reçue : visible dans "received", debuff affiché
[ ] pending_debuff_pct null : aucune erreur d'affichage
[ ] JSON malformé : filterValid() sur sent et received, pas de crash
```

---

## 13. Sauvegarde locale & migrations

**Fichiers principaux :** `storage/strategyStorage.ts`, `storage/saveMigrations.ts`,
`storage/saveSlots.ts`, `utils/validators.ts` (`isValidStrategyGameState`),
`types/strategy.ts` (`StrategyGameState`)

| Modules impactés | Pourquoi |
|---|---|
| **Tous les modules** | Chaque champ de `StrategyGameState` est persisté |
| `SyncService` | Upload déclenché après chaque sauvegarde locale |
| `StrategyContext` | Fast-path `isValidStrategyGameState()` avant migration |

**Risques :**
- Supprimer un champ → crash au chargement des saves existantes
- Oublier de bumper `CURRENT_SAVE_VERSION` → migration non appliquée
- Oublier `?? defaultValue` dans la migration → champs `undefined` crashent les moteurs
- Modifier `isValidStrategyGameState()` trop restrictivement → saves valides rejetées, perte de données

**Tests à faire :**
```
[ ] Save v(n-1) chargeable sans crash ni perte de données
[ ] CURRENT_SAVE_VERSION bumpé correctement
[ ] Nouveau champ présent avec la valeur par défaut après migration
[ ] 6 emplacements de sauvegarde : save/load/delete fonctionnels indépendamment
[ ] npm run test:golden (saveMigrations)
[ ] npx tsc --noEmit — zéro erreur
```

---

## 14. Cloud Save

**Fichiers principaux :** `services/SyncService.ts`, `utils/validators.ts` (`validateCloudSave`),
`context/AuthContext.tsx`

| Modules impactés | Pourquoi |
|---|---|
| `strategyStorage` | Source locale pour l'upload |
| `AuthContext` | Token frais requis pour chaque opération |
| `StrategyContext` | `syncOnLaunch()` peut overrider l'état local au lancement |

**Risques :**
- Persister le JWT → fuite de session (invariant absolu)
- Court-circuiter `validateCloudSave()` → données corrompues chargées directement
- Conflit cloud/local non résolu → `syncOnLaunch()` choisit la plus récente (last-write-wins)

**Tests à faire :**
```
[ ] Upload après sauvegarde : fire-and-forget, jeu non bloqué
[ ] Download : données validées avant usage, fallback sur local si invalide
[ ] Conflit : timestamp serveur > local → cloud appliqué ; local > serveur → local conservé
[ ] Sans auth : aucun appel réseau, jeu jouable offline
[ ] Token null : uploadSave() retourne silencieusement, pas de crash
```

---

## 15. Auth / Compte sécurisé

**Fichiers principaux :** `context/AuthContext.tsx`, `app/account-link.tsx`,
`app/_layout.tsx`

| Modules impactés | Pourquoi |
|---|---|
| **Tous les services réseau** | Chaque service dépend de `auth.accessToken` |
| `OfflineQueue` | `flushQueue(token)` appelé après auth ready |
| `RankedService` | `retryPendingSubmission()` appelé après auth ready |
| `SyncService` | `syncOnLaunch()` appelé après auth ready |

**Risques :**
- Persistre le token dans AsyncStorage → fuite de session
- Appeler `flushQueue()` avant que le token soit prêt → toutes les actions réseau échouent
- `isEnabled` vs `isLinked` confondus → features réseau inaccessibles pour un compte valide

**Tests à faire :**
```
[ ] Connexion Google/Apple : token disponible, features réseau débloquées
[ ] Déconnexion : token nullifié, services tombent en mode offline proprement
[ ] Relancement sans auth : jeu jouable, classement local visible, réseau indisponible
[ ] flushQueue() appelé après auth ready (et non avant)
```

---

## 16. StrategyGameState (type)

**Fichiers principaux :** `types/strategy.ts`, `storage/saveMigrations.ts`,
`utils/validators.ts`

| Modules impactés | Pourquoi |
|---|---|
| **Toute l'app** | C'est l'état central du mode stratégie |
| `saveMigrations.ts` | Migration obligatoire pour chaque nouveau champ |
| `validators.ts` | `isValidStrategyGameState()` vérifie les champs critiques |
| `SyncService` | Structure envoyée en cloud |

**Risques :**
- Champ non optionnel sans valeur par défaut → crash au chargement des saves
- Champ optionnel absent de la migration → `undefined` en runtime

**Règle absolue :** Tout nouveau champ dans `StrategyGameState` →
1. Optionnel (`?`) ou avec valeur par défaut
2. Migration dans `saveMigrations.ts`
3. `CURRENT_SAVE_VERSION` bumpé
4. `npx tsc --noEmit` propre

**Tests à faire :**
```
[ ] Save v(n-1) : nouveau champ initialisé avec la valeur par défaut
[ ] npm run test:golden (saveMigrations)
[ ] npx tsc --noEmit — zéro erreur
```

---

## 17. StrategyContext (actions)

**Fichiers principaux :** `context/StrategyContext.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Tous les écrans | Chaque écran consomme `useStrategy()` |
| Toutes les sauvegardes | `saveStrategy()` appelé après chaque mutation |
| `RankedService` | `recordEvent()` appelé depuis certaines actions |

**Risques :**
- Déplacer une logique de mutation dans un écran → état incohérent si appelé de deux endroits
- Ajouter un hook après un `return` conditionnel → violation des règles React (crash)
- Timer de tick qui accumule → fuite mémoire si `clearInterval` absent

**Tests à faire :**
```
[ ] Action depuis un écran : état mis à jour, save déclenché
[ ] Aucune mutation directe depuis un écran (grep "state." dans les .tsx)
[ ] Hooks tous avant le premier return conditionnel
[ ] Rechargement de l'app : état restauré identique
```

---

## 18. Mode Crise Classique — Jauges

**Fichiers principaux :** `context/GameContext.tsx`, `logic/gameEngine.ts`,
`logic/crisisEngine.ts`, `core/computeState.ts`

| Modules impactés | Pourquoi |
|---|---|
| Événements | Chaque choix modifie les jauges |
| Game Over | `checkGameOver()` surveille les seuils |
| Élections | Score dépend des jauges à l'instant du vote |
| Médias | `applyEndOfTurnDrift()` fait dériver les jauges |
| Ministres | Effets de fidélité sur les jauges |
| Régions | Tensions régionales impactent les jauges nationales |

**Risques :**
- Modifier `INITIAL_GAUGES` → début de partie trop facile ou trop difficile
- Changer les bornes (0-100) sans adapter `clamp()` → jauges hors limites
- Modifier `applyIndicatorEffects()` dans `core/computeState.ts` → casse les golden tests

**Tests à faire :**
```
[ ] Choix d'événement : jauges modifiées dans les bonnes proportions
[ ] Jauge à 0 : game over déclenché si la jauge est critique
[ ] Jauge à 100 : pas de dépassement
[ ] npm run test:golden (computeState)
[ ] Drift inter-tour : jauges convergent vers leur valeur naturelle
```

---

## 19. Mode Crise Classique — Événements

**Fichiers principaux :** `data/events.ts`, `logic/crisisEngine.ts`,
`context/GameContext.tsx`, `components/EventModal.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Jauges | `applyChoice()` modifie jauges, hidden gauges |
| Ministres | `applyMinisterEffects()` |
| Régions | `applyRegionEffects()` |
| Cascade | `scheduleCascadeFromChoice()` → effets différés |
| Médias | Narratives générées après chaque choix |
| Mémoire politique | `DecisionTrace` créée pour certains choix |
| Mode classé | `recordEvent()` si run classée |

**Risques :**
- Modifier `EventChoice.effects` → toute la chaîne de conséquences change
- Supprimer un événement référencé dans une cascade → crash sur `fireDueConsequences()`
- Ajouter une propriété à `CrisisEvent` sans adapter `EventModal` → affichage cassé

**Tests à faire :**
```
[ ] Choix A et B : effets distincts appliqués correctement
[ ] Cascade différée : événement déclenché N tours plus tard
[ ] Événement hybride (guerre hybride + crise) : les deux systèmes cohérents
[ ] Game over non déclenché si les jauges restent dans les bornes
[ ] recordEvent() enregistré si mode classé actif
```

---

## 20. Mode Crise Classique — Ministres

**Fichiers principaux :** `data/ministers.ts`, `logic/ministerDynamics.ts`,
`context/GameContext.tsx`, `app/cabinet.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Jauges | Bonus de compétence sur les effets d'événements |
| Scandale | `scandalRisk` peut déclencher une révélation via `mediaEngine` |
| Régions | Certains ministres ont des effets régionaux |
| Élections | Loyauté des ministres influe sur le score électoral |

**Risques :**
- Modifier `applySpecialtyBonus()` → tous les effets de ministres changent globalement
- Ajouter un ministre sans l'ajouter au `MINISTER_POOL` → jamais sélectionnable
- Changer `scandalRisk` sans ajuster le seuil dans `mediaEngine` → scandales trop fréquents ou jamais

**Tests à faire :**
```
[ ] Remplacer un ministre : nouveau ministre actif, bonus changé
[ ] Scandale révélé : ministre renvoyé, jauges impactées
[ ] Loyauté basse : effets négatifs visibles sur les jauges
[ ] Cabinet complet : tous les postes affichés, aucun doublon
```

---

## 21. Mode Crise Classique — Élections

**Fichiers principaux :** `logic/electionEngine.ts`, `context/GameContext.tsx`,
`app/election.tsx`, `logic/regionDynamics.ts`

| Modules impactés | Pourquoi |
|---|---|
| Jauges | Score électoral calculé à partir des jauges |
| Régions | `pickRegionalCandidate()` — dynamiques régionales |
| Promesses | `CampaignPromises` impactent le score |
| Mémoire politique | `DecisionTrace` dépriment ou boostent l'électorat |
| Opposition | Réaction de l'opposition influence le score |
| Game Over | Défaite électorale peut terminer le mandat |

**Risques :**
- Modifier `computeElection()` → équilibre du jeu entier chamboulé
- Changer la durée d'un mandat → timers et progression de campagne décalés
- Modifier `pickRegionalCandidate()` sans tester → crash si région sans candidat valide

**Tests à faire :**
```
[ ] Élection avec jauges hautes : victoire probable
[ ] Élection avec jauges basses : défaite probable
[ ] Promesses tenues : bonus électoral appliqué
[ ] Promesses brisées : malus électoral appliqué
[ ] Mémoire politique négative : impacte le score
[ ] Défaite : game-over ou second mandat selon la config
```

---

## 22. Mode Crise Classique — Guerre hybride

**Fichiers principaux :** `logic/hybridWarfare.ts`, `logic/warEngine.ts`,
`data/hostilePowers.ts`, `data/hybridVectors.ts`, `data/hybridCountermeasures.ts`,
`context/GameContext.tsx`, `components/HybridThreatPanel.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Jauges | `tickHostilePower()` fait dériver les jauges |
| Événements | Ultimatum → événement spécial (`ULTIMATUM_EVENT_ID`) |
| Guerre (warEngine) | Si ultimatum ignoré → état de guerre activé |
| Journal classique | Événements hybrides archivés |
| Dashboard | `HybridThreatPanel` affiché si menace active |

**Risques :**
- Modifier `shouldIssueUltimatum()` → ultimatum déclenché trop tôt ou jamais
- Modifier `warEngine` sans tester `endWar()` → état de guerre jamais résolu → partie bloquée
- `WAR_EVENT_LOOKUP` → événement de guerre manquant → crash dans `pickWarEvent()`

**Tests à faire :**
```
[ ] Menace hybride : HybridThreatPanel visible, jauges affectées
[ ] Contre-mesure appliquée : réduction de la menace
[ ] Ultimatum : événement déclenché correctement
[ ] Guerre déclarée : `warEngine` actif, événements de guerre disponibles
[ ] Fin de guerre : retour à l'état normal, pas de freeze
```

---

## 23. File offline (OfflineQueue)

**Fichiers principaux :** `services/OfflineQueue.ts`

| Modules impactés | Pourquoi |
|---|---|
| `AllianceService` | Flux `alliance_invite` déjà migré |
| `AuthContext` | Token frais fourni à `flushQueue()` |
| `app/_layout.tsx` | Câblage du `flushQueue()` au lancement (non encore fait) |

**Risques :**
- Persister un JWT dans la queue → fuite de session
- Ne pas vérifier l'idempotence → même action envoyée deux fois
- Boucle infinie si `isDefinitiveRejection()` ne couvre pas tous les cas de rejet serveur

**Tests à faire :**
```
[ ] Action offline (wifi coupé) : mise en queue visible dans getQueueSnapshot()
[ ] Reconnexion : flushQueue() envoie et marque "success"
[ ] HTTP 409 : item marqué "failed", pas de retry
[ ] 5 tentatives épuisées : item marqué "failed" définitif
[ ] pruneQueue() : entrées > 7 jours supprimées
[ ] Pas de JWT dans les payloads persistés
```

---

## 24. Achats (Shop)

**Fichiers principaux :** `lib/purchases.ts`, `lib/entitlements.ts`,
`data/countryPacks.ts`, `data/doctrinesPacks.ts`, `data/portraits.ts`, `data/themes.ts`,
`services/GameSecurityService.ts`, `app/shop.tsx`

| Modules impactés | Pourquoi |
|---|---|
| `index.tsx` | Pays et doctrines verrouillés selon entitlements |
| `app/saves.tsx` | Slots bonus 4-6 déverrouillés par achat |
| `hooks/useColors.ts` | Thème UI appliqué globalement si pack thème acheté |
| `GameSecurityService` | Vérification intégrité des achats |

**Risques :**
- Simuler un achat côté client → contourné par `GameSecurityService`
- Changer un `packId` sans gérer la rétrocompatibilité → acheteurs existants perdent l'accès
- `restorePurchases()` absent ou cassé → rejet App Store

**Tests à faire :**
```
[ ] Pack pays acheté : pays déverrouillé dans index.tsx
[ ] Pack doctrine acheté : doctrine disponible à la création de partie
[ ] Restaurer achats : entitlements rechargés, accès rétabli
[ ] Achat non effectué : contenu verrouillé, pas d'accès
[ ] GameSecurityService : achat invalide détecté et rejeté
```

---

## 25. Chat global

**Fichiers principaux :** `services/ChatService.ts`, `app/chat.tsx`, `context/AuthContext.tsx`

| Modules impactés | Pourquoi |
|---|---|
| `AuthContext` | Token requis |

**Risques :**
- Limite de quota côté client → contournable ; la vraie limite est côté serveur (409)
- Stocker des messages localement → problèmes de modération (jamais logger le contenu)
- Input sans limite de longueur côté client → envoi de messages trop longs

**Tests à faire :**
```
[ ] Envoyer un message (< 200 chars) : apparaît dans le fil
[ ] Envoyer > 10 messages/24h : erreur "quota-exceeded" affichée
[ ] Sans auth : écran vide ou message "connexion requise"
[ ] Signalement : message envoyé à la modération côté serveur
[ ] Pull-to-refresh : messages mis à jour
```

---

## 26. Feature flags

**Fichiers principaux :** `config/features.ts`, écrans utilisant `FEATURES.*`

| Modules impactés | Pourquoi |
|---|---|
| `alliances.tsx` | `enableAlliances` |
| `spy-ops.tsx` | `enableSpyOps` |
| `cyber-ops.tsx` | `enableCyberOps` |
| `ranking-global.tsx` | `enableGlobalLeaderboard` |
| `entities.tsx` | `enableEntities` |
| `dev-stats.tsx` | `enableDevStats` (DEV uniquement) |

**Risques :**
- Flag à `false` sans guard dans l'écran → feature accessible quand même
- Guard placé APRÈS un hook → violation React (règles des hooks)
- Guard dans le service absent → appels réseau effectués même si flag à `false`

**Règle :** `if (!FEATURES.enableX) return <FeatureUnavailable />` — APRÈS tous les hooks,
ET vérification dans la fonction du service.

**Tests à faire :**
```
[ ] Chaque flag à false : FeatureUnavailable affiché, aucun appel réseau
[ ] Chaque flag à true : feature accessible normalement
[ ] Guard après tous les hooks (pas de hook après le return conditionnel)
```

---

## 27. Horloge de simulation

**Fichiers principaux :** `logic/simulationClock.ts`, `logic/realTimeEngine.ts`,
`context/StrategyContext.tsx`

| Modules impactés | Pourquoi |
|---|---|
| Bâtiments | `upgradeEndsAtGameHour` — source de vérité |
| Unités | `TrainingQueueEntry` — durée d'entraînement |
| Missions | `timeUntilReset()` — rotation quotidienne |
| Ressources | Timer de production basé sur l'heure jeu |

**Risques :**
- Modifier la vitesse de l'horloge → durées d'upgrade déjà en cours incohérentes
- Mélanger `gameHour` (depuis `startedAt`) et timestamp réel (ms epoch) → comparaisons fausses
- `migrateRealMsTimestamp()` absent pour une ancienne save → durée corrompue

**Tests à faire :**
```
[ ] Upgrade en cours : durée restante correcte après relancement de l'app
[ ] Vitesse modifiée : durées existantes rebaselinées via migrateRealMsTimestamp()
[ ] Heure jeu cohérente entre StrategyContext et les moteurs
[ ] npm run test:golden
```

---

## 28. Carte mondiale

**Fichiers principaux :** `app/worldmap.tsx`, `logic/hotspotEngine.ts`,
`data/mapWorld.ts`, `data/isoCountryMap.ts`

| Modules impactés | Pourquoi |
|---|---|
| Opérations | Tap sur un pays → navigation vers `operations.tsx` avec `countryId` |
| Relations | Couleur de chaque pays selon `CountryRelation.status` |

**Risques :**
- Ajouter un pays dans `countries.ts` sans l'ajouter dans `isoCountryMap.ts` → pays non tapable
- Recalcul SVG à chaque render → performances dégradées sur appareils bas de gamme

**Tests à faire :**
```
[ ] Tap sur un pays : navigation vers opérations avec le bon countryId
[ ] Zoom/pan : gestes fluides, pas de freeze
[ ] Statut de relation : couleur cohérente avec state.relations
[ ] Nouveau pays dans countries.ts : visible sur la carte et tapable
```

---

## 29. Télémétrie locale

**Fichiers principaux :** `services/TelemetryService.ts`, `storage/balanceStorage.ts`

| Modules impactés | Pourquoi |
|---|---|
| `StrategyContext` | `trackGameStarted()`, `trackCrisisResolved()`, `trackActionUsed()` |
| `app/dev-stats.tsx` | Visualisation des stats en mode DEV |

**Risques :**
- Buffer AsyncStorage non borné → croissance indéfinie
- Données envoyées automatiquement → violation de la politique de confidentialité
  (le buffer est **local uniquement**, aucun envoi automatique)

**Tests à faire :**
```
[ ] Buffer local : données stockées dans AsyncStorage, pas envoyées
[ ] enableDevStats = false : dev-stats.tsx inaccessible
[ ] Buffer plein : les entrées les plus vieilles écrasées, pas de crash
```

---

## 30. Dashboard

**Fichiers principaux :** `app/dashboard.tsx`, `context/GameContext.tsx`,
`context/StrategyContext.tsx`, composants `NavCard`, `SectionHeading`, `GaugeBar`

| Modules impactés | Pourquoi |
|---|---|
| **Tous les modules** | Le dashboard navigue vers tout et affiche l'état global |
| Performance | Tick toutes les quelques secondes → re-renders fréquents |

**Risques :**
- Ajouter un composant non memoïsé → re-render inutile à chaque tick
- Hook placé après `if (!state.president) return null` → violation React
- Agrégations inline après le guard conditionnel → impossible à `useMemo`

**Règle :** Tout nouveau sous-composant du dashboard → `React.memo`. Toute dérivation
coûteuse → `useMemo` avant le guard conditionnel (avec garde `if (!state) return ...` dans le memo).

**Tests à faire :**
```
[ ] Jauges s'affichent correctement (mode Crise Classique)
[ ] ResourceStrip mis à jour à chaque tick (mode Stratégie)
[ ] Navigation vers chaque sous-écran fonctionnelle
[ ] Pas de re-render inutile des NavCard (React.memo actif)
[ ] Modal événement s'ouvre et se ferme sans perte d'état
```

---

## Annexe — Checklist transversale avant tout MODE DELTA

```
[ ] TypeScript propre : npx tsc --noEmit (zéro erreur hors supabase/functions/)
[ ] Golden tests verts : npm run test:golden
[ ] Feature flag testé à false si applicable
[ ] Save v(n-1) chargeable : une ancienne save charge sans erreur
[ ] Données réseau invalides : JSON malformé ne crashe pas
[ ] Pas de double-clic possible sur les nouvelles actions (useCommand si nécessaire)
[ ] StrategyGameState modifié → migration + CURRENT_SAVE_VERSION bumpé
[ ] Nouveau endpoint réseau → données validées via validators.ts avant usage
[ ] JWT jamais persisté dans AsyncStorage
[ ] Hooks tous AVANT le premier return conditionnel
[ ] Nouveau sous-composant dashboard → React.memo
```
