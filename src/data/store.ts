/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ==========================================
 * BLOCCO 3 & 4: CAMADA DE DADOS E APRESENTAÇÃO (MVI)
 * ==========================================
 * Implementação do SSOT (Single Source of Truth) via Zustand.
 * Persistência Offline-First via IndexedDB.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { 
  Consultant, 
  DailyQueueManager, 
  CRMRecord, 
  SaleStatus,
  LensPointRule,
  WeeklyVaultConfig
} from '../types';
import { RoundRobinQueueUseCase } from '../domain/queue/RoundRobinQueueUseCase';
import { SwipeGestureUseCase, ProcessSwipeUpPayload } from '../domain/crm/SwipeGestureUseCase';
import { syncToFirebase, deleteFromFirebase } from '../lib/firebaseHelpers';
import { mapConsultant, mapDailyQueue, mapCRMRecord } from '../lib/dataMappers';
import { calculatePointsFromProductId } from '../lib/lensPoints';
import { parseCurrency } from '../lib/utils';

export interface ProductPerformanceItem {
  name: string;
  model: string;
  category: string;
  tipo: string;
  count: number;
  revenue: number;
}

export interface ProductPerformanceSummary {
  totalPrimes: number;
  totalPersonalizadas: number;
  products: ProductPerformanceItem[];
}

/**
 * Agrupa vendas WON por produto/modelo e calcula total de Primes e Personalizadas.
 */
export function getProductPerformanceSummary(recordsList: CRMRecord[]): ProductPerformanceSummary {
  let totalPrimes = 0;
  let totalPersonalizadas = 0;
  const map: Record<string, ProductPerformanceItem> = {};

  recordsList.forEach((r) => {
    if (r.status !== 'WON') return;

    const prodId = r.productId || 'Outros';
    const closedVal = (r as any).closedValue || 0;

    let tipo = '';
    let category = '';
    let model = '';
    let displayName = prodId.split(' (Obs:')[0].trim();

    if (prodId.includes(' | ')) {
      const parts = prodId.split(' | ').map(p => p.trim());
      tipo = parts[0] || '';
      category = parts[1] || '';
      const rawModel = parts[2] || '';
      model = rawModel.split(' (Obs:')[0].trim();
      displayName = model || `${tipo} ${category}`.trim();
    }

    const prodLower = prodId.toLowerCase();
    const catLower = category.toLowerCase();

    if (catLower.includes('prime') || prodLower.includes('prime')) {
      totalPrimes++;
      if (!category) category = 'Prime';
    }
    if (catLower.includes('personalizada') || prodLower.includes('personalizada')) {
      totalPersonalizadas++;
      if (!category) category = 'Personalizada';
    }

    const key = displayName || 'Produto Geral';
    if (!map[key]) {
      map[key] = {
        name: key,
        model: model || key,
        category,
        tipo,
        count: 0,
        revenue: 0,
      };
    }
    map[key].count += 1;
    map[key].revenue += closedVal;
  });

  const products = Object.values(map).sort((a, b) => b.count - a.count || b.revenue - a.revenue);

  return {
    totalPrimes,
    totalPersonalizadas,
    products,
  };
}

