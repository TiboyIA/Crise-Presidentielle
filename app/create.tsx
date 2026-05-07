import React, { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import ScreenHeroHeader from "@/components/ScreenHeroHeader";
import { useColors } from "@/hooks/useColors";
import { useGame, President } from "@/context/GameContext";
import { PROMISE_POOL, PromiseTag, PlayerPromise } from "@/data/promises";
import { IDEOLOGY_IMAGES } from "@/data/ideologyImages";
import { PROMISE_IMAGES } from "@/data/promiseImages";
import { CREATE_HERO_IMAGE } from "@/data/tutorialImages";

const IDEOLOGIES: {
  key: President["ideology"];
  label: string;
  desc: string;
}[] = [
  { key: "liberal", label: "Libéral", desc: "Marché, entreprises, dérégulation" },
  { key: "conservateur", label: "Conservateur", desc: "Ordre, tradition, autorité" },
  { key: "socialiste", label: "Socialiste", desc: "Redistribution, services publics" },
  { key: "ecologiste", label: "Écologiste", desc: "Climat, sobriété, transition" },
  { key: "souverainiste", label: "Souverainiste", desc: "Frontières, souveraineté nationale" },
];

const PARTY_SUGGESTIONS = [
  "Renaissance",
  "République en Marche",
  "Les Républicains",
  "Parti Socialiste",
  "Europe Écologie",
  "Rassemblement Citoyen",
  "Mouvement Souverain",
  "France Libre 2035",
];

const PROMISE_TARGET = 3;

export default function CreatePresidentScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startNewGame } = useGame();

  const [name, setName] = useState("");
  const [party, setParty] = useState("");
  const [ideology, setIdeology] = useState<President["ideology"]>("liberal");
  const [age, setAge] = useState("48");
  const [selectedPromises, setSelectedPromises] = useState<PromiseTag[]>([]);

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const isValid =
    name.trim().length >= 2 &&
    party.trim().length >= 2 &&
    selectedPromises.length === PROMISE_TARGET;

  const togglePromise = (tag: PromiseTag) => {
    setSelectedPromises((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= PROMISE_TARGET) return prev;
      return [...prev, tag];
    });
  };

  const handleSubmit = () => {
    if (!isValid) return;
    const numericAge = Math.max(35, Math.min(99, parseInt(age, 10) || 48));
    const playerPromises: PlayerPromise[] = selectedPromises.map((tag) => {
      const def = PROMISE_POOL.find((p) => p.tag === tag)!;
      return { ...def, status: "pending" };
    });
    startNewGame(
      {
        name: name.trim(),
        party: party.trim(),
        ideology,
        age: numericAge,
      },
      playerPromises,
    );
    router.replace("/dashboard");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: insets.bottom + webBottomInset + 24,
          },
        ]}
      >
        <ScreenHeroHeader
          source={CREATE_HERO_IMAGE as number}
          kicker="INVESTITURE"
          title="Votre profil de Président"
          subtitle="Vos choix initiaux orientent la perception du pouvoir."
          accent={colors.primary}
          onBack={() => router.back()}
        />

        <View style={styles.fieldsBlock}>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              NOM COMPLET
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="ex. Camille Vasseur"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              maxLength={40}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              PARTI POLITIQUE
            </Text>
            <TextInput
              value={party}
              onChangeText={setParty}
              placeholder="ex. Renaissance"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              maxLength={40}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestRow}
            >
              {PARTY_SUGGESTIONS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setParty(p)}
                  style={({ pressed }) => [
                    styles.suggestChip,
                    {
                      backgroundColor:
                        party === p ? colors.primary : colors.muted,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.suggestText,
                      {
                        color:
                          party === p
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              ÂGE
            </Text>
            <TextInput
              value={age}
              onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              maxLength={2}
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                  width: 100,
                },
              ]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              IDÉOLOGIE PRINCIPALE
            </Text>
            <View style={styles.ideoCol}>
              {IDEOLOGIES.map((i) => {
                const selected = ideology === i.key;
                return (
                  <Pressable
                    key={i.key}
                    onPress={() => setIdeology(i.key)}
                    accessibilityRole="radio"
                    accessibilityLabel={`Idéologie ${i.label}`}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.ideoCard,
                      {
                        backgroundColor: selected ? colors.highlight : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Image
                      source={IDEOLOGY_IMAGES[i.key]}
                      style={styles.ideoThumb}
                      resizeMode="cover"
                      accessible={false}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <View style={styles.ideoBody}>
                      <View style={styles.ideoTopRow}>
                        <Text
                          style={[styles.ideoLabel, { color: colors.foreground }]}
                        >
                          {i.label}
                        </Text>
                        {selected ? (
                          <Feather
                            name="check-circle"
                            size={16}
                            color={colors.primary}
                          />
                        ) : (
                          <View
                            style={[
                              styles.ideoCircle,
                              { borderColor: colors.border },
                            ]}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.ideoDesc,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {i.desc}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.promiseHeaderRow}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                PROMESSES DE CAMPAGNE
              </Text>
              <Text style={[styles.promiseCounter, { color: colors.primary }]}>
                {selectedPromises.length} / {PROMISE_TARGET}
              </Text>
            </View>
            <Text style={[styles.promiseHint, { color: colors.mutedForeground }]}>
              Choisissez {PROMISE_TARGET} engagements. Tenir vos promesses pèsera lourd à l'élection.
            </Text>
            <View style={styles.promiseGrid}>
              {PROMISE_POOL.map((p) => {
                const selected = selectedPromises.includes(p.tag);
                const disabled =
                  !selected && selectedPromises.length >= PROMISE_TARGET;
                return (
                  <Pressable
                    key={p.tag}
                    onPress={() => togglePromise(p.tag)}
                    disabled={disabled}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Promesse ${p.label}`}
                    accessibilityState={{ checked: selected, disabled }}
                    style={({ pressed }) => [
                      styles.promiseCard,
                      {
                        backgroundColor: selected
                          ? colors.highlight
                          : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Image
                      source={PROMISE_IMAGES[p.tag]}
                      style={styles.promiseThumb}
                      resizeMode="cover"
                      accessible={false}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <View style={styles.promiseBody}>
                      <View style={styles.promiseTopRow}>
                        <Text
                          style={[styles.promiseLabel, { color: colors.foreground }]}
                        >
                          {p.label}
                        </Text>
                        {selected ? (
                          <Feather
                            name="check-circle"
                            size={14}
                            color={colors.primary}
                          />
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.promiseDesc,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {p.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            disabled={!isValid}
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel="Entrer à l'Élysée et commencer la partie"
            accessibilityState={{ disabled: !isValid }}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: isValid ? colors.primary : colors.muted,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather
              name="award"
              size={16}
              color={isValid ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.submitText,
                {
                  color: isValid
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              ENTRER À L'ÉLYSÉE
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    gap: 0,
  },
  fieldsBlock: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  suggestRow: {
    gap: 8,
    paddingTop: 4,
  },
  suggestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  suggestText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  ideoCol: {
    gap: 8,
  },
  ideoCard: {
    flexDirection: "row",
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 72,
  },
  ideoThumb: {
    width: 72,
    height: "100%",
    minHeight: 72,
  },
  ideoBody: {
    flex: 1,
    padding: 12,
    gap: 4,
    justifyContent: "center",
  },
  ideoTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ideoLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  ideoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  ideoDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  promiseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promiseCounter: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  promiseHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  promiseGrid: {
    gap: 8,
  },
  promiseCard: {
    flexDirection: "row",
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 64,
  },
  promiseThumb: {
    width: 64,
    height: "100%",
    minHeight: 64,
  },
  promiseBody: {
    flex: 1,
    padding: 10,
    gap: 4,
    justifyContent: "center",
  },
  promiseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  promiseLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  promiseDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  submitText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
});
