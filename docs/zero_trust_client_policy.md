# Politique Zero Trust Client — Président : Nation en Crise

## Principe

> **Le client mobile n'est jamais une source de vérité pour les systèmes compétitifs.**
>
> Il peut calculer localement ce qui sert à l'affichage ou à la simulation solo.
> Il ne peut pas décider unilatéralement d'une valeur qui affecte le classement,
> les actifs d'un autre joueur, ou les achats.

---

## Tableau de classification

| Système | Autorité | Rôle du client | Rôle du serveur |
|---------|----------|----------------|-----------------|
| **Score classé** | Serveur | Envoie journal d'événements + indicateurs | Calcule le score, applique le debuff cyber, stocke en DB |
| **Classement mondial** (`leaderboard_entries`) | Serveur | Lecture seule | Écrit uniquement via `ranked-submit` ou `score-submit` |
| **Points PvP** (`pvp_stats`) | Serveur | Lecture seule | Attribution via `award_pvp_points` RPC dans `spy-resolve` et `cyber-resolve` |
| **Debuff cyber** | Serveur | Affichage informatif | Stocké dans `players.pending_debuff`, appliqué dans `ranked-submit` |
| **Alliances** | Serveur | Affiche les relations | Valide invitations, quotas, cooldowns, max alliances |
| **Espionnage** | Serveur | Lance l'opération, lit les résultats | Valide quotas, calcule et stocke les résultats au moment de la résolution |
| **Cyberattaque** | Serveur | Lance l'opération, lit les résultats | Calcule magnitude (2–5 %), stocke debuff, attribue PvP points |
| **Achats / Entitlements** | Serveur (RevenueCat → webhook) | Cache local 30j (SecureStore) | Seule source de vérité native (corrigé : `Platform.OS !== "web"` guard) |
| **Cloud save** | Serveur (stockage), Client (contenu) | Envoie le save, résout les conflits | Stocke, horodate (server-assigned), valide type/taille/version |
| **Ressources solo** | Client | Calcule, accumule, affiche | Vérifie l'accumulation via snapshots périodiques dans le journal ranked |
| **Indicateurs solo** | Client | Calcule, affiche | Croise avec le journal pour validation anti-triche (pas source de vérité) |
| **Bonus alliances (production)** | Client (affichage et simulation) | Applique `+2%/alliance` aux ressources locales | Ne connaît pas ce bonus dans les maxima de validation snapshot |
| **Télémétrie** | Client (local uniquement) | Buffer local, `flushTelemetry()` stub | Non connecté |

---

## Flux du score classé — preuve Zero Trust

```
Client                          Serveur (ranked-submit)
──────────────────────────────────────────────────────
1. Journal d'événements ──────→ reçu (événements bruts)
   (RunEvent[] — décisions,     recompute hashJournal()
    timings, séquences)         11 contrôles anti-triche
                                confiance ≥ 80 → accepté

2. finalIndicators ────────────→ cross-validation seulement
   (popularité, économie…)      (écart > 20 pts → flag)
   client-calculé               non utilisé comme source

3.                              computeScore(events, days, ind)
                                ← score calculé serveur

4.                              lit players.pending_debuff
                                applique pénalité cyber (0–20 %)
                                réinitialise pending_debuff = null

5.                              upsert leaderboard_entries
                                (si finalScore > existing.score)

6. reçoit { ok: true, score } ← score retourné
   affiche le score reçu
```

Le client n'influe jamais sur la valeur finale : il affiche ce que le serveur lui retourne.

---

## Points à surveiller

### 🔴 CRITIQUE — `score-submit` : endpoint live qui accepte un score client

**Fichier :** [supabase/functions/score-submit/index.ts](supabase/functions/score-submit/index.ts)

**Problème :** Cette Edge Function accepte un champ `score` (number) directement depuis le corps de la requête et l'insère dans `leaderboard_entries`. Un joueur authentifié avec un compte lié peut appeler cet endpoint directement (curl, app modifiée) et soumettre n'importe quel score entre 0 et 10 000 000, contournant entièrement le système `ranked-submit` et ses 11 contrôles anti-triche.

**Validation présente :** JWT requis ✅, compte lié requis ✅, plage [0; 10M] ✅, rate limit 5 min ✅, vérification ban ✅  
**Validation absente :** ❌ le score n'est jamais calculé côté serveur — il est pris tel quel du client.

**Statut actuel :** Aucun code client n'appelle cet endpoint (grep confirme). Mais l'endpoint est live et accessible depuis n'importe quel JWT valide.

**Correction :** voir section "Corrections minimales" ci-dessous.

---

### 🟡 MOYEN — Bonus d'alliance non comptabilisé dans les maxima de validation snapshot

