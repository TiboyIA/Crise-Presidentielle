# Prompts de génération — Refonte visuelle « Président : Nation en Crise »

Ce document fournit les **prompts exacts** pour générer les fonds photo `.webp`
des grandes sections (Midjourney / DALL·E 3 / SDXL). Les fonds cinématiques
SVG (grille tactique + halo radar + vignette) sont déjà en place via
`SectionBackdrop` ; ces images photo viennent **enrichir** l'ambiance.

## Règles communes (à ajouter à chaque prompt)

```
cinematic, photorealistic, serious institutional atmosphere, national crisis
command center, dark moody lighting, deep navy and graphite tones, subtle cyan
data glow, volumetric haze, shallow depth of field, no text, no logos, no people
faces visible, 16:9, ultra detailed, dramatic but legible, color grade #0a0c14
shadows with #c9a84c gold accents
```

Cadrage : laisser le **bas de l'image plus sombre** (le contenu UI s'affiche par
dessus avec une vignette). Éviter tout élément vif au centre-bas.

## Format de sortie

- Résolution source : **1920×1080** puis export **WebP qualité ~70**, < 250 Ko.
- Nommage : voir colonne *Fichier* (déjà référencé dans `constants/sectionIdentity.ts`).
- Déposer dans `assets/images/backgrounds/` puis câbler dans `constants/assets.ts`
  (`BG_SECTION[...]`) — le champ `bgAsset` de chaque section indique le nom attendu.

---

## Fonds de section

| Section | Fichier | Prompt spécifique |
|---|---|---|
| Tableau de bord présidentiel | `bg_dashboard_presidentiel.webp` | *modern presidential command room, large curved situation display wall, national map hologram, empty leather command chair from behind, gold institutional emblem faint on wall* |
| Journal de Crise | `bg_journal_crise.webp` | *crisis press desk, dim newsroom, wall of muted broadcast screens showing abstract breaking-news lower-thirds, deep crimson alert glow, papers on a dark desk* |
| Salle Météo Nationale | `bg_salle_meteo_nationale.webp` | *national weather forecasting center, large radar sweep screen, animated storm satellite map, blue cyan glow, meteorological workstations* |
| Cellule Santé Publique | `bg_cellule_sante_publique.webp` | *public health coordination room, hospital capacity dashboards, anatomical-free medical data screens, calm teal lighting, situation table* |
| Conseil de Sécurité | `bg_conseil_securite.webp` | *military situation room, tactical map table glowing, defense status wall screens, dark red command lighting, no weapons close-up* |
| Économie & Finances | `bg_economie_finances.webp` | *ministry of economy control room, financial market charts on glass screens, austere marble and graphite, warm gold data glow* |
| Infrastructures & Énergie | `bg_infrastructures_energie.webp` | *national grid supervision center, power network map, energy flow diagrams, amber warning indicators, technical operations room* |
| Diplomatie & International | `bg_diplomatie.webp` | *diplomatic situation room, world map projection, negotiation table, flags blurred in background, cool blue institutional tone* |
| Centre de Cyberdéfense | `bg_cyberdefense.webp` | *security operations center SOC, dark room, walls of network monitoring screens, green and cyan threat maps, server glow* |
| Cabinet Ministériel | `bg_cabinet.webp` | *government cabinet meeting room, long polished table, empty chairs, national crest faint on wall, steel-blue lighting* |
| Recherche & Innovation | `bg_recherche.webp` | *strategic research lab, holographic tech tree, quantum/abstract science displays, violet and cyan glow, clean futuristic* |
| Carte Mondiale | `bg_carte_mondiale.webp` | *geostrategic world map wall, glowing connection arcs between continents, dark control room, blue data tone* |

## Illustrations de cartes de crise (optionnel, 1:1 ou 4:3)

Même style commun. Fichiers suggérés dans `assets/images/events/` :

| Crise | Fichier | Prompt spécifique |
|---|---|---|
| Crise sociale | `event_social.webp` | *large peaceful but tense protest crowd at dusk, banners blurred, no readable text* |
| Crise sanitaire | `event_health.webp` | *hospital corridor under pressure, triage tents, calm clinical lighting* |
| Catastrophe naturelle | `event_disaster.webp` | *aftermath of natural disaster, emergency response lights, dramatic sky* |
| Panne électrique | `event_blackout.webp` | *city skyline partially blacked out at night, one district dark* |
| Cyberattaque | `event_cyber.webp` | *abstract intrusion visualization, breached network nodes, red alert glow* |
| Tension diplomatique | `event_diplomacy.webp` | *two delegations facing across a table, cold standoff atmosphere* |
| Crise économique | `event_economy.webp` | *falling market charts on trading screens, somber finance district* |
| Menace sécuritaire | `event_security.webp` | *security forces silhouettes at a checkpoint at night, tense* |
| Inondation | `event_flood.webp` | *flooded urban street, emergency boats, grey storm light* |
| Tempête | `event_storm.webp` | *violent storm over coastline, radar-like clouds* |
| Sécheresse | `event_drought.webp` | *cracked dry farmland, hazy hot horizon* |
| Saturation hospitalière | `event_hospital_overload.webp` | *crowded hospital waiting area, staff under strain, clinical* |

## Icônes

Les icônes sont **déjà couvertes** par MaterialCommunityIcons (vectoriel,
homogène) via `constants/iconMap.ts` et `constants/sectionIdentity.ts`.
Aucune génération d'icône nécessaire.

## Drapeaux pays (cas spécial)

Les 20 drapeaux (🇫🇷 …) restent en emoji Unicode faute d'assets dédiés.
Pour les remplacer : générer/intégrer un jeu de pastilles drapeaux rondes
(`assets/images/flags/<countryId>.webp`, 64×64) puis mapper dans
`data/countries.ts`. Style : drapeau réaliste en cercle, légère ombre portée.
