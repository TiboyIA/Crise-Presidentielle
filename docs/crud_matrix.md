# Matrice CRUD des données — Président : Nation en Crise

> Documentation pure. Aucune modification de code.
> Sources : `strategyStorage.ts`, `StrategyContext.tsx`, `SyncService.ts`, `RankedService.ts`,
> `AllianceService.ts`, `SpyService.ts`, `CyberService.ts`, `OfflineQueue.ts`,
> `entitlements.ts`, `missionEngine.ts`, `newsEngine.ts`, `botEngine.ts`.

---

## Conventions

| Symbole | Signification |
|---|---|
| `LOCAL` | Stocké uniquement dans AsyncStorage ou mémoire (pas de serveur) |
| `SERVER` | Autorité côté Supabase — le client est lecteur/émetteur |
| `LOCAL+SERVER` | Double stockage — le serveur est la source de vérité finale |
| `[MEM]` | Variable en mémoire uniquement, perdue au redémarrage |
| `fire-and-forget` | Appel non attendu — l'appelant ne gère pas l'erreur |
| `⚠` | Point de vigilance |

---

## Vue d'ensemble

| Donnée | Source de vérité | Persistance locale | Persistance serveur |
|---|---|---|---|
| Save game | LOCAL | `AsyncStorage @strategy_v1` | Backup via cloud save |
| Resources | LOCAL | Dans `@strategy_v1` | Via cloud save |
| Buildings | LOCAL | Dans `@strategy_v1` | Via cloud save |
| Researches | LOCAL | Dans `@strategy_v1` | Via cloud save |
| Units | LOCAL | Dans `@strategy_v1` | Via cloud save |
| Missions | LOCAL | Dans `@strategy_v1` | Aucune |
| News | LOCAL | Dans `@strategy_v1` | Aucune |
| Ranking (local) | LOCAL | Dans `@strategy_v1` | Aucune |
| Ranked run | LOCAL+SERVER | `ranked_journal_v1` + `ranked_run_meta_v1` | Run ID + score final |
| Player profile | SERVER | Aucune (transit params) | Leaderboard Supabase |
| Alliance | SERVER | Aucune | Supabase |
| Spy operation | SERVER | Aucune | Supabase |
| Cyber operation | SERVER | Aucune | Supabase |
| Cloud save | LOCAL+SERVER | `sync_pending_upload_v1` | `/save-sync` Edge Function |
| Entitlements | SERVER | `AsyncStorage` (debug) + `SecureStore` (30j) | `/player-entitlements` |

---

## 1. Save game (`StrategyGameState`)

**Source de vérité :** LOCAL — `AsyncStorage "@strategy_v1"`

| Opération | Qui ? | Fonction | Déclencheur |
|---|---|---|---|
| **Create** | `StrategyContext` | `startNewGame()` → `saveStrategy()` | Joueur clique "PRÊTER SERMENT" |
| **Create** (recovery) | `recovery.tsx` | `startNewGame("Président")` + `saveStrategy()` | Joueur clique "Nouvelle partie" |
| **Read** | `strategyStorage` | `loadStrategy()` | Au lancement de l'app (mount `StrategyContext`) |
| **Read** | `AuthContext` | `loadStrategy()` | Après auth → comparaison timestamp pour sync cloud |
| **Update** | `StrategyContext` | `saveStrategy(state)` | À chaque action joueur (fire-and-forget side-effect) |
| **Update** (migration) | `strategyStorage` | `migrateSave()` → `saveStrategy()` | Au chargement si version < 3 |
| **Update** (cloud restore) | `AuthContext`, `recovery.tsx` | `saveStrategy(migrated.state)` | Cloud save détecté plus récent |
| **Delete** | `recovery.tsx` | `deleteStrategy()` | Joueur clique "Nouvelle partie" (confirmation Alert) |

**Fichiers concernés :**
- [storage/strategyStorage.ts](storage/strategyStorage.ts) — lecture/écriture AsyncStorage
- [storage/saveMigrations.ts](storage/saveMigrations.ts) — `CURRENT_SAVE_VERSION = 3`
- [context/StrategyContext.tsx](context/StrategyContext.tsx) — dispatch → `saveStrategy()`
- [app/recovery.tsx](app/recovery.tsx) — delete + cloud restore

**Notes :**
- `⚠` `saveStrategy()` est synchrone côté AsyncStorage mais `scheduleUpload()` est fire-and-forget — une panne entre les deux laisse le cloud en retard sans notification.
- La sauvegarde est toujours réécrite intégralement (pas de diff partiel).

---

## 2. Resources (`StrategyResources`)

**Source de vérité :** LOCAL — champ `state.resources` dans `@strategy_v1`

