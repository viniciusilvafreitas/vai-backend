/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ==========================================
 * BLOCCO 2: CAMADA DE DOMÍNIO (USE CASES)
 * ==========================================
 * Cálculo puramente matemático das métricas da operação.
 */

import { CRMRecord, DashboardMetrics } from '../../types';

export class DashboardMetricsUseCase {
  /**
   * Calcula as métricas do Dashboard com base na lista de fichas de atendimento (SSOT).
   * Função matemática pura, sem efeitos colaterais.
   */
  static calculateMetrics(records: CRMRecord[]): DashboardMetrics {
    const totalCustomersServed = records.length;
    
    if (totalCustomersServed === 0) {
      return {
        averageTicket: 0,
        totalRevenue: 0,
        conversionRate: 0,
        totalCustomersServed: 0,
      };
    }

    let wonCount = 0;
    let totalRevenue = 0;

    for (const record of records) {
      if (record.status === 'WON') {
        wonCount++;
        totalRevenue += record.closedValue;
      }
    }

    const conversionRate = (wonCount / totalCustomersServed) * 100;
    const averageTicket = wonCount > 0 ? totalRevenue / wonCount : 0;

    return {
      averageTicket,
      totalRevenue,
      conversionRate,
      totalCustomersServed,
    };
  }
}
