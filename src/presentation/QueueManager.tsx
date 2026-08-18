import React, { useState, useEffect } from 'react';
import { useAppStore } from '../data/store';
import { X, Plus, UserCheck, UserMinus, Trash2, GripVertical, Check, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { ConfirmDialog } from '../components/ConfirmDialog';

export default function QueueManager({ onClose }: { onClose: () => void }) {
  const { consultants, dailyQueues, selectedDate, addConsultant, toggleConsultantInQueue, updateConsultant, removeConsultant, reorderConsultants, setManualTurnInQueue, suggestedConsultantNames } = useAppStore();
  const [newConsultantName, setNewConsultantName] = useState(() => localStorage.getItem('crm_draft_newConsultantName') || '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [consultantToDelete, setConsultantToDelete] = useState<string | null>(null);
  const [showAutoSaved, setShowAutoSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem('crm_draft_newConsultantName', newConsultantName);
  }, [newConsultantName]);

  const currentQueue = dailyQueues[selectedDate];
  const activeIds = currentQueue?.activeConsultantIds || [];
  const currentTurnId = currentQueue?.currentTurnConsultantId;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsultantName.trim()) return;
    addConsultant(newConsultantName.trim());
    setNewConsultantName('');
    localStorage.removeItem('crm_draft_newConsultantName');
    setShowAutoSaved(true);
    setTimeout(() => setShowAutoSaved(false), 2000);
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEditing = (id: string) => {
    if (editName.trim()) {
      updateConsultant(id, editName.trim());
      setShowAutoSaved(true);
      setTimeout(() => setShowAutoSaved(false), 2000);
    }
    setEditingId(null);
  };

  const autoSaveQueue = (newOrder: string[]) => {
    reorderConsultants(selectedDate, newOrder);
    try {
      localStorage.setItem(`queue_order_${selectedDate}`, JSON.stringify(newOrder));
    } catch (e) {
      console.error('Error auto saving queue order:', e);
    }
    setShowAutoSaved(true);
    setTimeout(() => setShowAutoSaved(false), 2000);
  };

  const handleReorder = (newOrder: string[]) => {
    autoSaveQueue(newOrder);
  };

  const handleToggleQueue = (id: string, isActive: boolean) => {
    toggleConsultantInQueue(id, selectedDate, isActive);
    setShowAutoSaved(true);
    setTimeout(() => setShowAutoSaved(false), 2000);
  };

  const activeConsultants = activeIds.map(id => consultants[id]).filter(Boolean);
  const inactiveConsultants = Object.values(consultants)
    .filter(c => !activeIds.includes(c.id))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  return (
    <div 
      onDoubleClick={onClose}
      className="fixed inset-0 z-50 flex justify-end backdrop-blur-xs cursor-pointer bg-black/50"
    >
      <motion.div 
        onDoubleClick={(e) => e.stopPropagation()}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-sm sm:max-w-md h-full shadow-2xl flex flex-col cursor-default border-l transition-colors duration-200 bg-app text-txtPrimary border-borderApp overflow-hidden"
      >
        <div className="p-5 border-b border-borderApp flex justify-between items-center bg-card text-txtPrimary relative">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">Escala de Hoje</h2>
            {activeIds.length > 0 && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-brand/10 text-brand border-brand/30">
                {activeIds.length} ativos
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showAutoSaved && (
              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 animate-fade-in bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={12} /> Salvo
              </span>
            )}
            <button 
              onClick={onClose} 
              className="p-2 rounded-full transition-colors text-txtSecondary hover:text-txtPrimary hover:bg-hover"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
          <form onSubmit={handleAdd} className="mb-4 flex gap-2">
            <input
              type="text"
              placeholder="Adicionar novo vendedor..."
              value={newConsultantName}
              onChange={(e) => setNewConsultantName(e.target.value)}
              className="flex-1 w-full bg-input text-txtPrimary border border-borderApp rounded-xl p-3 text-sm outline-none transition-all font-medium placeholder:text-txtMuted focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 shadow-xs"
            />
            <button 
              type="submit" 
              className="btn-type-venda-active p-3 rounded-xl cursor-pointer"
            >
              <Plus size={20} />
            </button>
          </form>

          {/* Sugestões de Cadastro */}
          {suggestedConsultantNames && suggestedConsultantNames.length > 0 && (
            <div className="mb-8 p-3.5 rounded-2xl border border-borderApp bg-card transition-colors">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2.5 text-txtSecondary">Sugestões Salvas</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {suggestedConsultantNames
                  .filter(name => {
                    const isAlreadyActive = Object.values(consultants).some(c => c.name.toLowerCase() === name.toLowerCase() && activeIds.includes(c.id));
                    return !isAlreadyActive;
                  })
                  .map((name, i) => (
                    <button
                      key={name + i}
                      type="button"
                      onClick={() => {
                        const existing = Object.values(consultants).find(c => c.name.toLowerCase().trim() === name.toLowerCase().trim());
                        if (existing) {
                          if (!activeIds.includes(existing.id)) {
                            handleToggleQueue(existing.id, true);
                          }
                        } else {
                          addConsultant(name);
                          setShowAutoSaved(true);
                          setTimeout(() => setShowAutoSaved(false), 2000);
                        }
                      }}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-borderApp bg-input text-txtPrimary hover:bg-hover transition-all cursor-pointer shadow-sm"
                    >
                      {name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-emerald-600 dark:text-emerald-400">
            Vendedores na Vez (Arraste para reordenar)
          </h3>
          
          {activeConsultants.length > 0 ? (
            <Reorder.Group axis="y" values={activeIds} onReorder={handleReorder} className="flex flex-col gap-2 mb-8">
              {activeConsultants.map((consultant) => (
                <Reorder.Item 
                  key={consultant.id} 
                  value={consultant.id}
                  className="flex items-center justify-between w-full p-3 rounded-2xl border border-borderApp bg-card text-txtPrimary shadow-sm transition-all group cursor-grab active:cursor-grabbing min-h-[52px] gap-2"
                >
                  {/* Lado Esquerdo: Ícone de Drag/Mover + Nome do Vendedor */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="cursor-grab text-txtSecondary flex-shrink-0 shrink-0">
                      <GripVertical size={20} className="w-5 h-5 text-blue-500/60" />
                    </div>
                    {editingId === consultant.id ? (
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <input 
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onBlur={() => saveEditing(consultant.id)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditing(consultant.id)}
                          className="flex-1 w-full bg-input border border-blue-500 text-txtPrimary rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 min-w-0"
                        />
                        <button onClick={() => saveEditing(consultant.id)} className="text-emerald-500 p-1 cursor-pointer flex-shrink-0 shrink-0">
                          <Check size={18} />
                        </button>
                      </div>
                    ) : (
                      <span 
                        onClick={() => startEditing(consultant.id, consultant.name)}
                        className="text-sm font-semibold truncate text-txtPrimary cursor-pointer hover:underline underline-offset-4 flex-1 min-w-0 py-1"
                      >
                        {consultant.name}
                      </span>
                    )}
                  </div>
                  
                  {/* Lado Direito: Ações (Vez Atual, Lixeira e Status de Vez) - NUNCA ENCOLHEM */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 shrink-0 ml-auto">
                    {currentTurnId === consultant.id ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-500/20 text-blue-500 border border-blue-500/30 flex-shrink-0 shrink-0 flex items-center gap-1">
                        ⭐ Na Vez
                      </span>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => {
                          setManualTurnInQueue(selectedDate, consultant.id);
                          setShowAutoSaved(true);
                          setTimeout(() => setShowAutoSaved(false), 2000);
                        }}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-input text-txtSecondary hover:text-blue-500 hover:bg-blue-500/10 border border-borderApp transition-colors flex-shrink-0 shrink-0 cursor-pointer"
                        title="Clique para definir como Vez Atual"
                      >
                        Dar Vez
                      </button>
                    )}
                    <button 
                      onClick={() => setConsultantToDelete(consultant.id)}
                      className="p-2 text-txtSecondary hover:text-red-500 transition-colors flex-shrink-0 shrink-0 cursor-pointer rounded-xl hover:bg-hover"
                      title="Excluir vendedor"
                    >
                      <Trash2 size={20} className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleToggleQueue(consultant.id, false)}
                      className="p-2 rounded-full flex-shrink-0 shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      title="Na Vez (Clique para remover da escala)"
                    >
                      <UserCheck size={20} className="w-5 h-5" />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          ) : (
            <p className="text-sm text-center py-6 italic rounded-2xl border border-dashed border-borderApp bg-card text-txtMuted mb-8">
              Nenhum vendedor escalado para hoje.
            </p>
          )}

          <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-txtSecondary">
            Fora da Fila
          </h3>
          <div className="flex flex-col gap-2">
            {inactiveConsultants.map((consultant) => (
              <div 
                key={consultant.id} 
                className="flex items-center justify-between w-full p-3 rounded-2xl border border-borderApp bg-card text-txtPrimary shadow-sm transition-colors group min-h-[52px] gap-2"
              >
                {/* Lado Esquerdo: Nome do Vendedor */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-5 flex-shrink-0 shrink-0" /> {/* Spacer for alignment with GripVertical */}
                  {editingId === consultant.id ? (
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <input 
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={() => saveEditing(consultant.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditing(consultant.id)}
                        className="flex-1 w-full bg-input border border-borderApp text-txtPrimary rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 min-w-0"
                      />
                      <button onClick={() => saveEditing(consultant.id)} className="text-emerald-500 p-1 cursor-pointer flex-shrink-0 shrink-0">
                        <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <span 
                      onClick={() => startEditing(consultant.id, consultant.name)}
                      className="text-sm font-semibold truncate text-txtSecondary cursor-pointer hover:underline underline-offset-4 flex-1 min-w-0 py-1"
                    >
                      {consultant.name}
                    </span>
                  )}
                </div>
                
                {/* Lado Direito: Ações (Lixeira e Status de Vez) - NUNCA ENCOLHEM */}
                <div className="flex items-center gap-2 flex-shrink-0 shrink-0 ml-auto">
                  <button 
                    onClick={() => setConsultantToDelete(consultant.id)}
                    className="p-2 text-txtSecondary hover:text-red-500 transition-colors flex-shrink-0 shrink-0 cursor-pointer rounded-xl hover:bg-hover"
                    title="Excluir vendedor"
                  >
                    <Trash2 size={20} className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleToggleQueue(consultant.id, true)}
                    className="p-2 rounded-full flex-shrink-0 shrink-0 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                    title="Fora da Vez (Clique para adicionar à escala)"
                  >
                    <UserMinus size={20} className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            
            {Object.keys(consultants).length === 0 && (
              <p className="text-sm text-center py-6 italic rounded-2xl border border-dashed border-borderApp bg-card text-txtMuted">
                Nenhum vendedor cadastrado no sistema.
              </p>
            )}

            {/* Botão de Voltar Clássico */}
            <button
              onClick={onClose}
              className="mt-8 w-full py-3.5 rounded-xl font-bold text-sm border border-borderApp bg-input text-txtPrimary hover:bg-hover transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        isOpen={!!consultantToDelete}
        title="Excluir Vendedor"
        message="Tem certeza que deseja excluir este vendedor do sistema permanentemente?"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={() => {
          if (consultantToDelete) {
            removeConsultant(consultantToDelete);
            setConsultantToDelete(null);
            setShowAutoSaved(true);
            setTimeout(() => setShowAutoSaved(false), 2000);
          }
        }}
        onCancel={() => setConsultantToDelete(null)}
        variant="danger"
      />
    </div>
  );
}