| Opération | Qui ? | Fonction | Déclencheur |
|---|---|---|---|
| **Create** | `StrategyContext` | `buildInitialState()` → `INITIAL_RESOURCES` + bonus pays | Nouvelle partie |
| **Read** | Toute l'UI | `useStrategy().state.resources` | Rendu de `nation.tsx`, `buildings.tsx`, `operations.tsx`, etc. |
| **Update** (production) | `StrategyContext` | `accumulateResources(buildings, resources, elapsedMinutes)` | À chaque avance de temps (mount, actions) |
| **Update** (dépense) | `StrategyContext` | `deductCost(cost, resources)` | Amélioration bâtiment, opération, formation unité |
| **Update** (récompense mission) | `StrategyContext` | `collectMissionReward()` | Joueur réclame une récompense de mission |
| **Update** (réforme) | `StrategyContext` | `launchReform()` | Joueur lance une réforme |
| **Update** (bonus alliance) | `StrategyContext` | `computeAllianceBonuses()` → `allianceProductionBonus` | Au mount + `fetchAlliances()` |
| **Update** (upkeep militaire) | `StrategyContext` | `calculateDailyUpkeep()` | Avance de temps si `playerUnits.length > 0` |
| **Delete** | N/A | — | Jamais — les ressources existent toujours |

**Fichiers concernés :**
- [logic/buildingEngine.ts](logic/buildingEngine.ts) — `accumulateResources()`, `deductCost()`, `canAfford()`
- [logic/militaryEngine.ts](logic/militaryEngine.ts) — `calculateDailyUpkeep()`
- [services/AllianceService.ts](services/AllianceService.ts) — `computeAllianceBonuses()`
- [context/StrategyContext.tsx](context/StrategyContext.tsx) — orchestration

**Valeurs initiales :**
```
money=2000  influence=100  energy=200  intelligence=50
technology=30  military=80  cyberDefense=40
+ bonus spécifique au pays (COUNTRY_RESOURCE_BONUS)
```

**Notes :**
- `⚠` `accumulateResources()` ne-op si `elapsedMinutes < 0.5` — une avance de temps trop courte est ignorée silencieusement.
- Le multiplicateur de production est `1 + min(allianceBonus, 0.06)` — le bonus alliance est plafonné à +6%.

---

## 3. Buildings (`PlayerBuilding[]`)

**Source de vérité :** LOCAL — champ `state.buildings` dans `@strategy_v1`

| Opération | Qui ? | Fonction | Déclencheur |
|---|---|---|---|
| **Create** | `StrategyContext` | `buildInitialState()` → `INITIAL_BUILDINGS` (11 bâtiments niveau 0) | Nouvelle partie |
| **Read** | `buildings.tsx` | `state.buildings` + `BUILDINGS[id]` | Affichage de l'écran Ministères |
| **Read** | `operations.tsx` | `canLaunchOperation(..., state.buildings, ...)` | Vérification prérequis opération |
| **Read** | `forces-armees.tsx` | `state.buildings.some(b => b.id === req.buildingId && b.level >= req.level)` | Vérification déverrouillage unité |
| **Read** | `logic/powerEngine.ts` | `calculateGlobalPower(buildings, resources)` | Calcul puissance globale |
| **Update** (start) | `StrategyContext` | `upgradeBuilding(id)` → `startUpgrade()` | Joueur appuie sur "Améliorer" |
| **Update** (complete) | `StrategyContext` | `collectUpgrades()` | Avance de temps — `upgradeEndTime` passé |
| **Update** (ranked) | `RankedService` | `recordEvent("building_upgrade_started")` + `"building_upgrade_completed"` | Même déclencheurs en mode classé |
| **Delete** | N/A | — | Jamais — les bâtiments ne peuvent pas être retirés |

**Fichiers concernés :**
- [logic/buildingEngine.ts](logic/buildingEngine.ts) — `startUpgrade()`, `collectUpgrades()`, `isUnlocked()`
- [data/buildings.ts](data/buildings.ts) — définitions statiques `BUILDINGS`, `BUILDING_LIST`
- [app/buildings.tsx](app/buildings.tsx) — UI
- [context/StrategyContext.tsx](context/StrategyContext.tsx)

**Notes :**
- `⚠` `upgradeBuilding()` via `useCommand` est idempotent — un double-tap retourne `null` (toast "Action en cours…") sans double déduction.
- La durée d'amélioration est en minutes de jeu (`durationMinutes`) converties via `simulationClock`.

---

## 4. Researches (`StrategyResearchState`)

**Source de vérité :** LOCAL — champ `state.strategyResearch` dans `@strategy_v1`

| Opération | Qui ? | Fonction | Déclencheur |
|---|---|---|---|
| **Create** | `StrategyContext` | `DEFAULT_RESEARCH_STATE` (migration v2) | Première partie ou migration depuis v1 |
| **Read** | `strategy-research.tsx` | `state.strategyResearch` | Affichage de l'arbre technologique |
| **Read** | `operations.tsx` | `completedResearch.includes(r.id)` | Affichage bonus R&D sur opération |
| **Update** (start) | `StrategyContext` | `launchStrategyResearch(id)` → `research.inProgress = { id, startedAtDay, completesAtDay }` | Joueur appuie sur "Lancer" |
| **Update** (complete) | `StrategyContext` | Tick journalier : `mandateDay >= completesAtDay` → `research.completed.push(id)` + `inProgress = null` | Avance de `mandateDay` |
| **Update** (ranked) | `RankedService` | `recordEvent("research_started")` + `"research_completed"` | Même déclencheurs |
| **Delete** | N/A | — | Jamais — une recherche complétée reste dans `completed` |

