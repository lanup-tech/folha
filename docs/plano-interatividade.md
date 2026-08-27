# Plano de ação — painel analítico interativo

Resposta ao feedback do cliente (16/08/2026): o painel apresenta resultado mas
não permite investigar. Cada ponto levantado, o que será feito e o que depende
de dado que hoje não existe.

## O que o cliente pediu × o que temos

| # | Pedido | Situação | Ação |
|---|---|---|---|
| 01 | Expandir os resultados apresentados | viável | Cada card vira porta de entrada: clique abre o detalhamento |
| 02 | Filtrar por área, gerência, liderança | **parcial** | Temos empresa, setor (52) e cargo (98). **Gerência/liderança não existem na fonte** — derivamos nível hierárquico do cargo e propomos cadastro próprio |
| 03 | Aprofundar indicador para ver quem impacta | viável | Ranking de setores por contribuição em horas, não só percentual |
| 04 | Navegar de consolidado para detalhe | viável | Cadeia: empresa → setor → colaborador → dia a dia |

## Limitação a comunicar ao cliente

A API do ponto entrega `departamento` e `setor` com o **mesmo conteúdo** em 701
dos 866 cadastros — não há hierarquia de gerência/liderança na origem. Duas
saídas, ambas serão oferecidas:

1. **Imediata**: derivar nível a partir do cargo (Gerência, Coordenação,
   Liderança, Técnico, Operacional) — cobre o quadro todo hoje.
2. **Definitiva**: cadastro de estrutura organizacional no painel, onde o
   cliente associa setor → gestor → diretoria. Depende de o cliente fornecer
   esse organograma.

## Etapas

- [x] E1. Filtros globais (empresa, setor, cargo, nível, faixa de ABS) que valem para todo o painel
- [x] E2. Drill-down: clicar em empresa/setor/motivo aplica o filtro e revela o nível seguinte
- [x] E3. Card de indicador clicável, abrindo o detalhamento de quem o compõe
- [x] E4. Análise por dimensão: comparar setores, cargos e níveis lado a lado
- [x] E5. Contribuição para o resultado: quem puxa o indicador para cima, em horas
- [x] E6. Detalhe diário do colaborador no drawer (já temos espelho_dias no banco)
- [x] E7. Exportar a visão filtrada (CSV)
