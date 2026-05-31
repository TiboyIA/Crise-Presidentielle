import type { OperationType, CountryId, CountryRelation, StrategyResources, StrategyGameState } from "@/types/strategy";
import type { MissionReport, MissionClassification, MissionReportSections, MissionReportOperative, MissionReportIntelligence } from "@/types/missionReport";
import { evaluateCovertOpsCompliance } from "@/logic/covertOpsComplianceEngine";
import { OPERATIONS } from "@/logic/operationEngine";
import { generateWeatherState } from "@/logic/weatherEngine";
import { getOperationWeatherModifier } from "@/logic/operationWeatherModifier";
import { getOperationNarrative } from "@/data/operationNarratives";
import type { WeatherTypeId } from "@/data/weatherEvents";
import { COUNTRIES } from "@/data/countries";

// ── Mots de code pour les missions ───────────────────────────────────────────

const CODE_WORDS = [
  "LOUP", "AIGLE", "CORBEAU", "OMBRE", "ACIER", "DIAMANT", "BRUME",
  "DELTA", "SIGMA", "OMEGA", "ZEPHYR", "HYDRE", "SPHINX", "FALKON",
  "ARCTIS", "ONYX", "KRAKEN", "LYNX", "TALON", "VORTEX",
];

function missionCode(reportIndex: number, mandateDay: number): string {
  const word = CODE_WORDS[(reportIndex + mandateDay) % CODE_WORDS.length]!;
  const num = String((reportIndex * 7 + mandateDay) % 900 + 100);
  return `OP-${word}-${num}`;
}

// ── Classification ────────────────────────────────────────────────────────────

function classificationFor(type: OperationType, success: boolean): MissionClassification {
  if (type === "military_operation" || type === "steal_intel" || type === "sabotage") {
    return success ? "TOP SECRET" : "SECRET";
  }
  if (type === "cyber_attack" || type === "espionage") return "SECRET";
  return "CONFIDENTIEL";
}

// ── Données opératives ────────────────────────────────────────────────────────

const UNITS: Record<OperationType, string> = {
  espionage:          "Section Renseignement · 1 officier traitant + 2 sources locales",
  steal_intel:        "Unité SIGINT · 4 opérateurs spécialisés exfiltration",
  cyber_attack:       "COMCYBER · Équipe d'intrusion réseau — 6 analystes",
  influence_campaign: "Direction Communication Stratégique · 12 agents médias",
  sabotage:           "Section Action · Unité Alpha — 5 opérateurs clandestins",
  sanction:           "Direction des Affaires Économiques · Équipe juridique internationale",
  sign_treaty:        "Corps diplomatique · Délégation bilatérale — 8 négociateurs",
  diplomatic_aid:     "Service de Coopération — Délégation humanitaire · 15 personnels",
  reinforce_cyber:    "COMCYBER · Équipe Défense Active — 9 ingénieurs systèmes",
  military_operation: "EMA · Groupement Tactique Interarmes — 80 hommes engagés",
};

const ENTRY_VECTORS: Record<OperationType, (success: boolean) => string> = {
  espionage:          () => "Couverture diplomatique — contact via réseau de sources locales",
  steal_intel:        (s) => s ? "Intrusion réseau à distance — exploitation d'une faille non corrigée" : "Tentative d'accès via vecteur zero-day — détectée avant déploiement complet",
  cyber_attack:       (s) => s ? "Intrusion numérique — injection de payload via protocole compromis" : "Tentative d'intrusion bloquée par pare-feu de nouvelle génération adverse",
  influence_campaign: () => "Canaux médiatiques ouverts — diffusion via relais tiers certifiés",
  sabotage:           (s) => s ? "Infiltration terrestre nocturne — périmètre cible contourné" : "Tentative d'approche terrain — contre-mesures adverses actives détectées",
  sanction:           () => "Canal diplomatique officiel — coordination institutions financières alliées",
  sign_treaty:        () => "Voie diplomatique formelle — cérémonie bilatérale organisée",
  diplomatic_aid:     () => "Voie officielle — acheminement via convoi diplomatique sécurisé",
  reinforce_cyber:    () => "Infrastructure nationale — déploiement en réseau sécurisé intrabandes",
  military_operation: (s) => s ? "Axe d'approche principal — manœuvre combinée air-sol" : "Axe d'approche initial — résistance adverse supérieure aux estimations initiales",
};

