import React, { useState, useEffect, useMemo } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'motion/react';
import { useAppStore } from '../data/store';
import { DashboardMetricsUseCase } from '../domain/dashboard/DashboardMetricsUseCase';
import { ChevronLeft, ChevronRight, Calendar, UserPlus, ChevronDown, Plus, AlertCircle, Search, X } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog } from '../components/AlertDialog';
import { sanitizeInput, parseCurrency } from '../lib/utils';
import { ProductSelector } from '../components/ProductSelector';
import { calculatePointsFromProductId } from '../lib/lensPoints';
import { findMatchingConsultant } from '../lib/consultantUtils';

export default function CRMMainScreen() {
  const { 
    records, 
    dailyQueues, 
    selectedDate, 
    changeSelectedDate, 
    processSwipeUp,
    consultants,
    setIsQueueManagerOpen,
    theme,
    suggestedConsultantNames,
    addConsultant,
    toggleConsultantInQueue,
    hiddenDashboards,
    goalTiers,
    consultantGoals,
    storeGoal,
    activeMetric,
    setActiveMetric
  } = useAppStore();

  const [vendaSim, setVendaSim] = useState<boolean | null>(() => {
    const draft = localStorage.getItem('crm_draft_vendaSim');
    return draft ? JSON.parse(draft) : null;
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form inputs
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('crm_draft_customerName') || '');
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('crm_draft_customerPhone') || '');
  const [origem, setOrigem] = useState(() => localStorage.getItem('crm_draft_origem') || '');
  const [lenteTipo, setLenteTipo] = useState(() => localStorage.getItem('crm_draft_lenteTipo') || '');
  const [linhaTipo, setLinhaTipo] = useState(() => localStorage.getItem('crm_draft_linhaTipo') || '');
  const [lentePers, setLentePers] = useState(() => localStorage.getItem('crm_draft_lentePers') || '');
  const [linhaPrime, setLinhaPrime] = useState(() => localStorage.getItem('crm_draft_linhaPrime') || '');
  const [outrosValue, setOutrosValue] = useState(() => localStorage.getItem('crm_draft_outrosValue') || '');
  const [observacoes, setObservacoes] = useState(() => localStorage.getItem('crm_draft_obs') || '');
  const [value, setValue] = useState(() => localStorage.getItem('crm_draft_value') || '');

  const currentQueue = dailyQueues[selectedDate] || {
    logicalDate: selectedDate,
    activeConsultantIds: Object.keys(consultants),
    currentTurnConsultantId: Object.keys(consultants)[0] || null,
    roundRobinIndex: 0
  };
  const currentConsultantId = currentQueue.currentTurnConsultantId;
  
  const [manualConsultantId, setManualConsultantId] = useState<string | null>(() => localStorage.getItem('crm_draft_manualConsultantId') || null);
  const [forceNone, setForceNone] = useState<boolean>(() => {
    const draft = localStorage.getItem('crm_draft_forceNone');
    return draft ? JSON.parse(draft) : false;
  });
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });
  const [confirmSaveInfo, setConfirmSaveInfo] = useState<{
    isOpen: boolean;
    consultantId: string;
    isVenda: boolean;
    consultantName: string;
  } | null>(null);
  const [isConsultantModalOpen, setIsConsultantModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newConsultantQuickName, setNewConsultantQuickName] = useState('');
  const [quickSearchTerm, setQuickSearchTerm] = useState('');

  const dayRecords = useMemo(() => {
    return Object.values(records || {}).filter((r) => {
      const rDate = r.logicalDate || (r.createdAt ? r.createdAt.split('T')[0] : '');
      return rDate === selectedDate;
    });
  }, [records, selectedDate]);

  const dayRecordsFiltered = useMemo(() => {
    if (!quickSearchTerm.trim()) return dayRecords;
    const term = quickSearchTerm.toLowerCase().trim();
    return dayRecords.filter((r) => {
      const custName = (r.customerName || '').toLowerCase();
      const prodName = (r.productId || '').toLowerCase();
      const consName = (r.consultantName || '').toLowerCase();
      return custName.includes(term) || prodName.includes(term) || consName.includes(term);
    });
  }, [dayRecords, quickSearchTerm]);
  const [fuzzyMatchPrompt, setFuzzyMatchPrompt] = useState<{
    isOpen: boolean;
    inputName: string;
    matchName: string;
    matchId: string;
  } | null>(null);

  const activeConsultantId = forceNone ? null : (manualConsultantId || currentConsultantId);
  const activeConsultant = activeConsultantId ? consultants[activeConsultantId] : null;

  useEffect(() => { localStorage.setItem('crm_draft_vendaSim', JSON.stringify(vendaSim)); }, [vendaSim]);
  useEffect(() => { localStorage.setItem('crm_draft_customerName', customerName); }, [customerName]);
  useEffect(() => { localStorage.setItem('crm_draft_customerPhone', customerPhone); }, [customerPhone]);
  useEffect(() => { localStorage.setItem('crm_draft_origem', origem); }, [origem]);
  useEffect(() => { localStorage.setItem('crm_draft_lenteTipo', lenteTipo); }, [lenteTipo]);
  useEffect(() => { localStorage.setItem('crm_draft_linhaTipo', linhaTipo); }, [linhaTipo]);
  useEffect(() => { localStorage.setItem('crm_draft_lentePers', lentePers); }, [lentePers]);
  useEffect(() => { localStorage.setItem('crm_draft_linhaPrime', linhaPrime); }, [linhaPrime]);
  useEffect(() => { localStorage.setItem('crm_draft_outrosValue', outrosValue); }, [outrosValue]);
  useEffect(() => { localStorage.setItem('crm_draft_obs', observacoes); }, [observacoes]);
  useEffect(() => { localStorage.setItem('crm_draft_value', value); }, [value]);
  useEffect(() => { localStorage.setItem('crm_draft_manualConsultantId', manualConsultantId || ''); }, [manualConsultantId]);
  useEffect(() => { localStorage.setItem('crm_draft_forceNone', JSON.stringify(forceNone)); }, [forceNone]);

  const isDark = theme === 'dark';

  const x = useMotionValue(0);
  const centerColor = 'var(--bg-card, #1E293B)';
  const background = useTransform(
    x,
    [-150, 0, 150],
    ['rgba(239, 68, 68, 0.15)', centerColor, 'rgba(37, 99, 235, 0.15)']
  );

  const handleSave = () => {
    if (vendaSim === null) {
      setAlertInfo({ isOpen: true, title: 'Atenção', message: 'Escolha primeiro se é Venda ou Orçamento antes de gravar!' });
      resetCard();
      return;
    }
    if (!activeConsultantId) {
      setIsConsultantModalOpen(true);
      snapBack();
      return;
    }
    
    setConfirmSaveInfo({
      isOpen: true,
      consultantId: activeConsultantId,
      isVenda: vendaSim,
      consultantName: activeConsultant?.name || 'Consultor'
    });
  };

  const executeSave = (consultantIdToSave: string, isVendaOverride?: boolean) => {
    const isVenda = isVendaOverride !== undefined ? isVendaOverride : vendaSim;
    const parsedValue = parseCurrency(value);
    const consultantObj = consultants[consultantIdToSave];
    
    let finalProductId = "Produto Geral";

    if (lenteTipo === 'Outros') {
      finalProductId = outrosValue.trim() || 'Outros';
    } else if (lenteTipo) {
      const produtoCombinado = [
        lenteTipo,
        linhaTipo,
        lentePers && linhaTipo === 'Personalizada' ? lentePers : "",
        linhaPrime && linhaTipo === 'Prime' ? linhaPrime : ""
      ].filter(Boolean).join(" | ");
      if (produtoCombinado) finalProductId = produtoCombinado;
    }
    
    const obsFormatada = observacoes.trim() ? ` (Obs: ${observacoes.trim()})` : "";
    finalProductId = `${finalProductId}${obsFormatada}`;

    const points = isVenda ? calculatePointsFromProductId(finalProductId) : 0;

    processSwipeUp({
      logicalDate: selectedDate,
      consultantId: consultantIdToSave,
      consultantName: consultantObj ? sanitizeInput(consultantObj.name) : 'Desconhecido',
      customerName: sanitizeInput(customerName) || 'Cliente Padrão',
      customerPhone: sanitizeInput(customerPhone),
      origem: sanitizeInput(origem) || 'Não especificado',
      productId: sanitizeInput(finalProductId),
      status: isVenda ? 'WON' : 'LOST',
      points,
      ...(isVenda ? { closedValue: parsedValue } : { budgetValue: parsedValue })
    });
    
    resetCard();
  };

  const onSelectConsultantFromModal = (id: string) => {
    setIsConsultantModalOpen(false);
    const selectedConsultant = consultants[id];
    setConfirmSaveInfo({
      isOpen: true,
      consultantId: id,
      isVenda: !!vendaSim,
      consultantName: selectedConsultant?.name || 'Consultor'
    });
  };

  const handleQuickAdd = () => {
    if (newConsultantQuickName.trim()) {
      const name = newConsultantQuickName.trim();
      const { match } = findMatchingConsultant(name, consultants);
      
      if (match) {
        setFuzzyMatchPrompt({
          isOpen: true,
          inputName: name,
          matchName: match.name,
          matchId: match.id
        });
        return;
      }

      confirmAddNewConsultant(name);
    }
  };

  const confirmAddNewConsultant = (name: string) => {
    addConsultant(name);
    setNewConsultantQuickName('');
    setTimeout(() => {
      const state = useAppStore.getState();
      const added = Object.values(state.consultants).find(c => c.name.toLowerCase() === name.toLowerCase());
      if (added) {
        setManualConsultantId(added.id);
        setForceNone(false);
      }
    }, 50);
  };

  const handleClear = () => {
    resetCard();
  };

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 80) {
      handleSave();
    } else if (info.offset.x < -80) {
      handleClear();
    } else {
      snapBack();
    }
  };

  const snapBack = () => {
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
  };

  const resetCard = () => {
    snapBack();
    setVendaSim(null);
    setCustomerName('');
    setCustomerPhone('');
    setOrigem('');
    setLenteTipo('');
    setLinhaTipo('');
    setLentePers('');
    setLinhaPrime('');
    setOutrosValue('');
    setObservacoes('');
    setValue('');
    setManualConsultantId(null);
    setForceNone(false);
    setShowAdvanced(false);
    
    localStorage.removeItem('crm_draft_vendaSim');
    localStorage.removeItem('crm_draft_customerName');
    localStorage.removeItem('crm_draft_customerPhone');
    localStorage.removeItem('crm_draft_origem');
    localStorage.removeItem('crm_draft_lenteTipo');
    localStorage.removeItem('crm_draft_linhaTipo');
    localStorage.removeItem('crm_draft_lentePers');
    localStorage.removeItem('crm_draft_linhaPrime');
    localStorage.removeItem('crm_draft_outrosValue');
    localStorage.removeItem('crm_draft_obs');
    localStorage.removeItem('crm_draft_value');
    localStorage.removeItem('crm_draft_manualConsultantId');
    localStorage.removeItem('crm_draft_forceNone');
  };

  const handlePrevDay = () => {
    const prev = subDays(new Date(selectedDate + 'T00:00:00'), 1);
    changeSelectedDate(format(prev, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const next = addDays(new Date(selectedDate + 'T00:00:00'), 1);
    changeSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  const inputClass = "w-full bg-input border border-borderApp text-txtPrimary placeholder:text-txtMuted p-3 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all";

  const selectClass = "w-full bg-input border border-borderApp text-txtPrimary p-3 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer";

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-[560px] mx-auto transition-colors duration-200 text-txtPrimary">
      {/* Cabeçalho Padronizado */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-txtPrimary">Atendimento</h1>
          <p className="text-xs font-normal mt-0.5 text-txtSecondary">Gerencie a vez dos consultores e registre vendas.</p>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO TEMPORAL CENTRAL */}
      <div className="flex flex-col items-center mb-6 relative">
        <div className="flex items-center justify-between w-full max-w-[380px] rounded-2xl p-1.5 border border-borderApp shadow-sm bg-card">
          <button onClick={handlePrevDay} className="p-2 rounded-xl transition-colors cursor-pointer text-txtSecondary hover:text-txtPrimary hover:bg-hover" aria-label="Dia anterior">
            <ChevronLeft size={20} />
          </button>
          
          <div className="relative flex items-center justify-center cursor-pointer px-4">
            <Calendar size={18} className="text-blue-500 mr-2 shrink-0" />
            <span className="text-sm font-semibold tracking-wide capitalize select-none text-txtPrimary">
              {format(new Date(selectedDate + 'T00:00:00'), "dd 'de' MMM", { locale: ptBR })}
            </span>
            <input 
              type="date" 
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) changeSelectedDate(e.target.value);
              }}
            />
          </div>

          <button onClick={handleNextDay} className="p-2 rounded-xl transition-colors cursor-pointer text-txtSecondary hover:text-txtPrimary hover:bg-hover" aria-label="Próximo dia">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* 3. FICHA CRM ACORDEON COM MOTOR DE GESTOS */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, backgroundColor: background }}
        className={`rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-visible border border-borderApp flex flex-col justify-between transition-all duration-300 bg-card text-txtPrimary ${vendaSim === null ? 'min-h-[200px]' : 'min-h-[580px]'}`}
      >
        <div className="flex items-center justify-between mb-4 relative z-50">
          <h1 className="text-xl font-bold tracking-tight text-txtPrimary">Lançar Atendimento</h1>
          <div className="relative">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIsDropdownOpen(!isDropdownOpen);
              }}
              onDoubleClick={() => setIsDropdownOpen(false)}
              className={`px-4 py-2 rounded-full border transition-all cursor-pointer flex items-center justify-center ${activeConsultantId ? 'btn-theme-blue' : 'btn-theme-amber'}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide">
                {activeConsultant ? activeConsultant.name.toUpperCase() : 'VEZ DE NINGUÉM'}
              </span>
            </button>

            {/* Dropdown Flutuante */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onDoubleClick={() => setIsDropdownOpen(false)}
                  className="absolute right-0 mt-2 z-[60] border border-borderApp rounded-2xl p-4 w-68 shadow-xl flex flex-col gap-3 bg-card text-txtPrimary"
                >
                  {/* Seção: Cadastrar Novo */}
                  <div className="border-b border-borderApp pb-3">
                    <p className="text-sm font-semibold tracking-wide uppercase mb-2 text-txtSecondary">Cadastrar Novo</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome do consultor..."
                        value={newConsultantQuickName}
                        onChange={(e) => setNewConsultantQuickName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAdd();
                          }
                        }}
                        className="border border-borderApp rounded-xl h-10 px-3 text-sm font-medium outline-none flex-1 bg-input text-txtPrimary placeholder:text-txtMuted focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleQuickAdd(); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Lista de Consultores */}
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                    <p className="text-sm font-semibold tracking-wide uppercase mb-1 text-txtSecondary">Selecionar da Lista</p>
                    {Object.values(consultants).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setManualConsultantId(c.id);
                          setForceNone(false);
                          setIsDropdownOpen(false);
                        }}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${manualConsultantId === c.id ? 'bg-blue-600 text-white' : 'hover:bg-hover text-txtPrimary'}`}
                      >
                        <span>{c.name}</span>
                        {currentConsultantId === c.id && <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-400 font-bold">Vez</span>}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setForceNone(true);
                        setManualConsultantId(null);
                        setIsDropdownOpen(false);
                      }}
                      className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors mt-1 ${forceNone ? 'bg-amber-600 text-white' : 'text-amber-500 hover:bg-hover'}`}
                    >
                      ⚠️ Vez de Ninguém (Sem Consultor)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Pergunta Inicial: Venda x Orçamento */}
        <div className="my-2">
          <label className="text-xs font-semibold uppercase tracking-wider block mb-2 text-txtSecondary">O atendimento resultou em:</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVendaSim(true)}
              className={`py-3.5 px-4 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                vendaSim === true 
                  ? 'btn-type-venda-active' 
                  : 'btn-type-inactive'
              }`}
            >
              <span>Venda</span>
            </button>
            <button
              type="button"
              onClick={() => setVendaSim(false)}
              className={`py-3.5 px-4 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                vendaSim === false 
                  ? 'btn-type-orcamento-active' 
                  : 'btn-type-inactive'
              }`}
            >
              <span>Orçamento</span>
            </button>
          </div>
        </div>

        {/* Formulario que se expande quando VendaSim não é null */}
        <AnimatePresence>
          {vendaSim !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-3 border-t border-borderApp overflow-hidden"
            >
              {/* Nome & Telefone do Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-txtSecondary">Nome do Cliente</label>
                  <input
                    type="text"
                    placeholder="Ex: Maria Silva"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-txtSecondary">WhatsApp / Telefone</label>
                  <input
                    type="tel"
                    placeholder="Ex: (11) 99999-9999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Valor R$ */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-txtSecondary">
                  {vendaSim ? 'Valor Fechado (R$)' : 'Valor Orçado (R$)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Seletor de Produto / Lente */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-txtSecondary">Especificação do Produto</label>
                <ProductSelector
                  lenteTipo={lenteTipo}
                  setLenteTipo={setLenteTipo}
                  linhaTipo={linhaTipo}
                  setLinhaTipo={setLinhaTipo}
                  lentePers={lentePers}
                  setLentePers={setLentePers}
                  linhaPrime={linhaPrime}
                  setLinhaPrime={setLinhaPrime}
                  outrosValue={outrosValue}
                  setOutrosValue={setOutrosValue}
                />
              </div>

              {/* Opções Avançadas (Origem & Obs) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-bold underline flex items-center gap-1 cursor-pointer text-txtSecondary hover:text-txtPrimary"
                >
                  {showAdvanced ? 'Recolher Observações / Origem' : '+ Adicionar Origem / Observações'}
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 mt-3 pt-2"
                    >
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-txtSecondary">Origem do Cliente</label>
                        <select
                          value={origem}
                          onChange={(e) => setOrigem(e.target.value)}
                          className={selectClass}
                        >
                          <option value="">Selecione a Origem...</option>
                          <option value="Passante / Fachada">Passante / Fachada</option>
                          <option value="WhatsApp / Redes Sociais">WhatsApp / Redes Sociais</option>
                          <option value="Indicação">Indicação</option>
                          <option value="Mala Direta / Campanha">Mala Direta / Campanha</option>
                          <option value="Retorno de Exame">Retorno de Exame</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-txtSecondary">Observações Internas</label>
                        <textarea
                          placeholder="Detalhes adicionais..."
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          rows={2}
                          className={inputClass + ' h-auto py-2.5 resize-none'}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Ações Inferiores */}
              <div className="mt-5 pt-4 border-t border-borderApp flex justify-between items-center z-10">
                <button 
                  onClick={handleClear} 
                  className="py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl border border-rose-500/20 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  ◀ Limpar
                </button>
                
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-semibold tracking-wider uppercase pointer-events-none text-txtMuted">Deslize</span>
                  <span className="text-xs font-medium pointer-events-none text-txtSecondary">◀ Limpar / Salvar ▶</span>
                </div>

                <button 
                  onClick={handleSave} 
                  className="py-3 px-5 btn-type-venda-active rounded-2xl text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  Salvar ▶
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 4. BUSCA RÁPIDA E LISTA DE ATENDIMENTOS DO DIA EM TEMPO REAL */}
      <div className="mt-8 pt-6 border-t border-borderApp">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-txtPrimary uppercase tracking-wider flex items-center gap-2">
            <span>Atendimentos do Dia</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-input text-txtSecondary border border-borderApp">
              {dayRecordsFiltered.length}
            </span>
          </h2>
          {quickSearchTerm && (
            <button
              type="button"
              onClick={() => setQuickSearchTerm('')}
              className="text-xs font-semibold text-blue-500 hover:underline cursor-pointer"
            >
              Limpar busca
            </button>
          )}
        </div>

        {/* Campo de Busca Rápida por Nome do Cliente */}
        <div className="relative w-full mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-txtSecondary pointer-events-none z-10" />
          <input
            type="text"
            value={quickSearchTerm}
            onChange={(e) => setQuickSearchTerm(e.target.value)}
            placeholder="Buscar atendimento por nome do cliente..."
            className="w-full bg-input text-txtPrimary border border-borderApp rounded-2xl py-3.5 !pl-12 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-txtSecondary/60 shadow-xs"
          />
          {quickSearchTerm && (
            <button
              type="button"
              onClick={() => setQuickSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-txtSecondary hover:text-txtPrimary rounded-lg hover:bg-hover transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Lista de Atendimentos Filtrada em Tempo Real */}
        {dayRecordsFiltered.length > 0 ? (
          <div className="space-y-3">
            {dayRecordsFiltered.map((record) => {
              const isWon = record.status === 'WON';
              const recordVal = isWon ? record.closedValue : record.budgetValue;
              return (
                <div
                  key={record.id}
                  className="p-4 rounded-2xl border border-borderApp bg-card flex flex-col gap-2 hover:border-blue-500/40 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-txtPrimary">{record.customerName || 'Cliente Padrão'}</h3>
                      {record.customerPhone && (
                        <p className="text-xs text-txtSecondary">{record.customerPhone}</p>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                      isWon
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {isWon ? 'Venda' : 'Orçamento'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-txtSecondary pt-2 border-t border-borderApp/50 gap-2">
                    <span className="font-medium">
                      Consultor: <strong className="text-txtPrimary">{record.consultantName || 'Desconhecido'}</strong>
                    </span>
                    {recordVal !== undefined && recordVal > 0 && (
                      <span className="font-bold text-txtPrimary">
                        R$ {recordVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  {record.productId && (
                    <p className="text-xs text-txtMuted truncate">
                      {record.productId}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-borderApp rounded-2xl bg-card/50">
            <p className="text-xs text-txtSecondary font-medium">
              {quickSearchTerm
                ? `Nenhum atendimento encontrado para "${quickSearchTerm}".`
                : 'Nenhum atendimento registrado nesta data.'}
            </p>
          </div>
        )}
      </div>

      <AlertDialog 
        isOpen={alertInfo.isOpen}
        title={alertInfo.title}
        message={alertInfo.message}
        onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })}
      />

      {/* Confirmation for Similar Consultant Match */}
      <AnimatePresence>
        {fuzzyMatchPrompt && fuzzyMatchPrompt.isOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDoubleClick={() => setFuzzyMatchPrompt(null)}
              onClick={() => setFuzzyMatchPrompt(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onDoubleClick={() => setFuzzyMatchPrompt(null)}
              className="relative border border-borderApp rounded-2xl p-6 w-full max-w-sm shadow-2xl overflow-hidden text-center bg-card text-txtPrimary"
            >
              <div className="flex flex-col items-center">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full mb-3 border border-amber-500/20">
                  <AlertCircle size={28} />
                </div>
                <h2 className="text-lg font-bold mb-1">Consultor Semelhante Encontrado</h2>
                <p className="text-xs mb-5 text-txtSecondary">
                  Você digitou <strong className="text-blue-500">"{fuzzyMatchPrompt.inputName}"</strong>, mas já existe o consultor oficial <strong className="text-emerald-500">"{fuzzyMatchPrompt.matchName}"</strong>.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualConsultantId(fuzzyMatchPrompt.matchId);
                    setForceNone(false);
                    setFuzzyMatchPrompt(null);
                    setNewConsultantQuickName('');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Usar Consultor Oficial ({fuzzyMatchPrompt.matchName})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = fuzzyMatchPrompt.inputName;
                    setFuzzyMatchPrompt(null);
                    confirmAddNewConsultant(name);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs border border-borderApp text-txtSecondary hover:bg-hover transition-colors cursor-pointer"
                >
                  Cadastrar como Novo Consultor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Balão de Confirmação para Salvar Venda ou Orçamento */}
      <AnimatePresence>
        {confirmSaveInfo && confirmSaveInfo.isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDoubleClick={() => {
                setConfirmSaveInfo(null);
                snapBack();
              }}
              onClick={() => {
                setConfirmSaveInfo(null);
                snapBack();
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onDoubleClick={() => {
                setConfirmSaveInfo(null);
                snapBack();
              }}
              className="relative border border-borderApp rounded-2xl p-6 w-full max-w-sm shadow-2xl overflow-hidden text-center bg-card text-txtPrimary"
            >
              <div className="flex flex-col items-center">
                <div className={`p-4 rounded-full mb-4 ${confirmSaveInfo.isVenda ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {confirmSaveInfo.isVenda ? (
                    <span className="text-2xl font-bold">R$</span>
                  ) : (
                    <span className="text-2xl font-bold">📝</span>
                  )}
                </div>
                
                <h1 className="text-xl font-bold mb-1.5 tracking-tight text-txtPrimary">
                  Confirmar Registro
                </h1>
                
                <p className="text-sm mb-6 px-2 leading-relaxed font-medium text-txtSecondary">
                  Salvar {confirmSaveInfo.isVenda ? 'esta venda' : 'este orçamento'} para <span className="text-blue-500 font-semibold">{confirmSaveInfo.consultantName}</span>?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setConfirmSaveInfo(null);
                    snapBack();
                  }}
                  className="flex-1 h-12 px-4 rounded-2xl font-bold text-sm btn-type-inactive cursor-pointer"
                >
                  Não
                </button>
                <button
                  onClick={() => {
                    executeSave(confirmSaveInfo.consultantId, confirmSaveInfo.isVenda);
                    setConfirmSaveInfo(null);
                  }}
                  className={`flex-1 h-12 px-4 rounded-2xl font-bold text-sm transition-all shadow-xs cursor-pointer ${
                    confirmSaveInfo.isVenda 
                      ? 'btn-type-venda-active' 
                      : 'btn-type-orcamento-active'
                  }`}
                >
                  Sim
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Seleção de Consultor (Vez de Ninguém) */}
      <AnimatePresence>
        {isConsultantModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDoubleClick={() => setIsConsultantModalOpen(false)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onDoubleClick={() => setIsConsultantModalOpen(false)}
              className="border border-borderApp rounded-2xl p-6 w-full max-w-sm shadow-2xl bg-card text-txtPrimary"
            >
              <h1 className="text-xl font-bold mb-1.5 text-txtPrimary">Quem realizou o atendimento?</h1>
              <p className="text-sm mb-5 text-txtSecondary">
                A venda estava como "Vez de Ninguém". Selecione o consultor correto para salvar os dados preenchidos.
              </p>
              
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1 mb-4">
                {Object.values(consultants).map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSelectConsultantFromModal(c.id)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-borderApp bg-input hover:bg-hover transition-all text-left cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold truncate text-txtPrimary">{c.name}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setIsConsultantModalOpen(false)}
                className="w-full h-12 rounded-2xl font-semibold text-sm transition-colors cursor-pointer text-txtSecondary bg-input hover:bg-hover border border-borderApp"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
