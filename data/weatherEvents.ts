// Météo stratégique fictive — aucune donnée réelle ni API externe.
// La génération est déterministe depuis le mandateDay du jeu.

export type WeatherTypeId =
  | "canicule"
  | "vague_de_froid"
  | "tempete"
  | "pluies_intenses"
  | "secheresse"
  | "brouillard_dense"
  | "vents_violents"
  | "orage_electrique"
  | "episode_mediterraneen"
  | "neige_exceptionnelle";

export type VigilanceLevel = "vert" | "jaune" | "orange" | "rouge";

export interface WeatherTypeDef {
  id:          WeatherTypeId;
  label:       string;
  icon:        string;          // MaterialCommunityIcons
  color:       string;
  description: string;          // phrase courte du phénomène
  sectors:     string[];        // secteurs exposés
  situations:  string[];        // variantes de la situation actuelle (3 textes)
  forecasts:   string[];        // variantes de la prévision (3 textes)
  recommendations: Record<VigilanceLevel, string>; // conseil présidentiel par niveau
}

export const WEATHER_TYPES: Record<WeatherTypeId, WeatherTypeDef> = {
  canicule: {
    id:    "canicule",
    label: "Canicule",
    icon:  "thermometer-high",
    color: "#f05a28",
    description: "Températures très supérieures aux normales saisonnières.",
    sectors: ["Agriculture", "Santé publique", "Énergie", "Ressources en eau"],
    situations: [
      "Les relevés thermiques atteignent des pics historiques dans plusieurs bassins. Les réseaux électriques sont sous pression.",
      "Troisième nuit caniculaire consécutive enregistrée sur le territoire. Les hôpitaux signalent une saturation progressive.",
      "Vague de chaleur persistante. Les nappes phréatiques passent sous le seuil d'alerte dans les régions concernées.",
    ],
    forecasts: [
      "Aucune accalmie attendue avant 48 à 72 heures. Vigilance maintenue.",
      "Légère perturbation atlantique pourrait apporter une accalmie en fin de semaine.",
      "La masse d'air chaud reste stationnaire. L'amélioration est reportée à la semaine prochaine.",
    ],
    recommendations: {
      vert:   "Surveiller les prévisions saisonnières et anticiper les besoins en eau pour l'agriculture.",
      jaune:  "Activer les plans départementaux de veille sanitaire. Vérifier les stocks stratégiques d'eau.",
      orange: "Déclencher le plan canicule national. Mobiliser les services de santé et sécuriser l'approvisionnement électrique.",
      rouge:  "Déclarer l'état d'urgence climatique. Coordonner l'ensemble des ministères sur le plan national de crise canicule.",
    },
  },

  vague_de_froid: {
    id:    "vague_de_froid",
    label: "Vague de froid",
    icon:  "snowflake",
    color: "#4a9fff",
    description: "Froid intense avec températures nettement en dessous des normales.",
    sectors: ["Transport", "Santé publique", "Énergie", "Populations fragiles"],
    situations: [
      "Les températures s'effondrent sous les −10°C dans plusieurs régions. Les routes secondaires sont fermées.",
      "Vague de froid polaire : les réseaux de chauffage urbain sont en tension maximale. Les sans-abri sont prioritaires.",
      "Gel persistant bloque les infrastructures ferroviaires. Les hôpitaux enregistrent une surcharge hivernale.",
    ],
    forecasts: [
      "Le flux polaire devrait perdurer encore 5 à 7 jours. Maintien des dispositifs d'urgence.",
      "Une remontée douce atlantique est attendue en milieu de semaine, mais le gel nocturne restera.",
      "Pas d'amélioration notable à court terme. Les températures resteront anormalement basses.",
    ],
    recommendations: {
      vert:   "Préparer les plans hivernaux nationaux et vérifier les réserves énergétiques.",
      jaune:  "Activer les centres d'hébergement d'urgence. Vérifier la résilience des réseaux d'énergie.",
      orange: "Déclencher le plan grand froid. Priorité aux populations vulnérables et aux infrastructures critiques.",
      rouge:  "Mobilisation nationale. Suspendre les activités non essentielles et sécuriser l'ensemble des chaînes d'approvisionnement.",
    },
  },

  tempete: {
    id:    "tempete",
    label: "Tempête",
    icon:  "weather-hurricane",
    color: "#e54848",
    description: "Vents violents et précipitations intenses sur de larges zones.",
    sectors: ["Littoral", "Transport", "Bâtiment", "Sécurité civile"],
    situations: [
      "La dépression se creuse rapidement. Des rafales dépassant 130 km/h sont attendues sur le littoral.",
      "Tempête en cours : premières inondations signalées dans les zones côtières basses. Trafic maritime suspendu.",
      "Le front tempétueux balaie le territoire. Les réseaux électriques subissent des coupures localisées.",
    ],
    forecasts: [
      "Le système dépressionnaire devrait se décaler vers l'est d'ici 36 heures. Levée progressive des alertes.",
      "Un second front actif est attendu en fin de semaine. Pas de répit immédiat pour les régions exposées.",
      "Atténuation probable sous 48 heures, mais les dégâts pourraient nécessiter plusieurs jours de remise en état.",
    ],
    recommendations: {
      vert:   "Anticiper la saison des tempêtes. Vérifier les plans de protection des infrastructures côtières.",
      jaune:  "Renforcer les dispositifs de sécurité civile dans les zones exposées. Surveiller le trafic maritime.",
      orange: "Déclencher les plans ORSEC littoraux. Évacuer les zones à risque et mobiliser les équipes de secours.",
      rouge:  "Mise en alerte maximale des forces de sécurité civile. Coordination nationale d'urgence déclenchée.",
    },
  },

  pluies_intenses: {
    id:    "pluies_intenses",
    label: "Pluies intenses",
    icon:  "weather-pouring",
    color: "#a78bfa",
    description: "Précipitations exceptionnelles entraînant des risques de crues.",
    sectors: ["Transport", "Agriculture", "Sécurité civile", "Infrastructures"],
    situations: [
      "Cumuls de pluie anormalement élevés sur les bassins versants. Les niveaux des cours d'eau montent rapidement.",
      "Plusieurs axes routiers coupés par des inondations localisées. Les pompiers multiplient les interventions.",
      "Situation hydrologique dégradée. Les barrages sont surveillés en continu et les évacuations préventives engagées.",
    ],
    forecasts: [
      "La perturbation pluvieuse devrait se décaler vers l'est dans les prochaines 48 heures.",
      "Un flux humide s'installe durablement. Nouvelles précipitations attendues ce week-end.",
      "Amélioration progressive attendue à partir de demain, mais les crues pourraient persister.",
    ],
    recommendations: {
      vert:   "Surveiller les niveaux des cours d'eau et les rapports des services hydrologiques.",
      jaune:  "Préparer les plans communaux de sauvegarde et alerter les populations des zones inondables.",
      orange: "Activer les plans de prévention des inondations. Coordonner les services de secours et de génie civil.",
      rouge:  "Déclencher la procédure nationale d'urgence hydrologique. Évacuations massives si nécessaire.",
    },
  },

  secheresse: {
    id:    "secheresse",
    label: "Sécheresse",
    icon:  "weather-sunny-alert",
    color: "#e8a93a",
    description: "Déficit hydrique prolongé menaçant les ressources en eau.",
    sectors: ["Agriculture", "Ressources en eau", "Forêts", "Énergie hydraulique"],
    situations: [
      "Troisième mois consécutif de déficit pluviométrique. Les agriculteurs signalent des pertes de rendement importantes.",
      "Les niveaux des nappes phréatiques atteignent des niveaux historiquement bas dans plusieurs départements.",
      "Risque incendie maximal dans les zones forestières. Les restrictions d'eau s'appliquent à 60 % du territoire.",
    ],
    forecasts: [
      "Aucune perturbation pluvieuse significative à l'horizon des 10 jours.",
      "Quelques orages locaux possibles, insuffisants pour combler le déficit hydrique.",
      "Les modèles climatiques n'anticipent pas de retour à la normale avant plusieurs semaines.",
    ],
    recommendations: {
      vert:   "Initier les plans de gestion durable des ressources en eau pour la saison sèche.",
      jaune:  "Déclencher les restrictions d'usage de l'eau dans les zones concernées. Surveiller les forêts.",
      orange: "Activer les mesures de crise sécheresse. Soutenir les agriculteurs et sécuriser les ressources hydrauliques.",
      rouge:  "Déclaration nationale de crise hydrique. Rationner les usages non essentiels et activer les aides d'urgence.",
    },
  },

  brouillard_dense: {
    id:    "brouillard_dense",
    label: "Brouillard dense",
    icon:  "weather-fog",
    color: "#7e8a9e",
    description: "Brouillard persistant avec visibilité réduite à moins de 50 mètres.",
    sectors: ["Transport routier", "Aviation", "Maritime", "Logistique"],
    situations: [
      "Le brouillard s'est installé en nappe épaisse sur les plaines et les vallées. Visibilité quasi nulle sur les autoroutes.",
      "Perturbations massives du trafic aérien : plus de 40 % des vols au sol dans les aéroports concernés.",
      "Brouillard givrant sur les hauteurs. Les accidents de la route se multiplient sur les axes non équipés.",
    ],
    forecasts: [
      "Dissipation attendue dans la matinée une fois le rayonnement solaire suffisant.",
      "Les conditions brouillard pourraient se reconstituer dès demain matin. Pas d'amélioration durable.",
      "Le brouillard devrait persister jusqu'en fin de semaine avec une densité variable.",
    ],
    recommendations: {
      vert:   "Rappeler les consignes de sécurité routière et surveiller les conditions de transport.",
      jaune:  "Alerter les gestionnaires d'infrastructures et les opérateurs de transport public.",
      orange: "Réduire les limitations de vitesse et déployer des patrouilles de sécurité sur les axes concernés.",
      rouge:  "Envisager la fermeture des axes les plus dangereux. Coordonner avec les aéroports et ports les procédures d'urgence.",
    },
  },

  vents_violents: {
    id:    "vents_violents",
    label: "Vents violents",
    icon:  "weather-windy",
    color: "#22d3ee",
    description: "Rafales atteignant 100 à 150 km/h sur les zones exposées.",
    sectors: ["Éolien", "Transport", "Bâtiment", "Forêts"],
    situations: [
      "Des rafales à 120 km/h ont été enregistrées sur les crêtes et les littoraux. Plusieurs arbres arrachés.",
      "Les vents couchent les structures temporaires et perturbent les lignes électriques aériennes.",
      "Vents en rafales intenses. La circulation des poids lourds est suspendue sur les ponts et viaducs.",
    ],
    forecasts: [
      "Atténuation progressive des vents attendue d'ici 24 à 36 heures.",
      "Le vent pourrait se renforcer encore en soirée avant de mollir demain.",
      "Passage du front venteux d'ouest en est. Les régions de montagne resteront exposées.",
    ],
    recommendations: {
      vert:   "Contrôler les structures à risque (chantiers, abris temporaires, pylônes) dans les zones exposées.",
      jaune:  "Restreindre la circulation des véhicules légers exposés. Sécuriser les infrastructures critiques.",
      orange: "Fermer les axes exposés et activer les procédures de sécurisation des réseaux électriques.",
      rouge:  "Déploiement des forces de sécurité civile. Évacuation des zones particulièrement exposées.",
    },
  },

  orage_electrique: {
    id:    "orage_electrique",
    label: "Orage électrique",
    icon:  "weather-lightning",
    color: "#c4b5fd",
    description: "Cellules orageuses intenses avec risques de foudroiement et grêle.",
    sectors: ["Énergie", "Aviation", "Industrie", "Agriculture"],
    situations: [
      "Des cellules orageuses très actives traversent le territoire. Plusieurs incidents de foudroiement sur des infrastructures.",
      "Orages violents accompagnés de grêle. Des cultures sont sinistrées dans les zones touchées.",
      "Activité électrique exceptionnelle. Les opérateurs de réseau électrique signalent des surcharges localisées.",
    ],
    forecasts: [
      "Les orages devraient se décaler vers l'est d'ici la nuit prochaine.",
      "Nouveau cycle orageux attendu demain après-midi. Vigilance maintenue.",
      "Instabilité atmosphérique persistante. Les orages pourraient se répéter plusieurs jours de suite.",
    ],
    recommendations: {
      vert:   "Vérifier la robustesse des paratonnerres sur les installations critiques.",
      jaune:  "Alerter les opérateurs de réseau électrique et les services de sécurité civile.",
      orange: "Sécuriser les plateformes industrielles et activer les plans de continuité des opérateurs d'énergie.",
      rouge:  "Coordination d'urgence avec les gestionnaires de réseau. Anticiper les coupures et déployer les groupes électrogènes.",
    },
  },

  episode_mediterraneen: {
    id:    "episode_mediterraneen",
    label: "Épisode méditerranéen",
    icon:  "weather-flood",
    color: "#3b82f6",
    description: "Pluies cévenoles exceptionnelles avec risques d'inondations soudaines.",
    sectors: ["Inondations", "Agriculture", "Sécurité civile", "Réseaux routiers"],
    situations: [
      "Cumuls pluviométriques extrêmes : jusqu'à 300 mm en 24 heures sur les versants cévenols.",
      "Crues-éclairs en cours dans plusieurs vallées. Les secours sont mobilisés en masse.",
      "L'épisode méditerranéen s'intensifie. Les cours d'eau débordent de leur lit dans les zones urbanisées.",
    ],
    forecasts: [
      "L'épisode devrait s'achever dans les prochaines 24 heures mais les crues pourraient durer plusieurs jours.",
      "Conditions stationnaires. Pas d'amélioration avant demain soir.",
      "Affaiblissement progressif prévu mais les sols saturés maintiennent le risque d'inondation.",
    ],
    recommendations: {
      vert:   "Renforcer les plans de prévention des risques d'inondation sur les bassins méditerranéens.",
      jaune:  "Préparer les plans d'évacuation et alerter les communes des zones à risque.",
      orange: "Activer le plan ORSEC inondation. Déploiement préventif des forces de secours dans les vallées.",
      rouge:  "Évacuations d'urgence. Toutes les ressources de sécurité civile mobilisées sur le secteur touché.",
    },
  },

  neige_exceptionnelle: {
    id:    "neige_exceptionnelle",
    label: "Neige exceptionnelle",
    icon:  "weather-snowy-heavy",
    color: "#93c5fd",
    description: "Chutes de neige abondantes et verglas sur des zones inhabituellement touchées.",
    sectors: ["Transport", "Écoles", "Approvisionnement", "Sécurité civile"],
    situations: [
      "Enneigement record sur les plaines : jusqu'à 40 cm sur des zones non préparées.",
      "Les axes routiers principaux sont paralysés. Des milliers de véhicules bloqués sur les autoroutes.",
      "Chutes de neige continues. Les autorités locales débordées par le nombre d'interventions.",
    ],
    forecasts: [
      "Le front neigeux devrait se décaler vers le nord dans les prochaines 12 heures.",
      "Redoux attendu demain mais le verglas persistera plusieurs jours sur les zones exposées.",
      "Nouvelles chutes attendues en fin de semaine. La situation de transport restera perturbée.",
    ],
    recommendations: {
      vert:   "Préparer les plans hivernaux et s'assurer de l'approvisionnement en sel et sablage.",
      jaune:  "Activer les plans de déneigement et informer la population des recommandations de sécurité.",
      orange: "Fermer les axes les plus dangereux. Coordonner la gestion de crise entre préfets et gestionnaires routiers.",
      rouge:  "Mobilisation nationale d'urgence. Réquisition de moyens militaires si nécessaire pour libérer les axes bloqués.",
    },
  },
};

