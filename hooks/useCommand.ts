import { useCallback, useRef, useState } from "react";

/**
 * Protection anti-double-clic pour les actions gameplay synchrones.
 *
 * Fonctionnement :
 *  - `inFlightRef` : Set mutable vérifié *synchronement* dans `run()`.
 *    Garantit qu'un second appel identique est bloqué même si React n'a
 *    pas encore re-rendu (les deux taps arrivent dans le même cycle JS).
 *  - `activeCmds` : état React mis à jour en parallèle, utilisé par `isPending()`
 *    dans le JSX pour désactiver les boutons et afficher "Action en cours…".
 *  - Après DEBOUNCE_MS, la commande est libérée pour permettre une nouvelle action.
 */

const DEBOUNCE_MS = 400;

export function useCommand() {
  const inFlightRef = useRef<Set<string>>(new Set());
  const [activeCmds, setActiveCmds] = useState<ReadonlySet<string>>(new Set());

  const run = useCallback(<T>(id: string, action: () => T): T | null => {
    if (inFlightRef.current.has(id)) return null;

    inFlightRef.current.add(id);
    setActiveCmds(new Set(inFlightRef.current));

    try {
      return action();
    } finally {
      setTimeout(() => {
        inFlightRef.current.delete(id);
        setActiveCmds(new Set(inFlightRef.current));
      }, DEBOUNCE_MS);
    }
  }, []);

  const isPending = useCallback(
    (id: string): boolean => activeCmds.has(id),
    [activeCmds],
  );

  return { run, isPending };
}
