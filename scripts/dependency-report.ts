/**
 * dependency-report.ts — Audit local des dépendances.
 * Usage : npm run deps:report
 * Génère dependencies-report.md. Ne modifie aucun package.
 */

import fs   from "fs";
import path from "path";

const ROOT        = process.cwd();
const OUTPUT_PATH = path.join(ROOT, "dependencies-report.md");

// ── Types ─────────────────────────────────────────────────────────────────────

type Impact   = "faible" | "moyen" | "fort";
type Category =
  | "expo"
  | "react-native"
  | "paiement"
  | "supabase"
  | "stockage"
  | "assets"
  | "typescript-build"
  | "donnees"
  | "runtime-core";

interface PkgMeta {
  role:      string;
  critique:  boolean;
  impact:    Impact;
  prudence:  string;
  category:  Category;
}

interface PkgEntry {
  name:      string;
  declared:  string;
  installed: string;
  scope:     "runtime" | "dev";
  meta:      PkgMeta;
}

// ── Lire version installée ────────────────────────────────────────────────────

function installedVersion(name: string): string {
  try {
    const p = path.join(ROOT, "node_modules", name, "package.json");
    return JSON.parse(fs.readFileSync(p, "utf-8")).version as string;
  } catch {
    return "—";
  }
}

// ── Catalogue de métadonnées ──────────────────────────────────────────────────

