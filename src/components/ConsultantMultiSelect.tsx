import React from 'react';
import { useAppStore } from '../data/store';
import { Check } from 'lucide-react';

interface ConsultantMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ConsultantMultiSelect({ selectedIds, onChange }: ConsultantMultiSelectProps) {
  const { consultants } = useAppStore();
  const allConsultants = Object.values(consultants);

  if (allConsultants.length === 0) return null;

  const toggleConsultant = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const isAllSelected = selectedIds.length === 0 || selectedIds.length === allConsultants.length;

  const selectAll = () => {
    onChange([]);
  };

  return (
    <div className="mb-6 flex flex-col gap-2">
      <label className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-1">Filtrar por Vendedor</label>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={selectAll}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${isAllSelected ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-800 text-slate-400 border-slate-700/50 hover:bg-slate-700'}`}
        >
          Todos
        </button>
        {allConsultants.map(c => {
          const isSelected = selectedIds.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleConsultant(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${isSelected && !isAllSelected ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-800 text-slate-400 border-slate-700/50 hover:bg-slate-700'}`}
            >
              {isSelected && !isAllSelected && <Check size={12} />}
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
