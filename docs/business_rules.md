# Catalogue des règles métier — État de Crise

> Source de vérité pour les règles du jeu. Chiffres extraits directement du code —
> toute divergence entre ce document et le code indique une règle changée sans mise
> à jour de la documentation.
>
> Format de chaque règle :
> - **ID** — identifiant unique et stable
> - **Description** — ce que la règle établit
> - **Condition** — ce qui doit être vrai pour que la règle s'applique
> - **Résultat** — ce qui se passe quand la condition est remplie
> - **Fichiers** — où trouver la logique
> - **Test** — vérification minimale après modification

---

## 1. Ressources

---

### R-RESOURCE-001 — Accumulation minimale
**Description :** La production de ressources n'est pas calculée si l'écart depuis le dernier
tick est inférieur à 30 secondes.

**Condition :** `elapsedMinutes < 0.5` (soit moins de 30 secondes écoulées)

**Résultat :** `accumulateResources()` retourne l'objet `resources` inchangé.

**Fichiers :** `logic/buildingEngine.ts` → `accumulateResources()` ligne 113

**Test :**
```
[ ] Tick immédiat (< 30 s après le précédent) : ressources identiques avant/après
```

---

### R-RESOURCE-002 — Plafond de production hors-ligne
**Description :** La production hors-ligne est plafonnée à 24 heures, même si le joueur
était absent plus longtemps.

**Condition :** Le joueur relance l'app après une absence.

**Résultat :** `elapsedMinutes = Math.min(elapsedMs / 60_000, 1440)` — maximum 24h × 60 = 1440 minutes.

**Fichiers :** `logic/buildingEngine.ts` → `MAX_OFFLINE_MINUTES = 24 * 60`

**Test :**
```
[ ] Simuler 48h d'absence : production équivalente à 24h, pas à 48h
[ ] Simuler 12h d'absence : production équivalente à 12h
```

---

### R-RESOURCE-003 — Bonus de production des alliances
**Description :** Chaque alliance active ajoute +2 % à la production de toutes les ressources,
plafonné à +6 % (3 alliances actives).

**Condition :** `alliances.filter(a => a.status === "active").length >= 1`

**Résultat :**
```
bonus = min(alliancesActives × 0.02, 0.06)
multiplier = 1 + min(bonus, 0.06)   // double plafond
production_effective = production_base × multiplier
```

**Fichiers :** `services/AllianceService.ts` → `ALLIANCE_BONUS_PER_ACTIVE = 0.02`,
`MAX_ALLIANCE_BONUS = 0.06` ; `logic/buildingEngine.ts` → `accumulateResources()` paramètre `productionBonus`

**Test :**
```
[ ] 0 alliance : multiplicateur = 1.00
[ ] 1 alliance : multiplicateur = 1.02
[ ] 3 alliances : multiplicateur = 1.06
[ ] 4 alliances actives (cas impossible mais protégé) : multiplicateur = 1.06
```

---

### R-RESOURCE-004 — Ressource jamais négative
**Description :** Une dépense de ressources ne peut jamais rendre une ressource négative.

**Condition :** N'importe quelle action qui déduit des ressources.

**Résultat :** `deductCost()` → `next[key] = Math.max(0, next[key] - amount)`

**Fichiers :** `logic/buildingEngine.ts` → `deductCost()`

**Test :**
```
[ ] Dépenser plus que le solde (impossible via canAfford, mais tester deductCost directement)
    → ressource à 0, jamais négative
```

---

### R-RESOURCE-005 — Vérification de fonds avant action
**Description :** Toute action coûteuse est bloquée si les ressources sont insuffisantes.

**Condition :** `canAfford(cost, resources)` retourne `false`.

**Résultat :** L'action est refusée. Aucune ressource n'est débitée.

**Fichiers :** `logic/buildingEngine.ts` → `canAfford()` ; `logic/operationEngine.ts` →
`canLaunchOperation()` ; `context/StrategyContext.tsx`

**Test :**
```
[ ] Lancer une opération sans les ressources requises : bouton désactivé ou erreur affichée
[ ] Upgrade bâtiment sans fonds : upgrade refusé, ressources inchangées
```

---

### R-RESOURCE-006 — Valeurs initiales
**Description :** Une nouvelle partie démarre avec des ressources fixes définies dans les
migrations.

**Condition :** Création d'une nouvelle partie (`initGame()`).

**Résultat :**
```
money: 2 000 | influence: 100 | energy: 200
intelligence: 50 | technology: 30 | military: 80 | cyberDefense: 40
```

**Fichiers :** `storage/saveMigrations.ts` → `DEFAULT_RESOURCES`

**Test :**
```
[ ] Nouvelle partie : toutes les ressources correspondent aux valeurs ci-dessus
```

---

## 2. Bâtiments

---

### R-BUILDING-001 — Prérequis de déverrouillage
**Description :** Certains bâtiments ne peuvent pas être améliorés tant qu'un autre bâtiment
n'a pas atteint un niveau minimum.

**Condition :** `building.unlockRequirement` défini dans `BUILDINGS` ET le bâtiment prérequis
est à un niveau inférieur au niveau requis.

**Résultat :** `isUnlocked()` retourne `false`. L'upgrade est bloqué.

**Fichiers :** `logic/buildingEngine.ts` → `isUnlocked()` ; `data/buildings.ts`

**Test :**
```
[ ] Bâtiment avec prérequis non rempli : bouton upgrade grisé
[ ] Après avoir atteint le niveau requis sur le prérequis : bâtiment déverrouillé
```

---

### R-BUILDING-002 — Un seul upgrade à la fois par bâtiment
**Description :** Un bâtiment ne peut pas être amélioré s'il est déjà en cours d'amélioration.

**Condition :** `building.upgradeEndTime !== null` ou `building.upgradeEndsAtGameHour !== null`

