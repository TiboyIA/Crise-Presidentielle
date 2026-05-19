# Dictionnaire métier — État de Crise

> Source de vérité pour le vocabulaire du jeu. Utiliser ces termes de façon cohérente
> dans le code (noms de variables, commentaires, UI strings, logs).
>
> Complémente `functional_map.md` (rôle de chaque module) et
> `change_guidelines.md` (règles de modification).

---

## Index

| Terme | Catégorie |
|---|---|
| [Actualité interactive](#actualité-interactive) | Mode Stratégie |
| [Alliance](#alliance) | Multijoueur |
| [Argent](#argent-money) | Ressource |
| [Bâtiment](#bâtiment) | Mode Stratégie |
| [Classement mondial](#classement-mondial) | Multijoueur |
| [Conséquence différée](#conséquence-différée) | Mécanique |
| [Crise](#crise) | Mode Crise Classique |
| [Cyberdéfense](#cyberdéfense-cyberdefense) | Ressource |
| [Cyberattaque](#cyberattaque-async) | Multijoueur |
| [Énergie](#énergie-energy) | Ressource |
| [Espionnage](#espionnage-async) | Multijoueur |
| [Influence](#influence) | Ressource |
| [Indicateurs nationaux](#indicateurs-nationaux) | Mode Stratégie |
| [Mission](#mission) | Mode Stratégie |
| [Mode classé](#mode-classé) | Multijoueur |
| [Opération](#opération) | Mode Stratégie |
| [Opinion publique](#opinion-publique) | Mode Crise Classique |
| [Points de classement](#points-de-classement) | Mode Stratégie |
| [Politique cachée](#politique-cachée-hiddenPolitics) | Mode Stratégie |
| [Puissance globale](#puissance-globale) | Mode Stratégie |
| [Puissance militaire](#puissance-militaire) | Mode Stratégie |
| [Renseignement](#renseignement-intelligence) | Ressource |
| [Recherche](#recherche) | Mode Stratégie |
| [Ressource](#ressource) | Mode Stratégie |
| [Saison](#saison) | Multijoueur |
| [Stabilité nationale](#stabilité-nationale) | Mode Stratégie |
| [Technologie](#technologie-technology) | Ressource |
| [Tension nationale](#tension-nationale) | Mode Stratégie |
| [Unité militaire](#unité-militaire) | Mode Stratégie |

---

## Ressources

---

### Ressource

**Définition courte :** L'une des 7 grandeurs numériques accumulées en continu par les
bâtiments du mode Stratégie.

**Rôle dans le jeu :** Monnaie d'échange pour upgrader les bâtiments, lancer des opérations,
entraîner des unités et débloquer des recherches. Chaque ressource a un usage privilégié.

**Fichiers concernés :**
- `types/strategy.ts` → `StrategyResources`, `ResourceKey`, `RESOURCE_LABELS`, `RESOURCE_ICONS`
- `logic/resources.ts` → `INITIAL_RESOURCES`
- `logic/buildingEngine.ts` → `accumulateResources()`, `canAfford()`, `deductCost()`

**Confusion à éviter :**
- Ne pas confondre les **ressources** (mode Stratégie) avec les **jauges** (mode Crise Classique).
  Les jauges sont des pourcentages politiques (popularité, économie…) — pas des ressources
  accumulables.
- `ResourceKey` est le nom de clé TypeScript (`"money"`, `"influence"`…) — distinct du
  label affiché au joueur (`"Argent"`, `"Influence"`…).

---

### Argent (`money`)

**Définition courte :** Ressource financière de base. La plus abondante, la moins stratégique.

**Rôle dans le jeu :** Couvre les coûts de la plupart des opérations et upgrades de premier
niveau. Son accumulation est rapide, mais sa contribution à la puissance globale est faible
(poids `0.01` dans `calculateGlobalPower()`).

**Fichiers concernés :** `types/strategy.ts` → clé `"money"`, `RESOURCE_LABELS.money = "Argent"`

**Confusion à éviter :**
- L'argent n'est **pas** le budget public (`publicBudget`) qui est un indicateur national
  du mode classique, mesurant la santé budgétaire de l'État (-150 à +100).

---

### Influence

**Définition courte :** Ressource diplomatique et médiatique.

**Rôle dans le jeu :** Utilisée pour les opérations diplomatiques (traités, campagnes
d'influence, aide diplomatique) et certains upgrades de la Diplomacy Ministry. Poids
significatif dans `calculateGlobalPower()` (`0.30`). Le profil de faiblesses du joueur
signale une `influence < 200` comme vulnérabilité diplomatique.

**Fichiers concernés :** `types/strategy.ts` → clé `"influence"`, `logic/newsEngine.ts`
(seuil de faiblesse)

**Confusion à éviter :**
- L'influence n'est **pas** la popularité. La popularité est une jauge du mode Crise
  Classique (0-100%). L'influence est une ressource accumulable du mode Stratégie (0+).

---

### Énergie (`energy`)

**Définition courte :** Ressource industrielle et infrastructurelle.

**Rôle dans le jeu :** Requise pour les upgrades liés à l'industrie et à l'Energy Ministry.
Poids modéré (`0.15`). Le profil de faiblesses signale `energy < 100` comme point faible.

**Fichiers concernés :** `types/strategy.ts` → clé `"energy"`, `logic/newsEngine.ts`

**Confusion à éviter :**
- L'énergie n'est **pas** une ressource électrique au sens littéral — c'est une abstraction
  de la capacité industrielle et logistique de l'État.

---

### Renseignement (`intelligence`)

**Définition courte :** Ressource de collecte d'information et d'opérations secrètes.

**Rôle dans le jeu :** Utilisée pour les opérations d'espionnage local (`espionage`,
`steal_intel`) contre des pays IA. Produite par l'Intelligence Ministry. Poids `0.20`
dans la puissance globale.

**Fichiers concernés :** `types/strategy.ts` → clé `"intelligence"`, `logic/operationEngine.ts`

**Confusion à éviter :**
- Le **renseignement** (ressource) est distinct des **opérations d'espionnage async**
  (`SpyService`) qui s'appliquent à de vrais joueurs et ne consomment pas cette ressource
  directement — elles sont gérées côté serveur.

---

### Technologie (`technology`)

**Définition courte :** Ressource de modernisation et d'innovation de l'État.

**Rôle dans le jeu :** Requise pour les recherches stratégiques avancées et les upgrades
du Research Center. Poids élevé (`0.35`) dans la puissance globale. Produite notamment
par le Research Center.

**Fichiers concernés :** `types/strategy.ts` → clé `"technology"`, `data/strategyResearch.ts`

**Confusion à éviter :**
- La **technologie** (ressource) n'est **pas** la même que l'**arbre de recherche**
  (`StrategyResearch`). La technologie est le carburant ; la recherche est ce qu'on achète
  avec ce carburant.

---

### Cyberdéfense (`cyberDefense`)

**Définition courte :** Ressource de protection des infrastructures numériques.

**Rôle dans le jeu :** Diminuée par les cyberattaques reçues de vrais joueurs. Produite par
le Cyber Ministry. Poids fort (`0.40`) dans la puissance globale. Le profil de faiblesses
signale `cyberDefense < 50` comme vulnérabilité critique — ce seuil déclenche un biais
vers des événements cybernétiques dans le Journal de Crise.

**Fichiers concernés :** `types/strategy.ts` → clé `"cyberDefense"`, `logic/newsEngine.ts`,
`services/CyberService.ts`

**Confusion à éviter :**
- **Cyberdéfense** (ressource, accumulable) ≠ **Cyberattaque** (opération async multijoueur).
  La cyberdéfense protège passivement ; une cyberattaque est une action offensive explicite.

---

## Mode Stratégie

---

### Puissance globale

**Définition courte :** Score composite unique représentant la force totale du joueur.
Calculé à partir des niveaux de bâtiments et des ressources accumulées.

**Rôle dans le jeu :** Sert de base au classement local (tri des bots), à l'expérience
du Président (`calculatePresidentXP`) et au bonus de puissance dans le score classé.
Affiché dans le classement et sur le dashboard.

**Formule :**
```
puissance = Σ (poids_bâtiment × niveau × 1.5)   [par bâtiment construit]
           + Σ (ressource × poids_ressource)
```
Poids bâtiments (extrait) : `military_hq` = 25, `central_bank` = 22, `presidential_palace` = 20.
Poids ressources : `military` = 0.50, `cyberDefense` = 0.40, `technology` = 0.35.

**Fichiers concernés :** `logic/powerEngine.ts` → `calculateGlobalPower()`

**Confusion à éviter :**
- La puissance globale est calculée **côté client** et utilisée pour l'affichage local.
  Le **score classé** est calculé **côté serveur** (`/ranked-submit`) — ne jamais les
  confondre ni utiliser `calculateGlobalPower()` comme score de soumission.

---

### Bâtiment

**Définition courte :** L'un des 11 ministères/institutions upgradables du mode Stratégie.
Chaque bâtiment produit des ressources en continu et peut débloquer des opérations.

**Rôle dans le jeu :** Colonne vertébrale de la progression — les bâtiments produisent les
ressources qui financent tout le reste. Les upgrades coûtent des ressources et prennent du
temps réel.

**11 bâtiments :**
`presidential_palace`, `economy_ministry`, `defense_ministry`, `intelligence_ministry`,
`cyber_ministry`, `energy_ministry`, `diplomacy_ministry`, `research_center`,
`central_bank`, `media_agency`, `military_hq`

**Fichiers concernés :** `data/buildings.ts` → `BUILDINGS`, `INITIAL_BUILDINGS` ;
`logic/buildingEngine.ts` ; `types/strategy.ts` → `BuildingDef`, `PlayerBuilding`

**Confusion à éviter :**
- Les **bâtiments** du mode Stratégie sont distincts des **ministres** du mode Crise
  Classique. Un bâtiment est une infrastructure (niveau 1–10) ; un ministre est un
  personnage avec fidélité et compétence.
- `level = 0` signifie **non construit** (pas de production). `level = 1` est le premier
  niveau actif.

---

### Recherche

**Définition courte :** Arbre de déblocage permanent — chaque branche de recherche confère
un bonus définitif (production, opérations, unités).

**Rôle dans le jeu :** Différenciation à long terme des joueurs. Une fois une recherche
débloquée, son bonus est permanent dans la sauvegarde.

**Fichiers concernés :** `data/strategyResearch.ts` → `STRATEGY_RESEARCH` ;
`types/strategyResearch.ts` → `StrategyResearchId`, `StrategyResearchState` ;
`context/StrategyContext.tsx` → action `unlockResearch()`

**Confusion à éviter :**
- La **recherche stratégique** (`strategy-research.tsx`) est distincte de la **technologie**
  (ressource). La technologie est le carburant ; la recherche est l'investissement permanent.
- Ne pas confondre avec le **tech tree** du mode Crise Classique (`data/techTree.ts`), qui
  est un système séparé.

---

### Unité militaire

**Définition courte :** Soldat ou équipement appartenant à l'une des 4 branches armées
(Terre, Air, Mer, Soutien). Entraîné contre des ressources et du temps réel.

**Rôle dans le jeu :** Booste la puissance militaire (`calculateMilitaryPower()`), améliore
les résultats des opérations offensives via `getOperationUnitBonus()`, et génère un coût
d'entretien quotidien (`calculateDailyUpkeep()`).

**Fichiers concernés :** `data/units.ts` → `UNITS`, `UNIT_LIST` ;
`types/units.ts` → `PlayerUnit`, `TrainingQueueEntry`, `UnitId` ;
`logic/militaryEngine.ts` ; `app/forces-armees.tsx`

**Confusion à éviter :**
- Les **unités** n'ont pas de position sur une carte — ce n'est pas un jeu de plateau.
  Elles améliorent des scores (puissance militaire, bonus d'opérations) de façon abstraite.
- La **file d'entraînement** (`trainingQueue`) contient les unités en cours de création —
  distincte des unités déjà disponibles (`playerUnits`).

---

### Opération

**Définition courte :** Action diplomatique ou militaire lancée contre un pays IA parmi les
20 disponibles. Résolution **locale et immédiate** (pas de serveur).

**Rôle dans le jeu :** Principal vecteur de gain de points de classement, de ressources et
d'XP. Modifie le score de relation avec le pays cible. Soumise à un cooldown par pays et par type.

**10 types :** `espionage`, `steal_intel`, `cyber_attack`, `influence_campaign`, `sabotage`,
`sanction`, `sign_treaty`, `diplomatic_aid`, `reinforce_cyber`, `military_operation`

**Fichiers concernés :** `logic/operationEngine.ts` → `OPERATIONS`, `canLaunchOperation()`,
`resolveOperation()` ; `types/strategy.ts` → `OperationType`, `OperationDef`, `OperationResult` ;
`app/operations.tsx`

**Confusion à éviter :**
- **Opération** (ce terme) = action contre un **pays IA**, résolue localement, instantanément.
- **Espionnage async** (`SpyService`) et **Cyberattaque async** (`CyberService`) = actions
  contre de **vrais joueurs**, résolues par le serveur avec un délai. Ce sont des modules
  distincts malgré des noms similaires.

---

### Mission

**Définition courte :** Objectif journalier généré aléatoirement depuis un pool de définitions.
3 missions actives en simultané, rotation toutes les 24 heures.

**Rôle dans le jeu :** Source secondaire de ressources et de progression. Les missions
renforcent naturellement les bons comportements (upgrader, lancer des opérations,
accumuler des ressources).

**7 types de mission :** `upgrade_building`, `launch_operation`, `collect_resources`,
`reach_power`, `spy_country`, `win_operation`, `reinforce_defense`

**Fichiers concernés :** `logic/missionEngine.ts` → `generateDailyMissions()`,
`checkMissionProgress()` ; `data/missions.ts` ; `types/strategy.ts` → `MissionDef`,
`PlayerMission` ; `app/missions.tsx`

**Confusion à éviter :**
- Une **mission** n'est pas un **événement** ni une **actualité**. Les missions sont des
  objectifs proactifs (faire X pour gagner Y) ; les actualités arrivent au joueur sans qu'il
  les déclenche.

---

### Indicateurs nationaux

**Définition courte :** 6 métriques de l'état de la nation en mode Stratégie, visibles
au joueur et inclus dans le score classé.

**Indicateurs :** `popularity` (0-100), `economy` (0-100), `security` (0-100),
`ecology` (0-100), `cohesion` (0-100), `publicBudget` (-150 à +100)

**Rôle dans le jeu :** Composante `base_indicators` du score classé (poids rééquilibrés
vs le seul `popularity` de l'ancien système). Influencés par les choix d'actualités
interactives et les opérations.

**Fichiers concernés :** `types/strategy.ts` → `NationalIndicators` ;
`logic/rankedScoreFormula.ts` → `ScoringIndicators`

**Confusion à éviter :**
- Les **indicateurs nationaux** du mode Stratégie (`NationalIndicators`) sont distincts des
  **jauges** du mode Crise Classique (`Gauges` dans `GameContext`). Les deux systèmes ont
  une `popularity` et une `economy`, mais ce sont des valeurs indépendantes, dans des contextes
  séparés.

---

### Politique cachée (`hiddenPolitics`)

**Définition courte :** 6 variables invisibles au joueur qui modulent la difficulté et
les événements en arrière-plan.

**Variables :** `eliteTrust`, `scandalRisk`, `mediaMood`, `popularFatigue`,
`regionalTension`, `institutionalStability` (toutes 0-100)

**Rôle dans le jeu :** Alimentent la **tension nationale** (composite). `scandalRisk` peut
déclencher des scandales. `popularFatigue` rend le joueur plus vulnérable à certaines crises.
Le joueur ne les voit pas directement — il ressent leurs effets via les actualités et les
indicateurs.

**Fichiers concernés :** `types/strategy.ts` → `HiddenPolitics` ;
`core/computeState.ts` → `applyHiddenPoliticsEffects()`

**Confusion à éviter :**
- La politique cachée n'est **pas** le même concept que l'opposition politique (mode Crise
  Classique). L'opposition est un acteur visible avec des slogans ; la politique cachée sont
  des indicateurs systémiques invisibles.

---

### Tension nationale

**Définition courte :** Indice composite (0-100) agrégeant 7 signaux de l'état politique
et social. Calculé en temps réel, non persisté.

**4 niveaux :**
- `stable` (< 30) — situation maîtrisée
- `pression` (30-59) — pression politique perceptible
- `risque` (60-79) — risque de crise imminent
- `explosive` (≥ 80) — situation hors de contrôle

**Formule (simplifiée) :**
```
tension = dette/500×25 + fatigue×0.20 + (1-cohésion)×0.15
        + (1-sécurité)×0.10 + scandalRisk×0.15
        + opposition×0.10 + (1-stabilité)×0.15
        → normalisé sur 100
```

**Rôle dans le jeu :** Contexte affiché dans le modal d'actualité interactive. Non exposé
directement comme indicateur principal, mais influence la sélection des événements via
`newsEngine`.

**Fichiers concernés :** `logic/tensionEngine.ts` → `computeNationalTension()`,
`getTensionLevel()`, `getTensionLabel()`, `getTensionColor()`

**Confusion à éviter :**
- La tension nationale est un **indice calculé** (non persisté, recalculé à la volée) —
  distinct des **indicateurs nationaux** qui sont persistés dans `state.nationalIndicators`.
- `regionalTension` dans `HiddenPolitics` est **l'une des composantes** de la tension
  nationale, pas la tension nationale elle-même.

---

### Stabilité nationale

**Définition courte :** Composante de `HiddenPolitics` — mesure la solidité de
l'appareil d'État (0-100). Distincte de la tension nationale globale.

**Rôle dans le jeu :** Un `institutionalStability` bas augmente la tension nationale et
rend le joueur plus vulnérable aux actualités de type `national`. Peut être amélioré par
certains choix d'actualités interactives.

**Fichiers concernés :** `types/strategy.ts` → `HiddenPolitics.institutionalStability` ;
`logic/tensionEngine.ts` (composante du calcul)

**Confusion à éviter :**
- **Stabilité nationale** (`institutionalStability`) ≠ **tension nationale**. La stabilité
  est une *entrée* du calcul ; la tension est la *sortie* composite.

---

### Puissance militaire

**Définition courte :** Score numérique de la force des armées, calculé à partir des unités
entraînées et de leur doctrine.

**Rôle dans le jeu :** Composante de la puissance globale (via `calculateMilitaryPower()`).
Améliore les résultats des opérations offensives (`military_operation`, `sabotage`) via
`getOperationUnitBonus()`.

**Fichiers concernés :** `logic/militaryEngine.ts` → `calculateMilitaryPower()`,
`getOperationUnitBonus()`, `calculateDailyUpkeep()` ; `data/units.ts`, `data/militaryDoctrines.ts`

**Confusion à éviter :**
- La puissance militaire n'est **pas** un champ de `StrategyResources` — c'est un score
  dérivé calculé depuis `state.playerUnits`. La ressource `military` est distincte et
  représente le budget/approvisionnement militaire, pas la puissance des troupes.

---

### Actualité interactive

**Définition courte :** Événement du Journal de Crise qui exige une décision présidentielle
explicite (choix A ou B). Bloque visuellement le joueur jusqu'à résolution.

**Rôle dans le jeu :** Mécanisme de décision à fort impact — chaque choix applique des
effets sur les ressources, les indicateurs nationaux et/ou la politique cachée, et peut
déclencher une conséquence différée.

**Structure technique :**
```typescript
// NewsEvent avec isInteractive = true :
{
  isInteractive: true,
  choices: [
    { id: "A", label: "...", consequence: "...", effects: {...},
      queuesDelayedConsequence?: { ... } },
    { id: "B", ... }
  ]
}
```

**Fichiers concernés :** `types/strategy.ts` → `NewsEvent`, `NewsChoice` ;
`data/newsEvents.ts` → `NEWS_EVENT_MAP` ; `components/InteractiveNewsModal.tsx` ;
`context/StrategyContext.tsx` → action `resolveInteractiveNews()`

**Confusion à éviter :**
- Une **actualité interactive** (mode Stratégie, Journal de Crise) ≠ une **crise**
  (mode Crise Classique, `EventModal`). La crise est le mécanisme central du mode classique ;
  l'actualité interactive est un événement secondaire du mode stratégie avec des enjeux
  plus ciblés.
- Les actualités **non interactives** (`isInteractive = false`) ont des `autoEffects`
  appliqués automatiquement et n'ouvrent aucun modal.

---

### Conséquence différée

**Définition courte :** Effet déclenché N actions après un choix d'actualité interactive.
Invisible au joueur jusqu'à sa manifestation.

**Rôle dans le jeu :** Crée une temporalité dans les conséquences — un mauvais choix ne
se voit pas immédiatement. Peut déclencher un nouvel événement (`news_event`), modifier
des indicateurs (`indicator_effect`) ou altérer la politique cachée (`hidden_politics`).

**Cycle de vie :**
1. Joueur fait un choix avec `queuesDelayedConsequence`
2. `DelayedConsequence` stockée dans `state.pendingConsequences`
3. À chaque action, compteur décrémenté dans `StrategyContext`
4. À 0 : conséquence appliquée

**Fichiers concernés :** `types/strategy.ts` → `DelayedConsequence` ;
`context/StrategyContext.tsx` → décompte et résolution

**Confusion à éviter :**
- Les conséquences différées sont spécifiques au **mode Stratégie** (Journal de Crise).
  Le mode Crise Classique a son propre système de cascades (`logic/cascadeEngine.ts`,
  `scheduleCascadeFromChoice()`) — deux mécanismes différents avec le même concept.

---

## Mode Crise Classique

---

### Crise

**Définition courte :** Événement du mode Crise Classique présentant deux choix au joueur.
Mécanisme central de la campagne principale.

**Rôle dans le jeu :** À chaque tour, un événement est tiré aléatoirement depuis
`data/events.ts`. Le joueur choisit A ou B — les effets modifient les jauges, les ministres,
les régions, et peuvent déclencher des cascades ou des médias négatifs.

**Fichiers concernés :** `data/events.ts` → `CrisisEvent`, `EventChoice`, `EVENTS` ;
`logic/crisisEngine.ts` → `applyChoice()` ; `components/EventModal.tsx` ;
`context/GameContext.tsx`

**Confusion à éviter :**
- Une **crise** (mode Crise Classique, `EventModal`) ≠ une **actualité interactive**
  (mode Stratégie, `InteractiveNewsModal`). Deux systèmes distincts, deux contextes React
  différents, deux ensembles de données séparés.

---

### Opinion publique

**Définition courte :** Jauge de popularité du Président dans le mode Crise Classique.
Valeur entre 0 et 100.

**Rôle dans le jeu :** Composante la plus visible du score électoral. Une popularité basse
augmente le risque de défaite électorale (game over). Fortement impactée par les scandales,
les crises mal gérées et les promesses brisées.

**Fichiers concernés :** `context/GameContext.tsx` → `state.gauges.popularity` ;
`logic/gameEngine.ts` → `INITIAL_GAUGES`, `GAUGE_LABELS` ; `logic/electionEngine.ts`

**Confusion à éviter :**
- L'**opinion publique** / **popularité** du mode Crise Classique (`state.gauges.popularity`)
  ≠ l'indicateur `popularity` des `NationalIndicators` du mode Stratégie. Ce sont deux
  valeurs dans deux contextes React indépendants.

---

## Multijoueur et classement

---

### Mode classé

**Définition courte :** Variante de la campagne principale où chaque action est journalisée
et le score final est calculé et validé côté serveur.

**Rôle dans le jeu :** Seule façon d'apparaître dans le classement mondial. La validation
anti-triche est intégralement côté serveur — le client fournit un journal d'événements,
pas un score.

**Flux :**
```
index.tsx → startRankedRun() → runId + seed attribués par le serveur
  → joueur joue, recordEvent() à chaque action
  → fin de partie → submitRankedRun() avec journal + hash d'intégrité
  → serveur calcule le score, stocke dans le leaderboard
```

**Score (spécification serveur) :**
- `base_indicators` (0-100) — 5 indicateurs finaux pondérés
- `progression_bonus` (0-25) — bâtiments + recherches
- `longevity_bonus` (0-15) — jours de mandat (rendements décroissants)
- `activity_bonus` (0-10) — diversité des décisions (log-scale)
- `power_bonus` (0-10) — puissance / √jours
- × `difficulty_mult` (0.80-1.30) — pays + doctrine choisis
- + `anomaly_penalty` (0 à -50) — incohérences détectées

**Fichiers concernés :** `services/RankedService.ts` ; `logic/rankedScoreFormula.ts`
(spécification client, non utilisée pour la soumission) ; `app/index.tsx`

**Confusion à éviter :**
- Le score classé n'est **jamais calculé côté client**. `rankedScoreFormula.ts` est
  une documentation de spécification — il décrit ce que le serveur fait, mais aucun
  résultat de ce fichier n'est envoyé comme score.
- Ne pas confondre avec le **classement local** (bots simulés) qui est 100% calculé
  en local depuis `calculateGlobalPower()`.

---

### Classement mondial

**Définition courte :** Leaderboard de tous les joueurs authentifiés, ordonné par score
classé. Paginé (50 entrées par page), alimenté par Supabase.

**Rôle dans le jeu :** Compétition asynchrone entre joueurs réels — chacun joue sa propre
partie au moment qui lui convient, et les scores sont agrégés côté serveur.

**Fichiers concernés :** `app/ranking-global.tsx` (écran `FlatList` paginée) ;
`services/RankedService.ts` → `submitRankedRun()` ; `utils/validators.ts` →
`validateLeaderboardEntry()`, `filterValid()`

**Confusion à éviter :**
- **Classement mondial** (`ranking-global.tsx`, Supabase) ≠ **classement local**
  (`ranking.tsx`, bots simulés). Le classement local est entièrement en local et sert
  de feedback pendant la partie ; le classement mondial est la compétition réelle.

---

### Points de classement

**Définition courte :** Monnaie de progression du mode Stratégie — accumulés via les
opérations réussies et les mandats. Distincts du score classé.

**Rôle dans le jeu :** Déterminent la position dans le **classement local** (bots) et
alimentent le `power_bonus` du score classé. Persistés dans `state.stats.rankingPoints`.

**Fichiers concernés :** `types/strategy.ts` → `NationalStats.rankingPoints` ;
`logic/operationEngine.ts` → `OperationResult.rankingPoints`

**Confusion à éviter :**
- Les **points de classement** (local, `rankingPoints`) ≠ le **score classé** (serveur,
  calculé par `/ranked-submit`). Les points sont une ressource interne de progression ;
  le score classé est la note finale d'une run complète.

---

### Saison

**Définition courte :** Période de 30 jours réels pendant laquelle le classement mondial
est actif. À l'expiration, le classement est réinitialisé.

**Rôle dans le jeu :** Donne un cadre temporel à la compétition mondiale — les rangs et
titres (Leader Mondial, Superpuissance…) sont valables pour une saison.

**Fichiers concernés :** `types/strategy.ts` → `NationalStats.season`,
`NationalStats.seasonStartTime` ; `app/ranking.tsx` → `SEASON_DURATION_MS = 30 × 24 × 60 × 60 × 1000`

**Confusion à éviter :**
- La saison concerne uniquement le **classement mondial**. Le classement local (bots) n'a
  pas de notion de saison — il se réinitialise avec chaque nouvelle partie.

---

### Alliance

**Définition courte :** Relation formelle entre deux joueurs authentifiés, créant des bonus
partagés tant que l'alliance est active.

**Rôle dans le jeu :** Source de bonus de ressources passifs via `computeAllianceBonuses()`.
Dure jusqu'à expiration ou rupture. Requiert une invitation et une acceptation explicite.

**États d'une alliance :** `pending` → `active` → `broken` / `rejected`

**Fichiers concernés :** `services/AllianceService.ts` → `fetchAlliances()`,
`respondToAlliance()`, `computeAllianceBonuses()`, `ALLIANCE_BONUS_PER_ACTIVE` ;
`services/OfflineQueue.ts` → `enqueueAllianceInvite()` ; `app/alliances.tsx`

**Confusion à éviter :**
- Une alliance ne confère **pas** d'avantage militaire direct — uniquement des bonus de
  ressources. Ce n'est pas un système d'attaque coordonnée.

---

### Espionnage async

**Définition courte :** Opération lancée contre un **vrai joueur** dont la résolution est
différée et effectuée côté serveur.

**Rôle dans le jeu :** Permet d'obtenir des informations sur l'état d'un adversaire réel
ou d'en affaiblir les ressources. Le résultat arrive après un délai (résolution serveur).

**Fichiers concernés :** `services/SpyService.ts` → `launchSpyOp()`, `fetchSpyOps()` ;
`utils/validators.ts` → `validateSpyOp()` ; `config/features.ts` → `FEATURES.enableSpyOps`

**Confusion à éviter :**
- **Espionnage async** (vs joueur réel, `SpyService`) ≠ **opération `espionage`** (vs
  pays IA, `operationEngine`). Deux systèmes distincts avec des noms proches. L'espionnage
  async ne consomme pas de `intelligence` (ressource) — il passe par le serveur.

---

### Cyberattaque async

**Définition courte :** Attaque numérique lancée contre un **vrai joueur**, résolue côté
serveur. Applique un debuff temporaire sur la production de cyberdéfense de la cible.

**Rôle dans le jeu :** Outil offensif contre les joueurs adverses. Le résultat (`debuff_pct`)
est reçu par la cible lors de son prochain `fetchCyberOps()`.

**Fichiers concernés :** `services/CyberService.ts` → `launchCyberOp()`, `fetchCyberOps()` ;
`utils/validators.ts` → `validateCyberOp()` ; `config/features.ts` → `FEATURES.enableCyberOps`

**Confusion à éviter :**
- **Cyberattaque async** (vs joueur réel, `CyberService`) ≠ **opération `cyber_attack`**
  (vs pays IA, `operationEngine`). Même distinction que pour l'espionnage : serveur vs local.
- La ressource **cyberdéfense** (`cyberDefense`) est ce que la cible possède ; la cyberattaque
  async est l'action offensive qui la réduit chez l'adversaire.

---

## Annexe — Confusions les plus fréquentes

| Terme A | Terme B | Distinction |
|---|---|---|
| Ressources (mode Stratégie) | Jauges (mode Crise Classique) | Accumulables vs 0-100% politiques |
| Actualité interactive | Crise | Journal de Crise (Stratégie) vs EventModal (Classique) |
| Opération (vs IA) | Espionnage / Cyber async (vs joueur) | Local + immédiat vs Serveur + différé |
| Classement local (bots) | Classement mondial (Supabase) | Calculé en local vs calculé serveur |
| Points de classement | Score classé | Monnaie interne vs note de run finale |
| Puissance globale (client) | Score classé (serveur) | Affiché localement vs soumis et validé |
| Indicateurs nationaux (Stratégie) | Jauges (Crise Classique) | `NationalIndicators` vs `Gauges` — deux contextes distincts |
| Stabilité nationale | Tension nationale | Entrée du calcul vs indice composite résultant |
| Bâtiments (Stratégie) | Ministres (Crise Classique) | Infrastructure upgradable vs personnage avec fidélité |
| Cyberdéfense (ressource) | Cyberattaque async (action) | Défense passive accumulée vs action offensive explicite |
| Renseignement (ressource) | Espionnage async (action) | Budget d'opérations locales vs opération contre joueur réel |
| Technologie (ressource) | Recherche stratégique (arbre) | Carburant vs ce qu'on achète avec le carburant |
| Journal de Crise (`journal-crise.tsx`) | Journal classique (`journal.tsx`) | Mode Stratégie vs Mode Crise Classique |
| Conséquence différée (Stratégie) | Cascade (Crise Classique) | `DelayedConsequence` vs `cascadeEngine` — deux systèmes |
