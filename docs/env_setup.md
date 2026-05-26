# Configuration des variables d'environnement — État de Crise

Ce document explique comment configurer l'environnement local pour développer,
builder et déployer le projet.

---

## 1. Créer `.env.local`

Copier le fichier modèle à la racine du projet :

```bash
cp .env.example .env.local
```

`.env.local` est chargé automatiquement par Expo au démarrage (`expo start`).
Il **ne doit jamais être commité dans git** — il est déjà couvert par `.gitignore`.

> Expo charge les fichiers dans cet ordre de priorité :
> `.env.local` > `.env.development` > `.env`
> En cas de conflit, `.env.local` gagne toujours.

---

## 2. Variables à renseigner

### Obligatoires — l'app ne démarre pas sans elles

| Variable | Où la trouver | Format |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | `https://ABCDEFGHIJ.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon public | Longue chaîne JWT |

Ces deux clés sont **publiques** — elles sont injectées dans le bundle de l'app et
visibles côté client. La sécurité repose sur les règles RLS (Row Level Security)
configurées dans Supabase, pas sur le secret de ces clés.

### Build natif EAS — nécessaires uniquement pour `eas build`

| Variable | Où la trouver | Format |
|---|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat Dashboard → Project → API Keys → Public app-specific keys | `appl_xxxx…` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat Dashboard → Project → API Keys → Public app-specific keys | `goog_xxxx…` |

En développement Expo Go, ces clés peuvent rester vides — les achats in-app
sont simulés ou désactivés automatiquement.

### Optionnel

| Variable | Usage | Par défaut |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | URL d'une API custom (sans `/` final) | Vide — Supabase Edge Functions utilisées |

---

## 3. Ce qu'il ne faut jamais commiter

| Fichier | Raison |
|---|---|
| `.env.local` | Contient les clés de connexion au projet Supabase |
| `.env` | Idem |
| `secrets/google-play-service-account.json` | Clé de service Google Play — compromet la publication |
| `*.keystore` | Clé de signature Android — compromet l'identité de l'app |
| `*.p12`, `*.p8` | Certificats iOS — compromet la distribution App Store |

Tous ces fichiers sont déjà dans `.gitignore`. Avant chaque commit, vérifier
avec `npm run preflight` que rien de sensible n'est suivi par git.

> **Règle générale :** si un fichier contient un mot de passe, un token ou
> une clé privée, il ne doit pas être dans git, même dans un dépôt privé.

---

## 4. Activer le sandbox développeur

Le sandbox développeur active des comportements de test (données fictives,
logs étendus, fonctionnalités expérimentales) :

```bash
# Dans .env.local
EXPO_PUBLIC_ENABLE_DEV_SANDBOX=true
```

**Restrictions importantes :**

- Ne jamais passer cette variable à `true` dans un build de production.
- `npm run preflight:prod` bloque automatiquement le build si elle est active.
- En preview EAS, elle peut être active sans conséquence car la distribution
  est interne.

Pour désactiver :

```bash
# Dans .env.local
EXPO_PUBLIC_ENABLE_DEV_SANDBOX=false
```

---

## 5. Vérifier la configuration avec `npm run doctor`

Le System Doctor inspecte l'état complet du projet :

```bash
npm run doctor
```

Il vérifie notamment :

- Présence de `.env.local`
- `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` définies
- État actif ou inactif du sandbox développeur
- Aucune clé secrète exposée dans git

Exemple de sortie attendue pour un environnement correctement configuré :

```
✅  .env.local              Présent
✅  EXPO_PUBLIC_SUPABASE_URL      Définie
✅  EXPO_PUBLIC_SUPABASE_ANON_KEY Définie
✅  EXPO_PUBLIC_ENABLE_DEV_SANDBOX  Inactive (mode production)
✅  .gitignore              .env protégé
```

Si une variable manque ou si le sandbox est actif en production, le doctor
affiche un ❌ ou un ⚠️ avec le message d'action correspondant.

---

## 6. Avant un build EAS

Avant de lancer `eas build`, toujours exécuter le preflight check :

```bash
# Build preview
npm run preflight

# Build production
npm run preflight:prod
```

Le preflight vérifie typecheck, tests, variables, secrets et configuration EAS.
Il génère un rapport `preflight-report.json` et bloque (exit 1) si des
problèmes critiques sont détectés.
