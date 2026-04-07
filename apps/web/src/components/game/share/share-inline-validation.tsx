"use client";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@board-games/ui/alert";
import { cn } from "@board-games/ui/utils";

export const ShareInlineValidationAlert = ({
  messages,
}: {
  messages: string[] | undefined;
}) => {
  if (!messages?.length) return null;
  return (
    <Alert variant="destructive" className="mb-3 text-sm">
      <AlertCircle className="size-4 shrink-0" aria-hidden />
      <AlertTitle>Needs attention</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-destructive/95">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export const shareSectionErrorRingClass = (hasErrors: boolean) =>
  cn(
    hasErrors &&
      "ring-destructive/55 rounded-xl ring-2 ring-offset-2 ring-offset-background",
  );