const EXTRACTION: Record<OperationType, (success: boolean) => string> = {
  espionage:          () => "Extraction confirmée — agent en lieu sûr, couverture intacte",
  steal_intel:        (s) => s ? "Extraction réussie — aucune trace laissée dans les systèmes cibles" : "Repli d'urgence — connexion coupée avant compromission complète",
  cyber_attack:       (s) => s ? "Désengagement propre — aucune attribution possible" : "Retrait automatique — outils partiellement exposés, analyse en cours",
  influence_campaign: () => "N/A — opération ouverte à vocation publique",
  sabotage:           (s) => s ? "Extraction sécurisée — exfiltration par itinéraire secondaire" : "Repli immédiat — aucun agent compromis, matériel sensible récupéré",
  sanction:           () => "N/A — mesures en vigueur, suivi diplomatique assuré",
  sign_treaty:        () => "N/A — accord signé, équipe de négociation rentrée",
  diplomatic_aid:     () => "N/A — délégation de retour, mission achevée",
  reinforce_cyber:    () => "N/A — équipes en place, monitoring actif",
  military_operation: (s) => s ? "Extraction ordonnée — unités en cours de recréditement" : "Repli tactique — unités en réorganisation sur positions initiales",
};

const COVER: Record<OperationType, (success: boolean) => string> = {
  espionage:          () => "Couverture préservée — identité des sources non compromise",
  steal_intel:        (s) => s ? "Couverture préservée — aucune trace exploitable laissée" : "Couverture préservée — repli avant exposition",
  cyber_attack:       (s) => s ? "Attribution impossible — vecteurs d'attaque chiffrés" : "Attribution partielle possible — outils exposés, analyse adversariale probable",
  influence_campaign: () => "Opération ouverte — couverture non requise",
  sabotage:           (s) => s ? "Couverture préservée — aucun lien établi avec la France" : "Couverture préservée — repli avant identification",
  sanction:           () => "Action officielle et publique — couverture non requise",
  sign_treaty:        () => "Action officielle et publique — couverture non requise",
  diplomatic_aid:     () => "Action officielle et publique — couverture non requise",
  reinforce_cyber:    () => "Opération interne — classification nationale maintenue",
  military_operation: (s) => s ? "Opération attribuable — communiqué officiel préparé" : "Opération attribuable — déni plausible en cours d'évaluation",
};

// ── Niveau de menace ──────────────────────────────────────────────────────────

function threatLevel(relation: CountryRelation): string {
  switch (relation.status) {
    case "hostile":  return "Critique — contre-espionnage adverse en alerte maximale";
    case "rival":    return "Élevée — surveillance adverse renforcée, fenêtres opérationnelles réduites";
    case "neutral":  return "Modérée — présence adverse standard, opération dans les paramètres";
    case "friendly": return "Faible — environnement coopératif, risque de contre-mesures limité";
    case "allied":   return "Très faible — partenaire stratégique, coordination facilitée";
    default:         return "Indéterminée";
  }
}

// ── Sections du rapport ───────────────────────────────────────────────────────

