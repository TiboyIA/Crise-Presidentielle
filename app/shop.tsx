import React, { useCallback, useState } from "react";
import { PORTRAITS } from "@/data/portraits";
import { THEMES } from "@/data/themes";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { isPackFree, useEntitlements } from "@/lib/entitlements";
import { purchasePack, restorePurchases } from "@/lib/purchases";
import { GameSecurityService } from "@/services/GameSecurityService";
import type { EventPack } from "@/data/events";
import {
  SHOP_BULLET_THUMBS,
  SHOP_HERO,
  SHOP_ICONS,
  SHOP_PACK_BANNERS,
  type ClimateBulletKey,
} from "@/data/shopImages";

type ShopCategoryId = "scenarios" | "pays" | "politiques";

interface ShopCategoryDef {
  id: ShopCategoryId;
  icon: string;
  title: string;
  subtitle: string;
}

interface BulletEntry {
  id: ClimateBulletKey;
  label: string;
}

interface PackInfo {
  id: EventPack;
  bannerKey: keyof typeof SHOP_PACK_BANNERS;
  title: string;
  tag: string;
  price: string;
  description: string;
  bullets: BulletEntry[];
  category: ShopCategoryId;
}

interface ComingSoonPack {
  id: string;
  bannerKey?: keyof typeof SHOP_PACK_BANNERS;
  title: string;
  tag: string;
  description: string;
  price?: string;
  category: ShopCategoryId;
}

const SHOP_CATEGORIES: ShopCategoryDef[] = [
  {
    id: "scenarios",
    icon: "flash",
    title: "SCÉNARIOS DE CRISE",
    subtitle: "Nouveaux événements thématiques injectés dans vos crises",
  },
  {
    id: "pays",
    icon: "earth",
    title: "PAYS JOUABLES",
    subtitle: "Prenez les commandes d'une autre puissance mondiale",
  },
  {
    id: "politiques",
    icon: "bank-outline",
    title: "POLITIQUES & GOUVERNANCE",
    subtitle: "Nouvelles doctrines et styles de gouvernement",
  },
];

const PACKS: PackInfo[] = [
  {
    id: "climate",
    bannerKey: "climate",
    title: "Crise climatique",
    tag: "OFFERT — PACK DE LANCEMENT",
    price: "0 €",
    category: "scenarios",
    description:
      "Douze nouveaux événements thématiques : canicules meurtrières, sécheresses, méga-feux, inondations, tensions agricoles, blackouts énergétiques. Chaque crise force des arbitrages déchirants entre écologie, souveraineté et popularité. Inclus gratuitement avec le jeu.",
    bullets: [
      { id: "canicule", label: "Dôme de chaleur à 45°C" },
      { id: "crue", label: "Crue exceptionnelle de la Seine" },
      { id: "megafeu", label: "Méga-feu de 30 000 hectares" },
      { id: "revolte", label: "Révolte agricole nationale" },
      { id: "penurie", label: "Pénuries d'eau en montagne" },
      { id: "migration", label: "Migration intra-européenne" },
    ],
  },
  {
    id: "guerre_hybride",
    bannerKey: "cyber",
    title: "Guerre Hybride",
    tag: "PACK PREMIUM",
    price: "2,99 €",
    category: "scenarios",
    description:
      "10 nouveaux événements premium : fuite de documents classifiés, sabotage industriel, cyberattaque bancaire, pression diplomatique coordonnée, infiltration institutionnelle, brouillage satellite, manipulation sociale et chantage énergétique.",
    bullets: [],
  },
  {
    id: "cyber",
    bannerKey: "cyber",
    title: "Cyber & Désinformation",
    tag: "PACK PREMIUM",
    price: "2,99 €",
    category: "scenarios",
    description:
      "10 nouveaux événements premium : cyberattaque d'hôpital, campagne de fake news coordonnée, infiltration de bots étrangers, panne télécom nationale, fuite de données gouvernementales, sabotage réseau électrique, manipulation d'élection par IA, espionnage industriel, blackout numérique et guerre de l'information.",
    bullets: [],
  },
];

