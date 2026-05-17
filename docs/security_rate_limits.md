# Politique de rate limiting multijoueur — Président : Nation en Crise

Toutes les limites sont appliquées **côté serveur** (Edge Functions). Le client ne
contient aucune logique de rate limiting définitive — il affiche les erreurs reçues.

---

## 1. Invitations d'alliance (`alliance-invite`)

| Règle | Limite | Réponse |
|---|---|---|
| Run validée requise | ≥ 1 run classée validée | 403 `no-validated-run` |
| Quota journalier invitations | max 10 / 24 h (toutes issues confondues) | 429 `quota-exceeded` |
| Alliance existante (pending/active) | 1 seule relation par paire | 409 `alliance-already-exists` |
| Cooldown après rupture | 48 h (via `expires_at` de l'alliance brisée) | 429 `cooldown-active` |
| Max alliances actives (envoyeur) | 3 alliances simultanées | 429 `max-alliances-reached` |
| Cible inexistante | — | 404 `target-not-found` |
| Auto-invitation | — | 400 `cannot-invite-self` |
| Expiration invitation | 7 jours, puis auto-nettoyage | — |

### Messages joueur
| Code erreur | Message affiché |
|---|---|
| `no-validated-run` | "Complète d'abord une partie en mode classé." |
| `quota-exceeded` | "Limite d'invitations atteinte pour aujourd'hui." |
| `alliance-already-exists` | "Une relation d'alliance existe déjà avec ce joueur." |
| `cooldown-active` | "Attends 48h avant de ré-inviter ce joueur." |
| `max-alliances-reached` | "Tu as déjà 3 alliances actives." |
| `network-unavailable` | "Connexion indisponible." |
| tout autre | "Erreur lors de l'invitation." |

---

## 2. Espionnage (`spy-launch`)

| Règle | Limite | Réponse |
|---|---|---|
| Run validée requise | ≥ 1 run classée validée | 403 `no-validated-run` |
| Quota journalier attaquant | max 2 opérations / 24 h | 429 `quota-exceeded` |
| Cooldown par cible | max 1 op / cible / 24 h | 429 `target-cooldown` |
| Protection nouveau joueur | compte cible < 7 jours | 403 `target-protected-new` |
| Score requis (cible) | doit avoir un score classé cette saison | 403 `target-no-score` |
| Type d'opération | `intel_probe`, `doctrine_scan`, `score_range` uniquement | 400 `invalid-op-type` |
| Auto-espionnage | — | 400 `cannot-spy-self` |
| Résolution différée | 6 h après lancement | — |

### Messages joueur
| Code erreur | Message affiché |
|---|---|
| `no-validated-run` | "Complète d'abord une partie en mode classé." |
| `quota-exceeded` | "Maximum 2 opérations par 24h." |
| `target-cooldown` | "Tu as déjà espionné ce joueur récemment." |
| `target-protected-new` | "Ce joueur est protégé (compte < 7 jours)." |
| `target-no-score` | "Ce joueur n'a pas encore soumis de score classé." |
| `network-unavailable` | "Connexion indisponible." |
| tout autre | "Erreur lors du lancement." |

---

## 3. Cyberattaque (`cyber-launch`)

| Règle | Limite | Réponse |
|---|---|---|
| Run validée requise | ≥ 1 run classée validée | 403 `no-validated-run` |
| Quota journalier attaquant | max 1 cyber op / 24 h | 429 `quota-exceeded` |
| Protection nouveau joueur (cible) | compte cible < 14 jours | 403 `target-protected-new` |
| Score requis (cible) | ≥ 5 000 points cette saison | 403 `target-no-score` |
| Proportionnalité | score cible ≥ 30 % du score attaquant | 403 `proportionality-exceeded` |
| Protection cible saturée | max 2 attaques reçues / cible / 24 h | 429 `target-protected-quota` |
| Auto-attaque | — | 400 `self-attack` |
| Résolution différée | 4 h après lancement | — |
| Magnitude de l'impact | 2–5 % (tirage aléatoire serveur) | — |

### Messages joueur
| Code erreur | Message affiché |
|---|---|
| `no-validated-run` | "Complète d'abord une partie en mode classé." |
| `quota-exceeded` | "Maximum 1 cyberattaque par 24h." |
| `target-protected-new` | "Ce joueur est protégé (compte < 14 jours)." |
| `target-no-score` | "Ce joueur n'a pas de score classé cette saison." |
| `proportionality-exceeded` | "Écart de score trop grand pour cibler ce joueur." |
| `target-protected-quota` | "Ce joueur est déjà sous attaque ce cycle." |
| `network-unavailable` | "Connexion indisponible." |
| tout autre | "Erreur lors du lancement." |

---

## 4. Mode classé (`ranked-submit`)

| Règle | Limite | Réponse |
|---|---|---|
| Run déjà soumise | une seule soumission par `runId` | 409 `duplicate_submit` |
| Quota journalier | max 1 run validée / 23 h | 429 `rate-limited` |
| Taille journal | illimité (filtrage événements invalides) | 422 si suspect |
| Version app inconnue | flag `unknown_app_version` (pas rejet automatique) | 200 + flag |
| Score de confiance < 50 | run rejetée | 422 `impossible_timing` / `impossible_resources` / … |
| Score de confiance 50-79 | run acceptée, marquée suspecte | 200 + `suspect: true` |

---

## 5. Cloud save (`save-sync`)

| Règle | Limite | Réponse |
|---|---|---|
| Taille payload | max 500 KB (512 000 chars JSON) | 413 `save-too-large` |
| Fréquence upload | max 1 POST / 5 min par compte | 429 `rate-limited` |
| Version save | `saveVersion` ∈ [1, 10] | 400 `unsupported-version` |
| Type saveData | objet JSON non-null, non-array | 400 `invalid-save-data` |
| Timestamp | toujours assigné côté serveur | — |
| Checksum | djb2 — avertissement si mismatch, pas rejet | `warning: "checksum_mismatch"` |

---

## Règles générales

### Ce que le client ne fait pas
- Aucun rate limit définitif côté client (en-mémoire seulement pour UX)
- Jamais de décision de ban ou de rejet de gameplay côté client
- Les messages d'erreur ne révèlent pas les seuils exacts (ex. "limite atteinte", pas "max 10 / jour")

### Ce que le serveur fait toujours
- JWT validé via `auth.getUser()` sur chaque requête
- `user.id` utilisé comme `player_id` — jamais de paramètre client
- Les timestamps sont toujours assignés côté serveur
- Les compteurs de rate limit utilisent les timestamps de la base de données

### Politique anti-abus
- Aucun ban automatique côté client ni côté serveur (revue manuelle pour le classé)
- Les erreurs 429 ne révèlent pas le temps restant (evite de l'énumération)
- Les erreurs 403/404 sur les opérations PvP ne distinguent pas "cible inconnue" de "cible protégée" dans le message UI final (le code serveur est précis, le message joueur est flou)
