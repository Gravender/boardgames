/**
 * Compact View vs Edit explanation (used under permission rows and in basic-mode help).
 */
export const PermissionViewEditHints = ({
  viewHint,
  editHint,
  className,
}: {
  viewHint: string;
  editHint: string;
  className?: string;
}) => (
  <div
    className={
      className ??
      "border-border/50 bg-muted/30 mt-1.5 rounded-md border px-2 py-1.5"
    }
  >
    <p className="text-[11px] leading-snug">
      <span className="text-foreground font-medium">View</span>
      <span className="text-muted-foreground"> — {viewHint}</span>
    </p>
    <p className="mt-1 text-[11px] leading-snug">
      <span className="text-foreground font-medium">Edit</span>
      <span className="text-muted-foreground"> — {editHint}</span>
    </p>
  </div>
);
