const DEFAULT_MODEL = 'gemini-3.6-flash';
// Usados quando o modelo principal está sobrecarregado (503) ou limitado (429).
const DEFAULT_FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const API_TIMEOUT_MS = 65_000;

class GeminiProxyError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'GeminiProxyError';
    this.code = code;
    this.status = status;
  }
}

const wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
const list = (value) => String(value || '').split(',').map(item => item.trim()).filter(Boolean);

function modelChain(env = process.env) {
  const primary = String(env.GEMINI_MODEL || env.EXPO_PUBLIC_GEMINI_MODEL || DEFAULT_MODEL).trim();
  const fallbacks = env.GEMINI_FALLBACK_MODELS === undefined ? DEFAULT_FALLBACK_MODELS : list(env.GEMINI_FALLBACK_MODELS);
  return [primary, ...fallbacks.filter(model => model !== primary)];
}

// Uma chamada a um modelo. Erros de capacidade (429/5xx) são "recuperáveis": quem
// chama pode tentar o próximo modelo. Chave ou modelo recusado (4xx) não é.
async function callModel(model, apiKey, body, { fetchImpl, retries, sleep }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.ok) return response.json();

      const retryable = [500, 502, 503, 504].includes(response.status);
      if (retryable && attempt < retries) {
        await sleep(1200 * (attempt + 1));
        continue;
      }
      if (response.status === 429) throw Object.assign(new GeminiProxyError('QUOTA', 'A cota da IA foi atingida ou há requisições demais.', 429), { recoverable: true });
      if ([400, 401, 403, 404].includes(response.status)) {
        throw new GeminiProxyError('CONFIG', 'A chave ou o modelo do Gemini foi recusado pelo Google.', 503);
      }
      if (retryable) throw Object.assign(new GeminiProxyError('UNAVAILABLE', 'O serviço de IA está temporariamente indisponível.', 503), { recoverable: true });
      throw new GeminiProxyError('UNKNOWN', `O Gemini respondeu com o status ${response.status}.`, 502);
    } catch (error) {
      if (error instanceof GeminiProxyError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw Object.assign(new GeminiProxyError('TIMEOUT', 'A análise demorou mais que o esperado.', 504), { recoverable: true });
      }
      if (attempt >= retries) throw Object.assign(new GeminiProxyError('UNAVAILABLE', 'Não foi possível conectar ao Gemini.', 503), { recoverable: true });
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function generateContent(body, { retries = 1, env = process.env, fetchImpl = fetch, sleep = wait } = {}) {
  const apiKey = String(env.GEMINI_API_KEY || env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new GeminiProxyError('CONFIG', 'A chave do Gemini não está configurada no servidor.', 503);

  let lastError;
  for (const model of modelChain(env)) {
    try {
      return await callModel(model, apiKey, body, { fetchImpl, retries, sleep });
    } catch (error) {
      lastError = error;
      // Só passa ao próximo modelo quando o problema é de capacidade; chave inválida
      // ou pedido recusado falhariam do mesmo jeito em qualquer modelo.
      if (!(error instanceof GeminiProxyError) || !error.recoverable) throw error;
      console.warn(`Gemini: ${model} indisponível (${error.code}); tentando o próximo modelo.`);
    }
  }
  throw lastError;
}

module.exports = { DEFAULT_MODEL, DEFAULT_FALLBACK_MODELS, GeminiProxyError, generateContent, modelChain };
