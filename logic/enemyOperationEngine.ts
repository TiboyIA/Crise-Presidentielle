import type { OperationType, CountryId, StrategyGameState, StrategyResources } from "@/types/strategy";
import type {
  MissionReport,
  MissionClassification,
  MissionReportSections,
  MissionReportOperative,
  MissionReportIntelligence,
} from "@/types/missionReport";
import { COUNTRIES } from "@/data/countries";
import { OPERATIONS } from "@/logic/operationEngine";
import { generateWeatherState } from "@/logic/weatherEngine";
import { getOperationWeatherModifier } from "@/logic/operationWeatherModifier";
import type { WeatherTypeId } from "@/data/weatherEvents";

// ── Codes de mission adverses ─────────────────────────────────────────────────

const ENEMY_CODE_WORDS = [
  "SERPENT", "RENARD", "BLIZZARD", "TONNERRE", "ÉCLIPSE", "CENDRES",
  "TEMPÊTE", "TÉNÈBRE", "VIPER", "BASTION", "COBRA", "NOCTURNE",
  "MARÉE", "SPECTRE", "ATLAS", "CYCLONE", "POIGNARD", "BASILIC",
  "OMBRE", "ACIER",
];

function enemyMissionCode(day: number, countryId: string): string {
  const idx = (day * 3 + countryId.charCodeAt(0)) % ENEMY_CODE_WORDS.length;
  const word = ENEMY_CODE_WORDS[idx]!;
  const num = String((day * 11 + countryId.charCodeAt(0)) % 900 + 100);
  return `ADVERS-${word}-${num}`;
}

// ── Classification ────────────────────────────────────────────────────────────

function classificationFor(type: OperationType, success: boolean): MissionClassification {
  if (type === "sabotage" || (type === "steal_intel" && success)) return "TOP SECRET";
  if (type === "cyber_attack" || type === "espionage") return "SECRET";
  return "CONFIDENTIEL";
}

// ── Types d'opérations que peut lancer un ennemi ──────────────────────────────

const ENEMY_OP_POOL: OperationType[] = [
  "espionage", "steal_intel", "cyber_attack", "influence_campaign", "sabotage",
];

function selectOpType(countryId: CountryId): OperationType {
  const country = COUNTRIES[countryId];
  if (!country) return "espionage";
  if (country.cyber > 70) {
    const pool: OperationType[] = ["cyber_attack", "steal_intel", "espionage"];
    return pool[Math.floor(Math.random() * pool.length)]!;
  }
  if (country.military > 75) {
    const pool: OperationType[] = ["sabotage", "espionage", "steal_intel"];
    return pool[Math.floor(Math.random() * pool.length)]!;
  }
  return ENEMY_OP_POOL[Math.floor(Math.random() * ENEMY_OP_POOL.length)]!;
}

// ── Sélection de l'attaquant ──────────────────────────────────────────────────

function selectAttacker(state: StrategyGameState): { countryId: CountryId; successRate: number } | null {
  const hostile = state.relations.filter((r) => r.status === "hostile");
  const rival   = state.relations.filter((r) => r.status === "rival");
  if (hostile.length > 0) {
    const r = hostile[Math.floor(Math.random() * hostile.length)]!;
    return { countryId: r.countryId as CountryId, successRate: 0.70 };
  }
  if (rival.length > 0) {
    const r = rival[Math.floor(Math.random() * rival.length)]!;
    return { countryId: r.countryId as CountryId, successRate: 0.50 };
  }
  return null;
}

// ── Effets sur les ressources du joueur (si succès ennemi) ───────────────────

const ENEMY_RESOURCE_EFFECTS: Partial<Record<OperationType, Partial<StrategyResources>>> = {
  espionage:          { intelligence: -15 },
  steal_intel:        { intelligence: -25, technology: -10 },
  cyber_attack:       { cyberDefense: -20, money: -150 },
  influence_campaign: { influence: -10 },
  sabotage:           { military: -15, money: -250 },
};

// ── Construction des 5 sections (style rapport intercepté DGSE) ───────────────

