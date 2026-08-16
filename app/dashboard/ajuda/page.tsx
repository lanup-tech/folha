import { Topbar } from "@/components/topbar";
import { FaqAccordion } from "@/components/faq-accordion";

export const metadata = { title: "Ajuda · NobriPonto Analytics" };

export default function AjudaPage() {
  return (
    <>
      <Topbar
        title="Ajuda"
        subtitle="Como analisar colaboradores e manter a base de motivos"
      />
      <main className="p-6">
        <FaqAccordion />
      </main>
    </>
  );
}