**Fichiers concernés :**
- [data/strategyResearch.ts](data/strategyResearch.ts) — 15 recherches, 5 catégories
- [types/strategyResearch.ts](types/strategyResearch.ts) — `DEFAULT_RESEARCH_STATE`
- [app/strategy-research.tsx](app/strategy-research.tsx) — UI
- [context/StrategyContext.tsx](context/StrategyContext.tsx)

**Structure :**
```typescript
interface StrategyResearchState {
  completed: StrategyResearchId[];   // recherches terminées
  inProgress: {                       // une seule à la fois
    id: StrategyResearchId;
    startedAtDay: number;
    completesAtDay: number;
  } | null;
}
```

**Notes :**
- `⚠` Une seule recherche peut être active simultanément. Toute tentative de lancement pendant `inProgress !== null` est bloquée par `hasOtherInProgress` dans l'UI.

---

## 5. Units (`PlayerUnit[]` + `TrainingQueueEntry[]`)

**Source de vérité :** LOCAL — champs `state.playerUnits` et `state.trainingQueue` dans `@strategy_v1`

| Opération | Qui ? | Fonction | Déclencheur |
|---|---|---|---|
| **Create** | `StrategyContext` | `trainUnit(unitId, qty)` → ajoute à `trainingQueue` | Joueur appuie sur "Entraîner" |
| **Read** | `forces-armees.tsx` | `state.playerUnits`, `state.trainingQueue` | Affichage onglets Terre/Air/Mer/Soutien/File |
| **Read** | `logic/militaryEngine.ts` | `calculateMilitaryPower(playerUnits, militaryDoctrine)` | Calcul puissance militaire |
| **Read** | `logic/operationEngine.ts` | `getOperationUnitBonus(units, op.id)` | Bonus unités sur opérations |
| **Update** (collect) | `StrategyContext` | `collectTraining()` → queue "completed" → `playerUnits` | Joueur appuie sur la bannière de collecte |
| **Update** (doctrine) | `StrategyContext` | `setMilitaryDoctrine(id)` | Joueur adopte une doctrine militaire (Alert) |
| **Update** (ranked) | `RankedService` | `recordEvent("unit_training_started")` + `"unit_training_completed"` | Même déclencheurs |
| **Delete** | N/A | — | Jamais directement — l'upkeep peut théoriquement épuiser les ressources mais n'efface pas les unités |

**Fichiers concernés :**
- [data/units.ts](data/units.ts) — `UNITS`, `UNIT_LIST`, `BRANCH_LABELS`
- [data/militaryDoctrines.ts](data/militaryDoctrines.ts) — 6 doctrines avec bonus/malus
- [logic/militaryEngine.ts](logic/militaryEngine.ts) — `calculateMilitaryPower()`, `calculateDailyUpkeep()`
- [app/forces-armees.tsx](app/forces-armees.tsx) — UI
- [context/StrategyContext.tsx](context/StrategyContext.tsx)

**Notes :**
- `⚠` `formatRemaining()` utilise deux systèmes : `endsAtGameHour` (nouveau) ou `endsAt` ms réels (migré). Sur une sauvegarde migrée, les deux champs coexistent et le nouveau système prend la priorité.
- La file de formation n'a pas de limite de taille maximale documentée.

---

## 6. Missions (`PlayerMission[]`)

**Source de vérité :** LOCAL — champ `state.missions` dans `@strategy_v1`

| Opération | Qui ? | Fonction | Déclencheur |
|---|---|---|---|
| **Create** | `StrategyContext` | `generateDailyMissions(dayIndex)` | Lancement app si `missionsExpired()` ou liste vide |
| **Read** | `missions.tsx` | `state.missions` + `getMissionDef(defId)` | Affichage de l'écran Missions |
| **Update** (progression) | `StrategyContext` | `checkMissionProgress(missions, resources, buildings, power, event)` | Après chaque action (bâtiment, opération, espionnage…) |
| **Update** (complétion) | `StrategyContext` | `collectMissionReward(missionIndex)` → `completed = true` + ressources accordées | Joueur réclame la récompense |
| **Delete** (remplacement) | `StrategyContext` | `generateDailyMissions()` écrase la liste | `missionsExpired()` → toutes les 6h réelles |

**Fichiers concernés :**
- [logic/missionEngine.ts](logic/missionEngine.ts) — `generateDailyMissions()`, `checkMissionProgress()`, `missionsExpired()`
- [data/missions.ts](data/missions.ts) — `MISSION_POOL`, `pickDailyMissions()`
- [app/missions.tsx](app/missions.tsx) — UI
- [context/StrategyContext.tsx](context/StrategyContext.tsx)

**Cycle de vie :**
```
generateDailyMissions(dayIndex)  →  missions actives (6h)
         ↓ actions joueur
checkMissionProgress()           →  progress mis à jour
         ↓ mission remplie
collectMissionReward()           →  ressources accordées + completed=true
         ↓ 6h passées
missionsExpired() = true         →  remplacement par nouveau cycle
```

