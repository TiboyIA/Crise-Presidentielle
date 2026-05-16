import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { FREE_PORTRAIT_ID, getPortrait, type PortraitDef, type PortraitId } from "@/data/portraits";
import { loadPortraitStorage, savePortraitStorage, type PortraitStorage } from "@/storage/portraits";

interface PortraitContextValue {
  selectedPortrait: PortraitDef;
  ownedPortraitIds: PortraitId[];
  isOwned: (id: PortraitId) => boolean;
  selectPortrait: (id: PortraitId) => void;
  grantPortrait: (id: PortraitId) => void;
  loaded: boolean;
}

const PortraitContext = createContext<PortraitContextValue | null>(null);

export function PortraitProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PortraitStorage>({
    selectedPortraitId: FREE_PORTRAIT_ID,
    ownedPortraitIds: [FREE_PORTRAIT_ID],
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadPortraitStorage().then((d) => {
      setData(d);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((next: PortraitStorage) => {
    setData(next);
    void savePortraitStorage(next);
  }, []);

  const selectPortrait = useCallback(
    (id: PortraitId) => {
      if (!data.ownedPortraitIds.includes(id)) return;
      persist({ ...data, selectedPortraitId: id });
    },
    [data, persist],
  );

  const grantPortrait = useCallback(
    (id: PortraitId) => {
      if (data.ownedPortraitIds.includes(id)) return;
      persist({ selectedPortraitId: id, ownedPortraitIds: [...data.ownedPortraitIds, id] });
    },
    [data, persist],
  );

  const isOwned = useCallback(
    (id: PortraitId) => data.ownedPortraitIds.includes(id),
    [data],
  );

  return (
    <PortraitContext.Provider
      value={{
        selectedPortrait: getPortrait(data.selectedPortraitId),
        ownedPortraitIds: data.ownedPortraitIds,
        isOwned,
        selectPortrait,
        grantPortrait,
        loaded,
      }}
    >
      {children}
    </PortraitContext.Provider>
  );
}

export function usePortrait(): PortraitContextValue {
  const ctx = useContext(PortraitContext);
  if (!ctx) throw new Error("usePortrait must be used inside PortraitProvider");
  return ctx;
}
