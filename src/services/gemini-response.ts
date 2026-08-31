type ResponseData = {
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
};

export function readGeminiText(data: ResponseData, context: 'chat' | 'image' = 'chat'): string {
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error(context === 'image'
      ? 'A análise da foto atingiu o limite de saída antes de terminar. Nenhum resultado parcial foi usado. Você pode tentar novamente; a demonstração não analisa esta foto.'
      : 'A resposta da IA atingiu o limite de saída e ficou incompleta. Tente uma pergunta mais curta.');
  }
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(context === 'image' ? 'A IA não concluiu a análise da foto. Tente uma foto nítida da refeição.' : 'A IA não concluiu a resposta. Tente reformular a pergunta.');
  }
  const text = candidate?.content?.parts
    ?.filter(part => !part.thought && typeof part.text === 'string')
    .map(part => part.text).join('').trim();
  if (!text) throw new Error('A IA retornou uma resposta vazia.');
  return text;
}

export function plainChatText(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*\*\s+/gm, '• ').trim();
}
