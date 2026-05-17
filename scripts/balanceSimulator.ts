/**
 * Simulateur d'équilibrage offline — Président : Nation en Crise
 * ──────────────────────────────────────────────────────────────
 * Outil développeur uniquement. Ne modifie aucun fichier du jeu.
 * Ne s'intègre pas dans l'app joueur.
 *
 * Usage :
 *   pnpm --filter @workspace/etat-de-crise exec tsx scripts/balanceSimulator.ts
 *
 * Ratio de temps (copié de simulationClock.ts) :
 *   1 heure réelle = 4 heures jeu
 *   1 jour mandat  = 24 heures jeu = 6 heures réelles = 360 min réelles
 *   upgradeDuration (game_sec) → min réelles = gameSec / 240
 *   durationDays (game_days)   → min réelles = days × 360
 *   trainingTimeSec (game_sec) → min réelles = gameSec / 240
 */

// ─── Conversion helpers ──────────────────────────────────────────────────────

const REAL_MIN_PER_GAME_SEC  = 1 / 240;  // 60 sec jeu = 0.25 min réelles
const REAL_MIN_PER_GAME_DAY  = 360;      // 1 jour mandat = 6 h réelles

function gamSecToRealMin(s: number): number { return s * REAL_MIN_PER_GAME_SEC; }
function gamDayToRealMin(d: number): number { return d * REAL_MIN_PER_GAME_DAY; }

// ─── Building data ───────────────────────────────────────────────────────────

type ResourceKey = "money" | "influence" | "energy" | "intelligence" | "technology" | "military" | "cyberDefense";
type Resources   = Record<ResourceKey, number>;

const UPGRADE_DURATIONS_SEC = [60, 300, 1200, 3600, 14400, 28800, 57600, 115200, 172800, 259200];
// → real minutes :          [0.25, 1.25,   5,   15,    60,   120,   240,    480,    720,   1080]

function genLevels(
  baseCost: Partial<Resources>,
  baseProd: Partial<Resources>,
  basePower: number,
  count = 10,
): Array<{ cost: Partial<Resources>; prodPerMin: Partial<Resources>; realMinDuration: number; power: number }> {
  return Array.from({ length: count }, (_, i) => {
    const costFactor = Math.pow(1.8, i);
    const prodFactor = Math.pow(1.6, i);
    const cost: Partial<Resources> = {};
    for (const [k, v] of Object.entries(baseCost) as [ResourceKey, number][])
      cost[k] = Math.round(v * costFactor);
    const prod: Partial<Resources> = {};
    for (const [k, v] of Object.entries(baseProd) as [ResourceKey, number][])
      prod[k] = Math.round(v * prodFactor);
    return {
      cost,
      prodPerMin: prod,
      realMinDuration: gamSecToRealMin(UPGRADE_DURATIONS_SEC[i] ?? 259200),
      power: Math.round(basePower * (i + 1) * 1.3),
    };
  });
}

interface BuildingData {
  id: string;
  maxLevel: number;
  unlock?: { buildingId: string; level: number };
  levels: ReturnType<typeof genLevels>;
}

const BUILDINGS: Record<string, BuildingData> = {
  presidential_palace: { id: "presidential_palace", maxLevel: 10, levels: genLevels({ money: 500, influence: 50 }, { influence: 2, money: 10 }, 20) },
  economy_ministry:    { id: "economy_ministry",    maxLevel: 10, levels: genLevels({ money: 300, influence: 20 }, { money: 30, influence: 2 }, 15) },
  defense_ministry:    { id: "defense_ministry",    maxLevel: 10, levels: genLevels({ money: 400, military: 10 }, { military: 8, energy: 2 }, 18) },
  intelligence_ministry: { id: "intelligence_ministry", maxLevel: 10, levels: genLevels({ money: 250, influence: 15 }, { intelligence: 6, technology: 2 }, 12) },
  cyber_ministry:      { id: "cyber_ministry", maxLevel: 10, unlock: { buildingId: "intelligence_ministry", level: 2 }, levels: genLevels({ money: 350, technology: 20 }, { cyberDefense: 7, intelligence: 3 }, 14) },
  energy_ministry:     { id: "energy_ministry",     maxLevel: 10, levels: genLevels({ money: 280, energy: 20 }, { energy: 10, money: 15 }, 13) },
  diplomacy_ministry:  { id: "diplomacy_ministry",  maxLevel: 10, levels: genLevels({ money: 200, influence: 30 }, { influence: 5, money: 10 }, 11) },
  research_center:     { id: "research_center",     maxLevel: 10, levels: genLevels({ money: 400, technology: 30 }, { technology: 5, intelligence: 2 }, 16) },
  central_bank:        { id: "central_bank",  maxLevel: 10, unlock: { buildingId: "economy_ministry", level: 3 }, levels: genLevels({ money: 800, influence: 40 }, { money: 80, influence: 3 }, 22) },
  media_agency:        { id: "media_agency",  maxLevel: 10, unlock: { buildingId: "diplomacy_ministry", level: 2 }, levels: genLevels({ money: 220, influence: 25 }, { influence: 6, money: 8 }, 10) },
  military_hq:         { id: "military_hq",   maxLevel: 10, unlock: { buildingId: "defense_ministry", level: 3 }, levels: genLevels({ money: 600, military: 30 }, { military: 12, energy: 4 }, 25) },
};

