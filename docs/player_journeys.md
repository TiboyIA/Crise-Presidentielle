# Parcours joueur — Président : Nation en Crise

> Documentation pure. Aucune modification de code ou d'UI.
> Sources : lecture directe des fichiers `app/`, `context/`, `services/`, `logic/`.

---

## Conventions

| Colonne | Signification |
|---|---|
| **Point d'entrée** | Où démarre le parcours (écran, état, événement) |
| **Action joueur** | Ce que le joueur fait concrètement |
| **Système appelé** | Fonctions, services, contextes impliqués |
| **Écran suivant** | Destination de navigation |
| **Problème possible** | Erreurs, blocages, cas limites observés dans le code |
| **Amélioration possible** | Observation sans recommandation impérative |

---

## Parcours 1 — Première ouverture du jeu

**Point d'entrée :** Application lancée pour la première fois. Aucune sauvegarde existante.

```
Système → LoadingScreen
         ↓ (onComplete)
         index.tsx — step="home", hasSave=false
         ↓ (bouton "ENTRER EN FONCTION")
         step="country"
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | L'app se lance | `_layout.tsx` : chargement des polices Inter, `SplashScreen.preventAutoHideAsync()`, `telemetry("app_open")` | `LoadingScreen` |
| 2 | Attente du chargement | `LoadingScreen` affiche l'animation ; `StrategyProvider` appelle `loadStrategy()` | `LoadingScreen` |
| 3 | Chargement terminé | `loadStrategy()` retourne `null` (pas de sauvegarde) ; `setAppReady(true)` → splash caché | `index.tsx`, step="home" |
| 4 | L'écran d'accueil s'affiche | `hasSave=false` → bouton unique "ENTRER EN FONCTION" (pas de "CONTINUER") | step="home" visible |
| 5 | Appuie sur "ENTRER EN FONCTION" | `setStep("country")` | step="country" |

**Problème possible :**
- Si `loadStrategy()` renvoie `saveStatus === "recovered"`, l'app redirige vers `/recovery` avant que le joueur ne voie quoi que ce soit. Ce cas est silencieux pour l'utilisateur.
- Les polices Inter peuvent échouer (`fontError`) ; l'app continue quand même (la condition `!fontsLoaded && !fontError` passe à `false`), mais le rendu des textes sera dégradé.

**Amélioration possible :**
- L'écran d'accueil ne signale pas la raison d'un éventuel retour en recovery — un message explicatif avant redirection aiderait les joueurs.

---

## Parcours 2 — Nouvelle partie

**Point d'entrée :** `index.tsx` step="home" (sauvegarde existante ou non).

```
step="home" → "NOUVELLE PARTIE"
           ↓
step="country"   → sélection pays (France gratuite, autres verrouillés)
           ↓
step="name"      → saisie nom président (min 2 caractères)
           ↓
step="doctrine"  → choix doctrine (5 débloquées, 3 verrouillées)
                   + toggle Mode Classé (si auth.isEnabled && auth.isReady)
           ↓
handleConfirmDoctrine()
  → startNewGame(playerName, doctrine, countryId)   [StrategyContext]
  → si rankedMode : startRankedRun(accessToken, ...) [RankedService]
  → router.replace("/nation")
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Appuie sur "NOUVELLE PARTIE" | `setStep("country")` | step="country" |
| 2 | Sélectionne un pays | Si pays verrouillé : `Alert.alert` + blocage. Si France : `setSelectedCountry("france")` | step="country" |
| 3 | Appuie sur "SUIVANT →" | `setStep("name")` | step="name" |
| 4 | Saisit son nom | Validation inline : `playerName.trim().length >= 2` pour activer le bouton | step="name" |
| 5 | Appuie sur "SUIVANT →" | `handleNameNext()` → `setStep("doctrine")` | step="doctrine" |
| 6 | Choisit une doctrine | Si doctrine verrouillée : `Alert.alert`. Sinon `setSelectedLabel(label)` | step="doctrine" |
| 7 | (Optionnel) Active mode classé | `setRankedMode(true)` si `auth.isEnabled && auth.isReady` | toggle visible |
| 8 | Appuie sur "PRÊTER SERMENT" | `handleConfirmDoctrine()` : `startNewGame()` → état StrategyContext réinitialisé | `/nation` |
| 9 | Si mode classé activé | `startRankedRun(accessToken, ...)` → POST serveur ; si échec → `Alert` "Mode classé indisponible" mais partie continue | `/nation` |

