import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "./ShiftContextMenu.css";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ShiftContextMenuProps {
  position: ContextMenuPosition;
  onClose: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onRequestSwap: () => void;
  onDelete: () => void;
  canPaste: boolean;
  isLocked?: boolean;
}

export default function ShiftContextMenu({
  position,
  onClose,
  onEdit,
  onCopy,
  onCut,
  onPaste,
  onRequestSwap,
  onDelete,
  canPaste,
  isLocked,
}: ShiftContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const focusedIndex = useRef<number>(0);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = position.x;
      let adjustedY = position.y;

      // Prevent overflow on right edge
      if (position.x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 8;
      }

      // Prevent overflow on bottom edge
      if (position.y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 8;
      }

      menu.style.left = `${adjustedX}px`;
      menu.style.top = `${adjustedY}px`;
    }
  }, [position]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll(
      ".context-menu-item:not(.disabled)",
    );
    if (!items || items.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusedIndex.current = (focusedIndex.current + 1) % items.length;
        (items[focusedIndex.current] as HTMLButtonElement).focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        focusedIndex.current =
          (focusedIndex.current - 1 + items.length) % items.length;
        (items[focusedIndex.current] as HTMLButtonElement).focus();
        break;
      case "Enter":
        e.preventDefault();
        (items[focusedIndex.current] as HTMLButtonElement).click();
        break;
    }
  }, []);

  const menuItems = [
    {
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      label: t("schedule.editShift"),
      shortcut: "",
      onClick: onEdit,
      disabled: isLocked,
    },
    { divider: true },
    {
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      ),
      label: t("schedule.copyShift"),
      shortcut: "Ctrl+C",
      onClick: onCopy,
      disabled: isLocked,
    },
    {
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
          <rect x="4" y="4" width="16" height="4" rx="1" />
        </svg>
      ),
      label: t("schedule.cutShift"),
      shortcut: "Ctrl+X",
      onClick: onCut,
      disabled: isLocked,
    },
    {
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      ),
      label: t("schedule.pasteShift"),
      shortcut: "Ctrl+V",
      onClick: onPaste,
      disabled: !canPaste || isLocked,
    },
    { divider: true },
    {
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 8l-4 4 4 4" />
          <path d="M17 8l4 4-4 4" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      ),
      label: t("schedule.requestSwap"),
      shortcut: "",
      onClick: onRequestSwap,
      disabled: isLocked,
    },
    { divider: true },
    {
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      ),
      label: t("schedule.deleteShift"),
      shortcut: "Del",
      onClick: onDelete,
      disabled: isLocked,
      danger: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="shift-context-menu"
      style={{ left: position.x, top: position.y }}
      onKeyDown={handleKeyDown}
      role="menu"
      tabIndex={-1}
    >
      {menuItems.map((item, index) =>
        "divider" in item ? (
          <div key={`divider-${index}`} className="context-menu-divider" />
        ) : (
          <button
            key={index}
            className={`context-menu-item ${item.disabled ? "disabled" : ""} ${item.danger ? "danger" : ""}`}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            role="menuitem"
          >
            <span className="menu-item-icon">{item.icon}</span>
            <span className="menu-item-label">{item.label}</span>
            <span className="menu-item-shortcut">{item.shortcut}</span>
          </button>
        ),
      )}
    </div>
  );
}