const CATALOG: Record<string, PkgMeta> = {

  // ── Runtime core ────────────────────────────────────────────────────────────
  "react": {
    role:     "Runtime React — moteur de rendu composants",
    critique: true,  impact: "fort",
    prudence: "Version majeure liée à react-native et react-dom — toujours aligner les 3 ensemble.",
    category: "runtime-core",
  },
  "react-dom": {
    role:     "React DOM — rendu web (Expo Web)",
    critique: true,  impact: "fort",
    prudence: "Doit correspondre exactement à la version de react. Utilisé uniquement pour le cible web.",
    category: "runtime-core",
  },

  // ── Expo packages ────────────────────────────────────────────────────────────
  "expo": {
    role:     "SDK Expo — point d'entrée de tout l'écosystème Expo",
    critique: true,  impact: "fort",
    prudence: "Mise à jour SDK = migration majeure (expo upgrade). Toujours lire le migration guide avant.",
    category: "expo",
  },
  "expo-router": {
    role:     "Routing fichier-based (v4) — navigation principale de l'app",
    critique: true,  impact: "fort",
    prudence: "Fortement couplé à expo et react-native-screens. Tester toutes les routes après mise à jour.",
    category: "expo",
  },
  "expo-constants": {
    role:     "Accès aux constantes build (projectId EAS, app.json extra)",
    critique: true,  impact: "faible",
    prudence: "Requis pour lire l'EAS projectId en runtime. Ne pas mettre à jour indépendamment d'expo.",
    category: "expo",
  },
  "expo-font": {
    role:     "Chargement des polices personnalisées (Inter, etc.)",
    critique: true,  impact: "faible",
    prudence: "Écran blanc possible si les polices ne sont pas chargées avant le premier rendu.",
    category: "expo",
  },
  "expo-haptics": {
    role:     "Retour haptique iOS et Android",
    critique: false, impact: "faible",
    prudence: "Fonctionnel sur simulateur iOS ; silencieux sur certains Android. Pas d'impact build critique.",
    category: "expo",
  },
  "expo-image": {
    role:     "Composant image optimisé (cache disque, WebP, lazy load)",
    critique: false, impact: "moyen",
    prudence: "Module natif — impact sur taille de l'app. Vérifier la compatibilité Hermes après mise à jour.",
    category: "expo",
  },
  "expo-linear-gradient": {
    role:     "Dégradés natifs sur iOS et Android",
    critique: false, impact: "faible",
    prudence: "Rendu légèrement différent entre iOS (Core Graphics) et Android (Canvas). Tester visuellement.",
    category: "expo",
  },
  "expo-linking": {
    role:     "Deep links (scheme etat-de-crise://) et ouverture d'URL",
    critique: true,  impact: "faible",
    prudence: "Requis pour l'OAuth et les notifications avec action. Vérifier le scheme dans app.json.",
    category: "expo",
  },
  "expo-splash-screen": {
    role:     "Contrôle du splash screen natif (masquage différé)",
    critique: true,  impact: "faible",
    prudence: "Si SplashScreen.hideAsync() n'est pas appelé, l'app reste bloquée sur le splash.",
    category: "expo",
  },
  "expo-status-bar": {
    role:     "Gestion de la barre de statut iOS/Android",
    critique: false, impact: "faible",
    prudence: "Style différent entre iOS (barStyle) et Android (translucent). Tester sur les deux.",
    category: "expo",
  },
  "expo-system-ui": {
    role:     "Couleur de la barre de navigation Android et comportement système",
    critique: false, impact: "faible",
    prudence: "Peu documenté. Impact cosmétique uniquement sur Android. Vérifier sur différents launchers.",
    category: "expo",
  },
  "expo-web-browser": {
    role:     "Navigateur in-app pour OAuth (Supabase Auth, account-link)",
    critique: true,  impact: "faible",
    prudence: "Requis pour les redirects OAuth. Sans ce module, l'auth sociale ne fonctionne pas.",
    category: "expo",
  },
  "@expo/cli": {
    role:     "CLI Expo (expo start, expo export) — outil de développement",
    critique: true,  impact: "faible",
    prudence: "Version doit correspondre au SDK expo. Utilisé en dev uniquement, pas dans le bundle.",
    category: "expo",
  },
  "@expo/ngrok": {
    role:     "Tunnel HTTPS local pour tester sur device physique (expo start --tunnel)",
    critique: false, impact: "faible",
    prudence: "Dev uniquement. Nécessite un compte ngrok si le quota gratuit est dépassé.",
    category: "expo",
  },
  "@expo/vector-icons": {
    role:     "Icônes vectorielles (MaterialCommunityIcons — utilisées massivement dans l'UI)",
    critique: true,  impact: "moyen",
    prudence: "Les noms d'icônes peuvent changer entre versions majeures. Auditer après mise à jour.",
    category: "expo",
  },
  "@expo-google-fonts/inter": {
    role:     "Police Inter — utilisée dans le design system UI",
    critique: false, impact: "faible",
    prudence: "Bundle statique — pas de mise à jour fréquente. Vérifier si toutes les graisses sont chargées.",
    category: "expo",
  },
  "expo-notifications": {
    role:     "Notifications push iOS et Android (rétention, événements jeu)",
    critique: true,  impact: "fort",
    prudence: "Native module. ^ peut introduire des breaking changes sur les permissions. Tester sur device réel.",
    category: "expo",
  },
  "expo-secure-store": {
    role:     "Stockage chiffré des tokens d'entitlement et session (SecureStore)",
    critique: true,  impact: "fort",
    prudence: "Limite 2 048 bytes/clé sur iOS Keychain. Ne jamais stocker de JSON volumineux directement.",
    category: "stockage",
  },

  // ── React Native ─────────────────────────────────────────────────────────────
  "react-native": {
    role:     "Framework mobile React Native — runtime principal iOS/Android",
    critique: true,  impact: "fort",
    prudence: "Mise à jour majeure = migration complète (New Architecture, modules natifs). Lire le changelog.",
    category: "react-native",
  },
  "react-native-gesture-handler": {
    role:     "Gestion des gestes tactiles — requis par expo-router et Reanimated",
    critique: true,  impact: "fort",
    prudence: "Doit être wrappé dans <GestureHandlerRootView>. Sans lui, expo-router crashe au démarrage.",
    category: "react-native",
  },
  "react-native-keyboard-controller": {
    role:     "Contrôle avancé du comportement clavier (resize, dismiss, avoid)",
    critique: false, impact: "moyen",
    prudence: "Module natif. Peut interférer avec expo-router sur certains écrans. Tester sur Android.",
    category: "react-native",
  },
  "react-native-reanimated": {
    role:     "Animations natives hautes performances via Worklets (UI Thread)",
    critique: true,  impact: "fort",
    prudence: "Requiert react-native-worklets. Plugin Babel obligatoire. Incompatible avec certains profilers.",
    category: "react-native",
  },
  "react-native-safe-area-context": {
    role:     "SafeAreaView, useSafeAreaInsets — gestion des encarts écran (notch, home bar)",
    critique: true,  impact: "faible",
    prudence: "Requis par expo-router. Sans <SafeAreaProvider>, les insets retournent 0 silencieusement.",
    category: "react-native",
  },
  "react-native-screens": {
    role:     "Navigation native (NativeStackNavigator) — requis par expo-router",
    critique: true,  impact: "fort",
    prudence: "enableScreens() doit être appelé avant le rendu. Requis pour les transitions iOS natives.",
    category: "react-native",
  },
  "react-native-svg": {
    role:     "Rendu SVG natif — carte mondiale, graphiques, icônes vectorielles",
    critique: true,  impact: "fort",
    prudence: "API change entre versions majeures (SvgXml, Path, G). Tester la carte mondiale après update.",
    category: "react-native",
  },
  "react-native-web": {
    role:     "Compatibilité React Native → Web (cible expo web)",
    critique: false, impact: "moyen",
    prudence: "Support partiel des composants RN. Certains modules natifs n'ont pas d'équivalent web.",
    category: "react-native",
  },
  "react-native-worklets": {
    role:     "Threads Worklets partagés — requis par react-native-reanimated",
    critique: false, impact: "fort",
    prudence: "Version strictement couplée à react-native-reanimated. Ne pas mettre à jour indépendamment.",
    category: "react-native",
  },
  "react-native-purchases": {
    role:     "RevenueCat SDK — achats in-app iOS (App Store) et Android (Play Store)",
    critique: true,  impact: "fort",
    prudence: "Native module lourd. ^ peut casser l'API (configure vs configureWith). Tester sandbox après update.",
    category: "paiement",
  },

  // ── Supabase ─────────────────────────────────────────────────────────────────
  "@supabase/supabase-js": {
    role:     "Client Supabase — auth, database (PostgREST), realtime, storage",
    critique: true,  impact: "moyen",
    prudence: "Mise à jour majeure peut changer l'API auth (createClient options). Vérifier le changelog CHANGELOG.md Supabase.",
    category: "supabase",
  },

  // ── Stockage ─────────────────────────────────────────────────────────────────
  "@react-native-async-storage/async-storage": {
    role:     "Persistance locale (saves jeu, préférences, état stratégique)",
    critique: true,  impact: "faible",
    prudence: "Limite 6 Mo sur Android par défaut. Pas de chiffrement. Ne pas stocker de données sensibles.",
    category: "stockage",
  },

  // ── Assets / Données géographiques ──────────────────────────────────────────
  "topojson-client": {
    role:     "Conversion TopoJSON → GeoJSON pour la carte mondiale SVG",
    critique: false, impact: "faible",
    prudence: "Utilisé uniquement pour le rendu carte. Stable — pas de mise à jour fréquente nécessaire.",
    category: "assets",
  },
  "world-atlas": {
    role:     "Données géographiques statiques (frontières pays, TopoJSON 110m/50m)",
    critique: false, impact: "moyen",
    prudence: "Bundle de données volumineuses. Vérifier si seule une résolution est utilisée pour alléger le bundle.",
    category: "assets",
  },
  "jimp": {
    role:     "Traitement images Node.js — génération des assets Play Store (scripts/)",
    critique: false, impact: "faible",
    prudence: "Utilisé uniquement dans les scripts Node (generate-play-store-assets.js). Pas dans le bundle app.",
    category: "assets",
  },
  // ── TypeScript / Build ───────────────────────────────────────────────────────
  "@babel/core": {
    role:     "Compilateur Babel — transformation JS pour Metro bundler",
    critique: true,  impact: "fort",
    prudence: "Version doit rester compatible avec babel-plugin-react-compiler. Ne pas mettre à jour seul.",
    category: "typescript-build",
  },
  "babel-plugin-react-compiler": {
    role:     "Plugin React Compiler (experimental) — optimisations memoïsation auto",
    critique: false, impact: "moyen",
    prudence: "Version beta — breaking changes possibles. Désactiver en cas de bug de rendu inexplicable.",
    category: "typescript-build",
  },
  "typescript": {
    role:     "Typage statique TypeScript — outils de développement",
    critique: true,  impact: "faible",
    prudence: "Version mineure peut durcir le strict mode. Lancer npm run typecheck après chaque mise à jour.",
    category: "typescript-build",
  },
  "tsx": {
    role:     "Exécuteur TypeScript (scripts admin : doctor, preflight, changelog, clean...)",
    critique: false, impact: "faible",
    prudence: "Utilisé uniquement pour les scripts /scripts. Pas dans le bundle app. Mise à jour sans risque.",
    category: "typescript-build",
  },

  // ── Données / State ──────────────────────────────────────────────────────────
  "@tanstack/react-query": {
    role:     "Fetching et cache des données async (classement, alliances, profil)",
    critique: false, impact: "moyen",
    prudence: "v5 a changé l'API (useQuery, onSuccess supprimé). Ne pas migrer v4→v5 sans audit des usages.",
    category: "donnees",
  },
  "@stardazed/streams-text-encoding": {
    role:     "Polyfill encodage texte (TextEncoder/TextDecoder) — requis par Supabase sur Hermes",
    critique: false, impact: "faible",
    prudence: "Polyfill de compatibilité. Retirer si RN intègre nativement TextEncoder dans une version future.",
    category: "donnees",
  },
  "@ungap/structured-clone": {
    role:     "Polyfill structuredClone() — clonage profond d'objets sans référence",
    critique: false, impact: "faible",
    prudence: "Polyfill de compatibilité. Retirer si la cible RN supporte nativement structuredClone.",
    category: "donnees",
  },

  // ── Types TypeScript ─────────────────────────────────────────────────────────
  "@types/geojson": {
    role:     "Types TypeScript pour le format GeoJSON (carte mondiale)",
    critique: false, impact: "faible",
    prudence: "Types uniquement, pas de code runtime. Mise à jour sans risque.",
    category: "typescript-build",
  },
  "@types/react": {
    role:     "Types TypeScript pour React",
    critique: true,  impact: "faible",
    prudence: "Doit correspondre à la version de react. Mise à jour généralement sûre.",
    category: "typescript-build",
  },
  "@types/react-dom": {
    role:     "Types TypeScript pour React DOM (web)",
    critique: false, impact: "faible",
    prudence: "Types uniquement. Doit correspondre à react-dom.",
    category: "typescript-build",
  },
  "@types/topojson-client": {
    role:     "Types TypeScript pour topojson-client",
    critique: false, impact: "faible",
    prudence: "Types uniquement. Mise à jour sans risque.",
    category: "typescript-build",
  },
  "@types/topojson-specification": {
    role:     "Types TypeScript pour la spécification TopoJSON",
    critique: false, impact: "faible",
    prudence: "Types uniquement. Rarement mis à jour.",
    category: "typescript-build",
  },
};

