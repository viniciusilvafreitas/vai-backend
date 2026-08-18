import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../data/store';

export function ProductSelector({ 
  lenteTipo, setLenteTipo, 
  linhaTipo, setLinhaTipo, 
  lentePers, setLentePers, 
  linhaPrime, setLinhaPrime,
  outrosValue, setOutrosValue
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const { outrosProducts, theme } = useAppStore();
  const isDark = theme === 'dark';
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSelection = () => {
    if (lenteTipo === 'Outros') {
      return outrosValue ? outrosValue : 'Outros';
    }
    if (!lenteTipo) return 'Selecionar Produto...';
    let res = lenteTipo;
    if (linhaTipo === 'Personalizada' && lentePers) res += ' ' + lentePers;
    else if (linhaTipo === 'Prime' && linhaPrime) res += ' ' + linhaPrime;
    return res;
  };

  const handleTipo = (t: string) => {
    setLenteTipo(t);
    if (t === 'Outros') {
      setLinhaTipo(''); setLentePers(''); setLinhaPrime('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setOutrosValue('');
    }
  };

  const btnActive = "bg-blue-600 border border-blue-600 text-white shadow-sm h-10 px-4 rounded-xl text-sm font-medium transition-all";
  const btnInactive = "bg-input border border-borderApp text-txtPrimary hover:bg-hover h-10 px-4 rounded-xl text-sm font-medium transition-all";

  const labelClass = "text-xs font-semibold tracking-wide uppercase text-txtSecondary mb-2";

  return (
    <div className="flex flex-col gap-2 w-full">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 flex items-center justify-between border border-borderApp bg-input rounded-2xl px-4 text-sm font-medium hover:border-brand focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-sm transition-all cursor-pointer text-txtPrimary"
      >
        <span className={lenteTipo ? "font-semibold text-txtPrimary" : "text-txtMuted"}>
          {formatSelection()}
        </span>
        {isOpen ? <ChevronUp size={18} className="text-txtSecondary" /> : <ChevronDown size={18} className="text-txtSecondary" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl border border-borderApp bg-card shadow-lg flex flex-col gap-4 mt-2 text-txtPrimary">
              
              <div>
                <p className={labelClass}>1. Tipo</p>
                <div className="flex flex-wrap gap-2">
                  {['VS', 'Multi', 'Outros'].map(t => (
                    <button key={t} type="button" onClick={() => handleTipo(t)} className={lenteTipo === t ? btnActive : btnInactive}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {(lenteTipo === 'VS' || lenteTipo === 'Multi') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className={labelClass}>2. Categoria</p>
                  <div className="flex flex-wrap gap-2">
                    {['Personalizada', 'Prime'].map(c => (
                      <button key={c} type="button" onClick={() => { setLinhaTipo(c); setLentePers(''); setLinhaPrime(''); }} className={linhaTipo === c ? btnActive : btnInactive}>
                        {c}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {(lenteTipo === 'VS' || lenteTipo === 'Multi') && linhaTipo === 'Personalizada' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className={labelClass}>3. Modelo</p>
                  <div className="flex flex-wrap gap-2">
                    {['Basic', 'Public', 'Best', 'Classy', 'Great'].map(m => (
                      <button key={m} type="button" onClick={() => setLentePers(m)} className={lentePers === m ? btnActive : btnInactive}>
                        {m}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {(lenteTipo === 'VS' || lenteTipo === 'Multi') && linhaTipo === 'Prime' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className={labelClass}>3. Modelo</p>
                  <div className="flex flex-wrap gap-2">
                    {['Better', 'Inspire', 'First'].map(m => (
                      <button key={m} type="button" onClick={() => setLinhaPrime(m)} className={linhaPrime === m ? btnActive : btnInactive}>
                        {m}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {lenteTipo === 'Outros' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
                  <div>
                     <p className={labelClass}>Descreva o Produto</p>
                     <input
                       ref={inputRef}
                       type="text"
                       placeholder="Ex: Armação Solar"
                       value={outrosValue}
                       onChange={(e) => setOutrosValue(e.target.value)}
                       className="w-full border border-borderApp bg-input text-txtPrimary placeholder:text-txtMuted p-3 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                     />
                  </div>
                  {outrosProducts && outrosProducts.length > 0 && (
                    <div>
                      <p className={labelClass}>Sugestões Rápidas</p>
                      <div className="flex flex-wrap gap-2">
                        {outrosProducts.map(op => (
                          <button key={op} type="button" onClick={() => setOutrosValue(op)} className={outrosValue === op ? btnActive : btnInactive}>
                            {op}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

