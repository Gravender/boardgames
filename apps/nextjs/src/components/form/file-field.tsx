"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";

import { useFieldContext } from "~/hooks/form";

export const FileField = ({
  label,
  description,
  accept = "image/*",
}: {
  label: string;
  description?: string;
  accept?: string;
}) => {
  const field = useFieldContext<File | string | null>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const [preview, setPreview] = useState<string | null>(() => {
    const value = field.state.value;
    if (typeof value === "string") return value;
    return null;
  });

  useEffect(() => {
    const value = field.state.value;
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof value === "string") {
      setPreview(value);
    } else {
      setPreview(null);
    }
  }, [field.state.value]);

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <div className="flex items-center space-x-4">
        <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full">
          {preview ? (
            <Image
              src={preview}
              alt={label}
              className="aspect-square h-full w-full rounded-sm object-cover"
              fill
            />
          ) : (
            <User className="bg-muted h-full w-full items-center justify-center rounded-full p-2" />
          )}
        </div>
        <Input
          id={field.name}
          type="file"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            field.handleChange(file ?? null);
          }}
          onBlur={field.handleBlur}
          aria-invalid={isInvalid}
        />
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
};
