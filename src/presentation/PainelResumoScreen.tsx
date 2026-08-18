import React, { useState, useMemo } from 'react';
import { useAppStore, getProductPerformanceSummary, getActiveAccessName } from '../data/store';
import { ProductSalesModal } from '../components/ProductSalesModal';
import { 
  BarChart as BarChartIcon, 
  Trophy, 
  TrendingUp, 
  Users, 
  Award, 
  Target, 
  Download, 
  FileText, 
  Table, 
  FileCode2, 
  ChevronDown,
  Building2,
  UserCheck,
  Calculator,
  Package,
  Sparkles,
  Sliders
} from 'lucide-react';
import { format, startOfWeek, startOfMonth, endOfDay, startOfDay, subMonths, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { exportToCSV, exportToExcel, exportToPDF, buildStandardFilename, formatExportPeriodDisplayTitle } from '../lib/exportUtils';
import { AlertDialog } from '../components/AlertDialog';
import { calculatePointsFromProductId } from '../lib/lensPoints';
import { DateFilterBar } from '../components/DateFilterBar';
import { ExportBar } from '../components/ExportBar';

/**
 * Componente da Barra de Bateria Segmentada para Metas
 */
interface BatteryGoalBarProps {
  currentValue: number;
  minGoal: number;
  starGoal: number;
  megaGoal: number;
  unit: 'BRL' | 'PTS' | string;
  minRewardDesc?: string;
  starRewardDesc?: string;
  megaRewardDesc?: string;
  title?: string;
  subtitle?: string;
  totalPoints?: number;
  minGoalName?: string;
  starGoalName?: string;
  megaGoalName?: string;
  elapsedWorkingDays?: number;
  totalWorkingDays?: number;
}

function BatteryGoalBar({
  currentValue,
  minGoal,
  starGoal,
  megaGoal,
  unit,
  minRewardDesc,
  starRewardDesc,
  megaRewardDesc,
  title = "Avanço Mensal",
  subtitle,
  totalPoints,
  minGoalName = "Meta Mínima",
  starGoalName = "Meta Estrela",
  megaGoalName = "Mega Meta",
  elapsedWorkingDays = 1,
  totalWorkingDays = 27
}: BatteryGoalBarProps) {
  const isBRL = unit === 'BRL' || unit === 'R$';

  const formatVal = (val: number) => {
    if (isBRL) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    }
    return `${val} ${val === 1 ? 'Ponto' : 'Pontos'}`;
  };

  const safeMega = megaGoal > 0 ? megaGoal : (isBRL ? 120000 : 400);
  const safeStar = starGoal > 0 ? starGoal : (isBRL ? safeMega * 0.833 : 250);
  const safeMin = minGoal > 0 ? minGoal : (isBRL ? safeMega * 0.666 : 150);

  const pctMega = Math.min(100, Math.max(0, (currentValue / safeMega) * 100));

  // Generates points scale steps (150, 200, 250, 300, 350, 400 PTS) when unit is points
  const pointScaleTicks = useMemo(() => {
    if (isBRL) return [];
    const ticks: number[] = [];
    const maxVal = Math.max(400, safeMega);
    for (let pt = 150; pt <= maxVal; pt += 50) {
      ticks.push(pt);
    }
    return ticks;
  }, [isBRL, safeMega]);

  let fillColor = "bg-amber-400";
  let tierName = "Em progresso";
  let nextGoalName = minGoalName;
  let nextGoalVal = safeMin;
  let remaining = safeMin - currentValue;

  if (currentValue >= safeMin && currentValue < safeStar) {
    fillColor = "bg-emerald-500";
    tierName = `${minGoalName} Atingida`;
    nextGoalName = starGoalName;
    nextGoalVal = safeStar;
    remaining = safeStar - currentValue;
  } else if (currentValue >= safeStar && currentValue < safeMega) {
    fillColor = "bg-indigo-600";
    tierName = `${starGoalName} Atingida`;
    nextGoalName = megaGoalName;
    nextGoalVal = safeMega;
    remaining = safeMega - currentValue;
  } else if (currentValue >= safeMega) {
    fillColor = "bg-purple-600";
    tierName = `${megaGoalName} Concluída!`;
    nextGoalName = megaGoalName;
    nextGoalVal = safeMega;
    remaining = 0;
  }

  const remainingDays = Math.max(0, totalWorkingDays - elapsedWorkingDays);
  const dailyPaceNeeded = remainingDays > 0 && remaining > 0 ? remaining / remainingDays : 0;

  const minPos = Math.min(90, Math.max(10, (safeMin / safeMega) * 100));
  const starPos = Math.min(95, Math.max(minPos + 5, (safeStar / safeMega) * 100));

  return (
    <div className="bg-card border border-borderApp text-txtPrimary rounded-2xl p-5 shadow-xs space-y-4 transition-colors duration-200">
      {/* Título & Badge de Pontos + Status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-txtPrimary">
            <Trophy size={16} className="text-amber-500" /> {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] font-medium mt-1 leading-relaxed text-txtSecondary">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {totalPoints !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-extrabold">
              <Award size={15} className="text-purple-500 shrink-0" />
              <span>{totalPoints} PONTOS ACUMULADOS</span>
            </div>
          )}

          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
            currentValue >= safeMega 
              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
              : currentValue >= safeStar
              ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
              : currentValue >= safeMin
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
          }`}>
            {tierName}
          </span>
        </div>
      </div>

      {/* Valor Atual + Info Próxima Meta & Ritmo de Vendas */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <div>
          <span className="text-2xl font-extrabold tracking-tight text-txtPrimary">
            {formatVal(currentValue)}
          </span>
          <span className="text-xs font-semibold ml-1.5 uppercase text-txtSecondary">
            {isBRL ? 'faturado' : 'acumulados'}
          </span>
        </div>
        <div className="text-xs font-medium text-txtSecondary flex flex-col sm:items-end">
          {remaining > 0 ? (
            <>
              <span>
                Faltam <strong className="text-txtPrimary font-bold">{formatVal(remaining)}</strong> para a {nextGoalName} ({formatVal(nextGoalVal)})
              </span>
              {isBRL && remainingDays > 0 && (
                <span className="text-[10px] text-brand font-semibold mt-0.5">
                  Média necessária: <strong>{formatVal(dailyPaceNeeded)}/dia útil</strong> nos {remainingDays} dias restantes
                </span>
              )}
            </>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              🎉 {megaGoalName} de {formatVal(safeMega)} atingida!
            </span>
          )}
        </div>
      </div>

      {/* BARRA DE BATERIA SEGMENTADA */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          {/* Corpo da Bateria */}
          <div className="relative flex-1 h-9 rounded-2xl p-1 border-2 border-borderApp bg-input shadow-inner overflow-hidden">
            {/* Preenchimento */}
            <div 
              className={`h-full rounded-xl transition-all duration-700 ease-out shadow-xs ${fillColor}`}
              style={{ width: `${pctMega}%` }}
            />

            {/* Marcadores em Pontos ou em BRL */}
            {!isBRL && pointScaleTicks.length > 0 ? (
              pointScaleTicks.map(pt => {
                const pos = Math.min(100, Math.max(0, (pt / safeMega) * 100));
                return (
                  <div 
                    key={pt}
                    className="absolute top-0 bottom-0 border-r border-dashed border-borderAccent/80 z-10 pointer-events-none"
                    style={{ left: `${pos}%` }}
                  />
                );
              })
            ) : (
              <>
                {/* Marcador Meta Mínima */}
                <div 
                  className="absolute top-0 bottom-0 border-r-2 border-dashed border-borderAccent z-10 pointer-events-none"
                  style={{ left: `${minPos}%` }}
                >
                  <span className="absolute -top-0.5 right-1 text-[9px] font-bold px-1 py-0.5 rounded border border-borderApp bg-input text-txtPrimary shadow-2xs truncate max-w-[65px]">
                    {minGoalName}
                  </span>
                </div>

                {/* Marcador Meta Estrela */}
                <div 
                  className="absolute top-0 bottom-0 border-r-2 border-dashed border-borderAccent z-10 pointer-events-none"
                  style={{ left: `${starPos}%` }}
                >
                  <span className="absolute -top-0.5 right-1 text-[9px] font-bold px-1 py-0.5 rounded border border-borderApp bg-input text-txtPrimary shadow-2xs truncate max-w-[65px]">
                    {starGoalName}
                  </span>
                </div>

                {/* Marcador Mega Meta */}
                <div className="absolute top-0 bottom-0 right-0 border-r-2 border-borderAccent z-10 pointer-events-none">
                  <span className="absolute -top-0.5 right-1 text-[9px] font-bold px-1 py-0.5 rounded border border-borderApp bg-input text-txtPrimary shadow-2xs truncate max-w-[65px]">
                    {megaGoalName}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Pino Visual da Bateria */}
          <div className="w-2.5 h-5 rounded-r-md shrink-0 shadow-xs border-l border-borderApp bg-borderAccent" />
        </div>

        {/* REGUA DE ESCALA DE PONTOS (150, 200, 250, 300, 350, 400 PTS) */}
        {!isBRL && pointScaleTicks.length > 0 && (
          <div className="relative w-full h-5 px-1 flex justify-between items-center text-[10px] font-extrabold text-txtSecondary">
            {pointScaleTicks.map(pt => {
              const reached = currentValue >= pt;
              const isMin = pt === safeMin;
              const isStar = pt === safeStar;
              const isMega = pt === safeMega;
              return (
                <div 
                  key={pt} 
                  className={`flex flex-col items-center transition-all ${
                    reached 
                      ? 'text-emerald-600 dark:text-emerald-400 font-black scale-105' 
                      : 'text-txtMuted'
                  }`}
                >
                  <span>{pt} PTS</span>
                  {(isMin || isStar || isMega) && (
                    <span className="text-[8px] font-black uppercase text-purple-500">
                      {isMin ? 'Min' : isStar ? 'Estrela' : 'Mega'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards de Prêmios */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <div className={`p-3 rounded-xl border text-xs ${
          currentValue >= safeMin 
            ? 'bg-amber-500/10 border-amber-500/30 text-txtPrimary'
            : 'bg-input/60 border-borderApp text-txtMuted'
        }`}>
          <div className="flex justify-between font-bold mb-0.5">
            <span className="text-amber-600 dark:text-amber-400 truncate pr-1">{minGoalName}</span>
            <span className="shrink-0">{formatVal(safeMin)}</span>
          </div>
          {minRewardDesc && <p className="text-[10px] italic truncate text-txtSecondary">Prêmio: {minRewardDesc}</p>}
        </div>

        <div className={`p-3 rounded-xl border text-xs ${
          currentValue >= safeStar 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-txtPrimary'
            : 'bg-input/60 border-borderApp text-txtMuted'
        }`}>
          <div className="flex justify-between font-bold mb-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 truncate pr-1">{starGoalName}</span>
            <span className="shrink-0">{formatVal(safeStar)}</span>
          </div>
          {starRewardDesc && <p className="text-[10px] italic truncate text-txtSecondary">Prêmio: {starRewardDesc}</p>}
        </div>

        <div className={`p-3 rounded-xl border text-xs ${
          currentValue >= safeMega 
            ? 'bg-indigo-500/10 border-indigo-500/30 text-txtPrimary'
            : 'bg-input/60 border-borderApp text-txtMuted'
        }`}>
          <div className="flex justify-between font-bold mb-0.5">
            <span className="text-indigo-600 dark:text-indigo-400 truncate pr-1">{megaGoalName}</span>
            <span className="shrink-0">{formatVal(safeMega)}</span>
          </div>
          {megaRewardDesc && <p className="text-[10px] italic truncate text-txtSecondary">Prêmio: {megaRewardDesc}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * Componente de Painel de Desempenho por Produto (Gráfico de Barras Horizontais & Destaque)
 */
interface ProductPerformanceCardProps {
  records: any[];
  title?: string;
  subtitle?: string;
}

function ProductPerformanceCard({
  records,
  title = "Desempenho por Produto",
  subtitle = "Quantidade total vendida por categoria e modelo no período filtrado"
}: ProductPerformanceCardProps) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    productName: string;
    filterType: 'product' | 'prime' | 'personalizada';
  }>({
    isOpen: false,
    productName: '',
    filterType: 'product',
  });

  const summary = useMemo(() => getProductPerformanceSummary(records), [records]);
  const maxCount = useMemo(() => {
    if (summary.products.length === 0) return 1;
    return Math.max(...summary.products.map(p => p.count));
  }, [summary]);

  return (
    <>
      <div className="bg-card border border-borderApp text-txtPrimary rounded-2xl p-5 shadow-xs space-y-4 transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Package size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-txtPrimary flex items-center gap-2">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] font-medium text-txtSecondary mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <span className="text-[10px] font-semibold text-txtMuted bg-input px-2 py-1 rounded-lg border border-borderApp">
            Clique em uma barra para detalhar
          </span>
        </div>

        {/* Cards de Destaque Especial: Total de Primes & Total de Personalizadas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div 
            onClick={() => setModalState({ isOpen: true, productName: 'Lentes Prime', filterType: 'prime' })}
            className="p-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-between cursor-pointer hover:bg-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                  Total de Primes
                </span>
                <span className="text-xs font-medium text-txtSecondary">Lentes da linha Prime</span>
              </div>
            </div>
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
              {summary.totalPrimes}
            </span>
          </div>

          <div 
            onClick={() => setModalState({ isOpen: true, productName: 'Lentes Personalizadas', filterType: 'personalizada' })}
            className="p-3.5 rounded-2xl border border-purple-500/30 bg-purple-500/10 flex items-center justify-between cursor-pointer hover:bg-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
                <Sliders size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                  Total de Personalizadas
                </span>
                <span className="text-xs font-medium text-txtSecondary">Lentes identificadas personalizadas</span>
              </div>
            </div>
            <span className="text-2xl font-black text-purple-700 dark:text-purple-300">
              {summary.totalPersonalizadas}
            </span>
          </div>
        </div>

        {/* Gráfico de Barras Horizontais (Tipos / Modelos de Produtos) */}
        <div className="space-y-3 pt-2 border-t border-borderApp">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-txtSecondary flex items-center justify-between">
            <span>Ranking de Vendas por Produto</span>
            <span className="text-txtMuted font-normal text-[10px]">Unidades Vendidas</span>
          </h4>

          {summary.products.length > 0 ? (
            <div className="space-y-2.5">
              {summary.products.map((item, index) => {
                const widthPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div 
                    key={item.name + index} 
                    onClick={() => setModalState({ isOpen: true, productName: item.name, filterType: 'product' })}
                    className="space-y-1 cursor-pointer group p-1.5 -mx-1.5 rounded-xl hover:bg-input/80 transition-all"
                    title={`Clique para ver as vendas de ${item.name}`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="text-[10px] font-mono text-txtMuted w-4">#{index + 1}</span>
                        <span className="font-bold text-txtPrimary group-hover:text-primary transition-colors truncate">{item.name}</span>
                        {item.category && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            item.category.toLowerCase().includes('prime')
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300'
                              : 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-300'
                          }`}>
                            {item.category}
                          </span>
                        )}
                      </div>
                      <span className="font-black text-txtPrimary shrink-0 text-sm group-hover:text-primary transition-colors">
                        {item.count} <span className="text-[10px] font-medium text-txtSecondary">un</span>
                      </span>
                    </div>

                    {/* Barra de Progresso Horizontal */}
                    <div className="w-full h-3.5 rounded-full overflow-hidden p-0.5 border border-borderApp bg-input group-hover:border-primary/40 transition-colors">
                      <div 
                        className="h-full rounded-full bg-primary shadow-xs transition-all duration-500 group-hover:opacity-90"
                        style={{ width: `${Math.max(5, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-txtMuted text-xs italic">
              Nenhum produto comercializado no período filtrado.
            </div>
          )}
        </div>
      </div>

      {/* Modal Suspensa de Detalhamento de Vendas */}
      <ProductSalesModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        productName={modalState.productName}
        filterType={modalState.filterType}
        records={records}
      />
    </>
  );
}

export default function PainelResumoScreen() {
  const { records, consultants, weeklyVault, storeGoal, consultantGoals, goalTiers, workDays } = useAppStore();
  const [activeTab, setActiveTab] = useState<'loja' | 'consultor' | 'export'>('loja');
  
  // Unified Search and Date Filter State
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [panelSearchTerm, setPanelSearchTerm] = useState('');
  const [panelStartDate, setPanelStartDate] = useState(todayStr);
  const [panelEndDate, setPanelEndDate] = useState(todayStr);

  const handleDateRangeChange = (start: string, end: string) => {
    setPanelStartDate(start);
    setPanelEndDate(end);
    setExportStartDate(start);
    setExportEndDate(end);
  };

  // Store Tab State & Consultant Tab State
  const [selectedConsultant, setSelectedConsultant] = useState<string>('all');
  const [compareConsultant, setCompareConsultant] = useState<string>('none');

  // Export Tab State
  const [exportScope, setExportScope] = useState<'loja' | 'consultor'>('loja');
  const [exportConsultantId, setExportConsultantId] = useState<string>('all_separated');
  const [exportStartDate, setExportStartDate] = useState(todayStr);
  const [exportEndDate, setExportEndDate] = useState(todayStr);
  const [alertInfo, setAlertInfo] = useState<{isOpen: boolean, title: string, message: string}>({isOpen: false, title: '', message: ''});

  // Calculate generic metrics given a set of records
  const calculateMetrics = (recordList: any[]) => {
    let totalPoints = 0;
    let totalRevenue = 0;
    let wonCount = 0;
    let totalCount = recordList.length;

    recordList.forEach(r => {
      if (r.status === 'WON') {
        wonCount++;
        totalRevenue += (r.closedValue || 0);
        const pts = typeof r.points === 'number' && r.points > 0 
          ? r.points 
          : calculatePointsFromProductId(r.productId || '');
        totalPoints += pts;
      }
    });

    const tkm = wonCount > 0 ? totalRevenue / wonCount : 0;
    const conversion = totalCount > 0 ? (wonCount / totalCount) * 100 : 0;

    return { totalPoints, totalRevenue, wonCount, totalCount, tkm, conversion };
  };

  // Helper to safely obtain YYYY-MM-DD from record
  const getRecordDateString = (record: any): string => {
    if (record.logicalDate && /^\d{4}-\d{2}-\d{2}$/.test(record.logicalDate)) {
      return record.logicalDate;
    }
    if (record.createdAt) {
      try {
        return record.createdAt.split('T')[0];
      } catch {
        // fallback
      }
    }
    return '';
  };

  // STORE METRICS
  const storeRecords = useMemo(() => {
    const start = startOfDay(parseISO(panelStartDate));
    const end = endOfDay(parseISO(panelEndDate));

    return Object.values(records).filter(record => {
      if (panelSearchTerm.trim()) {
        const term = panelSearchTerm.toLowerCase();
        const cust = (record.customerName || '').toLowerCase();
        const prod = (record.productId || '').toLowerCase();
        const cons = (record.consultantName || '').toLowerCase();
        if (!cust.includes(term) && !prod.includes(term) && !cons.includes(term)) return false;
      }

      const dStr = getRecordDateString(record);
      if (!dStr) return false;
      const recordDate = new Date(dStr + 'T12:00:00');
      return recordDate >= start && recordDate <= end;
    });
  }, [records, panelStartDate, panelEndDate, panelSearchTerm]);

  const storeMetrics = useMemo(() => calculateMetrics(storeRecords), [storeRecords]);

  // Chart Data for Store
  const chartData = useMemo(() => {
    const grouped = storeRecords.reduce((acc: any, r) => {
      if (r.status === 'WON') {
        const dStr = getRecordDateString(r);
        if (dStr) {
          acc[dStr] = (acc[dStr] || 0) + (r.closedValue || 0);
        }
      }
      return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort();
    return sortedDates.map(date => ({
      date: format(parseISO(date), 'dd/MMM', { locale: ptBR }),
      total: grouped[date]
    }));
  }, [storeRecords]);

  // Vault Weekly metrics for store (faturamento em R$)
  const storeVaultCurrent = useMemo(() => {
    const now = new Date();
    const startW = startOfWeek(now, { weekStartsOn: 1 });
    const endW = endOfDay(now);
    
    const weeklyRecords = Object.values(records).filter(r => {
      const dStr = getRecordDateString(r);
      if (!dStr) return false;
      const d = new Date(dStr + 'T12:00:00');
      return d >= startW && d <= endW;
    });
    
    const weeklyMet = calculateMetrics(weeklyRecords);
    return weeklyMet.totalRevenue;
  }, [records]);

  // Cálculo da Meta Semanal da Loja com base na Meta Mensal e dias úteis
  const storeWorkingDaysInMonth = useMemo(() => {
    if (workDays && workDays > 0) return workDays;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      if (d.getDay() !== 0) { // 0 é domingo
        count++;
      }
    }
    return count || 27;
  }, [workDays]);

  const storeDailyAverageGoal = useMemo(() => {
    if (!storeGoal || storeWorkingDaysInMonth === 0) return 0;
    return storeGoal / storeWorkingDaysInMonth;
  }, [storeGoal, storeWorkingDaysInMonth]);

  // Meta semanal loja = média diária * 6 dias úteis (Segunda a Sábado)
  const storeWeeklyGoal = useMemo(() => {
    return storeDailyAverageGoal * 6;
  }, [storeDailyAverageGoal]);

  const getTierPct = (val: number | undefined, fallback: number) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || ''));
    if (isNaN(num) || num <= 0) return fallback;
    if (num > 500) return fallback;
    return num;
  };

  const storeMinGoal = useMemo(() => {
    if (storeGoal <= 0) return weeklyVault.minGoal || 0;
    const pct = getTierPct(goalTiers[0]?.value, 80);
    return storeGoal * (pct / 100);
  }, [storeGoal, goalTiers, weeklyVault.minGoal]);

  const storeStarGoal = useMemo(() => {
    if (storeGoal <= 0) return weeklyVault.starGoal || 0;
    const pct = getTierPct(goalTiers[1]?.value, 100);
    return storeGoal * (pct / 100);
  }, [storeGoal, goalTiers, weeklyVault.starGoal]);

  const storeMegaGoal = useMemo(() => {
    if (storeGoal <= 0) return weeklyVault.megaGoal || 0;
    const pct = getTierPct(goalTiers[2]?.value, 120);
    return storeGoal * (pct / 100);
  }, [storeGoal, goalTiers, weeklyVault.megaGoal]);

  // Faturamento de Hoje para comparar com a Meta Diária Calculada
  const todayRevenue = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayRecs = Object.values(records).filter(r => getRecordDateString(r) === todayStr);
    return todayRecs.reduce((acc, r) => {
      if (r.status === 'WON') {
        return acc + (r.closedValue || 0);
      }
      return acc;
    }, 0);
  }, [records]);

  const dailyProgressPercent = useMemo(() => {
    if (!storeDailyAverageGoal || storeDailyAverageGoal <= 0) return 0;
    return Math.min(100, (todayRevenue / storeDailyAverageGoal) * 100);
  }, [todayRevenue, storeDailyAverageGoal]);

  // Dias úteis decorridos no intervalo de filtro até hoje (mínimo 1)
  const elapsedWorkingDays = useMemo(() => {
    const start = parseISO(panelStartDate);
    const end = parseISO(panelEndDate);
    const today = startOfDay(new Date());

    const effectiveEnd = end > today ? today : end;

    if (start > effectiveEnd) {
      return 1;
    }

    let count = 0;
    let cur = new Date(start);
    while (cur <= effectiveEnd) {
      if (cur.getDay() !== 0) { // 0 é domingo
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    return Math.max(1, count);
  }, [panelStartDate, panelEndDate]);

  // Média Diária de Vendas da Loja e Projeção do Mês
  const storeDailyAverageSales = useMemo(() => {
    if (elapsedWorkingDays <= 0) return 0;
    return storeMetrics.totalRevenue / elapsedWorkingDays;
  }, [storeMetrics.totalRevenue, elapsedWorkingDays]);

  const storeMonthlyProjection = useMemo(() => {
    return storeDailyAverageSales * storeWorkingDaysInMonth;
  }, [storeDailyAverageSales, storeWorkingDaysInMonth]);

  // Official Consultant List from Store
  const consultantList = useMemo(() => {
    return Object.values(consultants)
      .filter(c => c && c.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [consultants]);

  // CONSULTANT METRICS
  const getConsultantRecords = (consultantId: string, periodStart: Date, periodEnd: Date) => {
    return Object.values(records).filter(r => {
      if (r.consultantId !== consultantId) return false;
      if (panelSearchTerm.trim()) {
        const term = panelSearchTerm.toLowerCase();
        const cust = (r.customerName || '').toLowerCase();
        const prod = (r.productId || '').toLowerCase();
        const cons = (r.consultantName || '').toLowerCase();
        if (!cust.includes(term) && !prod.includes(term) && !cons.includes(term)) return false;
      }
      const dStr = getRecordDateString(r);
      if (!dStr) return false;
      const d = new Date(dStr + 'T12:00:00');
      return d >= periodStart && d <= periodEnd;
    });
  };

  const currentPeriodDates = useMemo(() => {
    const start = startOfDay(parseISO(panelStartDate));
    const end = endOfDay(parseISO(panelEndDate));
    return { start, end };
  }, [panelStartDate, panelEndDate]);

  const previousPeriodDates = useMemo(() => {
    const start = startOfDay(parseISO(panelStartDate));
    const end = endOfDay(parseISO(panelEndDate));
    const diffMs = end.getTime() - start.getTime() + 1000;
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diffMs + 1000);
    return { start: prevStart, end: prevEnd };
  }, [panelStartDate, panelEndDate]);

  const storePrevRecords = useMemo(() => {
    return Object.values(records).filter(record => {
      if (panelSearchTerm.trim()) {
        const term = panelSearchTerm.toLowerCase();
        const cust = (record.customerName || '').toLowerCase();
        const prod = (record.productId || '').toLowerCase();
        const cons = (record.consultantName || '').toLowerCase();
        if (!cust.includes(term) && !prod.includes(term) && !cons.includes(term)) return false;
      }

      const dStr = getRecordDateString(record);
      if (!dStr) return false;
      const recordDate = new Date(dStr + 'T12:00:00');
      return recordDate >= previousPeriodDates.start && recordDate <= previousPeriodDates.end;
    });
  }, [records, previousPeriodDates, panelSearchTerm]);

  const storePrevMetrics = useMemo(() => calculateMetrics(storePrevRecords), [storePrevRecords]);

  const consultantRecords = useMemo(() => {
    if (selectedConsultant === 'all') return [];
    return getConsultantRecords(selectedConsultant, currentPeriodDates.start, currentPeriodDates.end);
  }, [records, selectedConsultant, currentPeriodDates]);

  const consultantPrevRecords = useMemo(() => {
    if (selectedConsultant === 'all') return [];
    return getConsultantRecords(selectedConsultant, previousPeriodDates.start, previousPeriodDates.end);
  }, [records, selectedConsultant, previousPeriodDates]);

  const compareConsultantRecords = useMemo(() => {
    if (compareConsultant === 'none') return [];
    return getConsultantRecords(compareConsultant, currentPeriodDates.start, currentPeriodDates.end);
  }, [records, compareConsultant, currentPeriodDates]);

  const cMetrics = calculateMetrics(consultantRecords);
  const cPrevMetrics = calculateMetrics(consultantPrevRecords);
  const compMetrics = calculateMetrics(compareConsultantRecords);

  const activeCRecords = useMemo(() => {
    return selectedConsultant === 'all' ? storeRecords : consultantRecords;
  }, [selectedConsultant, storeRecords, consultantRecords]);

  const consultantVaultCurrent = useMemo(() => {
    return weeklyVault.type === 'BRL' ? cMetrics.totalRevenue : cMetrics.totalPoints;
  }, [weeklyVault, cMetrics]);

  const getEvolution = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const diff = ((current - previous) / previous) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  // Projeções Individuais por Consultor para a Tabela e Ranking
  const consultantProjections = useMemo(() => {
    const start = currentPeriodDates.start;
    const end = currentPeriodDates.end;

    return consultantList.map(c => {
      const recs = getConsultantRecords(c.id, start, end);
      const met = calculateMetrics(recs);
      const dailyAvg = elapsedWorkingDays > 0 ? met.totalRevenue / elapsedWorkingDays : 0;
      const projection = dailyAvg * storeWorkingDaysInMonth;
      const goal = consultantGoals[c.id] || 0;
      const goalPct = goal > 0 ? (projection / goal) * 100 : 0;

      return {
        consultant: c,
        revenue: met.totalRevenue,
        wonCount: met.wonCount,
        points: met.totalPoints,
        tkm: met.tkm,
        conversion: met.conversion,
        dailyAvg,
        projection,
        goal,
        goalPct
      };
    }).sort((a, b) => b.projection - a.projection);
  }, [consultantList, records, currentPeriodDates, elapsedWorkingDays, storeWorkingDaysInMonth, consultantGoals, panelSearchTerm]);

  // EXPORT METRICS & HANDLERS
  const exportFilteredRecords = useMemo(() => {
    const start = parseISO(exportStartDate);
    const end = endOfDay(parseISO(exportEndDate));
    
    let base = Object.values(records).filter(r => {
      const dStr = getRecordDateString(r);
      if (!dStr) return false;
      const d = new Date(dStr + 'T12:00:00');
      return d >= start && d <= end;
    });

    if (exportScope === 'consultor' && exportConsultantId !== 'all_separated') {
      base = base.filter(r => r.consultantId === exportConsultantId);
    }

    return base.map(r => ({
      ...r,
      consultantName: consultants[r.consultantId]?.name || r.consultantName || r.consultantId
    })).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [records, exportStartDate, exportEndDate, exportScope, exportConsultantId, consultants]);

  const handleExport = (type: 'PDF' | 'Excel' | 'CSV') => {
    if (exportFilteredRecords.length === 0) {
      setAlertInfo({ isOpen: true, title: 'Exportação Vazia', message: 'Nenhum registro encontrado neste período para o escopo selecionado.' });
      return;
    }
    
    try {
      let subtitle = "Visão Geral da Loja";
      if (exportScope === 'consultor') {
        if (exportConsultantId === 'all_separated') {
          subtitle = "Relatório por Consultores (Todos)";
        } else {
          const cName = consultants[exportConsultantId]?.name || 'Consultor Selecionado';
          subtitle = `Relatório do Consultor: ${cName}`;
        }
      }

      const accessName = getActiveAccessName();
      const filename = buildStandardFilename('Lista de vez - Painel', accessName, exportStartDate, exportEndDate);
      const title = exportScope === 'loja' ? `Lista de vez - ${accessName} - Relatório Geral` : `Lista de vez - ${accessName} - ${subtitle}`;

      if (type === 'PDF') {
        exportToPDF(exportFilteredRecords, filename, title, { scope: exportScope, subtitle });
      } else if (type === 'Excel') {
        exportToExcel(exportFilteredRecords, filename, { scope: exportScope, subtitle });
      } else if (type === 'CSV') {
        exportToCSV(exportFilteredRecords, filename, { scope: exportScope, subtitle });
      }
    } catch (e: any) {
      setAlertInfo({ isOpen: true, title: 'Erro', message: `Erro ao exportar: ${e.message}` });
    }
  };

  const handleCurrentScreenExport = (type: 'PDF' | 'Excel' | 'CSV') => {
    let recsToExport: any[] = [];
    let title = "Relatório - Painel Resumo";
    let subtitle = "";

    const accessName = getActiveAccessName();
    const formattedRangeLabel = formatExportPeriodDisplayTitle(panelStartDate, panelEndDate);

    if (activeTab === 'loja') {
      recsToExport = storeRecords;
      title = `Lista de vez - ${accessName} - Visão Loja (${formattedRangeLabel})`;
      subtitle = `Período: ${formattedRangeLabel}`;
    } else if (activeTab === 'consultor') {
      recsToExport = selectedConsultant === 'all' 
        ? Object.values(records).filter(r => {
            const dStr = getRecordDateString(r);
            if (!dStr) return false;
            const d = new Date(dStr + 'T12:00:00');
            return d >= currentPeriodDates.start && d <= currentPeriodDates.end;
          })
        : consultantRecords;
      const cName = selectedConsultant === 'all' ? 'Todos os Consultores' : (consultants[selectedConsultant]?.name || 'Consultor');
      title = `Lista de vez - ${accessName} - Consultor: ${cName} (${formattedRangeLabel})`;
      subtitle = `Consultor: ${cName} | Período: ${formattedRangeLabel}`;
    } else {
      handleExport(type);
      return;
    }

    if (recsToExport.length === 0) {
      setAlertInfo({ isOpen: true, title: 'Exportação Vazia', message: 'Nenhum registro encontrado no período exibido na tela.' });
      return;
    }

    const filename = buildStandardFilename('Lista de vez - Painel', accessName, panelStartDate, panelEndDate);
    try {
      if (type === 'PDF') {
        exportToPDF(recsToExport, filename, title, { subtitle });
      } else if (type === 'Excel') {
        exportToExcel(recsToExport, filename, { subtitle });
      } else if (type === 'CSV') {
        exportToCSV(recsToExport, filename, { subtitle });
      }
    } catch (e: any) {
      setAlertInfo({ isOpen: true, title: 'Erro', message: `Erro ao exportar: ${e.message}` });
    }
  };

  const inputClass = "w-full bg-input border border-borderApp text-txtPrimary placeholder:text-txtMuted p-3 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all";
  const cardClass = "bg-card border border-borderApp shadow-xs rounded-2xl p-5";

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-[800px] mx-auto space-y-6 transition-colors duration-200 text-txtPrimary">
      
      {/* HEADER */}
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-txtPrimary">
          <BarChartIcon className="text-brand" size={22} /> Painel & Resumo
        </h1>
        <p className="text-xs text-txtSecondary">Visão geral, performance e relatórios detalhados.</p>
      </div>

      {/* EXPORTBAR NO TOPO (PADRÃO GLOBAL) */}
      <ExportBar 
        onExport={handleCurrentScreenExport} 
        count={activeTab === 'loja' ? storeRecords.length : (activeTab === 'consultor' ? consultantRecords.length : exportFilteredRecords.length)} 
      />

      {/* BARRA UNIFICADA DE BUSCA E FILTRO DE DATA */}
      <DateFilterBar
        searchTerm={panelSearchTerm}
        onSearchChange={setPanelSearchTerm}
        searchPlaceholder="Buscar por cliente, produto ou consultor..."
        startDate={panelStartDate}
        endDate={panelEndDate}
        onDateRangeChange={handleDateRangeChange}
      />

      {/* NAVEGAÇÃO POR SUB-ABAS */}
      <div className="flex gap-2 p-1.5 rounded-2xl border border-borderApp bg-card transition-colors">
        <button
          onClick={() => setActiveTab('loja')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'loja' ? 'btn-theme-emerald' : 'btn-theme-inactive'
          }`}
        >
          <Building2 size={16} /> Loja
        </button>
        <button
          onClick={() => setActiveTab('consultor')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'consultor' ? 'btn-theme-blue' : 'btn-theme-inactive'
          }`}
        >
          <Users size={16} /> Consultores
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'export' ? 'btn-theme-purple' : 'btn-theme-inactive'
          }`}
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* SUB-TAB 1: LOJA */}
      {activeTab === 'loja' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`${cardClass} flex flex-col items-center text-center p-3.5`}>
              <TrendingUp className="text-emerald-500 mb-1" size={20} />
              <span className="text-lg font-extrabold text-txtPrimary">
                R$ {storeMetrics.totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide mt-0.5 text-txtSecondary">
                Faturamento
              </span>
            </div>

            <div className={`${cardClass} flex flex-col items-center text-center p-3.5 border-2 border-emerald-500/30 bg-emerald-500/5`}>
              <Calculator className="text-emerald-600 dark:text-emerald-400 mb-1" size={20} />
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                R$ {storeMonthlyProjection.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5 text-txtPrimary">
                Projeção do Mês
              </span>
            </div>

            <div className={`${cardClass} flex flex-col items-center text-center p-3.5`}>
              <Target className="text-purple-500 mb-1" size={20} />
              <span className="text-lg font-extrabold text-txtPrimary">
                R$ {(storeGoal || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide mt-0.5 text-txtSecondary">
                Meta ({storeGoal > 0 ? `${((storeMetrics.totalRevenue / storeGoal) * 100).toFixed(1)}%` : '0%'})
              </span>
            </div>

            <div className={`${cardClass} flex flex-col items-center text-center p-3.5`}>
              <Users className="text-brand mb-1" size={20} />
              <span className="text-lg font-extrabold text-txtPrimary">
                R$ {storeMetrics.tkm.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide mt-0.5 text-txtSecondary">
                Ticket Médio
              </span>
            </div>
          </div>

          {/* CARD DETALHADO DA PROJEÇÃO DO MÊS - LOJA */}
          <div className={`${cardClass} space-y-3 bg-gradient-to-br from-card to-emerald-500/5 border-emerald-500/20`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Calculator size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-txtPrimary">
                    Projeção de Vendas do Mês (Loja)
                  </h3>
                  <p className="text-[11px] font-medium text-txtSecondary">
                    Média diária (R$ {storeDailyAverageSales.toLocaleString('pt-BR', {maximumFractionDigits: 0})}) × {storeWorkingDaysInMonth} dias úteis no mês
                  </p>
                </div>
              </div>
              <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                storeGoal > 0 && storeMonthlyProjection >= storeGoal 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
              }`}>
                {storeGoal > 0 
                  ? `${((storeMonthlyProjection / storeGoal) * 100).toFixed(1)}% da Meta Projetado`
                  : 'Sem Meta Definida'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl border border-borderApp bg-input/60">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-txtSecondary">Média Diária</span>
                <span className="text-base font-extrabold text-txtPrimary">
                  R$ {storeDailyAverageSales.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
                <span className="text-[10px] text-txtMuted block mt-0.5">por dia útil</span>
              </div>

              <div className="p-3 rounded-xl border border-borderApp bg-input/60">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-txtSecondary">Dias Decorridos</span>
                <span className="text-base font-extrabold text-txtPrimary">
                  {elapsedWorkingDays} de {storeWorkingDaysInMonth} dias
                </span>
                <span className="text-[10px] text-txtMuted block mt-0.5">dias úteis trabalhados</span>
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-600 dark:text-emerald-400">Projeção Final</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  R$ {storeMonthlyProjection.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 block mt-0.5 font-medium">estimada para o mês</span>
              </div>
            </div>

            {storeGoal > 0 && (
              <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                storeMonthlyProjection >= storeGoal 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
              }`}>
                <span>
                  {storeMonthlyProjection >= storeGoal 
                    ? `🎉 Na média diária atual, a loja projeta superar a meta de R$ ${storeGoal.toLocaleString('pt-BR')} em R$ ${(storeMonthlyProjection - storeGoal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}!`
                    : `⚠️ Na média diária atual, a loja projeta ficar R$ ${(storeGoal - storeMonthlyProjection).toLocaleString('pt-BR', {minimumFractionDigits: 2})} abaixo da meta.`}
                </span>
              </div>
            )}
          </div>

          {/* Gráfico de Vendas */}
          {chartData.length > 0 && (
            <div className={`${cardClass} h-72`}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between text-txtSecondary">
                <span>Vendas no Período</span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-brand/30 bg-brand/10 text-brand">
                  Valores em R$
                </span>
              </h3>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-app)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
                  <RechartsTooltip 
                    cursor={{ fill: 'var(--bg-hover)', opacity: 0.8 }}
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-input)', 
                      borderColor: 'var(--border-app)', 
                      borderRadius: '12px', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', 
                      padding: '10px 14px',
                      color: 'var(--text-primary)'
                    }}
                    formatter={(val: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val), 'Faturamento']}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Bar dataKey="total" fill="url(#barGradient)" radius={[8, 8, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* CARD DE META DIÁRIA CALCULADA */}
          {storeGoal > 0 && (
            <div className={cardClass}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-txtPrimary">
                    <Target size={16} className="text-emerald-500" /> Meta Diária
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {dailyProgressPercent.toFixed(1)}% Alcançado Hoje
                  </span>
                </div>
              </div>

              {/* Barra de Progresso do Faturamento Atual vs Meta Diária */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-txtPrimary">
                    Hoje: R$ {todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-txtSecondary">
                    Meta Diária: R$ {storeDailyAverageGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full h-3.5 rounded-full overflow-hidden p-0.5 border border-borderApp bg-input">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${dailyProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* BARRA DE BATERIA DE METAS - LOJA */}
          <BatteryGoalBar 
            title="Avanço Mensal"
            currentValue={storeMetrics.totalRevenue}
            minGoal={storeMinGoal}
            starGoal={storeStarGoal}
            megaGoal={storeMegaGoal}
            unit={storeGoal > 0 ? "BRL" : weeklyVault.type}
            totalPoints={storeMetrics.totalPoints}
            minRewardDesc={weeklyVault.minRewardDesc}
            starRewardDesc={weeklyVault.starRewardDesc}
            megaRewardDesc={weeklyVault.megaRewardDesc}
            minGoalName={goalTiers[0]?.name || 'Meta Mínima'}
            starGoalName={goalTiers[1]?.name || 'Meta Estrela'}
            megaGoalName={goalTiers[2]?.name || 'Mega Meta'}
            elapsedWorkingDays={elapsedWorkingDays}
            totalWorkingDays={storeWorkingDaysInMonth}
          />

          {/* NOVO MENU DE DESEMPENHO POR PRODUTO (GRÁFICO DE BARRAS HORIZONTAIS) */}
          <ProductPerformanceCard 
            records={storeRecords}
            title="Desempenho por Produto"
            subtitle="Quantidade total vendida por categoria e modelo no período filtrado"
          />
        </div>
      )}

      {/* SUB-TAB 2: CONSULTOR */}
      {activeTab === 'consultor' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="w-full">
            <div className="relative w-full">
              <select
                value={selectedConsultant}
                onChange={(e) => setSelectedConsultant(e.target.value)}
                className={inputClass + ' pr-10 appearance-none cursor-pointer'}
              >
                <option value="all">Todos os Consultores (Soma Geral)</option>
                {consultantList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-txtMuted" size={18} />
            </div>
          </div>

          {(() => {
            const activeCMetrics = selectedConsultant === 'all' ? storeMetrics : cMetrics;
            const activeCPrevMetrics = selectedConsultant === 'all' ? storePrevMetrics : cPrevMetrics;
            const activeCVaultCurrent = selectedConsultant === 'all' 
              ? (weeklyVault.type === 'BRL' ? storeMetrics.totalRevenue : storeMetrics.totalPoints) 
              : consultantVaultCurrent;

            const activeRevenue = activeCMetrics.totalRevenue;
            const activeDailyAvg = elapsedWorkingDays > 0 ? activeRevenue / elapsedWorkingDays : 0;
            const activeProjection = activeDailyAvg * storeWorkingDaysInMonth;
            const activeGoal = selectedConsultant !== 'all' ? (consultantGoals[selectedConsultant] || 0) : storeGoal;

            const cDailyAvg = elapsedWorkingDays > 0 ? cMetrics.totalRevenue / elapsedWorkingDays : 0;
            const cProjection = cDailyAvg * storeWorkingDaysInMonth;
            const compDailyAvg = elapsedWorkingDays > 0 ? compMetrics.totalRevenue / elapsedWorkingDays : 0;
            const compProjection = compDailyAvg * storeWorkingDaysInMonth;

            return (
              <>
                {/* CARD DESTACADO DA PROJEÇÃO DO CONSULTORES */}
                <div className={`${cardClass} space-y-3 bg-gradient-to-br from-card to-blue-500/5 border-blue-500/20`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Calculator size={18} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-txtPrimary">
                          Projeção do Mês ({selectedConsultant === 'all' ? 'Toda a Equipe' : (consultants[selectedConsultant]?.name || 'Consultor')})
                        </h3>
                        <p className="text-[11px] font-medium text-txtSecondary">
                          Média diária (R$ {activeDailyAvg.toLocaleString('pt-BR', {maximumFractionDigits: 0})}) × {storeWorkingDaysInMonth} dias úteis
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-txtSecondary block">Valor Projetado:</span>
                      <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                        R$ {activeProjection.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                  </div>

                  {activeGoal > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-txtSecondary">Meta: R$ {activeGoal.toLocaleString('pt-BR')}</span>
                        <span className={activeProjection >= activeGoal ? 'text-emerald-500 font-extrabold' : 'text-amber-500 font-bold'}>
                          {((activeProjection / activeGoal) * 100).toFixed(1)}% Projetado
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full overflow-hidden p-0.5 border border-borderApp bg-input">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            activeProjection >= activeGoal ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, (activeProjection / activeGoal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* CARD PONTOS LENTES DEDICADO */}
                  <div className={`${cardClass} flex flex-col justify-center gap-1 p-3.5`}>
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-txtSecondary">
                      <Award className="text-purple-500" size={16} /> Pontos Lentes
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-extrabold text-txtPrimary">{activeCMetrics.totalPoints}</span>
                      <span className={`text-xs font-bold ${activeCMetrics.totalPoints >= activeCPrevMetrics.totalPoints ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {getEvolution(activeCMetrics.totalPoints, activeCPrevMetrics.totalPoints)}
                      </span>
                    </div>
                  </div>

                  <div className={`${cardClass} flex flex-col justify-center gap-1 p-3.5`}>
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-txtSecondary">
                      <Target className="text-rose-500" size={16} /> Conversão
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-extrabold text-txtPrimary">{activeCMetrics.conversion.toFixed(1)}%</span>
                      <span className={`text-xs font-bold ${activeCMetrics.conversion >= activeCPrevMetrics.conversion ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {getEvolution(activeCMetrics.conversion, activeCPrevMetrics.conversion)}
                      </span>
                    </div>
                  </div>

                  <div className={`${cardClass} flex flex-col justify-center gap-1 p-3.5`}>
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-txtSecondary">
                      <TrendingUp className="text-emerald-500" size={16} /> Faturamento
                    </span>
                    <span className="text-lg font-extrabold mt-1 text-txtPrimary">
                      R$ {activeCMetrics.totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </span>
                  </div>

                  <div className={`${cardClass} flex flex-col justify-center gap-1 p-3.5`}>
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-txtSecondary">
                      <Users className="text-brand" size={16} /> Ticket Médio
                    </span>
                    <span className="text-lg font-extrabold mt-1 text-txtPrimary">
                      R$ {activeCMetrics.tkm.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>

                {/* TABELA RANKING DE PROJEÇÃO DOS CONSULTORES */}
                <div className={cardClass}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-txtPrimary">
                      <Users size={16} className="text-blue-500" /> Tabela de Projeções dos Consultores
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-borderApp bg-input text-txtSecondary">
                      {storeWorkingDaysInMonth} Dias Úteis
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-borderApp text-txtSecondary uppercase text-[10px] font-bold">
                          <th className="py-2.5 px-2">Consultor</th>
                          <th className="py-2.5 px-2 text-right">Fat. Atual</th>
                          <th className="py-2.5 px-2 text-right">Média/Dia</th>
                          <th className="py-2.5 px-2 text-right">Projeção Mês</th>
                          <th className="py-2.5 px-2 text-right">Meta Indiv.</th>
                          <th className="py-2.5 px-2 text-center">% Meta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderApp">
                        {consultantProjections.map((cp, idx) => (
                          <tr key={cp.consultant.id} className="hover:bg-hover transition-colors font-medium text-txtPrimary">
                            <td className="py-2.5 px-2 font-bold flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-txtMuted">#{idx + 1}</span>
                              <span className="truncate max-w-[120px]">{cp.consultant.name}</span>
                            </td>
                            <td className="py-2.5 px-2 text-right font-semibold">
                              R$ {cp.revenue.toLocaleString('pt-BR', {maximumFractionDigits: 0})}
                            </td>
                            <td className="py-2.5 px-2 text-right text-txtSecondary font-mono">
                              R$ {cp.dailyAvg.toLocaleString('pt-BR', {maximumFractionDigits: 0})}
                            </td>
                            <td className="py-2.5 px-2 text-right font-extrabold text-blue-600 dark:text-blue-400">
                              R$ {cp.projection.toLocaleString('pt-BR', {maximumFractionDigits: 0})}
                            </td>
                            <td className="py-2.5 px-2 text-right text-txtSecondary font-mono">
                              {cp.goal > 0 ? `R$ ${cp.goal.toLocaleString('pt-BR', {maximumFractionDigits: 0})}` : '-'}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              {cp.goal > 0 ? (
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  cp.goalPct >= 100 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                                    : cp.goalPct >= 80
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30'
                                }`}>
                                  {cp.goalPct.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-txtMuted text-[10px]">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {consultantProjections.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-txtMuted italic text-xs">
                              Nenhum consultor encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* BARRA DE BATERIA DE METAS - CONSULTOR */}
                <BatteryGoalBar 
                  title={`Desempenho no Cofre (${weeklyVault.type === 'BRL' ? 'R$' : 'Pontos'})`}
                  currentValue={activeCVaultCurrent}
                  minGoal={weeklyVault.minGoal || 0}
                  starGoal={weeklyVault.starGoal || 0}
                  megaGoal={weeklyVault.megaGoal || 0}
                  unit={weeklyVault.type}
                  totalPoints={activeCMetrics.totalPoints}
                  minRewardDesc={weeklyVault.minRewardDesc}
                  starRewardDesc={weeklyVault.starRewardDesc}
                  megaRewardDesc={weeklyVault.megaRewardDesc}
                  minGoalName={goalTiers[0]?.name || 'Meta Mínima'}
                  starGoalName={goalTiers[1]?.name || 'Meta Estrela'}
                  megaGoalName={goalTiers[2]?.name || 'Mega Meta'}
                  elapsedWorkingDays={elapsedWorkingDays}
                  totalWorkingDays={storeWorkingDaysInMonth}
                />

                {/* DESEMPENHO POR PRODUTO - CONSULTOR */}
                <ProductPerformanceCard 
                  records={activeCRecords}
                  title={selectedConsultant === 'all' ? "Desempenho por Produto (Geral)" : `Desempenho por Produto (${consultants[selectedConsultant]?.name || 'Consultor'})`}
                  subtitle="Quantidade vendida por categoria e modelo no período selecionado"
                />

                {/* Comparativo Lado a Lado (Disponível quando um consultor específico está selecionado) */}
                {selectedConsultant !== 'all' && (
                  <div className={cardClass}>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-txtPrimary">
                        <Users className="text-purple-500" size={16} /> Comparar Consultor
                      </h3>
                      <div className="relative w-full sm:w-64">
                        <select
                          value={compareConsultant}
                          onChange={(e) => setCompareConsultant(e.target.value)}
                          className={inputClass + ' h-10 py-1 pr-10 appearance-none text-xs cursor-pointer'}
                        >
                          <option value="none">Selecione para comparar...</option>
                          {consultantList.filter(c => c.id !== selectedConsultant).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-txtMuted" size={16} />
                      </div>
                    </div>

                    {compareConsultant !== 'none' && (
                      <div className="grid grid-cols-3 gap-2 text-center text-xs mt-4 border-t border-borderApp pt-3">
                        <div className="font-bold text-txtMuted">Métrica</div>
                        <div className="font-bold text-brand truncate">{consultants[selectedConsultant]?.name}</div>
                        <div className="font-bold text-purple-500 truncate">{consultants[compareConsultant]?.name}</div>

                        <div className="py-2.5 border-t border-borderApp text-txtSecondary">Pontos Lentes</div>
                        <div className="py-2.5 border-t border-borderApp font-bold text-txtPrimary">{cMetrics.totalPoints}</div>
                        <div className="py-2.5 border-t border-borderApp font-bold text-txtPrimary">{compMetrics.totalPoints}</div>

                        <div className="py-2.5 border-t border-borderApp text-txtSecondary">Vendas (R$)</div>
                        <div className="py-2.5 border-t border-borderApp font-bold text-txtPrimary">
                          {cMetrics.totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
                        </div>
                        <div className="py-2.5 border-t border-borderApp font-bold text-txtPrimary">
                          {compMetrics.totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
                        </div>
                        
                        <div className="py-2.5 border-t border-borderApp text-txtSecondary">Média Diária (R$/dia)</div>
                        <div className="py-2.5 border-t border-borderApp font-bold text-txtPrimary">
                          R$ {cDailyAvg.toLocaleString('pt-BR', {maximumFractionDigits: 0})}
                        </div>
                        <div className="py-2.5 border-t border-borderApp font-bold text-txtPrimary">
                          R$ {compDailyAvg.toLocaleString('pt-BR', {maximumFractionDigits: 0})}
                        </div>

                        <div className="py-2.5 border-t border-borderApp text-txtSecondary">Projeção do Mês (R$)</div>
                        <div className="py-2.5 border-t border-borderApp font-extrabold text-blue-600 dark:text-blue-400">
                          R$ {cProjection.toLocaleString('pt-BR', {maximumFractionDigits: 0})}
                        </div>
                        <div className="py-2.5 border-t border-borderApp font-extrabold text-purple-600 dark:text-purple-400">
                          R$ {compProjection.toLocaleString('pt-BR', {maximumFractionDigits: 0})}
                        </div>

                        <div className="py-2.5 border-t border-borderApp text-txtSecondary">Conversão</div>
                        <div className="py-2.5 border-t border-borderApp font-bold text-txtPrimary">{cMetrics.conversion.toFixed(1)}%</div>
                        <div className="py-2.5 border-t border-borderApp font-bold text-txtPrimary">{compMetrics.conversion.toFixed(1)}%</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB 3: EXPORT */}
      {activeTab === 'export' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className={`${cardClass} space-y-5`}>
            <div className="flex items-center gap-2 pb-2 border-b border-borderApp">
              <Download className="text-brand" size={20} />
              <div>
                <h2 className="text-base font-bold text-txtPrimary">Exportar Relatórios</h2>
                <p className="text-xs text-txtSecondary">Selecione o escopo do relatório e o período desejado para download.</p>
              </div>
            </div>

            {/* SELETOR DE ESCOPO DO RELATÓRIO */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider block text-txtSecondary">
                Tipo de Relatório (Escopo)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportScope('loja')}
                  className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                    exportScope === 'loja' ? 'btn-theme-emerald' : 'btn-theme-inactive'
                  }`}
                >
                  <Building2 size={18} /> Visão Geral da Loja
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('consultor')}
                  className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                    exportScope === 'consultor' ? 'btn-theme-blue' : 'btn-theme-inactive'
                  }`}
                >
                  <UserCheck size={18} /> Por Consultor Específico
                </button>
              </div>
            </div>

            {/* SUB-SELETOR DE CONSULTOR (quando escopo for 'consultor') */}
            {exportScope === 'consultor' && (
              <div className="space-y-1.5 animate-in fade-in duration-200 pt-1">
                <label className="text-xs font-semibold uppercase tracking-wider block text-txtSecondary">
                  Selecione o Consultor Cadastrado
                </label>
                <div className="relative">
                  <select
                    value={exportConsultantId}
                    onChange={(e) => setExportConsultantId(e.target.value)}
                    className={inputClass + ' pr-10 appearance-none cursor-pointer'}
                  >
                    <option value="all_separated">Todos os Consultores (Separados)</option>
                    {consultantList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-txtMuted" size={18} />
                </div>
              </div>
            )}

            {/* INTERVALO DE DATAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block text-txtSecondary">Data Inicial</label>
                <input 
                  type="date" 
                  value={exportStartDate} 
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block text-txtSecondary">Data Final</label>
                <input 
                  type="date" 
                  value={exportEndDate} 
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* PRÉVIA DOS REGISTROS */}
            <div className="p-4 rounded-2xl border border-borderApp bg-input grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-medium uppercase text-txtSecondary">Registros no Período</span>
                <span className="text-base font-extrabold text-txtPrimary">{exportFilteredRecords.length} atendimentos</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium uppercase text-txtSecondary">Conversão</span>
                <span className="text-base font-extrabold text-emerald-500">
                  {exportFilteredRecords.length > 0 ? ((exportFilteredRecords.filter(r => r.status === 'WON').length / exportFilteredRecords.length) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* BOTÕES DE DOWNLOAD */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button 
                type="button"
                onClick={() => handleExport('PDF')}
                className="flex flex-col items-center justify-center gap-1 p-3 border border-borderApp rounded-2xl transition-colors bg-card hover:bg-hover text-txtPrimary cursor-pointer shadow-xs"
              >
                <FileText size={20} className="text-red-500" />
                <span className="text-[10px] font-bold uppercase">PDF</span>
              </button>
              <button 
                type="button"
                onClick={() => handleExport('Excel')}
                className="flex flex-col items-center justify-center gap-1 p-3 border border-borderApp rounded-2xl transition-colors bg-card hover:bg-hover text-txtPrimary cursor-pointer shadow-xs"
              >
                <Table size={20} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase">Excel</span>
              </button>
              <button 
                type="button"
                onClick={() => handleExport('CSV')}
                className="flex flex-col items-center justify-center gap-1 p-3 border border-borderApp rounded-2xl transition-colors bg-card hover:bg-hover text-txtPrimary cursor-pointer shadow-xs"
              >
                <FileCode2 size={20} className="text-blue-500" />
                <span className="text-[10px] font-bold uppercase">CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTAINER DE EXPORTAÇÃO NO FINAL DA PÁGINA (VISÃO LOJA & CONSULTOR) */}
      {activeTab !== 'export' && (
        <div className="mt-8 pt-4 border-t border-borderApp">
          <p className="text-xs font-bold uppercase tracking-wider text-txtSecondary mb-2 text-center">
            Exportar dados do período em exibição
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button 
              type="button"
              onClick={() => handleCurrentScreenExport('PDF')}
              className="flex flex-col items-center justify-center gap-1 p-3 border border-borderApp rounded-2xl transition-colors bg-card hover:bg-hover text-txtPrimary cursor-pointer shadow-xs"
            >
              <FileText size={20} className="text-red-500" /> 
              <span className="text-[10px] font-bold uppercase">PDF</span>
            </button>
            <button 
              type="button"
              onClick={() => handleCurrentScreenExport('Excel')}
              className="flex flex-col items-center justify-center gap-1 p-3 border border-borderApp rounded-2xl transition-colors bg-card hover:bg-hover text-txtPrimary cursor-pointer shadow-xs"
            >
              <Table size={20} className="text-emerald-500" /> 
              <span className="text-[10px] font-bold uppercase">Excel</span>
            </button>
            <button 
              type="button"
              onClick={() => handleCurrentScreenExport('CSV')}
              className="flex flex-col items-center justify-center gap-1 p-3 border border-borderApp rounded-2xl transition-colors bg-card hover:bg-hover text-txtPrimary cursor-pointer shadow-xs"
            >
              <FileCode2 size={20} className="text-blue-500" /> 
              <span className="text-[10px] font-bold uppercase">CSV</span>
            </button>
          </div>
        </div>
      )}

      <AlertDialog 
        isOpen={alertInfo.isOpen}
        title={alertInfo.title}
        message={alertInfo.message}
        onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })}
      />
    </div>
  );
}
