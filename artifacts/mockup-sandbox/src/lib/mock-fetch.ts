/**
 * Custom fetch com fallback para mock
 * Tenta fazer chamadas reais para a API, se falhar usa o mock
 */

import { mockValidateDoc, mockGenerateDoc } from "./mock-validation";
import { API_URL, IS_ONLINE_MODE } from "@/config/api";

const originalFetch = globalThis.fetch;

export async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();

  // Se em modo online, tenta usar a API real primeiro
  if (IS_ONLINE_MODE && API_URL) {
    try {
      const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
      const response = await originalFetch(fullUrl, init);
      return response;
    } catch (error) {
      console.warn(`Failed to fetch from API: ${url}, falling back to mock`, error);
      // Continua para o mock fallback abaixo
    }
  }

  // Mock para validação (fallback)
  if (url.includes("/validator/validate")) {
    try {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const result = mockValidateDoc(
        body.data?.documentation || "",
        body.data?.module || undefined
      );
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Mock validation error:", error);
      return new Response(JSON.stringify({ error: "Erro na validação" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Mock para geração
  if (url.includes("/validator/generate")) {
    try {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const result = mockGenerateDoc(
        body.data?.cardContent || "",
        body.data?.module || undefined
      );
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Mock generation error:", error);
      return new Response(JSON.stringify({ error: "Erro na geração" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Mock para status de autenticação
  if (url.includes("/auth/status")) {
    return new Response(JSON.stringify({ hasUsers: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Mock para dados do usuário
  if (url.includes("/auth/me")) {
    return new Response(
      JSON.stringify({
        id: 1,
        email: "user@validador.local",
        name: "Usuário",
        isAdmin: false,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Mock para listar campos
  if (url.includes("/fields")) {
    return new Response(JSON.stringify({ fields: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Tenta fazer a chamada original para todas as outras requisições
  try {
    return await originalFetch(input, init);
  } catch (error) {
    console.warn(`Failed to fetch ${url}, attempting mock fallback`);
    return new Response(JSON.stringify({ error: "API indisponível" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Substitui o fetch global
if (typeof window !== "undefined") {
  (globalThis as any).fetch = customFetch;
}

export default customFetch;