**Résultat :** `startUpgrade()` ne modifie pas le bâtiment (la condition `level + 1 > maxLevel`
ou la présence de timestamps actifs l'empêche).

**Fichiers :** `logic/buildingEngine.ts` → `startUpgrade()`

**Test :**
```
[ ] Cliquer deux fois sur "Améliorer" : un seul upgrade lancé
[ ] Bâtiment en cours d'upgrade : bouton désactivé
```

---

### R-BUILDING-003 — Niveau maximum
**Description :** Un bâtiment ne peut pas dépasser son niveau maximum défini.

**Condition :** `building.level >= BuildingDef.maxLevel`

**Résultat :** `startUpgrade()` retourne le bâtiment inchangé (`nextLevel > def.maxLevel`).

**Fichiers :** `logic/buildingEngine.ts` → `startUpgrade()` ligne 59 ; `data/buildings.ts`
→ `maxLevel` par bâtiment

**Test :**
```
[ ] Bâtiment au niveau max : bouton "Améliorer" absent ou désactivé
[ ] startUpgrade() sur un bâtiment au max : bâtiment inchangé
```

---

### R-BUILDING-004 — Source de vérité pour la fin d'upgrade
**Description :** La fin d'un upgrade est déterminée par `upgradeEndsAtGameHour` en priorité ;
`upgradeEndTime` (ms réels) sert de repli pour les anciennes sauvegardes.

**Condition :** `collectUpgrades()` est appelé avec l'heure jeu courante.

**Résultat :**
- Si `upgradeEndsAtGameHour != null` : terminé si `gameHourNow >= upgradeEndsAtGameHour`
- Sinon : terminé si `clockNow() >= upgradeEndTime`

**Fichiers :** `logic/buildingEngine.ts` → `collectUpgrades()` lignes 85-92

**Test :**
```
[ ] Save ancienne (uniquement upgradeEndTime) : se collecte correctement
[ ] Save récente (upgradeEndsAtGameHour) : se collecte correctement
[ ] Les deux champs absents : bâtiment ignoré dans collectUpgrades()
```

---

### R-BUILDING-005 — Production uniquement si niveau ≥ 1
**Description :** Un bâtiment non construit (`level = 0`) ne produit aucune ressource.

**Condition :** `building.level === 0`

**Résultat :** Bâtiment ignoré dans la boucle de production de `accumulateResources()`.

**Fichiers :** `logic/buildingEngine.ts` → `accumulateResources()` ligne 119

**Test :**
```
[ ] Bâtiment non construit : contribution 0 à la production
[ ] Après construction (level 1) : production démarrée au prochain tick
```

---

### R-BUILDING-006 — Durée en secondes jeu, affichage en ms réels
**Description :** `upgradeDuration` dans `BuildingDef.levels[i]` est en **secondes jeu**.
L'affichage et les timestamps sont convertis en millisecondes réelles.

**Condition :** Tout démarrage d'upgrade.

**Résultat :**
```
durationGameSec   = def.levels[building.level].upgradeDuration
durationGameHours = durationGameSec / 3600
upgradeEndTime    = clockNow() + gameHoursToRealMs(durationGameHours)
```

**Fichiers :** `logic/buildingEngine.ts` → `startUpgrade()` lignes 61-68 ;
`logic/simulationClock.ts` → `gameHoursToRealMs()`

**Test :**
```
[ ] Durée affichée cohérente avec la durée configurée dans buildings.ts
[ ] Après changement d'upgradeDuration : les upgrades déjà en cours ne sont pas affectés
```

---

### R-BUILDING-007 — Niveaux de buildings dans les sauvegardes
**Description :** `INITIAL_BUILDINGS` doit contenir exactement les 11 `BuildingId`. Un ID
manquant rend le fast-path invalide et déclenche une migration.

**Condition :** Chargement d'une sauvegarde.

**Résultat :** `isValidStrategyGameState()` retourne `false` si un building est absent
→ migration appliquée.

**Fichiers :** `data/buildings.ts` → `INITIAL_BUILDINGS` ; `utils/validators.ts` →
`isValidStrategyGameState()`

**Test :**
```
[ ] Save sans tous les buildings : migration applique INITIAL_BUILDINGS manquants
[ ] Save complète : fast-path utilisé sans migration
```

---

## 3. Recherches

---

### R-RESEARCH-001 — Ressources requises
**Description :** Une recherche ne peut être débloquée que si le joueur a les ressources
nécessaires.

**Condition :** `canAfford(research.cost, state.resources)` retourne `false`.

**Résultat :** Action `unlockResearch()` refusée dans `StrategyContext`.

**Fichiers :** `logic/buildingEngine.ts` → `canAfford()` ; `context/StrategyContext.tsx` ;
`data/strategyResearch.ts`

**Test :**
```
[ ] Recherche avec ressources insuffisantes : bouton désactivé
[ ] Recherche avec ressources exactes : débloquée, ressources déduites
```

---

### R-RESEARCH-002 — Prérequis de recherche
**Description :** Une recherche avec prérequis ne peut être débloquée que si les recherches
précédentes sont complétées.

**Condition :** La recherche cible a des dépendances non complétées dans
`state.strategyResearch`.

**Résultat :** Recherche inaccessible (grisée dans l'UI).

**Fichiers :** `data/strategyResearch.ts` → dépendances par branche ;
`context/StrategyContext.tsx` → `unlockResearch()`

**Test :**
```
[ ] Recherche avec prérequis non remplis : inaccessible
[ ] Après déblocage du prérequis : recherche disponible
```

---

### R-RESEARCH-003 — Permanence du déblocage
**Description :** Une recherche débloquée l'est définitivement — son bonus ne peut pas
être perdu ou annulé.

**Condition :** `state.strategyResearch[id] === true`

**Résultat :** Bonus appliqué en permanence via les moteurs (bonus d'opérations, de
production, etc.).

**Fichiers :** `types/strategyResearch.ts` ; `context/StrategyContext.tsx`

**Test :**
```
[ ] Sauvegarde/chargement après déblocage : recherche toujours débloquée
[ ] Bonus de la recherche toujours actif après redémarrage de l'app
```

---

### R-RESEARCH-004 — Bonus opérationnel des recherches
**Description :** Certaines recherches ajoutent +5 % au taux de réussite d'opérations ciblées.

**Condition :** La recherche est dans `researchCompleted` ET dans `RESEARCH_OP_MAP[operationType]`.

**Résultat :** `rate += 0.05` par recherche éligible (plafonné globalement à 0.95).

**Correspondances :**
```
reinforce_cyber    ← research_cybersec
espionage          ← research_drones
steal_intel        ← research_satellites
military_operation ← research_missile_defense, research_missiles, research_military_bases
influence_campaign ← research_infowar
```

**Fichiers :** `logic/operationEngine.ts` → `computeSuccessRate()` lignes 287-296

**Test :**
```
[ ] Espionage sans research_drones : taux de base 85%
[ ] Espionage avec research_drones : taux = 90% (avant modificateurs relation/bâtiment)
```

---

## 4. Unités militaires

---

### R-UNIT-001 — Contribution à la puissance militaire
**Description :** La puissance militaire est calculée à partir des unités entraînées
et de la doctrine active. Certaines doctrines appliquent un bonus de branche.

**Condition :** Calcul à chaque tick ou consultation.

**Résultat :**
```
pour chaque unité : leveledPower = scaleUnitStat(def.power, pu.level)
branchMod = +20% si branche air + doctrine "air_supremacy"
           +20% si branche naval + doctrine "naval_control"
           +15% si branche support + doctrine "hybrid"
           sinon (defenseBonus + attackBonus) / 2
power_branche += leveledPower × quantité × (1 + branchMod)
total × 1.1 si doctrine "deterrence"
```

**Fichiers :** `logic/militaryEngine.ts` → `calculateMilitaryPower()`

**Test :**
```
[ ] 0 unités : toutes les branches à 0
[ ] Unité air + doctrine air_supremacy : +20% appliqué sur la branche air
[ ] Doctrine deterrence : total × 1.1
```

---

### R-UNIT-002 — Bonus d'opération des unités
**Description :** Les unités entraînées améliorent le taux de réussite des opérations
via des tags, plafonné à +25 % au total.

**Condition :** `pu.quantity > 0` ET l'unité a les tags pertinents.

**Résultat :** Bonus ajouté au taux de réussite de `computeSuccessRate()`.
Maximum cumulé : `0.25` (plafonné dans `getOperationUnitBonus()`).

**Tags pertinents par opération :**
```
espionage / steal_intel : "espionage", "recon" (+0.01/unité), "stealth" (+0.005/unité)
cyber_attack            : "cyber" (+0.015/unité)
sabotage                : "elite", "stealth" (+0.01/unité)
military_operation      : branch land/air (+0.008/unité), "heavy"/"armored" (+0.01/unité)
```
*Quantité plafonnée à 10 unités par calcul.*

**Fichiers :** `logic/militaryEngine.ts` → `getOperationUnitBonus()`

**Test :**
```
[ ] 10 unités espionage-taggées + espionage : +10% sur le taux
[ ] Bonus cumulé > 25% : plafonné à 25%
```

---

### R-UNIT-003 — Upkeep quotidien
**Description :** Chaque unité coûte des ressources par jour de jeu. La doctrine militaire
applique un modificateur d'upkeep.

**Condition :** `pu.quantity > 0`

**Résultat :**
```
upkeep_total[key] = Σ (def.upkeepPerDay[key] × pu.quantity) × (1 + doctrine.upkeepMod)
```
Arrondi à l'entier.

**Fichiers :** `logic/militaryEngine.ts` → `calculateDailyUpkeep()`

**Test :**
```
[ ] 10 unités, upkeepPerDay.money = 5, upkeepMod = 0 : total = 50
[ ] Doctrine avec upkeepMod = 0.1 : total = 55
[ ] 0 unités : upkeep vide
```

---

### R-UNIT-004 — File d'entraînement
**Description :** Les unités sont entraînées séquentiellement. Une unité en cours d'entraînement
doit se terminer avant que la suivante ne commence.

**Condition :** `state.trainingQueue` non vide.

**Résultat :** Les unités s'ajoutent à `state.playerUnits` une fois leur durée écoulée,
dans l'ordre de la file.

**Fichiers :** `context/StrategyContext.tsx` → gestion de `trainingQueue`

**Test :**
```
[ ] 2 unités en file : la première se termine, la seconde démarre ensuite
[ ] Sauvegarde en milieu de file : ordre préservé au rechargement
```

---

### R-UNIT-005 — Niveau des unités
**Description :** Les unités ont un niveau qui scale leur puissance selon `scaleUnitStat()`.

**Condition :** `pu.level >= 1`

**Résultat :** Puissance effective croissante avec le niveau.

**Fichiers :** `types/units.ts` → `scaleUnitStat()` ; `logic/militaryEngine.ts`

**Test :**
```
[ ] Même unité niveau 1 vs niveau 2 : niveau 2 a une puissance supérieure
```

---

### R-UNIT-006 — Doctrine militaire unique
**Description :** Le joueur ne peut avoir qu'une seule doctrine militaire active à la fois.
Changer de doctrine remplace immédiatement la précédente.

**Condition :** Action `setMilitaryDoctrine()` appelée.

**Résultat :** `state.militaryDoctrine` mis à jour, bonus/malus recalculés immédiatement.

**Fichiers :** `context/StrategyContext.tsx` ; `data/militaryDoctrines.ts`

**Test :**
```
[ ] Changer de doctrine : bonus d'opération et upkeep recalculés
[ ] Doctrine inchangée entre deux sessions
```

---

## 5. Opérations

---

### R-OP-001 — Quatre conditions cumulatives pour lancer une opération
**Description :** Une opération peut être lancée uniquement si TOUTES les conditions
suivantes sont remplies.

**Conditions (par ordre de vérification) :**
1. Ressources suffisantes : `canAfford(op.cost, resources)`
2. Bâtiment requis au bon niveau : `building.level >= op.requiredBuilding.level`
3. Score de relation dans la plage autorisée : `op.minRelationScore ≤ relation.score ≤ op.maxRelationScore`
4. Cooldown expiré : `Date.now() >= relation.operationCooldowns[type]`

**Résultat :** `canLaunchOperation()` retourne `{ allowed: false, reason: "..." }` dès que
la première condition échoue.

**Fichiers :** `logic/operationEngine.ts` → `canLaunchOperation()` lignes 314-355

**Test :**
```
[ ] Chacune des 4 conditions testée indépendamment (les 3 autres remplies)
[ ] Toutes remplies : allowed = true
```

---

### R-OP-002 — Taux de réussite de base par type
**Description :** Chaque type d'opération a un taux de réussite de base, avant
modificateurs.

| Opération | Taux de base | Résolution |
|---|---|---|
| `espionage` | 85 % | Toujours un retour (succès ou partiel) |
| `steal_intel` | 60 % | Binaire |
| `cyber_attack` | 65 % | Binaire |
| `influence_campaign` | 100 % | Toujours réussie |
| `sabotage` | 50 % | Binaire |
| `sanction` | 100 % | Toujours réussie |
| `sign_treaty` | 100 % | Toujours réussie |
| `diplomatic_aid` | 100 % | Toujours réussie |
| `reinforce_cyber` | 100 % | Toujours réussie |
| `military_operation` | 55 % | Binaire |

**Fichiers :** `logic/operationEngine.ts` → `computeSuccessRate()` lignes 251-262

**Test :**
```
[ ] influence_campaign : toujours success = true dans resolveOperation()
[ ] military_operation : success variable (taux ≠ 100%)
```

---

### R-OP-003 — Modificateurs de taux selon le statut de relation
**Description :** Le statut de relation modifie le taux de réussite des opérations.

| Statut | Modificateur |
|---|---|
| `hostile` | -15 % |
| `rival` | -8 % |
| `allied` | +10 % |
| `friendly` / `neutral` | 0 % |

**Résultat :** Appliqué avant les modificateurs de bâtiments et de recherches.

**Fichiers :** `logic/operationEngine.ts` → `computeSuccessRate()` lignes 267-269

**Test :**
```
[ ] military_operation vs hostile : 55% - 15% = 40% avant autres modificateurs
[ ] espionage vs allied : 85% + 10% = 95% (atteint le plafond)
```

---

### R-OP-004 — Modificateurs de taux selon les bâtiments
**Description :** Le niveau de certains bâtiments améliore le taux de réussite d'opérations
ciblées.

| Bâtiment | Opérations bénéficiaires | Bonus par niveau |
|---|---|---|
| `intelligence_ministry` | espionage, steal_intel, sabotage | +2 % / niveau |
| `cyber_ministry` | cyber_attack | +2.5 % / niveau |
| `military_hq` | military_operation | +2 % / niveau |

**Fichiers :** `logic/operationEngine.ts` → `computeSuccessRate()` lignes 272-285

**Test :**
```
[ ] intelligence_ministry niveau 5 + espionage : +10% sur le taux
[ ] cyber_ministry niveau 4 + cyber_attack : +10% sur le taux
```

---

### R-OP-005 — Plafond et plancher du taux de réussite
**Description :** Le taux de réussite effectif est toujours compris entre 5 % et 95 %,
quels que soient les modificateurs cumulés.

**Condition :** Toute opération avec composante aléatoire.

**Résultat :** `return Math.min(0.95, Math.max(0.05, rate))`

**Fichiers :** `logic/operationEngine.ts` → `computeSuccessRate()` ligne 297

**Test :**
```
[ ] Taux calculé à 102% : plafonné à 95%
[ ] Taux calculé à -3% : relevé à 5%
```

---

### R-OP-006 — Cooldowns par opération
**Description :** Après chaque opération, un cooldown bloque le relancement sur le même pays.

| Opération | Cooldown |
|---|---|
| `espionage` | 5 min |
| `steal_intel` | 15 min |
| `cyber_attack` | 30 min |
| `influence_campaign` | 10 min |
| `sabotage` | 1 h |
| `sanction` | 2 h |
| `sign_treaty` | 1 h |
| `diplomatic_aid` | 30 min |
| `reinforce_cyber` | 10 min |
| `military_operation` | 4 h |

**Résultat :** `relation.operationCooldowns[type] = Date.now() + cooldown × 1000`

**Fichiers :** `logic/operationEngine.ts` → `OPERATIONS` (champ `cooldown`) ;
`context/StrategyContext.tsx` → mise à jour des cooldowns

**Test :**
```
[ ] Juste après une opération : relancer impossible (allowed: false, "Opération en cooldown")
[ ] Après expiration du cooldown : relancer possible
```

---

### R-OP-007 — Score de relation après opération
**Description :** Le score de relation avec un pays évolue après chaque opération.
Il est borné à [-100, +100] et détermine le statut.

**Bornes du statut :**
```
score ≥  60 : "allied"
score ≥  25 : "friendly"
score ≥ -25 : "neutral"
score ≥ -60 : "rival"
score  < -60 : "hostile"
```

**Fichiers :** `logic/operationEngine.ts` → `updateRelationScore()` lignes 300-311

**Test :**
```
[ ] Score 50 + delta +15 = 65 → statut "allied"
[ ] Score -55 + delta -10 = -65 → statut "hostile"
[ ] Score 90 + delta +20 = 100 (plafonné) → statut "allied"
```

---

### R-OP-008 — Contrainte de score pour certaines opérations
**Description :** Certaines opérations ne peuvent être lancées que dans une plage de
score de relation définie.

| Opération | Contrainte |
|---|---|
| `influence_campaign` | score ≤ 60 (inutile si déjà allié) |
| `sign_treaty` | score ≤ 30 |
| `diplomatic_aid` | score ≤ 50 |
| `military_operation` | score ≤ -20 (réservé aux rivaux/hostiles) |

**Fichiers :** `logic/operationEngine.ts` → `OPERATIONS` champs `maxRelationScore` ;
`canLaunchOperation()` lignes 341-346

**Test :**
```
[ ] influence_campaign vs allié (score 70) : allowed = false, "Relations déjà trop bonnes"
[ ] military_operation vs pays neutre (score 0) : allowed = false
[ ] military_operation vs hostile (score -70) : allowed = true (si bâtiment ok)
```

---

### R-OP-009 — Espionage toujours positif
**Description :** L'opération `espionage` retourne toujours un résultat positif
(`success: true`), même en cas d'échec partiel.

**Condition :** Type `espionage`, quel que soit le jet de dés.

**Résultat :**
- Succès (taux ≥ 85%) : +60 intelligence, +10 technologie, +15 pts classement
- Partiel : +20 intelligence, +5 pts classement
- `success: true` dans les deux cas

**Fichiers :** `logic/operationEngine.ts` → `resolveOperation()` lignes 122-133

**Test :**
```
[ ] 1000 espionages : success toujours = true dans le retour
[ ] Rewards différents selon le tirage (60 vs 20 intelligence)
```

---

### R-OP-010 — Anti-double-clic sur les opérations
**Description :** Une opération ne peut pas être déclenchée deux fois simultanément.

**Condition :** `useCommand.isPending === true`

**Résultat :** Le bouton est désactivé jusqu'à la résolution de l'action en cours.

**Fichiers :** `hooks/useCommand.ts` ; `app/operations.tsx`

**Test :**
```
[ ] Clic rapide × 2 : une seule opération lancée
[ ] isPending = true entre le clic et la résolution
```

---

## 6. Missions

---

### R-MISSION-001 — Rotation des missions
**Description :** Les 3 missions journalières expirent après 1 jour de jeu (6 heures réelles)
et sont régénérées automatiquement.

**Condition :** `missionsExpired()` retourne `true` :
`missions[0].assignedAt < clockNow() - REAL_MS_PER_GAME_DAY`

**Résultat :** `generateDailyMissions(dayIndex)` produit 3 nouvelles missions depuis
`pickDailyMissions()`.

**Fichiers :** `logic/missionEngine.ts` → `missionsExpired()`, `generateDailyMissions()`,
`MISSION_DURATION_MS = REAL_MS_PER_GAME_DAY`

**Test :**
```
[ ] Simuler 6h+ écoulées : missions régénérées au prochain tick StrategyContext
[ ] Simuler 3h écoulées : missions conservées
[ ] Nouvelles missions différentes de l'ensemble précédent (probabiliste)
```

---

### R-MISSION-002 — Progression automatique
**Description :** La progression de certaines missions est mise à jour automatiquement
après chaque action pertinente.

**Condition :** `checkMissionProgress()` appelé avec l'`event` pertinent.

**Résultat par type :**
- `collect_resources` : progress = `resources[resourceKey]` (continu)
- `reach_power` : progress = `globalPower` (continu)
- `launch_operation` / `win_operation` : progress = `target` (complété instantanément)
- `spy_country` / `reinforce_defense` : progress = `target` (complété instantanément)
- `upgrade_building` : progress = `target` (si buildingId correspond ou si pas de buildingId ciblé)

**Fichiers :** `logic/missionEngine.ts` → `checkMissionProgress()` lignes 33-93

**Test :**
```
[ ] Mission collect_resources money 5000 : progress mis à jour après chaque accumulation
[ ] Mission launch_operation espionage : complétée dès le premier lancement d'espionage
[ ] Mission win_operation : complétée seulement si l'opération réussit
```

---

### R-MISSION-003 — Récompense collectée manuellement
**Description :** Une mission complétée ne crédite pas automatiquement les ressources —
le joueur doit collecter explicitement.

**Condition :** `mission.completed === true` ET joueur appuie sur "Collecter".

**Résultat :** `collectMissionReward()` crédite `MissionDef.reward` dans `state.resources`.

**Fichiers :** `context/StrategyContext.tsx` → `collectMissionReward()` ;
`components/MissionCard.tsx`

**Test :**
```
[ ] Mission complétée, pas collectée : ressources inchangées
[ ] Après collecte : ressources créditées, mission non recollectable
```

---

### R-MISSION-004 — Progression plafonnée à la cible
**Description :** La valeur de progression ne peut pas dépasser la valeur cible, même si
la métrique sous-jacente est plus élevée.

**Condition :** `progress = Math.min(progress, m.target)`

**Résultat :** `mission.progress` borné à `mission.target`.

**Fichiers :** `logic/missionEngine.ts` → `checkMissionProgress()` ligne 93

**Test :**
```
[ ] Mission reach_power 500, globalPower = 800 : progress = 500, completed = true
[ ] Affichage : 500/500, pas 800/500
```

---

### R-MISSION-005 — Missions vides = régénération immédiate
**Description :** Si aucune mission n'est présente (tableau vide), `missionsExpired()`
retourne `true` — déclenchant une génération immédiate.

**Condition :** `missions.length === 0`

**Résultat :** `return true` → `generateDailyMissions()` appelé au prochain tick.

**Fichiers :** `logic/missionEngine.ts` → `missionsExpired()` ligne 29

**Test :**
```
[ ] Nouvelle partie (missions = []) : 3 missions générées dès le premier tick
```

---

## 7. Journal de Crise

---

### R-NEWS-001 — Fréquence des actualités non interactives
**Description :** Une actualité automatique (non interactive) est déclenchée toutes les
4 actions joueur.

**Condition :** `actionCount - news.lastNewsAction >= 4`

**Résultat :** `shouldTriggerNews()` retourne `true` → `selectNextNews()` appelé avec
`forceInteractive = false`.

**Fichiers :** `logic/newsEngine.ts` → `shouldTriggerNews()`, `MINOR_NEWS_EVERY = 4`

**Test :**
```
[ ] Actions 1, 2, 3 : aucune news
[ ] Action 4 : news déclenchée
[ ] Action 8 : deuxième news déclenchée
```

---

### R-NEWS-002 — Fréquence des actualités interactives
**Description :** Une actualité interactive (décision présidentielle requise) est déclenchée
toutes les 12 actions joueur.

**Condition :** `actionCount - news.lastNewsAction >= 12`

**Résultat :** `shouldTriggerInteractiveNews()` retourne `true` → `selectNextNews()` appelé
avec `forceInteractive = true`.

**Fichiers :** `logic/newsEngine.ts` → `shouldTriggerInteractiveNews()`, `MAJOR_NEWS_EVERY = 12`

**Test :**
```
[ ] Action 12 : actualité interactive déclenchée
[ ] Action 11 : pas encore déclenchée
```

---

### R-NEWS-003 — Sélection probabiliste des actualités
**Description :** L'actualité sélectionnée est la plus haute-priorité dans un pool de
candidats. La priorité combine 4 composantes.

**Formule de priorité :**
```
priorité = conditionKey (+10 si condition remplie)
          + isInteractive (+5)
          + urgency (faible=1, moyenne=2, forte=3, critique=4)
          + weaknessWeight (0–8, basé sur les faiblesses du joueur)
          + tensionBonus (0–3 pour événements national/social si tension ≥ 60)
          + rarityBonus (2–12 pour événements rares devenus éligibles)
```

**Résultat :** L'événement avec la priorité la plus haute est sélectionné dans le top-5
(pour garantir la variété).

**Fichiers :** `logic/newsEngine.ts` → `selectNextNews()` ; `logic/rarityEngine.ts`

**Test :**
```
[ ] Événement avec conditionKey remplie : priorité ≥ +10 vs sans conditionKey
[ ] Profil weakness cyber : événements cyber bénéficient d'un bonus ≤ 8
```

---

### R-NEWS-004 — Taille maximale du log
**Description :** Le log du Journal de Crise ne conserve que les 30 dernières entrées.

**Condition :** Une nouvelle entrée est ajoutée au log.

**Résultat :** `news.log = [...log, newEntry].slice(-MAX_LOG)` avec `MAX_LOG = 30`.

**Fichiers :** `logic/newsEngine.ts` → `MAX_LOG = 30`

**Test :**
```
[ ] 31e entrée ajoutée : la 1re entrée supprimée, log contient 30 entrées
[ ] Log après 100 actualités : toujours exactement 30 entrées
```

---

### R-NEWS-005 — Événement déjà vu = exclu
**Description :** Un événement déjà déclenché dans la session (`seenIds`) ne peut pas
être resélectionné, sauf en cas de fallback d'urgence.

**Condition :** `news.seenIds.includes(event.id)`

**Résultat :** Événement exclu des candidats dans `selectNextNews()`.

**Fallback :** Si tous les événements éligibles ont été vus, les 10 derniers du log sont
exclus mais les anciens sont recyclés.

**Fichiers :** `logic/newsEngine.ts` → `selectNextNews()` lignes 87-88, 108-113

**Test :**
```
[ ] Même événement ne s'affiche pas deux fois dans la même session (hors fallback)
[ ] Avec peu d'événements (<10) : fallback déclenché sans crash
```

---

### R-NEWS-006 — Actualité interactive bloque visuellement
**Description :** Une actualité interactive en attente de décision est affichée dans le
panneau d'urgence du Journal de Crise. Elle reste visible jusqu'à résolution.

**Condition :** `news.pendingIds.includes(eventId)` ET `event.isInteractive === true`

**Résultat :** Apparaît dans `pendingInteractive` (section rouge "DÉCISIONS EN ATTENTE").

**Fichiers :** `app/journal-crise.tsx` → `pendingInteractive` memo ; `context/StrategyContext.tsx`
→ `resolveInteractiveNews()`, `dismissNews()`

**Test :**
```
[ ] Décision non résolue : visible dans le panneau d'urgence
[ ] Après résolution : disparaît du panneau, entrée ajoutée au log
[ ] Après dismiss : disparaît du panneau, pas d'entrée dans le log
```

---

### R-NEWS-007 — Conséquence différée déclenchée après N actions
**Description :** Un choix avec `queuesDelayedConsequence` stocke un effet déclenché
N actions plus tard.

**Condition :** Joueur a fait le choix concerné ET `actionCount` a avancé de
`delayActions` depuis.

**Résultat :** Effet appliqué (`news_event`, `indicator_effect` ou `hidden_politics`)
et item retiré de `state.pendingConsequences`.

**Fichiers :** `types/strategy.ts` → `DelayedConsequence` ; `context/StrategyContext.tsx`
→ décompte des conséquences

**Test :**
```
[ ] Choix avec delay 5 actions : effet invisible pendant 5 actions, déclenché à la 6e
[ ] Sauvegarde entre le choix et le déclenchement : conséquence survit au rechargement
```

---

## 8. Classement

---

### R-RANK-001 — Calcul de la puissance globale
**Description :** La puissance globale est calculée à partir des niveaux de bâtiments
et des ressources. Elle sert de base au classement local (bots).

**Formule :**
```
power = Σ (poids_bâtiment × niveau × 1.5)   [bâtiments avec level > 0]
      + Σ (ressource × poids_ressource)

Poids bâtiments : military_hq=25, central_bank=22, presidential_palace=20,
                  research_center=16, defense_ministry=18, cyber_ministry=14,
                  economy_ministry=15, intelligence_ministry=12, energy_ministry=11,
                  diplomacy_ministry=10, media_agency=9
Poids ressources : military=0.50, cyberDefense=0.40, technology=0.35,
                   influence=0.30, energy=0.15, intelligence=0.20, money=0.01
```

**Fichiers :** `logic/powerEngine.ts` → `calculateGlobalPower()`

**Test :**
```
[ ] 0 bâtiments, 0 ressources : puissance = 0
[ ] military_hq niveau 5 : contribution = 25 × 5 × 1.5 = 187.5
[ ] Résultat arrondi à l'entier
```

---

### R-RANK-002 — Score classé calculé uniquement côté serveur
**Description :** Le score soumis au classement mondial est calculé et validé par l'Edge
Function `/ranked-submit`. Le client n'envoie pas un score — il envoie un journal.

**Condition :** Fin de run classée.

**Résultat :** Score stocké dans Supabase, retourné au client pour affichage uniquement.

**Fichiers :** `services/RankedService.ts` → `submitRankedRun()` ;
`logic/rankedScoreFormula.ts` (spécification, non utilisée pour la soumission)

**Test :**
```
[ ] Modifier rankedScoreFormula.ts côté client : aucun impact sur le leaderboard
[ ] Score impossible (> 180 pts) : rejet 422 par le serveur
```

---

### R-RANK-003 — Journal d'événements classé
**Description :** Chaque action clé pendant une run classée est enregistrée localement,
avec un numéro de séquence croissant et un timestamp.

**Condition :** `isRankedIntended() === true`

**Résultat :** `recordEvent()` append une `RunEvent` au journal local (`ranked_journal_v1`
dans AsyncStorage).

**Types d'événements enregistrés :** `crisis_choice`, `reform_launched`, `doctrine_set`,
`military_op`, `game_over`, `mandate_end`, `building_upgrade_started`,
`building_upgrade_completed`, `research_started`, `research_completed`,
`unit_training_started`, `unit_training_completed`, `resource_snapshot_periodic`,
`operation_result`, `ranked_score_hint`

**Fichiers :** `services/RankedService.ts` → `recordEvent()`

**Test :**
```
[ ] Run non classée : recordEvent() en no-op
[ ] Run classée, 5 actions : journal contient 5 entrées avec seq 0–4
```

---

### R-RANK-004 — Retry de soumission classée hors ligne
**Description :** Si la soumission échoue faute de réseau, le journal est conservé dans
AsyncStorage et retenté au prochain lancement avec auth active.

**Condition :** `submitRankedRun()` lève une exception réseau.

**Résultat :** Journal + métadonnées stockés dans `ranked_pending_submit_v1`.
`retryPendingSubmission()` les renvoie au prochain lancement (après auth ready).

**Important :** Le token JWT n'est jamais persisté — `retryPendingSubmission()` reçoit
un token frais depuis `AuthContext`.

**Fichiers :** `services/RankedService.ts` → `submitRankedRun()`, `retryPendingSubmission()`

**Test :**
```
[ ] Simuler réseau indisponible à la soumission : pending stocké
[ ] Relancer l'app avec réseau : soumission automatique au lancement
[ ] Aucun JWT dans ranked_pending_submit_v1
```

---

### R-RANK-005 — Soumission classée unique par run
**Description :** Une run ne peut être soumise qu'une fois. Après soumission réussie,
le journal et le pending sont effacés.

**Condition :** `submitRankedRun()` reçoit une réponse 200 du serveur.

**Résultat :** Suppression de `ranked_journal_v1` et `ranked_pending_submit_v1`.

**Fichiers :** `services/RankedService.ts` → `submitRankedRun()`

**Test :**
```
[ ] Double appel à submitRankedRun() : le second retourne une erreur (journal vide)
[ ] Après soumission réussie : plus de données dans AsyncStorage
```

---

### R-RANK-006 — Classement local (bots) basé sur la puissance globale
**Description :** Le tri du classement local utilise `power` (puissance globale) comme
critère principal.

**Condition :** Chaque tick de `StrategyContext`.

**Résultat :** `state.ranking` trié par `power` décroissant. Le joueur est identifié par
`id = "player"`.

**Fichiers :** `logic/botEngine.ts` → `updateBotRanking()` ;
`context/StrategyContext.tsx`

**Test :**
```
[ ] Upgrade de bâtiment : puissance augmente, rang amélioré si bots dépassés
[ ] Joueur id="player" toujours présent dans le classement
```

---

## 9. Alliances

---

### R-ALLIANCE-001 — Bonus de production par alliance active
**Description :** Chaque alliance active ajoute +2 % à la production de ressources,
plafonné à +6 % pour 3 alliances.

**Condition :** `alliance.status === "active"`

**Résultat :**
```
count = min(alliancesActives, 3)
rate = count × 0.02   // max 0.06
```

**Fichiers :** `services/AllianceService.ts` → `computeAllianceBonuses()`,
`ALLIANCE_BONUS_PER_ACTIVE = 0.02`, `MAX_ALLIANCE_BONUS = 0.06`

**Test :**
```
[ ] 2 alliances actives : +4% sur toutes les ressources
[ ] 4 alliances actives : toujours +6% (plafond)
[ ] Pas d'alliance active : +0%
```

---

### R-ALLIANCE-002 — Invitation idempotente
**Description :** Envoyer deux fois une invitation au même joueur ne crée pas deux entrées
dans la file offline.

**Condition :** `enqueue()` appelé avec le même `id`.

**Résultat :** Le deuxième appel est ignoré si le premier item est encore actif
(`status !== "success"` et `status !== "failed"`).

**Fichiers :** `services/OfflineQueue.ts` → `enqueue()` lignes 148-152

**Test :**
```
[ ] Double appel enqueueAllianceInvite(playerId) : 1 seul item dans la file
```

---

### R-ALLIANCE-003 — Rejet définitif HTTP 409 / 422
**Description :** Un rejet serveur avec code 409 ou 422 marque l'invitation comme
`"failed"` définitivement sans retry.

**Condition :** Serveur répond 409 (cooldown) ou 422 (quota dépassé).

**Résultat :** Item marqué `"failed"`. `isDefinitiveRejection()` retourne `true`.
Aucune nouvelle tentative.

**Fichiers :** `services/OfflineQueue.ts` → `executeItem()` lignes 109-111,
`isDefinitiveRejection()` ligne 134

**Test :**
```
[ ] Mock serveur 409 : status "failed" immédiatement, pas de retry
[ ] Mock serveur 422 : même comportement
[ ] Mock serveur 500 : retry avec backoff
```

---

### R-ALLIANCE-004 — Réponse à une invitation
**Description :** Une invitation reçue peut être acceptée, refusée, ou (si active) rompue.

**Condition :** `alliance.is_initiator === false` ET `alliance.status === "pending"`

**Résultat :** `respondToAlliance(allianceId, action)` → POST `/alliance-respond`.

**Actions possibles :** `"accept"` → `"active"`, `"reject"` → `"rejected"`,
`"break"` → `"broken"` (sur une alliance active)

**Fichiers :** `services/AllianceService.ts` → `respondToAlliance()`

**Test :**
```
[ ] Accepter : alliance passe à "active", bonus appliqués
[ ] Refuser : alliance passe à "rejected", plus visible dans la liste
[ ] Rompre : alliance passe à "broken", bonus supprimés
```

---

### R-ALLIANCE-005 — Feature flag
**Description :** Si `FEATURES.enableAlliances === false`, l'écran alliances affiche
`FeatureUnavailable` et aucun appel réseau n'est effectué.

**Condition :** `FEATURES.enableAlliances === false`

**Résultat :** `return <FeatureUnavailable />` dans `app/alliances.tsx`.

**Fichiers :** `config/features.ts` ; `app/alliances.tsx`

**Test :**
```
[ ] Flag à false : FeatureUnavailable visible, fetchAlliances() jamais appelé
[ ] Flag à true : écran normal
```

---

## 10. Espionnage

---

### R-SPY-001 — Authentification requise
**Description :** Toute opération d'espionnage async nécessite un compte lié (`auth.isEnabled`
et `auth.accessToken` non null).

**Condition :** `auth.isEnabled === false` ou `auth.accessToken === null`

**Résultat :** Aucun appel réseau. Écran vide ou état "connexion requise".

**Fichiers :** `app/spy-ops.tsx` ; `context/AuthContext.tsx`

**Test :**
```
[ ] Sans compte : aucun appel à fetchSpyOps() ou launchSpyOp()
[ ] Avec compte : appels normaux
```

---

### R-SPY-002 — Erreur réseau non fatale
**Description :** `fetchSpyOps()` retourne `[]` sur toute erreur réseau ou réponse non-200.
Aucun throw.

**Condition :** Réseau indisponible ou réponse serveur incorrecte.

**Résultat :** Tableau vide retourné. L'écran affiche un état vide, pas un crash.

**Fichiers :** `services/SpyService.ts` → `fetchSpyOps()`

**Test :**
```
[ ] Réseau coupé : fetchSpyOps() retourne [], aucune exception
[ ] Réponse JSON invalide : filterValid() filtre les entrées invalides, retourne []
```

---

### R-SPY-003 — Feature flag
**Description :** Si `FEATURES.enableSpyOps === false`, l'écran `spy-ops.tsx` affiche
`FeatureUnavailable`.

**Fichiers :** `config/features.ts` → `enableSpyOps` ; `app/spy-ops.tsx`

**Test :**
```
[ ] Flag à false : FeatureUnavailable, aucun appel réseau
```

---

## 11. Cyberattaque

---

### R-CYBER-001 — Deux tableaux distincts (sent / received)
**Description :** `fetchCyberOps()` retourne deux tableaux distincts : opérations envoyées
(`sent`) et opérations reçues (`received`).

**Condition :** Appel à `fetchCyberOps()`.

**Résultat :**
```typescript
{ sent: CyberOp[], received: CyberOp[], pending_debuff_pct: number | null }
```
Chaque tableau est filtré via `filterValid([], validateCyberOp)` indépendamment.

**Fichiers :** `services/CyberService.ts` → `fetchCyberOps()`

**Test :**
```
[ ] Confondre sent et received : affichage inversé (test de régression critique)
[ ] pending_debuff_pct null : aucune erreur d'affichage ou de calcul
```

---

### R-CYBER-002 — Debuff temporaire sur la production
**Description :** `pending_debuff_pct` représente un pourcentage de réduction temporaire
de la production de cyberdéfense infligé par une cyberattaque reçue.

**Condition :** `pending_debuff_pct !== null && pending_debuff_pct > 0`

**Résultat :** Appliqué à la production de `cyberDefense` dans `accumulateResources()`.

**Fichiers :** `services/CyberService.ts` ; `context/StrategyContext.tsx`

**Test :**
```
[ ] pending_debuff_pct = 0.1 (10%) : production cyberDefense réduite de 10%
[ ] pending_debuff_pct = null : production inchangée
```

---

### R-CYBER-003 — Feature flag
**Description :** Si `FEATURES.enableCyberOps === false`, l'écran `cyber-ops.tsx` affiche
`FeatureUnavailable`.

**Fichiers :** `config/features.ts` → `enableCyberOps` ; `app/cyber-ops.tsx`

**Test :**
```
[ ] Flag à false : FeatureUnavailable, aucun appel réseau
```

---

## 12. Sauvegarde

---

### R-SAVE-001 — Versionning obligatoire
**Description :** Toute save est associée à un numéro de version (`saveVersion`).
La version courante est `CURRENT_SAVE_VERSION = 3`.

**Condition :** Chargement d'une save.

**Résultat :** Si `save.saveVersion < CURRENT_SAVE_VERSION`, les migrations sont appliquées
séquentiellement.

**Fichiers :** `storage/saveMigrations.ts` → `CURRENT_SAVE_VERSION = 3`, `migrateSave()`

**Test :**
```
[ ] Save v1 chargée : migrations v1→v2→v3 appliquées sans erreur
[ ] Save v3 chargée : aucune migration, fast-path utilisé
```

---

### R-SAVE-002 — Migration additive uniquement
**Description :** Une migration ne supprime jamais de champ. Elle ajoute uniquement les
champs manquants avec des valeurs par défaut.

**Condition :** Tout ajout de champ dans `StrategyGameState`.

**Résultat :** Utilisation de `?? defaultValue` pour chaque nouveau champ. Aucune
donnée existante n'est écrasée.

**Fichiers :** `storage/saveMigrations.ts`

**Test :**
```
[ ] Save avec champ existant non standard : valeur conservée après migration
[ ] Save sans le nouveau champ : valeur par défaut appliquée
```

---

### R-SAVE-003 — Jamais de crash pendant la migration
**Description :** Quel que soit l'état de la save (corrompue, version inconnue, null),
`migrateSave()` retourne toujours quelque chose d'utilisable.

**Condition :** Save corrompue ou format inconnu.

**Résultat :** `usedFallback = true` + retour de `createFallbackState()` (état par défaut
complet). Le jeu reste jouable.

**Fichiers :** `storage/saveMigrations.ts` → `migrateSave()`, `createFallbackState()`

**Test :**
```
[ ] AsyncStorage corrompu (JSON invalide) : jeu démarre avec un état par défaut
[ ] Save version inconnue (future) : fallback appliqué, warnings loggés
```

---

### R-SAVE-004 — Fast-path validateur
**Description :** Si la save est à la version courante ET passe `isValidStrategyGameState()`,
les migrations sont ignorées pour la performance.

**Condition :** `isSaveCurrent(parsed) && isValidStrategyGameState(parsed)`

**Résultat :** Save utilisée directement sans migration.

**Fichiers :** `storage/strategyStorage.ts` ; `utils/validators.ts` →
`isValidStrategyGameState()`

**Test :**
```
[ ] Save v3 valide : fast-path (aucun warning de migration dans les logs)
[ ] Save v3 avec champ manquant : fast-path refusé, migration appliquée
```

---

### R-SAVE-005 — 6 emplacements de sauvegarde
**Description :** Le joueur dispose de 6 emplacements de sauvegarde (slots 1–6).
Les emplacements 4–6 nécessitent un achat in-app.

**Condition :** Accès aux slots 4, 5 ou 6.

**Résultat :** `saveSlots.ts` gère les 6 emplacements indépendamment. Chaque slot est
une clé AsyncStorage distincte (`save_slot_1` … `save_slot_6`).

**Fichiers :** `storage/saveSlots.ts` → `saveToSlot()`, `loadFromSlot()`, `deleteSlot()`

**Test :**
```
[ ] Sauvegarder en slot 1 et slot 2 : indépendants, aucune interférence
[ ] Supprimer slot 3 : slots 1, 2 inchangés
[ ] 6 slots utilisables simultanément
```

---

### R-SAVE-006 — Upload cloud après chaque sauvegarde locale
**Description :** Après chaque sauvegarde locale, un upload cloud est déclenché en
fire-and-forget (le jeu n'attend pas la réponse).

**Condition :** `saveStrategy()` appelé ET `auth.accessToken` disponible.

**Résultat :** `SyncService.scheduleUpload()` appelé de façon asynchrone. Aucun blocage
du gameplay.

**Fichiers :** `storage/strategyStorage.ts` → `saveStrategy()` ; `services/SyncService.ts`
→ `scheduleUpload()`

**Test :**
```
[ ] Sauvegarde avec réseau : upload déclenché en arrière-plan
[ ] Sauvegarde sans auth : upload silencieusement ignoré
[ ] Sauvegarde sans réseau : upload échoue silencieusement, save locale conservée
```

---

## Annexe — Règles de sécurité transversales

Ces règles s'appliquent à toutes les catégories.

| ID | Règle | Fichiers |
|---|---|---|
| R-SEC-001 | Les tokens JWT ne sont jamais persistés dans AsyncStorage | `services/SyncService.ts`, `services/OfflineQueue.ts`, `services/RankedService.ts` |
| R-SEC-002 | Le score classé est calculé et validé **uniquement** côté serveur | `services/RankedService.ts`, `logic/rankedScoreFormula.ts` |
| R-SEC-003 | Toute réponse réseau passe par `filterValid()` avant usage | `utils/validators.ts` |
| R-SEC-004 | Toute erreur réseau retourne `[]` ou `null`, jamais de `throw` | Tous les fichiers `services/` |
| R-SEC-005 | `FEATURES.*` à `false` = aucun appel réseau, `FeatureUnavailable` affiché | `config/features.ts`, écrans concernés |
| R-SEC-006 | `deductCost()` ne peut jamais rendre une ressource négative | `logic/buildingEngine.ts` |
