/**
 * Torre Tempo Theme Context
 *
 * Provides light/dark theme management with:
 * - System preference detection
 * - LocalStorage persistence
 * - Smooth theme transitions
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

// ============================================================================
// Types
// ============================================================================

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

interface ThemeContextType {
  /** Current active theme (resolved to light or dark) */
  theme: Theme;
  /** User's theme preference (can be 'system') */
  preference: ThemePreference;
  /** Toggle between light and dark theme */
  toggleTheme: () => void;
  /** Set a specific theme preference */
  setTheme: (theme: ThemePreference) => void;
  /** True when system is in dark mode */
  systemDark: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "torre-tempo-theme";

// ============================================================================
// Context
// ============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================================================
// Helper Functions
// ============================================================================

function getStoredPreference(): ThemePreference | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return null;
}

function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  if (preference === "system") {
    return systemDark ? "dark" : "light";
  }
  return preference;
}

// ============================================================================
// Provider Component
// ============================================================================

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme preference when none is stored (default: 'system') */
  defaultPreference?: ThemePreference;
}

export function ThemeProvider({
  children,
  defaultPreference = "system",
}: ThemeProviderProps) {
  // Track system preference
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Track user preference (persisted)
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const stored = getStoredPreference();
    return stored ?? defaultPreference;
  });

  // Resolved theme (what's actually applied)
  const theme = resolveTheme(preference, systemDark);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };

    // Modern browsers
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    // Also update color-scheme for native elements (scrollbars, form controls)
    document.documentElement.style.colorScheme = theme;

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        theme === "dark" ? "#1e1e24" : "#ffffff",
      );
    }
  }, [theme]);

  // Persist preference to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  // Set theme callback
  const setTheme = useCallback((newPreference: ThemePreference) => {
    setPreference(newPreference);
  }, []);

  // Toggle between light and dark (ignores system preference)
  const toggleTheme = useCallback(() => {
    setPreference((current) => {
      // If current is system, resolve to opposite of system theme
      if (current === "system") {
        return systemDark ? "light" : "dark";
      }
      // Otherwise toggle
      return current === "light" ? "dark" : "light";
    });
  }, [systemDark]);

  const value: ThemeContextType = {
    theme,
    preference,
    toggleTheme,
    setTheme,
    systemDark,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

// ============================================================================
// Script for preventing flash of unstyled content (FOUC)
// Include this in your HTML <head> before any stylesheets
// ============================================================================

export const themeInitScript = `
  (function() {
    try {
      const stored = localStorage.getItem('${STORAGE_KEY}');
      let theme = 'light';
      
      if (stored === 'dark') {
        theme = 'dark';
      } else if (stored === 'light') {
        theme = 'light';
      } else {
        // System preference
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
    } catch (e) {}
  })();
`;

export default ThemeContext;
