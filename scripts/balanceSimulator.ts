/**
 * Simulateur d'équilibrage offline — Président : Nation en Crise
 * ──────────────────────────────────────────────────────────────
 * Outil développeur. Ne modifie aucun fichier du jeu, jamais.
 *
 * Usage :
 *   npx tsx scripts/balanceSimulator.ts [runs=200] [profile=all|militaire|...]
 *   npx tsx scripts/balanceSimulator.ts 500 economique
 *
 * Ratio de temps (simulationClock.ts) :
 *   1 heure réelle = 4 heures jeu
 *   1 jour mandat  = 24 heures jeu = 6 heures réelles = 360 min réelles
 *   upgradeDuration (game_sec) → min réelles = gameSec × (1/240)
 *   durationDays    (game_days) → min réelles = days × 360
 */

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const N_RUNS   = parseInt(args.find(a => /^\d+$/.test(a)) ?? "200", 10);
const PROFILE_FILTER = args.find(a => !/^\d+$/.test(a)) ?? "all";

// ── Time helpers ──────────────────────────────────────────────────────────────
const REAL_MIN_PER_GAME_DAY = 360;        // 6 h réelles
const REAL_MIN_PER_GAME_SEC = 1 / 240;   // 250 ms réels

function gamDayToRealMin(d: number): number { return d * REAL_MIN_PER_GAME_DAY; }
function gamSecToRealMin(s: number): number { return s * REAL_MIN_PER_GAME_SEC; }

// ── Building data (mirrors data/buildings.ts formulas exactly) ────────────────
type RK = "money"|"influence"|"energy"|"intelligence"|"technology"|"military"|"cyberDefense";
type Res = Record<RK, number>;
type Cost = Partial<Res>;

const UPGRADE_SEC = [60, 300, 1200, 3600, 14400, 28800, 57600, 115200, 172800, 259200];

function genLevels(baseCost: Cost, baseProd: Cost, basePower: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const c: Cost = {}; const p: Cost = {};
    for (const [k, v] of Object.entries(baseCost) as [RK, number][]) c[k] = Math.round(v * 1.8 ** i);
    for (const [k, v] of Object.entries(baseProd) as [RK, number][]) p[k] = Math.round(v * 1.6 ** i);
    return { cost: c, prod: p, minDur: gamSecToRealMin(UPGRADE_SEC[i] ?? 259200), power: Math.round(basePower * (i + 1) * 1.3) };
  });
}

interface BDef { id: string; maxLevel: number; unlock?: { dep: string; minLv: number }; levels: ReturnType<typeof genLevels> }
const BUILDINGS: Record<string, BDef> = {
  presidential_palace:   { id: "presidential_palace",   maxLevel: 10, levels: genLevels({ money: 500, influence: 50 }, { influence: 2, money: 10 }, 20) },
  economy_ministry:      { id: "economy_ministry",      maxLevel: 10, levels: genLevels({ money: 300, influence: 20 }, { money: 30, influence: 2 }, 15) },
  defense_ministry:      { id: "defense_ministry",      maxLevel: 10, levels: genLevels({ money: 400, military: 10 }, { military: 8, energy: 2 }, 18) },
  intelligence_ministry: { id: "intelligence_ministry", maxLevel: 10, levels: genLevels({ money: 250, influence: 15 }, { intelligence: 6, technology: 2 }, 12) },
  cyber_ministry:        { id: "cyber_ministry",        maxLevel: 10, unlock: { dep: "intelligence_ministry", minLv: 2 }, levels: genLevels({ money: 350, technology: 20 }, { cyberDefense: 7, intelligence: 3 }, 14) },
  energy_ministry:       { id: "energy_ministry",       maxLevel: 10, levels: genLevels({ money: 280, energy: 20 }, { energy: 10, money: 15 }, 13) },
  diplomacy_ministry:    { id: "diplomacy_ministry",    maxLevel: 10, levels: genLevels({ money: 200, influence: 30 }, { influence: 5, money: 10 }, 11) },
  research_center:       { id: "research_center",       maxLevel: 10, levels: genLevels({ money: 400, technology: 30 }, { technology: 5, intelligence: 2 }, 16) },
  central_bank:          { id: "central_bank",          maxLevel: 10, unlock: { dep: "economy_ministry", minLv: 3 }, levels: genLevels({ money: 800, influence: 40 }, { money: 80, influence: 3 }, 22) },
  media_agency:          { id: "media_agency",          maxLevel: 10, unlock: { dep: "diplomacy_ministry", minLv: 2 }, levels: genLevels({ money: 220, influence: 25 }, { influence: 6, money: 8 }, 10) },
  military_hq:           { id: "military_hq",           maxLevel: 10, unlock: { dep: "defense_ministry", minLv: 3 }, levels: genLevels({ money: 600, military: 30 }, { military: 12, energy: 4 }, 25) },
};
const ALL_BID = Object.keys(BUILDINGS);

// ── Research data (mirrors data/strategyResearch.ts) ─────────────────────────
interface RDef { id: string; cost: Cost; minDur: number; prereqs: string[] }
const RESEARCH: Record<string, RDef> = {
  research_cybersec:          { id: "research_cybersec",          cost: { money: 600, technology: 20 }, minDur: gamDayToRealMin(2),  prereqs: [] },
  research_power_grid:        { id: "research_power_grid",        cost: { money: 800, technology: 15 }, minDur: gamDayToRealMin(6),  prereqs: [] },
  research_drones:            { id: "research_drones",            cost: { money: 700, technology: 25, intelligence: 10 }, minDur: gamDayToRealMin(7),  prereqs: ["research_cybersec"] },
  research_smart_agriculture: { id: "research_smart_agriculture", cost: { money: 500, technology: 12 }, minDur: gamDayToRealMin(2),  prereqs: [] },
  research_admin_ai:          { id: "research_admin_ai",          cost: { money: 900, technology: 30 }, minDur: gamDayToRealMin(8),  prereqs: ["research_cybersec"] },
  research_digital_hospitals: { id: "research_digital_hospitals", cost: { money: 700, technology: 18 }, minDur: gamDayToRealMin(3),  prereqs: [] },
  research_energy_sovereign:  { id: "research_energy_sovereign",  cost: { money: 1000, technology: 22 }, minDur: gamDayToRealMin(8), prereqs: ["research_power_grid"] },
  research_missile_defense:   { id: "research_missile_defense",   cost: { money: 1200, technology: 35 }, minDur: gamDayToRealMin(10), prereqs: ["research_drones"] },
  research_science_education: { id: "research_science_education", cost: { money: 600, technology: 10 }, minDur: gamDayToRealMin(3),  prereqs: [] },
  research_strategic_industry:{ id: "research_strategic_industry",cost: { money: 1000, technology: 25 }, minDur: gamDayToRealMin(9),  prereqs: ["research_smart_agriculture"] },
  research_satellites:        { id: "research_satellites",        cost: { money: 1400, technology: 40, intelligence: 20 }, minDur: gamDayToRealMin(12), prereqs: ["research_drones", "research_missile_defense"] },
  research_missiles:          { id: "research_missiles",          cost: { money: 1500, technology: 45 }, minDur: gamDayToRealMin(12), prereqs: ["research_missile_defense"] },
  research_military_bases:    { id: "research_military_bases",    cost: { money: 1100, technology: 30 }, minDur: gamDayToRealMin(10), prereqs: ["research_drones"] },
  research_trade_routes:      { id: "research_trade_routes",      cost: { money: 800, technology: 15, intelligence: 10 }, minDur: gamDayToRealMin(7), prereqs: ["research_strategic_industry"] },
  research_infowar:           { id: "research_infowar",           cost: { money: 900, technology: 28, intelligence: 15 }, minDur: gamDayToRealMin(8), prereqs: ["research_cybersec", "research_science_education"] },
};
const ALL_RID = Object.keys(RESEARCH);

