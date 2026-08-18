import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 28 }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div 
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-2 text-white shadow-md shadow-blue-500/20 shrink-0"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-full h-full"
        >
          {/* List queue / check mark icon */}
          <path d="M4 6h16" />
          <path d="M4 12h10" />
          <path d="M4 18h7" />
          <path d="m16 16 2 2 4-4" strokeWidth="3" className="text-emerald-300" />
        </svg>
      </div>
      <span className="font-black tracking-tight text-txtPrimary text-lg">
        Lista de Vez
      </span>
    </div>
  );
}

export default Logo;
