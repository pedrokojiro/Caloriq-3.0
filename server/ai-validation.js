// Valida o corpo enviado pelo app para /api/ai/generate e monta um novo pedido
// para o Gemini só com os campos usados pelo scanner e pelo chat.

const LIMITS = Object.freeze({
  maxContents: 10,
  maxPartsPerContent: 4,
  maxTextPerPart: 8_000,
  maxTotalText: 32_000,
  maxSystemText: 2_000,
  maxImages: 1,
  maxImageBase64: 8_000_000,
  maxOutputTokens: 8_192,
});

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const RESPONSE_TYPES = new Set(['text/plain', 'application/json']);
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const unknownKeys = (value, allowed) => Object.keys(value).filter(key => !allowed.includes(key));

function buildGeminiRequest(body) {
  const fail = (error) => ({ error });
  if (!isPlainObject(body)) return fail('Pedido de IA inválido.');
  if (unknownKeys(body, ['contents', 'systemInstruction', 'generationConfig']).length) return fail('O pedido de IA contém campos não permitidos.');

  if (!Array.isArray(body.contents) || !body.contents.length || body.contents.length > LIMITS.maxContents) {
    return fail(`Envie entre 1 e ${LIMITS.maxContents} mensagens.`);
  }

  let totalText = 0;
  let images = 0;
  const contents = [];
  for (const content of body.contents) {
    if (!isPlainObject(content) || unknownKeys(content, ['role', 'parts']).length) return fail('Mensagem de IA inválida.');
    if (content.role !== undefined && content.role !== 'user' && content.role !== 'model') return fail('Papel de mensagem inválido.');
    if (!Array.isArray(content.parts) || !content.parts.length || content.parts.length > LIMITS.maxPartsPerContent) return fail('Mensagem de IA inválida.');

    const parts = [];
    for (const part of content.parts) {
      if (!isPlainObject(part)) return fail('Mensagem de IA inválida.');
      const keys = Object.keys(part);
      if (keys.length === 1 && keys[0] === 'text') {
        if (typeof part.text !== 'string' || part.text.length > LIMITS.maxTextPerPart) return fail(`Cada texto deve ter até ${LIMITS.maxTextPerPart} caracteres.`);
        totalText += part.text.length;
        parts.push({ text: part.text });
      } else if (keys.length === 1 && keys[0] === 'inlineData') {
        const data = part.inlineData;
        if (!isPlainObject(data) || unknownKeys(data, ['mimeType', 'data']).length) return fail('Imagem inválida.');
        if (!IMAGE_TYPES.has(data.mimeType)) return fail('A imagem deve ser JPG, PNG ou WebP.');
        if (typeof data.data !== 'string' || !data.data.length || data.data.length > LIMITS.maxImageBase64 || !BASE64.test(data.data)) {
          return fail('A foto é grande demais ou está corrompida.');
        }
        images += 1;
        if (images > LIMITS.maxImages) return fail('Envie apenas uma foto por análise.');
        parts.push({ inlineData: { mimeType: data.mimeType, data: data.data } });
      } else {
        return fail('Mensagem de IA inválida.');
      }
    }
    contents.push(content.role ? { role: content.role, parts } : { parts });
  }
  if (totalText > LIMITS.maxTotalText) return fail('A conversa ficou longa demais. Comece uma nova conversa.');

  const request = { contents };

  if (body.systemInstruction !== undefined) {
    const system = body.systemInstruction;
    if (!isPlainObject(system) || unknownKeys(system, ['parts']).length || !Array.isArray(system.parts)
      || !system.parts.length || system.parts.length > LIMITS.maxPartsPerContent) {
      return fail('Instrução de sistema inválida.');
    }
    let systemText = 0;
    for (const part of system.parts) {
      if (!isPlainObject(part) || unknownKeys(part, ['text']).length || typeof part.text !== 'string') return fail('Instrução de sistema inválida.');
      systemText += part.text.length;
    }
    if (systemText > LIMITS.maxSystemText) return fail('Instrução de sistema longa demais.');
    request.systemInstruction = { parts: system.parts.map(part => ({ text: part.text })) };
  }

  if (body.generationConfig !== undefined) {
    const config = body.generationConfig;
    if (!isPlainObject(config) || unknownKeys(config, ['responseMimeType', 'maxOutputTokens', 'temperature']).length) {
      return fail('Configuração de geração inválida.');
    }
    const generationConfig = {};
    if (config.responseMimeType !== undefined) {
      if (!RESPONSE_TYPES.has(config.responseMimeType)) return fail('Formato de resposta inválido.');
      generationConfig.responseMimeType = config.responseMimeType;
    }
    if (config.maxOutputTokens !== undefined) {
      if (!Number.isInteger(config.maxOutputTokens) || config.maxOutputTokens < 1 || config.maxOutputTokens > LIMITS.maxOutputTokens) {
        return fail(`maxOutputTokens deve estar entre 1 e ${LIMITS.maxOutputTokens}.`);
      }
      generationConfig.maxOutputTokens = config.maxOutputTokens;
    }
    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || !Number.isFinite(config.temperature) || config.temperature < 0 || config.temperature > 1) {
        return fail('temperature deve estar entre 0 e 1.');
      }
      generationConfig.temperature = config.temperature;
    }
    request.generationConfig = generationConfig;
  }

  return { request };
}

module.exports = { AI_LIMITS: LIMITS, buildGeminiRequest };
