import React, { useState } from 'react';
import { useAppStore } from '../data/store';
import { 
  Users, 
  Target, 
  Palette, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Settings2, 
  Fingerprint, 
  TrendingUp, 
  Sliders, 
  Award, 
  Star, 
  HelpCircle,
  UserPlus,
  Store
} from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog } from '../components/AlertDialog';
import { sanitizeInput } from '../lib/utils';

// Custom absolute-positioned Tooltip component
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1.5 z-30">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
        className="p-0.5 text-txtMuted hover:text-txtPrimary rounded-full transition-colors focus:outline-none cursor-help"
      >
        <HelpCircle size={13} />
      </button>
      {show && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 text-[10px] p-2.5 rounded-xl border shadow-2xl leading-normal text-center font-semibold pointer-events-none z-50 bg-card text-txtPrimary border-borderApp">
          {text}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-borderApp" />
        </div>
      )}
    </div>
  );
}

// Collapsible Section Container
function CollapsibleSection({ 
  title, 
  subtitle,
  icon: Icon, 
  isOpen, 
  onToggle, 
  children,
  tooltipText,
  iconColorClass = "bg-blue-500/10 border-blue-500/20 text-blue-500"
}: { 
  title: string; 
  subtitle?: string;
  icon: any; 
  isOpen: boolean; 
  onToggle: () => void; 
  children: React.ReactNode;
  tooltipText?: string;
  iconColorClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-borderApp shadow-xs transition-all duration-200 relative overflow-visible bg-card">
      <button 
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3.5 transition-colors text-left select-none outline-none cursor-pointer bg-input text-txtPrimary border border-borderApp hover:bg-hover ${
          isOpen ? 'rounded-t-2xl border-b border-borderApp' : 'rounded-2xl'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${iconColorClass} flex items-center justify-center shrink-0`}>
            <Icon size={14} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1 text-txtPrimary">
              {title}
              {tooltipText && <Tooltip text={tooltipText} />}
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
        <div className="p-4 rounded-b-2xl transition-colors bg-card border-x border-b border-borderApp">
          {children}
        </div>
      )}
    </div>
  );
}

export default function SettingsScreen() {
  const { 
    currentProjectId, 
    setCurrentProjectId, 
    userId,
    consultants,
    addConsultant,
    removeConsultant,
    updateConsultant,
    dailyQueues,
    selectedDate,
    toggleConsultantInQueue,
    reorderConsultants,
    storeGoal,
    setStoreGoal,
    workDays,
    setWorkDays,
    consultantGoals,
    setConsultantGoal,
    goalTiers,
    updateGoalTiers,
    hiddenDashboards,
    toggleDashboardVisibility,
    activeMetric,
    setActiveMetric,
    lensPointsRules,
    updateLensPointsRules,
    weeklyVault,
    updateWeeklyVault,
    outrosProducts,
    addOutrosProduct,
    removeOutrosProduct,
    storeAccessName,
    setStoreAccessName
  } = useAppStore();

  const [isCopied, setIsCopied] = useState(false);
  const [showUserId, setShowUserId] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});
  
  // Workspaces state
  const [workspaces, setWorkspaces] = useState<Array<{id: string; name: string; projectId: string}>>(() => {
    try {
      return JSON.parse(localStorage.getItem('listadevez_workspaces') || '[]');
    } catch {
      return [];
    }
  });

  const saveWorkspaces = (newWorkspaces: Array<{id: string; name: string; projectId: string}>) => {
    setWorkspaces(newWorkspaces);
    localStorage.setItem('listadevez_workspaces', JSON.stringify(newWorkspaces));
  };

  const handleAddWorkspace = () => {
    saveWorkspaces([...workspaces, { id: String(Date.now()), name: '', projectId: '' }]);
  };

  const handleUpdateWorkspace = (id: string, field: 'name' | 'projectId', value: string) => {
    const updated = workspaces.map(w => w.id === id ? { ...w, [field]: value } : w);
    saveWorkspaces(updated);
  };

  const handleRemoveWorkspace = (id: string) => {
    const updated = workspaces.filter(w => w.id !== id);
    saveWorkspaces(updated);
  };

  const handleSelectWorkspace = (workspace: {name: string, projectId: string}) => {
    setCurrentProjectId(workspace.projectId);
    setAlertInfo({ isOpen: true, message: `Você mudou para o projeto: ${workspace.name || 'Sem nome'}` });
  };

  // Local state for adding a new consultant
  const [newConsultantName, setNewConsultantName] = useState('');
  const [showAllConsultantGoals, setShowAllConsultantGoals] = useState(false);
  const [newOutrosProduct, setNewOutrosProduct] = useState('');

  // Accordion Menu Open States
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    consultants: true,
    outros: false,
    goalsCalc: false,
    goals: false,
    tiers: false,
    metric: false,
    dashboards: false,
    gamification: false,
    connection: false
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach(k => {
        next[k] = k === key ? !prev[k] : false;
      });
      return next;
    });
  };

  const copyToClipboard = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Queue and Consultant Order
  const targetDate = selectedDate || format(new Date(), 'yyyy-MM-dd');
  const activeIds = dailyQueues[targetDate]?.activeConsultantIds || [];
  const turnConsultantId = activeIds[0];

  const handleMoveConsultantInQueue = (id: string, direction: 'up' | 'down') => {
    const idx = activeIds.indexOf(id);
    if (idx === -1) return;
    const newOrder = [...activeIds];
    if (direction === 'up' && idx > 0) {
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    } else if (direction === 'down' && idx < newOrder.length - 1) {
      [newOrder[idx + 1], newOrder[idx]] = [newOrder[idx], newOrder[idx + 1]];
    }
    reorderConsultants(targetDate, newOrder);
  };

  const handleAddConsultantConfig = () => {
    if (!newConsultantName.trim()) return;
    addConsultant(sanitizeInput(newConsultantName.trim()));
    setNewConsultantName('');
  };

  const handleRemoveConsultant = (id: string) => {
    if (window.confirm("Deseja mesmo remover este vendedor?")) {
      removeConsultant(id);
    }
  };

  const handleAddOutrosProduct = () => {
    if (!newOutrosProduct.trim()) return;
    addOutrosProduct(sanitizeInput(newOutrosProduct.trim()));
    setNewOutrosProduct('');
  };

  // Goal Tiers Management
  const handleUpdateTierName = (tierId: string, newName: string) => {
    const updated = goalTiers.map(t => t.id === tierId ? { ...t, name: newName } : t);
    updateGoalTiers(updated);
  };

  const handleUpdateTierValue = (tierId: string, newValue: number) => {
    const updated = goalTiers.map(t => t.id === tierId ? { ...t, value: newValue } : t);
    updateGoalTiers(updated);
  };

  const handleAddGoalTier = () => {
    const nextId = String(Date.now());
    const nextNum = goalTiers.length + 1;
    const newTier = {
      id: nextId,
      name: `Meta ${nextNum}`,
      value: 100 + (nextNum * 10)
    };
    updateGoalTiers([...goalTiers, newTier]);
  };

  const handleRemoveGoalTier = (tierId: string) => {
    const updated = goalTiers.filter(t => t.id !== tierId);
    updateGoalTiers(updated);
  };

  const consultantList = Object.values(consultants).sort((a, b) => a.name.localeCompare(b.name));
  const visibleConsultants = showAllConsultantGoals ? consultantList : consultantList.slice(0, 3);
  const hiddenCount = consultantList.length > 3 ? consultantList.length - 3 : 0;

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto pb-32 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
          <Settings2 className="text-blue-500" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-txtPrimary">Configurações</h1>
          <p className="text-sm font-semibold text-txtSecondary">Ajustes gerais, equipe, metas e acessos.</p>
        </div>
      </div>

      {/* =========================================================================
          CATEGORIA 1: 👥 EQUIPE E VENDAS
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-txtSecondary">
          <Users size={16} className="text-blue-500" />
          <span>1. Equipe e Vendas</span>
        </div>

        {/* Gerenciar Consultores */}
        <CollapsibleSection
          title="Gerenciar Consultores"
          subtitle="Fila de atendimento, vez, reordenação e disponibilidade"
          icon={Users}
          isOpen={openSections.consultants}
          onToggle={() => toggleSection('consultants')}
          iconColorClass="bg-blue-500/10 border-blue-500/20 text-blue-500"
        >
          <div className="space-y-4">
            {/* Input Cadastro Rápido */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newConsultantName}
                onChange={(e) => setNewConsultantName(e.target.value)}
                placeholder="Nome do Consultor"
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none transition-colors border border-borderApp bg-input text-txtPrimary placeholder:text-txtMuted focus:border-blue-500 shadow-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddConsultantConfig();
                }}
              />
              <button
                type="button"
                onClick={handleAddConsultantConfig}
                className="btn-type-venda-active font-bold py-2 px-4 rounded-xl text-sm transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>

            {/* Lista de Consultores com Status, Vez e Reordenação */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {consultantList.map((consultant) => {
                const isActive = activeIds.includes(consultant.id);
                const isTurn = consultant.id === turnConsultantId;
                const activeIndex = activeIds.indexOf(consultant.id);

                return (
                  <div 
                    key={consultant.id} 
                    className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                      isTurn
                        ? 'border-amber-500/40 bg-amber-500/5 shadow-xs'
                        : 'border-borderApp bg-input text-txtPrimary'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isTurn && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase tracking-wide shrink-0">
                            DA VEZ
                          </span>
                        )}
                        <input
                          type="text"
                          value={consultant.name}
                          onChange={(e) => updateConsultant(consultant.id, sanitizeInput(e.target.value))}
                          className="bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm font-bold py-0.5 px-1 flex-1 text-txtPrimary"
                        />
                      </div>

                      {/* Botão de Status Disponível / Ausente */}
                      <button
                        type="button"
                        onClick={() => toggleConsultantInQueue(consultant.id, targetDate, !isActive)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                          isActive 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        {isActive ? 'Disponível' : 'Ausente'}
                      </button>

                      <button
                        onClick={() => handleRemoveConsultant(consultant.id)}
                        className="p-1.5 text-txtMuted hover:text-red-500 hover:bg-hover rounded-lg transition-colors shrink-0 cursor-pointer"
                        title="Excluir Consultor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Botões de Reordenação ▲ / ▼ se ativo na fila */}
                    {isActive && (
                      <div className="flex items-center justify-between text-xs text-txtSecondary pt-1 border-t border-borderApp/50">
                        <span className="font-semibold text-[11px]">
                          Posição na Fila: #{activeIndex + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveConsultantInQueue(consultant.id, 'up')}
                            disabled={activeIndex === 0}
                            className="p-1 rounded bg-card border border-borderApp hover:bg-hover disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-txtPrimary"
                            title="Subir na Fila"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveConsultantInQueue(consultant.id, 'down')}
                            disabled={activeIndex === activeIds.length - 1}
                            className="p-1 rounded bg-card border border-borderApp hover:bg-hover disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-txtPrimary"
                            title="Descer na Fila"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {consultantList.length === 0 && (
                <p className="text-sm italic py-2 text-center text-txtMuted">
                  Nenhum consultor cadastrado.
                </p>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Produtos Adicionais / Atalhos */}
        <CollapsibleSection
          title="Produtos Adicionais / Atalhos"
          subtitle="Lista de atalhos para a categoria 'Outros'"
          icon={Plus}
          isOpen={openSections.outros}
          onToggle={() => toggleSection('outros')}
          iconColorClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newOutrosProduct}
                onChange={(e) => setNewOutrosProduct(e.target.value)}
                placeholder="Ex: Armação Solar"
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none transition-colors border border-borderApp bg-input text-txtPrimary placeholder:text-txtMuted focus:border-emerald-500 shadow-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddOutrosProduct();
                }}
              />
              <button
                type="button"
                onClick={handleAddOutrosProduct}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {outrosProducts?.map((product) => (
                <div 
                  key={product} 
                  className="flex items-center justify-between p-3 rounded-xl border border-borderApp bg-input text-txtPrimary shadow-xs transition-colors"
                >
                  <span className="text-sm font-bold py-0.5 px-1 flex-1 mr-2 text-txtPrimary">{product}</span>
                  <button
                    onClick={() => removeOutrosProduct(product)}
                    className="p-1.5 text-txtMuted hover:text-red-500 hover:bg-hover rounded-lg transition-colors shrink-0 cursor-pointer"
                    title="Excluir Produto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {(!outrosProducts || outrosProducts.length === 0) && (
                <p className="text-sm italic py-2 text-center text-txtMuted">
                  Nenhum produto cadastrado.
                </p>
              )}
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* =========================================================================
          CATEGORIA 2: 🎯 METAS E INDICADORES
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-txtSecondary">
          <Target size={16} className="text-emerald-500" />
          <span>2. Metas e Indicadores</span>
        </div>

        {/* Regras de Cálculo de Meta & Dias Úteis */}
        <CollapsibleSection
          title="Regras de Cálculo de Meta & Dias Úteis"
          subtitle="Dias úteis do mês e Meta Geral de faturamento"
          icon={Target}
          isOpen={openSections.goalsCalc}
          onToggle={() => toggleSection('goalsCalc')}
          iconColorClass="bg-blue-500/10 border-blue-500/20 text-blue-500"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl border border-borderApp bg-input text-txtPrimary shadow-xs">
              <span className="text-sm font-bold text-txtPrimary">Dias úteis no mês</span>
              <div className="flex items-center gap-1.5">
                <input 
                  type="number"
                  min="1"
                  max="31"
                  value={workDays || ''}
                  onChange={(e) => setWorkDays(parseInt(e.target.value) || 0)}
                  placeholder="27"
                  className="bg-card border border-borderApp focus:border-blue-500 text-txtPrimary rounded-lg px-2.5 py-1 text-center outline-none text-sm font-mono font-bold w-20 shadow-2xs"
                />
                <span className="text-xs font-bold text-txtSecondary">dias</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-borderApp bg-input text-txtPrimary shadow-xs">
              <span className="text-sm font-bold text-txtPrimary">Meta Geral da Loja</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-txtSecondary">R$</span>
                <input 
                  type="number"
                  value={storeGoal || ''}
                  onChange={(e) => setStoreGoal(parseFloat(e.target.value) || 0)}
                  placeholder="350000"
                  className="bg-card border border-borderApp focus:border-blue-500 text-txtPrimary rounded-lg px-2.5 py-1 text-right outline-none text-sm font-mono font-bold w-32 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Metas de Faturamento */}
        <CollapsibleSection
          title="Metas de Faturamento"
          subtitle="Definir metas por vendedor e equipe"
          icon={TrendingUp}
          isOpen={openSections.goals}
          onToggle={() => toggleSection('goals')}
          iconColorClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-borderApp bg-input text-txtPrimary shadow-xs">
              <span className="text-sm font-bold uppercase text-txtPrimary">Meta Geral da Loja</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-txtSecondary">R$</span>
                <input 
                  type="number"
                  value={storeGoal || ''}
                  onChange={(e) => setStoreGoal(parseFloat(e.target.value) || 0)}
                  placeholder="Definir..."
                  className="bg-transparent border-b border-borderApp focus:border-emerald-500 text-right outline-none text-sm font-mono font-bold w-28 py-0.5 text-txtPrimary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-1 text-txtSecondary">Metas Individuais (Vendedores)</p>
              
              {visibleConsultants.map(c => (
                <div 
                  key={c.id} 
                  className="flex items-center justify-between p-3 rounded-xl border border-borderApp bg-input text-txtPrimary shadow-xs transition-colors group/consultant"
                >
                  <span className="text-sm font-semibold truncate flex-1 pr-3 text-txtPrimary" title={c.name}>
                    {c.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-txtMuted">R$</span>
                      <input 
                        type="number"
                        value={consultantGoals[c.id] || ''}
                        onChange={(e) => setConsultantGoal(c.id, parseFloat(e.target.value) || 0)}
                        placeholder="Sem meta"
                        className="bg-card border border-borderApp focus:border-emerald-500 text-txtPrimary rounded-lg px-2 py-1 text-right outline-none text-sm font-mono font-semibold w-24"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {consultantList.length === 0 && (
                <p className="text-sm italic p-3 text-center rounded-xl border border-dashed border-borderApp bg-card text-txtMuted">
                  Cadastre vendedores para definir metas.
                </p>
              )}

              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllConsultantGoals(!showAllConsultantGoals)}
                  className="w-full mt-1 py-2 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1 border border-borderApp bg-input text-txtPrimary hover:bg-hover shadow-2xs cursor-pointer"
                >
                  {showAllConsultantGoals ? (
                    <>
                      <span>Recolher</span>
                      <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      <span>Ver mais {hiddenCount} vendedores</span>
                      <ChevronDown size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Níveis de Desempenho (%) */}
        <CollapsibleSection
          title="Níveis de Desempenho (%)"
          subtitle="Faixas percentuais e nomes de níveis de atingimento"
          icon={Sliders}
          isOpen={openSections.tiers}
          onToggle={() => toggleSection('tiers')}
          iconColorClass="bg-amber-500/10 border-amber-500/20 text-amber-500"
        >
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddGoalTier}
                className="text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Plus size={14} /> Novo Nível
              </button>
            </div>

            <div className="space-y-2">
              {goalTiers.map((tier, index) => (
                <div key={tier.id} className="flex items-center gap-2 p-2 rounded-xl border border-borderApp bg-input shadow-xs text-txtPrimary">
                  <span className="text-xs font-mono font-bold pl-1 w-5 text-txtMuted">#{index + 1}</span>
                  <input 
                    type="text"
                    value={tier.name}
                    onChange={(e) => handleUpdateTierName(tier.id, e.target.value)}
                    placeholder="Nível..."
                    className="bg-transparent border-b border-transparent focus:border-amber-500 outline-none text-sm font-bold py-0.5 px-1 flex-1 min-w-[70px] text-txtPrimary"
                  />
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      value={tier.value}
                      onChange={(e) => handleUpdateTierValue(tier.id, parseInt(e.target.value) || 0)}
                      className="border border-borderApp bg-card text-txtPrimary rounded px-1.5 py-0.5 text-right outline-none text-sm font-mono font-bold w-14"
                    />
                    <span className="text-xs font-bold mr-1 text-txtMuted">%</span>
                  </div>
                  
                  {goalTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGoalTier(tier.id)}
                      className="p-1.5 text-txtMuted hover:text-red-500 hover:bg-hover rounded-lg transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              {goalTiers.length === 0 && (
                <p className="text-sm italic py-3 text-center rounded-xl border border-dashed border-borderApp bg-card text-txtMuted">
                  Sem níveis configurados.
                </p>
              )}
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* =========================================================================
          CATEGORIA 3: 🎨 PERSONALIZAÇÃO E DASHBOARD
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-txtSecondary">
          <Palette size={16} className="text-purple-500" />
          <span>3. Personalização e Dashboard</span>
        </div>

        {/* Indicador Padrão da Home */}
        <CollapsibleSection
          title="Indicador Padrão da Home"
          subtitle="Métrica em destaque no topo da tela principal"
          icon={Palette}
          isOpen={openSections.metric}
          onToggle={() => toggleSection('metric')}
          iconColorClass="bg-purple-500/10 border-purple-500/20 text-purple-500"
        >
          <div className="space-y-3">
            <div className="relative">
              <select
                value={activeMetric}
                onChange={(e) => setActiveMetric(e.target.value as any)}
                className="w-full border border-borderApp bg-input text-txtPrimary focus:border-purple-500 rounded-xl px-3 py-2.5 text-sm font-bold outline-none appearance-none cursor-pointer transition-all pr-10"
              >
                <option value="projection">Projeção da Loja (Mensal)</option>
                <option value="revenue">Vendido Hoje (Faturamento)</option>
                <option value="tkm">Ticket Médio (TKM Hoje)</option>
                <option value="conversion">Conversão Geral (%)</option>
                <option value="served">Atendimentos do Dia</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-txtSecondary">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Exibição de Painéis e Widgets */}
        <CollapsibleSection
          title="Exibição de Painéis e Widgets"
          subtitle="Ativar ou ocultar seções e cartões da interface"
          icon={Eye}
          isOpen={openSections.dashboards}
          onToggle={() => toggleSection('dashboards')}
          iconColorClass="bg-purple-500/10 border-purple-500/20 text-purple-500"
        >
          <div className="space-y-2">
            {[
              { id: 'home-metrics', label: 'Home: Faturamento & Ticket' },
              { id: 'home-consultants', label: 'Home: Desempenho Vendedores' },
              { id: 'export-summary', label: 'Resumo: Métricas Totais' },
              { id: 'export-consultants', label: 'Resumo: Gráfico Desempenho' }
            ].map(dash => {
              const isHidden = hiddenDashboards.includes(dash.id);
              return (
                <label 
                  key={dash.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-borderApp bg-input hover:bg-hover transition-all cursor-pointer group shadow-2xs"
                >
                  <span className="text-sm font-semibold text-txtPrimary">{dash.label}</span>
                  <input 
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => toggleDashboardVisibility(dash.id)}
                    className="w-4 h-4 text-purple-600 bg-card border-borderApp rounded focus:ring-purple-500 cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Gamificação & Cofre */}
        <CollapsibleSection
          title="Gamificação & Cofre"
          subtitle="Tabela de pontos de lentes e metas semanais do cofre"
          icon={Award}
          isOpen={openSections.gamification}
          onToggle={() => toggleSection('gamification')}
          iconColorClass="bg-purple-500/10 border-purple-500/20 text-purple-500"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-2 text-txtSecondary">Tabela de Pontos Lentes</p>
              <div className="space-y-2">
                {lensPointsRules.map(rule => (
                  <div key={rule.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl border border-borderApp bg-input shadow-xs text-txtPrimary">
                    <div className="flex-1 text-sm font-semibold pl-1 text-txtPrimary">
                      {rule.lenteTipo} + {rule.linhaTipo} + {rule.modelo}
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        min="0"
                        value={rule.points}
                        onChange={(e) => {
                          const updated = lensPointsRules.map(r => 
                            r.id === rule.id ? { ...r, points: Number(e.target.value) || 0 } : r
                          );
                          updateLensPointsRules(updated);
                        }}
                        className="border border-borderApp focus:border-purple-500 rounded-lg py-1 px-2 outline-none w-16 text-center text-sm font-bold bg-card text-txtPrimary"
                      />
                      <span className="text-sm font-bold uppercase text-txtMuted">PTS</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-borderApp pt-4">
              <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-2 text-txtSecondary">Metas do Cofre Semanal</p>
              
              <div className="flex border border-borderApp rounded-xl p-1 mb-3 bg-card">
                <button
                  type="button"
                  onClick={() => updateWeeklyVault({...weeklyVault, type: 'BRL'})}
                  className={`flex-1 text-sm font-bold py-1.5 rounded-lg transition-colors cursor-pointer ${
                    weeklyVault.type === 'BRL' 
                      ? 'bg-purple-600 text-white shadow-2xs' 
                      : 'text-txtSecondary hover:text-txtPrimary'
                  }`}
                >
                  Meta em R$
                </button>
                <button
                  type="button"
                  onClick={() => updateWeeklyVault({...weeklyVault, type: 'POINTS'})}
                  className={`flex-1 text-sm font-bold py-1.5 rounded-lg transition-colors cursor-pointer ${
                    weeklyVault.type === 'POINTS' 
                      ? 'bg-purple-600 text-white shadow-2xs' 
                      : 'text-txtSecondary hover:text-txtPrimary'
                  }`}
                >
                  Meta em Pontos
                </button>
              </div>

              {weeklyVault.type === 'POINTS' && (
                <p className="text-[11px] font-medium text-txtSecondary mb-3 bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-xl">
                  💡 <strong>Escala de Pontos:</strong> Defina as metas da barra do cofre (Ex: Mínima = 150 PTS, Estrela = 250 PTS, Mega = 400 PTS). O painel exibirá automaticamente a régua de progresso com marcadores de 150 a 400 PTS.
                </p>
              )}

              <div className="space-y-2">
                {[
                  { key: 'minGoal', descKey: 'minRewardDesc', label: 'Meta Mínima (Ex: 150 PTS)', icon: <Target size={16} className="text-blue-500" /> },
                  { key: 'starGoal', descKey: 'starRewardDesc', label: 'Meta Estrela (Ex: 250 PTS)', icon: <Star size={16} className="text-amber-500" /> },
                  { key: 'megaGoal', descKey: 'megaRewardDesc', label: 'Mega Meta (Ex: 400 PTS)', icon: <Award size={16} className="text-purple-500" /> }
                ].map((tier, idx) => (
                  <div key={idx} className="rounded-xl p-3 flex flex-col gap-2 border border-borderApp bg-input shadow-xs">
                    <div className="flex items-center gap-2 mb-1">
                      {tier.icon}
                      <span className="text-sm font-bold text-txtPrimary">{tier.label}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative w-full flex-1">
                        {weeklyVault.type === 'BRL' && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-txtMuted pointer-events-none z-10">R$</span>}
                        {weeklyVault.type === 'POINTS' && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-txtMuted pointer-events-none z-10">PTS</span>}
                        <input
                          type="number"
                          value={weeklyVault[tier.key as keyof typeof weeklyVault]}
                          onChange={(e) => updateWeeklyVault({
                            ...weeklyVault,
                            [tier.key]: Number(e.target.value) || 0
                          })}
                          className="w-full border border-borderApp focus:border-purple-500 rounded-lg py-2 !pl-12 pr-3 outline-none text-base font-bold bg-card text-txtPrimary"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Prêmio Ex: Folga, R$ 100, PIX..."
                        value={weeklyVault[tier.descKey as keyof typeof weeklyVault]}
                        onChange={(e) => updateWeeklyVault({
                          ...weeklyVault,
                          [tier.descKey]: e.target.value
                        })}
                        className="flex-[2] border border-borderApp focus:border-purple-500 rounded-lg py-2 px-3 outline-none text-base font-semibold bg-card text-txtPrimary placeholder:text-txtMuted"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* =========================================================================
          CATEGORIA 4: 🔐 CONEXÃO E SINCRONIZAÇÃO
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-txtSecondary">
          <Lock size={16} className="text-rose-500" />
          <span>4. Conexão e Sincronização</span>
        </div>

        {/* Conexão de Acessos Remotos / Código Único */}
        <CollapsibleSection
          title="Conexão de Acessos Remotos / Código Único"
          subtitle="Sincronizar código do projeto ou conectar a outro banco"
          icon={Fingerprint}
          isOpen={openSections.connection}
          onToggle={() => toggleSection('connection')}
          iconColorClass="bg-rose-500/10 border-rose-500/20 text-rose-500"
        >
          <div className="space-y-4">
            {/* Nome do Acesso Principal / Sua Loja */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-1.5 text-txtSecondary">
                Nome do Seu Acesso / Loja Principal
              </p>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-borderApp bg-input shadow-xs">
                <Store size={18} className="text-rose-500 shrink-0 ml-1" />
                <input 
                  type="text"
                  value={storeAccessName}
                  onChange={(e) => setStoreAccessName(e.target.value)}
                  placeholder="Ex: Gassi Diadema"
                  className="bg-transparent outline-none text-sm font-bold text-txtPrimary flex-1 placeholder:text-txtMuted"
                />
              </div>
              <p className="text-[10px] text-txtMuted pl-1 mt-1">
                Nome do acesso exibido em relatórios e downloads de arquivos.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-1.5 text-txtSecondary">Código Único (O Seu ID)</p>
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-borderApp bg-input shadow-xs">
                <code className="text-rose-500 text-sm flex-1 truncate font-mono select-all">
                  {showUserId ? (userId || 'Nenhum código gerado') : '••••••••••••••••••••••••'}
                </code>
                <button 
                  type="button"
                  onClick={() => setShowUserId(!showUserId)}
                  className="p-1.5 rounded-lg transition-colors border border-borderApp bg-card hover:bg-hover text-txtPrimary cursor-pointer"
                  title={showUserId ? "Ocultar Código" : "Exibir Código"}
                >
                  {showUserId ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button 
                  type="button"
                  onClick={copyToClipboard}
                  className="p-2 rounded-lg transition-colors border border-borderApp bg-card hover:bg-hover text-txtPrimary cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="Copiar Código"
                >
                  {isCopied ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <Check size={14} /> Copiado! ✓
                    </span>
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-borderApp pt-3">
              <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-1.5 text-txtSecondary">Acessos Remotos Salvos (Outras Lojas / IDs)</p>
              <div className="flex flex-col gap-2.5">
                {workspaces.map((ws, i) => (
                  <div key={ws.id} className="flex flex-col gap-2 p-3 rounded-xl border border-borderApp bg-input shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-mono font-bold pl-1 text-txtMuted">#{i + 1}</span>
                        <input 
                          type="text" 
                          value={ws.name}
                          onChange={(e) => handleUpdateWorkspace(ws.id, 'name', e.target.value)}
                          placeholder="Nome do Acesso (ex: Gassi Diadema)"
                          className="bg-card border border-borderApp focus:border-rose-500 rounded-lg outline-none text-xs font-bold py-1.5 px-2.5 flex-1 text-txtPrimary placeholder:text-txtMuted"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveWorkspace(ws.id)}
                        className="p-1.5 text-txtMuted hover:text-red-500 hover:bg-hover rounded-lg transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex gap-2 items-center pl-1">
                      <input 
                        type="text" 
                        value={ws.projectId}
                        onChange={(e) => handleUpdateWorkspace(ws.id, 'projectId', e.target.value)}
                        placeholder="ID do Acesso / Projeto ****"
                        className="border border-borderApp bg-card text-rose-500 focus:border-rose-500 rounded-lg px-2.5 py-1.5 outline-none text-xs font-mono w-full flex-1 placeholder:text-txtMuted"
                      />
                      <button
                        onClick={() => handleSelectWorkspace(ws)}
                        className="bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-colors cursor-pointer"
                      >
                        Conectar
                      </button>
                    </div>
                  </div>
                ))}

                {workspaces.length === 0 && (
                  <p className="text-sm italic py-3 text-center rounded-xl border border-dashed border-borderApp bg-card text-txtMuted">
                    Nenhum acesso salvo.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleAddWorkspace}
                  className="flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl text-sm font-bold transition-all border border-borderApp bg-input hover:bg-hover text-txtPrimary cursor-pointer shadow-2xs"
                >
                  <Plus size={16} /> Adicionar mais acessos
                </button>
              </div>
            </div>
            
            <div className="pt-2">
               <button 
                  type="button"
                  onClick={() => { setCurrentProjectId(''); setAlertInfo({ isOpen: true, message: 'Você retornou ao seu próprio projeto.' }); }}
                  className="flex items-center justify-center gap-2 py-2.5 w-full rounded-xl text-sm font-bold transition-all border border-borderApp bg-input hover:bg-hover text-txtPrimary cursor-pointer shadow-2xs"
                >
                  Retornar ao Meu Próprio Acesso
                </button>
            </div>
          </div>
        </CollapsibleSection>
      </div>
      
      <AlertDialog 
        isOpen={alertInfo.isOpen}
        title="Aviso"
        message={alertInfo.message}
        onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })}
      />
    </div>
  );
}
