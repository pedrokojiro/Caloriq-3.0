const DEFAULT_MODEL = 'gemini-3.6-flash';
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

async function generateContent(body, retries = 1) {
  const apiKey = String(process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim();
  const model = String(process.env.GEMINI_MODEL || process.env.EXPO_PUBLIC_GEMINI_MODEL || DEFAULT_MODEL).trim();
  if (!apiKey) throw new GeminiProxyError('CONFIG', 'A chave do Gemini não está configurada no servidor.', 503);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.ok) return response.json();

      const retryable = [500, 502, 503, 504].includes(response.status);
      if (retryable && attempt < retries) {
        await wait(1200 * (attempt + 1));
        continue;
      }
      if (response.status === 429) throw new GeminiProxyError('QUOTA', 'A cota da IA foi atingida ou há requisições demais.', 429);
      if ([400, 401, 403, 404].includes(response.status)) {
        throw new GeminiProxyError('CONFIG', 'A chave ou o modelo do Gemini foi recusado pelo Google.', 503);
      }
      if (retryable) throw new GeminiProxyError('UNAVAILABLE', 'O serviço de IA está temporariamente indisponível.', 503);
      throw new GeminiProxyError('UNKNOWN', `O Gemini respondeu com o status ${response.status}.`, 502);
    } catch (error) {
      if (error instanceof GeminiProxyError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GeminiProxyError('TIMEOUT', 'A análise demorou mais que o esperado.', 504);
      }
      if (attempt >= retries) throw new GeminiProxyError('UNAVAILABLE', 'Não foi possível conectar ao Gemini.', 503);
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = { DEFAULT_MODEL, GeminiProxyError, generateContent };