// ─── Research data ───────────────────────────────────────────────────────────

interface ResearchData {
  id: string;
  cost: Partial<Resources>;
  realMinDuration: number;
  prerequisites: string[];
}

const RESEARCH: Record<string, ResearchData> = {
  research_cybersec:         { id: "research_cybersec",         cost: { money: 600, technology: 20 }, realMinDuration: gamDayToRealMin(2),  prerequisites: [] },
  research_power_grid:       { id: "research_power_grid",       cost: { money: 800, technology: 15 }, realMinDuration: gamDayToRealMin(6),  prerequisites: [] },
  research_drones:           { id: "research_drones",           cost: { money: 700, technology: 25, intelligence: 10 }, realMinDuration: gamDayToRealMin(7), prerequisites: ["research_cybersec"] },
  research_smart_agriculture:{ id: "research_smart_agriculture", cost: { money: 500, technology: 12 }, realMinDuration: gamDayToRealMin(2), prerequisites: [] },
  research_admin_ai:         { id: "research_admin_ai",         cost: { money: 900, technology: 30 }, realMinDuration: gamDayToRealMin(8),  prerequisites: ["research_cybersec"] },
  research_digital_hospitals:{ id: "research_digital_hospitals", cost: { money: 700, technology: 18 }, realMinDuration: gamDayToRealMin(3), prerequisites: [] },
  research_energy_sovereign: { id: "research_energy_sovereign", cost: { money: 1000, technology: 22 }, realMinDuration: gamDayToRealMin(8), prerequisites: ["research_power_grid"] },
  research_missile_defense:  { id: "research_missile_defense",  cost: { money: 1200, technology: 35 }, realMinDuration: gamDayToRealMin(10), prerequisites: ["research_drones"] },
  research_science_education:{ id: "research_science_education", cost: { money: 600, technology: 10 }, realMinDuration: gamDayToRealMin(3), prerequisites: [] },
  research_strategic_industry:{ id: "research_strategic_industry", cost: { money: 1000, technology: 25 }, realMinDuration: gamDayToRealMin(9), prerequisites: ["research_smart_agriculture"] },
  research_satellites:       { id: "research_satellites",       cost: { money: 1400, technology: 40, intelligence: 20 }, realMinDuration: gamDayToRealMin(12), prerequisites: ["research_drones", "research_missile_defense"] },
  research_missiles:         { id: "research_missiles",         cost: { money: 1500, technology: 45 }, realMinDuration: gamDayToRealMin(12), prerequisites: ["research_missile_defense"] },
  research_military_bases:   { id: "research_military_bases",   cost: { money: 1100, technology: 30 }, realMinDuration: gamDayToRealMin(10), prerequisites: ["research_drones"] },
  research_trade_routes:     { id: "research_trade_routes",     cost: { money: 800, technology: 15, intelligence: 10 }, realMinDuration: gamDayToRealMin(7), prerequisites: ["research_strategic_industry"] },
  research_infowar:          { id: "research_infowar",          cost: { money: 900, technology: 28, intelligence: 15 }, realMinDuration: gamDayToRealMin(8), prerequisites: ["research_cybersec", "research_science_education"] },
};

// ─── Unit data ───────────────────────────────────────────────────────────────

interface UnitData { id: string; baseCost: Partial<Resources>; realMinPerUnit: number; }

const UNITS: Record<string, UnitData> = {
  infantry_mechanized: { id: "infantry_mechanized", baseCost: { money: 150, military: 5 },  realMinPerUnit: gamSecToRealMin(1800) },
  special_forces:      { id: "special_forces",      baseCost: { money: 500, military: 20, intelligence: 15 }, realMinPerUnit: gamSecToRealMin(7200) },
  battle_tank:         { id: "battle_tank",          baseCost: { money: 800, military: 35, energy: 10 }, realMinPerUnit: gamSecToRealMin(10800) },
  fighter_jet:         { id: "fighter_jet",          baseCost: { money: 1200, military: 50, technology: 20 }, realMinPerUnit: gamSecToRealMin(14400) },
  cyber_unit:          { id: "cyber_unit",           baseCost: { money: 400, cyberDefense: 20, technology: 15 }, realMinPerUnit: gamSecToRealMin(5400) },
};

// ─── Simulation state ─────────────────────────────────────────────────────────

interface SimBuilding { id: string; level: number; upgradeEndsAtMin: number | null; }
interface ResearchSlot { inProgressId: string | null; completesAtMin: number | null; completed: string[]; }
interface TrainingSlot { unitId: string | null; qty: number; completesAtMin: number | null; trained: Record<string, number>; }

interface SimState {
  resources:     Resources;
  buildings:     SimBuilding[];
  research:      ResearchSlot;
  training:      TrainingSlot;
  elapsedRealMin: number;
  mandateDay:    number;
  metrics: {
    upgradesCompleted: number;
    researchCompleted: number;
    unitsTrained:      number;
    missionsCompleted: number;
    blockers:          Record<string, number>;  // what we wanted but couldn't afford/do
    productionLog:     Array<{ minMark: number; power: number }>;
    spendLog:          Record<string, number>;  // total money spent per category
  };
}

