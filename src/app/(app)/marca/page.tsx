import type { Metadata } from "next";
import { FormularioMarca } from "./formulario";
import { exigirUsuario } from "@/lib/auth";
import { ordenarPlataformas } from "@/lib/constants";

export const metadata: Metadata = { title: "Minha marca" };

export default async function PaginaMarca() {
  const usuario = await exigirUsuario();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Minha marca</h1>
      <p className="mt-1 text-tinta-500">
        Isso define como suas artes ficam e sobre o que a gente pesquisa pra você.
      </p>

      <div className="mt-7">
        <FormularioMarca
          inicial={{
            nomeMarca: usuario.brandKit?.nomeMarca ?? "",
            nicho: usuario.niches[0]?.nome ?? "",
            plataformas: ordenarPlataformas(
              usuario.platformPreferences.map((p) => p.plataforma),
            ),
            logoUrl: usuario.brandKit?.logoUrl ?? null,
            corPrimaria: usuario.brandKit?.corPrimaria ?? "#6D4AFF",
            coresExtraidas: usuario.brandKit?.coresExtraidas ?? [],
            fonte: usuario.brandKit?.fonte ?? "Inter",
          }}
        />
      </div>
    </div>
  );
}