function buildEnemySections(
  type: OperationType,
  success: boolean,
  attackerName: string,
  targetName: string,
  weatherLabel: string,
  effectDesc: string,
): MissionReportSections {
  const op = OPERATIONS[type];

  const objectif = `Document intercepté — Source DGSE, canal ELINT sécurisé. Opération autorisée par le Commandement Stratégique de ${attackerName} dans le cadre de sa politique de pression sur les intérêts français. Objectif déclaré par les services adverses : ${op.description.toLowerCase()} ciblant les structures de ${targetName}. L'opération s'inscrit dans une stratégie de déstabilisation à moyen terme identifiée par nos analystes. Niveau de priorité classé comme élevé par le Commandement de ${attackerName}. Dossier transmis aux cellules opérationnelles adverses 72 heures avant l'engagement.`;

  const planification = `Les services de ${attackerName} ont alloué des ressources opérationnelles spécifiques à cette mission. Les conditions météorologiques (${weatherLabel}) ont été intégrées à leur planification. Les équipes adverses ont réalisé une analyse préalable des dispositifs de protection français, identifiant des fenêtres d'opportunité. Un protocole de déni plausible a été activé en amont par ${attackerName}. Les communications ont été routées via des canaux cryptés non attribuables directement au gouvernement de ${attackerName}.`;

  const execution = success
    ? `Selon les renseignements collectés, l'opération a été exécutée avec succès par les équipes de ${attackerName}. Les opérateurs adverses ont atteint leur objectif en contournant les dispositifs de protection en place. L'action a été menée dans les délais impartis par le Commandement adverse. Les équipes de ${attackerName} ont procédé à leur extraction sans incident majeur signalé. L'opération est considérée comme un succès complet par les services de ${attackerName}.`
    : `Selon nos informations, l'opération adverse a été neutralisée par les contre-mesures françaises. Les équipes de ${attackerName} ont rencontré une résistance supérieure à leurs estimations initiales. Un repli précipité a été ordonné avant l'atteinte de l'objectif primaire. Aucune perte humaine confirmée du côté adverse, mais le matériel opérationnel aurait été partiellement compromis selon nos sources.`;

  const resultats = success
    ? `L'opération est évaluée comme un succès par ${attackerName}. Impact enregistré sur les intérêts français : ${effectDesc}. La DGSE recommande une révision immédiate des protocoles de sécurité dans les secteurs touchés. L'opération contribue aux objectifs stratégiques de ${attackerName} vis-à-vis de la France. Une analyse de post-engagement adverse est en cours selon nos informateurs.`
    : `L'opération adverse a été contrecarrée par les dispositifs de sécurité français. Aucun gain significatif n'a été obtenu par ${attackerName}. Nos services estiment que la tentative a néanmoins permis à l'adversaire de cartographier partiellement nos dispositifs de défense. Une vigilance renforcée est recommandée dans les semaines suivant cette tentative.`;

  const recommandations = success
    ? `Suite à cette opération adverse réussie, la DGSE recommande : renforcement immédiat des dispositifs affectés, révision complète des protocoles de contre-espionnage, et veille accrue sur les activités de ${attackerName}. Les secteurs compromis doivent faire l'objet d'un audit de sécurité dans les 48 heures. Une réponse opérationnelle proportionnée est à évaluer selon les priorités du Commandement.`
    : `Suite à la neutralisation de cette tentative, la DGSE recommande de maintenir le niveau d'alerte actuel et de renforcer la surveillance des activités de ${attackerName}. Les renseignements collectés lors de cette tentative ont permis d'actualiser le profil opérationnel de l'adversaire. Une exploitation complète de ces données est en cours dans les cellules d'analyse.`;

  return { objectif, planification, execution, resultats, recommandations };
}

// ── Fréquence déclenchement ───────────────────────────────────────────────────

export const ENEMY_OP_INTERVAL_HOSTILE = 15;
export const ENEMY_OP_INTERVAL_RIVAL   = 30;