// ── Libellés catégories ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<Category, string> = {
  "runtime-core":     "Runtime Core (React)",
  "expo":             "Packages Expo",
  "react-native":     "Packages React Native",
  "paiement":         "Paiement (RevenueCat)",
  "supabase":         "Backend Supabase",
  "stockage":         "Stockage local",
  "assets":           "Assets / Données géographiques",
  "typescript-build": "TypeScript & Build",
  "donnees":          "Données & State",
};

const CATEGORY_ORDER: Category[] = [
  "runtime-core", "expo", "react-native", "paiement",
  "supabase", "stockage", "assets", "donnees", "typescript-build",
];

// ── Lire package.json ─────────────────────────────────────────────────────────

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
const runtime: Record<string, string> = pkg.dependencies    ?? {};
const dev:     Record<string, string> = pkg.devDependencies ?? {};

// ── Construire les entrées ────────────────────────────────────────────────────

function buildEntries(map: Record<string, string>, scope: "runtime" | "dev"): PkgEntry[] {
  return Object.entries(map).map(([name, declared]) => {
    const meta = CATALOG[name] ?? {
      role:     "—",
      critique: false,
      impact:   "faible" as Impact,
      prudence: "Pas de métadonnées enregistrées pour ce package.",
      category: "typescript-build" as Category,
    };
    return { name, declared, installed: installedVersion(name), scope, meta };
  });
}