const COMING_SOON: ComingSoonPack[] = [
  {
    id: "pack_grandes_puissances",
    title: "Pays — Grandes Puissances",
    tag: "BIENTÔT",
    price: "4,99 €",
    category: "pays",
    description:
      "Jouez avec 5 nations supplémentaires : États-Unis 🇺🇸, Chine 🇨🇳, Russie 🇷🇺, Royaume-Uni 🇬🇧, Allemagne 🇩🇪. Chaque pays apporte ses propres ressources initiales et ses défis géopolitiques uniques.",
  },
  {
    id: "pack_asie_pacifique",
    title: "Pays — Asie-Pacifique",
    tag: "BIENTÔT",
    price: "3,99 €",
    category: "pays",
    description:
      "Jouez avec 5 nations supplémentaires : Japon 🇯🇵, Corée du Sud 🇰🇷, Inde 🇮🇳, Australie 🇦🇺, Pakistan 🇵🇰. Affrontez les tensions régionales et les dynamiques économiques de l'Indo-Pacifique.",
  },
  {
    id: "pack_reste_monde",
    title: "Pays — Reste du Monde",
    tag: "BIENTÔT",
    price: "3,99 €",
    category: "pays",
    description:
      "Jouez avec 9 nations supplémentaires : Brésil 🇧🇷, Turquie 🇹🇷, Iran 🇮🇷, Israël 🇮🇱, Arabie Saoudite 🇸🇦, Nigéria 🇳🇬, Canada 🇨🇦, Italie 🇮🇹, Corée du Nord 🇰🇵.",
  },
  {
    id: "politiques_avancees",
    title: "Politiques Avancées",
    tag: "BIENTÔT",
    price: "2,99 €",
    category: "politiques",
    description:
      "3 nouvelles doctrines de gouvernance : Souverainiste (primauté nationale, stabilité institutionnelle), Écologiste (transition verte, bonne presse, économie ralentie) et Libéral (croissance forte, inégalités accrues). Chacune avec ses dérives passives et ses arbitrages uniques.",
  },
];

function PackBanner({
  source,
  dimmed = false,
}: {
  source: ImageSourcePropType;
  dimmed?: boolean;
}) {
  return (
    <View style={styles.packBanner}>
      <Image source={source} style={styles.packBannerImg} resizeMode="cover" />
      <View
        style={[
          styles.packBannerOverlay,
          { backgroundColor: dimmed ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.18)" },
        ]}
      />
    </View>
  );
}

function HeroBanner() {
  return (
    <View style={styles.heroWrap}>
      <Image source={SHOP_HERO} style={styles.heroImg} resizeMode="cover" />
      <View style={styles.heroOverlay} />
    </View>
  );
}

