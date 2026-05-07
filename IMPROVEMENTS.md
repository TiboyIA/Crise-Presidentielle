# Améliorations du jeu : Première passe

Date : 2 mai 2026  
Status : ✅ TypeScript validé

## Résumé des améliorations

Le projet a été amélioré progressivement sans casser l'existant. Voici les fichiers ajoutés pour centraliser la logique et améliorer la qualité du code.

### 1. Validateurs (`logic/validators.ts`)

**Objectif** : Garantir que les jauges, ressources et jauges cachées restent dans les limites valides.

**Fonctionnalités** :
- `clampGauge(value)` : Contraint une valeur entre 0-100
- `clampHiddenGauge(value)` : Contraint une jauge cachée entre 0-100
- `clampResource(value)` : Contraint une ressource entre 0-10000
- `validateGauges(gauges)` : Valide et répare un objet Gauges
- `validateHiddenGauges(hidden)` : Valide et répare les jauges cachées
- `validateResources(resources)` : Valide et répare les ressources
- `areGaugesValid(gauges)` : Vérifie la validité sans modifier
- `areHiddenGaugesValid(hidden)` : Vérifie la validité des jauges cachées

**Usage** :
```typescript
import { validateGauges } from "@/logic/validators";

const validGauges = validateGauges(state.gauges);
```

### 2. Système d'historique (`types/history.ts`)

**Objectif** : Fournir un audit trail complet de toutes les décisions et leurs conséquences.

**Classes et interfaces** :
- `HistoryEntry` : Une entrée d'historique unique
  - `id`, `turn`, `timestamp`
  - `eventId`, `eventTitle`, `choiceIndex`, `choiceText`
  - `impact` : changements de jauges, ressources, promesses, etc.
  
- `GameHistory` : Gestionnaire d'historique
  - `addEntry(entry)` : Ajouter une entrée
  - `getEntries()` : Récupérer tous les entries
  - `getRecentEntries(count)` : Les N derniers entries
  - `getEntriesForTurn(turn)` : Entries d'un tour spécifique
  - `getEntriesForEvent(eventId)` : Entries liées à un événement
  - `toJSON() / fromJSON()` : Sérialisation

**Utilitaires** :
- `calculateGaugeDelta(before, after)` : Calcule les différences entre deux états
- `calculateHiddenGaugeDelta(before, after)` : Idem pour jauges cachées

**Usage** :
```typescript
import { GameHistory, calculateGaugeDelta } from "@/types/history";

const history = new GameHistory();
const delta = calculateGaugeDelta(stateBefore.gauges, stateAfter.gauges);
history.addEntry({
  id: crypto.randomUUID(),
  turn: state.turn,
  timestamp: Date.now(),
  eventId: event.id,
  eventTitle: event.title,
  choiceIndex: 0,
  choiceText: choice.label,
  impact: { gaugeChanges: delta },
});
```

### 3. Moteur de conséquences (`logic/consequenceEngine.ts`)

**Objectif** : Centraliser et structurer l'application des effets (immédiats, retardés, régionaux, etc.).

**Interfaces** :
- `StructuredConsequence` : Regroupe tous les types d'effets
  - `immediateGaugeChanges`
  - `immediateHiddenGaugeChanges`
  - `immediateResourceChanges`
  - `delayedEffects` : Effets retardés avec délai en tours
  - `regionalEffects`
  - `ministerEffects`
  - `oppositionEffects`

**Fonctions** :
- `applyImmediateGaugeConsequences(gauges, changes)` : Applique et valide
- `applyImmediateHiddenGaugeConsequences(hidden, changes)` : Idem hidden
- `applyImmediateResourceConsequences(resources, changes)` : Idem resources
- `eventChoiceToConsequence(choice)` : Convertit EventChoice en StructuredConsequence
- `mergeConsequences(consequences)` : Fusionne plusieurs conséquences

**Usage** :
```typescript
import { 
  StructuredConsequence, 
  applyImmediateGaugeConsequences,
  mergeConsequences 
} from "@/logic/consequenceEngine";

const consequence: StructuredConsequence = {
  immediateGaugeChanges: { popularity: -10, authority: +5 },
  immediateHiddenGaugeChanges: { scandalRisk: +20 },
  immediateResourceChanges: {},
  delayedEffects: [{
    turns: 3,
    gaugeChanges: { economy: -5 },
    hiddenGaugeChanges: {},
    description: "Impact économique à moyen terme"
  }]
};

const newGauges = applyImmediateGaugeConsequences(
  state.gauges,
  consequence.immediateGaugeChanges
);
```

