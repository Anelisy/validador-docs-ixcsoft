/**
 * Configuração de ambiente para a aplicação
 * Detecta automaticamente se está em produção e usa a API URL correta
 */

export const API_URL = (() => {
  // Em desenvolvimento local, use localhost
  if (process.env.NODE_ENV === 'development') {
    return process.env.VITE_API_URL || 'http://localhost:3000/api';
  }

  // Em produção no GitHub Pages, use a URL da API Railway/Render
  const apiUrl = process.env.VITE_API_URL;
  
  if (!apiUrl) {
    console.warn(
      'VITE_API_URL não configurada. Usando modo offline.'
    );
    return null;
  }

  return apiUrl;
})();

export const IS_ONLINE_MODE = !!API_URL;
