import { useCallback, useEffect, useState } from "react";

import {
  canSubmitShare,
  firstInvalidShareSectionId,
  getShareValidationSections,
} from "./share-summary-derive";
import type { GameData } from "./types";
import type { ShareGameForm } from "./use-share-game-form";

/**
 * Confirm dialog + inline validation state for the share-game form submit path.
 */
export const useShareGameSendFlow = (
  form: ShareGameForm,
  gameData: GameData,
) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inlineValidation, setInlineValidation] = useState(false);

  useEffect(() => {
    if (!inlineValidation) return;
    const sub = form.store.subscribe(() => {
      if (canSubmitShare(form.state.values, gameData)) {
        setInlineValidation(false);
      }
    });
    return () => sub.unsubscribe();
  }, [inlineValidation, form, gameData]);

  /** `true` if the confirm step opened; `false` if validation failed (e.g. mobile sheet should close). */
  const handleSendRequest = useCallback((): boolean => {
    const values = form.state.values;
    if (!canSubmitShare(values, gameData)) {
      setInlineValidation(true);
      requestAnimationFrame(() => {
        const s = getShareValidationSections(values, gameData);
        const id = firstInvalidShareSectionId(s);
        if (id) {
          document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
      return false;
    }
    setInlineValidation(false);
    setConfirmOpen(true);
    return true;
  }, [form, gameData]);

  const handleConfirmSend = useCallback(() => {
    void form.handleSubmit();
  }, [form]);

  return {
    confirmOpen,
    setConfirmOpen,
    inlineValidation,
    handleSendRequest,
    handleConfirmSend,
  };
};