**Problème possible :**
- Si le joueur a une sauvegarde et clique "NOUVELLE PARTIE", elle est écrasée sans avertissement intermédiaire (la nouvelle sauvegarde est écrite par `startNewGame` puis `saveStrategy` au prochain cycle).
- Le bouton "PRÊTER SERMENT" est désactivé si `selectedOpt.locked === true` mais le style visuel (gris) ne distingue pas "rien sélectionné" de "doctrine verrouillée sélectionnée".

**Amélioration possible :**
- Ajouter une confirmation "Votre partie actuelle sera effacée" avant d'écraser une sauvegarde existante.

---

## Parcours 3 — Première amélioration de bâtiment

**Point d'entrée :** `/nation` — le joueur voit le hub de navigation.

```
nation.tsx → NAV_ITEMS → "/buildings"
           ↓
BuildingsScreen
  canAfford(nextLevel.cost, state.resources) → bool
  isUnlocked(building, state.buildings)      → bool
           ↓
handleUpgrade(id)
  → run(commandId("upgrade_building", id), () => upgradeBuilding(id))
  → StrategyContext.upgradeBuilding()
  → startUpgrade(building, cost) [buildingEngine]
  → deductCost(cost, resources)
  → building.upgradeEndTime = Date.now() + duration
  → saveStrategy()
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Appuie sur "Bâtiments" dans le hub | `router.push("/buildings")` | `BuildingsScreen` |
| 2 | Voit les 11 bâtiments en 3 catégories | `BUILDINGS`, `buildingMap`, `canAfford()`, `isUnlocked()` | `BuildingsScreen` |
| 3 | Appuie sur "Améliorer" d'un bâtiment | `handleUpgrade(id)` → `useCommand.run()` | Toast ou succès |
| 4a | Ressources suffisantes | `upgradeBuilding()` → `startUpgrade()` → `deductCost()` ; bâtiment passe en chantier | `BuildingsScreen` (badge "EN CHANTIER" +1) |
| 4b | Ressources insuffisantes | `canAfford()` retourne `false` → bouton désactivé visuellement | Pas d'action |
| 4c | Bâtiment verrouillé | `isUnlocked()` retourne `false` → bouton désactivé | Pas d'action |
| 5 | Attend la fin de l'amélioration | `accumulateResources()` / `collectUpgrades()` tournent à chaque avance de temps | Bâtiment passe au niveau suivant |

**Problème possible :**
- Si le joueur appuie deux fois rapidement, `useCommand.run()` détecte le doublon via `commandId` et renvoie `null` → toast "Action en cours…" affiché 1,5s. Le double-tap est donc géré.
- Le temps restant de l'amélioration n'est pas affiché directement dans `BuildingsScreen` (seulement le nombre "EN CHANTIER"). Le joueur doit revenir sur l'écran pour voir la progression.

**Amélioration possible :**
- Afficher le temps restant sur la carte du bâtiment en cours d'amélioration directement dans `BuildingsScreen`.

---

## Parcours 4 — Première recherche

**Point d'entrée :** `/nation` → "Recherche".

```
nation.tsx → "/strategy-research"
           ↓
StrategyResearchScreen
  STRATEGY_RESEARCH_LIST (15 recherches, 5 catégories)
  canAfford(item.cost, state.resources)
  prereqsMet = item.prerequisites.every(p => research.completed.includes(p))
           ↓
handleLaunch(id)
  → run(commandId("start_research", id), () => launchStrategyResearch(id))
  → StrategyContext.launchStrategyResearch()
  → research.inProgress = { id, startedAtDay, completesAtDay }
  → saveStrategy()
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Appuie sur "Recherche" dans le hub | `router.push("/strategy-research")` | `StrategyResearchScreen` |
| 2 | Filtre par catégorie (optionnel) | `setActiveCategory()` → `useMemo` filtre `filtered` | Liste filtrée |
| 3 | Appuie sur "Xj · Lancer" | `handleLaunch(id)` | Toast "Recherche lancée !" |
| 4a | Succès | `research.inProgress` mis à jour ; bannière de progression apparaît en haut | Bannière visible |
| 4b | Prérequis non satisfaits | `statusLabel = "Prérequis : [nom]"` ; bouton désactivé | Pas d'action |
| 4c | Ressources insuffisantes | `statusLabel = "Ressources insuffisantes"` ; bouton désactivé | Pas d'action |
| 4d | Autre recherche en cours | `statusLabel = "Bloquée — autre en cours"` ; bouton désactivé | Pas d'action |
| 5 | La recherche se termine | `StrategyContext` détecte `mandateDay >= completesAtDay` → `research.completed.push(id)` | Nouvelle recherche disponible |

