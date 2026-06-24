import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export const COLORS = {
  primary: '#1AAF5D',
  primaryGlow: '#27C76B',
  primaryDark: '#158F4C',
  
  // Macros
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
  bgNav: 'rgba(26, 31, 42, 0.95)',
  borderColor: '#2E3340',
  textMain: '#FFFFFF',
  textMuted: '#CBD0D8',
  textLight: '#9AA3B0',
  inputBg: '#0D1117',
  inputBorder: '#2E3340',
  statusBar: 'light-content' as 'light-content' | 'dark-content',
  shadowColor: '#000000',
  shadowOpacity: 0.3,
};

export const lightTheme = {
  bgApp: '#F8F9FA',
  bgCard: '#FFFFFF',
  bgNav: 'rgba(255, 255, 255, 0.95)',
  borderColor: '#E8EAEE',
  textMain: '#0D1117',
  textMuted: '#6B7585',
  textLight: '#9AA3B0',
  inputBg: '#F8F9FA',
  inputBorder: '#E2E4E8',
  statusBar: 'dark-content' as 'light-content' | 'dark-content',
  shadowColor: '#000000',
  shadowOpacity: 0.04,
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
