/**
 * Client da API EzPoint Web (base do ponto Nobriponto/Lanup).
 * Documentação: Documentação_API_EzPointWeb_v1.5 (2026).
 *
 * Endpoints usados na leitura:
 *   POST /login            -> Bearer token
 *   GET  /funcionario      -> cadastro completo (substitui rel. 03 Funcionários)
 *   GET  /espelhoDePontos  -> por funcionário/período: carga horária, faltas,
 *                             atrasos, HE diurna/noturna, horas abonadas
 *                             (substitui rel. 02 Extrato de Horas e 02 Absenteísmo)
 *   GET  /batida           -> marcações cruas (auditoria)
 *
 * O relatório 02 Abono de Faltas NÃO tem GET na v1.5 (só POST de escrita) —
 * o detalhe de motivo/CID/período continua vindo do RPA.
 *
 * Limite: 30 requisições/minuto — o client aplica throttle automático.
 */

const BASE = process.env.EZPOINT_API_URL ?? "https://api.ezpointweb.com.br/ezweb-ws";

// 30 req/min com folga de segurança
const MIN_INTERVAL_MS = Math.ceil(60_000 / 28);
let lastRequestAt = 0;

async function throttle() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

export interface EzpointCredentials {
  empresa: string;
  usuario: string;
  senha: string;
}

export interface EzpointFuncionario {
  id: string;
  matricula: string;
  nome: string;
  pis: string;
  cargo: string;
  cnpjCpfEmpresa: string;
  setor: string;
  departamento: string;
  dataAdmissao: string; // yyyy-MM-dd
  cpf: string;
  ctps: string;
  sexo: string;
  cidade?: string;
  cidadeLocalDeTrabalho?: string;
}

export interface EspelhoTotais {
  atraso: string; // "HH:mm"
  extraDiurna: string;
  extraNoturna: string;
  intrajornada: string;
  falta: string;
  bancoDeHoras: string;
  horasTrabalhadasDiurnas: string;
  horasTrabalhadasNoturnas: string;
  cargaHoraria: string;
  horasAbonadas: string;
}

export interface EspelhoDePontos {
  totalColunas: EspelhoTotais;
  dias: (EspelhoTotais & { data: string; batidas: string; horario: string })[];
  status: number;
}

export interface EzpointBatida {
  nomeFuncionario: string;
  pis: string;
  matriculaFuncionario: string;
  data: string;
  hora: string;
  nomeRep: string;
  numeroSerieRep: string;
  ipRep: string;
}

export class EzpointClient {
  private token: string | null = null;

  constructor(private creds: EzpointCredentials) {}

  static fromEnv(): EzpointClient {
    const { EZPOINT_EMPRESA, EZPOINT_USUARIO, EZPOINT_SENHA } = process.env;
    if (!EZPOINT_EMPRESA || !EZPOINT_USUARIO || !EZPOINT_SENHA) {
      throw new Error(
        "Credenciais da API EzPoint ausentes — preencha EZPOINT_EMPRESA, EZPOINT_USUARIO e EZPOINT_SENHA no .env.local"
      );
    }
    return new EzpointClient({
      empresa: EZPOINT_EMPRESA,
      usuario: EZPOINT_USUARIO,
      senha: EZPOINT_SENHA,
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    await throttle();
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`EzPoint API ${path} -> HTTP ${res.status}: ${await res.text()}`);
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      // o /login pode devolver o hash como texto puro
      return text as unknown as T;
    }
  }

  async login(): Promise<void> {
    const result = await this.request<string | { token?: string; hash?: string }>("/login", {
      method: "POST",
      body: JSON.stringify({
        empresa: this.creds.empresa,
        usuario: this.creds.usuario,
        senha: this.creds.senha,
      }),
    });
    this.token =
      typeof result === "string" ? result.trim() : (result.token ?? result.hash ?? null);
    if (!this.token) throw new Error("EzPoint login não retornou token");
  }

  private async ensureLogin() {
    if (!this.token) await this.login();
  }

  async listFuncionarios(ocultarDemitidos = true): Promise<EzpointFuncionario[]> {
    await this.ensureLogin();
    const query = new URLSearchParams({
      empresa: this.creds.empresa,
      ocultarDemitidos: String(ocultarDemitidos),
    });
    const data = await this.request<{ listaDeFuncionarios: EzpointFuncionario[] }>(
      `/funcionario?${query}`
    );
    return data.listaDeFuncionarios ?? [];
  }

  /** Período máximo de 2 meses por chamada (limitação da API). */
  async espelhoDePontos(
    idFuncionario: string | number,
    dataInicio: string,
    dataFim: string
  ): Promise<EspelhoDePontos> {
    await this.ensureLogin();
    const query = new URLSearchParams({
      empresa: this.creds.empresa,
      idFuncionario: String(idFuncionario),
      dataInicio,
      dataFim,
    });
    return this.request<EspelhoDePontos>(`/espelhoDePontos?${query}`);
  }

  /** Período máximo de 6 meses; paginado. */
  async listBatidas(dataInicio: string, dataFim: string): Promise<EzpointBatida[]> {
    await this.ensureLogin();
    const all: EzpointBatida[] = [];
    let pagina = 1;
    let totalPaginas = 1;
    do {
      const query = new URLSearchParams({
        empresa: this.creds.empresa,
        pagina: String(pagina),
        dataInicio,
        dataFim,
      });
      const data = await this.request<{ listaDeBatidas: EzpointBatida[]; totalPaginas: number }>(
        `/batida?${query}`
      );
      all.push(...(data.listaDeBatidas ?? []));
      totalPaginas = data.totalPaginas ?? 1;
      pagina += 1;
    } while (pagina <= totalPaginas);
    return all;
  }
}

/** 'YYYY-MM' -> { dataInicio, dataFim } no formato da API. */
export function competenciaRange(competencia: string): { dataInicio: string; dataFim: string } {
  const [year, month] = competencia.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return {
    dataInicio: `${year}-${mm}-01`,
    dataFim: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}