export const WEATHER_TYPE_LIST: WeatherTypeDef[] = Object.values(WEATHER_TYPES);

// ── Niveaux de vigilance ──────────────────────────────────────────────────────

export interface VigilanceDef {
  level:       VigilanceLevel;
  label:       string;
  sublabel:    string;
  color:       string;
  bgColor:     string;
}

export const VIGILANCE_DEFS: Record<VigilanceLevel, VigilanceDef> = {
  vert:   { level: "vert",   label: "Vert",   sublabel: "Pas de vigilance particulière", color: "#3fbe7a", bgColor: "#3fbe7a1a" },
  jaune:  { level: "jaune",  label: "Jaune",  sublabel: "Soyez attentifs",              color: "#e8a93a", bgColor: "#e8a93a1a" },
  orange: { level: "orange", label: "Orange", sublabel: "Soyez très vigilants",         color: "#f59a3a", bgColor: "#f59a3a1a" },
  rouge:  { level: "rouge",  label: "Rouge",  sublabel: "Vigilance absolue",            color: "#e54848", bgColor: "#e548481a" },
};

// ── Zones géographiques fictives ──────────────────────────────────────────────

export const WEATHER_ZONES = [
  "Bretagne et Nord-Atlantique",
  "Bassin parisien et Île-de-France",
  "Massif central et Auvergne",
  "Côte méditerranéenne et Provence",
  "Alpes et Jura",
  "Vallée du Rhône et Dauphiné",
  "Pyrénées et Gascogne",
  "Grand Est et Alsace",
  "Normandie et Hauts-de-France",
  "Languedoc et Roussillon",
  "Territoire national",
  "Façade atlantique",
];