const INITIAL_RESOURCES: Resources = {
  money: 2000, influence: 100, energy: 200,
  intelligence: 50, technology: 30, military: 80, cyberDefense: 40,
};

function createInitialState(): SimState {
  return {
    resources: { ...INITIAL_RESOURCES },
    buildings: [
      { id: "presidential_palace",   level: 1, upgradeEndsAtMin: null },
      { id: "economy_ministry",      level: 1, upgradeEndsAtMin: null },
      { id: "defense_ministry",      level: 1, upgradeEndsAtMin: null },
      { id: "intelligence_ministry", level: 1, upgradeEndsAtMin: null },
      { id: "energy_ministry",       level: 1, upgradeEndsAtMin: null },
      { id: "diplomacy_ministry",    level: 1, upgradeEndsAtMin: null },
      { id: "research_center",       level: 1, upgradeEndsAtMin: null },
      { id: "cyber_ministry",        level: 0, upgradeEndsAtMin: null },
      { id: "central_bank",          level: 0, upgradeEndsAtMin: null },
      { id: "media_agency",          level: 0, upgradeEndsAtMin: null },
      { id: "military_hq",           level: 0, upgradeEndsAtMin: null },
    ],
    research:  { inProgressId: null, completesAtMin: null, completed: [] },
    training:  { unitId: null, qty: 0, completesAtMin: null, trained: {} },
    elapsedRealMin: 0,
    mandateDay: 0,
    metrics: {
      upgradesCompleted: 0,
      researchCompleted: 0,
      unitsTrained:      0,
      missionsCompleted: 0,
      blockers:          {},
      productionLog:     [],
      spendLog:          {},
    },
  };
}

// ─── Game logic helpers ───────────────────────────────────────────────────────

function canAfford(cost: Partial<Resources>, res: Resources): boolean {
  return (Object.entries(cost) as [ResourceKey, number][]).every(([k, v]) => res[k] >= v);
}

function deductCost(cost: Partial<Resources>, res: Resources): void {
  for (const [k, v] of Object.entries(cost) as [ResourceKey, number][])
    res[k] = Math.max(0, res[k] - v);
}

function isUnlocked(bid: string, buildings: SimBuilding[]): boolean {
  const req = BUILDINGS[bid]?.unlock;
  if (!req) return true;
  const dep = buildings.find(b => b.id === req.buildingId);
  return (dep?.level ?? 0) >= req.level;
}

function computePower(buildings: SimBuilding[], resources: Resources): number {
  const BUILDING_WEIGHTS: Record<string, number> = {
    presidential_palace: 20, economy_ministry: 15, defense_ministry: 18,
    intelligence_ministry: 12, cyber_ministry: 14, energy_ministry: 11,
    diplomacy_ministry: 10, research_center: 16, central_bank: 22,
    media_agency: 9, military_hq: 25,
  };
  const RESOURCE_WEIGHTS: Partial<Record<ResourceKey, number>> = {
    money: 0.01, influence: 0.3, military: 0.5, cyberDefense: 0.4,
    technology: 0.35, intelligence: 0.2, energy: 0.15,
  };
  let power = 0;
  for (const b of buildings) {
    if (b.level === 0) continue;
    power += (BUILDING_WEIGHTS[b.id] ?? 10) * b.level * 1.5;
  }
  for (const [k, w] of Object.entries(RESOURCE_WEIGHTS) as [ResourceKey, number][])
    power += (resources[k] ?? 0) * w;
  return Math.round(power);
}

function prereqsMet(researchId: string, completed: string[]): boolean {
  return (RESEARCH[researchId]?.prerequisites ?? []).every(p => completed.includes(p));
}

function accumulateProduction(state: SimState, minutes: number): void {
  for (const b of state.buildings) {
    if (b.level === 0) continue;
    const def  = BUILDINGS[b.id];
    const lv   = def.levels[b.level - 1];
    if (!lv) continue;
    for (const [k, rate] of Object.entries(lv.prodPerMin) as [ResourceKey, number][])
      state.resources[k] = Math.round(state.resources[k] + rate * minutes);
  }
}

function addBlocker(state: SimState, key: string): void {
  state.metrics.blockers[key] = (state.metrics.blockers[key] ?? 0) + 1;
}

// ─── Profile definitions ─────────────────────────────────────────────────────

interface Profile {
  id: string;
  label: string;
  description: string;
  buildingPriority: string[];      // order to upgrade
  researchPriority: string[];      // order to launch
  unitTrainQueue: Array<{ unitId: string; qty: number }>;
  missionFocus: string;
}