// ── Unit data ─────────────────────────────────────────────────────────────────
interface UDef { id: string; cost: Cost; minPerUnit: number }
const UNITS: Record<string, UDef> = {
  infantry_mechanized: { id: "infantry_mechanized", cost: { money: 150, military: 5 },                   minPerUnit: gamSecToRealMin(1800) },
  special_forces:      { id: "special_forces",      cost: { money: 500, military: 20, intelligence: 15 }, minPerUnit: gamSecToRealMin(7200) },
  battle_tank:         { id: "battle_tank",          cost: { money: 800, military: 35, energy: 10 },       minPerUnit: gamSecToRealMin(10800) },
  multirole_fighter:   { id: "multirole_fighter",    cost: { money: 1200, military: 50, technology: 20 },  minPerUnit: gamSecToRealMin(14400) },
  cyber_unit:          { id: "cyber_unit",           cost: { money: 400, cyberDefense: 20, technology: 15 }, minPerUnit: gamSecToRealMin(5400) },
};
const ALL_UID = Object.keys(UNITS);

// ── Simulation state ──────────────────────────────────────────────────────────
const ZERO_RES: Res = { money: 0, influence: 0, energy: 0, intelligence: 0, technology: 0, military: 0, cyberDefense: 0 };
const INIT_RES: Res  = { money: 2000, influence: 100, energy: 200, intelligence: 50, technology: 30, military: 80, cyberDefense: 40 };

const STARTING_LEVELS: Record<string, number> = {
  presidential_palace: 1, economy_ministry: 1, defense_ministry: 1,
  intelligence_ministry: 1, energy_ministry: 1, diplomacy_ministry: 1,
  research_center: 1, cyber_ministry: 0, central_bank: 0, media_agency: 0, military_hq: 0,
};

interface SimBuilding { id: string; level: number; busyUntil: number | null }
interface SimState {
  res:       Res;
  buildings: SimBuilding[];
  researchDone:  string[];
  researchBusy:  { id: string; until: number } | null;
  trainingBusy:  { id: string; qty: number; until: number } | null;
  elapsed:   number;  // real minutes
  stallTicks: number; // ticks where agent was idle AND nothing affordable
  metrics: {
    upgrades:   number;  // building upgrades completed (above start level)
    research:   number;
    unitsTrained: number;
    unitBreakdown: Record<string, number>;
    blockedOn:  Record<string, number>;
  };
}

