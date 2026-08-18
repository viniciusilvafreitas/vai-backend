import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export function AlertDialog({
  isOpen,
  title,
  message,
  buttonText = 'Entendi',
  onClose
}: AlertDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white border border-stone-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl overflow-hidden text-center text-stone-800"
          >
            <div className="flex flex-col items-center text-center">
              <div className="p-3 rounded-full mb-3 bg-blue-50 text-blue-600">
                <Info size={24} />
              </div>
              <h1 className="text-xl font-bold text-stone-800 mb-1.5 tracking-tight">{title}</h1>
              <p className="text-stone-600 text-sm mb-6 font-medium">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full h-12 rounded-2xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
            >
              {buttonText}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