const PROFILES: Profile[] = [
  {
    id: "prudent",
    label: "Prudent",
    description: "Économie stable, diplomatie, puis recherche. Évite les grosses dépenses militaires.",
    buildingPriority: [
      "economy_ministry", "economy_ministry", "diplomacy_ministry",
      "research_center", "energy_ministry", "intelligence_ministry",
      "economy_ministry", "central_bank", "media_agency",
    ],
    researchPriority: ["research_cybersec", "research_digital_hospitals", "research_science_education", "research_smart_agriculture"],
    unitTrainQueue: [{ unitId: "infantry_mechanized", qty: 5 }],
    missionFocus: "economy + diplomacy",
  },
  {
    id: "militaire",
    label: "Militaire",
    description: "Développement militaire en priorité. Bâtiments défense, unités lourdes.",
    buildingPriority: [
      "defense_ministry", "defense_ministry", "defense_ministry",
      "intelligence_ministry", "intelligence_ministry",
      "military_hq", "military_hq",
      "presidential_palace", "research_center",
    ],
    researchPriority: ["research_cybersec", "research_drones", "research_missile_defense", "research_military_bases"],
    unitTrainQueue: [
      { unitId: "infantry_mechanized", qty: 10 },
      { unitId: "battle_tank", qty: 3 },
      { unitId: "special_forces", qty: 2 },
    ],
    missionFocus: "military power",
  },
  {
    id: "economique",
    label: "Économique",
    description: "Maximise la production d'argent. Banque centrale dès que possible.",
    buildingPriority: [
      "economy_ministry", "economy_ministry", "economy_ministry",
      "central_bank", "central_bank",
      "economy_ministry", "energy_ministry", "energy_ministry",
    ],
    researchPriority: ["research_smart_agriculture", "research_strategic_industry", "research_trade_routes", "research_power_grid"],
    unitTrainQueue: [{ unitId: "infantry_mechanized", qty: 3 }],
    missionFocus: "money accumulation + trade",
  },
  {
    id: "recherche",
    label: "Recherche",
    description: "Arbre technologique complet. Sacrifice la production à court terme.",
    buildingPriority: [
      "research_center", "research_center", "intelligence_ministry",
      "intelligence_ministry", "cyber_ministry", "research_center",
      "presidential_palace",
    ],
    researchPriority: [
      "research_cybersec", "research_drones", "research_missile_defense",
      "research_satellites", "research_admin_ai", "research_infowar",
    ],
    unitTrainQueue: [{ unitId: "cyber_unit", qty: 2 }],
    missionFocus: "technology + research tree",
  },
  {
    id: "diplomatie",
    label: "Diplomatie",
    description: "Influence maximale, opérations de soft power.",
    buildingPriority: [
      "diplomacy_ministry", "diplomacy_ministry", "media_agency",
      "media_agency", "presidential_palace", "presidential_palace",
      "research_center", "intelligence_ministry",
    ],
    researchPriority: ["research_science_education", "research_cybersec", "research_infowar", "research_admin_ai"],
    unitTrainQueue: [{ unitId: "special_forces", qty: 1 }],
    missionFocus: "influence + alliances",
  },
  {
    id: "debutant",
    label: "Débutant aléatoire",
    description: "Actions sous-optimales : gros achats prématurés, mauvais ordres de priorité.",
    buildingPriority: [
      "defense_ministry",            // militarise trop tôt
      "presidential_palace",         // prestige avant utile
      "intelligence_ministry",
      "economy_ministry",            // économie en retard
      "defense_ministry",
      "research_center",
      "energy_ministry",
    ],
    researchPriority: [
      "research_drones",             // prérequis manquant → bloqué longtemps
      "research_cybersec",
      "research_smart_agriculture",
    ],
    unitTrainQueue: [
      { unitId: "battle_tank",         qty: 2 }, // trop cher trop tôt
      { unitId: "infantry_mechanized", qty: 5 },
    ],
    missionFocus: "aucun focus clair",
  },
];

// ─── Simulation engine ────────────────────────────────────────────────────────

interface ProfileQueue {
  buildings:  string[];   // mutable copy of priority list
  research:   string[];
  units:      Array<{ unitId: string; qty: number }>;
}

function cloneProfileQueue(p: Profile): ProfileQueue {
  return {
    buildings: [...p.buildingPriority],
    research:  [...p.researchPriority],
    units:     p.unitTrainQueue.map(u => ({ ...u })),
  };
}