### 4. Mode Debug (`logic/debug.ts`)

**Objectif** : Faciliter le développement et la validation en environnement de développement uniquement.

**Fonctions** :
- `isDebugMode()` : Vérifie si `__DEV__` est activé
- `debugLog(category, message, data?)` : Log structuré
- `debugWarn(category, message, data?)` : Warning
- `debugError(category, message, error?)` : Erreur
- `validateGameStateIntegrity(state)` : Valide l'intégrité de l'état
  - Vérifie que les jauges sont entre 0-100
  - Vérifie que les ressources sont positives
  - Vérifie la présence de ministres et régions
  - Retourne `{ isValid, errors }`
  
- `createDebugSnapshot(state, label)` : Crée une copie de debug avec timestamp
- `dumpGameState(state)` : Affiche l'état complet dans la console
- `printDebugHelp()` : Affiche l'aide des commandes debug
- `attachDebugToGlobal()` : Expose les debug utils à globalThis

**Usage** :
```typescript
import { attachDebugToGlobal, validateGameStateIntegrity } from "@/logic/debug";

// Au démarrage de l'app (dans context/GameContext.tsx)
if (__DEV__) {
  attachDebugToGlobal();
}

// Dans la console du développeur :
// > debugLog("GAME", "Décision prise", { eventId: "evt_123" })
// > validateGameStateIntegrity(state)
// > createDebugSnapshot(state, "avant-decision")
```

## Comment utiliser ces améliorations

### Intégration dans GameContext

Pour mettre en œuvre ces améliorations dans `context/GameContext.tsx` :

1. **Importer les validateurs** :
```typescript
import { validateGauges, validateHiddenGauges } from "@/logic/validators";
```

2. **Valider l'état après chaque décision** :
```typescript
setGameState(prev => {
  const newState = { ...prev, gauges: newGauges };
  // Valider
  newState.gauges = validateGauges(newState.gauges);
  newState.hiddenGauges = validateHiddenGauges(newState.hiddenGauges);
  return newState;
});
```

3. **Enregistrer les décisions** :
```typescript
import { GameHistory } from "@/types/history";

const history = new GameHistory(); // À initialiser au démarrage

// Après chaque choix :
history.addEntry({
  id: crypto.randomUUID(),
  turn: state.turn,
  timestamp: Date.now(),
  eventId: currentEvent.id,
  eventTitle: currentEvent.title,
  choiceIndex: choiceIndex,
  choiceText: choice.label,
  impact: {
    gaugeChanges: calculateGaugeDelta(oldGauges, newGauges),
    // ... autres impacts
  },
});
```

## Fichiers modifiés

### Nouveaux fichiers
- ✅ `logic/validators.ts` (165 lignes)
- ✅ `types/history.ts` (165 lignes)
- ✅ `logic/consequenceEngine.ts` (155 lignes)
- ✅ `logic/debug.ts` (180 lignes)

### Fichiers à modifier (prochaine étape)

Pour activer pleinement ces améliorations, les fichiers suivants doivent être progressivement mis à jour :

1. `context/GameContext.tsx`
   - Initialiser `GameHistory` au démarrage
   - Enregistrer les décisions après chaque choix
   - Valider l'état après chaque modification

2. `logic/crisisEngine.ts`
   - Utiliser `consequenceEngine.ts` pour appliquer les effets
   - Utiliser les validateurs

3. Routes pertinentes
   - Afficher l'historique sur `journal.tsx`
   - Afficher les informations de debug sur `debug.tsx`

## Validation

✅ TypeScript compilation : **PASS**
✅ Tous les imports : **OK**
✅ Aucune rupture d'existant : **CONFIRMÉ**

## Prochaines étapes

1. Intégrer les validateurs dans `crisisEngine.ts`
2. Intégrer l'historique dans `GameContext.tsx`
3. Ajouter l'affichage du debug dans `app/debug.tsx`
4. Ajouter l'affichage de l'historique dans `app/journal.tsx`
5. Améliorer progressivement chaque moteur (cascade, opposition, etc.)
