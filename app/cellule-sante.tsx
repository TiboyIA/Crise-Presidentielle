import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { ScreenHeader } from "@/components/ui";
import { SectionBackdrop } from "@/components/ui/SectionBackdrop";
import { HealthDashboard } from "@/components/HealthDashboard";
import { PALETTE } from "@/constants/uiTokens";

/**
 * Cellule Santé Publique — centre de coordination sanitaire dédié.
 * Regroupe les indicateurs santé auparavant logés dans le Journal de Crise :
 * pression hospitalière, veille sanitaire, DIM, codage, interopérabilité,
 * confiance des données, sous-détection, scandale statistique, audits.
 */
export default function CelluleSanteScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useStrategy();
  if (!state) return null;

  return (
    <View style={styles.container}>
      <SectionBackdrop section="sante" intensity={0.5} />
      <ScreenHeader title="Cellule Santé Publique" kicker="COORDINATION SANITAIRE" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <HealthDashboard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.void },
});
