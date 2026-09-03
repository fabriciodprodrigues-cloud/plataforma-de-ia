"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"input"> & {
  rotulo: string;
  dica?: string;
  erro?: string;
};

export function Campo({ rotulo, dica, erro, className, ...props }: Props) {
  const id = useId();
  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;

  return (
    <div>
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={cn(dica && idDica, erro && idErro) || undefined}
        className={cn("campo", erro && "border-red-400 focus:border-red-500", className)}
      />
      {dica && !erro && (
        <p id={idDica} className="mt-1.5 text-sm text-tinta-400">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="mt-1.5 text-sm font-medium text-red-300">
          {erro}
        </p>
      )}
    </div>
  );
}
