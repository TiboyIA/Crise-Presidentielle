/**
 * add-changelog-entry.ts
 * Prépend une entrée modèle dans docs/technical_changelog.md.
 *
 * Usage : npm run changelog
 *
 * Le script ne modifie que technical_changelog.md.
 * Il ne supprime aucune entrée existante.
 * Remplir manuellement les champs marqués TODO.
 */

import fs   from "fs";
import path from "path";

const ROOT           = process.cwd();
const CHANGELOG_PATH = path.join(ROOT, "docs", "technical_changelog.md");
const INSERT_MARKER  = "<!--CHANGELOG_INSERT_POINT-->";

// ── Date du jour ──────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ── Détecter la prochaine version ─────────────────────────────────────────────

function detectNextVersion(content: string): string {
  // Cherche la version la plus récente : [1.0.0-ops.N]
  const matches = [...content.matchAll(/\[1\.0\.0-ops\.(\d+)\]/g)];
  if (matches.length === 0) return "1.0.0-ops.0";
  const max = Math.max(...matches.map((m) => parseInt(m[1]!)));
  return `1.0.0-ops.${max + 1}`;
}

// ── Lire le fichier existant ──────────────────────────────────────────────────

if (!fs.existsSync(CHANGELOG_PATH)) {
  console.error(`Erreur : ${CHANGELOG_PATH} introuvable.`);
  console.error("Créer d'abord docs/technical_changelog.md.");
  process.exit(1);
}

const existing = fs.readFileSync(CHANGELOG_PATH, "utf-8");

if (!existing.includes(INSERT_MARKER)) {
  console.error(`Erreur : marqueur d'insertion "${INSERT_MARKER}" absent du fichier.`);
  console.error("Ajouter la ligne suivante après l'en-tête :");
  console.error(INSERT_MARKER);
  process.exit(1);
}

// ── Construire l'entrée modèle ────────────────────────────────────────────────

const nextVersion = detectNextVersion(existing);

const template = `
## [${nextVersion}] — ${today} · TODO:type

**TODO: titre court (ex : Ajout moteur X)**

| Champ | Valeur |
|---|---|
| Commit | \`TODO: git log --oneline -1\` |
| Fichiers modifiés | \`TODO: fichiers clés\` |
| Type | TODO: gameplay / UI / backend / build / sécurité / ops / debug |
| Risque | TODO: faible / modéré / élevé / critique |
| Tests effectués | TODO: ex. TypeScript 0 erreur ; npm run test:golden 40/40 |
| Rollback possible | TODO: Oui/Non — explication courte |

**Notes développeur**
TODO: ce qui est non-évident — contrainte cachée, invariant subtil, décision de design.

---

`;

// ── Insérer après le marqueur ─────────────────────────────────────────────────

const updated = existing.replace(INSERT_MARKER, INSERT_MARKER + template);

fs.writeFileSync(CHANGELOG_PATH, updated, "utf-8");

// ── Rapport ───────────────────────────────────────────────────────────────────

console.log("");
console.log(`  ✅  Entrée ${nextVersion} ajoutée dans docs/technical_changelog.md`);
console.log(`  📅  Date : ${today}`);
console.log("");
console.log("  Remplir les champs TODO, puis commiter :");
console.log(`  git add docs/technical_changelog.md`);
console.log(`  git commit -m "docs(changelog): ${nextVersion} — <description>"`);
console.log("");
