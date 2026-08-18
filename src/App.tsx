/**
 * FIX DE EMERGÊNCIA: CONECTIVIDADE FIREBASE E CSP
 * 
 * O que estava bloqueando: 
 * A Política de Segurança de Conteúdo (CSP) no index.html não permitia conexões
 * com os domínios do Firebase Authentication (como *.firebaseapp.com) nem a injeção
 * de scripts necessários para Auth (como apis.google.com). Isso causava falhas
 * silenciosas ou travamentos na inicialização da autenticação.
 *
 * Como foi resolvido:
 * 1. O index.html foi atualizado para incluir 'https://*.firebaseapp.com' no connect-src
 *    e 'https://apis.google.com' no script-src.
 * 2. Adicionados logs de diagnóstico e tratamento de erro ("try-catch" de emergência)
 *    no onAuthStateChanged para evitar tela branca em caso de falha de rede/CSP.
 * 3. O aplicativo agora exibe uma mensagem de falha e botão de "Tentar Novamente"
 *    se a autenticação não puder ser inicializada, prevenindo o travamento infinito.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import CRMMainScreen from './presentation/CRMMainScreen';
import HistoryScreen from './presentation/HistoryScreen';
import LeadsScreen from './presentation/LeadsScreen';
import PainelResumoScreen from './presentation/PainelResumoScreen';
import SettingsScreen from './presentation/SettingsScreen';
import QueueManager from './presentation/QueueManager';
import LoginScreen from './presentation/LoginScreen';
import { LayoutGrid, Clock, Users, Download, Menu, Sun, Moon, LogOut, Wifi, WifiOff, Settings, AlertTriangle, BarChart } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useAppStore } from './data/store';
import { useFirebaseSync } from './lib/firebaseSync';
import { auth, signOut } from './lib/firebase';
import { Logo } from './components/Logo';

export default function App() {
  useFirebaseSync();
  const [activeTab, setActiveTab] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('listadevez_last_tab');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Erro ao carregar listadevez_last_tab:", e);
    }
    return 0;
  });

  const { dailyQueues, selectedDate, userId, isQueueManagerOpen, setIsQueueManagerOpen, theme, setTheme } = useAppStore();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Persistir a aba ativa no localStorage
  useEffect(() => {
    try {
      localStorage.setItem('listadevez_last_tab', activeTab.toString());
    } catch (e) {
      console.error("Erro ao salvar listadevez_last_tab:", e);
    }
  }, [activeTab]);

  // Listener de Page Visibility para evitar o reset ao voltar ao app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          const saved = localStorage.getItem('listadevez_last_tab');
          if (saved !== null) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) {
              setActiveTab((prev) => (prev !== parsed ? parsed : prev));
            }
          }
        } catch (e) {
          console.error("Erro ao restaurar aba no visibilitychange:", e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Proteção contra acesso a código-fonte e ferramentas de desenvolvedor (F12, Ctrl+Shift+I, Ctrl+U, ContextMenu)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloqueia F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Bloqueia Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
      if (e.ctrlKey && (e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))) {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Permite contexto básico apenas se estiver interagindo em inputs de texto
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = auth.onAuthStateChanged(
        (user) => {
          setIsAuthLoading(false);
          setAuthError(null);
          if (user) {
            useAppStore.setState({ userId: user.uid });
          } else {
            useAppStore.setState({ userId: null });
          }
        },
        (error) => {
          console.error("🚨 [EMERGÊNCIA] Erro na inicialização do Firebase Auth:", error);
          setAuthError(error.message || "Erro desconhecido ao conectar com servidor.");
          setIsAuthLoading(false);
        }
      );
    } catch (err: any) {
      console.error("🚨 [EMERGÊNCIA] Falha crítica ao anexar listener do Firebase:", err);
      setAuthError(err?.message || "Falha crítica de inicialização.");
      setIsAuthLoading(false);
    }
    return () => unsub();
  }, []);

  const currentQueue = dailyQueues[selectedDate];
  const activeConsultantsCount = currentQueue?.activeConsultantIds?.length || 0;

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'paper' : 'dark');
  };

  const handleLogout = () => {
    signOut(auth).catch((err) => {
      console.error("Erro ao fazer logout:", err);
    });
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-blue-400 font-bold tracking-widest text-xs uppercase animate-pulse">
          Conectando...
        </p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="text-red-500" size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Erro de Conexão</h2>
        <p className="text-slate-400 mb-6 text-sm max-w-sm">
          Não foi possível conectar aos servidores de autenticação. Pode ser um bloqueio de rede ou configuração (CSP).<br/><br/>
          <span className="font-mono text-xs text-red-400 bg-red-950/50 p-2 block rounded mt-2">{authError}</span>
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!userId) {
    return (
      <>
        <LoginScreen />
      </>
    );
  }


  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col h-screen w-full font-sans overflow-hidden selection:bg-blue-500/30 transition-colors duration-200 ${
      isDark ? 'theme-dark bg-[#0F172A] text-slate-100' : 'theme-paper bg-[#F5EFE6] text-stone-800'
    }`}>
      
      {/* Top Header */}
      <header className={`flex items-center justify-between p-5 backdrop-blur-md border-b z-10 shrink-0 transition-colors duration-200 ${
        isDark ? 'bg-[#1E293B]/90 border-slate-700/80 text-slate-100' : 'bg-[#EFECE6]/90 border-stone-200/80 text-stone-800'
      }`}>
        <div className="flex items-center gap-3">
          <Logo size={30} />
          {!isOnline && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/35 text-red-400 text-[10px] font-bold tracking-widest uppercase animate-pulse">
              <WifiOff size={12} className="shrink-0 text-red-400" />
              Offline
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsQueueManagerOpen(true)}
            className={`relative p-2.5 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
              isDark 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-300' 
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
            aria-label="Gerenciar Fila"
          >
            <Menu size={23} />
            {activeConsultantsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 min-w-4 h-4 rounded-full flex items-center justify-center">
                {activeConsultantsCount}
              </span>
            )}
          </button>
          <button 
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
              isDark 
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-300' 
                : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 text-amber-600'
            }`}
            aria-label="Alternar Tema"
          >
            {isDark ? <Moon size={23} /> : <Sun size={23} className="text-amber-500" />}
          </button>
          <button 
            onClick={() => setActiveTab(4)}
            className={`p-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
              activeTab === 4 
                ? (isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-indigo-100 text-indigo-700 border border-indigo-300')
                : (isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100')
            }`}
            aria-label="Ajustes"
          >
            <Settings size={23} />
          </button>
          <button 
            onClick={handleLogout}
            className={`p-2.5 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 ${
              isDark 
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 hover:text-red-300' 
                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
            }`}
            aria-label="Sair"
          >
            <LogOut size={23} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto relative transition-colors duration-200 ${
        isDark ? 'bg-[#0F172A]' : 'bg-[#F5EFE6]'
      }`}>
        {activeTab === 0 && <CRMMainScreen />}
        {activeTab === 1 && <HistoryScreen />}
        {activeTab === 2 && <PainelResumoScreen />}
        {activeTab === 3 && <LeadsScreen />}
        {activeTab === 4 && <SettingsScreen />}
      </main>
      
      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t flex justify-around p-2 pb-safe z-10 shrink-0 transition-colors duration-200 ${
        isDark ? 'bg-[#1E293B]/95 border-slate-700/80' : 'bg-[#EFECE6]/95 border-stone-200/90'
      }`}>
        <TabButton active={activeTab === 0} onClick={() => setActiveTab(0)} icon={<LayoutGrid />} label="Vendas" isDark={isDark} />
        <TabButton active={activeTab === 1} onClick={() => setActiveTab(1)} icon={<Clock />} label="Histórico" isDark={isDark} />
        <TabButton active={activeTab === 2} onClick={() => setActiveTab(2)} icon={<BarChart />} label="Painel" isDark={isDark} />
        <TabButton active={activeTab === 3} onClick={() => setActiveTab(3)} icon={<Users />} label="Leads" isDark={isDark} />
        <TabButton active={activeTab === 4} onClick={() => setActiveTab(4)} icon={<Settings />} label="Config" isDark={isDark} />
      </nav>

      {/* Overlay Modals */}
      <AnimatePresence>
        {isQueueManagerOpen && (
          <QueueManager onClose={() => setIsQueueManagerOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, isDark }: { active: boolean; onClick: () => void; icon: React.ReactElement; label: string; isDark: boolean }) {
  const activeColor = isDark ? 'text-blue-400' : 'text-blue-600';
  const inactiveColor = isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-800';

  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center p-2 pt-3 w-16 transition-all duration-300 focus:outline-none ${active ? activeColor : inactiveColor}`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110 -translate-y-1' : ''}`}>
        {React.cloneElement(icon, { size: 31, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className={`text-[10px] mt-1 font-bold tracking-wide transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>
        {label}
      </span>
      {/* Active Indicator Dot */}
      <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-600'} mt-1 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}></div>
    </button>
  );
}