function decideAction(state: SimState, queue: ProfileQueue): void {
  const res = state.resources;
  const elapsed = state.elapsedRealMin;

  // ── 1. Start building upgrade (if none in progress) ──────────────────────
  const isUpgrading = state.buildings.some(b => b.upgradeEndsAtMin !== null);
  if (!isUpgrading && queue.buildings.length > 0) {
    let i = 0;
    while (i < queue.buildings.length) {
      const bid = queue.buildings[i];
      const def = BUILDINGS[bid];
      const b   = state.buildings.find(b2 => b2.id === bid);
      if (!def || !b) { i++; continue; }
      if (b.level >= def.maxLevel) { queue.buildings.splice(i, 1); continue; }
      if (!isUnlocked(bid, state.buildings)) {
        addBlocker(state, `🔒 Bâtiment verrouillé : ${bid}`);
        i++; continue;
      }
      const cost = def.levels[b.level]?.cost;
      if (!cost) { i++; continue; }
      if (canAfford(cost, res)) {
        deductCost(cost, res);
        state.metrics.spendLog["buildings"] = (state.metrics.spendLog["buildings"] ?? 0) + (cost.money ?? 0);
        b.upgradeEndsAtMin = elapsed + def.levels[b.level].realMinDuration;
        queue.buildings.splice(i, 1); // remove this entry (one upgrade per entry)
        return;
      } else {
        // Record deficit for most expensive missing resource
        for (const [k, v] of Object.entries(cost) as [ResourceKey, number][]) {
          if (res[k] < v) {
            addBlocker(state, `💸 Manque ${k} pour ${bid} Lv${b.level + 1} (a:${Math.round(res[k])} / besoin:${v})`);
            break;
          }
        }
        break; // stop at first unaffordable — don't skip to next
      }
    }
  }

  // ── 2. Start research (if none in progress) ───────────────────────────────
  if (!state.research.inProgressId && queue.research.length > 0) {
    let i = 0;
    while (i < queue.research.length) {
      const rid = queue.research[i];
      if (state.research.completed.includes(rid)) { queue.research.splice(i, 1); continue; }
      const r = RESEARCH[rid];
      if (!r) { i++; continue; }
      if (!prereqsMet(rid, state.research.completed)) {
        addBlocker(state, `📋 Prérequis manquants pour ${rid}`);
        i++; continue; // try next research
      }
      if (canAfford(r.cost, res)) {
        deductCost(r.cost, res);
        state.metrics.spendLog["research"] = (state.metrics.spendLog["research"] ?? 0) + (r.cost.money ?? 0);
        state.research.inProgressId   = rid;
        state.research.completesAtMin = elapsed + r.realMinDuration;
        queue.research.splice(i, 1);
        return;
      } else {
        for (const [k, v] of Object.entries(r.cost) as [ResourceKey, number][]) {
          if (res[k] < v) {
            addBlocker(state, `💸 Manque ${k} pour recherche ${rid} (a:${Math.round(res[k])} / besoin:${v})`);
            break;
          }
        }
        break;
      }
    }
  }

  // ── 3. Start unit training (if none in progress) ──────────────────────────
  if (!state.training.unitId && queue.units.length > 0) {
    let i = 0;
    while (i < queue.units.length) {
      const { unitId, qty } = queue.units[i];
      const u = UNITS[unitId];
      if (!u) { i++; continue; }
      const totalCost: Partial<Resources> = {};
      for (const [k, v] of Object.entries(u.baseCost) as [ResourceKey, number][])
        totalCost[k] = v * qty;
      if (canAfford(totalCost, res)) {
        deductCost(totalCost, res);
        state.metrics.spendLog["units"] = (state.metrics.spendLog["units"] ?? 0) + ((totalCost.money ?? 0));
        state.training.unitId        = unitId;
        state.training.qty           = qty;
        state.training.completesAtMin = elapsed + u.realMinPerUnit * qty;
        queue.units.splice(i, 1);
        return;
      } else {
        for (const [k, v] of Object.entries(totalCost) as [ResourceKey, number][]) {
          if ((res[k] ?? 0) < v) {
            addBlocker(state, `💸 Manque ${k} pour unité ${unitId}×${qty}`);
            break;
          }
        }
        i++;
      }
    }
  }
}

function runSimulation(profile: Profile, totalRealMin: number): SimState {
  const state   = createInitialState();
  const queue   = cloneProfileQueue(profile);
  const TICK_MIN = 1; // 1 minute per tick
  const powerLogMarks = [10, 60, 1440, totalRealMin].filter(m => m <= totalRealMin);

  for (let t = 0; t < totalRealMin; t += TICK_MIN) {
    state.elapsedRealMin = t;
    state.mandateDay     = Math.floor(t / REAL_MIN_PER_GAME_DAY);

    // Accumulate production for this tick
    accumulateProduction(state, TICK_MIN);

    // Collect completed building upgrade
    for (const b of state.buildings) {
      if (b.upgradeEndsAtMin !== null && t >= b.upgradeEndsAtMin) {
        b.level++;
        b.upgradeEndsAtMin = null;
        state.metrics.upgradesCompleted++;
        state.metrics.missionsCompleted++;   // upgrade_any_building mission
      }
    }

    // Collect completed research
    if (state.research.inProgressId && state.research.completesAtMin !== null && t >= state.research.completesAtMin) {
      state.research.completed.push(state.research.inProgressId);
      state.research.inProgressId   = null;
      state.research.completesAtMin = null;
      state.metrics.researchCompleted++;
    }

    // Collect completed unit training
    if (state.training.unitId && state.training.completesAtMin !== null && t >= state.training.completesAtMin) {
      const uid = state.training.unitId;
      state.training.trained[uid] = (state.training.trained[uid] ?? 0) + state.training.qty;
      state.metrics.unitsTrained += state.training.qty;
      state.training.unitId         = null;
      state.training.qty            = 0;
      state.training.completesAtMin = null;
    }

    // Decide action
    decideAction(state, queue);

    // Log power at marks
    if (powerLogMarks.includes(t + TICK_MIN)) {
      state.metrics.productionLog.push({ minMark: t + TICK_MIN, power: computePower(state.buildings, state.resources) });
    }
  }

  // Final elapsed
  state.elapsedRealMin = totalRealMin;
  state.mandateDay     = Math.floor(totalRealMin / REAL_MIN_PER_GAME_DAY);
  return state;
}

