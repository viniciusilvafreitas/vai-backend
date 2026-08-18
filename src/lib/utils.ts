import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import DOMPurify from 'dompurify';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const sanitizeInput = (input: string): string => {
  if (!input) return input;
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

/**
 * Converte de forma segura qualquer valor (string com vírgula, ponto, símbolos de moeda ou número)
 * em um Number válido, prevenindo problemas de concatenação de strings e valores astronômicos.
 */
export const parseCurrency = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let cleanStr = val.toString().trim();
  if (cleanStr.includes(',')) {
    cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
  }
  cleanStr = cleanStr.replace(/[^0-9.-]/g, '');
  const parsed = Number(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formata um número ou string numérica para o padrão BRL (R$ 1.250,00).
 */
export const formatCurrency = (val: number | string | undefined | null): string => {
  const num = parseCurrency(val);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
};