**Problème possible :**
- Une seule recherche peut être en cours simultanément (`hasOtherInProgress` bloque toutes les autres). C'est une contrainte de conception, pas un bug, mais peut surprendre un nouveau joueur.
- Le nombre de jours restants (`daysLeft`) dépend de `state.mandateDay` qui n'avance qu'à certaines actions — si le joueur est inactif, la recherche semble "bloquée".

**Amélioration possible :**
- Indiquer dans la bannière de progression le temps réel estimé restant (pas seulement les jours de mandat).

---

## Parcours 5 — Première unité militaire

**Point d'entrée :** `/nation` → "Forces Armées".

```
nation.tsx → "/forces-armees"
           ↓
ForcesArmeesScreen  — onglets : Terre | Air | Mer | Soutien | File | Doctrine
  UNIT_LIST.filter(u => u.branch === activeTab)
  canAfford(def.baseCost, state.resources)
  locked = def.unlockRequirement &&
           !state.buildings.some(b => b.id === req.buildingId && b.level >= req.level)
           ↓
handleTrain(unitId, qty)
  → trainUnit(unitId, qty)   [StrategyContext]
  → Alert.alert si !result.success
  → trainingQueue.push(entry)  [endsAtGameHour calculé]
  → saveStrategy()
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Appuie sur "Forces Armées" dans le hub | `router.push("/forces-armees")` | `ForcesArmeesScreen` |
| 2 | Sélectionne un onglet de branche | `setActiveTab()` | Liste d'unités de la branche |
| 3 | Voit une unité verrouillée | `locked=true` → `Panel` avec "Débloqué : [bâtiment] niv. X" | Info verrouillage |
| 4 | Appuie sur "Entraîner" d'une unité disponible | `handleTrain(unitId, qty)` → `trainUnit()` | Unité dans la file |
| 5 | Passe à l'onglet "File" | Liste des entrées en formation avec barre de progression | Badge sur l'onglet si formations terminées |
| 6 | Formations terminées | Appuie sur la bannière "X FORMATION(S) TERMINÉE(S)" → `collectTraining()` | Unités ajoutées à `playerUnits` |
| 7 | Consulte l'onglet "Doctrine" | Sélectionne une autre doctrine → `Alert` de confirmation → `setMilitaryDoctrine()` | Doctrine mise à jour |

**Problème possible :**
- `formatRemaining()` utilise `entry.endsAtGameHour` en priorité puis `entry.endsAt` (ms réels) pour les sauvegardes migrées. La coexistence des deux systèmes peut produire des temps affichés incohérents sur une sauvegarde migrée.
- Le badge sur l'onglet "File" n'est visible que si `completedCount > 0` — il n'apparaît pas pendant l'entraînement, ce qui peut faire croire qu'aucune formation n'est en cours.

**Amélioration possible :**
- Ajouter un badge différent (ex. sablier) sur l'onglet "File" quand des formations sont en cours mais pas encore terminées.

---

## Parcours 6 — Première opération

**Point d'entrée :** `/nation` → "Opérations".

```
nation.tsx → "/operations"
           ↓
OperationsScreen
  COUNTRY_LIST.filter(c => c.id !== state.countryId)  → liste cibles
           ↓
setSelectedCountryId(countryId)
           ↓
canLaunchOperation(op.id, selectedRelation, state.buildings, state.resources)
  → { allowed, reason }
           ↓
handleLaunch(type)
  → run(commandId("launch_operation", `${type}:${countryId}`), () => launchOperation(type, countryId))
  → StrategyContext.launchOperation()
  → resolveOperation()  [operationEngine] : taux de succès calculé
  → updateRelationScore()
  → ressources déduites
  → cooldown posé : selectedRelation.operationCooldowns[op.id] = Date.now() + cooldownMs
  → saveStrategy()
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Appuie sur "Opérations" dans le hub | `router.push("/operations")` | `OperationsScreen` |
| 2 | Sélectionne un pays cible | `setSelectedCountryId(countryId)` | Liste des opérations disponibles |
| 3 | Voit le score diplomatique du pays | `selectedRelation.score` + `selectedRelation.status` | Panel SCORE DIPLOMATIQUE |
| 4 | Choisit une opération et appuie sur "Lancer" | `handleLaunch(type)` | Banner résultat (succès/échec) |
| 5a | Opération réussie | `resolveOperation()` → résultat positif → `updateRelationScore()` | Banner vert + résultat |
| 5b | Opération échouée | Résultat négatif → relation peut se dégrader | Banner rouge |
| 5c | Opération bloquée (cooldown) | `onCooldown=true` → "Rechargement en cours" | Bouton désactivé |
| 5d | Prérequis manquant (bâtiment) | `canLaunchOperation()` retourne `allowed=false` + reason | Cadenas + message |
| 6 | Bonus R&D visible | Si recherche avec `operationBonus === op.id` est complétée → badge "+5% succès" | Info visible |