**Fichier :** [context/StrategyContext.tsx:480](context/StrategyContext.tsx#L480), [supabase/functions/ranked-submit/index.ts](supabase/functions/ranked-submit/index.ts)

**Problème :** `allianceBonusRef.current` (0 à 6 %) est appliqué à `accumulateResources()` côté client, ce qui augmente légitimement la production de ressources. Les maxima théoriques de validation serveur pour les snapshots (`money ≤ 1 250`, `influence ≤ 400`, etc.) ne tiennent pas compte de ce bonus.

**Impact réel :** Les seuils suspects (>2× max) et de rejet (>10× max) sont suffisamment larges pour qu'un bonus de +6 % ne déclenche aucune fausse alarme. Un joueur malveillant ne peut pas exploiter ce gap pour obtenir une réduction du score de confiance.

**Recommandation :** Documenter le slack de 6 % dans les commentaires du contrôle snapshot du serveur. Pas de correction urgente.

---

### 🟡 MOYEN — Divergence potentielle entre `rankedScoreFormula.ts` et le serveur

**Fichier :** [logic/rankedScoreFormula.ts](logic/rankedScoreFormula.ts)

**Problème :** Ce fichier se présente comme "SOURCE DE VÉRITÉ pour la formule côté client ET documentation de référence pour l'implémentation serveur". Si la formule dans `ranked-submit` est mise à jour sans mettre à jour ce fichier (ou inversement), le joueur verrait une estimation de score différente du score réel.

**Impact sécurité :** Nul (le score affiché est toujours celui retourné par le serveur, pas celui de `rankedScoreFormula.ts`). Impact UX si divergence.

**Recommandation :** Ajouter un commentaire explicite dans `rankedScoreFormula.ts` indiquant qu'il s'agit uniquement d'une documentation de référence, pas d'un calcul utilisé à l'exécution.

---

### 🟡 MOYEN — `finalIndicators` client-calculés dans `mandate-review.tsx`

**Fichier :** [app/mandate-review.tsx:103-116](app/mandate-review.tsx#L103-L116)

**Contexte :** À la soumission ranked, le client envoie `finalIndicators` (popularité, économie…) calculés depuis l'état local (`state.nationalIndicators`).

**Pourquoi c'est acceptable :** Le serveur utilise ces valeurs uniquement pour la cross-validation via le `ranked_score_hint` event (écart > 20 pts → flag). Le score est calculé par `computeScore(events, mandateDays, finalIndicators)` où `finalIndicators` entre dans une formule pondérée — mais le journal d'événements est le vecteur principal de score, et ses 11 contrôles rendent la manipulation des indicateurs détectable.

**Ce qui resterait à faire pour aller plus loin :** Le serveur pourrait recalculer les indicateurs finaux depuis les événements du journal (comme il recalcule les ressources via les snapshots). Travail significatif, non prioritaire.

---

### 🟢 ACCEPTÉ — Bonus alliances appliqué localement à la simulation solo

**Fichier :** [context/StrategyContext.tsx:249](context/StrategyContext.tsx#L249), [context/StrategyContext.tsx:480](context/StrategyContext.tsx#L480)

`allianceBonusRef.current` booste la production locale de ressources (+2 %/alliance, max +6 %). Cela affecte la progression en jeu (upgrades, opérations) mais **pas directement le score classé**. La formule de `computeScore` n'inclut pas de terme "alliance bonus". L'effet est indirect (meilleures ressources → meilleures décisions → meilleur journal), ce qui est le comportement voulu.

---

### 🟢 ACCEPTÉ — `computeMandateScore` client-side

**Fichier :** [context/StrategyContext.tsx:1266](context/StrategyContext.tsx#L1266), [app/mandate-review.tsx:76](app/mandate-review.tsx#L76)

Formule purement locale, utilisée pour l'affichage du bilan de mandat et les récompenses solo (money, influence). N'est jamais envoyée au serveur ni utilisée pour le classement.

---

### 🟢 ACCEPTÉ — `pending_debuff_pct` affiché côté client

**Fichier :** [app/cyber-ops.tsx:128-134](app/cyber-ops.tsx#L128-L134)

Le client affiche le `pending_debuff_pct` reçu du serveur (`cyber-resolve`) comme une information de jeu ("−X% sur votre prochain score classé"). Il ne calcule pas lui-même la pénalité. L'application réelle se fait dans `ranked-submit` qui lit `players.pending_debuff` directement en base.

---

## Corrections minimales

### CRITIQUE — Désactiver `score-submit`

L'endpoint est accessible depuis tout JWT valide avec un compte lié. La correction la moins invasive est de le désactiver immédiatement avec un retour HTTP 410 Gone, sans supprimer le code (en cas de réactivation future avec validation serveur).

```typescript
// supabase/functions/score-submit/index.ts — ajouter au début du handler :
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // SCORE-SUBMIT EST DÉSACTIVÉ — voir ranked-submit pour la soumission anti-triche.
  // Cet endpoint acceptait un score client directement, violant la politique Zero Trust.
  // Réactiver uniquement si le score est calculé côté serveur avant insertion.
  return new Response(
    JSON.stringify({ error: "endpoint-disabled", use: "ranked-submit" }),
    { status: 410, headers: { ...CORS, "Content-Type": "application/json" } },
  );

  // ... reste du code (conservé pour référence) ...
```

### MOYEN — Annoter `rankedScoreFormula.ts`

Ajouter au début du fichier, après le bloc de commentaires existant :

```typescript
// AVERTISSEMENT : ce fichier est une DOCUMENTATION DE RÉFÉRENCE uniquement.
// Aucune valeur calculée ici n'est envoyée au serveur ni utilisée pour le classement.
// Le score affiché au joueur provient toujours de ranked-submit (serveur).
// Si la formule serveur change, mettre à jour ce fichier en parallèle pour la cohérence.
```

---

## Règles permanentes à ne pas violer

```
1. Jamais de score soumis par le client → toujours calculé serveur.
2. Jamais de player_id dans le body → toujours user.id de auth.getUser().
3. Jamais de timestamp client pour un résultat compétitif → toujours serveur.
4. Jamais de pending_debuff client-side → toujours lu depuis players table.
5. Jamais de pvp_points client-side → toujours via award_pvp_points RPC.
6. Jamais d'entitlement uniquement local sur natif quand le serveur est joignable.
7. Tout endpoint live est une surface d'attaque, même sans client officiel.
```
