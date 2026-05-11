/**
 * Custom fetch com fallback para mock
 * Substitui as chamadas de API pela versão mock quando a API não estiver disponível
 */

import { mockValidateDoc, mockGenerateDoc } from "./mock-validation";

const originalFetch = globalThis.fetch;

export async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();

  // Mock para validação
  if (url.includes("/api/validator/validate")) {
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
  if (url.includes("/api/validator/generate")) {
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
  if (url.includes("/api/auth/status")) {
    return new Response(JSON.stringify({ hasUsers: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Mock para dados do usuário
  if (url.includes("/api/auth/me")) {
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
  if (url.includes("/api/fields")) {
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
