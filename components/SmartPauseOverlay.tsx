import React from "react";
import { useStrategy } from "@/context/StrategyContext";
import { useSmartPause } from "@/hooks/useSmartPause";
import { SmartPauseModal } from "./SmartPauseModal";
import { ReturnBriefingModal } from "./ReturnBriefingModal";

export function SmartPauseOverlay() {
  const { state } = useStrategy();
  const {
    showPause, showReturn, returnData,
    dismissPause, confirmPause, dismissReturn,
  } = useSmartPause(state);

  return (
    <>
      <SmartPauseModal
        visible={showPause && state !== null}
        onContinue={dismissPause}
        onPause={confirmPause}
      />
      <ReturnBriefingModal
        visible={showReturn && state !== null}
        data={returnData}
        onDismiss={dismissReturn}
      />
    </>
  );
}
