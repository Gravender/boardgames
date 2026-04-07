import type { ShareGameFormValues } from "../types";
import type { ShareGameForm } from "../use-share-game-form";

export const setMatchRow = (
  form: ShareGameForm,
  matchIdKey: string,
  patch: Partial<ShareGameFormValues["matches"][string]>,
) => {
  const current = form.state.values.matches[matchIdKey];
  if (!current) return;
  form.setFieldValue("matches", {
    ...form.state.values.matches,
    [matchIdKey]: { ...current, ...patch },
  });
};
