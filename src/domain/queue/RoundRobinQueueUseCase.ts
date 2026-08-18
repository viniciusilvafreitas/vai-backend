/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ==========================================
 * BLOCCO 2: CAMADA DE DOMÍNIO (USE CASES)
 * ==========================================
 * Regra UDF e Isolamento: Funções puras, não mutam o estado global.
 * Gerenciamento matemático da Fila (Round-Robin).
 */

import { DailyQueueManager } from '../../types';

export class RoundRobinQueueUseCase {
  /**
   * Avança a fila para o próximo consultor.
   * Algoritmo circular puro (Round-Robin).
   */
  static advanceQueue(queue: DailyQueueManager): DailyQueueManager {
    if (queue.activeConsultantIds.length === 0) {
      return {
        ...queue,
        currentTurnConsultantId: null,
        roundRobinIndex: 0
      };
    }

    const nextIndex = (queue.roundRobinIndex + 1) % queue.activeConsultantIds.length;
    
    return {
      ...queue,
      roundRobinIndex: nextIndex,
      currentTurnConsultantId: queue.activeConsultantIds[nextIndex]
    };
  }

  /**
   * Adiciona um consultor à fila ativa.
   * Se a fila estava vazia, ele se torna o atual.
   */
  static addConsultant(queue: DailyQueueManager, consultantId: string): DailyQueueManager {
    if (queue.activeConsultantIds.includes(consultantId)) {
      return queue; // Já está na fila
    }

    const newActiveIds = [...queue.activeConsultantIds, consultantId];
    
    // Se a fila estava vazia, o novo consultor é o turno atual
    if (newActiveIds.length === 1) {
      return {
        ...queue,
        activeConsultantIds: newActiveIds,
        currentTurnConsultantId: consultantId,
        roundRobinIndex: 0
      };
    }

    return {
      ...queue,
      activeConsultantIds: newActiveIds
    };
  }

  /**
   * Remove um consultor da fila ativa.
   * Recalcula o índice e o turno atual para não quebrar a ordem.
   */
  static removeConsultant(queue: DailyQueueManager, consultantId: string): DailyQueueManager {
    const targetIndex = queue.activeConsultantIds.indexOf(consultantId);
    if (targetIndex === -1) {
      return queue; // Não está na fila
    }

    const newActiveIds = queue.activeConsultantIds.filter(id => id !== consultantId);
    
    if (newActiveIds.length === 0) {
      return {
        ...queue,
        activeConsultantIds: [],
        currentTurnConsultantId: null,
        roundRobinIndex: 0
      };
    }

    let nextIndex = queue.roundRobinIndex;
    if (targetIndex < queue.roundRobinIndex) {
      nextIndex -= 1;
    } else if (targetIndex === queue.roundRobinIndex) {
       nextIndex = nextIndex % newActiveIds.length;
    }

    return {
      ...queue,
      activeConsultantIds: newActiveIds,
      roundRobinIndex: nextIndex,
      currentTurnConsultantId: newActiveIds[nextIndex]
    };
  }

  /**
   * Reordena a fila ativa (Drag and Drop).
   * Preserva quem é o consultor da vez atual e atualiza o seu índice na nova fila.
   */
  static reorderQueue(queue: DailyQueueManager, newOrderIds: string[]): DailyQueueManager {
    let currentTurn = queue.currentTurnConsultantId;
    if (!currentTurn || !newOrderIds.includes(currentTurn)) {
        currentTurn = newOrderIds.length > 0 ? newOrderIds[0] : null;
    }
    const newIndex = currentTurn ? newOrderIds.indexOf(currentTurn) : 0;
    
    return {
      ...queue,
      activeConsultantIds: newOrderIds,
      currentTurnConsultantId: currentTurn,
      roundRobinIndex: newIndex
    };
  }

  static setCurrentTurn(queue: DailyQueueManager, consultantId: string): DailyQueueManager {
    const targetIndex = queue.activeConsultantIds.indexOf(consultantId);
    if (targetIndex === -1) {
      return queue; // Não está na fila
    }
    
    return {
      ...queue,
      currentTurnConsultantId: consultantId,
      roundRobinIndex: targetIndex
    };
  }
}
