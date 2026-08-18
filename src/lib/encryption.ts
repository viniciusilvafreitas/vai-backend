import CryptoJS from 'crypto-js';

// Get key from env or use a fallback for local encryption
const SECRET_KEY = (import.meta as any).env?.VITE_ENCRYPTION_KEY || 'vez-da-loja-secure-key-2024';

export const encryptData = (text: string): string => {
  if (!text) return text;
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (e) {
    return text;
  }
};

export const decryptData = (hash: string): string => {
  if (!hash) return hash;
  try {
    const bytes = CryptoJS.AES.decrypt(hash, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // Se a descriptografia falhar, tenta o base64 antigo (retrocompatibilidade)
    if (!decrypted) {
      return decodeURIComponent(escape(atob(hash)));
    }
    return decrypted;
  } catch (e) {
    // Fallback para o base64 antigo
    try {
      return decodeURIComponent(escape(atob(hash)));
    } catch (err) {
      return hash;
    }
  }
};
