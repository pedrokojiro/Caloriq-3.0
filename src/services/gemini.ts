import { readSettings } from './local-settings';
import { readGeminiText, plainChatText } from './gemini-response';
function responseText(data: Parameters<typeof readGeminiText>[0], context: 'chat' | 'image' = 'chat') {
  try { return readGeminiText(data, context); }
  catch (error) { throw new GeminiServiceError('INVALID_RESPONSE', error instanceof Error ? error.message : 'Resposta inválida.'); }
}
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim() || 'gemini-3.6-flash';
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

const requestGemini = async (body: unknown, retries = 1, timeoutMs = API_TIMEOUT_MS): Promise<any> => {
  const GEMINI_API_KEY = (await readSettings()).geminiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() || '';
  if (!GEMINI_API_KEY) throw new GeminiServiceError('CONFIG', 'Configure EXPO_PUBLIC_GEMINI_API_KEY antes de usar a IA.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

export const testGeminiConnection = async () => {
  const data = await requestGemini({ contents: [{ parts: [{ text: 'Responda apenas OK.' }] }], generationConfig: { maxOutputTokens: 32 } }, 0);
  if (!data.candidates?.length) throw new GeminiServiceError('INVALID_RESPONSE', 'A IA não retornou uma resposta de teste.');
};

export interface ScannedMeal {
  name: string; emoji: string; calories: number; protein: number; carbs: number; fat: number;
  confidence: number; portions: number;
  items: Array<{ name: string; amount: string; calories: number; protein: number; carbs: number; fat: number }>;
  insights: string;
}

export const analyzeMealImage = async (imageUri: string, base64Data: string | null, presetName?: string): Promise<ScannedMeal> => {
  const base64Image = base64Data || await uriToBase64(imageUri);
  const prompt = `Analise a refeição na foto e estime os valores nutricionais. Contexto opcional, não substitui a imagem: ${presetName || 'refeição'}. Seja conciso: no máximo 8 itens, nomes curtos e insights de até 160 caracteres. Não inclua explicações fora do JSON. Use números finitos não negativos, confidence de 0 a 100 e portions maior que zero. Retorne somente JSON completo neste formato: {"name":"nome","emoji":"🍽️","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":0,"portions":1,"items":[{"name":"ingrediente","amount":"quantidade","calories":0,"protein":0,"carbs":0,"fat":0}],"insights":"dica curta"}.`;
  const data = await requestGemini({
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192, temperature: 0.2 },
  }, 0, 60_000);
  const text = responseText(data, 'image');
  try {
    return JSON.parse(text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '')) as ScannedMeal;
  } catch {
    throw new GeminiServiceError('INVALID_RESPONSE', 'A resposta da IA não pôde ser interpretada.');
  }
};

export const chatWithGemini = async (userPrompt: string, history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>) => {
  const data = await requestGemini({
    systemInstruction: { parts: [{ text: 'Você é o NutriCaloriQ IA. Responda somente em português brasileiro, em texto simples, sem Markdown, asteriscos ou títulos em inglês. Seja direto: no máximo 120 palavras, com frases completas. Para calorias, informe uma estimativa e a porção considerada; diferencie fatia de alimento inteiro e explique que tamanho e ingredientes alteram o valor. Não invente dados do diário do usuário. Não substitua aconselhamento médico.' }] },
    contents: [...history.slice(-8), { role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
  });
  return plainChatText(responseText(data));
};
