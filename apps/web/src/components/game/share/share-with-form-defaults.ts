import { formOptions } from "@tanstack/react-form";

import type { ShareGameFormValues } from "./types";

/**
 * Type-only shape for `withForm` child sections on the share page.
 * Runtime defaults come from {@link useShareGameForm} / `createInitialFormValues`.
 *
 * @see https://tanstack.com/form/latest/docs/framework/react/guides/form-composition
 */
export const SHARE_GAME_FORM_CHILD_DEFAULTS = {} as ShareGameFormValues;

/**
 * Shared `formOptions` for every share `withForm` section and {@link useShareGameForm}
 * so default value typing stays in one place.
 */
export const SHARE_GAME_CHILD_FORM_OPTIONS = formOptions({
  defaultValues: SHARE_GAME_FORM_CHILD_DEFAULTS,
});