const allEntries = [
  ...buildEntries(runtime, "runtime"),
  ...buildEntries(dev, "dev"),
];

// ── Statistiques ──────────────────────────────────────────────────────────────

const totalCount    = allEntries.length;
const criticalCount = allEntries.filter((e) => e.meta.critique).length;
const runtimeCount  = allEntries.filter((e) => e.scope === "runtime").length;
const devCount      = allEntries.filter((e) => e.scope === "dev").length;
const fortCount     = allEntries.filter((e) => e.meta.impact === "fort").length;

// ── Grouper par catégorie ─────────────────────────────────────────────────────

const byCategory = new Map<Category, PkgEntry[]>();
for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);

for (const entry of allEntries) {
  byCategory.get(entry.meta.category)?.push(entry);
}

// ── Générer le Markdown ───────────────────────────────────────────────────────

const now = new Date();
const dateStr = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const IMPACT_BADGE: Record<Impact, string> = {
  faible: "🟢 faible",
  moyen:  "🟡 moyen",
  fort:   "🔴 fort",
};

let md = `# Rapport des dépendances — État de Crise

> Généré le ${dateStr} à ${timeStr}
> Ne pas modifier manuellement — relancer \`npm run deps:report\` pour régénérer.

---

## Résumé

| Indicateur | Valeur |
|---|---|
| Total packages | **${totalCount}** |
| Runtime (dependencies) | ${runtimeCount} |
| Dev (devDependencies) | ${devCount} |
| Critiques | **${criticalCount}** |
| Impact build fort | ${fortCount} |

---

## Packages critiques (${criticalCount})

> Ces packages doivent être mis à jour avec précaution — une régression peut bloquer le build ou crasher l'app.

| Package | Déclarée | Installée | Catégorie |
|---|---|---|---|
`;

