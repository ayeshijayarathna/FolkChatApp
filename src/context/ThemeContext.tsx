import React, { createContext, useContext, useState } from 'react';

export const lightColors = {
  bg: '#F0EBE3',
  white: '#FFFFFF',
  card: '#FFFFFF',
  darkText: '#2C2418',
  muted: '#7A6A5A',
  border: '#E8DDD4',
  saffron: '#D4651A',
  warmBg: '#F0EBE3',
  offwhite: '#FAFAF8',
  inputBg: '#FFFFFF',
  tabBar: '#FFFFFF',
  header: '#FFFFFF',
};

export const darkColors = {
  bg: '#121212',
  white: '#1E1E1E',
  card: '#1E1E1E',
  darkText: '#F0EBE3',
  muted: '#A0907A',
  border: '#333333',
  saffron: '#E07830',
  warmBg: '#2A2420',
  offwhite: '#1A1A1A',
  inputBg: '#2A2A2A',
  tabBar: '#1E1E1E',
  header: '#1E1E1E',
};

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  isDark: boolean;
  colors: typeof lightColors;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>('light');
  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);