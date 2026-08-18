/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ==========================================
 * BLOCCO 2: CAMADA DE DOMÍNIO (USE CASES)
 * ==========================================
 * Processamento de intenções dos Gestos (Swipe Up).
 */

import { CRMRecord, WonCRMRecord, LostCRMRecord, SaleStatus } from '../../types';

export interface ProcessSwipeUpPayload {
  logicalDate: string;
  consultantId: string;
  consultantName?: string;
  customerName: string;
  customerPhone: string;
  origem?: string;
  productId: string;
  status: SaleStatus;
  closedValue?: number; // Requerido se WON
  budgetValue?: number; // Requerido se LOST
  points?: number;
}

export class SwipeGestureUseCase {
  /**
   * Processa o gesto de Swipe Up (Concluir Atendimento).
   * Valida os dados de entrada e gera uma CRMRecord estritamente tipada.
   */
  static processSwipeUp(payload: ProcessSwipeUpPayload): CRMRecord {
    let createdAtISO = new Date().toISOString();
    if (payload.logicalDate && /^\d{4}-\d{2}-\d{2}$/.test(payload.logicalDate)) {
      const [year, month, day] = payload.logicalDate.split('-').map(Number);
      const agora = new Date();
      const dataAtendimento = new Date(year, month - 1, day, agora.getHours(), agora.getMinutes(), agora.getSeconds(), agora.getMilliseconds());
      createdAtISO = dataAtendimento.toISOString();
    }

    const baseRecord = {
      id: crypto.randomUUID(),
      createdAt: createdAtISO,
      logicalDate: payload.logicalDate,
      consultantId: payload.consultantId,
      consultantName: payload.consultantName || '',
      customerName: payload.customerName.trim(),
      customerPhone: payload.customerPhone.trim(),
      origem: payload.origem,
      productId: payload.productId,
      points: payload.points || 0,
    };

    if (payload.status === 'WON') {
      if (typeof payload.closedValue !== 'number' || payload.closedValue < 0) {
        throw new Error("closedValue é obrigatório e deve ser >= 0 para vendas concluídas.");
      }
      return {
        ...baseRecord,
        status: 'WON',
        closedValue: payload.closedValue,
      } as WonCRMRecord;
    } else {
      if (typeof payload.budgetValue !== 'number' || payload.budgetValue < 0) {
        throw new Error("budgetValue é obrigatório e deve ser >= 0 para vendas não fechadas.");
      }
      return {
        ...baseRecord,
        status: 'LOST',
        budgetValue: payload.budgetValue,
      } as LostCRMRecord;
    }
  }
}
