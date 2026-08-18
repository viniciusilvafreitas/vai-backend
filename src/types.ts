/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ==========================================
 * BLOCCO 1: CONTRATOS E SCHEMAS (SSOT)
 * ==========================================
 * Interfaces TypeScript estritamente tipadas que representam
 * a modelagem de dados do CRM "Lista de Vez".
 * Segue as regras UDF e Isolamento de Domínio.
 */

// ==========================================
// 1. FILA DE CONSULTORES (ROUND-ROBIN)
// ==========================================

/**
 * Representa um consultor/vendedor do sistema.
 */
export interface Consultant {
  /** ID único do consultor (UUID) */
  id: string;
  /** Nome de exibição do consultor */
  name: string;
  /** SKU ou código interno de identificação do vendedor (opcional) */
  sku?: string;
  /** Data de cadastro (timestamp) */
  createdAt?: number;
}

/**
 * Modelo de gerência da fila diária (Lista de Vez).
 * Garante o estado e a ordem de atendimento (Round-Robin).
 */
export interface DailyQueueManager {
  /** Data lógica da fila no formato YYYY-MM-DD */
  logicalDate: string;
  /** Array ordenado dos IDs dos consultores ativos no dia */
  activeConsultantIds: string[];
  /** ID do consultor que está com a "Vez" atual */
  currentTurnConsultantId: string | null;
  /** Índice matemático da fila para cálculo de Round-Robin */
  roundRobinIndex: number;
}

// ==========================================
// 2. FICHA DE ATENDIMENTO (CRM RECORD)
// ==========================================

/** Status binário de resolução de uma ficha de atendimento. */
export type SaleStatus = 'WON' | 'LOST';

/**
 * Propriedades base compartilhadas por qualquer ficha,
 * independente do desfecho da venda.
 */
export interface BaseCRMRecord {
  /** ID único do registro (UUID) */
  id: string;
  /** Data/hora exata da conclusão do atendimento (ISO 8601) */
  createdAt: string;
  /** Data lógica a qual a ficha pertence (ex: retroativo) (YYYY-MM-DD) */
  logicalDate: string;
  /** ID do consultor que realizou o atendimento */
  consultantId: string;
  /** Nome do consultor registrado no momento do atendimento */
  consultantName?: string;
  /** Nome do cliente prospectado */
  customerName: string;
  /** Telefone de contato do cliente */
  customerPhone: string;
  /** Origem do cliente */
  origem?: string;
  /** ID ou SKU do Produto de interesse/vendido */
  productId: string;
  /** Status final da ficha */
  status: SaleStatus;
  /** Pontos conquistados na venda (Gamificação) */
  points?: number;
}

/**
 * Ficha condicional: VENDA CONCLUÍDA (SIM)
 * Contrato estrito para quando o Swipe for "Concluir Venda"
 */
export interface WonCRMRecord extends BaseCRMRecord {
  status: 'WON';
  /** Valor monetário real que a venda foi fechada */
  closedValue: number;
}

/**
 * Ficha condicional: VENDA NÃO FECHADA / LEAD (NÃO)
 * Contrato estrito para quando o Swipe for "Não Comprou"
 */
export interface LostCRMRecord extends BaseCRMRecord {
  status: 'LOST';
  /** Valor monetário do orçamento passado ao cliente */
  budgetValue: number;
  /** Motivo da não conversão (opcional para análise futura) */
  lossReason?: string;
}

/**
 * Discriminated Union que garante tipagem estrita da Ficha
 * com base na condicional inteligente (SIM/NÃO).
 */
export type CRMRecord = WonCRMRecord | LostCRMRecord;

// ==========================================
// 3. DASHBOARD SUPERIOR (MÉTRICAS TEMPO REAL)
// ==========================================

/**
 * Interface estrita das métricas do Dashboard,
 * utilizadas na interface "Invisible UI".
 */
export interface DashboardMetrics {
  /** TKM (Ticket Médio) - Ticket médio das vendas WON */
  averageTicket: number;
  /** Faturamento Total Acumulado - Soma de valores WON */
  totalRevenue: number;
  /** Taxa de Aproveitamento (%) - WON / Total de Atendimentos */
  conversionRate: number;
  /** Total absoluto de clientes atendidos (WON + LOST) */
  totalCustomersServed: number;
}

// ==========================================
// 4. MODELO DE PERSISTÊNCIA (SSOT STATE)
// ==========================================

export interface LensPointRule {
  id: string;
  lenteTipo: string;
  linhaTipo: string;
  modelo: string;
  points: number;
}

export interface WeeklyVaultConfig {
  minGoal: number;
  starGoal: number;
  megaGoal: number;
  minRewardDesc: string;
  starRewardDesc: string;
  megaRewardDesc: string;
  type: 'BRL' | 'POINTS';
}

/**
 * O Estado Global da Aplicação para persistência Offline-First.
 */
export interface AppDatabaseSchema {
  /** Tabela/Store de Consultores (Master Data) */
  consultants: Record<string, Consultant>;
  /** Tabela/Store de Filas por dia (Chave = YYYY-MM-DD) */
  dailyQueues: Record<string, DailyQueueManager>;
  /** Tabela/Store de Fichas de Atendimento (Chave = UUID) */
  records: Record<string, CRMRecord>;
}
