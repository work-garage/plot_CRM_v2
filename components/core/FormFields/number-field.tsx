"use client";

import { Control } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from "@/components/ui";

export function NumberField({
  control,
  name,
  label,
  placeholder,
  min,
  max,
}: {
  control: Control<any>;
  name: string;
  label: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <FormField
      control={control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={placeholder}
              min={min}
              max={max}
              value={field.value ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const sanitized = raw.replace(/^0+(?=\d)/, "");
                if (sanitized === "") {
                  field.onChange(undefined);
                  return;
                }
                const next = Number(sanitized);
                if (Number.isNaN(next)) return;
                if (typeof min === "number" && next < min) {
                  field.onChange(min);
                  return;
                }
                if (typeof max === "number" && next > max) {
                  field.onChange(max);
                  return;
                }
                field.onChange(next);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

