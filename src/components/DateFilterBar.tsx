import React, { useState, useEffect } from 'react';
import { Search, Calendar as CalendarIcon, ChevronDown, ChevronUp, X } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface DateFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onDateRangeChange: (start: string, end: string, preset: DatePreset) => void;
  // Optional status/category chips to display directly in the filter bar
  statusFilter?: string;
  onStatusFilterChange?: (status: any) => void;
  statusOptions?: { id: string; label: string; count?: number; color?: string }[];
}

export function DateFilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Buscar por cliente, produto ou consultor...',
  startDate,
  endDate,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions
}: DateFilterBarProps) {
  const [activePreset, setActivePreset] = useState<DatePreset>('today');
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const getTodayISO = () => format(new Date(), 'yyyy-MM-dd');
  const getYesterdayISO = () => format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const getWeekStartISO = () => format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const getWeekEndISO = () => format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const getMonthStartISO = () => format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const getMonthEndISO = () => format(endOfMonth(new Date()), 'yyyy-MM-dd');

  // Sync internal custom dates and detect active preset if props change externally
  useEffect(() => {
    setCustomStart(startDate);
    setCustomEnd(endDate);

    const todayIso = getTodayISO();
    const yesterdayIso = getYesterdayISO();
    const weekStartIso = getWeekStartISO();
    const weekEndIso = getWeekEndISO();
    const monthStartIso = getMonthStartISO();
    const monthEndIso = getMonthEndISO();

    if (startDate === todayIso && endDate === todayIso) {
      setActivePreset('today');
    } else if (startDate === yesterdayIso && endDate === yesterdayIso) {
      setActivePreset('yesterday');
    } else if (startDate === weekStartIso && endDate === weekEndIso) {
      setActivePreset('week');
    } else if (startDate === monthStartIso && endDate === monthEndIso) {
      setActivePreset('month');
    } else {
      setActivePreset('custom');
    }
  }, [startDate, endDate]);

  const handleSelectPreset = (preset: DatePreset) => {
    setActivePreset(preset);

    if (preset === 'today') {
      setIsCustomOpen(false);
      const iso = getTodayISO();
      onDateRangeChange(iso, iso, 'today');
    } else if (preset === 'yesterday') {
      setIsCustomOpen(false);
      const yesterdayIso = getYesterdayISO();
      onDateRangeChange(yesterdayIso, yesterdayIso, 'yesterday');
    } else if (preset === 'week') {
      setIsCustomOpen(false);
      onDateRangeChange(getWeekStartISO(), getWeekEndISO(), 'week');
    } else if (preset === 'month') {
      setIsCustomOpen(false);
      onDateRangeChange(getMonthStartISO(), getMonthEndISO(), 'month');
    } else if (preset === 'custom') {
      setIsCustomOpen(true);
    }
  };

  const handleApplyCustomDates = () => {
    if (customStart && customEnd) {
      onDateRangeChange(customStart, customEnd, 'custom');
    }
  };

  // Label text generator for the active filter status
  const getFilterSummary = () => {
    if (!startDate || !endDate) return '';

    if (startDate === endDate) {
      const todayIso = getTodayISO();
      const yesterdayIso = getYesterdayISO();
      if (startDate === todayIso) return `Filtro: Hoje (${format(parseISO(startDate), "dd 'de' MMMM", { locale: ptBR })})`;
      if (startDate === yesterdayIso) return `Filtro: Ontem (${format(parseISO(startDate), "dd 'de' MMMM", { locale: ptBR })})`;
      return `Filtro: ${format(parseISO(startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
    }

    try {
      const dStart = parseISO(startDate);
      const dEnd = parseISO(endDate);
      if (isValid(dStart) && isValid(dEnd)) {
        return `Filtro: ${format(dStart, 'dd/MM/yyyy')} até ${format(dEnd, 'dd/MM/yyyy')}`;
      }
    } catch {
      // fallback
    }
    return `Filtro: ${startDate} a ${endDate}`;
  };

  return (
    <div className="flex flex-col gap-3 w-full mb-6">
      {/* 1. CAMPO DE BUSCA TEXTUAL */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-txtSecondary pointer-events-none z-10" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-input text-txtPrimary border border-borderApp rounded-2xl py-3.5 !pl-12 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-txtSecondary/60 shadow-xs"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-txtSecondary hover:text-txtPrimary rounded-lg hover:bg-hover transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 2. MENU SUSPENSO E BOTÃO PERSONALIZADO (LADO A LADO) */}
      <div className="flex items-center gap-2.5 w-full">
        {/* Menu Suspenso de Presets */}
        <div className="relative flex-1 min-w-[150px]">
          <select
            value={activePreset}
            onChange={(e) => handleSelectPreset(e.target.value as DatePreset)}
            className={`w-full rounded-2xl px-4 py-3 pr-10 text-xs font-bold outline-none transition-all cursor-pointer appearance-none shadow-xs ${
              activePreset !== 'custom'
                ? 'btn-type-venda-active'
                : 'btn-type-inactive'
            }`}
          >
            <option value="today" className="bg-card text-txtPrimary font-semibold">Hoje</option>
            <option value="yesterday" className="bg-card text-txtPrimary font-semibold">Ontem</option>
            <option value="week" className="bg-card text-txtPrimary font-semibold">Esta Semana</option>
            <option value="month" className="bg-card text-txtPrimary font-semibold">Mês Atual</option>
            <option value="custom" className="bg-card text-txtPrimary font-semibold">Personalizado</option>
          </select>
          <ChevronDown 
            size={16} 
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              activePreset !== 'custom' ? 'text-emerald-700 dark:text-emerald-300' : 'text-txtSecondary'
            }`} 
          />
        </div>

        {/* Botão Personalizado (ao lado) */}
        <button
          type="button"
          onClick={() => {
            if (activePreset !== 'custom') {
              setActivePreset('custom');
              setIsCustomOpen(true);
            } else {
              setIsCustomOpen(prev => !prev);
            }
          }}
          className={`px-4 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            isCustomOpen || activePreset === 'custom'
              ? 'btn-type-venda-active'
              : 'btn-type-inactive'
          }`}
        >
          <CalendarIcon size={16} className={isCustomOpen || activePreset === 'custom' ? 'text-emerald-700 dark:text-emerald-300' : 'text-txtSecondary'} />
          <span>Personalizado</span>
          {isCustomOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* 3. PAINEL DE DATAS PERSONALIZADAS (DATA INICIAL, DATA FINAL) */}
      {isCustomOpen && (
        <div className="p-4 bg-card border border-borderApp rounded-2xl flex flex-col sm:flex-row gap-3 items-end animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-txtSecondary uppercase tracking-wider block mb-1.5">
              Data Inicial
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full bg-input text-txtPrimary border border-borderApp rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-txtSecondary uppercase tracking-wider block mb-1.5">
              Data Final
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full bg-input text-txtPrimary border border-borderApp rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyCustomDates}
            className="w-full sm:w-auto px-5 py-2.5 btn-type-venda-active rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center"
          >
            Aplicar Data
          </button>
        </div>
      )}

      {/* CHIPS SECUNDÁRIOS DE STATUS (OPCIONAIS EX: TODOS, APENAS VENDAS, APENAS ORÇAMENTOS) */}
      {statusOptions && statusOptions.length > 0 && onStatusFilterChange && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-borderApp/50 scrollbar-none">
          {statusOptions.map((opt) => {
            const isSelected = statusFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onStatusFilterChange(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? opt.color || 'bg-slate-800 text-white border-slate-700 shadow-xs'
                    : 'bg-card text-txtSecondary border-borderApp hover:bg-hover hover:text-txtPrimary'
                }`}
              >
                <span>{opt.label}</span>
                {opt.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-input text-txtSecondary'
                  }`}>
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. INDICADOR DE FILTRO ATIVO */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold text-txtSecondary flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" />
          {getFilterSummary()}
        </span>
      </div>
    </div>
  );
}

