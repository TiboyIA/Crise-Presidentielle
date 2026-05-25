import type { SpyOp, SpyOpType, SpyResult } from "@/services/SpyService";

export type NarrativeClassification = "CONFIDENTIEL" | "SECRET" | "TRÈS SECRET";
export type NarrativeOutcome = "success" | "failure" | "blocked" | "pending";

export interface NarrativeReport {
  title: string;
  classification: NarrativeClassification;
  outcome: NarrativeOutcome;
  summary: string;
  details: string[];
  consequences: string[];
  recommendation: string;
}

const DOCTRINE_LABELS: Record<string, string> = {
  democratique:   "Réformateur",
  securitaire:    "Protecteur",
  technocratique: "Technocrate",
  populiste:      "Populaire",
  autoritaire:    "Autoritaire",
  souverainiste:  "Souverainiste",
  ecologiste:     "Écologiste",
  liberal:        "Libéral",
};

const BLOCKED_REASON_LABELS: Record<string, string> = {
  "target-protected-new":   "La cible bénéficie d'une immunité de compte récent.",
  "target-protected-quota": "Le quota d'opérations sur cette cible a été atteint pour ce cycle.",
  "target-no-score":        "La cible ne dispose d'aucun score classé cette saison.",
  "defense-intercepted":    "L'opération a été interceptée par le dispositif de défense adverse.",
  "intel-network-blocked":  "Le réseau de renseignement adverse a neutralisé l'intrusion.",
};

