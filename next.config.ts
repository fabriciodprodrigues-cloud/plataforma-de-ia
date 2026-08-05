import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos de banco de imagens (Pexels) e arquivos enviados pelo usuário (Supabase Storage)
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
