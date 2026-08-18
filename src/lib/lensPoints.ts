/**
 * Motor de Cálculo Automático de Pontos Lentes por Regra
 */

export function calculateLensPoints(tipo: string, linha: string, modelo: string): number {
  if (!tipo || !linha || !modelo) return 0;
  
  const t = tipo.trim().toUpperCase();
  const l = linha.trim().toUpperCase();
  const m = modelo.trim().toUpperCase();

  // 1. VS + Personalizada:
  //    Great ➔ 1 PONTO
  if (t === 'VS' && l === 'PERSONALIZADA') {
    if (m === 'GREAT') return 1;
  }

  // 2. Multi + Personalizada:
  //    Best ➔ 2 PONTOS
  //    Classy ➔ 4 PONTOS
  //    Great ➔ 6 PONTOS
  if (t === 'MULTI' && l === 'PERSONALIZADA') {
    if (m === 'BEST') return 2;
    if (m === 'CLASSY') return 4;
    if (m === 'GREAT') return 6;
  }

  // 3. VS + Prime:
  //    Better ➔ 8 PONTOS
  //    Inspire ➔ 10 PONTOS
  //    First / First Class ➔ 12 PONTOS
  if (t === 'VS' && l === 'PRIME') {
    if (m === 'BETTER') return 8;
    if (m === 'INSPIRE') return 10;
    if (m === 'FIRST' || m === 'FIRST CLASS') return 12;
  }

  // 4. Multi + Prime:
  //    Better ➔ 15 PONTOS
  //    Inspire ➔ 18 PONTOS
  //    First / First Class ➔ 20 PONTOS
  if (t === 'MULTI' && l === 'PRIME') {
    if (m === 'BETTER') return 15;
    if (m === 'INSPIRE') return 18;
    if (m === 'FIRST' || m === 'FIRST CLASS') return 20;
  }

  // 5. Outros / Não especificado ➔ 0 PONTOS
  return 0;
}

export function calculatePointsFromProductId(productId: string): number {
  if (!productId) return 0;
  const parts = productId.split(' | ').map(p => p.trim());
  if (parts.length >= 3) {
    const tipo = parts[0];
    const linha = parts[1];
    const modeloWithObs = parts[2];
    const modelo = modeloWithObs.split(' (Obs:')[0].trim();
    return calculateLensPoints(tipo, linha, modelo);
  }
  return 0;
}
