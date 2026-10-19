import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Tokens do sistema visual (Sprint 3, #39). Contrastes verificados (WCAG 2.1 AA):
// texto >= 4,5:1 sobre bg/surface; bordas de campo e foco >= 3:1.
export const COLORS = {
  // Verde da marca: logo, anéis, barras e realces grandes. Não usar como cor de texto.
  primary: '#1AAF5D',
  primaryGlow: '#27C76B',
  primaryDark: '#158F4C',
  // Verde de ação: botão primário, FAB e aba central (texto branco 4,98:1).
  action: '#13804A',
  actionPressed: '#0F6B3D',
  // Gradiente do cabeçalho da Home (texto branco >= 4,98:1 em todos os pontos).
  headerGradient: ['#13804A', '#0F6E3D', '#0A5A31'] as const,

  // Macros (preenchimentos de barra; para texto use colors.protein etc.)
  protein: '#FF7A35',
  carbs: '#2563EB',
  fat: '#F59E0B',
  water: '#3B82F6',

  // Common UI
  white: '#FFFFFF',
  danger: '#EF4444',
  dangerBgLight: '#FEF2F2',
  primaryBgLight: '#EDFBF3',
};

export const darkTheme = {
  bgApp: '#0D1117',
  bgCard: '#1A1F2A',
  bgNav: '#1A1F2A',
  borderColor: '#2E3340',
  textMain: '#F5F7FA',
  textMuted: '#CBD0D8',
  textLight: '#A3ACB9',
  inputBg: '#141922',
  inputBorder: '#6B7585',
  statusBar: 'light-content' as 'light-content' | 'dark-content',
  shadowColor: '#000000',
  shadowOpacity: 0.3,
  // Novos tokens
  brandText: '#3DD68C',
  focus: '#3DD68C',
  disabledBg: '#262C38',
  disabledText: '#A3ACB9',
  dangerText: '#FF8A7A',
  proteinText: '#FF9A62',
  carbsText: '#7AA7FF',
  fatText: '#FBBF24',
  waterText: '#6FA8FF',
  waterTint: '#293850',
  aiTint: '#1A3030',
  aiBorder: '#24513C',
  track: '#2E3340',
};

export const lightTheme: typeof darkTheme = {
  bgApp: '#F6F8F7',
  bgCard: '#FFFFFF',
  bgNav: '#FFFFFF',
  borderColor: '#E3E7EA',
  textMain: '#0D1117',
  textMuted: '#4A5565',
  textLight: '#5F6B7A',
  inputBg: '#F1F4F3',
  inputBorder: '#7A8491',
  statusBar: 'dark-content',
  shadowColor: '#000000',
  shadowOpacity: 0.04,
  brandText: '#0E7A3E',
  focus: '#13804A',
  disabledBg: '#E9EDF0',
  disabledText: '#5F6B7A',
  dangerText: '#C4320A',
  proteinText: '#C2410C',
  carbsText: '#1D4ED8',
  fatText: '#A15C07',
  waterText: '#1D5FD1',
  waterTint: '#E4ECF9',
  aiTint: '#E8F7EF',
  aiBorder: '#BFE6D0',
  track: '#E3E7EA',
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
