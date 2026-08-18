import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, isSameMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculatePointsFromProductId } from './lensPoints';

export function formatExportPeriodLabel(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) {
    return format(new Date(), 'dd-MM-yyyy');
  }

  try {
    const start = startDateStr.includes('T') ? parseISO(startDateStr) : parseISO(`${startDateStr}T00:00:00`);
    const end = endDateStr.includes('T') ? parseISO(endDateStr) : parseISO(`${endDateStr}T00:00:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return `${startDateStr}`.replace(/\//g, '-');
    }

    if (startDateStr === endDateStr) {
      return format(start, 'dd-MM-yyyy');
    }

    const isFirstDay = start.getDate() === 1;
    const lastDayOfMonth = endOfMonth(start).getDate();
    const isLastDay = end.getDate() === lastDayOfMonth;

    if (isSameMonth(start, end) && isFirstDay && isLastDay) {
      const monthName = format(start, 'MMMM yyyy', { locale: ptBR });
      return monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }

    const startFmt = format(start, 'dd-MM-yyyy');
    const endFmt = format(end, 'dd-MM-yyyy');
    return `${startFmt} a ${endFmt}`;
  } catch {
    return `${startDateStr} a ${endDateStr}`.replace(/\//g, '-');
  }
}

export function formatExportPeriodDisplayTitle(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) {
    return format(new Date(), 'dd/MM/yyyy');
  }

  try {
    const start = startDateStr.includes('T') ? parseISO(startDateStr) : parseISO(`${startDateStr}T00:00:00`);
    const end = endDateStr.includes('T') ? parseISO(endDateStr) : parseISO(`${endDateStr}T00:00:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return startDateStr;
    }

    if (startDateStr === endDateStr) {
      return format(start, 'dd/MM/yyyy');
    }

    const isFirstDay = start.getDate() === 1;
    const lastDayOfMonth = endOfMonth(start).getDate();
    const isLastDay = end.getDate() === lastDayOfMonth;

    if (isSameMonth(start, end) && isFirstDay && isLastDay) {
      const monthName = format(start, 'MMMM yyyy', { locale: ptBR });
      return monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }

    const startFmt = format(start, 'dd/MM/yyyy');
    const endFmt = format(end, 'dd/MM/yyyy');
    return `${startFmt} a ${endFmt}`;
  } catch {
    return `${startDateStr} a ${endDateStr}`;
  }
}

export function buildStandardFilename(
  prefix: string = 'Lista de vez',
  accessName: string = 'Gassi Diadema',
  startDateStr: string,
  endDateStr: string
): string {
  const cleanAccessName = (accessName || 'Gassi Diadema').trim();
  const periodLabel = formatExportPeriodLabel(startDateStr, endDateStr);
  return `${prefix} - ${cleanAccessName} - ${periodLabel}`;
}


const safeFormatDate = (dateStr: any, formatPattern: string): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, formatPattern);
  } catch {
    return 'N/A';
  }
};

export interface ExportMeta {
  scope?: 'loja' | 'consultor';
  subtitle?: string;
  consultantName?: string;
}