function initState(): SimState {
  return {
    res: { ...INIT_RES },
    buildings: ALL_BID.map(id => ({ id, level: STARTING_LEVELS[id] ?? 0, busyUntil: null })),
    researchDone: [],
    researchBusy: null,
    trainingBusy: null,
    elapsed: 0,
    stallTicks: 0,
    metrics: { upgrades: 0, research: 0, unitsTrained: 0, unitBreakdown: {}, blockedOn: {} },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function canAfford(cost: Cost, r: Res): boolean {
  return (Object.entries(cost) as [RK, number][]).every(([k, v]) => r[k] >= v);
}
function deduct(cost: Cost, r: Res): void {
  for (const [k, v] of Object.entries(cost) as [RK, number][]) r[k] = Math.max(0, r[k] - v);
}
function isUnlocked(bid: string, buildings: SimBuilding[]): boolean {
  const u = BUILDINGS[bid]?.unlock;
  if (!u) return true;
  return (buildings.find(b => b.id === u.dep)?.level ?? 0) >= u.minLv;
}
function addBlocker(s: SimState, key: string): void {
  s.metrics.blockedOn[key] = (s.metrics.blockedOn[key] ?? 0) + 1;
}
function accumulateProd(s: SimState, ticks: number): void {
  for (const b of s.buildings) {
    if (b.level === 0) continue;
    const lv = BUILDINGS[b.id].levels[b.level - 1];
    if (!lv) continue;
    for (const [k, rate] of Object.entries(lv.prod) as [RK, number][])
      s.res[k] = Math.round(s.res[k] + rate * ticks);
  }
}

// Production value score for a building at a given level (used by optimizer)
const PROD_WEIGHTS: Partial<Res> = { money: 1, influence: 3, energy: 2, intelligence: 5, technology: 6, military: 2, cyberDefense: 3 };
function prodScore(bid: string, level: number): number {
  const lv = BUILDINGS[bid]?.levels[level - 1];
  if (!lv) return 0;
  let s = 0;
  for (const [k, w] of Object.entries(PROD_WEIGHTS) as [RK, number][])
    s += (lv.prod[k] ?? 0) * w;
  return s;
}
function upgradeValuePerCost(bid: string, currentLevel: number): number {
  if (currentLevel >= BUILDINGS[bid].maxLevel) return 0;
  const cost = BUILDINGS[bid].levels[currentLevel]?.cost.money ?? 1;
  return prodScore(bid, currentLevel + 1) / cost;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function computePower(s: SimState): number {
  const BW: Record<string, number> = {
    presidential_palace: 20, economy_ministry: 15, defense_ministry: 18,
    intelligence_ministry: 12, cyber_ministry: 14, energy_ministry: 11,
    diplomacy_ministry: 10, research_center: 16, central_bank: 22,
    media_agency: 9, military_hq: 25,
  };
  const RW: Partial<Res> = { money: 0.01, influence: 0.3, military: 0.5, cyberDefense: 0.4, technology: 0.35, intelligence: 0.2, energy: 0.15 };
  let p = 0;
  for (const b of s.buildings) p += (BW[b.id] ?? 10) * b.level * 1.5;
  for (const [k, w] of Object.entries(RW) as [RK, number][]) p += s.res[k] * w;
  return Math.round(p);
}

// ── Profile definitions ───────────────────────────────────────────────────────
type ProfileMode = "static" | "random" | "optimizer";
interface Profile {
  id: string; label: string; desc: string;
  mode: ProfileMode;
  bPriority:  string[];   // for static mode
  rPriority:  string[];
  uPriority:  Array<{ id: string; qty: number }>;
}

function optimizerBPriority(state?: SimState): string[] {
  const levels: Record<string, number> = {};
  if (state) for (const b of state.buildings) levels[b.id] = b.level;
  return [...ALL_BID].sort((a, b) =>
    upgradeValuePerCost(b, levels[b] ?? STARTING_LEVELS[b] ?? 0) -
    upgradeValuePerCost(a, levels[a] ?? STARTING_LEVELS[a] ?? 0)
  ).flatMap(id => Array(BUILDINGS[id].maxLevel).fill(id));
}

const PROFILES: Profile[] = [
  {
    id: "debutant", label: "Débutant", mode: "static",
    desc: "Achats prématurés, mauvais ordres — simule un joueur peu expérimenté",
    bPriority: ["defense_ministry","presidential_palace","intelligence_ministry","economy_ministry","defense_ministry","research_center","energy_ministry","defense_ministry"],
    rPriority: ["research_drones","research_cybersec","research_smart_agriculture"],  // drones bloqué sans cybersec
    uPriority: [{ id: "battle_tank", qty: 2 }, { id: "infantry_mechanized", qty: 5 }],
  },
  {
    id: "militaire", label: "Militaire", mode: "static",
    desc: "Défense et unités lourdes en priorité",
    bPriority: ["defense_ministry","defense_ministry","defense_ministry","intelligence_ministry","intelligence_ministry","military_hq","military_hq","presidential_palace","research_center"],
    rPriority: ["research_cybersec","research_drones","research_missile_defense","research_military_bases","research_missiles"],
    uPriority: [{ id: "infantry_mechanized", qty: 10 }, { id: "battle_tank", qty: 3 }, { id: "special_forces", qty: 2 }],
  },
  {
    id: "economique", label: "Économique", mode: "static",
    desc: "Maximise la production d'argent — banque centrale ASAP",
    bPriority: ["economy_ministry","economy_ministry","economy_ministry","central_bank","central_bank","economy_ministry","energy_ministry","energy_ministry","economy_ministry"],
    rPriority: ["research_smart_agriculture","research_strategic_industry","research_trade_routes","research_power_grid","research_digital_hospitals"],
    uPriority: [{ id: "infantry_mechanized", qty: 3 }],
  },
  {
    id: "cyber", label: "Cyber", mode: "static",
    desc: "Cyberdéfense maximale, renseignement, opérations informatiques",
    bPriority: ["intelligence_ministry","intelligence_ministry","cyber_ministry","cyber_ministry","cyber_ministry","research_center","intelligence_ministry","cyber_ministry"],
    rPriority: ["research_cybersec","research_admin_ai","research_infowar","research_drones","research_satellites"],
    uPriority: [{ id: "cyber_unit", qty: 3 }, { id: "special_forces", qty: 2 }],
  },
  {
    id: "recherche", label: "Recherche", mode: "static",
    desc: "Arbre technologique complet en premier, sacrifice court terme",
    bPriority: ["research_center","research_center","intelligence_ministry","intelligence_ministry","cyber_ministry","research_center","presidential_palace","research_center"],
    rPriority: ["research_cybersec","research_drones","research_missile_defense","research_satellites","research_admin_ai","research_infowar","research_science_education"],
    uPriority: [{ id: "cyber_unit", qty: 2 }],
  },
  {
    id: "diplomatie", label: "Diplomatie", mode: "static",
    desc: "Influence maximale, soft power, alliances",
    bPriority: ["diplomacy_ministry","diplomacy_ministry","media_agency","media_agency","presidential_palace","presidential_palace","research_center","intelligence_ministry"],
    rPriority: ["research_science_education","research_cybersec","research_infowar","research_admin_ai","research_digital_hospitals"],
    uPriority: [{ id: "special_forces", qty: 1 }],
  },
  {
    id: "aleatoire", label: "Aléatoire", mode: "random",
    desc: "Ordre de priorité aléatoire (seed différent à chaque run)",
    bPriority: [], rPriority: [], uPriority: [],  // generated per-run
  },
  {
    id: "optimiseur", label: "Optimiseur", mode: "optimizer",
    desc: "Greedy : toujours l'upgrade avec le meilleur ratio prod/coût",
    bPriority: [], rPriority: [], uPriority: [],  // computed per-run
  },
];

// ── Run result ────────────────────────────────────────────────────────────────
interface RunResult {
  globalPower:      number;
  buildingsUpgraded: number;  // total upgrades above starting level
  researchCompleted: number;
  unitsTrained:     number;
  finalScore:       number;   // composite balance score
  stallPct:         number;   // 0–100
  resources:        Res;
  blockedOn:        Record<string, number>;
  unitBreakdown:    Record<string, number>;
}

function computeFinalScore(r: RunResult): number {
  return Math.round(
    r.globalPower * 2 +
    r.researchCompleted * 150 +
    r.buildingsUpgraded * 25 +
    r.unitsTrained * 8 -
    r.stallPct * 300,
  );
}

// ── Simulation engine ─────────────────────────────────────────────────────────
function buildQueues(p: Profile): { bq: string[]; rq: string[]; uq: Array<{ id: string; qty: number }> } {
  if (p.mode === "random") {
    const bq = shuffle(ALL_BID.flatMap(id => Array(BUILDINGS[id].maxLevel).fill(id)));
    const rq = shuffle([...ALL_RID]);
    const uq = shuffle(ALL_UID.map(id => ({ id, qty: 2 })));
    return { bq, rq, uq };
  }
  if (p.mode === "optimizer") {
    const bq = optimizerBPriority();
    const rq = [...ALL_RID].sort((a, b) => {
      const scoreA = (RESEARCH[a].prereqs.length === 0 ? 10 : 5) / (RESEARCH[a].cost.money ?? 1) * 1e5;
      const scoreB = (RESEARCH[b].prereqs.length === 0 ? 10 : 5) / (RESEARCH[b].cost.money ?? 1) * 1e5;
      return scoreB - scoreA;
    });
    const uq = [{ id: "infantry_mechanized", qty: 5 }, { id: "battle_tank", qty: 2 }, { id: "cyber_unit", qty: 2 }];
    return { bq, rq, uq };
  }
  return { bq: [...p.bPriority], rq: [...p.rPriority], uq: p.uPriority.map(u => ({ ...u })) };
}

function runSimulation(p: Profile, totalMin: number): RunResult {
  const TICK = totalMin > 120 ? 15 : 1;
  const s = initState();
  const { bq, rq, uq } = buildQueues(p);

  for (let t = 0; t < totalMin; t += TICK) {
    s.elapsed = t;

    // Accumulate production
    accumulateProd(s, TICK);

    // Collect completed building upgrade
    for (const b of s.buildings) {
      if (b.busyUntil !== null && t >= b.busyUntil) {
        b.level++;
        b.busyUntil = null;
        s.metrics.upgrades++;
      }
    }

    // Collect completed research
    if (s.researchBusy && t >= s.researchBusy.until) {
      s.researchDone.push(s.researchBusy.id);
      s.researchBusy = null;
      s.metrics.research++;
    }

    // Collect completed training
    if (s.trainingBusy && t >= s.trainingBusy.until) {
      const { id, qty } = s.trainingBusy;
      s.metrics.unitsTrained += qty;
      s.metrics.unitBreakdown[id] = (s.metrics.unitBreakdown[id] ?? 0) + qty;
      s.trainingBusy = null;
    }

    // ── Decide action ──────────────────────────────────────────────────────
    const isUpgrading = s.buildings.some(b => b.busyUntil !== null);
    let acted = isUpgrading || !!s.researchBusy || !!s.trainingBusy;

    // 1. Start building upgrade
    if (!isUpgrading) {
      let i = 0;
      while (i < bq.length) {
        const bid = bq[i];
        const def = BUILDINGS[bid];
        const b   = s.buildings.find(x => x.id === bid);
        if (!def || !b) { bq.splice(i, 1); continue; }
        if (b.level >= def.maxLevel) { bq.splice(i, 1); continue; }
        if (!isUnlocked(bid, s.buildings)) {
          addBlocker(s, `lock:${bid}`);
          i++; continue;
        }
        const cost = def.levels[b.level]?.cost;
        if (!cost) { i++; continue; }
        if (canAfford(cost, s.res)) {
          deduct(cost, s.res);
          b.busyUntil = t + def.levels[b.level].minDur;
          bq.splice(i, 1);
          acted = true;
          break;
        }
        for (const [k, v] of Object.entries(cost) as [RK, number][]) {
          if (s.res[k] < v) { addBlocker(s, `res:${k}:${bid}`); break; }
        }
        break;
      }
      // Fallback quand la queue prioritaire est épuisée : upgrade le bâtiment le moins avancé
      if (bq.length === 0) {
        const candidates = s.buildings
          .filter(b => b.level < BUILDINGS[b.id].maxLevel && b.busyUntil === null && isUnlocked(b.id, s.buildings))
          .sort((a, b) => a.level - b.level);
        for (const b of candidates) {
          const cost = BUILDINGS[b.id].levels[b.level]?.cost;
          if (cost && canAfford(cost, s.res)) {
            deduct(cost, s.res);
            b.busyUntil = t + BUILDINGS[b.id].levels[b.level].minDur;
            acted = true;
            break;
          }
        }
      }
    }

    // 2. Start research
    if (!s.researchBusy) {
      let i = 0;
      while (i < rq.length) {
        const rid = rq[i];
        if (s.researchDone.includes(rid)) { rq.splice(i, 1); continue; }
        const r = RESEARCH[rid];
        if (!r) { i++; continue; }
        if (!r.prereqs.every(pr => s.researchDone.includes(pr))) { addBlocker(s, `prereq:${rid}`); i++; continue; }
        if (canAfford(r.cost, s.res)) {
          deduct(r.cost, s.res);
          s.researchBusy = { id: rid, until: t + r.minDur };
          rq.splice(i, 1);
          acted = true;
          break;
        }
        for (const [k, v] of Object.entries(r.cost) as [RK, number][]) {
          if (s.res[k] < v) { addBlocker(s, `res:${k}:research`); break; }
        }
        break;
      }
    }

    // 3. Start unit training
    if (!s.trainingBusy) {
      let i = 0;
      while (i < uq.length) {
        const u = uq[i];
        const def = UNITS[u.id];
        if (!def) { i++; continue; }
        const total: Cost = {};
        for (const [k, v] of Object.entries(def.cost) as [RK, number][]) total[k] = v * u.qty;
        if (canAfford(total, s.res)) {
          deduct(total, s.res);
          s.trainingBusy = { id: u.id, qty: u.qty, until: t + def.minPerUnit * u.qty };
          uq.splice(i, 1);
          acted = true;
          break;
        }
        i++;
      }
    }

    if (!acted) s.stallTicks++;
  }

  s.elapsed = totalMin;
  const totalTicks = Math.ceil(totalMin / TICK);
  const power = computePower(s);
  const result: RunResult = {
    globalPower:       power,
    buildingsUpgraded: s.metrics.upgrades,
    researchCompleted: s.metrics.research,
    unitsTrained:      s.metrics.unitsTrained,
    finalScore:        0,
    stallPct:          Math.round((s.stallTicks / totalTicks) * 100),
    resources:         { ...s.res },
    blockedOn:         { ...s.metrics.blockedOn },
    unitBreakdown:     { ...s.metrics.unitBreakdown },
  };
  result.finalScore = computeFinalScore(result);
  return result;
}

function runMany(p: Profile, totalMin: number, n: number): RunResult[] {
  return Array.from({ length: n }, () => runSimulation(p, totalMin));
}

// ── Statistics ────────────────────────────────────────────────────────────────
interface Stats { mean: number; median: number; p10: number; p90: number; min: number; max: number; stddev: number }

function stat(values: number[]): Stats {
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return { mean: 0, median: 0, p10: 0, p90: 0, min: 0, max: 0, stddev: 0 };
  const mean = s.reduce((a, b) => a + b, 0) / n;
  const variance = s.reduce((acc, x) => acc + (x - mean) ** 2, 0) / n;
  const p = (pct: number) => s[Math.min(n - 1, Math.floor((pct / 100) * n))];
  return {
    mean:   Math.round(mean * 10) / 10,
    median: p(50),
    p10:    p(10),
    p90:    p(90),
    min:    s[0],
    max:    s[n - 1],
    stddev: Math.round(Math.sqrt(variance) * 10) / 10,
  };
}

function meanRes(runs: RunResult[]): Res {
  const acc = { ...ZERO_RES };
  for (const r of runs) for (const k of Object.keys(acc) as RK[]) acc[k] += r.resources[k];
  const n = runs.length;
  for (const k of Object.keys(acc) as RK[]) acc[k] = Math.round(acc[k] / n);
  return acc;
}

function topBlockers(runs: RunResult[], limit = 5): Array<[string, number]> {
  const total: Record<string, number> = {};
  for (const r of runs) for (const [k, v] of Object.entries(r.blockedOn)) total[k] = (total[k] ?? 0) + v;
  return Object.entries(total).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function topUnits(runs: RunResult[]): Array<[string, number]> {
  const total: Record<string, number> = {};
  for (const r of runs) for (const [k, v] of Object.entries(r.unitBreakdown)) total[k] = (total[k] ?? 0) + v;
  return Object.entries(total).sort((a, b) => b[1] - a[1]);
}

// ── Report helpers ────────────────────────────────────────────────────────────
const W = 76;
function div(c = "─"): string { return c.repeat(W) }
function pad(s: string | number, n: number, right = false): string {
  const str = String(s); return right ? str.padEnd(n) : str.padStart(n);
}
function fmtMin(m: number): string {
  if (m < 60)    return `${m}min`;
  if (m < 1440)  return `${Math.floor(m / 60)}h${m % 60 > 0 ? (m % 60) + "min" : ""}`;
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return h > 0 ? `${d}j${h}h` : `${d}j`;
}
function bar(v: number, max: number, w = 16): string {
  const f = max > 0 ? Math.min(w, Math.round((v / max) * w)) : 0;
  return "█".repeat(f) + "░".repeat(w - f);
}

function printStatRow(label: string, s: Stats, suffix = ""): void {
  console.log(
    `  ${pad(label, 22, true)}` +
    `  moy:${pad(s.mean + suffix, 8)}` +
    `  med:${pad(s.median + suffix, 8)}` +
    `  p10:${pad(s.p10 + suffix, 8)}` +
    `  p90:${pad(s.p90 + suffix, 8)}` +
    `  min:${pad(s.min + suffix, 8)}` +
    `  max:${pad(s.max + suffix, 8)}`,
  );
}

// ── Duration configs (alignées sur les phases de difficulté) ─────────────────
const DURATIONS = [
  { label: "5min réels",   min: 5     },  // début
  { label: "30min réels",  min: 30    },  // entrée de jeu
  { label: "24h réelles",  min: 1440  },  // milieu
  { label: "7j réels",     min: 10080 },  // long terme
];

// ── Difficulty curve ─────────────────────────────────────────────────────────

export type DifficultyLabel = "too_easy" | "balanced" | "too_hard" | "too_slow" | "too_generous";
export type PhaseId = "debut" | "entree" | "milieu" | "long_terme";

// Expected ranges per phase — derived from static-profile simulation baselines.
// progressionRate = upgrades / real-hour in this phase window.
const PHASE_THRESHOLDS: Record<PhaseId, {
  durationMin:  number;
  label:        string;
  minRate:      number;   // upgrades/h — below this: too_slow
  maxRate:      number;   // upgrades/h — above this ×2: too_generous
  minScore:     number;   // median score — below this: too_hard
  maxScore:     number;   // median score — above this ×2: too_easy
  maxStall:     number;   // % stall — above this: too_hard
}> = {
  debut:      { durationMin: 5,     label: "Début (0–5 min)",        minRate: 6,    maxRate: 60,  minScore: 200,    maxScore: 1200,   maxStall: 20 },
  entree:     { durationMin: 30,    label: "Entrée de jeu (30 min)", minRate: 3,    maxRate: 20,  minScore: 600,    maxScore: 3000,   maxStall: 15 },
  milieu:     { durationMin: 1440,  label: "Milieu (24 h)",          minRate: 0.2,  maxRate: 1.5, minScore: 20000,  maxScore: 200000, maxStall: 15 },
  long_terme: { durationMin: 10080, label: "Long terme (7 j)",       minRate: 0.1,  maxRate: 0.6, minScore: 100000, maxScore: 5000000, maxStall: 25 },
};

export interface PhaseHealth {
  phaseId:              PhaseId;
  phaseLabel:           string;
  durationMin:          number;
  stallRate:            number;   // avg stallPct across static profiles, 0–100
  progressionRate:      number;   // avg upgrades/h
  resourceShortageRate: number;   // % of blocker-ticks caused by resource shortage
  missionRate:          number;   // approx: upgrades/day (proxy for mission density)
  medianScore:          number;   // median finalScore across all static-profile runs
  upgradesMedian:       number;
  researchMedian:       number;
  label:                DifficultyLabel;
  flags:                string[];
}

export interface DifficultyHealth {
  phases:  PhaseHealth[];
  overall: DifficultyLabel;
  alerts:  string[];   // tuning recommendations for the dev
}

// IDs of the 6 "human" profiles — exclude random/optimizer from baseline
const STATIC_IDS = new Set(["debutant","militaire","economique","cyber","recherche","diplomatie"]);

function resourceShortageRate(runs: RunResult[]): number {
  let res = 0, access = 0;
  for (const r of runs) {
    for (const [k, v] of Object.entries(r.blockedOn)) {
      if (k.startsWith("res:")) res += v;
      else access += v;
    }
  }
  const total = res + access;
  return total === 0 ? 0 : Math.round((res / total) * 100);
}

function labelPhase(
  p:              typeof PHASE_THRESHOLDS[PhaseId],
  stallRate:      number,
  progressRate:   number,
  shortageRate:   number,
  medianScore:    number,
): { label: DifficultyLabel; flags: string[] } {
  const flags: string[] = [];

  // too_hard : blocages fréquents ou manque de ressources sévère
  if (stallRate > p.maxStall) {
    flags.push(`Stagnation ${stallRate}% > seuil ${p.maxStall}%`);
    return { label: "too_hard", flags };
  }
  if (shortageRate > 70 && stallRate > 10) {
    flags.push(`Ressources insuffisantes — ${shortageRate}% des blocages sont financiers`);
    return { label: "too_hard", flags };
  }

  // too_generous : progression explosive, ressources jamais limitantes
  if (progressRate > p.maxRate * 2.5) {
    flags.push(`Progression ×${(progressRate / p.maxRate).toFixed(1)} le maximum attendu`);
    return { label: "too_generous", flags };
  }
  if (medianScore > p.maxScore * 3 && stallRate < 5) {
    flags.push(`Score médian ×${Math.round(medianScore / p.maxScore)} l'attendu, aucune stagnation`);
    return { label: "too_generous", flags };
  }

  // too_easy : performance nettement au-dessus sans friction
  if (stallRate < 3 && progressRate > p.maxRate * 1.5) {
    flags.push(`Aucune friction : 0 stagnation + progression ${progressRate.toFixed(2)}/h`);
    return { label: "too_easy", flags };
  }

  // too_slow : trop peu d'actions réalisables même sans manque de ressources
  if (progressRate < p.minRate * 0.5 && stallRate < 8) {
    flags.push(`Progression ${progressRate.toFixed(2)}/h très en-dessous du seuil minimal ${p.minRate}/h`);
    return { label: "too_slow", flags };
  }

  // balanced
  if (progressRate < p.minRate)
    flags.push(`Progression légèrement en-dessous du seuil (${progressRate.toFixed(2)}/h vs min ${p.minRate}/h)`);
  if (progressRate > p.maxRate)
    flags.push(`Progression légèrement au-dessus du seuil (${progressRate.toFixed(2)}/h vs max ${p.maxRate}/h)`);
  return { label: "balanced", flags };
}

export function computeDifficultyHealth(summaries: ProfileSummary[]): DifficultyHealth {
  const staticSummaries = summaries.filter(s => STATIC_IDS.has(s.profile.id));
  const phases: PhaseHealth[] = [];
  const labelCounts: Record<DifficultyLabel, number> = {
    too_easy: 0, balanced: 0, too_hard: 0, too_slow: 0, too_generous: 0,
  };

  for (const [phaseId, thr] of Object.entries(PHASE_THRESHOLDS) as [PhaseId, typeof PHASE_THRESHOLDS[PhaseId]][]) {
    // Collect all runs from static profiles at this duration
    const allRuns: RunResult[] = [];
    for (const s of staticSummaries) {
      const d = s.byDuration.find(x => x.dur.min === thr.durationMin);
      if (d) allRuns.push(...d.runs);
    }

    const stallRate    = allRuns.length > 0 ? Math.round(allRuns.reduce((a, r) => a + r.stallPct, 0) / allRuns.length) : 0;
    const avgUpgrades  = allRuns.length > 0 ? allRuns.reduce((a, r) => a + r.buildingsUpgraded, 0) / allRuns.length : 0;
    const progressRate = thr.durationMin > 0 ? Math.round((avgUpgrades / (thr.durationMin / 60)) * 100) / 100 : 0;
    const shortageRate = resourceShortageRate(allRuns);
    const medianScore  = stat(allRuns.map(r => r.finalScore)).median;
    const upMedian     = stat(allRuns.map(r => r.buildingsUpgraded)).median;
    const resMedian    = stat(allRuns.map(r => r.researchCompleted)).median;
    const missionRate  = thr.durationMin > 0 ? Math.round((avgUpgrades / (thr.durationMin / 1440)) * 10) / 10 : 0;

    const { label, flags } = labelPhase(thr, stallRate, progressRate, shortageRate, medianScore);
    labelCounts[label]++;

    phases.push({
      phaseId, phaseLabel: thr.label, durationMin: thr.durationMin,
      stallRate, progressionRate: progressRate, resourceShortageRate: shortageRate,
      missionRate, medianScore, upgradesMedian: upMedian, researchMedian: resMedian,
      label, flags,
    });
  }

  // Overall = most severe label, then most frequent
  const SEVERITY: DifficultyLabel[] = ["too_hard","too_slow","too_generous","too_easy","balanced"];
  const overall = SEVERITY.find(l => labelCounts[l] > 0) ?? "balanced";

  // Alerts for the dev
  const alerts: string[] = [];
  const hardPhases = phases.filter(p => p.label === "too_hard").map(p => p.phaseLabel);
  if (hardPhases.length)      alerts.push(`⚠ Difficulté excessive : ${hardPhases.join(", ")}`);
  const slowPhases = phases.filter(p => p.label === "too_slow").map(p => p.phaseLabel);
  if (slowPhases.length)      alerts.push(`⚠ Progression trop lente : ${slowPhases.join(", ")}`);
  const easyPhases = phases.filter(p => p.label === "too_easy").map(p => p.phaseLabel);
  if (easyPhases.length)      alerts.push(`⚠ Trop facile : ${easyPhases.join(", ")}`);
  const genPhases  = phases.filter(p => p.label === "too_generous").map(p => p.phaseLabel);
  if (genPhases.length)       alerts.push(`⚠ Économie trop généreuse : ${genPhases.join(", ")}`);
  if (!alerts.length)         alerts.push("✓ Toutes les phases sont équilibrées");

  return { phases, overall, alerts };
}

// ── Difficulty report ─────────────────────────────────────────────────────────

const LABEL_EMOJI: Record<DifficultyLabel, string> = {
  too_easy:     "🟢 TROP FACILE",
  balanced:     "✅ ÉQUILIBRÉ",
  too_hard:     "🔴 TROP DIFFICILE",
  too_slow:     "🟡 TROP LENT",
  too_generous: "🟠 TROP GÉNÉREUX",
};

export function printDifficultyReport(health: DifficultyHealth): void {
  console.log("\n" + div("═"));
  console.log("  COURBE DE DIFFICULTÉ STATISTIQUE  [diagnostic dev — lecture seule]");
  console.log(div("═"));
  console.log(`\n  VERDICT GLOBAL : ${LABEL_EMOJI[health.overall]}`);
  console.log(`  Basé sur ${STATIC_IDS.size} profils humains × ${Object.keys(PHASE_THRESHOLDS).length} phases`);

  console.log(`\n  ALERTES :`);
  for (const a of health.alerts) console.log(`    ${a}`);

  console.log(`\n  ${"Phase".padEnd(26)} ${"Diagnostic".padEnd(20)} ${"Prog/h".padStart(7)} ${"Stall%".padStart(7)} ${"Shortage%".padStart(10)} ${"Score médian".padStart(14)}`);
  console.log("  " + div("─").slice(0, W - 2));
  for (const ph of health.phases) {
    console.log(
      `  ${ph.phaseLabel.padEnd(26)}` +
      ` ${LABEL_EMOJI[ph.label].padEnd(20)}` +
      ` ${pad(ph.progressionRate.toFixed(2), 7)}` +
      ` ${pad(ph.stallRate + "%", 7)}` +
      ` ${pad(ph.resourceShortageRate + "%", 10)}` +
      ` ${pad(ph.medianScore, 14)}`,
    );
    for (const f of ph.flags)
      console.log(`    ${"↳".padStart(2)} ${f}`);
  }

  console.log(`\n  INDICATEURS DÉTAILLÉS PAR PHASE :`);
  for (const ph of health.phases) {
    console.log(`\n  ┌─ ${ph.phaseLabel.padEnd(W - 4, "─")}┐`);
    console.log(`  │  Diagnostic        : ${LABEL_EMOJI[ph.label]}`);
    console.log(`  │  Taux de blocage   : ${ph.stallRate}%  ${bar(ph.stallRate, 100, 20)}  [seuil: >${PHASE_THRESHOLDS[ph.phaseId].maxStall}%]`);
    console.log(`  │  Taux progression  : ${ph.progressionRate.toFixed(2)} upgrades/h  [attendu: ${PHASE_THRESHOLDS[ph.phaseId].minRate}–${PHASE_THRESHOLDS[ph.phaseId].maxRate}/h]`);
    console.log(`  │  Ressources insuf. : ${ph.resourceShortageRate}% des blocages  [>70% = problème]`);
    console.log(`  │  Missions (proxy)  : ${ph.missionRate} upgrades/jour mandat`);
    console.log(`  │  Taux échec ops    : non simulé — mesurer depuis stats joueurs réels`);
    console.log(`  │  Score médian      : ${ph.medianScore}  (upgrades: ${ph.upgradesMedian}, recherches: ${ph.researchMedian})`);
    if (ph.flags.length) {
      console.log(`  │  Observations :`);
      for (const f of ph.flags) console.log(`  │    → ${f}`);
    }
    console.log(`  └${div("─").slice(0, W - 2)}┘`);
  }
}

// ── Main report ───────────────────────────────────────────────────────────────
type ProfileSummary = { profile: Profile; byDuration: Array<{ dur: typeof DURATIONS[0]; runs: RunResult[] }> };

function printProfileReport(ps: ProfileSummary): void {
  const { profile, byDuration } = ps;
  console.log("\n" + div("═"));
  console.log(`  PROFIL : ${profile.label.toUpperCase()}  [${N_RUNS} runs]`);
  console.log(`  ${profile.desc}`);
  console.log(div("═"));

  for (const { dur, runs } of byDuration) {
    console.log(`\n  ┌─ ${dur.label.padEnd(W - 4, "─")}┐`);
    console.log(`  │  Durée réelle : ${fmtMin(dur.min)}  |  ${N_RUNS} simulations indépendantes`);
    console.log(`  │  ${"Métrique".padEnd(22)}  ${"Moyenne".padStart(8)}  ${"Médiane".padStart(8)}  ${"P10".padStart(8)}  ${"P90".padStart(8)}  ${"Min".padStart(8)}  ${"Max".padStart(8)}`);
    console.log(`  │  ${div("·").slice(0, W - 4)}`);
    printStatRow("Puissance finale",  stat(runs.map(r => r.globalPower)));
    printStatRow("Score final",       stat(runs.map(r => r.finalScore)));
    printStatRow("Upgrades bâtiments",stat(runs.map(r => r.buildingsUpgraded)));
    printStatRow("Recherches",        stat(runs.map(r => r.researchCompleted)));
    printStatRow("Unités entraînées", stat(runs.map(r => r.unitsTrained)));
    printStatRow("Stagnation (%tick)",stat(runs.map(r => r.stallPct)), "%");
    console.log(`  │`);

    const avgRes = meanRes(runs);
    const RES_ICONS: Record<RK, string> = { money: "💰", influence: "🎭", energy: "⚡", intelligence: "🔍", technology: "🔬", military: "⚔️ ", cyberDefense: "🛡️ " };
    const RES_MAX:   Record<RK, number>  = { money: 8000, influence: 400, energy: 500, intelligence: 300, technology: 300, military: 300, cyberDefense: 300 };
    console.log(`  │  Ressources moyennes en fin de période :`);
    for (const k of Object.keys(avgRes) as RK[]) {
      const v = avgRes[k]; const pct = Math.min(16, Math.round((v / RES_MAX[k]) * 16));
      console.log(`  │    ${RES_ICONS[k]} ${pad(k, 16, true)} ${pad(v, 7)}  ${bar(v, RES_MAX[k])}`);
    }
    console.log(`  │`);

    const bl = topBlockers(runs);
    if (bl.length > 0) {
      console.log(`  │  Blocages fréquents (ticks bloqués, toutes simulations) :`);
      for (const [k, v] of bl)
        console.log(`  │    ${pad(v, 7)}×  ${k}`);
      console.log(`  │`);
    }

    const units = topUnits(runs);
    if (units.length > 0) {
      console.log(`  │  Unités formées (total toutes simulations) :`);
      for (const [uid, qty] of units)
        console.log(`  │    ${pad(uid, 22, true)} ×${qty}`);
    }

    console.log(`  └${div("─").slice(0, W - 2)}┘`);
  }
}

function printComparison(summaries: ProfileSummary[]): void {
  console.log("\n" + div("═"));
  console.log("  TABLEAU COMPARATIF — SCORE FINAL MOYEN (PAR PROFIL × DURÉE)");
  console.log(div("═"));

  const durLabels = DURATIONS.map(d => pad(d.label, 13));
  console.log(`  ${"Profil".padEnd(16)}  ${durLabels.join("")}`);
  console.log("  " + div("─").slice(0, W - 2));
  for (const { profile, byDuration } of summaries) {
    const scores = byDuration.map(({ runs }) => pad(Math.round(stat(runs.map(r => r.finalScore)).mean), 13));
    console.log(`  ${pad(profile.label, 16, true)}  ${scores.join("")}`);
  }

  console.log(`\n  TABLEAU COMPARATIF — PUISSANCE GLOBALE MOYENNE`);
  console.log("  " + div("─").slice(0, W - 2));
  console.log(`  ${"Profil".padEnd(16)}  ${durLabels.join("")}`);
  console.log("  " + div("─").slice(0, W - 2));
  for (const { profile, byDuration } of summaries) {
    const powers = byDuration.map(({ runs }) => pad(Math.round(stat(runs.map(r => r.globalPower)).mean), 13));
    console.log(`  ${pad(profile.label, 16, true)}  ${powers.join("")}`);
  }

  console.log(`\n  TABLEAU COMPARATIF — TAUX DE STAGNATION MOYEN (%)`);
  console.log("  " + div("─").slice(0, W - 2));
  console.log(`  ${"Profil".padEnd(16)}  ${durLabels.join("")}`);
  console.log("  " + div("─").slice(0, W - 2));
  for (const { profile, byDuration } of summaries) {
    const stall = byDuration.map(({ runs }) => pad(stat(runs.map(r => r.stallPct)).mean + "%", 13));
    console.log(`  ${pad(profile.label, 16, true)}  ${stall.join("")}`);
  }
}

function printBalanceAnalysis(summaries: ProfileSummary[]): void {
  console.log("\n" + div("═"));
  console.log("  ANALYSE D'ÉQUILIBRAGE");
  console.log(div("═"));

  // Use 24h run for most analysis
  const at24h = summaries.map(({ profile, byDuration }) => ({
    profile,
    runs: byDuration.find(d => d.dur.min === 1440)?.runs ?? [],
  }));

  // 1. Progression speed
  const avgUpgrades = at24h.map(({ profile, runs }) => ({
    label: profile.label,
    avg: stat(runs.map(r => r.buildingsUpgraded)).mean,
  }));
  const maxUpg = Math.max(...avgUpgrades.map(x => x.avg));
  const minUpg = Math.min(...avgUpgrades.map(x => x.avg));
  console.log(`\n  ① Vitesse de progression (upgrades moyens à 24h réelles):`);
  for (const { label, avg } of avgUpgrades)
    console.log(`     ${pad(label, 14, true)}  ${bar(avg, maxUpg || 1)}  ${avg} upgrades`);
  if (minUpg < 3 && at24h.length > 0)
    console.log(`  ⚠ Progression très lente pour certains profils (< 3 upgrades/24h)`);
  if (maxUpg > 20)
    console.log(`  ⚠ Progression très rapide possible — ressources trop généreuses`);

  // 2. Resource saturation (inutile / trop rare)
  const optRuns = summaries.find(s => s.profile.id === "optimiseur")?.byDuration.find(d => d.dur.min === 10080)?.runs ?? [];
  if (optRuns.length > 0) {
    const avgFinalRes = meanRes(optRuns);
    const RES_LABELS: Record<RK, string> = { money: "Argent", influence: "Influence", energy: "Énergie", intelligence: "Renseignement", technology: "Technologie", military: "Militaire", cyberDefense: "Cyberdéfense" };
    const RES_MAX: Record<RK, number>  = { money: 8000, influence: 400, energy: 500, intelligence: 300, technology: 300, military: 300, cyberDefense: 300 };
    console.log(`\n  ② Ressources (optimiseur à 7 jours réels — saturation = probablement inutile):`);
    for (const k of Object.keys(avgFinalRes) as RK[]) {
      const pct = Math.round((avgFinalRes[k] / RES_MAX[k]) * 100);
      const tag = pct >= 90 ? "🟡 INUTILE / SATURÉE" : pct <= 10 ? "🔴 TROP RARE" : "✓";
      console.log(`     ${pad(RES_LABELS[k], 16, true)}  ${pad(avgFinalRes[k], 6)}  (${pct}% du max)  ${tag}`);
    }
  }

  // 3. Stagnation analysis
  const avgStall = at24h.map(({ profile, runs }) => ({
    label: profile.label,
    pct: stat(runs.map(r => r.stallPct)).mean,
  }));
  console.log(`\n  ③ Taux de stagnation à 24h (% ticks sans aucune action possible):`);
  for (const { label, pct } of avgStall) {
    const tag = pct > 40 ? "🔴 BLOQUÉ FRÉQUEMMENT" : pct > 20 ? "🟡 Ralentissements" : "✓";
    console.log(`     ${pad(label, 14, true)}  ${bar(pct, 100)}  ${pct}%  ${tag}`);
  }

  // 4. Score variance (random profile)
  const randRuns = summaries.find(s => s.profile.id === "aleatoire")?.byDuration.find(d => d.dur.min === 1440)?.runs ?? [];
  if (randRuns.length > 0) {
    const s = stat(randRuns.map(r => r.finalScore));
    const cv = s.mean > 0 ? Math.round((s.stddev / s.mean) * 100) : 0;
    console.log(`\n  ④ Variance du profil Aléatoire à 24h (impact des choix) :`);
    console.log(`     Score min: ${s.min}  |  max: ${s.max}  |  écart-type: ${s.stddev}  |  CV: ${cv}%`);
    if (cv > 40)  console.log(`     ⚠ Les choix ont un très fort impact — courbe d'apprentissage abrupte`);
    else if (cv > 20) console.log(`     ✓ Impact modéré des choix — bonne lisibilité du jeu`);
    else          console.log(`     🟡 Faible impact des choix — les stratégies se valent trop`);
  }

  // 5. Unit viability
  const optUnitRuns = summaries.find(s => s.profile.id === "optimiseur")?.byDuration ?? [];
  const neverUsed: string[] = [];
  const unitTotals: Record<string, number> = {};
  for (const { runs } of optUnitRuns) for (const [uid, qty] of topUnits(runs)) unitTotals[uid] = (unitTotals[uid] ?? 0) + qty;
  for (const uid of ALL_UID) { if (!unitTotals[uid]) neverUsed.push(uid); }
  console.log(`\n  ⑤ Viabilité des unités (optimiseur — jamais sélectionné = potentiellement sous-optimal) :`);
  for (const uid of ALL_UID) {
    const total = unitTotals[uid] ?? 0;
    const tag = total === 0 ? "🔴 JAMAIS OPTIMAL" : total < 5 ? "🟡 Peu utilisé" : "✓";
    console.log(`     ${pad(uid, 22, true)}  ${pad(total, 5)} unités  ${tag}`);
  }

  // 6. Research deadlock check
  console.log(`\n  ⑥ Vérification de l'arbre de recherche :`);
  const orphaned = ALL_RID.filter(rid => {
    const prereqs = RESEARCH[rid].prereqs;
    return prereqs.some(p => !ALL_RID.includes(p));
  });
  if (orphaned.length === 0) console.log(`     ✓ Tous les prérequis sont valides`);
  else for (const rid of orphaned) console.log(`     ⚠ Prérequis manquant pour : ${rid}`);

  const deepChain = ALL_RID.filter(rid => {
    let depth = 0, cur = rid;
    const visited = new Set<string>();
    while (RESEARCH[cur]?.prereqs.length > 0 && !visited.has(cur)) {
      visited.add(cur); cur = RESEARCH[cur].prereqs[0]; depth++;
    }
    return depth >= 3;
  });
  if (deepChain.length > 0) {
    console.log(`     ⚠ Recherches avec chaîne de 3+ prérequis (risque de verrouillage tardif) :`);
    for (const rid of deepChain) console.log(`       ${rid}`);
  }

  // 7. Optimizer vs Beginner gap
  const optPower = stat(at24h.find(x => x.profile.id === "optimiseur")?.runs.map(r => r.globalPower) ?? []).mean;
  const debPower = stat(at24h.find(x => x.profile.id === "debutant")?.runs.map(r => r.globalPower) ?? []).mean;
  if (optPower > 0 && debPower > 0) {
    const ratio = (optPower / debPower).toFixed(2);
    console.log(`\n  ⑦ Écart Optimiseur vs Débutant (puissance à 24h) :`);
    console.log(`     Débutant : ${Math.round(debPower)}  |  Optimiseur : ${Math.round(optPower)}  |  Ratio : ×${ratio}`);
    if (parseFloat(ratio) > 4)     console.log(`     🔴 Écart très important — le jeu punit sévèrement les mauvais choix`);
    else if (parseFloat(ratio) > 2) console.log(`     🟡 Écart notable — courbe d'apprentissage significative`);
    else                             console.log(`     ✓ Écart raisonnable — le jeu reste accessible`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main(): void {
  const profiles = PROFILE_FILTER === "all"
    ? PROFILES
    : PROFILES.filter(p => p.id === PROFILE_FILTER);

  if (profiles.length === 0) {
    console.error(`Profil inconnu : "${PROFILE_FILTER}". Valides : ${PROFILES.map(p => p.id).join(", ")}`);
    process.exit(1);
  }

  console.log("\n" + "╔" + "═".repeat(W - 2) + "╗");
  console.log("║" + "  SIMULATEUR D'ÉQUILIBRAGE — PRÉSIDENT : NATION EN CRISE".padEnd(W - 2) + "║");
  console.log("║" + `  ${N_RUNS} runs × ${profiles.length} profils × ${DURATIONS.length} durées`.padEnd(W - 2) + "║");
  console.log("║" + `  Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`.padEnd(W - 2) + "║");
  console.log("╚" + "═".repeat(W - 2) + "╝");

  const t0 = Date.now();
  const summaries: ProfileSummary[] = [];

  for (const profile of profiles) {
    process.stdout.write(`  Simulation : ${profile.label.padEnd(14)} `);
    const byDuration = DURATIONS.map(dur => {
      process.stdout.write(".");
      const runs = runMany(profile, dur.min, N_RUNS);
      return { dur, runs };
    });
    process.stdout.write(" OK\n");
    summaries.push({ profile, byDuration });
    printProfileReport({ profile, byDuration });
  }

  if (profiles.length > 1) {
    printComparison(summaries);
    printBalanceAnalysis(summaries);
    const health = computeDifficultyHealth(summaries);
    printDifficultyReport(health);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("\n" + div("═"));
  console.log(`  FIN — ${N_RUNS * profiles.length * DURATIONS.length} simulations en ${elapsed}s. Aucun fichier modifié.`);
  console.log(div("═") + "\n");
}

main();
