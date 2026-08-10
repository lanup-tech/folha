import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Há um package-lock.json solto em C:\Users\mille — fixa a raiz do projeto
  outputFileTracingRoot: process.cwd(),
  // Ícones/logos dos tenants podem vir do Supabase Storage
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
