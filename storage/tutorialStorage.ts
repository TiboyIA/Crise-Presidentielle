import AsyncStorage from "@react-native-async-storage/async-storage";

const TUTORIAL_KEY = "etat_de_crise_tutorial_seen_v1";

export async function getTutorialSeen(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(TUTORIAL_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export async function setTutorialSeen(seen: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, seen ? "1" : "0");
  } catch (e) {
    console.warn("setTutorialSeen failed:", e);
  }
}
