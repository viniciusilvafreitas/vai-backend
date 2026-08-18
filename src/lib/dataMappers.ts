import { Consultant, DailyQueueManager, CRMRecord, WonCRMRecord, LostCRMRecord } from '../types';
import { sanitizeInput, parseCurrency } from './utils';

/**
 * Mapper for Consultant records.
 * Ensures all required fields are present and strings are sanitized.
 */
export const mapConsultant = (data: any, id: string): Consultant => {
  return {
    id: data?.id || id,
    name: sanitizeInput(data?.name || 'Consultor Desconhecido'),
    sku: sanitizeInput(data?.sku || ''),
    createdAt: typeof data?.createdAt === 'number' ? data.createdAt : Date.now(),
  };
};

/**
 * Mapper for DailyQueueManager records.
 * Provides fallbacks for missing arrays or indices.
 */
export const mapDailyQueue = (data: any, fallbackDate: string): DailyQueueManager => {
  return {
    logicalDate: data?.logicalDate || fallbackDate,
    activeConsultantIds: Array.isArray(data?.activeConsultantIds) ? data.activeConsultantIds : [],
    currentTurnConsultantId: data?.currentTurnConsultantId || null,
    roundRobinIndex: typeof data?.roundRobinIndex === 'number' ? data.roundRobinIndex : 0,
  };
};

/**
 * Mapper for CRMRecord (Fichas de Atendimento).
 * Provides fallbacks for missing fields, sanitizes user inputs, and ensures numeric values.
 */
export const mapCRMRecord = (data: any, id: string): CRMRecord => {
  const base = {
    id: data?.id || id,
    createdAt: data?.createdAt || new Date().toISOString(),
    logicalDate: data?.logicalDate || new Date().toISOString().split('T')[0],
    consultantId: data?.consultantId || 'unknown',
    consultantName: sanitizeInput(data?.consultantName || 'Desconhecido'),
    customerName: sanitizeInput(data?.customerName || 'Cliente Padrão'),
    customerPhone: sanitizeInput(data?.customerPhone || ''),
    origem: sanitizeInput(data?.origem || 'Desconhecida'),
    productId: sanitizeInput(data?.productId || 'Geral'),
    status: data?.status === 'WON' ? 'WON' : 'LOST',
  };

  if (base.status === 'WON') {
    return {
      ...base,
      status: 'WON',
      closedValue: parseCurrency(data?.closedValue),
    } as WonCRMRecord;
  } else {
    return {
      ...base,
      status: 'LOST',
      budgetValue: parseCurrency(data?.budgetValue),
      lossReason: sanitizeInput(data?.lossReason || ''),
    } as LostCRMRecord;
  }
};
