import { Button } from "@board-games/ui/button";

import { useFormContext } from "~/hooks/form";
import { Spinner } from "../spinner";

export function SubscribeButton({ label }: { label: string }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner />
              <span>{label}...</span>
            </>
          ) : (
            label
          )}
        </Button>
      )}
    </form.Subscribe>
  );
}
