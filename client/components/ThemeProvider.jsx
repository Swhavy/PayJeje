import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children, defaultTheme = 'dark', storageKey = 'paywaka-theme' }) => {
  const [theme, setTheme] = useState(defaultTheme);

  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey);

    if (storedTheme) {
      setTheme(storedTheme);
      return; // user has a preference, don't listen to system
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // set initial system theme
    setTheme(mediaQuery.matches ? "dark" : "light");

    // listen for system changes
    const handleChange = (e) => setTheme(e.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const value = {
    theme,
    setTheme: (theme) => {
      setTheme(theme);
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
