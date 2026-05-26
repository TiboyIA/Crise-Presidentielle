# Runbook incidents développeur — État de Crise

Procédures de résolution des incidents courants. Chaque fiche suit le format :
symptôme → cause → commande → fichier → solution → gravité.

Gravité : 🔴 Critique (bloque le jeu/la release) · 🟠 Majeure (dégrade l'expérience) · 🟡 Mineure (cosmétique ou contournable)

---

## 1. Expo ne démarre plus

**Symptôme**
Metro Bundler plante au démarrage, port occupé, ou `expo start` se fige sans afficher de QR code.

**Cause probable**
Cache Metro corrompu, conflit de port (8081 déjà occupé), ou `node_modules` désynchronisé après un `git pull`.

**Commandes**
```bash
# Vider le cache Metro et redémarrer
npx expo start --clear

# Si le port 8081 est occupé
npx expo start --port 8082

# Si node_modules est suspect
rm -rf node_modules && npm install && npx expo start --clear
```

**Fichiers à vérifier**
- `.expo/` — supprimer le dossier entier si les erreurs persistent
- `package.json` — vérifier que les dépendances n'ont pas changé sans `npm install`

**Solution courte**
`npx expo start --clear` résout 90 % des cas. Si l'erreur persiste après réinstallation, vérifier si une mise à jour SDK Expo incompatible a été introduite dans `package.json`.

**Gravité** 🔴 Critique

---

## 2. Écran blanc au lancement

**Symptôme**
L'app démarre, le splash screen disparaît, puis l'écran reste blanc ou noir. Aucune UI affichée.

**Cause probable**
Erreur JS non catchée au montage (import manquant, hook appelé hors contexte, provider absent). La new architecture (Hermes) fait parfois crasher silencieusement.

**Commandes**
```bash
# Voir les logs natifs
npx expo start --clear
# Puis ouvrir les logs dans le terminal ou Expo Go → Shake → View Logs

# Vérifier TypeScript avant de chercher plus loin
npm run typecheck
```

**Fichiers à vérifier**
- `app/_layout.tsx` — providers (StrategyContext, AuthContext, ComfortContext) correctement imbriqués
- `context/StrategyContext.tsx` — crash possible si `state` est null et consommé sans guard
- `components/ErrorFallback.tsx` — l'écran de fallback devrait avoir capturé l'erreur

**Solution courte**
Ajouter `console.error` en tête des providers suspects pour localiser le crash. Vérifier que tous les `useStrategy()` sont utilisés à l'intérieur du `StrategyProvider`.

**Gravité** 🔴 Critique

---

## 3. Erreur TypeScript

**Symptôme**
`npm run typecheck` ou l'IDE affiche des erreurs TS. Le build EAS échoue avec "TypeScript errors found".

**Cause probable**
Nouveau champ ajouté à `StrategyGameState` sans valeur par défaut, type `?` oublié, ou import cassé après un refactor.

**Commandes**
```bash
# Typecheck filtré (ignore les erreurs Supabase/Deno connues)
npm run typecheck 2>&1 | grep -v "supabase/functions" | grep -v "node_modules"

# Ou via preflight
npm run preflight
```

**Fichiers à vérifier**
- `types/strategy.ts` — source de vérité pour `StrategyGameState`
- `storage/saveMigrations.ts` — `CURRENT_SAVE_VERSION` à bumper si un champ devient obligatoire
- `context/StrategyContext.tsx` — interface du contexte à synchroniser

**Solution courte**
Les erreurs dans `supabase/functions/` sont des faux positifs Deno — les ignorer. Les vraies erreurs jeu sont dans `app/`, `logic/`, `context/`, `storage/`, `types/`. Corriger en priorité celles sur `StrategyGameState`.

**Gravité** 🟠 Majeure (bloque EAS build si non corrigé)

---

## 4. Variable `.env` absente

**Symptôme**
`npm run doctor` signale une variable non définie. L'app se connecte avec une URL vide ou affiche une erreur Supabase 400/401 au démarrage.

**Cause probable**
`.env.local` manquant (pas copié depuis `.env.example`), ou variable présente dans `.env` mais pas chargée par Expo.

**Commandes**
```bash
# Diagnostic complet
npm run doctor

# Créer .env.local depuis le modèle
cp .env.example .env.local
# Puis éditer .env.local avec les vraies valeurs

# Redémarrer après modification
npx expo start --clear
```

**Fichiers à vérifier**
- `.env.local` — doit exister à la racine du projet
- `.env.example` — référence de toutes les variables attendues
- `docs/env_setup.md` — guide de configuration complet

**Solution courte**
Expo charge `.env.local` automatiquement. Toute modification nécessite un redémarrage avec `--clear` pour être prise en compte (les variables sont injectées au bundling, pas au runtime).

**Gravité** 🔴 Critique

---

## 5. Supabase désactivé ou inaccessible

**Symptôme**
Erreurs réseau Supabase (`Failed to fetch`, `Connection refused`, `401 Unauthorized`). Les fonctionnalités multi-joueur, classement et sync sont hors ligne.

**Cause probable**
URL ou clé anon incorrecte dans `.env.local`, projet Supabase en pause (inactivité > 7 jours sur plan gratuit), ou restriction réseau locale.

**Commandes**
```bash
# Vérifier que les variables sont bien définies
npm run doctor

# Tester la connectivité manuellement (remplacer par l'URL réelle)
curl https://VOTRE_PROJECT_ID.supabase.co/rest/v1/ \
  -H "apikey: VOTRE_ANON_KEY"
```

**Fichiers à vérifier**
- `.env.local` — `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `lib/supabase.ts` (ou équivalent) — initialisation du client
- Supabase Dashboard → Project Settings → General → "Restore project" si en pause

**Solution courte**
Si le projet est en pause (plan gratuit), le réactiver dans le dashboard Supabase. Le jeu fonctionne en mode hors ligne dégradé — les sauvegardes locales et la partie solo restent opérationnelles.

**Gravité** 🟠 Majeure (solo non affecté)

---

## 6. RevenueCat indisponible

**Symptôme**
Les achats in-app ne s'affichent pas, le bouton d'achat est grisé, ou une erreur `PurchasesError` apparaît dans les logs.

**Cause probable**
Clés RevenueCat absentes dans `.env.local`, app lancée en Expo Go (achats non supportés), ou sandbox Apple/Google non configuré pour le compte de test.

**Commandes**
```bash
# Vérifier les clés
npm run doctor
# Les clés RevenueCat apparaissent comme ⚠️ si absentes (non bloquant en dev)
```

**Fichiers à vérifier**
- `.env.local` — `EXPO_PUBLIC_REVENUECAT_IOS_KEY` et `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- `lib/entitlements.ts` — logique d'initialisation RevenueCat
- RevenueCat Dashboard → Apps → vérifier que l'app est en "Sandbox" mode pour les tests

**Solution courte**
En Expo Go, les achats ne fonctionnent jamais — c'est normal. Tester les achats uniquement sur un build EAS development ou preview. En sandbox Apple, utiliser un compte "Sandbox Tester" créé dans App Store Connect.

**Gravité** 🟡 Mineure (affecte uniquement la monétisation, pas le gameplay de base)

---

## 7. Build EAS échoué

**Symptôme**
`eas build` échoue sur le serveur EAS. Le dashboard EAS affiche une erreur de build (rouge).

**Cause probable**
TypeScript invalide, credentials manquants, variable d'environnement absente sur EAS, ou assets trop lourds dépassant les limites EAS.

**Commandes**
```bash
# Toujours lancer avant eas build
npm run preflight        # pour preview
npm run preflight:prod   # pour production

# Voir les logs EAS détaillés
eas build:view           # liste les builds récents avec liens

# Vérifier les credentials
eas credentials
```

**Fichiers à vérifier**
- `eas.json` — profils `development`, `preview`, `production` et leurs `credentialsSource`
- `app.json` — `expo.version`, `expo.android.package`, `expo.ios.bundleIdentifier`
- Variables d'environnement EAS : dashboard EAS → Secrets → vérifier que `EXPO_PUBLIC_SUPABASE_URL` etc. sont déclarées

**Solution courte**
Le preflight détecte 80 % des causes avant le build. Si le build échoue côté EAS malgré un preflight vert, vérifier les EAS Secrets dans le dashboard (variables non disponibles dans le shell local).

**Gravité** 🔴 Critique

---

## 8. Assets trop lourds

**Symptôme**
`npm run doctor` ou `npm run preflight` signale `assets/ > 100 Mo`. Le build EAS est lent ou dépasse les quotas. L'app met longtemps à charger les images.

**Cause probable**
Images PNG/JPG non compressées, assets source ajoutés par erreur (PSD, SVG haute résolution), ou images dupliquées.

**Commandes**
```bash
# Compression automatique (dry-run d'abord)
npm run assets:compress:dry

# Compression réelle
npm run assets:compress

# Vérifier la taille après compression
npm run doctor
```

**Fichiers à vérifier**
- `assets/images/` — identifier les fichiers > 1 Mo avec `ls -lhS assets/images/`
- `scripts/compress-assets.js` — paramètres de qualité si la compression est trop agressive

**Solution courte**
Lancer `npm run assets:compress:dry` d'abord pour voir le gain estimé sans modifier les fichiers. La compression est sans perte de qualité perceptible pour les images de jeu. Ne jamais commiter les assets source (PSD, AI) dans le repo.

**Gravité** 🟠 Majeure (impacte build time et performances runtime)

---

## 9. Sauvegarde locale corrompue

**Symptôme**
L'app plante au chargement de la partie, affiche une erreur JSON, ou repart d'une nouvelle partie sans raison.

**Cause probable**
Interruption brutale lors d'un `saveGame()`, incompatibilité de version (`CURRENT_SAVE_VERSION` pas migré), ou données AsyncStorage corrompues.

**Commandes**
```bash
# Les tests golden couvrent les migrations — les lancer
npm run test:golden

# En dernier recours sur simulateur iOS (efface toutes les données)
xcrun simctl erase all
# Sur Android Emulator : Wipe Data depuis AVD Manager
```

**Fichiers à vérifier**
- `storage/gameStorage.ts` — clé active : `etat_de_crise_save_v4` (legacy : v1/v2/v3)
- `storage/saveMigrations.ts` — `CURRENT_SAVE_VERSION = 3` et historique des migrations
- `storage/saveSlots.ts` — si les slots sont utilisés, vérifier leur clé respective

**Solution courte**
Le système de migration est conçu pour ne jamais crasher — il injecte les champs manquants sans écraser les valeurs existantes. Si la save est vraiment irrécupérable, supprimer la clé `etat_de_crise_save_v4` via les outils développeur (Flipper, simulateur) plutôt que de tout effacer.

**Gravité** 🔴 Critique (perte de progression joueur)

---

## 10. Sandbox développeur invisible

**Symptôme**
Le menu sandbox (`app/dev-sandbox.tsx`) n'apparaît pas dans la navigation, ou `isDevSandboxEnabled()` retourne `false` alors que la variable est définie.

**Cause probable**
La double condition `__DEV__ && EXPO_PUBLIC_ENABLE_DEV_SANDBOX === "true"` n'est pas satisfaite : soit l'app tourne en mode production, soit la variable n'a pas été rechargée après modification.

**Commandes**
```bash
# Vérifier que la variable est bien lue
npm run doctor
# Doit afficher : ⚠️  EXPO_PUBLIC_ENABLE_DEV_SANDBOX  →  ACTIVE

# Forcer le rechargement complet
npx expo start --clear
```

**Fichiers à vérifier**
- `.env.local` — `EXPO_PUBLIC_ENABLE_DEV_SANDBOX=true` (exactement, sans espace)
- `config/devSandbox.ts` — logique `isDevSandboxEnabled()`
- `app/_layout.tsx` — condition d'affichage du lien sandbox dans la navigation

**Solution courte**
La variable est injectée au bundling — un simple rechargement à chaud (R) ne suffit pas. Toujours relancer `expo start --clear` après une modification de `.env.local`. L'accès sandbox nécessite aussi un build `__DEV__` (Expo Go ou build development).

**Gravité** 🟡 Mineure (uniquement en développement)

---

## 11. Sandbox actif mais non pris en compte

**Symptôme**
`npm run doctor` confirme que la sandbox est active, mais les fonctionnalités sandbox (données de test, outils dev) ne répondent pas ou restent dans l'état production.

**Cause probable**
Cache Metro restant d'un précédent build sans sandbox, ou composant vérifiant `isDevSandboxEnabled()` au montage une seule fois sans re-render.

**Commandes**
```bash
# Nettoyer le cache et relancer
npx expo start --clear

# Vérifier que le build est bien en mode dev
# (le menu "Shake" Expo Go doit être disponible)
```

**Fichiers à vérifier**
- `config/devSandbox.ts` — `isDevSandboxEnabled()` doit retourner `true`
- `storage/sandboxStorage.ts` — état persisté du sandbox à vérifier
- `logic/sandboxEngine.ts` — initialisation du moteur sandbox

**Solution courte**
Vérifier dans les logs que `isDevSandboxEnabled()` retourne bien `true` au démarrage. Si oui et que le sandbox ne répond pas, le bug est dans `sandboxEngine.ts` — ajouter un `console.log` à l'entrée pour confirmer l'activation.

**Gravité** 🟡 Mineure (uniquement en développement)

---

## 12. Mode classé non soumis

**Symptôme**
La partie classée se termine normalement, mais le score n'apparaît pas dans le classement. Aucune erreur visible pour le joueur.

**Cause probable**
Échec réseau lors du `POST /ranked-submit` — la soumission est mise en attente locale (`ranked_pending_submit_v1`) mais pas encore réessayée.

**Commandes**
```bash
# Inspecter AsyncStorage (simulateur uniquement — via Flipper ou logs)
# Clés à vérifier :
#   ranked_journal_v1
#   ranked_run_meta_v1
#   ranked_pending_submit_v1  ← présente si soumission en attente
```

**Fichiers à vérifier**
- `services/RankedService.ts` — `retryPendingSubmission()` appelé au prochain lancement
- `services/OfflineQueue.ts` — file d'attente hors ligne
- Supabase Dashboard → Table Editor → table `ranked_runs` — vérifier si la ligne est créée

**Solution courte**
`RankedService.retryPendingSubmission()` est appelé automatiquement au prochain lancement de l'app si une connexion est disponible. Si la soumission reste bloquée après plusieurs tentatives, vérifier les logs Supabase Edge Functions pour une erreur de validation serveur.

**Gravité** 🟠 Majeure (affecte l'intégrité du classement)

---

## 13. Classement global vide

**Symptôme**
L'écran `ranking-global.tsx` affiche une liste vide ou un spinner infini. Aucune erreur réseau visible.

**Cause probable**
Règles RLS Supabase trop restrictives (la requête `SELECT` est bloquée pour les utilisateurs non authentifiés), table vide en environnement de développement, ou requête sur la mauvaise table.

**Commandes**
```bash
# Tester la requête directement
curl "https://VOTRE_PROJECT_ID.supabase.co/rest/v1/leaderboard?order=score.desc&limit=50" \
  -H "apikey: VOTRE_ANON_KEY" \
  -H "Authorization: Bearer VOTRE_ANON_KEY"
# Résultat attendu : tableau JSON avec les scores

# Vérifier que la politique RLS autorise SELECT anon
# Supabase Dashboard → Table Editor → leaderboard → RLS Policies
```

**Fichiers à vérifier**
- `app/ranking-global.tsx` — requête Supabase et gestion de l'état de chargement
- `app/ranking.tsx` / `app/ranking-pvp.tsx` — pages adjacentes pour comparer la logique
- Supabase Dashboard → Authentication → Policies — vérifier la politique `SELECT` sur la table classement

**Solution courte**
En développement, la table est souvent vide. Insérer une ligne de test manuellement dans Supabase pour valider l'affichage. Si la liste est vide en production, vérifier d'abord les RLS avant de chercher un bug côté client.

**Gravité** 🟠 Majeure (fonctionnalité sociale dégradée)

---

## 14. App lente sur téléphone

**Symptôme**
Animations saccadées, temps de réponse > 300 ms sur les interactions, ou l'app chauffe le téléphone (CPU élevé).

**Cause probable**
Re-renders excessifs dans `StrategyContext` (state trop large mis à jour trop souvent), calculs lourds exécutés dans le thread JS (moteurs de simulation appelés à chaque frame), ou images non optimisées chargées sans cache.

**Commandes**
```bash
# Vérifier la taille des assets
npm run doctor

# Compresser si nécessaire
npm run assets:compress

# Profiler en production-like (Hermes)
npx expo start --no-dev --minify
```

**Fichiers à vérifier**
- `context/StrategyContext.tsx` — fréquence des appels `update()` et taille du state sérialisé
- `core/computeState.ts` — fonctions appelées à chaque tick (vérifier les memoïsations)
- `utils/responsive.ts` — `useResponsive()` recalcule-t-il à chaque render ?

**Solution courte**
Utiliser le Profiler React DevTools (Expo + Flipper) pour identifier le composant qui re-render le plus souvent. Le premier coupable habituel est un `useMemo` manquant sur un calcul dérivé du `StrategyGameState`. Activer le mode `--no-dev --minify` pour tester les performances Hermes réelles (le mode dev est ~3× plus lent).

**Gravité** 🟠 Majeure (expérience joueur dégradée sur appareils mid-range)

---

## Référence rapide

| # | Incident | Gravité | Première commande |
|---|---|---|---|
| 1 | Expo ne démarre plus | 🔴 | `npx expo start --clear` |
| 2 | Écran blanc | 🔴 | `npm run typecheck` |
| 3 | Erreur TypeScript | 🟠 | `npm run preflight` |
| 4 | Variable .env absente | 🔴 | `npm run doctor` |
| 5 | Supabase inaccessible | 🟠 | `npm run doctor` |
| 6 | RevenueCat indisponible | 🟡 | `npm run doctor` |
| 7 | Build EAS échoué | 🔴 | `npm run preflight:prod` |
| 8 | Assets trop lourds | 🟠 | `npm run assets:compress:dry` |
| 9 | Sauvegarde corrompue | 🔴 | `npm run test:golden` |
| 10 | Sandbox invisible | 🟡 | `npx expo start --clear` |
| 11 | Sandbox non pris en compte | 🟡 | `npx expo start --clear` |
| 12 | Mode classé non soumis | 🟠 | Vérifier `ranked_pending_submit_v1` |
| 13 | Classement global vide | 🟠 | Tester requête Supabase `curl` |
| 14 | App lente | 🟠 | `npx expo start --no-dev --minify` |
