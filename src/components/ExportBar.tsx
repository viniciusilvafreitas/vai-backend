import React from 'react';
import { FileText, Table, FileCode2 } from 'lucide-react';

export interface ExportBarProps {
  onExport: (type: 'PDF' | 'Excel' | 'CSV') => void;
  count?: number;
  label?: string;
  className?: string;
}

export function ExportBar({
  onExport,
  count,
  label = 'Exportar Pesquisa por Período',
  className = ''
}: ExportBarProps) {
  return (
    <div className={`p-3.5 sm:p-4 bg-card border border-borderApp rounded-2xl shadow-xs transition-colors mb-6 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-txtSecondary w-full sm:w-auto">
          <span>{label}</span>
          {count !== undefined && (
            <span className="px-2 py-0.5 rounded-full bg-input border border-borderApp text-[11px] font-mono font-bold text-txtPrimary ml-auto sm:ml-0">
              {count} {count === 1 ? 'registro' : 'registros'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => onExport('PDF')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 border border-borderApp rounded-xl transition-all bg-card hover:bg-hover text-txtPrimary cursor-pointer shadow-xs text-xs font-bold uppercase hover:border-red-500/40 group active:scale-95"
            title="Exportar pesquisa em formato PDF"
          >
            <FileText size={18} className="text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-[11px]">PDF</span>
          </button>
          <button
            type="button"
            onClick={() => onExport('Excel')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 border border-borderApp rounded-xl transition-all bg-card hover:bg-hover text-txtPrimary cursor-pointer shadow-xs text-xs font-bold uppercase hover:border-emerald-500/40 group active:scale-95"
            title="Exportar pesquisa em formato Excel"
          >
            <Table size={18} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-[11px]">Excel</span>
          </button>
          <button
            type="button"
            onClick={() => onExport('CSV')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 border border-borderApp rounded-xl transition-all bg-card hover:bg-hover text-txtPrimary cursor-pointer shadow-xs text-xs font-bold uppercase hover:border-blue-500/40 group active:scale-95"
            title="Exportar pesquisa em formato CSV"
          >
            <FileCode2 size={18} className="text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-[11px]">CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
