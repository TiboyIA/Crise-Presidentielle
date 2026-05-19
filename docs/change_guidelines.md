# Guide des modifications — MODE DELTA

Règles opérationnelles pour modifier le jeu sans casser l'existant.
Complémente `architecture.md` qui décrit le QUOI ; ce fichier décrit le COMMENT.

---

## Principe MODE DELTA

Chaque modification est **isolée, réversible et ne casse pas les systèmes existants**.

> Une feature flag à `false` doit rendre le jeu identique à avant l'ajout.
> Une migration à `v(n+1)` doit laisser les saves `v(n)` lisibles.
> Un nouveau service ne doit pas bloquer le gameplay si le réseau est absent.

---

## Ce qu'il ne faut JAMAIS faire

| Action interdite | Pourquoi | Alternative |
|---|---|---|
| Supprimer un champ de `StrategyGameState` | Crashe les saves existantes | Marquer `deprecated` + garder pour 2 versions |
| Modifier une valeur de migration existante | Corrompt les saves déjà migrées | Ajouter une nouvelle migration v(n+1) |
| Faire confiance aux données du client pour un score classé | Triche triviale | Valider côté serveur (Edge Function) |
| Ajouter un `require()` dynamique dans `core/` | Casse Metro + tests Node | Import statique en tête de fichier |
| Importer React Native dans `core/` ou `utils/` | Casse les golden tests | Garder ces dossiers purs Node |
| Persister un JWT dans AsyncStorage | Fuite de session | Stocker uniquement en mémoire (`setAccessToken`) |
| Envoyer des données en boucle infinie sur erreur réseau | Spam serveur | Backoff + limite dans `OfflineQueue` |
| Ajouter un hook après un `return` conditionnel | Viole les règles React | Déplacer le hook avant le return, avec garde null |

---

## Avant de commencer un MODE DELTA

**1. Lire les fichiers concernés**
Ne pas supposer la structure — lire les types et le contexte existant.

**2. Identifier les impacts**
- Est-ce que `StrategyGameState` change ? → migration obligatoire
- Est-ce que `StrategyContext` change ? → vérifier que les actions existantes restent valides
- Est-ce que des données réseau sont impliquées ? → ajouter un validateur dans `validators.ts`
- Est-ce que la feature peut être indisponible (réseau, flag) ? → prévoir le fallback

**3. Vérifier les dépendances circulaires potentielles**
- `services/` peut importer `utils/` mais pas `context/`
- `utils/` n'importe pas de services
- `core/` n'importe rien de React Native

---

## Ajouter un nouveau champ à `StrategyGameState`

```typescript
// 1. Dans types/strategy.ts :
export interface StrategyGameState {
  // ... champs existants
  monNouveauChamp?: MonType;  // optional = rétrocompatible
}

// 2. Dans storage/saveMigrations.ts :
export const CURRENT_SAVE_VERSION = 4; // bumper

// Ajouter dans migrate_v3_to_v4() :
function migrate_v3_to_v4(state: Partial<StrategyGameState>): Partial<StrategyGameState> {
  return {
    ...state,
    monNouveauChamp: state.monNouveauChamp ?? valeurParDefaut,
  };
}

// 3. Dans isValidStrategyGameState() de utils/validators.ts :
// Si le champ est critique (requis pour le fast-path), l'ajouter au garde minimal.
// Si optionnel, ne rien changer — la migration le gérera.
```

---

## Ajouter un nouveau service réseau

```typescript
// services/MonService.ts

// 1. Définir les types retournés
export interface MonType { id: string; ... }

// 2. Valider toutes les réponses réseau
import { filterValid, validateMonType } from "@/utils/validators";
// → Ajouter validateMonType dans utils/validators.ts

// 3. Retourner [] ou null sur erreur — jamais de throw
export async function fetchMonData(token: string): Promise<MonType[]> {
  try {
    const res = await fetch(...);
    if (!res.ok) return [];
    const data = await res.json() as { items?: unknown[] };
    return filterValid(data.items ?? [], validateMonType);
  } catch {
    return [];
  }
}

// 4. Si l'action doit survivre à une perte réseau → OfflineQueue
// Ajouter un cas dans executeItem() de services/OfflineQueue.ts
// Exporter un helper typé : enqueueMonAction(params, token)
```

---

## Ajouter une feature désactivable

```typescript
// 1. Dans config/features.ts :
export const FEATURES = {
  // ... flags existants
  enableMaFeature: true,  // false = désactivé proprement
} as const;

// 2. Dans l'écran — APRÈS tous les hooks :
if (!FEATURES.enableMaFeature) return <FeatureUnavailable onBack={() => router.back()} />;

// 3. Dans les services concernés (si la feature appelle un endpoint) :
export async function monAction(): Promise<...> {
  if (!FEATURES.enableMaFeature) return { ok: false, error: "disabled" };
  // ...
}
```

---

## Ajouter un test golden

Les tests golden vérifient que les moteurs `core/` ne régressent pas.

```typescript
// tests/golden/monMoteur.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { maFonction } from "@/core/monMoteur";
import { makeMinimalState } from "./fixtures";

test("maFonction — cas nominal", () => {
  const state = makeMinimalState();
  const result = maFonction(state, { ... });
  assert.equal(result.valeur, 42); // valeur dorée
});
```

Ajouter l'import dans `tests/run.ts` :
```typescript
import "./golden/monMoteur.test";
```

---

## Ajouter un validateur runtime

```typescript
// utils/validators.ts

export function validateMonType(raw: unknown): MonType | null {
  if (!isObj(raw)) { devWarn("MonType", "not an object"); return null; }
  if (!isNonEmptyStr(raw.id)) { devWarn("MonType", "id invalid"); return null; }
  // ... autres champs obligatoires
  return {
    id: raw.id,
    champ_optionnel: isStr(raw.champ_optionnel) ? raw.champ_optionnel : undefined,
  };
}
```

Règles :
- Retourner `null` sur invalide, jamais de `throw`
- `devWarn()` logge en DEV uniquement (silencieux en prod)
- Les champs optionnels ont un fallback (`?? valeurDefaut` ou `undefined`)
- Les champs obligatoires font échouer le validateur (`return null`)

---

## Checklist avant de marquer un MODE DELTA terminé

```
[ ] TypeScript propre : npx tsc --noEmit (zéro erreur hors supabase/functions/)
[ ] Golden tests verts : npm run test:golden
[ ] Feature flag testé à false : le jeu reste jouable
[ ] Sauvegarde existante testée : une save v(n-1) charge sans erreur
[ ] Données réseau invalides : un JSON malformé ne crashe pas l'écran
[ ] Pas de double-clic possible sur les nouvelles actions (useCommand si nécessaire)
[ ] Nouveau champ dans StrategyGameState : migration + CURRENT_SAVE_VERSION bumpé
[ ] Nouveau endpoint réseau : données validées via validators.ts avant usage
```

---

## Structure d'un MODE DELTA (rappel)

```
MODE DELTA — NOM DU DELTA

Le jeu existe déjà.
Ne [liste de ce qu'on ne touche pas].

Objectif : [une phrase]

À faire :
  1. ...
  2. ...

À ne pas faire :
  - ...

Livrable : [fichiers créés ou modifiés]
```

L'objectif est toujours **un seul périmètre**, jamais une refonte globale.
Un delta trop large est découpé en plusieurs petits deltas séquentiels.