**Problème possible :**
- Le banner de résultat disparaît après 4 secondes (timer). Si le joueur navigue ailleurs pendant ce délai, le timer peut se déclencher sur un composant démonté (protection via `resultTimerRef` avec cleanup dans `useEffect`).
- Les cooldowns sont stockés dans `selectedRelation.operationCooldowns` en millisecondes epoch. Un voyage dans le temps (changement d'heure système) peut annuler ou prolonger artificiellement un cooldown.

**Amélioration possible :**
- Afficher le temps restant de cooldown précisément (ex. "Disponible dans 2h 14min") plutôt que "Rechargement en cours".

---

## Parcours 7 — Première crise critique

**Point d'entrée :** Hub `/nation` — une news interactive est en attente dans `state.news.pendingIds`.

```
nation.tsx  → CrisisAlertOverlay (si crise active et non acknowledge)
  OU
            → "/journal-crise"
              JournalDeCriseScreen
                pendingInteractive = state.news.pendingIds
                  .map(id => NEWS_EVENT_MAP[id])
                  .filter(e => e.isInteractive)
              ↓ (joueur appuie sur une news interactive)
              setActiveModal(id) → InteractiveNewsModal
              ↓ (joueur choisit une option)
              resolveInteractiveNews(id, choiceIndex)
                → applyInteractiveNews() [newsEngine]
                → effets appliqués aux indicateurs
                → event retiré de pendingIds
                → saveStrategy()
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Une crise interactive est déclenchée | `selectNextNews()` ajoute l'event à `pendingIds` | Potentiellement `CrisisAlertOverlay` |
| 2 | Ouvre "Journal de Crise" | `router.push("/journal-crise")` ; `markNewsRead()` appelé au mount | `JournalDeCriseScreen` |
| 3 | Voit le bandeau d'alertes interactives | `pendingInteractive.length > 0` → section d'alerte en haut | Bandeau visible |
| 4 | Appuie sur une crise | `setActiveModal(id)` | `InteractiveNewsModal` |
| 5 | Choisit une option de réponse | `resolveInteractiveNews(id, choiceIndex)` | Modal se ferme |
| 6 | Les effets sont appliqués | `applyInteractiveNews()` modifie `state.indicators`, `state.resources`, etc. | `JournalDeCriseScreen` mis à jour |
| 7 | Filtre le journal par type | `setFilter(type)` → `filteredLog` recalculé via `useMemo` | Liste filtrée |

**Problème possible :**
- `computeNationalTension()` est affiché dans l'écran mais n'est pas recalculé en temps réel — il reflète l'état au dernier rendu. Si une crise est résolue sans re-render, l'indice peut sembler désynchronisé.
- `MAX_LOG = 30` entrées max : les crises anciennes sont silencieusement éjectées. Le joueur ne peut pas consulter l'historique complet.

**Amélioration possible :**
- Indiquer visuellement dans le journal quand des entrées ont été tronquées (ex. "… et X crises antérieures").

---

## Parcours 8 — Ouverture du classement mondial

**Point d'entrée :** Hub `/nation` → "Classement" → `ranking.tsx` → bouton "TABLEAU D'HONNEUR MONDIAL".

```
nation.tsx → "/ranking"
           ↓
RankingScreen
  hasPendingSubmission()   [RankedService]    → rankedPending
  fetchAlliances(accessToken)                 → pendingAllianceCount
  getPlayerRank(state.ranking)               → rank local
  getRankTitle(rank, state.ranking.length)   → title
           ↓
Appuie sur "TABLEAU D'HONNEUR MONDIAL"
           ↓
router.push("/ranking-global")
           ↓
RankingGlobalScreen
  fetchLeaderboard()  → fetch SUPABASE_URL/functions/v1/leaderboard-global?limit=50
  filterValid(data.entries, validateLeaderboardEntry)
           ↓
FlatList des LeaderboardEntry
  → tap sur une ligne → router.push("/player-profile", {entry, rank})
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Appuie sur "Classement" dans le hub | `router.push("/ranking")` | `RankingScreen` |
| 2 | Voit son rang local (bots) | `getPlayerRank(state.ranking)` — classement local avec bots générés | Podium local |
| 3 | Voit la saison en cours | `state.stats.seasonStartTime + 30j` | Barre de progression saison |
| 4 | (Si auth) Voit les badges : Sécurité, Cyberattaques, Espionnage, Alliances | Chaque lien conditionnel à `auth.isEnabled` | Boutons de navigation |
| 5 | Appuie sur "TABLEAU D'HONNEUR MONDIAL" | `router.push("/ranking-global")` | `RankingGlobalScreen` |
| 6 | Liste chargée | `fetchLeaderboard()` → Supabase Edge Function → `filterValid()` | FlatList des entrées |
| 7a | Chargement réussi | Entrées affichées avec rang, drapeau, doctrine, score | FlatList visible |
| 7b | Erreur réseau | `setError(true)` → message d'erreur + bouton refresh | État erreur |
| 8 | Rafraîchit manuellement | `RefreshControl` → `onRefresh()` → `load()` | Liste mise à jour |

**Problème possible :**
- `SUPABASE_URL` vide (env non configuré) → `fetchLeaderboard()` retourne `[]` immédiatement sans erreur visible. Le joueur voit une liste vide sans explication.
- La liste est limitée à 50 entrées (`limit=50`) sans pagination. Si le joueur veut voir au-delà du top 50, c'est impossible.

**Amélioration possible :**
- Afficher un message explicite "Classement non disponible — vérifiez votre connexion" quand `SUPABASE_URL` est vide ou l'appel échoue.

---

## Parcours 9 — Consultation d'un profil joueur

**Point d'entrée :** `RankingGlobalScreen` — le joueur tape sur une entrée du classement.

```
RankingGlobalScreen
  renderItem → Pressable → router.push("/player-profile", {
    entry: JSON.stringify(entry),
    rank:  String(index + 1),
  })
           ↓
PlayerProfileScreen
  params = useLocalSearchParams<{ entry, rank }>()
  entry = JSON.parse(params.entry)  // LeaderboardEntry
  isOwnProfile = auth.user?.id === entry.player_id
           ↓
Si !isOwnProfile && auth.isEnabled :
  Renseignement (spy) + Cyberguerre + Diplomatie (alliance)
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Tape sur un joueur dans le classement | `router.push("/player-profile", params)` | `PlayerProfileScreen` |
| 2 | Le profil s'affiche | Décodage `JSON.parse(params.entry)` ; si invalide → écran vide avec bouton retour | Carte d'identité + stats |
| 3 | Voit la grille de stats | score classé, durée mandat, doctrine, puissance, saison, date soumission | Grille visible |
| 4a | C'est son propre profil | `isOwnProfile = true` → section interactions masquée | Pas d'actions multijoueur |
| 4b | C'est un autre joueur | Section "Interactions multijoueur" visible | Renseignement / Cyber / Diplomatie |
| 5 | Non connecté | `!auth.accessToken` → "Connecte-toi pour…" affiché | Message informatif |
| 6 | Connecté non lié | `auth.accessToken` mais `!auth.isLinked` → Cyber et Diplomatie verrouillés | Message "Lie ton compte…" |

**Problème possible :**
- L'entry est transmise via `JSON.stringify` dans les paramètres de navigation. Sur certains appareils, la longueur des paramètres d'URL peut être limitée si l'objet `LeaderboardEntry` est très large.
- Si `params.entry` est absent ou corrompu, `JSON.parse` échoue silencieusement → `entry = null` → écran vide avec juste un bouton retour, sans message d'erreur.

**Amélioration possible :**
- Transmettre uniquement `player_id` et récupérer les données du profil via un appel réseau dédié, pour éviter la sérialisation dans les paramètres de navigation.

---

## Parcours 10 — Invitation alliance

**Point d'entrée :** `PlayerProfileScreen` — le joueur appuie sur "Proposer une alliance".

```
PlayerProfileScreen
  handleInvite()
  → enqueueAllianceInvite(entry.player_id, auth.accessToken)  [OfflineQueue]
    → si connecté  : POST /alliance-invite directement
    → si hors ligne: OfflineQueue.enqueue({ type:"alliance_invite", payload })
  → outcome = "sent" | "queued" | "error"
           ↓
Retour dans l'interface :
  "sent"   → badge vert "Invitation envoyée"
  "queued" → badge orange "Invitation enregistrée — envoi automatique dès que tu seras en ligne"
  "error"  → message d'erreur traduit
           ↓
Destinataire voit la notification dans alliances.tsx (pendingAllianceCount > 0 → dot sur le bouton ranking.tsx)
           ↓
alliances.tsx : respondToAlliance(accessToken, allianceId, "accept" | "reject" | "break")
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Appuie sur "Proposer une alliance" | `handleInvite()` ; `inviteState = "sending"` | Spinner |
| 2a | En ligne | `enqueueAllianceInvite()` → POST `/alliance-invite` → `outcome = "sent"` | Badge "Invitation envoyée" |
| 2b | Hors ligne | `enqueueAllianceInvite()` → `OfflineQueue.enqueue()` → `outcome = "queued"` | Badge "Enregistrée" |
| 2c | Erreur serveur | `outcome = "error"` → `inviteErrorLabel()` traduit la cause | Message d'erreur |
| 3 | Destinataire ouvre le classement | `fetchAlliances()` → `pendingAllianceCount > 0` → dot or sur le bouton "Alliances" | Dot de notification visible |
| 4 | Destinataire ouvre ses alliances | `AlliancesScreen` → section "INVITATIONS REÇUES" | Boutons Accepter / Refuser |
| 5 | Destinataire accepte | `respondToAlliance(id, "accept")` → POST `/alliance-respond` → `load()` recharge la liste | Alliance passe à `status="active"` |
| 6 | Alliance active | `computeAllianceBonuses()` → `rate = min(actives, 3) × 0.02` → visible dans `AlliancesScreen` | +2% production par alliance |

**Problème possible :**
- `enqueueAllianceInvite()` ne vérifie pas côté client si le joueur a déjà 3 alliances actives — la validation se fait uniquement côté serveur (réponse HTTP 422 → `"max-alliances-reached"`).
- Une invitation "queued" dépend de `flushQueue()` pour être envoyée. Ce call n'est pas encore câblé dans `_layout.tsx`, donc une invitation hors ligne peut rester en attente indéfiniment jusqu'au prochain lancement.

**Amélioration possible :**
- Câbler `flushQueue(accessToken)` dans `_layout.tsx` après que `auth.isReady` est confirmé.

---

## Parcours 11 — Espionnage

**Point d'entrée :** `PlayerProfileScreen` — le joueur lance une opération de renseignement.

```
PlayerProfileScreen
  handleSpy(opType)  — opType = "intel_probe" | "doctrine_scan" | "score_range"
  → launchSpyOp(auth.accessToken, entry.player_id, opType)  [SpyService]
    → POST /spy-launch
    → { ok: true } | { ok: false, error: string }
           ↓
Si ok → spySentOp = opType → "Opération lancée — résultat dans 6h"
       → lien "Voir mes opérations →" → router.push("/spy-ops")
           ↓
spy-ops.tsx  — au mount : fetchSpyOps(accessToken) → GET /spy-resolve
  ops filtrés : pending | resolved | blocked
  resolves_at → countdownLabel() → "Disponible dans Xh Ym"
           ↓
Résultat arrivé :
  "intel_probe"   → pays + doctrine de la cible
  "doctrine_scan" → doctrine + fourchette de durée mandat
  "score_range"   → pays + fourchette de score estimé
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Appuie sur "Intel", "Doctrine" ou "Score" dans le profil | `handleSpy(opType)` ; `spySending = opType` | Spinner sur le chip |
| 2a | Succès | POST `/spy-launch` → ok ; `spySentOp = opType` | Confirmation + lien /spy-ops |
| 2b | Quota dépassé | `error = "quota-exceeded"` → max 2 ops / 24h | Message d'erreur |
| 2c | Cible protégée (compte < 7j) | `error = "target-protected-new"` | Message d'erreur |
| 2d | Pas de partie classée validée | `error = "no-validated-run"` | Message d'erreur |
| 3 | Ouvre /spy-ops | `fetchSpyOps()` → GET `/spy-resolve` ; liste triée par `resolves_at` | Liste des opérations |
| 4 | Attend les 6h | `resolves_at` — si futur : `countdownLabel()` affiche le délai | Badge "EN COURS" |
| 5 | Résultat disponible | `op.status = "resolved"` ; `result_json` contient les données | Section "RÉSULTATS" |
| 6 | Opération bloquée | `op.status = "blocked"` ; `blocked_reason` traduit | Section "BLOQUÉES" |

**Problème possible :**
- L'utilisateur peut lancer 3 types d'opérations différents sur le même joueur en une session, mais le serveur limite à 2 ops / 24h toutes types confondus — le 3ème appel échouera avec `quota-exceeded` après avoir semblé accepter les deux premiers.
- `fetchSpyOps()` est appelé uniquement au mount et au refresh manuel. Si le résultat arrive pendant la navigation, il n'est pas mis à jour automatiquement.

**Amélioration possible :**
- Ajouter un `useEffect` avec `setInterval` court (ex. 60s) dans `/spy-ops` pour rafraîchir automatiquement quand des opérations sont en statut "pending".

---

## Parcours 12 — Retour après plusieurs heures

**Point d'entrée :** Le joueur relance l'app après une absence.

```
_layout.tsx
  → LoadingScreen
  → loadStrategy()  [strategyStorage]
     → AsyncStorage.getItem("@strategy_v1")
     → migration si nécessaire (CURRENT_SAVE_VERSION=3)
     → syncOnLaunch(accessToken, localState)  [SyncService]
       → seuil 5 000ms : cloud_newer / local_newer / conflict_detected / no_cloud_save
           ↓
StrategyContext — onLoad(state)
  → computeRealTimeAdvance()  [realTimeEngine]
  → accumulateResources(buildings, resources, elapsedMinutes)
     → elapsedMinutes = min(elapsed, MAX_OFFLINE_MINUTES=1440)
     → multiplier = 1 + min(productionBonus, 0.06)
  → collectUpgrades()  → bâtiments terminés passent au niveau suivant
  → checkMissionProgress()  → missions complétées détectées
  → updateBotRanking()  → bots repositionnés
           ↓
index.tsx  → "CONTINUER LA PARTIE" (hasSave=true)
  → router.replace("/nation")
           ↓
nation.tsx  → affiche les ressources accumulées
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Relance l'app | `_layout.tsx` → `LoadingScreen` → `loadStrategy()` | `LoadingScreen` |
| 2 | Chargement + sync cloud | `syncOnLaunch()` compare timestamps ; si conflit → résolution automatique last-write-wins (< 5s) ou alerte | Écran d'accueil |
| 3 | Production hors-ligne calculée | `accumulateResources()` avec plafond 1440min (24h) | Ressources mises à jour |
| 4 | Améliorations terminées | `collectUpgrades()` → bâtiments passent au niveau suivant | Bâtiments mis à jour |
| 5 | Appuie sur "CONTINUER" | `router.replace("/nation")` | `nation.tsx` |
| 6 | Voit les gains | Ressources + bâtiments reflètent l'absence | Hub de jeu |

**Problème possible :**
- Si le joueur est absent plus de 24h (1440min), la production est plafonnée à 24h de valeur sans notification explicite. Le joueur peut croire avoir eu plus de ressources.
- Si la sync cloud détecte un conflit (delta < 5s entre les timestamps), la résolution automatique "last-write-wins" peut écraser des données locales récentes.
- Les alliances actives donnant un bonus production (+2% par alliance) ne sont pas rechargées au lancement (`fetchAlliances()` est appelé dans `StrategyContext.useEffect` mais nécessite `auth.accessToken` — si l'auth met du temps, le bonus peut ne pas être appliqué au calcul hors-ligne initial.

**Amélioration possible :**
- Afficher un récapitulatif "Pendant votre absence : +X argent, +Y influence, bâtiment Z terminé" à la première ouverture après retour.

---

## Parcours 13 — Mode hors ligne

**Point d'entrée :** Le joueur joue sans connexion internet (Wi-Fi coupé, avion, etc.).

```
Toutes les actions locales fonctionnent normalement :
  - Ressources, bâtiments, recherche, unités, opérations vs pays IA
  - saveStrategy() → AsyncStorage uniquement (pas de scheduleUpload réussi)

Actions multijoueur tentées hors ligne :
  enqueueAllianceInvite() → OfflineQueue.enqueue()
  [spy / cyber / ranked submit] → erreur réseau directe (pas dans la queue)

OfflineQueue :
  QUEUE_KEY = "offline_queue_v1"
  MAX_ATTEMPTS = 5
  PRUNE_AGE_MS = 7 jours
  backoffMs(attempt) : 10s → 20s → 40s → 80s → 300s
  isDefinitiveRejection() : HTTP 409/422 → "failed" sans retry
  enqueue() idempotent : même id ignoré si déjà en file
```

| Étape | Action joueur | Système appelé | Écran / État suivant |
|---|---|---|---|
| 1 | Joue normalement (local) | `StrategyContext` local — tout fonctionne | Normal |
| 2 | Tente d'envoyer une invitation alliance | `enqueueAllianceInvite()` → `OfflineQueue.enqueue()` → `outcome = "queued"` | Badge "Enregistrée" |
| 3 | Lance une opération d'espionnage | `launchSpyOp()` → fetch échoue → `{ ok: false, error: "network-unavailable" }` | Message d'erreur (non mis en queue) |
| 4 | Lance une cyberattaque | `launchCyberOp()` → fetch échoue → `{ ok: false, error: "network-unavailable" }` | Message d'erreur (non mis en queue) |
| 5 | La connexion revient | `OfflineQueue.flushQueue()` → retry des items en attente avec backoff | Items envoyés en ordre FIFO |
| 6 | Item rejeté définitivement | HTTP 409/422 → `item.status = "failed"` sans nouveau retry | Item retiré silencieusement |
| 7 | Item expiré (> 7 jours) | `pruneQueue()` le supprime | Supprimé proprement |

**Problème possible :**
- `flushQueue()` n'est pas encore câblé dans `_layout.tsx` → les items "queued" ne sont jamais envoyés automatiquement au retour de connexion. Ils resteraient en queue indéfiniment jusqu'à 7 jours (PRUNE_AGE_MS), puis seraient supprimés silencieusement.
- Les opérations d'espionnage et cyberattaques ne sont pas mises en queue (contrairement aux invitations alliance) — une absence de connexion les annule définitivement sans récupération possible.
- La sync cloud (`syncOnLaunch`) n'est pas tentée si le token d'auth n'est pas disponible au moment du chargement, ce qui peut laisser la sauvegarde locale en retard par rapport au cloud après une période hors ligne.

**Amélioration possible :**
- Câbler `flushQueue(accessToken)` dans `_layout.tsx` au moment où `auth.accessToken` devient disponible (via `useEffect` sur `auth.isReady`).
- Documenter dans l'UI que espionnage et cyberattaques nécessitent une connexion active et ne sont pas différés.

---

## Tableau récapitulatif

| # | Parcours | Déclencheur | Systèmes clés | Hors ligne ? |
|---|---|---|---|---|
| 1 | Première ouverture | Lancement app | `_layout`, `LoadingScreen`, `loadStrategy` | Oui (local) |
| 2 | Nouvelle partie | Bouton accueil | `StrategyContext.startNewGame`, `RankedService.startRankedRun` | Partiel (ranked nécessite réseau) |
| 3 | Première amélioration | Hub → Bâtiments | `buildingEngine`, `useCommand`, `saveStrategy` | Oui |
| 4 | Première recherche | Hub → Recherche | `StrategyContext.launchStrategyResearch`, `STRATEGY_RESEARCH` | Oui |
| 5 | Première unité | Hub → Forces Armées | `StrategyContext.trainUnit`, `militaryEngine` | Oui |
| 6 | Première opération | Hub → Opérations | `operationEngine.canLaunchOperation`, `resolveOperation` | Oui |
| 7 | Première crise critique | Déclenchement newsEngine | `newsEngine.selectNextNews`, `resolveInteractiveNews` | Oui |
| 8 | Classement mondial | Hub → Classement | `RankingGlobalScreen`, Supabase Edge Function | Non (réseau requis) |
| 9 | Profil joueur | Tap dans le classement | `PlayerProfileScreen`, `JSON.parse(params.entry)` | Non (transit de données) |
| 10 | Invitation alliance | Profil → Proposer alliance | `OfflineQueue.enqueueAllianceInvite`, `AllianceService` | Partiel (queue si hors ligne) |
| 11 | Espionnage | Profil → Renseignement | `SpyService.launchSpyOp`, `SpyOpsScreen` | Non |
| 12 | Retour après absence | Relancement app | `realTimeEngine`, `accumulateResources`, `SyncService.syncOnLaunch` | Partiel (sync si connecté) |
| 13 | Mode hors ligne | Perte connexion | `OfflineQueue`, `AsyncStorage`, backoff 10s→300s | Mode dégradé documenté |

---

## Flux non encore câblés (hors implémentation, observés dans le code)

| Flux | Manquant | Impact joueur |
|---|---|---|
| `flushQueue(accessToken)` | Non appelé dans `_layout.tsx` | Invitations alliance en queue jamais envoyées automatiquement |
| `pruneQueue()` | Non schedulé 1x/semaine | Items expirés s'accumulent dans AsyncStorage (nettoyés à 7j mais jamais déclenchés) |
| `enqueueSpyLaunch()` | Non implémenté | Espionnage hors ligne → échec définitif sans queue |
| `enqueueCyberLaunch()` | Non implémenté | Cyberattaque hors ligne → échec définitif sans queue |