function buildSections(
  type: OperationType,
  success: boolean,
  targetCountry: string,
  relationStatus: string,
  weatherLabel: string,
  rewardsGained: Partial<Record<string, number>>,
  costPaid: Partial<Record<string, number>>,
  relationDelta: number,
  rankingPoints: number,
): MissionReportSections {
  const op = OPERATIONS[type];
  const directorite = [
    "military_operation", "sabotage", "steal_intel",
  ].includes(type) ? "le Chef d'état-major des armées et de la Direction Générale des Services Extérieurs" : "la Direction Générale des Services Extérieurs";

  const rewardDesc = Object.entries(rewardsGained)
    .filter(([, v]) => v && v > 0)
    .map(([k, v]) => `${v} unités ${k}`)
    .join(", ") || "aucun gain matériel direct";

  const costDesc = Object.entries(costPaid)
    .filter(([, v]) => v && v > 0)
    .map(([k, v]) => `${v} ${k}`)
    .join(", ");

  const relStr = relationDelta > 0
    ? `amélioration de ${relationDelta} points du score bilatéral`
    : relationDelta < 0
    ? `dégradation de ${Math.abs(relationDelta)} points du score bilatéral`
    : "score diplomatique stable";

  const objectif = `Mission autorisée par ordre présidentiel et sur recommandation de ${directorite}. Objectif déclaré : ${op.description.toLowerCase()} en direction de ${targetCountry}. Le contexte diplomatique bilatéral est évalué comme ${relationStatus} au moment du lancement. Cette opération a été planifiée en réponse à une analyse stratégique de la situation régionale, avec un niveau de priorité ${op.isOffensive ? "élevé" : "standard"}. Le dossier porte la mention de classification applicable à toutes les communications afférentes.`;

  const planification = `Les équipes opérationnelles ont reçu leurs ordres de mission 48 heures avant l'engagement effectif. Les ressources engagées comprennent : ${costDesc}. L'analyse de la menace adverse a été actualisée 24 heures avant le départ, tenant compte des conditions météorologiques (${weatherLabel}) et du profil de contre-espionnage de la cible. La fenêtre d'engagement a été sélectionnée sur la base des paramètres de risque calculés par les services d'analyse. Un plan d'extraction de secours a été activé en parallèle de la mission principale, avec des points de repli définis à intervalles réguliers.`;

  const execution = success
    ? `L'opération a été engagée selon le chronogramme prévu. Les équipes ont progressé vers leur objectif sans rencontrer d'opposition significative inattendue. Les conditions opérationnelles se sont révélées conformes aux estimations préalables. La phase active de la mission a été exécutée avec précision, les opérateurs ayant adapté leur approche aux contraintes terrain de dernière minute. Le retrait s'est effectué dans les délais impartis, sans incident majeur à signaler au commandement.`
    : `L'opération a été engagée selon le chronogramme prévu mais a rencontré des obstacles imprévus dès la phase active. Les équipes ont été confrontées à des contre-mesures adverses supérieures aux estimations initiales. Une décision de commandement a ordonné l'interruption de la mission avant l'atteinte de l'objectif principal, conformément au protocole de gestion des risques. Le repli s'est effectué selon les plans alternatifs prévus. Aucune perte humaine n'est à déplorer, et la couverture opérationnelle a été maintenue dans un état satisfaisant.`;

  const resultats = success
    ? `La mission est évaluée comme un succès complet par les services analystes. Gains enregistrés : ${rewardDesc}. Impact diplomatique : ${relStr}. Score de classement stratégique : +${rankingPoints} points. L'opération contribue positivement aux objectifs stratégiques du mandat en cours. Le rapport coût-efficacité est jugé favorable par le Comité d'Évaluation des Opérations Extérieures. Aucun incident de nature à compromettre les intérêts français n'a été relevé.`
    : `La mission est évaluée comme un échec opérationnel partiel. Aucun gain significatif n'a été obtenu au regard des objectifs primaires. Impact diplomatique : ${relStr}. Score de classement : +${rankingPoints} points (participation seule). Les ressources engagées (${costDesc}) ne pourront pas être récupérées. Le Comité d'Évaluation recommande une analyse des causes profondes avant toute réengagement sur cette cible. Le bilan humain et matériel reste dans les limites acceptables.`;

  const recommandations = success
    ? `Fort du succès de cette opération, les services recommandent de consolider les avantages acquis par une action de suivi dans un délai de 15 à 30 jours de mandat. Les équipes opérationnelles sont disponibles pour un réengagement après la période de recréditement standard. L'exploitation des renseignements obtenus doit être effectuée en priorité par les cellules d'analyse dans les 72 heures. Une surveillance active des réactions adverses est recommandée pour les 10 prochains jours. Le profil opérationnel de cette cible est à mettre à jour dans la base de données des services.`
    : `Suite à cet échec, les services recommandent une période de suspension des opérations sur cette cible d'au minimum 20 jours de mandat. Une revue de doctrine opérationnelle est conseillée avant tout réengagement. Les techniques et vecteurs utilisés doivent être considérés comme potentiellement compromis et remplacés. Un renforcement préalable des capacités (${op.requiredBuilding ? `niveau ${op.requiredBuilding.id} requis` : "ressources opérationnelles"}) est vivement recommandé. Le service analyse préparera un rapport de retex dans les 48 heures.`;

  return { objectif, planification, execution, resultats, recommandations };
}

