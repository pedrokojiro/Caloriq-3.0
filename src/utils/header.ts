// Cabeçalhos HTTP só aceitam ASCII visível: o OkHttp do Android recusa a
// requisição inteira se aparecer "·" ou acento.
export const toHeaderValue = (value: string) => value
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ')
  .replace(/[^\x20-\x7e]/g, '')
  .replace(/ {2,}/g, ' ')
  .trim()
  .slice(0, 120);
