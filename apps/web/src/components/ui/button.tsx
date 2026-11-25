import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

// Variantes sobre las clases de componente de app.css: lima = acción principal (una por vista),
// bone = secundaria fuerte, ghost = resto.
const variantes = cva("btn", {
  variants: {
    variant: { accent: "btn-accent", bone: "btn-bone", ghost: "btn-ghost" },
  },
  defaultVariants: { variant: "accent" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variantes> {
  asChild?: boolean;
  cargando?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild, cargando, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(variantes({ variant }), className)}
        disabled={disabled || cargando}
        aria-busy={cargando || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {cargando && <span className="spinner" aria-hidden="true" />}
            <span>{children}</span>
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
