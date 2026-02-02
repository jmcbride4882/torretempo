import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { isSameDay } from "date-fns";
import type { Shift } from "../../types/schedule";
import ShiftCard, { type ClipboardMode } from "./ShiftCard";
import "./DropCell.css";

interface CopiedShift {
  shift: Shift;
  mode: ClipboardMode;
}

interface DropCellProps {
  id: string;
  date: Date;
  employeeId: string; // Used for cell identification
  shifts: Shift[];
  onCellClick: () => void;
  onShiftClick: (shift: Shift) => void;
  onShiftContextMenu?: (shift: Shift, e: React.MouseEvent) => void;
  onShiftSwapRequest?: (shift: Shift) => void;
  currentEmployeeId?: string | null;
  isLocked?: boolean;
  isMobile?: boolean;
  copiedShift?: CopiedShift | null;
  selectedShiftId?: string | null;
  canPaste?: boolean;
}

export default function DropCell({
  id,
  date,
  employeeId: _employeeId, // Used in parent for cell ID composition
  shifts,
  onCellClick,
  onShiftClick,
  onShiftContextMenu,
  onShiftSwapRequest,
  currentEmployeeId,
  isLocked,
  isMobile,
  copiedShift,
  selectedShiftId,
  canPaste,
}: DropCellProps) {
  const { t } = useTranslation();
  const { isOver, setNodeRef } = useDroppable({
    id,
  });
  const [isHovering, setIsHovering] = useState(false);

  const isToday = isSameDay(date, new Date());
  const showPastePreview = canPaste && copiedShift && isHovering && !isLocked;

  const handleCellClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // If clicking directly on a shift card, let the shift's own click handler take over
    // (shift cards have their own onClick that opens the edit modal)
    if (target.closest(".shift-card")) {
      return;
    }

    // For any other click within the cell, trigger the cell click (which handles paste)
    onCellClick();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Only show paste option when clicking on empty space
    if (
      (e.target as HTMLElement).classList.contains("drop-cell") ||
      (e.target as HTMLElement).classList.contains("empty-cell-text")
    ) {
      e.preventDefault();
      // Cell-level context menu could be implemented here
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`drop-cell ${isOver ? "drag-over" : ""} ${isToday ? "today" : ""} ${isMobile ? "mobile" : ""} ${isLocked ? "locked" : ""} ${showPastePreview ? "paste-target" : ""}`}
      onClick={handleCellClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {shifts.length > 0 ? (
        <div className="cell-shifts">
          {shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onClick={() => onShiftClick(shift)}
              onContextMenu={(e) => onShiftContextMenu?.(shift, e)}
              onSwapRequest={() => onShiftSwapRequest?.(shift)}
              showSwapButton={Boolean(
                currentEmployeeId &&
                shift.employeeId === currentEmployeeId &&
                !isLocked,
              )}
              isLocked={isLocked}
              isSelected={selectedShiftId === shift.id}
              clipboardMode={
                copiedShift?.shift.id === shift.id ? copiedShift.mode : null
              }
            />
          ))}
        </div>
      ) : (
        !isLocked && (
          <span className="empty-cell-text">
            {isMobile ? t("schedule.tapToAdd") : ""}
          </span>
        )
      )}
      {/* Paste preview ghost shift */}
      {showPastePreview && (
        <div
          className="paste-preview"
          style={{ borderLeftColor: copiedShift.shift.color || "#6366f1" }}
        >
          <div className="paste-preview-label">{t("schedule.pasteHere")}</div>
        </div>
      )}
    </div>
  );
}
