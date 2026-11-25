import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  etiqueta: ReactNode;
  unidad?: string;
  /** Chip de estado en vivo junto a la etiqueta. */
  chip?: { texto: string; nivel: "ok" | "warn" | "danger" } | null;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}

/** Etiqueta + control + ayuda/error. El control debe usar `id` y aria-describedby={`${id}-ayuda`}. */
export function Campo({ id, etiqueta, unidad, chip, ayuda, error, children }: Props) {
  return (
    <div>
      <Label htmlFor={id}>
        {etiqueta} {unidad && <span className="unit">{unidad}</span>}
        <span className={cn("chip", chip && `estado-${chip.nivel}`)} aria-live="polite">
          {chip?.texto}
        </span>
      </Label>
      {children}
      <p id={`${id}-ayuda`} className={cn("help", error && "is-error")}>
        {error ?? ayuda}
      </p>
    </div>
  );
}
