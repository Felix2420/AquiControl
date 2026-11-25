import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onWheel, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn("field", type === "number" && "num", className)}
      // Evita que la rueda del ratón cambie el valor de un campo numérico enfocado.
      onWheel={(e) => {
        if (type === "number") e.currentTarget.blur();
        onWheel?.(e);
      }}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn("field", className)} {...props} />,
);
Select.displayName = "Select";
