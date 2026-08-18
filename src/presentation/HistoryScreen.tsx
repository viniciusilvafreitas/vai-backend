import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore, getActiveAccessName } from '../data/store';
import { format, addDays, subDays, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProductSelector } from '../components/ProductSelector';
import { Trash2, Edit2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Search, Users, ChevronDown, ChevronUp, FileText, Table, FileCode2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { sanitizeInput } from '../lib/utils';
import { exportToCSV, exportToExcel, exportToPDF, buildStandardFilename, formatExportPeriodDisplayTitle } from '../lib/exportUtils';
import { DateFilterBar, DatePreset } from '../components/DateFilterBar';
import { ExportBar } from '../components/ExportBar';

// Collapsible Section Container matching settings tab style
function CollapsibleSection({ 
  title, 
  subtitle,
  icon: Icon, 
  isOpen, 
  onToggle, 
  children,
  iconColorClass = "bg-blue-500/10 border-blue-500/20 text-blue-400"
}: { 
  title: string; 
  subtitle?: string;
  icon: any; 
  isOpen: boolean; 
  onToggle: () => void; 
  children: React.ReactNode;
  iconColorClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-borderApp shadow-md transition-all duration-200 relative overflow-visible mb-6 bg-card">
      <button 
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3.5 transition-colors text-left select-none outline-none focus:outline-none bg-card hover:bg-hover ${isOpen ? 'rounded-t-2xl border-b border-borderApp' : 'rounded-2xl'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${iconColorClass} flex items-center justify-center shrink-0`}>
            <Icon size={14} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1 text-txtPrimary">
              {title}
            </span>
            {subtitle && (
              <span className="text-[10px] font-semibold truncate mt-0.5 text-txtSecondary">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="ml-2 shrink-0 text-txtSecondary">
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 rounded-b-2xl bg-card">
          {children}
        </div>
      )}
    </div>
  );
}

export default function HistoryScreen() {
  const { records, deleteRecord, consultants, selectedDate, changeSelectedDate, updateRecord, theme } = useAppStore();
  const isDark = theme === 'dark';
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  
  // Editing State
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});

  
  const handleStartEdit = (record: any) => {
    setEditingRecord(record);
    // Extrai observação
    let productIdBase = record.productId || '';
    let obs = '';
    const obsMatch = productIdBase.match(/\(Obs: (.*?)\)/);
    if (obsMatch) {
      obs = obsMatch[1];
      productIdBase = productIdBase.replace(/ \(Obs: .*?\)/, '');
    }

    let lenteTipo = '';
    let linhaTipo = '';
    let modelo = '';
    let outrosValue = '';

    if (productIdBase.includes('|')) {
      const parts = productIdBase.split(' | ').map((s: string) => s.trim());
      lenteTipo = parts[0] || '';
      linhaTipo = parts[1] || '';
      modelo = parts[2] || '';
    } else {
      if (productIdBase === 'Produto Geral') {
         lenteTipo = '';
      } else {
         lenteTipo = 'Outros';
         outrosValue = productIdBase;
      }
    }

    const initialConsultantId = record.consultantId || (Object.values(consultants).find((c: any) => c.name === record.consultantName)?.id || '');
    const initialConsultantName = record.consultantName || (initialConsultantId ? consultants[initialConsultantId]?.name : '') || '';

    setEditData({
      date: record.logicalDate || (record.createdAt ? record.createdAt.split('T')[0] : selectedDate),
      customerName: record.customerName || '',
      customerPhone: record.customerPhone || '',
      consultantId: initialConsultantId,
      consultantName: initialConsultantName,
      status: record.status || 'WON',
      origem: record.origem || '',
      value: record.status === 'WON' ? record.closedValue : record.budgetValue,
      lenteTipo,
      linhaTipo,
      modelo,
      outrosValue,
      observacoes: obs
    });
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    
    let finalProductId = "Produto Geral";
    if (editData.lenteTipo === 'Outros') {
      finalProductId = (editData.outrosValue || '').trim() || 'Outros';
    } else if (editData.lenteTipo) {
      const produtoCombinado = [
        editData.lenteTipo,
        editData.linhaTipo,
        editData.modelo
      ].filter(Boolean).join(" | ");
      if (produtoCombinado) finalProductId = produtoCombinado;
    }
    
    const obsFormatada = (editData.observacoes || '').trim() ? ` (Obs: ${editData.observacoes.trim()})` : "";
    finalProductId = `${finalProductId}${obsFormatada}`;

    const newLogicalDate = editData.date || editingRecord.logicalDate || selectedDate;
    const [y, m, d] = newLogicalDate.split('-').map(Number);
    const existingTime = new Date(editingRecord.createdAt || Date.now());
    const newCreatedAt = new Date(y, m - 1, d, existingTime.getHours(), existingTime.getMinutes(), existingTime.getSeconds(), existingTime.getMilliseconds()).toISOString();

    const selectedConsId = editData.consultantId || editingRecord.consultantId;
    const consObj = consultants[selectedConsId];
    const finalConsultantName = editData.consultantName || (consObj ? consObj.name : editingRecord.consultantName);

    const updates: any = {
      logicalDate: newLogicalDate,
      createdAt: newCreatedAt,
      customerName: sanitizeInput(editData.customerName),
      customerPhone: sanitizeInput(editData.customerPhone),
      consultantId: selectedConsId,
      consultantName: sanitizeInput(finalConsultantName),
      status: editData.status || editingRecord.status,
      origem: editData.origem,
      productId: finalProductId
    };

    const numVal = Number(editData.value) || 0;
    if (updates.status === 'WON') {
      updates.closedValue = numVal;
      updates.budgetValue = numVal;
    } else {
      updates.budgetValue = numVal;
      updates.closedValue = 0;
    }

    updateRecord(editingRecord.id, updates);
    setEditingRecord(null);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [appliedStartDate, setAppliedStartDate] = useState(todayStr);
  const [appliedEndDate, setAppliedEndDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState<'all' | 'WON' | 'LOST'>('all');

  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    resumoVendas: true,
    desempenhoVendedor: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setAppliedStartDate(start);
    setAppliedEndDate(end);
    if (start === end) {
      changeSelectedDate(start);
    }
  };

  const recordsArray = useMemo(() => Object.values(records || {}), [records]);

  const baseDateFilteredRecords = useMemo(() => {
    return recordsArray.filter(r => {
      // 1. Match Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = (r.customerName || '').toLowerCase().includes(term);
        const matchesProduct = (r.productId || '').toLowerCase().includes(term);
        const matchesConsultant = (r.consultantName || '').toLowerCase().includes(term);
        if (!matchesName && !matchesProduct && !matchesConsultant) return false;
      }

      // 2. Match Date Range
      const getRecordDateStr = (r: any) => r.logicalDate || (r.createdAt ? r.createdAt.split('T')[0] : '');
      const recordDateStr = getRecordDateStr(r);
      if (!recordDateStr) return false;

      if (appliedStartDate === appliedEndDate) {
        if (recordDateStr !== appliedStartDate) return false;
      } else {
        const recordDate = parseISO(recordDateStr);
        const start = startOfDay(parseISO(appliedStartDate));
        const end = endOfDay(parseISO(appliedEndDate));
        if (!isWithinInterval(recordDate, { start, end })) return false;
      }

      // 3. Match Consultant
      if (selectedConsultantId !== 'all') {
        if (r.consultantId !== selectedConsultantId) return false;
      }

      // 4. Match Origem
      if (originFilter !== 'all') {
        if (r.origem !== originFilter) return false;
      }

      return true;
    });
  }, [recordsArray, searchTerm, appliedStartDate, appliedEndDate, selectedConsultantId, originFilter]);

  const statusCounts = useMemo(() => {
    const total = baseDateFilteredRecords.length;
    const won = baseDateFilteredRecords.filter(r => r.status === 'WON').length;
    const lost = baseDateFilteredRecords.filter(r => r.status === 'LOST').length;
    return { total, won, lost };
  }, [baseDateFilteredRecords]);

  const filteredRecords = useMemo(() => {
    return baseDateFilteredRecords.filter(r => {
      if (statusFilter === 'WON') return r.status === 'WON';
      if (statusFilter === 'LOST') return r.status === 'LOST';
      return true;
    });
  }, [baseDateFilteredRecords, statusFilter]);

  const statusOptions = useMemo(() => [
    { id: 'all', label: 'Todos', count: statusCounts.total },
    { id: 'WON', label: 'Apenas Vendas', count: statusCounts.won, color: 'bg-emerald-600 text-white border-emerald-600' },
    { id: 'LOST', label: 'Apenas Orçamentos', count: statusCounts.lost, color: 'bg-amber-600 text-white border-amber-600' }
  ], [statusCounts]);

  const handleExport = (type: 'PDF' | 'Excel' | 'CSV') => {
    if (filteredRecords.length === 0) {
      alert('Nenhum registro encontrado no período selecionado.');
      return;
    }
    const accessName = getActiveAccessName();
    const dateDisplay = formatExportPeriodDisplayTitle(appliedStartDate, appliedEndDate);
    const filename = buildStandardFilename('Lista de vez', accessName, appliedStartDate, appliedEndDate);
    const title = `Lista de vez - ${accessName} - ${dateDisplay}`;
    const subtitle = `Filtro: ${dateDisplay} | Acesso: ${accessName}`;
    try {
      if (type === 'PDF') {
        exportToPDF(filteredRecords, filename, title, { subtitle });
      } else if (type === 'Excel') {
        exportToExcel(filteredRecords, filename, { subtitle });
      } else if (type === 'CSV') {
        exportToCSV(filteredRecords, filename, { subtitle });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const performanceData = useMemo(() => {
    const storeTotalAtendimentos = filteredRecords.length;
    const storeTotalVendas = filteredRecords.filter(r => r.status === 'WON').length;
    const storeConversion = storeTotalAtendimentos > 0 ? (storeTotalVendas / storeTotalAtendimentos) * 100 : 0;
    const totalRevenue = filteredRecords.reduce((acc, r) => acc + (r.status === 'WON' ? (r.closedValue || 0) : 0), 0);
    const tkm = storeTotalVendas > 0 ? totalRevenue / storeTotalVendas : 0;
    return { storeTotalAtendimentos, storeTotalVendas, storeConversion, totalRevenue, tkm };
  }, [filteredRecords]);

  const consultantsComparisonData = useMemo(() => {
    const map: Record<string, { totalCount: number; wonCount: number; totalRevenue: number; tkm: number }> = {};
    filteredRecords.forEach(r => {
      const name = r.consultantName || consultants[r.consultantId]?.name || 'Desconhecido';
      if (!map[name]) {
        map[name] = { totalCount: 0, wonCount: 0, totalRevenue: 0, tkm: 0 };
      }
      map[name].totalCount += 1;
      if (r.status === 'WON') {
        map[name].wonCount += 1;
        map[name].totalRevenue += (r.closedValue || 0);
      }
    });

    Object.keys(map).forEach(name => {
      const won = map[name].wonCount;
      map[name].tkm = won > 0 ? map[name].totalRevenue / won : 0;
    });

    return Object.entries(map).map(([name, stats]) => ({
      name,
      ...stats,
      conversion: stats.totalCount > 0 ? (stats.wonCount / stats.totalCount) * 100 : 0
    }));
  }, [filteredRecords, consultants]);

  const maxTkm = useMemo(() => {
    if (consultantsComparisonData.length === 0) return 1;
    return Math.max(...consultantsComparisonData.map(c => c.tkm), 1);
  }, [consultantsComparisonData]);
return (
    <div className="p-4 sm:p-6 pb-24 max-w-lg mx-auto">
      {/* Cabeçalho Padronizado */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-stone-800'}`}>Histórico</h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-stone-500'} text-sm mt-1`}>Veja todos os atendimentos, vendas e orçamentos registrados.</p>
        </div>
      </div>

      {/* EXPORTBAR NO TOPO */}
      <ExportBar onExport={handleExport} count={filteredRecords.length} />

      {/* UNIFIED DATE FILTER AND SEARCH BAR */}
      <DateFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por cliente, produto ou consultor..."
        startDate={appliedStartDate}
        endDate={appliedEndDate}
        onDateRangeChange={handleDateRangeChange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={statusOptions}
      />

      {/* FILTROS ADICIONAIS DE CONSULTOR E ORIGEM */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-none">
        <div className="relative min-w-[150px] shrink-0">
          <select 
            value={selectedConsultantId}
            onChange={(e) => setSelectedConsultantId(e.target.value)}
            className="w-full bg-input border border-borderApp text-txtPrimary rounded-xl p-3 pr-8 outline-none transition-all appearance-none text-xs font-bold cursor-pointer"
          >
            <option value="all">Todos os Vendedores</option>
            {Object.values(consultants).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txtSecondary pointer-events-none" />
        </div>
        
        <div className="relative min-w-[140px] shrink-0">
          <select 
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="w-full bg-input border border-borderApp text-txtPrimary rounded-xl p-3 pr-8 outline-none transition-all appearance-none text-xs font-bold cursor-pointer"
          >
            <option value="all">Todas Origens</option>
            <option value="Rua">Rua</option>
            <option value="Indicação">Indicação</option>
            <option value="Rede Social">Rede Social</option>
            <option value="Google">Google</option>
            <option value="Cliente Antigo">Cliente Antigo</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txtSecondary pointer-events-none" />
        </div>
      </div>

      {/* RESUMO DE VENDAS */}
      <CollapsibleSection 
        title="Resumo de Vendas" 
        subtitle="Métricas do período selecionado"
        icon={TrendingUp}
        isOpen={openSections['resumoVendas']}
        onToggle={() => toggleSection('resumoVendas')}
        iconColorClass="bg-blue-500/10 border-blue-500/20 text-blue-400"
      >
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-white border-stone-200'}`}>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Faturamento</span>
            <span className="text-emerald-500 font-black text-xl">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(performanceData.totalRevenue)}
            </span>
          </div>
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-white border-stone-200'}`}>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Atendimentos</span>
            <span className={`font-black text-xl ${isDark ? 'text-white' : 'text-stone-800'}`}>
              {performanceData.storeTotalAtendimentos} <span className="text-slate-500 text-xs font-medium ml-1">total</span>
            </span>
          </div>
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-white border-stone-200'}`}>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Vendas Fechadas</span>
            <span className="text-blue-500 font-black text-xl">
              {performanceData.storeTotalVendas} <span className="text-slate-500 text-xs font-medium ml-1">vendas</span>
            </span>
          </div>
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-white border-stone-200'}`}>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Conversão</span>
            <span className="text-purple-500 font-black text-xl">
              {performanceData.storeConversion.toFixed(0)}%
            </span>
          </div>
        </div>
      </CollapsibleSection>

      {/* DESEMPENHO POR VENDEDOR */}
      <CollapsibleSection 
        title="Desempenho por Vendedor" 
        subtitle="Comparativo da equipe"
        icon={Users}
        isOpen={openSections['desempenhoVendedor']}
        onToggle={() => toggleSection('desempenhoVendedor')}
        iconColorClass="bg-purple-500/10 border-purple-500/20 text-purple-400"
      >
        <div className="flex flex-col gap-3">
          {consultantsComparisonData.map(c => {
            const conversionColor = 
              c.conversion >= 30 ? 'bg-emerald-500' : 
              c.conversion >= 20 ? 'bg-blue-500' : 
              c.conversion >= 10 ? 'bg-amber-500' : 'bg-red-500';
            
            return (
              <div key={c.id} className={`rounded-xl p-4 border ${isDark ? 'bg-slate-950 border-slate-800/50' : 'bg-white border-stone-200'}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-stone-800'}`}>{c.name}</span>
                  <span className="text-emerald-500 font-black text-sm">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(c.total)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Conversão */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Conversão</span>
                      <span className={`text-xs font-black ${isDark ? 'text-slate-300' : 'text-stone-700'}`}>{c.conversion.toFixed(0)}% <span className="text-slate-500 font-medium text-[10px]">({c.count}/{c.atendimentos})</span></span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-stone-200'}`}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${c.conversion}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full ${conversionColor} rounded-full`}
                      />
                    </div>
                  </div>
                  
                  {/* TKM por Venda */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Ticket Médio</span>
                      <span className="text-emerald-500 text-xs font-black">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(c.tkm)}
                      </span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-stone-200'}`}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(c.tkm / maxTkm) * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {consultantsComparisonData.length === 0 && (
            <p className="text-slate-500 text-sm italic text-center py-4">Nenhum consultor com atendimentos neste período.</p>
          )}
        </div>
      </CollapsibleSection>

      <div className="flex flex-col gap-8">
        <h3 className="font-bold ml-1 text-sm uppercase tracking-widest text-slate-500">Lista de Atendimentos ({filteredRecords.length})</h3>
        
        {/* Render grouped by consultant */}
        {Object.entries(
          filteredRecords.reduce((acc, record) => {
            const consultantName = record.consultantName || consultants[record.consultantId]?.name || 'Desconhecido';
            if (!acc[consultantName]) acc[consultantName] = [];
            acc[consultantName].push(record);
            return acc;
          }, {} as Record<string, typeof filteredRecords>)
        )
        .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
        .map(([consultantName, records]: [string, any[]]) => (
          <div key={consultantName} className="flex flex-col gap-4">
            <h4 className="text-blue-500 font-bold ml-1 text-sm uppercase tracking-widest border-b border-stone-200 dark:border-slate-800 pb-2">{consultantName}</h4>
            {records.map(record => (
              <div key={record.id} className={`p-5 rounded-3xl border shadow-lg flex flex-col gap-3 relative group ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}>
                <button 
                  onClick={() => setRecordToDelete(record.id)}
                  className={`absolute top-5 right-5 text-slate-400 hover:text-red-500 transition-colors p-2 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-stone-100'}`}
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex items-center justify-between pr-10">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${record.status === 'WON' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {record.status === 'WON' ? 'Venda Fechada' : 'Não Comprou'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{format(new Date(record.createdAt), 'HH:mm')}</span>
                </div>

                <div className="mt-1">
                  <div className="flex items-start justify-between">
                    <div onClick={() => handleStartEdit(record)} className={`cursor-pointer group/edit rounded -ml-1 p-1 transition-colors flex-1 ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-stone-100'}`}>
                    <p className={`font-bold text-lg ${isDark ? 'text-white group-hover/edit:text-blue-400' : 'text-stone-800 group-hover/edit:text-blue-600'}`}>{record.customerName}</p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>{record.customerPhone || 'Sem telefone'}</p>
                    {(record.origem || (record.productId && record.productId !== "Produto Geral")) && (
                      <p className="text-slate-500 text-xs mt-1 truncate">
                        {record.origem ? `[${record.origem}] ` : ''}{record.productId !== "Produto Geral" ? record.productId : ""}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleStartEdit(record); }}
                    className={`text-slate-400 hover:text-blue-500 transition-colors p-2 rounded-xl shrink-0 mt-1 ${isDark ? 'bg-slate-800/50' : 'bg-stone-100'}`}
                  >
                    <Edit2 size={16} />
                  </button>
                  </div>
                </div>

                <div className={`flex justify-between items-end mt-2 pt-4 border-t ${isDark ? 'border-slate-800/80' : 'border-stone-200'}`}>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Vendedor</span>
                    <span onClick={() => handleStartEdit(record)} className={`text-sm font-medium cursor-pointer hover:text-blue-500 p-1 -ml-1 rounded transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800/50' : 'text-stone-700 hover:bg-stone-100'}`}>
                      {record.consultantName || consultants[record.consultantId]?.name || 'Desconhecido'}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                      {record.status === 'WON' ? 'Valor Fechado' : 'Orçamento'}
                    </span>
                    <span className={`text-base font-bold ${record.status === 'WON' ? 'text-emerald-500' : (isDark ? 'text-slate-300' : 'text-stone-800')}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.status === 'WON' ? record.closedValue : (record as any).budgetValue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div className="h-4"></div>
          </div>
        ))}
        {filteredRecords.length === 0 && (
          <div className={`flex flex-col items-center justify-center p-10 rounded-3xl border border-dashed mt-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#EFECE6] border-stone-300'}`}>
            <p className="text-center text-slate-500 text-sm font-medium">Nenhum atendimento registrado neste dia.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!recordToDelete}
        title="Excluir Registro"
        message="Tem certeza que deseja excluir esta ficha permanentemente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={() => {
          if (recordToDelete) {
            deleteRecord(recordToDelete);
            setRecordToDelete(null);
          }
        }}
        onCancel={() => setRecordToDelete(null)}
        variant="danger"
      />

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRecord && (
          <div 
            onDoubleClick={() => setEditingRecord(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              onDoubleClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="border border-borderApp rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto cursor-default bg-card text-txtPrimary"
            >
              <h3 className="text-lg font-bold text-txtPrimary">Editar Registro</h3>
              
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-txtSecondary">
                    Data do Atendimento
                  </label>
                  <input 
                    type="date"
                    value={editData.date || ''}
                    onChange={(e) => setEditData({...editData, date: e.target.value})}
                    className="px-4 py-3 rounded-xl border border-borderApp bg-input text-txtPrimary text-sm focus:border-blue-500 outline-none w-full cursor-pointer"
                  />
                </div>

                <input 
                  type="text"
                  placeholder="Nome do Cliente"
                  value={editData.customerName}
                  onChange={(e) => setEditData({...editData, customerName: e.target.value})}
                  className="px-4 py-3 rounded-xl border border-borderApp bg-input text-txtPrimary text-sm focus:border-blue-500 outline-none w-full"
                />
                <input 
                  type="tel"
                  placeholder="Telefone"
                  value={editData.customerPhone}
                  onChange={(e) => setEditData({...editData, customerPhone: e.target.value})}
                  className="px-4 py-3 rounded-xl border border-borderApp bg-input text-txtPrimary text-sm focus:border-blue-500 outline-none w-full"
                />
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-txtSecondary">
                    Consultor / Vendedor
                  </label>
                  <div className="relative">
                    <select
                      value={editData.consultantId || ''}
                      onChange={(e) => {
                        const selId = e.target.value;
                        const matched = consultants[selId];
                        setEditData({
                          ...editData,
                          consultantId: selId,
                          consultantName: matched ? matched.name : editData.consultantName
                        });
                      }}
                      className="px-4 py-3 rounded-xl border border-borderApp bg-input text-txtPrimary text-sm focus:border-blue-500 outline-none w-full appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Selecione o Consultor</option>
                      {Object.values(consultants).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-txtSecondary pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-txtSecondary">
                    Tipo de Registro
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, status: 'WON' })}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        editData.status === 'WON'
                          ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500'
                          : 'bg-input text-txtSecondary border-borderApp'
                      }`}
                    >
                      Venda Fechada
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, status: 'LOST' })}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        editData.status === 'LOST'
                          ? 'bg-amber-500/20 text-amber-500 border-amber-500'
                          : 'bg-input text-txtSecondary border-borderApp'
                      }`}
                    >
                      Orçamento
                    </button>
                  </div>
                </div>

                <input 
                  type="number"
                  placeholder="Valor (R$)"
                  value={editData.value}
                  onChange={(e) => setEditData({...editData, value: e.target.value})}
                  className="px-4 py-3 rounded-xl border border-borderApp bg-input text-txtPrimary text-sm focus:border-blue-500 outline-none w-full"
                />
                
                <div className="relative">
                  <select
                    value={editData.origem}
                    onChange={(e) => setEditData({...editData, origem: e.target.value})}
                    className="px-4 py-3 rounded-xl border border-borderApp bg-input text-txtPrimary text-sm focus:border-blue-500 outline-none w-full appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Como o cliente chegou? (Origem)</option>
                    <option value="Rua">Rua</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Rede Social">Rede Social</option>
                    <option value="Google">Google</option>
                    <option value="Cliente Antigo">Cliente Antigo</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-txtSecondary pointer-events-none" />
                </div>

                <ProductSelector
                  lenteTipo={editData.lenteTipo} setLenteTipo={(v: any) => setEditData({...editData, lenteTipo: v})}
                  linhaTipo={editData.linhaTipo} setLinhaTipo={(v: any) => setEditData({...editData, linhaTipo: v})}
                  lentePers={editData.modelo} setLentePers={(v: any) => setEditData({...editData, modelo: v})}
                  linhaPrime={editData.modelo} setLinhaPrime={(v: any) => setEditData({...editData, modelo: v})}
                  outrosValue={editData.outrosValue} setOutrosValue={(v: any) => setEditData({...editData, outrosValue: v})}
                />

                <textarea
                  placeholder="Observações"
                  value={editData.observacoes}
                  onChange={(e) => setEditData({...editData, observacoes: e.target.value})}
                  className="px-4 py-3 rounded-xl border border-borderApp bg-input text-txtPrimary text-sm focus:border-blue-500 outline-none w-full resize-none min-h-[80px]"
                />
              </div>
              
              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold btn-type-inactive cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="flex-1 py-3 rounded-xl text-sm font-bold btn-type-venda-active cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
