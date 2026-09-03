import type { Metadata, Viewport } from "next";
import {
  Fraunces,
  Inter,
  Space_Grotesk,
  Montserrat,
  Playfair_Display,
  Poppins,
} from "next/font/google";
import { AvisoConfiguracao } from "@/components/aviso-configuracao";
import { APP_DESCRICAO, APP_NAME } from "@/lib/constants";
import "./globals.css";

// Inter é a fonte da interface. As outras quatro existem porque o usuário pode
// escolhê-las como fonte da marca dele — precisam estar disponíveis para a
// pré-visualização das artes. Todas são auto-hospedadas pelo next/font.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Space Grotesk é a fonte dos títulos no tema escuro — dá o ar técnico do
// protótipo sem atrapalhar a leitura de texto corrido, que segue no Inter.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — conteúdo pronto para cada rede`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRICAO,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6d4aff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${spaceGrotesk.variable} ${poppins.variable} ${montserrat.variable} ${playfair.variable} ${fraunces.variable}`}
    >
      <body className="font-sans min-h-dvh">
        <AvisoConfiguracao />
        {children}
      </body>
    </html>
  );
}