**Notes :**
- `⚠` Les missions non réclamées à l'expiration sont silencieusement perdues — `generateDailyMissions()` écrase sans conserver les récompenses non collectées.
- Le cycle de 6h est basé sur `clockNow()` (horloge de simulation) et non le temps réel absolu — peut dériver si le dispositif est en veille prolongée.

---

## 7. News (`NewsState`)

**Source de vérité :** LOCAL — champ `state.news` dans `@strategy_v1`

| Opération | Qui ? | Fonction | Déclencheur |
|---|---|---|---|
| **Create** | `StrategyContext` | `selectNextNews()` → `queueNews()` → ajoute à `pendingIds` | Toutes les 4 actions (`MINOR_NEWS_EVERY`) |
| **Create** (interactif) | `StrategyContext` | `selectNextNews(forceInteractive=true)` | Toutes les 12 actions (`MAJOR_NEWS_EVERY`) |
| **Read** | `journal-crise.tsx` | `state.news.log`, `state.news.pendingIds` | Affichage du journal |
| **Read** | `nation.tsx` | `state.news.pendingIds` (pour CrisisAlertOverlay) | Hub de navigation |
| **Update** (résolution) | `StrategyContext` | `resolveInteractiveNews(id, choiceIndex)` → effets + `seenIds.push(id)` | Joueur choisit dans la modale |
| **Update** (lecture) | `StrategyContext` | `markNewsRead()` → vide `pendingIds` | Mount de `journal-crise.tsx` |
| **Update** (dismiss) | `StrategyContext` | `dismissNews(id)` → retire de `pendingIds` | Joueur ferme sans répondre |
| **Update** (log) | `StrategyContext` | `applyAutoNews()` → push dans `log` + plafond `MAX_LOG = 30` | Après sélection |
| **Delete** (rotation) | `StrategyContext` | Log tronqué à 30 entrées (FIFO) | Automatique après `MAX_LOG` |

**Fichiers concernés :**
- [logic/newsEngine.ts](logic/newsEngine.ts) — `selectNextNews()`, `applyAutoNews()`, `applyInteractiveNews()`
- [data/newsEvents.ts](data/newsEvents.ts) — `NEWS_EVENTS`, `NEWS_EVENT_MAP`
- [app/journal-crise.tsx](app/journal-crise.tsx) — UI
- [components/InteractiveNewsModal.tsx](components/InteractiveNewsModal.tsx)
- [context/StrategyContext.tsx](context/StrategyContext.tsx)

**Structure `NewsState` :**
```typescript
{
  log: NewsLogEntry[];       // max 30 entrées
  pendingIds: string[];      // événements sélectionnés, non encore lus
  seenIds: string[];         // événements déjà vus (exclusion future)
  lastNewsAction: number;    // actionCount au dernier déclenchement
  unreadCount: number;
}
```

**Notes :**
- `⚠` `seenIds` grandit sans limite. À terme, tous les événements peuvent être marqués "vus" et `selectNextNews()` retourne `null`.
- Les effets d'une crise interactive (`applyInteractiveNews()`) peuvent pousser des ressources en négatif sans garde-fou côté client.

---

## 8. Ranking local (`RankEntry[]`)

**Source de vérité :** LOCAL — champ `state.ranking` dans `@strategy_v1`

| Opération | Qui ? | Fonction | Déclencheur |
|---|---|---|---|
| **Create** | `StrategyContext` | `getInitialRanking()` → bots prégénérés + entrée joueur `{ id: "player" }` | Nouvelle partie |
| **Read** | `ranking.tsx` | `state.ranking`, `getPlayerRank()`, `getRankTitle()` | Affichage classement local |
| **Read** | `nation.tsx` | `getPlayerRank(state.ranking)` | Hub de navigation — rang affiché |
| **Update** | `StrategyContext` | `updateBotRanking(ranking, playerPower, playerPoints, lastBotUpdate)` | Au lancement (avance de temps) |
| **Delete** | N/A | — | Jamais — le classement local est toujours présent |

**Fichiers concernés :**
- [logic/botEngine.ts](logic/botEngine.ts) — `updateBotRanking()`, `getPlayerRank()`, `getRankTitle()`
- [logic/botStrategyEngine.ts](logic/botStrategyEngine.ts) — `computeBotDecisions()`, `applyStrategyGrowthMults()`
- [data/bots.ts](data/bots.ts) — `BOTS`, `getInitialRanking()`
- [app/ranking.tsx](app/ranking.tsx) — UI
- [context/StrategyContext.tsx](context/StrategyContext.tsx)

**Distinction :**
Ce classement est **entièrement local** et comprend des bots générés. Il est distinct du classement mondial Supabase (`ranking-global.tsx`).

**Notes :**
- Les bots évoluent sur max 48h d'horloge réelle (`MAX_OFFLINE_HOURS`) pour éviter un décalage excessif en cas d'absence prolongée.
- Le rang du joueur est calculé après tri par `power` décroissant.

---

## 9. Ranked run (`RunMeta` + `RunEvent[]`)

**Source de vérité :** LOCAL+SERVER — journal local `ranked_journal_v1` + run ID serveur

