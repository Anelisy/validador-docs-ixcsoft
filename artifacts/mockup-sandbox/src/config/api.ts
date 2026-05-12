/**
 * Configuração de ambiente para a aplicação
 * Detecta automaticamente se está em produção e usa a API URL correta
 */

export const API_URL = (() => {
  const envUrl = process.env.VITE_API_URL;

  if (process.env.NODE_ENV === 'development') {
    return envUrl || 'http://localhost:3000/api';
  }

  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  }

  return null;
})();

export const IS_ONLINE_MODE = !!API_URL;
