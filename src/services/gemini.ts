const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() || '';
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const API_TIMEOUT_MS = 25_000;

export type GeminiErrorCode = 'CONFIG' | 'QUOTA' | 'UNAVAILABLE' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'UNKNOWN';

export class GeminiServiceError extends Error {
  constructor(public code: GeminiErrorCode, message: string, public status?: number) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

const uriToBase64 = async (uri: string): Promise<string> => {
  if (uri.startsWith('data:')) return uri.split(',')[1];
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

const requestGemini = async (body: unknown, retries = 1): Promise<any> => {
  if (!GEMINI_API_KEY) throw new GeminiServiceError('CONFIG', 'Configure EXPO_PUBLIC_GEMINI_API_KEY antes de usar a IA.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal,
      });
      if (response.ok) return await response.json();

      const status = response.status;
      const retryable = status === 429 || [500, 502, 503, 504].includes(status);
      if (retryable && attempt < retries) {
        const retryAfter = Number(response.headers.get('retry-after'));
        await wait(Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 4_000) : 1_200 * (attempt + 1));
        continue;
      }
      if (status === 429) throw new GeminiServiceError('QUOTA', 'A cota da IA foi atingida ou há requisições demais.', status);
      if (retryable) throw new GeminiServiceError('UNAVAILABLE', 'O serviço de IA está temporariamente indisponível.', status);
      if ([400, 401, 403].includes(status)) throw new GeminiServiceError('CONFIG', 'A chave ou a configuração da IA foi recusada.', status);
      throw new GeminiServiceError('UNKNOWN', `A IA respondeu com o status ${status}.`, status);
    } catch (error) {
      if (error instanceof GeminiServiceError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw new GeminiServiceError('TIMEOUT', 'A análise demorou mais que o esperado.');
      if (attempt >= retries) throw new GeminiServiceError('UNAVAILABLE', 'Não foi possível conectar à IA.');
    } finally {
      clearTimeout(timeout);
    }
  }
};

export interface ScannedMeal {
  name: string; emoji: string; calories: number; protein: number; carbs: number; fat: number;
  confidence: number; portions: number;
  items: Array<{ name: string; amount: string; calories: number; protein: number; carbs: number; fat: number }>;
  insights: string;
}

export const analyzeMealImage = async (imageUri: string, base64Data: string | null, presetName?: string): Promise<ScannedMeal> => {
  const base64Image = base64Data || await uriToBase64(imageUri);
  const prompt = `Analise a refeição e estime os valores nutricionais. Contexto opcional: ${presetName || 'refeição'}. Retorne somente JSON neste formato: {"name":"nome","emoji":"🍽️","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":0,"portions":1,"items":[{"name":"ingrediente","amount":"quantidade","calories":0,"protein":0,"carbs":0,"fat":0}],"insights":"dica curta"}.`;
  const data = await requestGemini({
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 900, temperature: 0.2 },
  });
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiServiceError('INVALID_RESPONSE', 'A IA retornou uma resposta vazia.');
  try {
    return JSON.parse(text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '')) as ScannedMeal;
  } catch {
    throw new GeminiServiceError('INVALID_RESPONSE', 'A resposta da IA não pôde ser interpretada.');
  }
};

export const chatWithGemini = async (userPrompt: string, history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>) => {
  const data = await requestGemini({
    systemInstruction: { parts: [{ text: 'Você é o NutriCaloriQ IA. Responda em português, de forma simples e motivadora. Não substitua aconselhamento médico.' }] },
    contents: [...history.slice(-8), { role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 500, temperature: 0.5 },
  });
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiServiceError('INVALID_RESPONSE', 'A IA retornou uma resposta vazia.');
  return text;
};
