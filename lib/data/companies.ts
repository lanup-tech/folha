import type { Company, CompanyKey } from "../types";

/** CNPJs confirmados via API EzPoint (GET /funcionario, campo cnpjCpfEmpresa). */
export const companies: Company[] = [
  {
    key: "EMPREENDIMENTOS",
    name: "Funchal Negócios Empreendimentos LTDA",
    shortName: "Negócios",
    cnpj: "10.328.634/0001-21",
  },
  {
    key: "PARTICIPACOES",
    name: "Funchal Participações e Empreendimentos LTDA",
    shortName: "Participações",
    cnpj: "30.511.674/0001-11",
  },
  {
    key: "TATTINI",
    name: "Tattini Sociedade de Advogados",
    shortName: "Tattini",
    cnpj: "10.550.544/0001-80",
  },
];

export const companyByCnpjDigits: Record<string, CompanyKey> = {
  "10328634000121": "EMPREENDIMENTOS",
  "30511674000111": "PARTICIPACOES",
  "10550544000180": "TATTINI",
};

export const companyLabel: Record<CompanyKey, string> = {
  EMPREENDIMENTOS: "Negócios",
  PARTICIPACOES: "Participações",
  TATTINI: "Tattini",
};
