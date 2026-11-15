import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Tokens do sistema visual "Diário limpo". Base neutra quente (60%), tinta (30%) e o
// verde só como destaque (10%): botões, progresso e links. Contrastes verificados
// (WCAG 2.1 AA): texto >= 4,5:1 sobre bgApp e bgCard; bordas de campo >= 3:1.
export const COLORS = {
  // Verde da marca: logo e preenchimentos grandes. Não usar como cor de texto.
  primary: '#1E8E55',
  primaryGlow: '#2BA466',
  primaryDark: '#16744A',
  // Verde de ação: botão primário e aba ativa (texto branco 4,98:1).
  action: '#13804A',
  actionPressed: '#0F6B3D',
  // Mantido por compatibilidade; o redesenho não usa mais gradiente de cabeçalho.
  headerGradient: ['#13804A', '#13804A', '#13804A'] as const,

  // Macros: tons terrosos, só em barras finas (para texto use colors.proteinText etc.).
  protein: '#C8673C',
  carbs: '#4F74A8',
  fat: '#C99A2E',
  water: '#4A84C9',

  // Common UI
  white: '#FFFFFF',
  danger: '#C2362B',
  dangerBgLight: '#FBEFEC',
  primaryBgLight: '#EAF4EE',
};

export const darkTheme = {
  bgApp: '#111210',
  bgCard: '#1A1B18',
  bgNav: '#111210',
  borderColor: '#2A2B27',
  // Linha fina entre itens de uma lista (substitui card dentro de card).
  hairline: '#2A2B27',
  textMain: '#F1F0EB',
  textMuted: '#BEBFB6',
  textLight: '#9FA097',
  inputBg: '#161714',
  inputBorder: '#6E7068',
  statusBar: 'light-content' as 'light-content' | 'dark-content',
  shadowColor: '#000000',
  shadowOpacity: 0.25,
  brandText: '#5CC991',
  focus: '#5CC991',
  disabledBg: '#24251F',
  disabledText: '#9FA097',
  dangerText: '#FF9585',
  proteinText: '#E39A72',
  carbsText: '#93AEDB',
  fatText: '#D9B865',
  waterText: '#86AEE6',
  waterTint: '#1F2630',
  aiTint: '#18221C',
  aiBorder: '#2A2B27',
  track: '#2A2B27',
};

export const lightTheme: typeof darkTheme = {
  bgApp: '#F6F5F1',
  bgCard: '#FFFFFF',
  bgNav: '#F6F5F1',
  borderColor: '#E6E3DB',
  hairline: '#ECE9E2',
  textMain: '#1C1D1A',
  textMuted: '#55574F',
  textLight: '#696B63',
  inputBg: '#FFFFFF',
  inputBorder: '#8A8C83',
  statusBar: 'dark-content',
  shadowColor: '#3A3528',
  shadowOpacity: 0.06,
  brandText: '#0E6E3B',
  focus: '#13804A',
  disabledBg: '#E9E7E1',
  disabledText: '#696B63',
  dangerText: '#B42318',
  proteinText: '#A8471E',
  carbsText: '#365A8C',
  fatText: '#7F5F0E',
  waterText: '#2A62A6',
  waterTint: '#EDF2F8',
  aiTint: '#EEF5F0',
  aiBorder: '#E6E3DB',
  track: '#ECE9E2',
};

type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  theme: ThemeType;
  toggleTheme: () => void;
  colors: typeof darkTheme;
  globalColors: typeof COLORS;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>(systemScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    if (systemScheme === 'dark' || systemScheme === 'light') {
      // Keep the current behavior: follow a system theme change immediately.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(systemScheme);
    }
  }, [systemScheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors, globalColors: COLORS, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
