import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore, getActiveAccessName } from '../data/store';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Users, Calendar as CalendarIcon, Download, Edit2, Trash2, Check, X, FileText, Table, FileCode2, ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react';
import { AlertDialog } from '../components/AlertDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { exportToCSV, exportToExcel, exportToPDF, buildStandardFilename, formatExportPeriodDisplayTitle } from '../lib/exportUtils';
import { sanitizeInput } from '../lib/utils';
import { DateFilterBar } from '../components/DateFilterBar';
import { ExportBar } from '../components/ExportBar';

export default function LeadsScreen() {
  const { records, selectedDate, changeSelectedDate, updateRecord, deleteRecord, consultants, theme } = useAppStore();
  const isDark = theme === 'dark';
  
  const [appliedStartDate, setAppliedStartDate] = useState(selectedDate);
  const [appliedEndDate, setAppliedEndDate] = useState(selectedDate);
  
  // Pesquisa Isolada por Consultor (com persistência independente)
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>(() => {
    return localStorage.getItem('leads_selected_consultant_id') || 'all';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState('all');
  const [contactTypeFilter, setContactTypeFilter] = useState<'all' | 'won' | 'lost'>('all');

  useEffect(() => {
    localStorage.setItem('leads_selected_consultant_id', selectedConsultantId);
  }, [selectedConsultantId]);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState('');
  
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', budget: 0, interest: '', consultantName: '', date: '' });
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  useEffect(() => {
    setAppliedStartDate(selectedDate);
    setAppliedEndDate(selectedDate);
  }, [selectedDate]);

  const handleDateRangeChange = (start: string, end: string) => {
    setAppliedStartDate(start);
    setAppliedEndDate(end);
    if (start === end) {
      changeSelectedDate(start);
    }
  };

  const baseFilteredRecords = useMemo(() => {
    return Object.values(records)
      .filter(r => r.status === 'WON' || r.status === 'LOST')
      .filter(r => selectedConsultantId === 'all' || r.consultantId === selectedConsultantId)
      .filter(r => {
        const rDate = r.logicalDate || (r.createdAt ? r.createdAt.split('T')[0] : '');
        if (!rDate) return false;
        if (appliedStartDate === appliedEndDate) {
          return rDate === appliedStartDate;
        } else {
          try {
            const start = startOfDay(parseISO(appliedStartDate));
            const end = endOfDay(parseISO(appliedEndDate));
            const recordDate = parseISO(rDate);
            return isWithinInterval(recordDate, { start, end });
          } catch {
            return false;
          }
        }
      })
      .filter(r => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const clientName = (r.customerName || '').toLowerCase();
        const productName = (r.productId || '').toLowerCase();
        const consultantName = (r.consultantName || '').toLowerCase();
        return clientName.includes(searchLower) || productName.includes(searchLower) || consultantName.includes(searchLower);
      })
      .filter(r => originFilter === 'all' || r.origem === originFilter);
  }, [records, appliedStartDate, appliedEndDate, selectedConsultantId, searchTerm, originFilter]);

  const counts = useMemo(() => {
    const total = baseFilteredRecords.length;
    const won = baseFilteredRecords.filter(r => r.status === 'WON').length;
    const lost = baseFilteredRecords.filter(r => r.status === 'LOST').length;
    return { total, won, lost };
  }, [baseFilteredRecords]);

  const statusOptions = useMemo(() => [
    { id: 'all', label: 'Todos', count: counts.total },
    { id: 'won', label: 'Compraram / Vendas', count: counts.won, color: 'bg-emerald-600 text-white border-emerald-600' },
    { id: 'lost', label: 'Apenas Orçamentos', count: counts.lost, color: 'bg-amber-600 text-white border-amber-600' }
  ], [counts]);

  const lostRecords = useMemo(() => {
    return baseFilteredRecords
      .filter(r => {
        if (contactTypeFilter === 'won') return r.status === 'WON';
        if (contactTypeFilter === 'lost') return r.status === 'LOST';
        return true;
      })
      .map(r => ({
        ...r,
        consultantName: r.consultantName || consultants[r.consultantId]?.name || 'Desconhecido'
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [baseFilteredRecords, contactTypeFilter, consultants]);

  const handleExport = (type: string) => {
    const accessName = getActiveAccessName();
    const dateDisplay = formatExportPeriodDisplayTitle(appliedStartDate, appliedEndDate);
    const filename = buildStandardFilename('Lista de vez - Leads Remarketing', accessName, appliedStartDate, appliedEndDate);
    const title = `Lista de vez - ${accessName} - Leads Remarketing (${dateDisplay})`;
    const subtitle = `Filtro: ${dateDisplay} | Acesso: ${accessName}`;
    try {
      if (type === 'PDF') {
        exportToPDF(lostRecords, filename, title, { subtitle });
      } else if (type === 'Excel') {
        exportToExcel(lostRecords, filename, { subtitle });
      } else if (type === 'CSV') {
        exportToCSV(lostRecords, filename, { subtitle });
      }
    } catch (e) {
      console.error(e);
      setAlertType(`Erro ao exportar ${type}`);
      setIsAlertOpen(true);
    }
  };

  const startEditing = (record: any) => {
    setEditingRecordId(record.id);
    setEditForm({
      name: record.customerName,
      phone: record.customerPhone,
      budget: record.budgetValue || 0,
      interest: record.productId,
      consultantName: record.consultantName || 'Desconhecido',
      date: record.logicalDate || (record.createdAt ? record.createdAt.split('T')[0] : selectedDate)
    });
  };

  const saveEditing = (id: string) => {
    const newLogicalDate = editForm.date || selectedDate;
    const [y, m, d] = newLogicalDate.split('-').map(Number);
    const existingTime = new Date(records[id]?.createdAt || Date.now());
    const newCreatedAt = new Date(y, m - 1, d, existingTime.getHours(), existingTime.getMinutes(), existingTime.getSeconds(), existingTime.getMilliseconds()).toISOString();

    updateRecord(id, {
      logicalDate: newLogicalDate,
      createdAt: newCreatedAt,
      customerName: sanitizeInput(editForm.name),
      customerPhone: sanitizeInput(editForm.phone),
      budgetValue: editForm.budget,
      productId: sanitizeInput(editForm.interest),
      consultantName: sanitizeInput(editForm.consultantName)
    } as any);
    setEditingRecordId(null);
  };

  const cancelEditing = () => {
    setEditingRecordId(null);
  };

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-lg mx-auto">
      {/* Cabeçalho Padronizado */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-stone-800'}`}>Recuperação</h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-stone-500'} text-sm mt-1`}>Lista de clientes que receberam orçamento, mas ainda não fecharam.</p>
        </div>
      </div>

      {/* EXPORTBAR NO TOPO */}
      <ExportBar onExport={handleExport} count={lostRecords.length} />

      {/* UNIFIED DATE FILTER AND SEARCH BAR */}
      <DateFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por cliente, produto ou consultor..."
        startDate={appliedStartDate}
        endDate={appliedEndDate}
        onDateRangeChange={handleDateRangeChange}
        statusFilter={contactTypeFilter}
        onStatusFilterChange={setContactTypeFilter}
        statusOptions={statusOptions}
      />

      {/* 3. FILTROS AVANÇADOS */}
      <div className="mb-6 rounded-3xl p-5 border border-borderApp bg-card space-y-4">
        <div>
          <label className="text-[10px] text-txtSecondary font-bold uppercase tracking-widest pl-1 mb-1 block">
            Consultor Específico
          </label>
          <div className="relative">
            <select
              value={selectedConsultantId}
              onChange={(e) => setSelectedConsultantId(e.target.value)}
              className="w-full rounded-xl p-3 text-sm border border-borderApp bg-input text-txtPrimary outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todos os consultores</option>
              {Object.values(consultants).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-txtSecondary pointer-events-none" />
          </div>
        </div>
        
        <div>
          <label className="text-[10px] text-txtSecondary font-bold uppercase tracking-widest pl-1 mb-1 block">
            Filtrar por Origem
          </label>
          <div className="relative">
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="w-full rounded-xl p-3 text-sm border border-borderApp bg-input text-txtPrimary outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todas as origens</option>
              <option value="Rua">Rua</option>
              <option value="Indicação">Indicação</option>
              <option value="Rede Social">Rede Social</option>
              <option value="Google">Google</option>
              <option value="Cliente Antigo">Cliente Antigo</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-txtSecondary pointer-events-none" />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        {lostRecords.map(record => (
          <div key={record.id} className="p-5 rounded-3xl border border-borderApp bg-card flex flex-col gap-4 shadow-xs relative group text-txtPrimary">
             {editingRecordId === record.id ? (
               <div className="flex flex-col gap-3">
                 <div>
                   <label className="text-[10px] uppercase text-txtSecondary font-bold mb-1 block">Data do Atendimento</label>
                   <input 
                     type="date"
                     value={editForm.date} 
                     onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                     className="w-full rounded-xl p-3 border border-borderApp bg-input text-txtPrimary text-sm outline-none transition-all cursor-pointer"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] uppercase text-txtSecondary font-bold mb-1 block">Nome do Cliente</label>
                   <input 
                     value={editForm.name} 
                     onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                     className="w-full rounded-xl p-3 border border-borderApp bg-input text-txtPrimary text-sm outline-none transition-all"
                   />
                 </div>
                 <div className="flex gap-2">
                   <div className="flex-1">
                     <label className="text-[10px] uppercase text-txtSecondary font-bold mb-1 block">Telefone</label>
                     <input 
                       value={editForm.phone} 
                       onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                       className="w-full rounded-xl p-3 border border-borderApp bg-input text-txtPrimary text-sm outline-none transition-all"
                     />
                   </div>
                   <div className="flex-1">
                     <label className="text-[10px] uppercase text-txtSecondary font-bold mb-1 block">Orçamento (R$)</label>
                     <input 
                       type="number"
                       value={editForm.budget} 
                       onChange={e => setEditForm({ ...editForm, budget: Number(e.target.value) })}
                       className="w-full rounded-xl p-3 border border-borderApp bg-input text-txtPrimary text-sm outline-none transition-all"
                     />
                   </div>
                 </div>
                 <div>
                   <label className="text-[10px] uppercase text-txtSecondary font-bold mb-1 block">Interesse</label>
                   <input 
                     value={editForm.interest} 
                     onChange={e => setEditForm({ ...editForm, interest: e.target.value })}
                     className="w-full rounded-xl p-3 border border-borderApp bg-input text-txtPrimary text-sm outline-none transition-all"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] uppercase text-txtSecondary font-bold mb-1 block">Vendedor Responsável</label>
                   <input 
                     value={editForm.consultantName} 
                     onChange={e => setEditForm({ ...editForm, consultantName: e.target.value })}
                     className="w-full rounded-xl p-3 border border-borderApp bg-input text-txtPrimary text-sm outline-none transition-all"
                   />
                 </div>
                 <div className="flex gap-2 mt-2">
                    <button onClick={cancelEditing} className="flex-1 py-2 rounded-xl btn-type-inactive font-bold text-sm flex items-center justify-center gap-1 cursor-pointer">
                     <X size={16} /> Cancelar
                   </button>
                    <button onClick={() => saveEditing(record.id)} className="flex-1 py-2 rounded-xl btn-type-venda-active font-bold text-sm flex items-center justify-center gap-1 cursor-pointer">
                     <Check size={16} /> Salvar
                   </button>
                 </div>
               </div>
             ) : (
               <>
                 <div className="absolute top-4 right-4 flex opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                   <button onClick={() => startEditing(record)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-blue-400 bg-slate-800/50' : 'text-stone-500 hover:text-blue-600 bg-stone-100'}`}>
                     <Edit2 size={16} />
                   </button>
                   <button onClick={() => setRecordToDelete(record.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-red-400 bg-slate-800/50' : 'text-stone-500 hover:text-red-600 bg-stone-100'}`}>
                     <Trash2 size={16} />
                   </button>
                 </div>
                 <div className="flex justify-between items-start pr-16 group/edit">
                   <div onClick={() => startEditing(record)} className={`cursor-pointer p-1 -ml-1 rounded transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-stone-100'}`}>
                     <p className={`font-bold text-lg ${isDark ? 'text-white group-hover/edit:text-blue-400' : 'text-stone-800 group-hover/edit:text-blue-600'}`}>{record.customerName}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 mt-1 inline-block ${
                        record.status === 'WON' 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}>
                        {record.status === 'WON' ? 'Venda' : 'Orçamento'}
                      </span>
                     <p className={`text-sm font-medium mt-1 ${isDark ? 'text-slate-400 group-hover/edit:text-slate-300' : 'text-stone-500'}`}>
                       {record.status === 'WON' ? 'Valor: ' : 'Orçamento: '}<span className={isDark ? 'text-slate-200' : 'text-stone-800'}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.status === 'WON' ? (record.closedValue || 0) : ((record as any).budgetValue || 0))}</span>
                     </p>
                     <p className="text-slate-500 text-xs mt-1">Interesse / Produto: {record.productId}</p>
                      <p className={`text-xs font-semibold mt-2 pt-2 border-t ${isDark ? 'text-slate-400 border-slate-800/80' : 'text-stone-500 border-stone-200'}`}>
                        Vendedor: <span className="text-blue-500 font-bold">{record.consultantName || 'Desconhecido'}</span>
                      </p>
                   </div>
                   <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{format(new Date(record.createdAt), 'dd MMM yyyy', { locale: ptBR })}</span>
                 </div>
                 
                 {record.customerPhone ? (
                   <a 
                     href={`https://wa.me/55${record.customerPhone.replace(/\D/g,'')}`}
                     target="_blank" rel="noreferrer"
                     className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl font-bold text-sm transition-colors"
                   >
                     <Phone size={16} /> Contatar no WhatsApp
                   </a>
                 ) : (
                   <div className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm border ${isDark ? 'bg-slate-800 text-slate-500 border-slate-700/50' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>
                     <Phone size={16} /> Sem contato cadastrado
                   </div>
                 )}
               </>
             )}
          </div>
        ))}
        {lostRecords.length === 0 && (
          <div className={`flex flex-col items-center justify-center p-10 rounded-3xl border border-dashed mt-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#EFECE6] border-stone-300'}`}>
            <p className="text-center text-slate-500 text-sm font-medium">Nenhum cliente pendente encontrado para este período.</p>
          </div>
        )}
      </div>

      <AlertDialog 
        isOpen={isAlertOpen}
        title="Atenção"
        message={alertType || "Ação processada."}
        onClose={() => setIsAlertOpen(false)}
      />

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
    </div>
  );
}