| Opération | Qui ? | Fonction | Stockage | Déclencheur |
|---|---|---|---|---|
| **Create** (run) | `RankedService` | `startRankedRun()` → POST `/ranked-start` | `ranked_run_meta_v1` (local) + serveur | Joueur active mode classé + "PRÊTER SERMENT" |
| **Create** (event) | `RankedService` | `recordEvent()` → `appendEvent()` | `ranked_journal_v1` (local) | Chaque action clé (upgrade, opération, crise, reform…) |
| **Read** | `RankedService` (interne) | `loadMeta()`, `loadJournal()` | AsyncStorage | Avant chaque `recordEvent()` et avant soumission |
| **Read** | `ranking.tsx` | `hasPendingSubmission()` | `ranked_pending_submit_v1` | Au mount de `ranking.tsx` |
| **Update** (pending) | `RankedService` | `submitRankedRun()` → réseau indisponible → `PENDING_SUBMIT_KEY` | AsyncStorage | Fin de partie, réseau absent |
| **Update** (retry) | `RankedService` | `retryPendingSubmission(token)` | Suppression `PENDING_SUBMIT_KEY` si succès | Au lancement, après auth ready |
| **Delete** (succès) | `RankedService` | `clearRun()` → `multiRemove([JOURNAL_KEY, RUN_META_KEY])` | AsyncStorage | Soumission acceptée (200 ok) |
| **Delete** (rejet) | `RankedService` | `clearRun()` + `_rankedIntended = false` | AsyncStorage | HTTP 422 ou 409 (rejet définitif) |
| **Delete** (abandon) | `RankedService` | `abandonRun()` | AsyncStorage | Joueur abandonne manuellement |

**Fichiers concernés :**
- [services/RankedService.ts](services/RankedService.ts) — logique complète
- [context/StrategyContext.tsx](context/StrategyContext.tsx) — appels `recordEvent()`
- [context/AuthContext.tsx](context/AuthContext.tsx) — `retryPendingSubmission()` au login
- [app/ranking.tsx](app/ranking.tsx) — badge "SOUMISSION EN ATTENTE"

**Clés AsyncStorage :**
```
ranked_journal_v1       → RunEvent[]
ranked_run_meta_v1      → { runId, seed, startedAt }
ranked_pending_submit_v1 → PendingSubmit (sans accessToken)
```

**Notes :**
- `⚠` `_rankedIntended` est [MEM] — après un crash, `isRankedIntended()` retourne `false` même si `RUN_META_KEY` existe. Le journal continue d'être alimenté mais l'UI n'affiche plus le badge mode classé.
- `⚠` Le journal est relu et réécrit intégralement à chaque `recordEvent()` — risque de performance pour les runs longues.
- Le JWT (`accessToken`) n'est jamais persisté dans `PendingSubmit` — `retryPendingSubmission()` reçoit un token frais de `AuthContext`.

---

## 10. Player profile (`LeaderboardEntry`)

**Source de vérité :** SERVER — Supabase (table leaderboard)

| Opération | Qui ? | Fonction | Déclencheur |
|---|---|---|---|
| **Create** | `RankedService` (via serveur) | `submitRankedRun()` → POST `/ranked-submit` → serveur insère dans leaderboard | Soumission de fin de partie classée |
| **Read** (liste) | `ranking-global.tsx` | `fetchLeaderboard()` → GET `/leaderboard-global?limit=50` | Mount + pull-to-refresh |
| **Read** (profil) | `player-profile.tsx` | `JSON.parse(params.entry)` — data transitée par navigation | Tap sur entrée dans le classement |
| **Update** | Serveur | Nouvelle soumission classée du même joueur | À chaque `submitRankedRun()` accepté (max 1/23h) |
| **Delete** | Non disponible côté client | — | Jamais depuis l'app |

**Fichiers concernés :**
- [app/ranking-global.tsx](app/ranking-global.tsx) — fetch + FlatList
- [app/player-profile.tsx](app/player-profile.tsx) — affichage profil + actions interactives
- [services/RankedService.ts](services/RankedService.ts) — `submitRankedRun()`
- [utils/validators.ts](utils/validators.ts) — `validateLeaderboardEntry`, `filterValid()`

**Structure `LeaderboardEntry` :**
```typescript
{
  player_id: string;
  display_name: string;
  score: number;
  country_id: string;
  doctrine: string;
  mandate_days: number;
  global_power: number;
  rank_title?: string;
  season: number;
  created_at: string;
}
```

**Notes :**
- `⚠` Le profil est transmis à `player-profile.tsx` via `JSON.stringify(entry)` dans les paramètres de navigation — risque de troncature si l'entrée est volumineuse.
- `filterValid(data.entries, validateLeaderboardEntry)` garantit qu'aucune entrée malformée n'est rendue dans la FlatList.

---

## 11. Alliance (`Alliance`)

**Source de vérité :** SERVER — Supabase