// ─── Report formatting ────────────────────────────────────────────────────────

const RES_LABELS: Record<ResourceKey, string> = {
  money: "Argent", influence: "Influence", energy: "Énergie",
  intelligence: "Renseignement", technology: "Technologie",
  military: "Militaire", cyberDefense: "Cyberdéfense",
};

const RES_ICONS: Record<ResourceKey, string> = {
  money: "💰", influence: "🎭", energy: "⚡",
  intelligence: "🔍", technology: "🔬",
  military: "⚔️ ", cyberDefense: "🛡️ ",
};

function pad(s: string, n: number, right = false): string {
  const str = String(s);
  return right ? str.padEnd(n) : str.padStart(n);
}

function fmtMin(min: number): string {
  if (min < 60)   return `${min}min`;
  if (min < 1440) return `${Math.floor(min / 60)}h${min % 60 > 0 ? (min % 60) + "min" : ""}`;
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  return h > 0 ? `${d}j${h}h` : `${d}j`;
}

function bar(val: number, max: number, width = 20): string {
  const filled = Math.round((val / max) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function divider(char = "─", len = 72): string { return char.repeat(len); }

function printReport(profile: Profile, results: Array<{ label: string; durationMin: number; state: SimState }>): void {
  const W = 72;
  console.log("\n" + "═".repeat(W));
  console.log(`  PROFIL : ${profile.label.toUpperCase()}  —  ${profile.description}`);
  console.log(`  Focus missions : ${profile.missionFocus}`);
  console.log("═".repeat(W));

  for (const { label, durationMin, state } of results) {
    const powerNow   = computePower(state.buildings, state.resources);
    const powerInit  = computePower(createInitialState().buildings, INITIAL_RESOURCES);
    const powerGain  = powerNow - powerInit;

    console.log(`\n  ┌─ ${label.padEnd(W - 4, "─")}┐`);
    console.log(`  │  Temps réel écoulé : ${fmtMin(durationMin)}  |  Jour mandat : ${state.mandateDay}`);
    console.log(`  │`);

    // Resources
    console.log(`  │  RESSOURCES`);
    for (const k of Object.keys(RES_LABELS) as ResourceKey[]) {
      const cur  = Math.round(state.resources[k]);
      const init = INITIAL_RESOURCES[k];
      const diff = cur - init;
      const sign = diff >= 0 ? "+" : "";
      console.log(`  │    ${RES_ICONS[k]} ${pad(RES_LABELS[k], 14, true)} ${pad(String(cur), 6)}  (${sign}${diff})`);
    }
    console.log(`  │`);

    // Buildings
    console.log(`  │  BÂTIMENTS AMÉLIORÉS`);
    const upgraded = state.buildings.filter(b => b.level > 1 || (b.level === 1 && BUILDINGS[b.id]?.levels[0]));
    const nonDefault = state.buildings.filter(b => {
      const initialLevel = ["presidential_palace","economy_ministry","defense_ministry","intelligence_ministry","energy_ministry","diplomacy_ministry","research_center"].includes(b.id) ? 1 : 0;
      return b.level > initialLevel;
    });
    if (nonDefault.length === 0) {
      console.log(`  │    (aucun bâtiment upgradé)`);
    } else {
      for (const b of nonDefault) {
        const initialLevel = ["presidential_palace","economy_ministry","defense_ministry","intelligence_ministry","energy_ministry","diplomacy_ministry","research_center"].includes(b.id) ? 1 : 0;
        const inProgress = b.upgradeEndsAtMin !== null ? " [en cours]" : "";
        console.log(`  │    ✓ ${b.id.padEnd(25)} Lv${initialLevel} → Lv${b.level}${inProgress}`);
      }
    }
    if (state.buildings.some(b => b.upgradeEndsAtMin !== null)) {
      const inProg = state.buildings.filter(b => b.upgradeEndsAtMin !== null);
      for (const b of inProg)
        console.log(`  │    ⏳ ${b.id.padEnd(25)} Lv${b.level} → Lv${b.level + 1} (terminé dans ${fmtMin(Math.ceil((b.upgradeEndsAtMin! - durationMin)))})`);
    }
    console.log(`  │`);

    // Research
    console.log(`  │  RECHERCHES (${state.research.completed.length} complétées)`);
    if (state.research.completed.length === 0) {
      console.log(`  │    (aucune recherche terminée)`);
    } else {
      for (const r of state.research.completed)
        console.log(`  │    ✓ ${r}`);
    }
    if (state.research.inProgressId) {
      const remaining = Math.ceil((state.research.completesAtMin! - durationMin));
      console.log(`  │    ⏳ ${state.research.inProgressId} (dans ${fmtMin(remaining)})`);
    }
    console.log(`  │`);

    // Units
    console.log(`  │  UNITÉS ENTRAÎNÉES (total : ${state.metrics.unitsTrained})`);
    if (Object.keys(state.training.trained).length === 0) {
      console.log(`  │    (aucune unité formée)`);
    } else {
      for (const [uid, qty] of Object.entries(state.training.trained))
        console.log(`  │    ✓ ${uid.padEnd(25)} ×${qty}`);
    }
    if (state.training.unitId) {
      const remaining = Math.ceil((state.training.completesAtMin! - durationMin));
      console.log(`  │    ⏳ ${state.training.unitId}×${state.training.qty} (dans ${fmtMin(remaining)})`);
    }
    console.log(`  │`);

    // Puissance
    console.log(`  │  PUISSANCE GLOBALE : ${powerNow}  (init: ${powerInit}, +${powerGain})`);
    console.log(`  │    ${bar(powerNow, Math.max(400, powerNow + 50))}  ${powerNow}`);
    console.log(`  │`);

    // Top blockers
    const blockerEntries = Object.entries(state.metrics.blockers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (blockerEntries.length > 0) {
      console.log(`  │  PRINCIPAUX BLOCAGES (ticks bloqués / total ${durationMin})`);
      for (const [k, v] of blockerEntries) {
        const pct = Math.round((v / durationMin) * 100);
        console.log(`  │    ${pad(String(pct) + "%", 4)} ${bar(v, durationMin, 12)} ${k}`);
      }
      console.log(`  │`);
    }

    // Spend breakdown
    if (Object.keys(state.metrics.spendLog).length > 0) {
      console.log(`  │  DÉPENSES (argent total)`);
      for (const [cat, amt] of Object.entries(state.metrics.spendLog))
        console.log(`  │    ${cat.padEnd(12)} : ${Math.round(amt)} 💰`);
      console.log(`  │`);
    }

    console.log(`  └${"─".repeat(W - 2)}┘`);
  }
}

// ─── Comparison table ─────────────────────────────────────────────────────────

function printComparisonTable(
  allResults: Array<{ profile: Profile; results: Array<{ label: string; durationMin: number; state: SimState }> }>,
): void {
  const W = 72;
  console.log("\n" + "═".repeat(W));
  console.log("  TABLEAU COMPARATIF — PUISSANCE GLOBALE PAR PROFIL ET DURÉE");
  console.log("═".repeat(W));

  const durations = allResults[0].results.map(r => r.label);
  const header = "  Profil            " + durations.map(d => pad(d, 14)).join("");
  console.log(header);
  console.log("  " + divider("─", W - 2));

  for (const { profile, results } of allResults) {
    const row = `  ${pad(profile.label, 18, true)}` +
      results.map(r => pad(String(computePower(r.state.buildings, r.state.resources)), 14)).join("");
    console.log(row);
  }

  console.log("\n  TABLEAU COMPARATIF — UPGRADES BÂTIMENTS COMPLÉTÉS");
  console.log("  " + divider("─", W - 2));
  const header2 = "  Profil            " + durations.map(d => pad(d, 14)).join("");
  console.log(header2);
  console.log("  " + divider("─", W - 2));
  for (const { profile, results } of allResults) {
    const row = `  ${pad(profile.label, 18, true)}` +
      results.map(r => pad(String(r.state.metrics.upgradesCompleted) + " upgrades", 14)).join("");
    console.log(row);
  }

  console.log("\n  TABLEAU COMPARATIF — RECHERCHES TERMINÉES");
  console.log("  " + divider("─", W - 2));
  console.log(header2);
  console.log("  " + divider("─", W - 2));
  for (const { profile, results } of allResults) {
    const row = `  ${pad(profile.label, 18, true)}` +
      results.map(r => pad(String(r.state.research.completed.length) + " recherches", 14)).join("");
    console.log(row);
  }

  console.log("\n  TABLEAU COMPARATIF — ARGENT RESTANT (FIN DE PÉRIODE)");
  console.log("  " + divider("─", W - 2));
  console.log(header2);
  console.log("  " + divider("─", W - 2));
  for (const { profile, results } of allResults) {
    const row = `  ${pad(profile.label, 18, true)}` +
      results.map(r => pad(String(Math.round(r.state.resources.money)) + " 💰", 14)).join("");
    console.log(row);
  }
}

// ─── Balance observations ─────────────────────────────────────────────────────

function printBalanceObservations(
  allResults: Array<{ profile: Profile; results: Array<{ label: string; durationMin: number; state: SimState }> }>,
): void {
  const W = 72;
  console.log("\n" + "═".repeat(W));
  console.log("  OBSERVATIONS D'ÉQUILIBRAGE");
  console.log("═".repeat(W));

  // 1. Production initiale
  const prodState = createInitialState();
  accumulateProduction(prodState, 60);
  const baseRes  = INITIAL_RESOURCES;
  console.log("\n  ① Production de base (60 min réelles, bâtiments niveau 1) :");
  for (const k of Object.keys(RES_LABELS) as ResourceKey[]) {
    const gain = Math.round(prodState.resources[k] - baseRes[k]);
    if (gain > 0)
      console.log(`     ${RES_ICONS[k]} ${pad(RES_LABELS[k], 14, true)} +${gain}/h`);
  }

  // 2. Premier upgrade possible
  const firstUpgradeCost = BUILDINGS["economy_ministry"].levels[0].cost;
  const moneyPerMin = 65; // approx from production analysis
  const minToFirst = Math.ceil((firstUpgradeCost.money! - INITIAL_RESOURCES.money) / moneyPerMin);
  console.log(`\n  ② Temps avant premier upgrade payable (economy_ministry Lv2) :`);
  console.log(`     Coût : ${firstUpgradeCost.money} 💰 | Déjà disponible : ${INITIAL_RESOURCES.money} 💰`);
  console.log(`     → Immédiatement finançable (argent initial suffisant)`);

  // 3. Power range at 24h
  const at24h = allResults.map(r => ({
    profile: r.profile.label,
    power:   computePower(r.results.find(x => x.durationMin === 1440)!.state.buildings,
                          r.results.find(x => x.durationMin === 1440)!.state.resources),
  }));
  const maxPow = Math.max(...at24h.map(x => x.power));
  const minPow = Math.min(...at24h.map(x => x.power));
  console.log(`\n  ③ Écart de puissance à 24h réelles :`);
  console.log(`     Min : ${minPow} (${at24h.find(x => x.power === minPow)?.profile})`);
  console.log(`     Max : ${maxPow} (${at24h.find(x => x.power === maxPow)?.profile})`);
  console.log(`     Ratio max/min : ×${(maxPow / minPow).toFixed(2)}`);
  if (maxPow / minPow > 3)
    console.log(`     ⚠ Déséquilibre significatif — certains profils sont très avantagés`);
  else
    console.log(`     ✓ Équilibre acceptable`);

  // 4. Research availability
  const firstResearchMin = gamDayToRealMin(RESEARCH["research_cybersec"].realMinDuration / REAL_MIN_PER_GAME_DAY);
  console.log(`\n  ④ Première recherche disponible (research_cybersec) :`);
  console.log(`     Durée : ${fmtMin(RESEARCH["research_cybersec"].realMinDuration)} réelles`);
  console.log(`     Coût : 600 💰 + 20 🔬 technologie`);
  console.log(`     Technologie disponible à T+0 : 30 (production : +7/min)`);
  const minToTech = Math.ceil((20 - 30) / 7);
  console.log(`     → Technologie atteinte ${minToTech <= 0 ? "immédiatement" : "dans " + minToTech + "min"}`);

  // 5. Unlock bottlenecks
  console.log(`\n  ⑤ Verrous d'accès importants :`);
  console.log(`     central_bank  → economy_ministry Lv3  (3×upgrade : ${fmtMin(gamSecToRealMin(60+300+1200))} cumulé)`);
  console.log(`     military_hq   → defense_ministry Lv3  (3×upgrade : ${fmtMin(gamSecToRealMin(60+300+1200))} cumulé)`);
  console.log(`     media_agency  → diplomacy_ministry Lv2 (2×upgrade : ${fmtMin(gamSecToRealMin(60+300))} cumulé)`);
  console.log(`     cyber_ministry→ intelligence_ministry Lv2 (2×upgrade : ${fmtMin(gamSecToRealMin(60+300))} cumulé)`);

  // 6. Hotspots from blockers across all profiles
  const blockerTotal: Record<string, number> = {};
  for (const { results } of allResults) {
    for (const { state } of results) {
      for (const [k, v] of Object.entries(state.metrics.blockers))
        blockerTotal[k] = (blockerTotal[k] ?? 0) + v;
    }
  }
  const topBlockers = Object.entries(blockerTotal).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (topBlockers.length > 0) {
    console.log(`\n  ⑥ Blocages les plus fréquents (toutes simulations) :`);
    for (const [k, v] of topBlockers)
      console.log(`     ${pad(String(v), 6)} ticks  ${k}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const DURATIONS: Array<{ label: string; min: number }> = [
  { label: "10 min réelles",  min: 10   },
  { label: "1 heure réelle",  min: 60   },
  { label: "24 heures réelles", min: 1440 },
  { label: "7 jours réels",   min: 10080 },
];

function main(): void {
  const W = 72;
  console.log("\n" + "╔" + "═".repeat(W - 2) + "╗");
  console.log("║" + "  SIMULATEUR D'ÉQUILIBRAGE — PRÉSIDENT : NATION EN CRISE".padEnd(W - 2) + "║");
  console.log("║" + `  Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`.padEnd(W - 2) + "║");
  console.log("║" + `  Ratio : 1h réelle = 4h jeu | 1 jour mandat = 6h réelles`.padEnd(W - 2) + "║");
  console.log("╚" + "═".repeat(W - 2) + "╝");

  const allResults: Array<{ profile: Profile; results: Array<{ label: string; durationMin: number; state: SimState }> }> = [];

  for (const profile of PROFILES) {
    const results = DURATIONS.map(({ label, min }) => ({
      label,
      durationMin: min,
      state:       runSimulation(profile, min),
    }));
    allResults.push({ profile, results });
    printReport(profile, results);
  }

  printComparisonTable(allResults);
  printBalanceObservations(allResults);

  console.log("\n" + "═".repeat(W));
  console.log("  FIN DU RAPPORT — Aucun fichier de jeu modifié.");
  console.log("═".repeat(W) + "\n");
}

main();