export default function ShopScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasPack, grantLocal, revokeLocal, refresh, loaded } = useEntitlements();
  const [purchasing, setPurchasing] = useState<EventPack | null>(null);
  const [restoring, setRestoring] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const onPurchase = useCallback(
    async (pack: EventPack) => {
      setPurchasing(pack);
      try {
        const result = await GameSecurityService.dispatch(
          { type: "purchase_pack", payload: { pack } },
          async () => {
            if (Platform.OS === "web") {
              // Web/Replit preview: stub purchase for testing purposes.
              await new Promise<void>((resolve) => setTimeout(resolve, 350));
              await grantLocal(pack);
              return;
            }
            // Native: real RevenueCat purchase. refresh() syncs state from RC.
            try {
              await purchasePack(pack);
              await refresh();
            } catch (e: unknown) {
              // PURCHASE_CANCELLED is not an error — user tapped back. Swallow
              // it so dispatch doesn't surface a spurious error.
              const cancelled = (e as { userCancelled?: boolean })?.userCancelled;
              if (!cancelled) throw e;
            }
          },
        );
        if (result.rateLimited) {
          Alert.alert(
            "Veuillez patienter",
            "Attendez quelques secondes avant de réessayer.",
          );
        } else if (!result.ok && result.error) {
          Alert.alert(
            "Achat impossible",
            "Une erreur est survenue. Vérifiez votre connexion et réessayez.",
          );
        }
      } finally {
        setPurchasing(null);
      }
    },
    [grantLocal, refresh],
  );

  const onRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      await refresh();
      if (Platform.OS === "web") return;
      Alert.alert(
        "Achats restaurés",
        restored.length > 0
          ? `${restored.length} pack(s) récupéré(s).`
          : "Aucun achat à restaurer pour ce compte.",
        [{ text: "OK" }],
      );
    } catch {
      Alert.alert("Erreur", "Impossible de restaurer les achats. Réessayez.", [{ text: "OK" }]);
    } finally {
      setRestoring(false);
    }
  }, [refresh]);

  const onRevoke = useCallback(
    async (pack: EventPack) => {
      const message =
        "Retirer ce pack ?\n\nLe contenu de l'extension ne s'affichera plus dans vos prochaines crises. Vous pourrez le réactiver à tout moment.";
      if (Platform.OS === "web") {
        // React Native's Alert.alert is a no-op on web; fall back to the
        // browser's native confirm so the UX still works in the preview.
        if (typeof window !== "undefined" && window.confirm(message)) {
          void revokeLocal(pack);
        }
        return;
      }
      Alert.alert(
        "Retirer ce pack ?",
        "Le contenu de l'extension ne s'affichera plus dans vos prochaines crises. Vous pourrez le réactiver à tout moment.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Retirer",
            style: "destructive",
            onPress: () => {
              void revokeLocal(pack);
            },
          },
        ],
      );
    },
    [revokeLocal],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + webTopInset + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          BOUTIQUE
        </Text>
        <View style={styles.closeBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + webBottomInset + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HeroBanner />

        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Étendez le jeu avec des packs thématiques. Le contenu de base reste
          gratuit ; les extensions ajoutent de nouveaux dilemmes au tirage.
        </Text>

        {!loaded ? (
          <Text style={[styles.intro, { color: colors.mutedForeground }]}>
            Chargement…
          </Text>
        ) : (
          <>
            {SHOP_CATEGORIES.map((cat, catIdx) => {
              const activePacks = PACKS.filter((p) => p.category === cat.id);
              const comingSoonPacks = COMING_SOON.filter((p) => p.category === cat.id);
              return (
                <React.Fragment key={cat.id}>
                  <View
                    style={[
                      styles.categoryHeader,
                      catIdx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: 8, paddingTop: 24 },
                    ]}
                  >
                    <MaterialCommunityIcons name={cat.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]} size={22} color={colors.foreground} style={styles.categoryIcon} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
                        {cat.title}
                      </Text>
                      <Text style={[styles.categorySubtitle, { color: colors.mutedForeground }]}>
                        {cat.subtitle}
                      </Text>
                    </View>
                  </View>

                  {activePacks.map((p) => {
                    const owned = hasPack(p.id);
                    const free = isPackFree(p.id);
                    const isPurchasing = purchasing === p.id;
                    return (
                      <View
                        key={p.id}
                        style={[
                          styles.card,
                          { backgroundColor: colors.card, borderColor: owned ? colors.primary : colors.border },
                        ]}
                      >
                        <PackBanner source={SHOP_PACK_BANNERS[p.bannerKey]} />
                        <View style={styles.cardBody}>
                          <View style={styles.cardTop}>
                            <Text style={[styles.cardTag, { color: colors.primary }]}>{p.tag}</Text>
                            {free ? (
                              <View style={[styles.ownedBadge, { backgroundColor: colors.primary }]}>
                                <Image source={SHOP_ICONS.gift} style={styles.badgeIcon} resizeMode="contain" />
                                <Text style={[styles.ownedText, { color: colors.primaryForeground }]}>OFFERT</Text>
                              </View>
                            ) : owned ? (
                              <View style={[styles.ownedBadge, { backgroundColor: colors.primary }]}>
                                <Image source={SHOP_ICONS.check} style={styles.badgeIcon} resizeMode="contain" />
                                <Text style={[styles.ownedText, { color: colors.primaryForeground }]}>DÉBLOQUÉ</Text>
                              </View>
                            ) : (
                              <Text style={[styles.cardPrice, { color: colors.foreground }]}>{p.price}</Text>
                            )}
                          </View>
                          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{p.title}</Text>
                          <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>{p.description}</Text>
                          <View style={styles.bulletList}>
                            {p.bullets.map((b) => (
                              <View key={b.id} style={styles.bulletRow}>
                                <Image
                                  source={SHOP_BULLET_THUMBS[b.id]}
                                  style={[styles.bulletThumb, { borderColor: colors.border }]}
                                  resizeMode="cover"
                                />
                                <Text style={[styles.bulletText, { color: colors.foreground }]}>{b.label}</Text>
                              </View>
                            ))}
                          </View>
                          {free ? (
                            <Text style={[styles.giftNote, { color: colors.mutedForeground }]}>
                              Inclus avec le jeu, accessible immédiatement.
                            </Text>
                          ) : owned ? (
                            <Pressable
                              onPress={() => onRevoke(p.id)}
                              style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                            >
                              <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>Retirer le pack</Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              onPress={() => void onPurchase(p.id)}
                              disabled={isPurchasing}
                              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed || isPurchasing ? 0.7 : 1 }]}
                            >
                              <Image source={SHOP_ICONS.unlock} style={styles.primaryBtnIcon} resizeMode="contain" />
                              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                                {isPurchasing ? "EN COURS…" : "DÉBLOQUER"}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {comingSoonPacks.map((p) => (
                    <View
                      key={p.id}
                      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.78 }]}
                    >
                      {p.bannerKey ? <PackBanner source={SHOP_PACK_BANNERS[p.bannerKey]} dimmed /> : null}
                      <View style={styles.cardBody}>
                        <View style={styles.cardTop}>
                          <Text style={[styles.cardTag, { color: colors.mutedForeground }]}>{p.tag}</Text>
                          {p.price && (
                            <Text style={[styles.cardPrice, { color: colors.foreground, opacity: 0.55 }]}>{p.price}</Text>
                          )}
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{p.title}</Text>
                        <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>{p.description}</Text>
                      </View>
                    </View>
                  ))}
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* ── Cosmétiques ─────────────────────────────────────────── */}
        <View style={[styles.categoryHeader, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: 8, paddingTop: 24 }]}>
          <MaterialCommunityIcons name="palette-outline" size={22} color={colors.foreground} style={styles.categoryIcon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.categoryTitle, { color: colors.foreground }]}>COSMÉTIQUES</Text>
            <Text style={[styles.categorySubtitle, { color: colors.mutedForeground }]}>
              Personnalisez le portrait de votre président
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.portraitRow}
        >
          {PORTRAITS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                if (!p.free) {
                  Alert.alert(
                    p.name,
                    `${p.flavorText}\n\nDisponible bientôt — ${p.price}`,
                    [{ text: "OK" }],
                  );
                }
              }}
              style={({ pressed }) => [styles.portraitTile, { opacity: pressed && !p.free ? 0.7 : 1 }]}
            >
              <View
                style={[
                  styles.portraitCircle,
                  { backgroundColor: p.bgColor, borderColor: p.free ? p.borderColor : colors.border },
                ]}
              >
                <Text style={styles.portraitIcon}>{p.icon}</Text>
                {!p.free && (
                  <View style={styles.portraitLockBadge}>
                    <MaterialCommunityIcons name="lock-outline" size={9} color={colors.mutedForeground} />
                  </View>
                )}
              </View>
              <Text style={[styles.portraitTileName, { color: colors.foreground }]} numberOfLines={2}>
                {p.name}
              </Text>
              <Text style={[styles.portraitTilePrice, { color: p.free ? "#3fbe7a" : colors.mutedForeground }]}>
                {p.free ? "GRATUIT" : p.price}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.cosmeticSubheader, { color: colors.mutedForeground }]}>
          THÈMES UI
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.portraitRow}
        >
          {THEMES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                if (!t.free) {
                  Alert.alert(
                    t.name,
                    `${t.flavorText}\n\nDisponible bientôt — ${t.price}`,
                    [{ text: "OK" }],
                  );
                }
              }}
              style={({ pressed }) => [styles.portraitTile, { opacity: pressed && !t.free ? 0.7 : 1 }]}
            >
              <View style={[styles.themeSwatch, { borderColor: t.free ? t.accentSwatch : colors.border }]}>
                <View style={[styles.themeSwatchLeft, { backgroundColor: t.accentSwatch }]} />
                <View style={[styles.themeSwatchRight, { backgroundColor: t.bgSwatch }]} />
                {!t.free && (
                  <View style={styles.portraitLockBadge}>
                    <MaterialCommunityIcons name="lock-outline" size={9} color={colors.mutedForeground} />
                  </View>
                )}
              </View>
              <Text style={[styles.portraitTileName, { color: colors.foreground }]} numberOfLines={2}>
                {t.name}
              </Text>
              <Text style={[styles.portraitTilePrice, { color: t.free ? "#3fbe7a" : colors.mutedForeground }]}>
                {t.free ? "GRATUIT" : t.price}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.cosmeticSubheader, { color: colors.mutedForeground }]}>
          SAUVEGARDES
        </Text>
        <Pressable
          onPress={() =>
            Alert.alert(
              "+3 Emplacements de sauvegarde",
              "Portez votre capacité à 6 sauvegardes simultanées.\nAucun impact sur le gameplay — pur confort.\n\nDisponible bientôt — 0,99 €",
              [{ text: "OK" }],
            )
          }
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 0.82 },
          ]}
        >
          <View style={[styles.cardBody, { flexDirection: "row", alignItems: "center", gap: 14 }]}>
            <MaterialCommunityIcons name="content-save-outline" size={28} color={colors.foreground} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[styles.cardTag, { color: colors.mutedForeground }]}>BIENTÔT</Text>
                <Text style={[styles.cardPrice, { color: colors.foreground, opacity: 0.55, fontSize: 14 }]}>0,99 €</Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontSize: 16 }]}>+3 Emplacements bonus</Text>
              <Text style={[styles.cardDescription, { color: colors.mutedForeground, fontSize: 12 }]}>
                Passez de 3 à 6 sauvegardes simultanées. Aucun avantage gameplay.
              </Text>
            </View>
          </View>
        </Pressable>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Le pack de lancement est offert. Les futurs packs seront proposés à
          l'achat unitaire, sans abonnement.
        </Text>

        <Pressable
          onPress={() => void onRestore()}
          disabled={restoring}
          style={({ pressed }) => [styles.restoreBtn, { opacity: pressed || restoring ? 0.5 : 1 }]}
        >
          <Text style={[styles.restoreBtnText, { color: colors.mutedForeground }]}>
            {restoring ? "Restauration…" : "Restaurer les achats"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  heroWrap: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0a1424",
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  intro: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  packBanner: {
    width: "100%",
    height: 110,
    backgroundColor: "#0a1424",
  },
  packBannerImg: {
    width: "100%",
    height: "100%",
  },
  packBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBody: {
    padding: 18,
    gap: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTag: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    flexShrink: 1,
  },
  cardPrice: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  ownedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 4,
  },
  badgeIcon: {
    width: 14,
    height: 14,
  },
  ownedText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  bulletList: {
    gap: 10,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bulletThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bulletText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 6,
    marginTop: 4,
  },
  primaryBtnIcon: {
    width: 18,
    height: 18,
  },
  primaryBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  secondaryBtn: {
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
  },
  categorySubtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 15,
  },
  giftNote: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
    marginTop: 4,
  },
  portraitRow: {
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  portraitTile: {
    width: 84,
    alignItems: "center",
    gap: 6,
  },
  portraitCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  portraitIcon: { fontSize: 30 },
  portraitLockBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  portraitTileName: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 13,
  },
  portraitTilePrice: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  cosmeticSubheader: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: -4,
  },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  restoreBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textDecorationLine: "underline",
  },
  themeSwatch: {
    width: 68,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    overflow: "hidden",
    flexDirection: "row",
  },
  themeSwatchLeft: { flex: 1 },
  themeSwatchRight: { flex: 1 },
});
