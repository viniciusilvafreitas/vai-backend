import React, { useState, useMemo } from 'react';
import { X, Search, Calendar, User, ShoppingBag, DollarSign, Package, Sparkles, Sliders } from 'lucide-react';
import { CRMRecord } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  filterType: 'product' | 'prime' | 'personalizada';
  records: CRMRecord[];
}

export function ProductSalesModal({
  isOpen,
  onClose,
  productName,
  filterType,
  records
}: ProductSalesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to extract product display name from record productId
  const getRecordDisplayName = (record: CRMRecord): string => {
    const prodId = record.productId || 'Outros';
    let displayName = prodId.split(' (Obs:')[0].trim();
    if (prodId.includes(' | ')) {
      const parts = prodId.split(' | ').map(p => p.trim());
      const tipo = parts[0] || '';
      const category = parts[1] || '';
      const rawModel = parts[2] || '';
      const model = rawModel.split(' (Obs:')[0].trim();
      displayName = model || `${tipo} ${category}`.trim();
    }
    return displayName;
  };

  // Filter records based on selected product/category
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (r.status !== 'WON') return false;

      const prodId = r.productId || '';
      const prodLower = prodId.toLowerCase();

      let matchesCategory = false;
      if (filterType === 'prime') {
        matchesCategory = prodLower.includes('prime');
      } else if (filterType === 'personalizada') {
        matchesCategory = prodLower.includes('personalizada');
      } else {
        const dName = getRecordDisplayName(r);
        matchesCategory = dName.toLowerCase() === productName.toLowerCase() || prodLower.includes(productName.toLowerCase());
      }

      if (!matchesCategory) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const client = (r.customerName || '').toLowerCase();
        const cons = (r.consultantName || '').toLowerCase();
        const prod = prodLower;
        return client.includes(term) || cons.includes(term) || prod.includes(term);
      }

      return true;
    }).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.logicalDate ? new Date(a.logicalDate).getTime() : 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.logicalDate ? new Date(b.logicalDate).getTime() : 0);
      return timeB - timeA;
    });
  }, [records, productName, filterType, searchTerm]);

  // Aggregate values
  const totalCount = filteredRecords.length;
  const totalRevenue = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + ((r as any).closedValue || 0), 0);
  }, [filteredRecords]);

  if (!isOpen) return null;

  const getIcon = () => {
    if (filterType === 'prime') return <Sparkles size={20} className="text-indigo-500" />;
    if (filterType === 'personalizada') return <Sliders size={20} className="text-purple-500" />;
    return <Package size={20} className="text-primary" />;
  };

  const formatRecordDate = (r: CRMRecord) => {
    if (r.createdAt) {
      try {
        const d = parseISO(r.createdAt);
        return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      } catch {
        // fallback
      }
    }
    if (r.logicalDate) {
      try {
        const parts = r.logicalDate.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      } catch {
        // fallback
      }
    }
    return 'Data N/I';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-card border border-borderApp text-txtPrimary rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-borderApp flex items-center justify-between gap-3 bg-card shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div className="p-2.5 rounded-xl bg-input border border-borderApp shrink-0">
              {getIcon()}
            </div>
            <div className="truncate">
              <span className="text-[10px] font-bold uppercase tracking-wider text-txtSecondary block">
                Detalhamento de Vendas
              </span>
              <h3 className="text-base sm:text-lg font-black text-txtPrimary truncate">
                {productName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-borderApp bg-input text-txtSecondary hover:text-txtPrimary hover:bg-hover transition-colors shrink-0 cursor-pointer"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumo & Filtro Rápido */}
        <div className="p-4 border-b border-borderApp bg-input/40 space-y-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold">
                {totalCount} {totalCount === 1 ? 'Venda' : 'Vendas'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold">
                Total: R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Campo de Busca Rápida Interno */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txtMuted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtro rápido por cliente ou consultor..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-borderApp bg-card text-txtPrimary placeholder:text-txtMuted outline-none focus:border-primary transition-colors shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-txtMuted hover:text-txtPrimary"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Lista de Vendas */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-[250px]">
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record) => {
              const closedVal = (record as any).closedValue || 0;
              return (
                <div 
                  key={record.id}
                  className="p-3.5 rounded-xl border border-borderApp bg-card hover:border-primary/40 transition-all shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <User size={14} />
                      </div>
                      <span className="font-bold text-sm text-txtPrimary">
                        {record.customerName || 'Cliente não identificado'}
                      </span>
                    </div>

                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                      R$ {closedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-txtSecondary pt-1 border-t border-borderApp/50">
                    <div className="flex items-center gap-1.5 truncate">
                      <ShoppingBag size={13} className="text-txtMuted shrink-0" />
                      <span className="truncate font-medium" title={record.productId}>
                        {record.productId || 'Produto não especificado'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <User size={13} className="text-txtMuted shrink-0" />
                      <span className="truncate">
                        Consultor: <strong className="text-txtPrimary">{record.consultantName || 'N/A'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-txtMuted sm:col-span-2">
                      <Calendar size={13} className="shrink-0" />
                      <span>{formatRecordDate(record)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-txtMuted space-y-2">
              <Package size={36} className="mx-auto text-txtMuted/50" />
              <p className="text-xs font-medium">Nenhum registro de venda encontrado para este filtro.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-borderApp bg-card flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-borderApp bg-input text-txtPrimary font-bold text-xs hover:bg-hover transition-colors cursor-pointer"
          >
            Voltar ao Painel
          </button>
        </div>
      </div>
    </div>
  );
}
