# Sécurité OAuth / Deep Links — Président : Nation en Crise

## Architecture du flux OAuth

Le jeu utilise **Supabase Auth** avec le flux PKCE via `expo-web-browser`.

```
joueur → handleLinkGoogle()
  → sb.auth.linkIdentity({ provider: "google", options: { redirectTo } })
  → Supabase retourne une URL /auth/v1/authorize?...
  → WebBrowser.openAuthSessionAsync(url, redirectTo)
      ↳ iOS : SFSafariViewController / ASWebAuthenticationSession
      ↳ Android : Chrome Custom Tab
  → OAuth provider redirige vers etat-de-crise://auth/callback?code=...
  → WebBrowser se ferme, openAuthSessionAsync retourne { type: "success" }
  → Supabase SDK déclenche onAuthStateChange avec la nouvelle session
```

---

## Vérifications de sécurité

### ✅ Pas de WebView custom
`WebBrowser.openAuthSessionAsync` utilise le browser système de l'OS (SFSafariViewController sur iOS, Chrome Custom Tab sur Android). Le joueur voit la barre d'adresse et peut vérifier le domaine OAuth. Aucune WebView custom n'est utilisée.

### ✅ `detectSessionInUrl: false`
Le client Supabase est configuré avec `detectSessionInUrl: false`. Il ne parse pas automatiquement les tokens depuis les URLs, ce qui est le comportement correct pour React Native (évite de traiter des deep links non sollicités comme des sessions).

### ✅ Scheme custom non partageable
`scheme: "etat-de-crise"` (app.json). Ce scheme n'est enregistrable que par l'app signée avec le même bundle ID (`com.etatdecrise.president`). Un tiers ne peut pas enregistrer le même scheme sur un appareil si l'app est déjà installée.

### ✅ Pas de handler de deep link générique
Aucun `Linking.addEventListener`, `useURL()`, ni `Linking.addListener` dans la codebase. L'app ne traite pas les deep links manuellement — expo-router gère la navigation et le SDK Supabase gère la session.

### ✅ Pas de route `auth/callback` exposée dans le Stack
La route `etat-de-crise://auth/callback` ne correspond à aucun écran (`auth/callback.tsx` n'existe pas). C'est intentionnel : le Supabase SDK capte la session via `onAuthStateChange` avant toute navigation. Si Expo Router essaie de naviguer vers cette route, il affiche `+not-found` — ce qui est inoffensif.

### ✅ Aucun token dans les logs
Aucun `console.log`, `console.warn` ni `console.error` ne journalise d'access token, refresh token, ou session Supabase.

### ✅ Validation de l'URL OAuth avant ouverture
L'URL retournée par `linkIdentity()` est vérifiée contre `EXPO_PUBLIC_SUPABASE_URL` avant d'être transmise au browser. Une URL inattendue (`!url.startsWith(expectedOrigin)`) retourne `oauth-failed` sans ouvrir de browser.

### ✅ Erreurs SDK non exposées à l'UI
Les erreurs du SDK Supabase (`error.message`) sont mappées en codes internes (`identity-already-linked`, `oauth-failed`) avant d'atteindre l'UI. Les messages affichés ne révèlent aucun détail interne du serveur.

---

## Paramètres URL — politique de validation

| Source de l'URL | Traitement |
|---|---|
| URL OAuth (`data.url` de `linkIdentity`) | Vérifiée contre `SUPABASE_URL` avant ouverture |
| Callback URL (`etat-de-crise://auth/callback?code=...`) | Traitée par le SDK Supabase via `onAuthStateChange` — jamais parsée manuellement |
| Deep links entrants arbitraires | Aucun handler enregistré — ignorés par l'app |

---

## Écrans sensibles — accessibilité par deep link

| Écran | Accessible par deep link direct ? | Protection |
|---|---|---|
| `account-link` | Oui (route expo-router) | Inoffensif — affiche juste un bouton "Lier Google" |
| `ranking`, `alliances`, `spy-ops` | Oui | Requièrent l'état `AuthContext` — si pas de session, comportement vide |
| `debug` | Oui | Gated `__DEV__` — redirige vers `/` en production |
| Session / tokens | Non | Jamais dans des paramètres d'URL |

Aucun écran ne prend de paramètre URL qui déclencherait une action automatique (achat, envoi, etc.).

---

## Flux d'erreurs OAuth — mapping complet

| Code interne | Cause | Message joueur |
|---|---|---|
| `not-enabled` | SUPABASE_URL ou ANON_KEY absents | "Authentification non disponible." |
| `no-session` | Session expirée avant linkIdentity | "Session expirée. Relancez l'application." |
| `identity-already-linked` | Compte Google déjà lié à un autre profil | "Ce compte est déjà lié à un autre joueur." |
| `oauth-failed` | Erreur SDK non catégorisée, ou URL hors domaine | "Liaison impossible. Réessayez dans un instant." |
| `no-url` | SDK n'a pas retourné d'URL | "Liaison impossible. Réessayez dans un instant." |
| `cancelled` | Joueur a fermé le browser | *(aucun message — comportement normal)* |

---

## Ce qui n'est pas fait (intentionnel)

- **Pas de State/nonce custom** : le SDK Supabase gère le PKCE state et le code verifier en interne. Les ajouter manuellement créerait une désynchronisation.
- **Pas de `exchangeCodeForSession()` explicite** : le SDK Supabase gère l'échange via `onAuthStateChange` dans le contexte de `WebBrowser.openAuthSessionAsync`. C'est le pattern recommandé par Supabase pour Expo.
- **Pas de validation des paramètres de la callback URL** : la callback URL (`etat-de-crise://auth/callback?code=...`) n'est jamais parsée manuellement. La confiance est déléguée au SDK Supabase qui extrait et valide le code.