| Opération | Qui ? | Fonction | Endpoint | Déclencheur |
|---|---|---|---|---|
| **Create** | `AllianceService` / `OfflineQueue` | `inviteAlly()` ou `enqueueAllianceInvite()` | POST `/alliance-invite` | Joueur appuie sur "Proposer une alliance" dans un profil |
| **Read** | `AllianceService` | `fetchAlliances(accessToken)` | GET `/alliance-list` | Mount `alliances.tsx`, mount `ranking.tsx` |
| **Update** (accept) | `AllianceService` | `respondToAlliance(id, "accept")` | POST `/alliance-respond` | Joueur appuie sur "ACCEPTER" |
| **Update** (reject) | `AllianceService` | `respondToAlliance(id, "reject")` | POST `/alliance-respond` | Joueur appuie sur "REFUSER" |
| **Update** (break) | `AllianceService` | `respondToAlliance(id, "break")` | POST `/alliance-respond` | Joueur appuie sur "ROMPRE" (Alert de confirmation) |
| **Delete** | Non disponible | — | — | Jamais — le statut change en "broken"/"rejected", pas de suppression |

**Fichiers concernés :**
- [services/AllianceService.ts](services/AllianceService.ts) — API complète
- [services/OfflineQueue.ts](services/OfflineQueue.ts) — `enqueueAllianceInvite()` (offline)
- [app/alliances.tsx](app/alliances.tsx) — UI principale
- [app/player-profile.tsx](app/player-profile.tsx) — déclenchement invitation
- [app/ranking.tsx](app/ranking.tsx) — badge `pendingAllianceCount`

**Règles serveur :**
- Max 3 alliances actives simultanées
- Cooldown 48h entre deux invitations au même joueur
- Quota d'invitations journalier
- Prérequis : 1 partie classée validée

**Notes :**
- `⚠` `inviteAlly()` (appel direct depuis `AllianceService`) et `enqueueAllianceInvite()` (via `OfflineQueue`) sont deux chemins d'appel distincts. Seul le second supporte le mode hors ligne.
- La clé d'idempotence de `OfflineQueue` est `alliance_invite:{targetPlayerId}` — deux invitations au même joueur ne sont enfilées qu'une seule fois.

---

## 12. Spy operation (`SpyOp`)

**Source de vérité :** SERVER — Supabase

