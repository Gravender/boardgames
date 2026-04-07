/** Relate roles to typical scoresheet usage in the share UI. */
export const getRoleScoresheetHint = (roleId: number): string => {
  const H: Record<number, string> = {
    1: "Often paired with Standard competitive — aggregate rounds across the session.",
    2: "Works well with Two-player variant — best-of rounds and manual winners.",
  };
  return (
    H[roleId] ?? "Scoresheets can track how this role performs across matches."
  );
};