// ── Fonction principale ───────────────────────────────────────────────────────

export interface MissionReportParams {
  type:          OperationType;
  success:       boolean;
  targetCountryId: CountryId;
  relation:      CountryRelation;
  mandateDay:    number;
  rewards:       Partial<StrategyResources>;
  cost:          Partial<StrategyResources>;
  relationDelta: number;
  rankingPoints: number;
  reportIndex:   number;
  gameState?:    StrategyGameState;
}

export function generateMissionReport(params: MissionReportParams): MissionReport {
  const {
    type, success, targetCountryId, relation,
    mandateDay, rewards, cost, relationDelta, rankingPoints, reportIndex, gameState,
  } = params;

  const op              = OPERATIONS[type];
  const country         = COUNTRIES[targetCountryId];
  const targetCountryName = country?.name ?? targetCountryId;
  const narrative       = getOperationNarrative(type, success);
  const classification  = classificationFor(type, success);
  const code            = missionCode(reportIndex, mandateDay);

  // Météo
  const weather     = generateWeatherState(mandateDay);
  const typeId      = weather.typeDef.id as WeatherTypeId;
  const wm          = getOperationWeatherModifier(typeId, type);
  const weatherImpact = wm.modifier !== 0
    ? `${wm.modifier > 0 ? "+" : ""}${Math.round(wm.modifier * 100)} % — ${wm.label}`
    : "Conditions neutres — sans incidence sur l'opération";

  const intelligence: MissionReportIntelligence = {
    threatLevel:   threatLevel(relation),
    successRate:   type === "espionage" ? 0.85 : type === "steal_intel" ? 0.60 : 0.65,
    weatherLabel:  weather.typeDef.label,
    weatherImpact,
  };

  const operative: MissionReportOperative = {
    unitsLabel:       UNITS[type],
    entryVector:      ENTRY_VECTORS[type](success),
    extractionStatus: EXTRACTION[type](success),
    coverStatus:      COVER[type](success),
  };

  const rewardsGained = rewards as Partial<Record<string, number>>;
  const costPaid      = cost as Partial<Record<string, number>>;

  const sections = buildSections(
    type, success, targetCountryName, relation.status,
    weather.typeDef.label,
    rewardsGained, costPaid, relationDelta, rankingPoints,
  );

  return {
    id:               `${code}-${Date.now()}`,
    operationType:    type,
    operationName:    op.name,
    targetCountryId,
    targetCountryName,
    mandateDay,
    timestamp:        Date.now(),
    outcome:          success ? "success" : "failure",
    classification,
    missionCode:      code,
    narrativeTitle:   narrative.title,
    sections,
    operative,
    intelligence,
    rewardsGained,
    costPaid,
    relationDelta,
    rankingPoints,
    covertCompliance: gameState
      ? evaluateCovertOpsCompliance(type, success, gameState)
      : undefined,
  };
}
