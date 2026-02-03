/**
 * Torre Tempo Theme Toggle
 *
 * A beautiful animated toggle switch for switching between light and dark themes.
 * Built with Radix UI Switch for accessibility and smooth interactions.
 */

import * as Switch from "@radix-ui/react-switch";
import { useTheme } from "../contexts/ThemeContext";
import "./ThemeToggle.css";

interface ThemeToggleProps {
  /** Show label text (default: false) */
  showLabel?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS class */
  className?: string;
}

export default function ThemeToggle({
  showLabel = false,
  size = "md",
  className = "",
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`theme-toggle theme-toggle--${size} ${className}`}>
      {showLabel && (
        <span className="theme-toggle__label">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      )}

      <Switch.Root
        className="theme-toggle__switch"
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        {/* Sun icon (light mode indicator) */}
        <span className="theme-toggle__icon theme-toggle__icon--sun">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </span>

        {/* Moon icon (dark mode indicator) */}
        <span className="theme-toggle__icon theme-toggle__icon--moon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </span>

        <Switch.Thumb className="theme-toggle__thumb" />
      </Switch.Root>
    </div>
  );
}

/**
 * Compact icon-only theme toggle button
 * For use in headers or tight spaces
 */
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      className={`theme-toggle-button ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span className="theme-toggle-button__icon-wrapper">
        {/* Sun icon */}
        <svg
          className="theme-toggle-button__icon theme-toggle-button__icon--sun"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>

        {/* Moon icon */}
        <svg
          className="theme-toggle-button__icon theme-toggle-button__icon--moon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
    </button>
  );
}
