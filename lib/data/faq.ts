/**
 * Conteúdo da ajuda. Escrito do ponto de vista de quem usa o painel — nomeia
 * as coisas como aparecem na tela, não como o sistema é construído.
 */

export interface FaqItem {
  pergunta: string;
  resposta: string[];
  /** passos numerados, quando a resposta é um procedimento */
  passos?: string[];
  /** observação de destaque ao final */
  atencao?: string;
}

export interface FaqSecao {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  itens: FaqItem[];
}

export const faqSecoes: FaqSecao[] = [
  {
    id: "colaboradores",
    titulo: "Analisando colaboradores",
    descricao: "Como ler a lista, encontrar pessoas e interpretar cada número.",
    icone: "Users",
    itens: [
      {
        pergunta: "Como encontro um colaborador específico?",
        resposta: [
          "A busca aceita nome, matrícula, setor ou cargo — digite qualquer parte e a lista filtra enquanto você escreve.",
        ],
        passos: [
          "Abra Colaboradores no menu lateral.",
          "Digite na caixa de busca (ex.: “Maria”, “5648” ou “COBRANCA”).",
          "Use os botões de empresa para restringir a Negócios, Participações ou Tattini.",
        ],
        atencao:
          "A lista abre filtrada por Negócios, que é a maior empresa. Clique em “Todas” para ver o quadro inteiro.",
      },
      {
        pergunta: "Como vejo os detalhes de uma pessoa?",
        resposta: [
          "Clique em qualquer linha da tabela. Abre um painel lateral com o absenteísmo do período, a composição das horas, o motivo predominante e os dados de cadastro.",
          "Para fechar, clique fora do painel ou pressione Esc.",
        ],
      },
      {
        pergunta: "O que significa cada coluna?",
        resposta: [
          "HE — horas extras trabalhadas no período.",
          "Injust. — faltas e atrasos sem justificativa. É o que mais pesa no indicador.",
          "Abonada — ausência com motivo que a empresa aceita abonar (atestado médico, por exemplo).",
          "Just. — ausência justificada que não se enquadra como abono.",
          "Desconsid. — horas de motivos que ficam FORA do cálculo (afastamento, licença-maternidade, folga compensação). Aparecem para auditoria, mas não entram no ABS.",
          "ABS Hora — a soma de Injustificada + Abonada + Justificada.",
          "Planejado — quantas horas a pessoa deveria cumprir no período.",
          "ABS % — ABS Hora dividido por Planejado.",
        ],
      },
      {
        pergunta: "Por que alguns percentuais aparecem coloridos?",
        resposta: [
          "A cor sinaliza gravidade sem que você precise comparar número por número:",
          "Cinza — abaixo de 5%, dentro do esperado.",
          "Âmbar — de 5% a 10%, merece acompanhamento.",
          "Vermelho — 10% ou mais, exige ação.",
        ],
        atencao:
          "Esses limites podem ser alterados em Configurações › Parâmetros do indicador.",
      },
      {
        pergunta: "O que significa alguém com 100% de absenteísmo?",
        resposta: [
          "Significa que a pessoa não registrou nenhuma hora trabalhada no período, embora tivesse escala prevista.",
          "Na prática costuma ser: afastamento sem lançamento no Abono de Faltas, férias não registradas, ou desligamento sem baixa no ponto.",
        ],
        atencao:
          "Não é erro de cálculo — é um caso real para o RH verificar. O painel destaca essas pessoas justamente para que não passem despercebidas.",
      },
      {
        pergunta: "O mês atual mostra um absenteísmo altíssimo. Por quê?",
        resposta: [
          "No mês em andamento, o sistema de ponto considera a carga horária do mês inteiro — inclusive os dias que ainda não aconteceram, que entram como falta.",
          "Por isso existe o botão “Parcial até dia X” no topo: ele recalcula considerando apenas os dias já decorridos.",
        ],
        atencao:
          "O botão só aparece no mês corrente. Em meses fechados todos os dias já ocorreram e a distinção não faz sentido.",
      },
    ],
  },
  {
    id: "motivos",
    titulo: "Cadastro de motivos",
    descricao:
      "A base que decide como cada tipo de ausência afeta (ou não) o indicador.",
    icone: "ClipboardList",
    itens: [
      {
        pergunta: "Para que serve o cadastro de motivos?",
        resposta: [
          "Quando alguém falta, o ponto registra o motivo (atestado médico, folga compensação, licença-maternidade…). Só que o relógio de ponto não sabe o que cada motivo significa para a empresa.",
          "É esse cadastro que traduz: para cada motivo, você define se aquelas horas entram no absenteísmo e de que forma.",
        ],
      },
      {
        pergunta: "Como cadastro um motivo novo?",
        resposta: [
          "Motivos novos aparecem no ponto conforme o RH lança as justificativas. Se um deles ainda não estiver na base, o sistema avisa na importação.",
        ],
        passos: [
          "Abra Cadastros › Motivos.",
          "Digite o nome exatamente como aparece no relatório do ponto (ex.: ATESTADO PSICOLÓGICO).",
          "Escolha o tratamento: Abonado, Justificado ou Desconsiderar.",
          "Clique em Adicionar.",
        ],
        atencao:
          "O nome precisa bater com o que vem do ponto. Se estiver diferente, os lançamentos daquele motivo não serão reconhecidos.",
      },
      {
        pergunta: "Qual a diferença entre Abonado, Justificado e Desconsiderar?",
        resposta: [
          "Abonado — a ausência é aceita e contabilizada como falta abonada. Entra no ABS. Ex.: atestado médico, declaração de comparecimento.",
          "Justificado — a ausência tem justificativa mas não se enquadra como abono. Entra no ABS.",
          "Desconsiderar — a ausência NÃO entra no cálculo do absenteísmo. Ex.: afastamento pelo INSS, licença-maternidade, folga compensação — situações em que a pessoa legalmente não deveria estar trabalhando.",
        ],
        atencao:
          "Marcar como Desconsiderar não remove a pessoa do painel: ela continua listada, as horas aparecem na coluna “Desconsid.” e o ABS dela fica em 0%.",
      },
      {
        pergunta: "Mudei o tratamento de um motivo. O que acontece?",
        resposta: [
          "A alteração vale para os próximos cálculos. Competências já fechadas mantêm o número que tinham quando foram consolidadas.",
          "Se precisar reprocessar um mês anterior com a regra nova, avise a equipe técnica — é uma operação simples, mas deliberada, para o histórico não mudar sozinho.",
        ],
      },
      {
        pergunta: "Como sei se algum motivo ficou de fora?",
        resposta: [
          "A cada carga o sistema compara os motivos que vieram do ponto com os cadastrados aqui. Se encontrar algum desconhecido, ele é sinalizado no processo de importação.",
          "Motivo não cadastrado é tratado como Desconsiderar por segurança — assim ele nunca infla o indicador antes de você decidir a classificação.",
        ],
      },
    ],
  },
];
