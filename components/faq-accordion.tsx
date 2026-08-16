"use client";

import { useState } from "react";
import { ChevronDown, Users, ClipboardList, Lightbulb, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { faqSecoes } from "@/lib/data/faq";

const icones: Record<string, LucideIcon> = { Users, ClipboardList };

export function FaqAccordion() {
  // primeira pergunta de cada seção já aberta: dá o tom sem exigir clique
  const [abertos, setAbertos] = useState<Record<string, boolean>>({
    "colaboradores-0": true,
    "motivos-0": true,
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {faqSecoes.map((secao) => {
        const Icone = icones[secao.icone] ?? Users;
        return (
          <section key={secao.id}>
            <div className="mb-3 flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--chrome)] text-white">
                <Icone size={17} />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
                  {secao.titulo}
                </h2>
                <p className="text-xs text-[var(--ink-secondary)]">{secao.descricao}</p>
              </div>
            </div>

            <div className="card divide-y divide-[var(--line)] overflow-hidden">
              {secao.itens.map((item, i) => {
                const chave = `${secao.id}-${i}`;
                const aberto = !!abertos[chave];
                return (
                  <div key={chave}>
                    <button
                      onClick={() => setAbertos((a) => ({ ...a, [chave]: !a[chave] }))}
                      aria-expanded={aberto}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <span className="text-sm font-medium">{item.pergunta}</span>
                      <ChevronDown
                        size={16}
                        className={clsx(
                          "shrink-0 text-[var(--ink-muted)] transition-transform duration-200",
                          aberto && "rotate-180"
                        )}
                      />
                    </button>

                    <div
                      className={clsx(
                        "grid transition-[grid-template-rows] duration-200",
                        aberto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="flex flex-col gap-3 px-4 pb-4 text-sm leading-relaxed text-[var(--ink-secondary)]">
                          {item.resposta.map((p, j) => (
                            <p key={j}>{p}</p>
                          ))}

                          {item.passos && (
                            <ol className="flex flex-col gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] p-3">
                              {item.passos.map((passo, j) => (
                                <li key={j} className="flex gap-2.5">
                                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--chrome)] text-[11px] font-semibold text-white tabular">
                                    {j + 1}
                                  </span>
                                  <span className="text-[var(--ink-primary)]">{passo}</span>
                                </li>
                              ))}
                            </ol>
                          )}

                          {item.atencao && (
                            <p className="flex gap-2 rounded-[var(--radius-sm)] bg-[var(--status-warning-bg)] px-3 py-2 text-[var(--ink-primary)]">
                              <Lightbulb
                                size={15}
                                className="mt-0.5 shrink-0 text-[var(--status-warning)]"
                              />
                              <span>{item.atencao}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