// Adaptador Customizado para IndexedDB (Offline-First garantido)
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export interface AppState {
  // --- SSOT ---
  consultants: Record<string, Consultant>;
  dailyQueues: Record<string, DailyQueueManager>;
  records: Record<string, CRMRecord>;

  // --- UI State (Local Temporal) ---
  selectedDate: string; // YYYY-MM-DD
  userId: string | null;
  currentProjectId: string | null;
  theme: 'dark' | 'paper';
  isQueueManagerOpen: boolean;
  suggestedConsultantNames: string[];
  setIsQueueManagerOpen: (open: boolean) => void;
  setTheme: (theme: 'dark' | 'paper') => void;
  setCurrentProjectId: (projectId: string) => void;
  addSuggestedConsultantName: (name: string) => void;
  
  // --- MVI Actions (Intents) ---
  addConsultant: (name: string, sku?: string) => void;
  updateConsultant: (id: string, name: string) => void;
  removeConsultant: (id: string) => void;
  toggleConsultantInQueue: (id: string, date: string, isActive: boolean) => void;
  reorderConsultants: (date: string, newOrderIds: string[]) => void;
  setManualTurnInQueue: (date: string, consultantId: string) => void;
  processSwipeUp: (payload: ProcessSwipeUpPayload) => void;
  updateRecord: (id: string, updates: Partial<CRMRecord>) => void;
  deleteRecord: (id: string) => void;
  changeSelectedDate: (newDate: string) => void;

  // --- Goals & Dashboard Settings ---
  storeAccessName: string;
  setStoreAccessName: (name: string) => void;
  storeGoal: number;
  consultantGoals: Record<string, number>;
  goalTiers: { id: string; name: string; value: number }[];
  hiddenDashboards: string[];
  activeMetric: 'projection' | 'revenue' | 'tkm' | 'conversion' | 'served';
  lensPointsRules: LensPointRule[];
  weeklyVault: WeeklyVaultConfig;
  outrosProducts: string[];

  workDays: number;
  setWorkDays: (days: number) => void;

  setStoreGoal: (goal: number) => void;
  setConsultantGoal: (consultantId: string, goal: number) => void;
  updateGoalTiers: (tiers: { id: string; name: string; value: number }[]) => void;
  toggleDashboardVisibility: (dashboardId: string) => void;
  setActiveMetric: (metric: 'projection' | 'revenue' | 'tkm' | 'conversion' | 'served') => void;
  updateLensPointsRules: (rules: LensPointRule[]) => void;
  updateWeeklyVault: (vault: WeeklyVaultConfig) => void;
  addOutrosProduct: (product: string) => void;
  removeOutrosProduct: (product: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // --- Initial Data ---
      consultants: {},
      dailyQueues: {},
      records: {},
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      userId: null,
      currentProjectId: localStorage.getItem('app-project-id') || null,
      theme: (localStorage.getItem('app-theme') as 'dark' | 'paper') || 'paper',
      isQueueManagerOpen: false,
      suggestedConsultantNames: [],
      storeAccessName: localStorage.getItem('app-store-access-name') || 'Gassi Diadema',
      storeGoal: 100000,
      workDays: 27,
      consultantGoals: {},
      goalTiers: [
        { id: '1', name: 'Mínima (80%)', value: 80 },
        { id: '2', name: 'Estrela (100%)', value: 100 },
        { id: '3', name: 'Mega Meta (120%)', value: 120 }
      ],
      hiddenDashboards: [],
      activeMetric: 'projection',
      lensPointsRules: [
        { id: '1', lenteTipo: 'VS', linhaTipo: 'Personalizada', modelo: 'Great', points: 1 },
        { id: '2', lenteTipo: 'Multi', linhaTipo: 'Personalizada', modelo: 'Best', points: 2 },
        { id: '3', lenteTipo: 'Multi', linhaTipo: 'Personalizada', modelo: 'Classy', points: 4 },
        { id: '4', lenteTipo: 'Multi', linhaTipo: 'Personalizada', modelo: 'Great', points: 6 },
        { id: '5', lenteTipo: 'VS', linhaTipo: 'Prime', modelo: 'Better', points: 8 },
        { id: '6', lenteTipo: 'VS', linhaTipo: 'Prime', modelo: 'Inspire', points: 10 },
        { id: '7', lenteTipo: 'VS', linhaTipo: 'Prime', modelo: 'First', points: 12 },
        { id: '8', lenteTipo: 'Multi', linhaTipo: 'Prime', modelo: 'Better', points: 15 },
        { id: '9', lenteTipo: 'Multi', linhaTipo: 'Prime', modelo: 'Inspire', points: 18 },
        { id: '10', lenteTipo: 'Multi', linhaTipo: 'Prime', modelo: 'First', points: 20 },
      ],
      weeklyVault: {
        minGoal: 150,
        starGoal: 250,
        megaGoal: 400,
        minRewardDesc: 'Prêmio 150 PTS',
        starRewardDesc: 'Prêmio 250 PTS',
        megaRewardDesc: 'Prêmio 400 PTS',
        type: 'POINTS'
      },
      outrosProducts: ['Zeiss', 'Lentes de Contato', 'Armação Solar'],

      // --- Goals & Settings Actions ---
      setStoreAccessName: (name: string) => {
        localStorage.setItem('app-store-access-name', name);
        set({ storeAccessName: name });
      },
      setWorkDays: (days) => set({ workDays: Math.max(1, days) }),
      setStoreGoal: (goal) => set({ storeGoal: parseCurrency(goal) }),
      setConsultantGoal: (consultantId, goal) => set((state) => ({
        consultantGoals: { ...state.consultantGoals, [consultantId]: parseCurrency(goal) }
      })),
      updateGoalTiers: (tiers) => set({ goalTiers: tiers }),
      toggleDashboardVisibility: (dashboardId) => set((state) => {
        const isHidden = state.hiddenDashboards.includes(dashboardId);
        const updated = isHidden 
          ? state.hiddenDashboards.filter(id => id !== dashboardId)
          : [...state.hiddenDashboards, dashboardId];
        return { hiddenDashboards: updated };
      }),
      setActiveMetric: (metric) => set({ activeMetric: metric }),
      updateLensPointsRules: (rules) => set({ lensPointsRules: rules }),
      updateWeeklyVault: (vault) => set({ weeklyVault: vault }),
      addOutrosProduct: (product) => set((state) => ({ outrosProducts: [...state.outrosProducts, product] })),
      removeOutrosProduct: (product) => set((state) => ({ outrosProducts: state.outrosProducts.filter(p => p !== product) })),
      setIsQueueManagerOpen: (open) => set({ isQueueManagerOpen: open }),
      setTheme: (theme) => {
        localStorage.setItem('app-theme', theme);
        set({ theme });
      },
      setCurrentProjectId: (projectId) => {
        localStorage.setItem('app-project-id', projectId);
        set({ currentProjectId: projectId });
      },
      addSuggestedConsultantName: (name) => {
        const state = get();
        if (state.suggestedConsultantNames.includes(name)) return;
        const updated = [...state.suggestedConsultantNames, name];
        set({ suggestedConsultantNames: updated });
        const targetId = state.currentProjectId || state.userId;
        if (targetId) {
          syncToFirebase('suggested_consultants', name.toLowerCase().trim(), { name: name.trim() }, targetId);
        }
      },

      // --- Actions ---
      addConsultant: (name, sku) => set((state) => {
        const id = name.trim().toLowerCase().replace(/\s+/g, '-');
        const newConsultant: Consultant = { id, name: name.trim(), sku, createdAt: Date.now() };
        
        let newQueue = state.dailyQueues[state.selectedDate];
        if (!newQueue) {
          newQueue = {
            logicalDate: state.selectedDate,
            activeConsultantIds: [id],
            currentTurnConsultantId: id,
            roundRobinIndex: 0,
          };
        } else {
          // Avoid duplicate in queue if already exists
          if (!newQueue.activeConsultantIds.includes(id)) {
            newQueue = {
              ...newQueue,
              activeConsultantIds: [...newQueue.activeConsultantIds, id],
              currentTurnConsultantId: newQueue.activeConsultantIds.length === 0 ? id : newQueue.currentTurnConsultantId,
            };
          }
        }

        const targetId = state.currentProjectId || state.userId;
        if (targetId) {
          syncToFirebase('consultants', id, newConsultant, targetId);
          syncToFirebase('dailyQueues', state.selectedDate, newQueue, targetId);
          syncToFirebase('suggested_consultants', name.toLowerCase().trim(), { name: name.trim() }, targetId);
        }

        const updatedSuggested = state.suggestedConsultantNames.includes(name)
          ? state.suggestedConsultantNames
          : [...state.suggestedConsultantNames, name];

        return {
          consultants: { ...state.consultants, [id]: newConsultant },
          dailyQueues: { ...state.dailyQueues, [state.selectedDate]: newQueue },
          suggestedConsultantNames: updatedSuggested
        };
      }),

      updateConsultant: (id, name) => set((state) => {
        const consultant = state.consultants[id];
        if (!consultant) return state;
        const updated = { ...consultant, name };
        if (state.currentProjectId || state.userId) {
          syncToFirebase('consultants', id, updated, state.currentProjectId || state.userId);
        }
        return {
          consultants: {
            ...state.consultants,
            [id]: updated
          }
        };
      }),

      removeConsultant: (id) => set((state) => {
        if (!state.consultants[id]) return state;
        const newConsultants = { ...state.consultants };
        delete newConsultants[id];
        
        let newQueue = state.dailyQueues[state.selectedDate];
        if (newQueue) {
          newQueue = RoundRobinQueueUseCase.removeConsultant(newQueue, id);
        }

        const targetId = state.currentProjectId || state.userId;
        if (targetId) {
          deleteFromFirebase('consultants', id, targetId);
          if (newQueue) {
            syncToFirebase('dailyQueues', state.selectedDate, newQueue, targetId);
          }
        }
        
        return { 
          consultants: newConsultants,
          dailyQueues: newQueue ? { ...state.dailyQueues, [state.selectedDate]: newQueue } : state.dailyQueues
        };
      }),

      toggleConsultantInQueue: (id, date, isActive) => set((state) => {
        let queue = state.dailyQueues[date] || {
          logicalDate: date,
          activeConsultantIds: [],
          currentTurnConsultantId: null,
          roundRobinIndex: 0
        };

        if (isActive) {
          queue = RoundRobinQueueUseCase.addConsultant(queue, id);
        } else {
          queue = RoundRobinQueueUseCase.removeConsultant(queue, id);
        }

        const updatedQueue = { ...queue };

        if (state.currentProjectId || state.userId) {
          syncToFirebase('dailyQueues', date, updatedQueue, state.currentProjectId || state.userId);
        }

        return {
          dailyQueues: { ...state.dailyQueues, [date]: updatedQueue }
        };
      }),

      reorderConsultants: (date, newOrderIds) => set((state) => {
        const queue = state.dailyQueues[date];
        if (!queue) return state;
        const newQueue = RoundRobinQueueUseCase.reorderQueue(queue, newOrderIds);
        if (state.currentProjectId || state.userId) {
          syncToFirebase('dailyQueues', date, newQueue, state.currentProjectId || state.userId);
        }
        return {
          dailyQueues: {
            ...state.dailyQueues,
            [date]: newQueue
          }
        };
      }),

      setManualTurnInQueue: (date, consultantId) => set((state) => {
        const queue = state.dailyQueues[date];
        if (!queue) return state;
        const newQueue = RoundRobinQueueUseCase.setCurrentTurn(queue, consultantId);
        if (state.currentProjectId || state.userId) {
          syncToFirebase('dailyQueues', date, newQueue, state.currentProjectId || state.userId);
        }
        return {
          dailyQueues: {
            ...state.dailyQueues,
            [date]: newQueue
          }
        };
      }),

      processSwipeUp: (payload) => set((state) => {
        const date = state.selectedDate;
        
        let points = 0;
        if (payload.status === 'WON') {
          if (typeof payload.points === 'number' && payload.points > 0) {
            points = payload.points;
          } else {
            const parts = payload.productId.split(' | ').map(p => p.trim());
            if (parts.length >= 3) {
              const [tipo, linha, modeloWithObs] = parts;
              const modelo = modeloWithObs.split(' (Obs:')[0].trim();
              const rule = state.lensPointsRules.find(r => 
                r.lenteTipo === tipo && 
                r.linhaTipo === linha && 
                (r.modelo.toLowerCase() === modelo.toLowerCase() || (r.modelo === 'First' && (modelo.toLowerCase() === 'first' || modelo.toLowerCase() === 'first class')))
              );
              if (rule) {
                points = rule.points;
              } else {
                points = calculatePointsFromProductId(payload.productId);
              }
            } else {
              points = calculatePointsFromProductId(payload.productId);
            }
          }
        }

        const closedVal = payload.closedValue !== undefined ? parseCurrency(payload.closedValue) : undefined;
        const budgetVal = payload.budgetValue !== undefined ? parseCurrency(payload.budgetValue) : undefined;

        // 1. Processa e cria a ficha usando a Camada de Domínio
        const targetDate = payload.logicalDate || date;
        const newRecord = SwipeGestureUseCase.processSwipeUp({
          ...payload,
          logicalDate: targetDate,
          points,
          ...(closedVal !== undefined ? { closedValue: closedVal } : {}),
          ...(budgetVal !== undefined ? { budgetValue: budgetVal } : {}),
        });

        newRecord.points = points;

        // 2. Avança a fila diária (Round-Robin)
        let currentQueue = state.dailyQueues[date];
        
        // Se não existir fila, criar uma com todos os consultores ativos
        if (!currentQueue) {
           const allIds = Object.keys(state.consultants);
           currentQueue = {
              logicalDate: date,
              activeConsultantIds: allIds,
              currentTurnConsultantId: allIds[0] || null,
              roundRobinIndex: 0
           };
        }

        const nextQueue = currentQueue 
          ? RoundRobinQueueUseCase.advanceQueue(currentQueue) 
          : currentQueue;

        if (state.currentProjectId || state.userId) {
          syncToFirebase('records', newRecord.id, newRecord, state.currentProjectId || state.userId);
          if (nextQueue) {
            syncToFirebase('dailyQueues', date, nextQueue, state.currentProjectId || state.userId);
          }
        }

        // 3. Persiste tudo no SSOT de forma atômica
        return {
          records: { ...state.records, [newRecord.id]: newRecord },
          dailyQueues: nextQueue ? { ...state.dailyQueues, [date]: nextQueue } : state.dailyQueues
        };
      }),

      updateRecord: (id, updates) => set((state) => {
        const record = state.records[id];
        if (!record) return state;

        let finalUpdates = { ...updates };
        if (updates.logicalDate && /^\d{4}-\d{2}-\d{2}$/.test(updates.logicalDate) && !updates.createdAt) {
          const [y, m, d] = updates.logicalDate.split('-').map(Number);
          const existingTime = new Date(record.createdAt || Date.now());
          const newCreatedAt = new Date(y, m - 1, d, existingTime.getHours(), existingTime.getMinutes(), existingTime.getSeconds(), existingTime.getMilliseconds()).toISOString();
          finalUpdates.createdAt = newCreatedAt;
        }

        const updated = { ...record, ...finalUpdates } as CRMRecord;
        if (state.currentProjectId || state.userId) {
          syncToFirebase('records', id, updated, state.currentProjectId || state.userId);
        }
        return {
          records: {
            ...state.records,
            [id]: updated
          }
        };
      }),

      deleteRecord: (id) => set((state) => {
        if (!state.records[id]) return state;
        const newRecords = { ...state.records };
        delete newRecords[id];
        if (state.currentProjectId || state.userId) {
          deleteFromFirebase('records', id, state.currentProjectId || state.userId);
        }
        return { records: newRecords };
      }),

      changeSelectedDate: (newDate) => set(() => ({
        selectedDate: newDate
      })),

    }),
    {
      name: 'lista-de-vez-ssot', // Chave no IndexedDB
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ 
        consultants: state.consultants, 
        dailyQueues: state.dailyQueues, 
        records: state.records,
        suggestedConsultantNames: state.suggestedConsultantNames,
        storeGoal: state.storeGoal,
        consultantGoals: state.consultantGoals,
        goalTiers: state.goalTiers,
        hiddenDashboards: state.hiddenDashboards,
        lensPointsRules: state.lensPointsRules,
        weeklyVault: state.weeklyVault,
        outrosProducts: state.outrosProducts,
      }), // Evita persistir UI states efêmeros como a data selecionada atual ao recarregar a app (opcional, mas bom padrão)
      merge: (persistedState: any, currentState) => {
        if (!persistedState) return currentState;

        const mappedConsultants: any = {};
        if (persistedState.consultants) {
          Object.keys(persistedState.consultants).forEach(key => {
            mappedConsultants[key] = mapConsultant(persistedState.consultants[key], key);
          });
        }

        const mappedQueues: any = {};
        if (persistedState.dailyQueues) {
          Object.keys(persistedState.dailyQueues).forEach(key => {
            mappedQueues[key] = mapDailyQueue(persistedState.dailyQueues[key], key);
          });
        }

        const mappedRecords: any = {};
        if (persistedState.records) {
          Object.keys(persistedState.records).forEach(key => {
            mappedRecords[key] = mapCRMRecord(persistedState.records[key], key);
          });
        }

        return {
          ...currentState,
          ...persistedState,
          consultants: mappedConsultants,
          dailyQueues: mappedQueues,
          records: mappedRecords,
          storeGoal: typeof persistedState.storeGoal === 'number' ? persistedState.storeGoal : 100000,
          goalTiers: Array.isArray(persistedState.goalTiers) ? persistedState.goalTiers : [
            { id: '1', name: 'Mínima', value: 80 },
            { id: '2', name: 'Estrela', value: 100 },
            { id: '3', name: 'Mega', value: 120 }
          ],
          hiddenDashboards: Array.isArray(persistedState.hiddenDashboards) ? persistedState.hiddenDashboards : [],
          lensPointsRules: Array.isArray(persistedState.lensPointsRules) ? persistedState.lensPointsRules : [
            { id: '1', lenteTipo: 'VS', linhaTipo: 'Personalizada', modelo: 'Great', points: 1 },
            { id: '2', lenteTipo: 'Multi', linhaTipo: 'Personalizada', modelo: 'Best', points: 2 },
            { id: '3', lenteTipo: 'Multi', linhaTipo: 'Personalizada', modelo: 'Classy', points: 4 },
            { id: '4', lenteTipo: 'Multi', linhaTipo: 'Personalizada', modelo: 'Great', points: 6 },
            { id: '5', lenteTipo: 'VS', linhaTipo: 'Prime', modelo: 'Better', points: 8 },
            { id: '6', lenteTipo: 'VS', linhaTipo: 'Prime', modelo: 'Inspire', points: 10 },
            { id: '7', lenteTipo: 'VS', linhaTipo: 'Prime', modelo: 'First', points: 12 },
            { id: '8', lenteTipo: 'Multi', linhaTipo: 'Prime', modelo: 'Better', points: 15 },
            { id: '9', lenteTipo: 'Multi', linhaTipo: 'Prime', modelo: 'Inspire', points: 18 },
            { id: '10', lenteTipo: 'Multi', linhaTipo: 'Prime', modelo: 'First', points: 20 },
          ],
          weeklyVault: (persistedState.weeklyVault && persistedState.weeklyVault.type === 'POINTS' && persistedState.weeklyVault.megaGoal < 200)
            ? { ...persistedState.weeklyVault, minGoal: 150, starGoal: 250, megaGoal: 400 }
            : (persistedState.weeklyVault || {
                minGoal: 150,
                starGoal: 250,
                megaGoal: 400,
                minRewardDesc: 'Prêmio 150 PTS',
                starRewardDesc: 'Prêmio 250 PTS',
                megaRewardDesc: 'Prêmio 400 PTS',
                type: 'POINTS'
              }),
          outrosProducts: Array.isArray(persistedState.outrosProducts) ? persistedState.outrosProducts : ['Zeiss', 'Lentes de Contato', 'Armação Solar']
        };
      }
    }
  )
);

export function getActiveAccessName(state?: AppState): string {
  const currentState = state || useAppStore.getState();
  const { currentProjectId, userId, storeAccessName } = currentState;
  const fallback = storeAccessName?.trim() || 'Gassi Diadema';

  if (!currentProjectId || currentProjectId === userId) {
    return fallback;
  }

  try {
    const savedStr = localStorage.getItem('listadevez_workspaces');
    if (savedStr) {
      const saved = JSON.parse(savedStr);
      const found = saved.find((w: any) => w.projectId === currentProjectId);
      if (found && found.name && found.name.trim()) {
        return found.name.trim();
      }
    }
  } catch {
    // ignore
  }

  return fallback;
}
