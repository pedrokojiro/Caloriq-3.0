import { StyleSheet } from 'react-native';

// Escala tipográfica do "Diário limpo": quatro tamanhos e dois pesos.
// Números usam algarismos tabulares para não "pularem" quando mudam.
export const type = StyleSheet.create({
  display: { fontSize: 36, lineHeight: 42, fontWeight: '600', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  strong: { fontWeight: '600' },
  number: { fontVariant: ['tabular-nums'] },
  // Rótulo de seção: legenda em caixa alta, com respiro entre letras.
  overline: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
});
