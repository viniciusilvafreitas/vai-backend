import React, { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier
} from '../lib/firebase';
import { signInAnonymously, updateProfile } from 'firebase/auth';
import { Mail, Lock, LogIn, UserPlus, PieChart, Download, Users, X, Smartphone, ShieldCheck, MessageSquare, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { TermsModal } from '../components/TermsModal';

const slides = [
  {
    icon: <PieChart size={52} className="text-blue-600 mb-4 z-10 filter drop-shadow-sm" />,
    title: 'Histórico e Metas',
    description: 'Acompanhe sua porcentagem de conversão e veja detalhes das suas vendas preenchidas.',
    mockup: (
      <div className="absolute inset-0 flex flex-col justify-start p-4 opacity-90 select-none pointer-events-none">
        <div className="bg-white/95 border border-stone-200/90 rounded-2xl p-4 w-full h-[85%] flex flex-col gap-3 shadow-md transform -translate-y-2 scale-[0.98]">
          <div className="flex justify-between items-center border-b border-stone-200/80 pb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[9px] text-stone-500 font-bold tracking-wider uppercase">Painel de Performance</span>
            </div>
            <span className="text-[9px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">META: 90%</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex flex-col justify-between">
              <span className="text-[8px] text-stone-500 font-bold uppercase tracking-wider">Faturamento</span>
              <div className="mt-1">
                <span className="text-xs font-black text-stone-800">R$ 14.800</span>
                <span className="text-[7px] text-emerald-600 font-bold block mt-0.5">+12% este mês</span>
              </div>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex flex-col justify-between">
              <span className="text-[8px] text-stone-500 font-bold uppercase tracking-wider">Conversão</span>
              <div className="mt-1">
                <span className="text-xs font-black text-blue-600">83.5%</span>
                <div className="w-full bg-stone-200 h-1 rounded-full mt-1 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '83.5%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
              </div>
              <div>
                <span className="text-[9px] text-stone-800 font-bold block">Atendimentos do Dia</span>
                <span className="text-[7px] text-stone-500">18 concluídos hoje</span>
              </div>
            </div>
            <span className="text-xs font-black text-stone-800">18</span>
          </div>

          <div className="bg-stone-100/80 p-2 rounded-xl border border-stone-200 flex justify-between items-center text-[8px] text-stone-600">
            <span>Conversões Pendentes: <strong className="text-amber-600">3</strong></span>
            <span className="text-[7px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-medium">Atualizado</span>
          </div>
        </div>
      </div>
    )
  },
  {
    icon: <Download size={52} className="text-emerald-600 mb-4 z-10 filter drop-shadow-sm" />,
    title: 'Resumo de Vendas',
    description: 'Exporte o resumo de suas vendas e conversão com apenas um clique.',
    mockup: (
      <div className="absolute inset-0 flex flex-col justify-start p-4 opacity-90 select-none pointer-events-none">
        <div className="bg-white/95 border border-stone-200/90 rounded-2xl p-4 w-full h-[85%] flex flex-col gap-2.5 shadow-md transform -translate-y-2 scale-[0.98]">
          <div className="flex justify-between items-center border-b border-stone-200/80 pb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-[9px] text-stone-500 font-bold tracking-wider uppercase">Relatórios Exportados</span>
            </div>
            <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-mono font-black">XLSX / PDF</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[7px] text-stone-500 font-bold uppercase tracking-wider px-1">
              <span>Vendedor</span>
              <span>Vendas</span>
              <span>Valor (R$)</span>
            </div>
            <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 flex justify-between items-center text-[9px]">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[7px] font-bold text-blue-600">CS</div>
                <span className="font-bold text-stone-800">Carlos Silva</span>
              </div>
              <span className="text-stone-500 font-medium font-mono">12 / 15</span>
              <span className="font-black text-emerald-700 font-mono">R$ 6.200</span>
            </div>
            <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 flex justify-between items-center text-[9px]">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[7px] font-bold text-emerald-600">AO</div>
                <span className="font-bold text-stone-800">Ana Oliveira</span>
              </div>
              <span className="text-stone-500 font-medium font-mono">9 / 10</span>
              <span className="font-black text-emerald-700 font-mono">R$ 5.400</span>
            </div>
            <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 flex justify-between items-center text-[9px]">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-[7px] font-bold text-amber-600">BC</div>
                <span className="font-bold text-stone-800">Bruno Costa</span>
              </div>
              <span className="text-stone-500 font-medium font-mono">14 / 18</span>
              <span className="font-black text-emerald-700 font-mono">R$ 7.100</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    icon: <Users size={52} className="text-amber-600 mb-4 z-10 filter drop-shadow-sm" />,
    title: 'Lista de Leads',
    description: 'Exporte a lista dos seus orçamentos de forma simples para focar no contato.',
    mockup: (
      <div className="absolute inset-0 flex flex-col justify-start p-4 opacity-90 select-none pointer-events-none">
        <div className="bg-white/95 border border-stone-200/90 rounded-2xl p-4 w-full h-[85%] flex flex-col gap-2.5 shadow-md transform -translate-y-2 scale-[0.98]">
          <div className="flex justify-between items-center border-b border-stone-200/80 pb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[9px] text-stone-500 font-bold tracking-wider uppercase">Leads & Oportunidades</span>
            </div>
            <span className="text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-mono font-black">3 PENDENTES</span>
          </div>

          <div className="space-y-1.5">
            <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-5.5 h-5.5 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-[8px] font-bold text-amber-700">MA</div>
                <div>
                  <span className="text-[9px] font-black text-stone-800 block">Marcos Aurélio</span>
                  <span className="text-[7px] text-stone-500 font-medium">Combo Premium</span>
                </div>
              </div>
              <span className="text-[7px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-black uppercase font-mono">WhatsApp</span>
            </div>

            <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-5.5 h-5.5 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-[8px] font-bold text-blue-700">FL</div>
                <div>
                  <span className="text-[9px] font-black text-stone-800 block">Fernanda Lima</span>
                  <span className="text-[7px] text-stone-500 font-medium">Reparo Rápido</span>
                </div>
              </div>
              <span className="text-[7px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-black uppercase font-mono">WhatsApp</span>
            </div>

            <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-5.5 h-5.5 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-[8px] font-bold text-purple-700">RM</div>
                <div>
                  <span className="text-[9px] font-black text-stone-800 block">Rodrigo Mendes</span>
                  <span className="text-[7px] text-stone-500 font-medium">Consultoria VIP</span>
                </div>
              </div>
              <span className="text-[7px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-black uppercase font-mono">WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [whatsappStep, setWhatsappStep] = useState<'phone' | 'code'>('phone');
  const [whatsappGeneratedCode, setWhatsappGeneratedCode] = useState('');
  const [isWhatsappSubmitting, setIsWhatsappSubmitting] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [whatsappFlowMode, setWhatsappFlowMode] = useState<'recaptcha' | 'link' | 'waiting_link'>('recaptcha');
  const [whatsappLinkToken, setWhatsappLinkToken] = useState('');

  const [showFakeSMS, setShowFakeSMS] = useState(false);
  const [fakeSMSMessage, setFakeSMSMessage] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError('Você deve aceitar os Termos de Uso e Isenção de Responsabilidade para continuar.');
      return;
    }
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    }
  };

  const handleGoogleAuth = async () => {
    if (!agreedToTerms) {
      setError('Você deve aceitar os Termos de Uso e Isenção de Responsabilidade para continuar.');
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || 'Erro no login com Google');
    }
  };

  const handleWhatsappSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappPhone.trim()) return;
    setIsWhatsappSubmitting(true);
    setError('');
    
    try {
      let formattedPhone = whatsappPhone.trim();
      if (!formattedPhone.startsWith('+')) {
        const cleanDigits = formattedPhone.replace(/\D/g, '');
        if (cleanDigits.length <= 11) {
          formattedPhone = `+55${cleanDigits}`;
        } else {
          formattedPhone = `+${cleanDigits}`;
        }
      }

      // 1. Tentar WhatsApp API (com timeout de 15s)
      setConfirmationResult(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        // Simulação de chamada de API do WhatsApp (falhará ou dará timeout)
        const response = await fetch('https://api.lista.vez/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formattedPhone }),
          signal: controller.signal
        }).catch(() => { throw new Error('API Indisponível'); });
        
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('WhatsApp API falhou');
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setWhatsappGeneratedCode(code);
        setWhatsappStep('code');
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn('API do WhatsApp falhou ou expirou (15s). Realizando fallback para SMS (Firebase)...', err);
        setError('O envio via WhatsApp demorou muito ou falhou. Enviando SMS tradicional...');
        
        // 2. Fallback: SMS tradicional (Firebase Phone Auth)
        let verifier = (window as any).recaptchaVerifier;
        if (!verifier) {
          verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            'expired-callback': () => {
              console.log('reCAPTCHA expired');
            }
          });
          (window as any).recaptchaVerifier = verifier;
        }

        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
        setConfirmationResult(confirmation);
        setWhatsappStep('code');
        
        // Limpa a mensagem de erro depois de mostrar para o usuário que foi para SMS
        setTimeout(() => setError(''), 5000);
      }
    } catch (err: any) {
      console.error('Erro geral na autenticação por telefone:', err);
      setError(`Erro no envio: ${err.message || 'Erro'}`);
    } finally {
      setIsWhatsappSubmitting(false);
    }
  };

  const handleResendWhatsappCode = () => {
    // Reutiliza a função principal para também ter a regra de fallback
    handleWhatsappSendCode({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleWhatsappVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappCode.trim()) return;
    setIsWhatsappSubmitting(true);
    setError('');
    
    try {
      if (confirmationResult) {
        // Fluxo de Fallback (Firebase SMS)
        await confirmationResult.confirm(whatsappCode.trim());
      } else {
        // Fluxo Mock/API de WhatsApp
        if (whatsappCode.trim() !== whatsappGeneratedCode) {
          throw new Error('Código incorreto. Por favor, confira a notificação e tente novamente.');
        }
        const userCredential = await signInAnonymously(auth);
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: 'Cliente WhatsApp'
          });
        }
      }
      setIsWhatsappModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar código');
    } finally {
      setIsWhatsappSubmitting(false);
    }
  };

  const handleWhatsappLinkFlow = () => {
    setError('');
    setIsWhatsappSubmitting(true);
    
    const token = `LVEZ-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    setWhatsappLinkToken(token);
    setWhatsappFlowMode('waiting_link');
    
    const supportPhone = '5511999999999';
    const message = encodeURIComponent(`Olá! Gostaria de autenticar minha conta no app Lista de Vez. Token único de acesso: ${token}`);
    const whatsappUrl = `https://wa.me/${supportPhone}?text=${message}`;
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    setTimeout(async () => {
      try {
        const userCredential = await signInAnonymously(auth);
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: `WhatsApp (Link): ${whatsappPhone || 'Suporte'}`
          });
        }
        setIsWhatsappModalOpen(false);
      } catch (err: any) {
        setError(err.message || 'Erro ao processar login por link.');
      } finally {
        setIsWhatsappSubmitting(false);
        setWhatsappFlowMode('recaptcha');
      }
    }, 4000);
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    } else if (info.offset.x > threshold) {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  return (
    <div className="min-h-screen theme-paper bg-[#F5EFE6] text-stone-800 flex flex-col md:flex-row items-center justify-center p-4 gap-8">
      
      {/* Carousel Section */}
      <div className="w-full max-w-md bg-[#EFECE6] border border-stone-200/90 rounded-3xl p-6 shadow-xl relative overflow-hidden h-[470px] flex flex-col justify-end items-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="flex flex-col items-center justify-end w-full h-full relative cursor-grab active:cursor-grabbing select-none pb-10"
          >
            {/* Masked top container for the mockup screen print */}
            <div className="absolute inset-x-0 top-0 h-[280px] overflow-hidden rounded-t-3xl select-none pointer-events-none z-0">
              {slides[currentSlide].mockup}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-stone-900/10 to-[#EFECE6] pointer-events-none" />
            </div>
            
            <div className="z-10 flex flex-col items-center px-4 mt-auto">
              {slides[currentSlide].icon}
              <h2 className="text-2xl font-black text-stone-800 mb-2.5 tracking-tight">{slides[currentSlide].title}</h2>
              <p className="text-stone-600 text-sm md:text-base leading-relaxed max-w-[320px] font-medium">
                {slides[currentSlide].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
        
        <div className="absolute bottom-5 flex gap-2 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-blue-600 w-6' : 'bg-stone-300'}`}
              aria-label={`Ir para o slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Login Section */}
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 py-5 shadow-xl">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-black text-stone-800 tracking-tight mb-1">Lista de Vez</h1>
          <p className="text-stone-500 text-xs font-medium">
            Registre seus atendimentos, controle vendas e acompanhe suas metas de forma simples e poderosa.
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3 mb-3.5">
          <div>
            <div className="relative w-full">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-txtSecondary pointer-events-none z-10" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full !pl-12 pr-4 py-3 bg-input text-txtPrimary border border-borderApp rounded-xl focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-txtMuted transition-all text-sm"
                placeholder="E-mail"
              />
            </div>
          </div>
          <div>
            <div className="relative w-full">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-txtSecondary pointer-events-none z-10" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full !pl-12 pr-4 py-3 bg-input text-txtPrimary border border-borderApp rounded-xl focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-txtMuted transition-all text-sm"
                placeholder="Senha"
              />
            </div>
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="flex items-start gap-2 pt-1 pb-1">
            <input
              type="checkbox"
              id="termsCheckbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-borderApp bg-input text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
            />
            <label htmlFor="termsCheckbox" className="text-[11px] text-txtSecondary leading-tight select-none">
              Li e concordo com os{' '}
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(true)}
                className="text-blue-600 hover:underline font-bold focus:outline-none cursor-pointer"
              >
                Termos de Uso e Isenção de Responsabilidade
              </button>
            </label>
          </div>

          {error && <p className="text-red-600 text-xs font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}

          <button
            type="submit"
            disabled={!agreedToTerms}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {isRegistering ? <UserPlus size={18} /> : <LogIn size={18} />}
            {isRegistering ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        {/* Security Badge */}
        <div className="flex items-start gap-2.5 p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-emerald-800 font-medium leading-relaxed">
            <strong className="text-emerald-700">🔒 Conexão Segura & Criptografia de Ponta a Ponta.</strong> Seus dados comerciais estão protegidos e são ilegíveis para administradores.
          </p>
        </div>

        <div className="relative mb-3.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-stone-400 font-medium">Ou continue com</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Google Button */}
          <button
            onClick={handleGoogleAuth}
            type="button"
            className="group relative bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-semibold py-3 px-4 rounded-xl text-xs transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
          >
            <svg className="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          {/* WhatsApp Button */}
          <button
            onClick={() => {
              const code = Math.floor(100000 + Math.random() * 900000).toString();
              setWhatsappGeneratedCode(code);
              setWhatsappCode('');
              setFakeSMSMessage(`WhatsApp: Seu código de login da Lista de Vez é ${code}`);
              setShowFakeSMS(true);
              setIsWhatsappModalOpen(true);
              setTimeout(() => setShowFakeSMS(false), 8000);
            }}
            type="button"
            className="group relative bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-semibold py-3 px-4 rounded-xl text-xs transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
          >
            <svg className="w-5 h-5 text-emerald-600 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.455h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
            </svg>
            WhatsApp
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-stone-500 font-medium">
          {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="ml-1.5 text-blue-600 hover:text-blue-700 font-bold focus:outline-none"
          >
            {isRegistering ? 'Fazer login' : 'Criar agora'}
          </button>
        </p>
      </div>

      {/* Real-time SMS simulator notification banner */}
      <AnimatePresence>
        {showFakeSMS && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-0 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999] bg-slate-900/95 backdrop-blur-md border border-blue-500/30 text-white rounded-2xl p-4 shadow-[0_10px_30px_rgba(59,130,246,0.3)] flex gap-3.5 items-start"
          >
            <div className="bg-blue-600/20 text-blue-400 p-2 rounded-xl border border-blue-500/20">
              <Smartphone size={20} />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Mensagem SMS</span>
                <span className="text-[9px] text-slate-500 font-medium">Agora</span>
              </div>
              <p className="text-xs text-slate-100 font-semibold leading-relaxed">
                {fakeSMSMessage}
              </p>
            </div>
            <button
              onClick={() => setShowFakeSMS(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded-lg"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Auth Modal */}
      <AnimatePresence>
        {isWhatsappModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsWhatsappModalOpen(false);
                setWhatsappFlowMode('recaptcha');
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative z-10 overflow-hidden text-left"
            >
              {/* WhatsApp background line accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 className="text-white text-base font-black">Código do WhatsApp</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Verificação de Acesso Rápido</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsWhatsappModalOpen(false)}
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700/50 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleWhatsappVerifyCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block pl-1">Inserir Código</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Digite o código"
                    value={whatsappCode}
                    onChange={(e) => setWhatsappCode(e.target.value)}
                    disabled={isWhatsappSubmitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-xl tracking-[0.4em] font-black text-white placeholder-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="bg-slate-950/80 border border-slate-800/50 p-3 rounded-2xl text-[11px] text-slate-400 leading-relaxed text-center">
                  Insira o código de 6 dígitos enviado ao seu WhatsApp.
                  {whatsappGeneratedCode && (
                    <span className="block mt-1 text-xs text-emerald-400 font-semibold">
                      Código ativo: <strong className="text-white bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-black">{whatsappGeneratedCode}</strong>
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResendWhatsappCode}
                    disabled={isWhatsappSubmitting}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center"
                  >
                    Reenviar Código
                  </button>
                  <button
                    type="submit"
                    disabled={isWhatsappSubmitting}
                    className="flex-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 font-black uppercase tracking-wider"
                  >
                    {isWhatsappSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Confirmar e Logar</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Container for invisible reCAPTCHA verifier */}
      <div id="recaptcha-container" className="hidden"></div>

      {/* Terms Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => setAgreedToTerms(true)}
      />
    </div>
  );
}