function hashId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = (((h << 5) + h) ^ id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(seed: number, arr: readonly T[]): T {
  return arr[seed % arr.length]!;
}

function classificationFor(opType: SpyOpType): NarrativeClassification {
  if (opType === "score_range")   return "TRÈS SECRET";
  if (opType === "doctrine_scan") return "SECRET";
  return "CONFIDENTIEL";
}

// ── Opération en attente ──────────────────────────────────────────────────────

const PENDING_SUMMARIES: Record<SpyOpType, string> = {
  intel_probe:   "Nos agents sont en position. Le canal d'exfiltration est ouvert, en attente de confirmation de terrain.",
  doctrine_scan: "L'analyse est en cours de traitement. Les données brutes sont en cours d'interprétation par nos équipes analytiques.",
  score_range:   "Le sondage de capacité est en attente de résolution. Aucune estimation fiable n'est disponible à ce stade.",
};

const PENDING_TITLES: Record<SpyOpType, string> = {
  intel_probe:   "Opération en Cours",
  doctrine_scan: "Analyse en Cours",
  score_range:   "Évaluation en Cours",
};

function buildPending(op: SpyOp, target: string): NarrativeReport {
  return {
    title:          `${PENDING_TITLES[op.op_type]} — ${target}`,
    classification: classificationFor(op.op_type),
    outcome:        "pending",
    summary:        PENDING_SUMMARIES[op.op_type],
    details:        ["L'opération est en attente de résolution."],
    consequences:   ["Les résultats seront disponibles à l'échéance prévue."],
    recommendation: "Attendez la résolution de l'opération avant d'engager de nouvelles ressources sur cette cible.",
  };
}

// ── Opération bloquée ─────────────────────────────────────────────────────────

const BLOCKED_SUMMARIES: Record<SpyOpType, readonly string[]> = {
  intel_probe: [
    "L'opération a été compromise avant extraction. La cible bénéficie d'une protection renforcée que nos équipes n'ont pas pu contourner.",
    "Un agent de liaison a été identifié par les contre-services adverses. L'opération a été avortée pour préserver le réseau.",
    "Le réseau local a été démantelé avant d'atteindre ses objectifs. Toute nouvelle tentative exposera davantage nos agents.",
    "La cible a renforcé ses contre-mesures après détection d'une activité anormale sur ses communications.",
  ],
  doctrine_scan: [
    "L'analyse doctrinale a échoué face aux protocoles de sécurité adverses. Aucune donnée exploitable n'a pu être extraite.",
    "Le profil cible n'a pas pu être établi. Nos équipes recommandent de différer l'opération et de reconstruire le réseau.",
    "Une tentative de cartographie doctrinale a été détectée et neutralisée avant d'atteindre ses objectifs analytiques.",
  ],
  score_range: [
    "L'évaluation des capacités adverses a été bloquée. Le risque diplomatique est jugé supérieur au gain informationnel attendu.",
    "Nos équipes n'ont pas pu pénétrer les défenses adverses. Une approche différente ou une cible alternative sera nécessaire.",
    "La tentative de sondage de capacité a été détectée et neutralisée par les équipes de contre-espionnage adverses.",
  ],
};

const BLOCKED_CONSEQUENCES: Record<SpyOpType, readonly string[]> = {
  intel_probe:   ["Aucune donnée d'identification exploitable n'a été obtenue.", "L'avantage informationnel adverse est maintenu."],
  doctrine_scan: ["Le profil décisionnel de la cible reste inconnu.", "L'avantage stratégique adverse est préservé."],
  score_range:   ["Aucune estimation de capacité n'a pu être établie.", "La position relative de la cible reste indéterminée."],
};

const BLOCKED_RECOMMENDATIONS: Record<SpyOpType, readonly string[]> = {
  intel_probe: [
    "Attendez le délai de récupération avant de tenter une nouvelle opération sur cette cible.",
    "Renforcez votre infrastructure de renseignement avant de relancer une opération similaire.",
    "Envisagez une approche alternative ou ciblez une autre vulnérabilité adverse.",
  ],
  doctrine_scan: [
    "Différez toute nouvelle tentative d'analyse doctrinale sur cette cible.",
    "Renforcez vos capacités analytiques avant de relancer une opération similaire.",
  ],
  score_range: [
    "Optez pour une opération moins exposée pour évaluer les capacités adverses.",
    "Envisagez de cibler les vulnérabilités périphériques plutôt qu'une évaluation directe.",
  ],
};

const BLOCKED_TITLES: Record<SpyOpType, readonly string[]> = {
  intel_probe:   ["Infiltration Avortée", "Opération Compromise", "Réseau Démantelé"],
  doctrine_scan: ["Analyse Bloquée", "Cartographie Avortée"],
  score_range:   ["Évaluation Neutralisée", "Sondage Intercepté"],
};

function buildBlocked(op: SpyOp, target: string, result: SpyResult | null): NarrativeReport {
  const seed = hashId(op.id);
  const reasonText = result?.blocked_reason
    ? (BLOCKED_REASON_LABELS[result.blocked_reason] ?? "Opération bloquée par les défenses adverses.")
    : "Opération bloquée par les défenses adverses.";

  return {
    title:          `${pick(seed, BLOCKED_TITLES[op.op_type])} — ${target}`,
    classification: classificationFor(op.op_type),
    outcome:        "blocked",
    summary:        pick(seed + 1, BLOCKED_SUMMARIES[op.op_type]),
    details:        [reasonText],
    consequences:   [...BLOCKED_CONSEQUENCES[op.op_type]],
    recommendation: pick(seed + 2, BLOCKED_RECOMMENDATIONS[op.op_type]),
  };
}

// ── Opération réussie ─────────────────────────────────────────────────────────

const SUCCESS_SUMMARIES: Record<SpyOpType, readonly string[]> = {
  intel_probe: [
    "Nos agents ont infiltré les circuits administratifs adverses sans déclencher d'alerte. Les informations ont été extraites avec succès.",
    "Un lot de documents stratégiques a été extrait avant fermeture du canal. Aucune alerte n'a été déclenchée.",
    "L'opération de reconnaissance s'est conclue avec succès. Le renseignement obtenu est immédiatement exploitable.",
    "Le réseau d'infiltration a fonctionné comme prévu. Les données extraites permettront d'affiner notre stratégie.",
  ],
  doctrine_scan: [
    "L'analyse doctrinale adverse a permis d'identifier la posture stratégique de la cible avec précision.",
    "Nos analystes ont cartographié le profil décisionnel de la cible. Ces informations éclairent nos options diplomatiques.",
    "La doctrine adverse a été confirmée sans incident. Le profil de la cible est désormais établi avec fiabilité.",
    "L'opération d'analyse a extrait des données doctrinales exploitables sans exposer notre réseau.",
  ],
  score_range: [
    "L'évaluation des capacités adverses a été réalisée avec succès. Les analystes disposent d'une estimation fiable.",
    "Le renseignement confirme l'étendue des ressources adverses. La fenêtre d'exploitation restera ouverte peu de temps.",
    "Les données de performance ont été extraites avec succès. Ces estimations guideront notre positionnement stratégique.",
    "L'opération de sondage s'est conclue sans incident. Les analystes estiment que ces données restent valides à court terme.",
  ],
};

const SUCCESS_CONSEQUENCES: Record<SpyOpType, readonly string[]> = {
  intel_probe:   ["Un avantage informationnel a été obtenu.", "Ces données peuvent orienter vos décisions stratégiques."],
  doctrine_scan: ["Le profil décisionnel adverse est désormais établi.", "Ces informations peuvent guider vos choix diplomatiques."],
  score_range:   ["Une estimation fiable de la puissance adverse est disponible.", "Ces données permettent d'affiner votre positionnement stratégique."],
};

const SUCCESS_RECOMMENDATIONS: Record<SpyOpType, readonly string[]> = {
  intel_probe: [
    "Exploitez ces informations dans vos décisions stratégiques avant qu'elles ne deviennent obsolètes.",
    "Les analystes recommandent de croiser ces données avec d'autres sources disponibles.",
    "Ces renseignements sont sensibles — leur utilisation doit rester discrète.",
  ],
  doctrine_scan: [
    "Adaptez votre posture diplomatique en fonction du profil doctrinal identifié.",
    "Ces informations sont temporaires — les doctrines adverses peuvent évoluer rapidement.",
  ],
  score_range: [
    "Utilisez cette estimation pour calibrer vos alliances et vos priorités stratégiques.",
    "Ces données ont une durée de vie limitée — les scores adverses fluctuent rapidement.",
  ],
};

const SUCCESS_TITLES: Record<SpyOpType, readonly string[]> = {
  intel_probe:   ["Rapport d'Infiltration", "Dossier de Reconnaissance", "Rapport Intel"],
  doctrine_scan: ["Analyse Doctrinale", "Cartographie Stratégique"],
  score_range:   ["Évaluation de Capacité", "Estimation de Performance"],
};

function buildDetailsForSuccess(opType: SpyOpType, result: SpyResult): string[] {
  const details: string[] = [];
  if (opType === "intel_probe") {
    if (result.country)  details.push(`Pays : ${result.country.replace(/_/g, " ")}`);
    if (result.doctrine) details.push(`Doctrine : ${DOCTRINE_LABELS[result.doctrine] ?? result.doctrine}`);
  } else if (opType === "doctrine_scan") {
    if (result.doctrine) details.push(`Doctrine confirmée : ${DOCTRINE_LABELS[result.doctrine] ?? result.doctrine}`);
    if (result.days_min != null && result.days_max != null) {
      details.push(`Durée de mandat estimée : ${result.days_min}–${result.days_max} jours`);
    }
  } else if (opType === "score_range") {
    if (result.score_min != null && result.score_max != null) {
      details.push(`Score estimé : ${result.score_min.toLocaleString("fr-FR")} – ${result.score_max.toLocaleString("fr-FR")}`);
    }
    if (result.country) details.push(`Profil géopolitique : ${result.country.replace(/_/g, " ")}`);
  }
  details.push("Le rapport est classifié — sa diffusion doit rester restreinte.");
  return details;
}

function buildSuccess(op: SpyOp, target: string, result: SpyResult): NarrativeReport {
  const seed = hashId(op.id);
  return {
    title:          `${pick(seed, SUCCESS_TITLES[op.op_type])} — ${target}`,
    classification: classificationFor(op.op_type),
    outcome:        "success",
    summary:        pick(seed + 1, SUCCESS_SUMMARIES[op.op_type]),
    details:        buildDetailsForSuccess(op.op_type, result),
    consequences:   [...SUCCESS_CONSEQUENCES[op.op_type]],
    recommendation: pick(seed + 2, SUCCESS_RECOMMENDATIONS[op.op_type]),
  };
}

// ── Point d'entrée public ─────────────────────────────────────────────────────

export function buildOperationReport(op: SpyOp): NarrativeReport {
  const result = op.result_json;
  const target = result?.target_name ?? "Cible inconnue";

  if (op.status === "pending") return buildPending(op, target);

  if (op.status === "blocked" || result?.blocked_reason) {
    return buildBlocked(op, target, result);
  }

  if (op.status === "resolved" && result) {
    return buildSuccess(op, target, result);
  }

  return buildBlocked(op, target, null);
}