export const exportToCSV = (records: any[], filename: string, meta?: ExportMeta) => {
  const headers = ['Data', 'Vendedor', 'Setor', 'Cliente', 'Telefone', 'Status', 'Valor Fechado', 'Valor Orçamento', 'Pontos Lentes', 'Produto'];
  
  // Sort chronologically by insertion
  const sortedRecords = [...records].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const dataRows = sortedRecords.map(r => {
    const pts = typeof r.points === 'number' && r.points > 0 ? r.points : calculatePointsFromProductId(r.productId || '');
    return [
      safeFormatDate(r.createdAt, 'dd/MM/yyyy HH:mm'),
      r.consultantName || r.consultantId,
      `"${r.consultantSector || ''}"`,
      `"${r.customerName || ''}"`,
      r.customerPhone || '',
      r.status === 'LOST' ? 'Orçamento' : r.status === 'WON' ? 'Venda' : r.status,
      r.closedValue || 0,
      r.budgetValue || 0,
      r.status === 'WON' ? pts : 0,
      `"${r.productId || ''}"`
    ].join(',');
  });

  // Calculate summary stats
  const totalRecords = sortedRecords.length;
  const wonRecords = sortedRecords.filter(r => r.status === 'WON');
  const totalSalesCount = wonRecords.length;
  const totalSalesValue = wonRecords.reduce((acc, r) => acc + (r.closedValue || 0), 0);
  const totalPoints = wonRecords.reduce((acc, r) => {
    const pts = typeof r.points === 'number' && r.points > 0 ? r.points : calculatePointsFromProductId(r.productId || '');
    return acc + pts;
  }, 0);
  const conversionRate = totalRecords > 0 ? (totalSalesCount / totalRecords) * 100 : 0;
  const averageTicket = totalSalesCount > 0 ? totalSalesValue / totalSalesCount : 0;

  const summaryRows = [
    '',
    `RESUMO ESTATÍSTICO - ${meta?.subtitle || 'Geral'}`,
    `Total Geral de Atendimentos Realizados,${totalRecords}`,
    `Total de Vendas Concluídas,${totalSalesCount}`,
    `Taxa de Conversão (Vendas/Atendimentos),${conversionRate.toFixed(1)}%`,
    `Total de Vendas em Valor (R$),${totalSalesValue.toFixed(2)}`,
    `Pontos de Lentes Acumulados,${totalPoints}`,
    `Ticket Médio (TKM) por Venda,${averageTicket.toFixed(2)}`
  ];

  const csvContent = [
    headers.join(','),
    ...dataRows,
    ...summaryRows
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

export const exportToExcel = (records: any[], filename: string, meta?: ExportMeta) => {
  // Sort chronologically by insertion
  const sortedRecords = [...records].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const data = sortedRecords.map(r => {
    const pts = typeof r.points === 'number' && r.points > 0 ? r.points : calculatePointsFromProductId(r.productId || '');
    return {
      'Data': safeFormatDate(r.createdAt, 'dd/MM/yyyy HH:mm'),
      'Vendedor': r.consultantName || r.consultantId,
      'Setor': r.consultantSector || '',
      'Cliente': r.customerName || '',
      'Telefone': r.customerPhone || '',
      'Status': r.status === 'LOST' ? 'Orçamento' : r.status === 'WON' ? 'Venda' : r.status,
      'Valor Fechado': r.closedValue || 0,
      'Valor Orçamento': r.budgetValue || 0,
      'Pontos Lentes': r.status === 'WON' ? pts : 0,
      'Produto': r.productId || ''
    };
  });

  // Calculate summary stats
  const totalRecords = sortedRecords.length;
  const wonRecords = sortedRecords.filter(r => r.status === 'WON');
  const totalSalesCount = wonRecords.length;
  const totalSalesValue = wonRecords.reduce((acc, r) => acc + (r.closedValue || 0), 0);
  const totalPoints = wonRecords.reduce((acc, r) => {
    const pts = typeof r.points === 'number' && r.points > 0 ? r.points : calculatePointsFromProductId(r.productId || '');
    return acc + pts;
  }, 0);
  const conversionRate = totalRecords > 0 ? (totalSalesCount / totalRecords) * 100 : 0;
  const averageTicket = totalSalesCount > 0 ? totalSalesValue / totalSalesCount : 0;

  // Add blank row
  data.push({} as any);
  
  // Add summary rows
  data.push({
    'Data': `RESUMO ESTATÍSTICO (${meta?.subtitle || 'Geral'})`,
    'Vendedor': '',
    'Setor': '',
    'Cliente': '',
    'Telefone': '',
    'Status': '',
    'Valor Fechado': 0,
    'Valor Orçamento': 0,
    'Pontos Lentes': 0,
    'Produto': ''
  } as any);

  data.push({
    'Data': 'Total Geral de Atendimentos Realizados',
    'Vendedor': totalRecords,
    'Setor': '',
    'Cliente': '',
    'Telefone': '',
    'Status': '',
    'Valor Fechado': 0,
    'Valor Orçamento': 0,
    'Pontos Lentes': 0,
    'Produto': ''
  } as any);

  data.push({
    'Data': 'Total de Vendas Concluídas',
    'Vendedor': totalSalesCount,
    'Setor': '',
    'Cliente': '',
    'Telefone': '',
    'Status': '',
    'Valor Fechado': 0,
    'Valor Orçamento': 0,
    'Pontos Lentes': 0,
    'Produto': ''
  } as any);

  data.push({
    'Data': 'Taxa de Conversão (Vendas/Atendimentos)',
    'Vendedor': `${conversionRate.toFixed(1)}%`,
    'Setor': '',
    'Cliente': '',
    'Telefone': '',
    'Status': '',
    'Valor Fechado': 0,
    'Valor Orçamento': 0,
    'Pontos Lentes': 0,
    'Produto': ''
  } as any);

  data.push({
    'Data': 'Total de Vendas em Valor (R$)',
    'Vendedor': totalSalesValue,
    'Setor': '',
    'Cliente': '',
    'Telefone': '',
    'Status': '',
    'Valor Fechado': 0,
    'Valor Orçamento': 0,
    'Pontos Lentes': 0,
    'Produto': ''
  } as any);

  data.push({
    'Data': 'Pontos de Lentes Acumulados',
    'Vendedor': totalPoints,
    'Setor': '',
    'Cliente': '',
    'Telefone': '',
    'Status': '',
    'Valor Fechado': 0,
    'Valor Orçamento': 0,
    'Pontos Lentes': 0,
    'Produto': ''
  } as any);

  data.push({
    'Data': 'Ticket Médio (TKM) por Venda',
    'Vendedor': averageTicket,
    'Cliente': '',
    'Telefone': '',
    'Status': '',
    'Valor Fechado': 0,
    'Valor Orçamento': 0,
    'Pontos Lentes': 0,
    'Produto': ''
  } as any);

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (records: any[], filename: string, title: string, meta?: ExportMeta) => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 14, 18);

  if (meta?.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(meta.subtitle, 14, 25);
  }
  
  // Sort chronologically by insertion
  const sortedRecords = [...records].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  // Calculate summary stats
  const totalRecords = sortedRecords.length;
  const wonRecords = sortedRecords.filter(r => r.status === 'WON');
  const totalSalesCount = wonRecords.length;
  const totalSalesValue = wonRecords.reduce((acc, r) => acc + (r.closedValue || 0), 0);
  const totalPoints = wonRecords.reduce((acc, r) => {
    const pts = typeof r.points === 'number' && r.points > 0 ? r.points : calculatePointsFromProductId(r.productId || '');
    return acc + pts;
  }, 0);
  const conversionRate = totalRecords > 0 ? (totalSalesCount / totalRecords) * 100 : 0;
  const averageTicket = totalSalesCount > 0 ? totalSalesValue / totalSalesCount : 0;

  const tableColumn = ['Data', 'Vendedor', 'Cliente', 'WhatsApp', 'Status', 'Valor', 'Pts', 'Produto'];
  const tableRows = sortedRecords.map(r => {
    const pts = typeof r.points === 'number' && r.points > 0 ? r.points : calculatePointsFromProductId(r.productId || '');
    return [
      safeFormatDate(r.createdAt, 'dd/MM/yy HH:mm'),
      r.consultantName || r.consultantId,
      r.customerName || '',
      r.customerPhone || '',
      r.status === 'LOST' ? 'Orçamento' : r.status === 'WON' ? 'Venda' : r.status,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.closedValue || r.budgetValue || 0),
      r.status === 'WON' ? pts : 0,
      r.productId || ''
    ];
  });

  autoTable(doc, {
    startY: meta?.subtitle ? 30 : 25,
    head: [tableColumn],
    body: tableRows,
    headStyles: { fillColor: [30, 41, 59] },
    margin: { bottom: 15 },
    styles: { fontSize: 8 }
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 40;

  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Resumo Estatístico do Período', 14, finalY);

  const statsRows = [
    ['Escopo do Relatório', meta?.subtitle || 'Visão Geral da Loja'],
    ['Total Geral de Atendimentos', totalRecords.toString()],
    ['Total de Vendas Concluídas', totalSalesCount.toString()],
    ['Taxa de Conversão (Vendas / Atendimentos)', `${conversionRate.toFixed(1)}%`],
    ['Total de Vendas em Valor (R$)', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSalesValue)],
    ['Pontos de Lentes Acumulados', totalPoints.toString()],
    ['Ticket Médio (TKM) por Venda', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageTicket)]
  ];

  autoTable(doc, {
    startY: finalY + 4,
    head: [['Indicador', 'Valor']],
    body: statsRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 9 }
  });

  doc.save(`${filename}.pdf`);
};