for (const e of allEntries.filter((e) => e.meta.critique).sort((a, b) => a.name.localeCompare(b.name))) {
  md += `| \`${e.name}\` | \`${e.declared}\` | \`${e.installed}\` | ${CATEGORY_LABELS[e.meta.category]} |\n`;
}

md += `\n---\n\n`;

// ── Sections par catégorie ────────────────────────────────────────────────────

for (const cat of CATEGORY_ORDER) {
  const entries = byCategory.get(cat);
  if (!entries || entries.length === 0) continue;

  md += `## ${CATEGORY_LABELS[cat]} (${entries.length})\n\n`;
  md += `| Package | Déclarée | Installée | Portée | Critique | Impact build | Rôle |\n`;
  md += `|---|---|---|---|---|---|---|\n`;

  for (const e of entries) {
    const crit   = e.meta.critique ? "⚠️ Oui" : "Non";
    const impact = IMPACT_BADGE[e.meta.impact];
    const scope  = e.scope === "runtime" ? "runtime" : "dev";
    md += `| \`${e.name}\` | \`${e.declared}\` | \`${e.installed}\` | ${scope} | ${crit} | ${impact} | ${e.meta.role} |\n`;
  }

  md += `\n### Notes de prudence\n\n`;
  for (const e of entries) {
    if (e.meta.prudence && e.meta.prudence !== "—") {
      md += `- **\`${e.name}\`** — ${e.meta.prudence}\n`;
    }
  }

  md += `\n---\n\n`;
}

// ── Footer ────────────────────────────────────────────────────────────────────

md += `## Procédure de mise à jour recommandée

1. Vérifier les notes de prudence ci-dessus pour le package ciblé.
2. Mettre à jour **un seul** package à la fois.
3. Lancer \`npm run typecheck\` — corriger les erreurs TypeScript.
4. Lancer \`npm run test:golden\` — vérifier les 40 tests de non-régression.
5. Tester manuellement sur simulateur iOS et Android.
6. Lancer \`npm run build:manifest\` pour capturer l'état avant build EAS.
7. Mettre à jour \`docs/technical_changelog.md\` via \`npm run changelog\`.

---

*Ce rapport est un instantané local — il ne remplace pas \`expo doctor\` ni \`npm audit\`.*
`;

// ── Écrire le fichier ─────────────────────────────────────────────────────────

fs.writeFileSync(OUTPUT_PATH, md, "utf-8");

// ── Console ───────────────────────────────────────────────────────────────────

console.log("");
console.log("┌──────────────────────────────────────────────────────┐");
console.log("│   DEPENDENCY REPORT — ÉTAT DE CRISE                  │");
console.log("└──────────────────────────────────────────────────────┘");
console.log("");
console.log(`  Total packages      : ${totalCount}`);
console.log(`  Runtime             : ${runtimeCount}`);
console.log(`  Dev                 : ${devCount}`);
console.log(`  Critiques           : ${criticalCount}`);
console.log(`  Impact build fort   : ${fortCount}`);
console.log("");

for (const cat of CATEGORY_ORDER) {
  const entries = byCategory.get(cat);
  if (!entries || entries.length === 0) continue;
  console.log(`  ${CATEGORY_LABELS[cat].padEnd(34)} ${entries.length} package(s)`);
}

console.log("");
console.log(`  Rapport écrit → dependencies-report.md`);
console.log("");
