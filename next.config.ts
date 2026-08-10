import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ícones/logos dos tenants podem vir do Supabase Storage
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
