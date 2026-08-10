import type { Metadata } from "next";
import "./globals.css";
import { activeClientBranding } from "@/lib/branding";

export const metadata: Metadata = {
  title: "NobriPonto Analytics",
  description: "Painel whitelabel de absenteísmo — NobriPonto",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = activeClientBranding;
  return (
    <html lang="pt-BR">
      <body
        style={
          {
            "--brand-primary": brand.primaryColor,
            "--brand-dark": brand.darkColor,
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
