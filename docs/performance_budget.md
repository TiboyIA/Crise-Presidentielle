# Budget de performance — État de Crise

Référence légère pour éviter que les écrans deviennent trop lourds. Pas une règle
absolue, mais une limite à ne pas dépasser sans justification.

---

## Limites par écran

| Écran | Composant de liste | Budget rendu cible | Seuil de virtualisation |
|---|---|---|---|
| `dashboard` | `ScrollView` (contenu fixe) | < 16 ms | — (pas de liste longue) |
| `journal-crise` | `ScrollView` → migrer vers `FlatList` | < 16 ms | > 50 entrées news |
| `ranking` (local) | `ScrollView` (bots + titres) | < 16 ms | > 30 rangées |
| `ranking-global` | `FlatList` ✓ | < 16 ms | pagination 50 déjà en place |
| `buildings` | `ScrollView` (11 items fixes) | < 16 ms | — |
| `operations` | `ScrollView` (< 10 ops) | < 16 ms | — |
| `strategy-research` | `FlatList` ✓ | < 16 ms | — |

---

## 5 risques actuels identifiés

### Risque 1 — `dashboard.tsx` : `NavCard` et `SectionHeading` non memoïsés ⚠️ CORRIGÉ

**Problème :** `NavCard` (×4) et `SectionHeading` (×5) sont des composants non wrappés
dans `React.memo`. Le dashboard reçoit des mises à jour fréquentes (`state.gauges` tick
toutes les quelques secondes en mode temps réel). Ces 9 composants re-rendent inutilement
à chaque tick même si leurs props n'ont pas changé.

**Correction appliquée :** `React.memo(NavCard)` et `React.memo(SectionHeading)`.

**Impact :** Évite ~9 re-renders inutiles par tick. Gain visible sur appareils mid-range.

---

### Risque 2 — `journal-crise.tsx` : `filteredLog` et `pendingInteractive` sans `useMemo` ⚠️ CORRIGÉ

**Problème :** À chaque render (y compris ouverture/fermeture du modal interactif),
`[...news.log].reverse()` + `.filter()` recrée des tableaux inutilement. Avec 100+
dépêches en fin de mandat, ce coût devient mesurable.

```typescript
// AVANT — recalculé à chaque render
const filteredLog = filter === "all"
  ? [...news.log].reverse()
  : [...news.log].filter((e) => e.type === filter).reverse();
```

**Correction appliquée :** `useMemo` avec deps `[state, filter]`.

---

### Risque 3 — `journal-crise.tsx` : `ScrollView` sans virtualisation

**Problème :** Tous les `NewsCard` sont rendus en une seule passe même si hors
écran. En fin de mandat (~150+ entrées), le thread JS peut bloquer pendant le rendu.

**Correction suggérée (non implémentée) :**
```typescript
// Remplacer le ScrollView du log par :
<FlatList
  data={filteredLog}
  keyExtractor={(item, i) => `${item.eventId}_${item.timestamp}_${i}`}
  renderItem={({ item }) => <NewsCard entry={item} />}
  contentContainerStyle={[styles.log, { ... }]}
  showsVerticalScrollIndicator={false}
/>
```
À faire quand `news.log` dépasse régulièrement 50 entrées.

---

### Risque 4 — `ranking.tsx` : agrégations et liste bots dans `ScrollView`

**Problème :** `state.ranking.map()` dans un `ScrollView` (pas de virtualisation).
Si le tableau de classement dépasse 30 bots, le rendu initial est bloquant.

**Correction suggérée (non implémentée) :** Migrer vers `FlatList` si `state.ranking.length > 30`.

```typescript
<FlatList
  data={state.ranking}
  keyExtractor={(item) => item.id}
  renderItem={({ item, index }) => (
    <RankingRow entry={item} rank={index + 1} isPlayer={item.id === "player"} />
  )}
/>
```

---

### Risque 5 — `dashboard.tsx` : agrégations inline non memoïsées

**Problème :** Ces dérivations tournent après le `if (!state.president) return null`
conditionnel — leur position empêche l'usage de `useMemo` sans restructuration.

```typescript
// Recalculées à chaque render (fréquent sur le dashboard) :
const pendingPromises  = state.promises.filter((p) => p.status === "pending").length;
const fulfilledPromises = state.promises.filter((p) => p.status === "fulfilled").length;
const brokenPromises   = state.promises.filter((p) => p.status === "broken").length;
const avgRegionalTension = state.regions.reduce(...) / ...;
const avgMinisterLoyalty = state.ministers.reduce(...) / ...;
const lastHeadlineEntry  = state.log.find((e) => e.aiHeadline);
```

**Correction suggérée (non implémentée) :** Extraire le corps du dashboard dans un
composant enfant `<DashboardContent state={state} ... />` qui reçoit `state` en prop
stable — les memos seraient alors légaux en tête du composant enfant. Trop invasif
pour l'instant ; à envisager si le dashboard dépasse 60 fps de render budget.

---

## Règles générales

| Règle | Quand l'appliquer |
|---|---|
| `React.memo` | Composants enfants aux props stables, re-rendus par un parent fréquemment mis à jour |
| `useMemo` | Dérivations coûteuses (filter, reduce, find sur tableaux > 20 items) |
| `useCallback` | Fonctions passées en prop à un enfant memoïsé |
| `FlatList` | Liste > 30 items dynamiques, ou liste scrollable avec items lourds |
| Image | Toujours `width`/`height` explicites + `resizeMode`. Préférer assets bundlés à des URI distantes pour les assets statiques. |
| Pas d'allocation dans le render | Déplacer `[]`, `{}`, fonctions flèches hors du JSX ou dans `useMemo`/`useCallback` |

---

## Ce qui ne doit PAS être optimisé prématurément

- Les écrans avec < 20 items et props stables (buildings, operations)
- Les animations CSS/Reanimated déjà optimisées par le thread natif
- Les `ScrollView` dont le contenu ne dépassera pas 30 éléments (ex. ranking-pvp local)
- Les derives simples sur des objets < 5 champs (calculs de score, formatage de date)