export function shouldTriggerEnemyOp(state: StrategyGameState): boolean {
  const hasHostile = state.relations.some((r) => r.status === "hostile");
  const hasRival   = state.relations.some((r) => r.status === "rival");
  if (!hasHostile && !hasRival) return false;
  const interval = hasHostile ? ENEMY_OP_INTERVAL_HOSTILE : ENEMY_OP_INTERVAL_RIVAL;
  return state.mandateDay - (state.lastEnemyOpAt ?? -999) >= interval;
}

// ── Génération principale ─────────────────────────────────────────────────────

export interface EnemyOpResult {
  report: MissionReport;
  resourceEffects: Partial<StrategyResources>;
}

export function generateEnemyOperation(state: StrategyGameState): EnemyOpResult | null {
  const attacker = selectAttacker(state);
  if (!attacker) return null;

  const { countryId, successRate } = attacker;
  const country = COUNTRIES[countryId];
  if (!country) return null;

  const type    = selectOpType(countryId);
  const op      = OPERATIONS[type];
  const success = Math.random() < successRate;

  const weather = generateWeatherState(state.mandateDay);
  const typeId  = weather.typeDef.id as WeatherTypeId;
  const wm      = getOperationWeatherModifier(typeId, type);
  const weatherImpact = wm.modifier !== 0
    ? `${wm.modifier > 0 ? "+" : ""}${Math.round(wm.modifier * 100)} % — ${wm.label}`
    : "Conditions neutres — sans incidence sur l'opération";

  const resourceEffects = success ? (ENEMY_RESOURCE_EFFECTS[type] ?? {}) : {};
  const effectDesc = Object.entries(resourceEffects)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${k} (${(v as number) > 0 ? "+" : ""}${v})`)
    .join(", ") || "impact limité sur les intérêts français";

  const playerCountryName = COUNTRIES[state.countryId]?.name ?? "France";
  const attackerName = country.name;
  const code         = enemyMissionCode(state.mandateDay, countryId);
  const classification = classificationFor(type, success);

  const sections = buildEnemySections(
    type, success, attackerName, playerCountryName,
    weather.typeDef.label, effectDesc,
  );

  const relationStatus = state.relations.find((r) => r.countryId === countryId)?.status ?? "neutral";
  const threatLvl = relationStatus === "hostile"
    ? "Critique — adversaire stratégique déclaré"
    : "Élevée — pays rival en posture agressive";

  const intelligence: MissionReportIntelligence = {
    threatLevel:  threatLvl,
    successRate,
    weatherLabel:  weather.typeDef.label,
    weatherImpact,
  };

  const operative: MissionReportOperative = {
    unitsLabel:       `Services spéciaux de ${attackerName} — équipe opérationnelle dédiée`,
    entryVector:      success
      ? `Vecteur identifié a posteriori — origine confirmée : ${attackerName}`
      : `Tentative détectée — vecteur neutralisé avant compromission complète`,
    extractionStatus: success
      ? `Exfiltration confirmée — agents adverses hors de portée française`
      : `Repli forcé — agents de ${attackerName} partiellement identifiés`,
    coverStatus:      success
      ? `Couverture adverse maintenue — attribution directe incertaine`
      : `Couverture partiellement compromise — attribution probable : ${attackerName}`,
  };

  const report: MissionReport = {
    id:               `enemy-${code}-${Date.now()}`,
    operationType:    type,
    operationName:    op.name,
    targetCountryId:  state.countryId,
    targetCountryName: playerCountryName,
    mandateDay:       state.mandateDay,
    timestamp:        Date.now(),
    outcome:          success ? "success" : "failure",
    classification,
    missionCode:      code,
    narrativeTitle:   success
      ? `Opération adverse réussie — ${attackerName} contre ${playerCountryName}`
      : `Tentative interceptée — opération de ${attackerName} déjouée`,
    sections,
    operative,
    intelligence,
    rewardsGained:    {},
    costPaid:         resourceEffects as Partial<Record<string, number>>,
    relationDelta:    0,
    rankingPoints:    0,
    perspective:      "enemy",
    attackerCountryId:   countryId,
    attackerCountryName: attackerName,
  };

  return { report, resourceEffects };
}
