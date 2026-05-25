import type { OperationType } from "@/types/strategy";

export interface OperationNarrative {
  title: string;
  body:  string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ── Narratives de blocage ─────────────────────────────────────────────────────

export type BlockReason = "resources" | "building" | "relations" | "relations_good" | "cooldown";

export const BLOCKED_NARRATIVES: Record<BlockReason, OperationNarrative[]> = {
  resources: [
    { title: "Ressources insuffisantes", body: "Les fonds ou équipements nécessaires ne sont pas disponibles. Cette opération restera en veille jusqu'à ce que les ressources soient réunies." },
    { title: "Budget opérationnel épuisé", body: "Le financement de cette mission dépasse les capacités actuelles. Reconstituez vos réserves avant de relancer l'ordre." },
    { title: "Manque de moyens", body: "Les services ont évalué le dossier — les ressources disponibles ne permettent pas d'engager cette opération dans les délais voulus." },
  ],
  building: [
    { title: "Infrastructure manquante", body: "L'opération requiert une installation que nous n'avons pas encore mise en place. Une modernisation des capacités s'impose en priorité." },
    { title: "Capacité opérationnelle insuffisante", body: "Nos services ne disposent pas encore du niveau d'infrastructure requis. Le dossier est mis en attente." },
    { title: "Prérequis non satisfait", body: "Cette mission dépend d'équipements ou de structures qui ne sont pas encore opérationnels. L'acquisition est recommandée avant toute relance." },
  ],
  relations: [
    { title: "Contexte diplomatique défavorable", body: "Les relations bilatérales actuelles ne permettent pas d'engager cette action sans risquer un incident majeur. Patience stratégique requise." },
    { title: "Protocole diplomatique", body: "Lancer cette opération dans le contexte actuel reviendrait à franchir une ligne rouge. La prudence s'impose — nous n'avons pas les leviers nécessaires." },
    { title: "Niveau relationnel insuffisant", body: "Cette initiative présuppose un niveau de relations que nous n'avons pas encore atteint avec ce pays. Le terrain diplomatique doit être préparé." },
  ],
  relations_good: [
    { title: "Relations trop stables pour agir", body: "Les relations bilatérales sont trop solides pour justifier cette action sans la compromettre irrémédiablement. Ce serait contre-productif." },
    { title: "Partenariat incompatible avec l'action", body: "Nous ne pouvons pas engager cette opération contre un pays avec lequel nous entretenons des liens aussi étroits. Ce serait une trahison stratégique." },
    { title: "Contexte diplomatique trop favorable", body: "Cette action est réservée aux situations de tensions. Nos excellentes relations actuelles la rendent inutile — et dangereuse." },
  ],
  cooldown: [
    { title: "Délai opérationnel en cours", body: "Les équipes sont en phase de récupération et de re-préparation. Le règlement opérationnel impose ce délai de sécurité entre deux missions." },
    { title: "Rechargement des capacités", body: "Les ressources humaines et techniques engagées lors de la précédente mission n'ont pas encore été reconstituées. Patience." },
    { title: "Fenêtre opérationnelle fermée", body: "La mission précédente a consommé les capacités de cette unité. Une nouvelle fenêtre s'ouvrira sous peu — soyez prêt à l'exploiter." },
  ],
};

export function getBlockedNarrative(reason: string): OperationNarrative {
  let key: BlockReason = "resources";
  if (reason.includes("Infrastructure") || reason.includes("Nécessite")) key = "building";
  else if (reason.includes("trop bonnes")) key = "relations_good";
  else if (reason.includes("Relations") || reason.includes("insuffisantes")) key = "relations";
  else if (reason.includes("cooldown") || reason.includes("Rechargement")) key = "cooldown";
  return pick(BLOCKED_NARRATIVES[key]);
}

// ── Narratives d'opérations ───────────────────────────────────────────────────

const SUCCESS: Record<OperationType, OperationNarrative[]> = {
  espionage: [
    { title: "Mission accomplie", body: "L'agent a transmis les données avant d'être extrait. Le réseau de sources a fonctionné sans accroc. La valise diplomatique est en route vers Paris." },
    { title: "Renseignement obtenu", body: "Contact établi à 02h17. Les informations ont été récupérées via le canal secondaire. L'agent est en sécurité et son extraction est confirmée." },
    { title: "Extraction réussie", body: "La cellule a travaillé en silence pendant soixante-douze heures. Ni vu ni connu. Les données arrivent à Paris dans les prochaines heures." },
    { title: "Opération silencieuse", body: "Aucune alerte adverse signalée. L'agent a livré un bilan complet avant de rejoindre sa couverture. Résultat au-delà des attentes." },
  ],
  steal_intel: [
    { title: "Exfiltration réussie", body: "L'équipe a pénétré le réseau cible à 03h14 et s'est repliée avant que les alarmes ne se déclenchent. Les fichiers sont en cours d'analyse à la DGSE." },
    { title: "Documents exfiltrés", body: "Opération éclair. Trois téraoctets de données stratégiques copiés en silence. L'accès est effacé des journaux système adverses." },
    { title: "Vol de données accompli", body: "Le vecteur d'entrée a fonctionné à la perfection. Les données circulent désormais via un canal chiffré. Aucun signal d'alerte côté adverse." },
    { title: "Intrusion maîtrisée", body: "L'équipe a exploité une fenêtre de vulnérabilité de douze minutes. Le retrait s'est fait sans laisser d'empreinte détectable. Mission validée." },
  ],
  cyber_attack: [
    { title: "Intrusion réussie", body: "Pénétration silencieuse. Les systèmes adverses ont subi une panne sélective de neuf heures. L'origine de l'attaque n'a pas été formellement établie." },
    { title: "Objectif neutralisé", body: "Les vecteurs d'intrusion ont fonctionné au-delà des attentes. Trois nœuds critiques du réseau adverse sont hors ligne. Impact confirmé." },
    { title: "Opération numérique validée", body: "Le payload a été déployé sans déclencher les systèmes de détection. Les infrastructures cibles accusent des défaillances progressives." },
    { title: "Réseau adverse compromis", body: "Nos équipes ont exploité une faille de type zéro-jour. Les conséquences se feront sentir dans les soixante-douze heures. Désengagement propre." },
  ],
  influence_campaign: [
    { title: "Récit stratégique déployé", body: "Le message est diffusé sur quatorze canaux médiatiques. L'opinion internationale perçoit désormais la position française comme modérée et constructive." },
    { title: "Campagne lancée avec succès", body: "Les équipes de communication ont activé le réseau. L'image de la France gagne en crédibilité sur les enceintes multilatérales." },
    { title: "Influence projetée", body: "Les vecteurs d'influence ont été activés avec précision. Le récit favorable se propage dans les médias ciblés selon le plan prévu." },
    { title: "Narrative ancrée", body: "La campagne atteint ses cibles. Les relais locaux diffusent le message avec naturel. Le soft power français marque des points." },
  ],
  sabotage: [
    { title: "Sabotage accompli", body: "L'équipe a atteint la cible sans être repérée. L'installation adverse sera hors service soixante-douze heures. Aucun dommage collatéral recensé." },
    { title: "Objectif neutralisé", body: "L'action a été menée avec la précision requise. Les dommages sont ciblés, discrets, et plausiblement niables. Mission classée." },
    { title: "Mission réussie avant l'aube", body: "L'équipe s'est repliée avant les premières lueurs. Les systèmes adverses montrent déjà les premières défaillances. Succès complet." },
    { title: "Opération clandestine concluante", body: "Entrée silencieuse, neutralisation précise, sortie propre. La cible n'est pas encore consciente de l'étendue des dégâts." },
  ],
  sanction: [
    { title: "Sanctions en vigueur", body: "Le décret est entré en vigueur à minuit. Les institutions financières alliées ont suspendu leurs opérations avec la cible. La pression s'installe." },
    { title: "Pression économique engagée", body: "Les mécanismes de sanctions ont été activés en coordination avec nos partenaires. L'impact se fera sentir dans les soixante-douze heures." },
    { title: "Mesures restrictives adoptées", body: "Les sanctions frappent les secteurs ciblés avec précision. La réponse de la cible sera scrutée attentivement par nos équipes d'analyse." },
  ],
  sign_treaty: [
    { title: "Traité ratifié", body: "La cérémonie s'est tenue dans un cadre discret mais solennel. Les deux parties ont échangé les instruments de ratification. Un partenariat nouveau est né." },
    { title: "Accord diplomatique conclu", body: "Les négociateurs ont finalisé le texte après quarante-huit heures de discussions. La signature intervient à un moment stratégique pour les deux nations." },
    { title: "Partenariat formalisé", body: "Le traité est signé. Les clauses de coopération entrent en application progressivement. Un signal fort adressé à nos partenaires régionaux." },
  ],
  diplomatic_aid: [
    { title: "Aide acheminée", body: "Le premier convoi est arrivé à destination sans incident. L'ambassade locale rapporte que le geste a été perçu comme un signal fort de solidarité française." },
    { title: "Soutien diplomatique déployé", body: "L'aide a été remise lors d'une cérémonie officielle. Les communiqués communs renforcent la posture française dans la région." },
    { title: "Coopération concrétisée", body: "La délégation française a été reçue chaleureusement. L'aide envoyée dépasse le symbolique — elle traduit un engagement stratégique durable." },
  ],
  reinforce_cyber: [
    { title: "Défenses consolidées", body: "Les équipes du COMCYBER ont déployé les nouvelles couches de protection en quarante-huit heures. Les sondes actives confirment une réduction de la surface d'attaque." },
    { title: "Cybersécurité renforcée", body: "Les correctifs critiques ont été appliqués sur l'ensemble des nœuds stratégiques. Le niveau de résilience numérique nationale est en hausse mesurable." },
    { title: "Infrastructure protégée", body: "La mise à niveau est effective. Les systèmes de détection ont été reconfigurés. La France présente un profil cyber nettement plus robuste." },
  ],
  military_operation: [
    { title: "Objectifs atteints", body: "Les unités engagées ont atteint leurs objectifs en moins de six heures. L'extraction s'est déroulée selon le plan nominal. Le Président a été informé à 05h30." },
    { title: "Opération accomplie", body: "La coordination entre les branches s'est révélée exemplaire. Pertes minimales, objectifs primaires sécurisés, désengagement en cours." },
    { title: "Mission militaire réussie", body: "L'effet de surprise a joué en notre faveur. Les unités sont en cours de recréditement sur les positions de départ. Bilan positif, aucune perte signalée." },
    { title: "Succès tactique", body: "L'opération s'est déroulée dans le temps imparti. Les objectifs géographiques et cinétiques ont été atteints. Retrait ordonné confirmé." },
  ],
};

const FAILURE: Record<OperationType, OperationNarrative[]> = {
  espionage: [
    { title: "Informations partielles", body: "L'agent a préféré interrompre la mission plutôt que compromettre sa couverture. Les données recueillies restent exploitables, mais incomplètes." },
    { title: "Mission dégradée", body: "Une contre-surveillance adverse a contraint l'agent à écourter l'opération. Retour sécurisé confirmé — bilan partiel seulement." },
    { title: "Couverture préservée, mission avortée", body: "L'agent a détecté une filature et interrompu l'opération. Sa couverture est intacte. Le renseignement obtenu reste insuffisant." },
  ],
  steal_intel: [
    { title: "Opération compromise", body: "Contact rompu à 23h47. L'équipe s'est heurtée à un chiffrement de dernière génération. Repli d'urgence effectué — aucune trace laissée, aucun blessé." },
    { title: "Mission interrompue", body: "Une anomalie dans le trafic réseau a déclenché une alerte adverse. L'équipe a effacé sa trace et s'est repliée. Résultat nul, agents sains." },
    { title: "Échec d'exfiltration", body: "Le système cible disposait d'une couche de sécurité non répertoriée. L'opération est avortée. Les équipes sont saines et le matériel récupéré." },
    { title: "Données verrouillées", body: "La cible avait renforcé ses défenses depuis notre dernière évaluation. L'équipe a préféré se replier plutôt que de forcer un accès trop risqué." },
  ],
  cyber_attack: [
    { title: "Attaque neutralisée", body: "Les pare-feux adverses ont réagi en quatre minutes. L'attaque a été contenue. Nos outils de pénétration ont été partiellement exposés — analyse en cours." },
    { title: "Défenses trop solides", body: "Le réseau adverse a détecté l'intrusion et coupé les connexions suspectes. Notre empreinte numérique est restée minimale — aucune attribution possible." },
    { title: "Contre-mesures actives", body: "Une équipe de réponse adverse a isolé les nœuds ciblés en temps réel. Résultat nul. Nos équipes ont désengagé proprement. Débriefing planifié." },
    { title: "Intrusion bloquée", body: "Le système de détection adverse a réagi avant que nos outils aient pu déployer leur charge. L'opération est annulée. Retour à la planification." },
  ],
  influence_campaign: [],
  sabotage: [
    { title: "Mission avortée", body: "La présence d'une unité de contre-espionnage adverse n'avait pas été anticipée. L'équipe a rompu le contact et s'est repliée sur un itinéraire secondaire." },
    { title: "Sabotage interrompu", body: "Une ronde de sécurité a croisé l'équipe à soixante mètres de l'objectif. Repli immédiat. Aucun agent compromis, aucun matériel laissé sur place." },
    { title: "Cible inaccessible", body: "Le périmètre de sécurité avait été renforcé sans préavis. L'équipe a évalué le risque et préféré l'extraction à la compromission. Mission annulée." },
    { title: "Défenses renforcées", body: "La cible disposait d'un dispositif de protection que nos renseignements n'avaient pas anticipé. L'équipe est rentrée saine — la mission est à refaire." },
  ],
  sanction: [],
  sign_treaty: [],
  diplomatic_aid: [],
  reinforce_cyber: [],
  military_operation: [
    { title: "Retraite ordonnée", body: "La résistance adverse s'est avérée supérieure aux estimations initiales. Le commandement a ordonné le repli tactique. Les unités se réorganisent." },
    { title: "Objectifs non atteints", body: "Des imprévus tactiques ont contraint les unités à interrompre l'avancée. L'état-major analyse les options pour une opération de suivi." },
    { title: "Mission compromise", body: "Le renseignement préalable comportait des lacunes critiques. L'opération a été suspendue pour éviter une escalade non maîtrisée. Débriefing en cours." },
    { title: "Repli tactique", body: "L'ennemi avait anticipé notre axe d'approche. Les forces se sont repliées en bon ordre. Pertes matérielles limitées, aucune perte humaine confirmée." },
  ],
};

// ── API publique ──────────────────────────────────────────────────────────────

export function getOperationNarrative(
  type: OperationType,
  success: boolean,
): OperationNarrative {
  const pool = success ? SUCCESS[type] : FAILURE[type];
  if (pool && pool.length > 0) return pick(pool);
  // Fallback si pas de narratif d'échec (opérations toujours réussies)
  return pick(SUCCESS[type] ?? [{ title: success ? "Opération réussie" : "Opération échouée", body: success ? "L'opération s'est déroulée selon les plans." : "L'opération n'a pas atteint ses objectifs." }]);
}
