import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X, Check } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-card text-txtPrimary border border-borderApp rounded-3xl p-6 w-full max-w-lg shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-borderApp shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-txtPrimary tracking-tight">Termos de Uso e Isenção</h3>
                  <p className="text-[11px] text-txtSecondary font-medium">Lista de Vez - Isenção de Responsabilidade</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-txtSecondary hover:text-txtPrimary hover:bg-hover transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="py-4 overflow-y-auto space-y-4 text-xs text-txtSecondary leading-relaxed pr-1 flex-1">
              <section className="space-y-1.5">
                <h4 className="font-bold text-txtPrimary text-sm">1. Natureza do Aplicativo</h4>
                <p>
                  O aplicativo Lista de Vez é fornecido como uma ferramenta de gestão de atendimento, fila de consultores, controle de orçamento e registro de vendas comerciais.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-txtPrimary text-sm">2. Isenção de Responsabilidade e Dados</h4>
                <p>
                  Os desenvolvedores e mantenedores do aplicativo não se responsabilizam por eventuais perdas de dados, inconsistências em relatórios fiscais/contábeis, falhas de sincronização na nuvem ou exclusões acidentais resultantes do uso do sistema ou limpeza de cache local do navegador.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-txtPrimary text-sm">3. Responsabilidade das Informações</h4>
                <p>
                  Todas as informações inseridas, incluindo nomes de clientes, valores de orçamentos, lançamentos de vendas e metas, são de responsabilidade inteira e exclusiva do usuário operador da conta.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-txtPrimary text-sm">4. Aceite dos Termos</h4>
                <p>
                  Ao marcar a caixa de seleção na tela de autenticação e utilizar o sistema, o usuário declara ter lido, compreendido e concordado com integralidade destas disposições.
                </p>
              </section>
            </div>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-borderApp flex gap-3 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-input text-txtPrimary hover:bg-hover rounded-2xl font-bold text-sm transition-colors border border-borderApp cursor-pointer"
              >
                Fechar
              </button>
              {onAccept && (
                <button
                  onClick={() => {
                    onAccept();
                    onClose();
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  Concordar e Continuar
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
