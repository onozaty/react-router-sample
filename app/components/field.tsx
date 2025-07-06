import type { FieldMetadata } from "@conform-to/react";
import { getInputProps } from "@conform-to/react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type InputType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "search";

interface FieldProps {
  field: FieldMetadata<string>;
  label: string;
  type?: InputType;
  placeholder?: string;
  required?: boolean;
}

export const Field = ({
  field,
  label,
  type = "text",
  placeholder,
  required = false,
}: FieldProps) => {
  const inputProps = getInputProps(field, { type });

  return (
    <div className="space-y-2">
      <Label htmlFor={field.id}>
        {label} {required && "*"}
      </Label>
      <Input
        {...inputProps}
        type={type}
        placeholder={placeholder}
        required={required}
      />
      {field.errors && (
        <p id={field.errorId} className="text-destructive text-sm">
          {field.errors[0]}
        </p>
      )}
    </div>
  );
};