| Opération | Qui ? | Fonction | Endpoint | Déclencheur |
|---|---|---|---|---|
| **Create** | `SpyService` | `launchSpyOp(accessToken, targetId, opType)` | POST `/spy-launch` | Joueur appuie sur "Intel", "Doctrine" ou "Score" dans un profil |
| **Read** | `SpyService` | `fetchSpyOps(accessToken)` | GET `/spy-resolve` | Mount `spy-ops.tsx` + pull-to-refresh |
| **Update** (résolution) | Serveur (automatique) | Traitement après délai 6h | — | Cron serveur (pas d'action client) |
| **Delete** | Non disponible | — | — | Jamais depuis l'app |

**Fichiers concernés :**
- [services/SpyService.ts](services/SpyService.ts) — `launchSpyOp()`, `fetchSpyOps()`
- [app/spy-ops.tsx](app/spy-ops.tsx) — UI résultats
- [app/player-profile.tsx](app/player-profile.tsx) — déclenchement

**Types d'opération :**
| `op_type` | Données révélées |
|---|---|
| `intel_probe` | Pays + doctrine de la cible |
| `doctrine_scan` | Doctrine + fourchette durée mandat |
| `score_range` | Pays + fourchette de score estimé |

**Statuts :**
```
pending  → (6h) → resolved (result_json rempli)
                → blocked  (défenses adverses)
```

**Règles serveur :**
- Max 2 ops / 24h toutes cibles confondues
- Max 1 op par cible / 24h
- Protection nouveaux comptes : cibles < 7 jours immunisées
- Prérequis : 1 partie classée validée

**Notes :**
- `⚠` Il n'existe pas de mécanisme hors ligne pour `spy_launch` — le type est déclaré dans `QueueActionType` mais retourne `{ ok: true }` sans envoyer de requête dans `executeItem()`.
- `fetchSpyOps()` n'est pas rafraîchi automatiquement — les résultats arrivant pendant la session ne sont visibles qu'après refresh manuel.

---

## 13. Cyber operation (`CyberOp`)

**Source de vérité :** SERVER — Supabase

| Opération | Qui ? | Fonction | Endpoint | Déclencheur |
|---|---|---|---|---|
| **Create** | `CyberService` | `launchCyberOp(accessToken, targetId)` | POST `/cyber-launch` | Joueur appuie sur "Lancer une cyberattaque" dans un profil |
| **Read** | `CyberService` | `fetchCyberOps(accessToken)` | GET `/cyber-resolve` | Mount `cyber-ops.tsx` + pull-to-refresh |
| **Update** (résolution) | Serveur (automatique) | Traitement après délai ~4h | — | Cron serveur |
| **Delete** | Non disponible | — | — | Jamais depuis l'app |

**Fichiers concernés :**
- [services/CyberService.ts](services/CyberService.ts) — `launchCyberOp()`, `fetchCyberOps()`
- [app/cyber-ops.tsx](app/cyber-ops.tsx) — UI résultats
- [app/player-profile.tsx](app/player-profile.tsx) — déclenchement
- [app/ranking.tsx](app/ranking.tsx) — accès rapide "MES CYBERATTAQUES"

**Structure résultat :**
```typescript
interface CyberOpsResult {
  sent: CyberOp[];               // ops envoyées par le joueur
  received: CyberOp[];           // ops reçues (le joueur est la cible)
  pending_debuff_pct: number | null;  // malus actif si attaque en cours
}
```

**Règles serveur :**
- Max 1 cyberattaque / 24h
- Compte lié obligatoire (`auth.isLinked`)
- Prérequis : 1 partie classée validée
- Protection cibles < 14 jours
- Règle de proportionnalité (écart de score limité)

**Notes :**
- `⚠` `cyber_launch` est déclaré dans `QueueActionType` (OfflineQueue) mais l'implémentation actuelle retourne `{ ok: true }` sans appel réseau — pas de support hors ligne réel.
- `validateCyberOp()` est appliqué via `filterValid()` sur `sent` et `received` avant usage — les entrées malformées sont ignorées silencieusement.

---

## 14. Cloud save (sauvegarde synchronisée)

**Source de vérité :** LOCAL+SERVER — stratégie last-write-wins, seuil 5 secondes

| Opération | Qui ? | Fonction | Endpoint | Déclencheur |
|---|---|---|---|---|
| **Create** | `SyncService` | `scheduleUpload()` → POST `/save-sync` | POST `/save-sync` | Première `saveStrategy()` après auth |
| **Read** | `SyncService` | `downloadSave(accessToken)` | GET `/save-sync` | `syncOnLaunch()` après auth ready |
| **Read** | `recovery.tsx` | `downloadSave(auth.accessToken)` | GET `/save-sync` | Joueur clique "Restaurer depuis le cloud" |
| **Update** | `SyncService` | `scheduleUpload(state, version)` fire-and-forget | POST `/save-sync` | Après chaque `saveStrategy()` |
| **Update** (retry) | `SyncService` | `syncOnLaunch()` → retry `PENDING_UPLOAD_KEY` | POST `/save-sync` | Au lancement |
| **Delete** | Non disponible | — | — | Jamais depuis l'app |

**Fichiers concernés :**
- [services/SyncService.ts](services/SyncService.ts) — logique complète
- [storage/strategyStorage.ts](storage/strategyStorage.ts) — `saveStrategy()` appelle `scheduleUpload()`
- [context/AuthContext.tsx](context/AuthContext.tsx) — `syncOnLaunch()` dans `onAuthenticated()`
- [app/recovery.tsx](app/recovery.tsx) — `downloadSave()` + `migrateSave()` + `saveStrategy()`

**Validation avant upload :**
```typescript
function validateAndSerialize(saveData, saveVersion):
  - type !== "object" → null
  - version hors [1, 10] → null
  - clés dangereuses (__proto__, constructor, prototype) → null
  - taille > 512 000 octets → null
```

**Intégrité :**
- `hashSave()` djb2 — détection corruption accidentelle uniquement (non cryptographique)
- Le serveur recompute le hash et compare

**Notes :**
- `⚠` `scheduleUpload()` est fire-and-forget — si le réseau est absent, la sauvegarde est mise dans `PENDING_UPLOAD_KEY` mais ce pending n'a pas de retry automatique pendant la session (seulement au prochain lancement via `syncOnLaunch()`).
- `conflict_detected` (delta < 5s entre cloud et local) conserve systématiquement la sauvegarde locale — sur deux appareils synchronisés simultanément, l'un peut rester définitivement en retard.

---

## 15. Entitlements (`EventPack[]`)

**Source de vérité :** SERVER — `/player-entitlements` (priorité 1) + RevenueCat SDK (priorité 2)

| Opération | Qui ? | Fonction | Source | Déclencheur |
|---|---|---|---|---|
| **Create** | Serveur (webhook RevenueCat) | Achat in-app → RC webhook → serveur enregistre | Supabase | Achat complété dans `shop.tsx` |
| **Read** (serveur) | `entitlements.ts` | `fetchBackendEntitlements()` → GET `/player-entitlements` | Backend | Mount `EntitlementsProvider` + `refresh()` |
| **Read** (RC SDK) | `purchases.ts` | `fetchCustomerInfo()` | RevenueCat SDK | Mount `EntitlementsProvider` + `refresh()` |
| **Read** (cache SecureStore) | `entitlements.ts` | `readVerifiedCache()` | SecureStore (30j) | Si serveur inaccessible |
| **Read** (AsyncStorage) | `entitlements.ts` | `readStored()` | AsyncStorage | Grants locaux (debug + web) |
| **Update** (grant local) | `entitlements.ts` | `grantLocal(pack)` → `writeStored()` | AsyncStorage | Achat en web/debug uniquement |
| **Update** (revoke local) | `entitlements.ts` | `revokeLocal(pack)` → `writeStored()` | AsyncStorage | Debug uniquement |
| **Update** (cache) | `entitlements.ts` | `writeVerifiedCache(packs)` | SecureStore | Quand serveur accessible + packs non vides |
| **Delete** | N/A | — | — | Jamais — les achats sont permanents |

**Fichiers concernés :**
- [lib/entitlements.ts](lib/entitlements.ts) — logique priorité + cache
- [lib/purchases.ts](lib/purchases.ts) — RevenueCat SDK (`fetchCustomerInfo()`, `purchasePack()`)
- [app/shop.tsx](app/shop.tsx) — UI boutique

**Priorité de résolution :**
```
1. Backend /player-entitlements   (serveur accessible, build natif)
2. RevenueCat SDK                 (fenêtre entre achat et webhook)
3. SecureStore (grace 30 jours)   (serveur inaccessible)
4. AsyncStorage                   (debug / web uniquement)
5. FREE_PACKS = { "climate" }     (toujours inclus)
```

**Packs disponibles :**
```typescript
ALL_PACKS = ["climate", "guerre_hybride", "cyber"]
FREE_PACKS = new Set(["climate"])  // toujours débloqué
```

**Règle de sécurité critique :** Quand le serveur est accessible sur un build natif, `stored.packs` (AsyncStorage, non chiffré) est **ignoré**. Un grant local sur appareil rooté ne peut pas contourner la vérification serveur.

```typescript
const useLocalGrants = !serverOnline || Platform.OS === "web";
const allPaid = useLocalGrants
  ? [...stored.packs, ...realPacks]  // web/offline
  : realPacks;                        // natif + serveur OK
```

**Notes :**
- `⚠` Le cache SecureStore expire après 30 jours. Un joueur offline > 30 jours perd l'accès aux contenus payants jusqu'au prochain accès réseau.
- `⚠` `GRACE_PERIOD_MS = 30 jours` est codé en dur — si RevenueCat ou le serveur sont en panne prolongée, les joueurs premium peuvent être temporairement bloqués après 30 jours.

---

## Matrice de résumé

| Donnée | C | R | U | D | Source vérité |
|---|---|---|---|---|---|
| Save game | `startNewGame()` | `loadStrategy()` | `saveStrategy()` après chaque action | `deleteStrategy()` | LOCAL |
| Resources | `buildInitialState()` | `state.resources` | `accumulateResources()`, `deductCost()`, récompenses | — | LOCAL |
| Buildings | `INITIAL_BUILDINGS` | `state.buildings` | `upgradeBuilding()`, `collectUpgrades()` | — | LOCAL |
| Researches | `DEFAULT_RESEARCH_STATE` | `state.strategyResearch` | `launchStrategyResearch()`, complétion auto | — | LOCAL |
| Units | `trainUnit()` | `state.playerUnits` | `collectTraining()`, `setMilitaryDoctrine()` | — | LOCAL |
| Missions | `generateDailyMissions()` | `state.missions` | `checkMissionProgress()`, `collectMissionReward()` | Remplacement 6h | LOCAL |
| News | `selectNextNews()` | `state.news` | `resolveInteractiveNews()`, `markNewsRead()` | Rotation MAX\_LOG | LOCAL |
| Ranking local | `getInitialRanking()` | `state.ranking` | `updateBotRanking()` | — | LOCAL |
| Ranked run | `startRankedRun()` (serveur) | `loadMeta()`, `hasPendingSubmission()` | `recordEvent()` | `clearRun()` après submit | LOCAL+SERVER |
| Player profile | `submitRankedRun()` (serveur) | `fetchLeaderboard()` | Nouvelle soumission classée | — | SERVER |
| Alliance | `inviteAlly()` | `fetchAlliances()` | `respondToAlliance()` | — (statut "broken") | SERVER |
| Spy operation | `launchSpyOp()` | `fetchSpyOps()` | Serveur (résolution 6h) | — | SERVER |
| Cyber operation | `launchCyberOp()` | `fetchCyberOps()` | Serveur (résolution 4h) | — | SERVER |
| Cloud save | `scheduleUpload()` | `downloadSave()` | `scheduleUpload()` | — | LOCAL+SERVER |
| Entitlements | Webhook RC (serveur) | `fetchBackendEntitlements()`, `readVerifiedCache()` | Webhook RC (serveur) | — | SERVER |

---

## Points de friction cross-données

| Situation | Données impliquées | Risque |
|---|---|---|
| Achat d'upgrade pendant l'offline | Resources + Buildings + Cloud save | Resources déduites localement, cloud en retard |
| Fin de partie classée sans réseau | Ranked run + Player profile | `PENDING_SUBMIT_KEY` créé, score différé |
| Invitation alliance offline | Alliance + OfflineQueue | `queued` mais jamais envoyé si `flushQueue()` non câblé |
| Sync cloud conflit (delta < 5s) | Save game + Cloud save | Sauvegarde locale conservée, cloud peut stagner |
| Expiration entitlements (>30j offline) | Entitlements | Joueur premium perd accès aux contenus |
| Run classée après redémarrage | Ranked run (`_rankedIntended=[MEM]`) | Journal continue mais badge "mode classé" absent |
| Missions expirées non réclamées | Missions + Resources | Récompenses perdues silencieusement |
| `seenIds` saturé (tous events vus) | News | Plus aucune news déclenchée |
