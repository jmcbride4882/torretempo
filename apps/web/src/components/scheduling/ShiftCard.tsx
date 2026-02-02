import { useDraggable } from "@dnd-kit/core";
import { format, parseISO } from "date-fns";
import type { Shift } from "../../types/schedule";
import "./ShiftCard.css";

export type ClipboardMode = "copy" | "cut";

interface ShiftCardProps {
  shift: Shift;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onSwapRequest?: () => void;
  isDragging?: boolean;
  isLocked?: boolean;
  isSelected?: boolean;
  clipboardMode?: ClipboardMode | null;
  showSwapButton?: boolean;
}

export default function ShiftCard({
  shift,
  onClick,
  onContextMenu,
  onSwapRequest,
  isDragging,
  isLocked,
  isSelected,
  clipboardMode,
  showSwapButton = false,
}: ShiftCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: shift.id,
    disabled: isLocked,
  });

  const startTime = parseISO(shift.startTime);
  const endTime = parseISO(shift.endTime);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick && !isDragging) {
      e.stopPropagation();
      onClick();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e);
  };

  const handleSwapClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSwapRequest?.();
  };

  // Prevent drag events from interfering with swap button on mobile
  const handleSwapPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Stop drag handlers from capturing this event
  };

  const getConflictClass = () => {
    if (!shift.hasConflicts || !shift.conflictDetails?.length) return "";

    const hasError = shift.conflictDetails.some((c) => c.severity === "error");
    const hasWarning = shift.conflictDetails.some(
      (c) => c.severity === "warning",
    );

    if (hasError) return "has-error";
    if (hasWarning) return "has-warning";
    return "";
  };

  const getClipboardClass = () => {
    if (!clipboardMode) return "";
    return clipboardMode === "copy" ? "copied" : "cut";
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ ...style, borderLeftColor: shift.color || "#6366f1" }}
      className={`shift-card ${isDragging ? "dragging" : ""} ${getConflictClass()} ${isLocked ? "locked" : ""} ${isSelected ? "selected" : ""} ${getClipboardClass()}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="shift-time">
        {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
      </div>
      {shift.employeeName && (
        <div className="shift-employee-name">{shift.employeeName}</div>
      )}
      {shift.role && <div className="shift-role">{shift.role}</div>}
      {shift.location && <div className="shift-location">{shift.location}</div>}
      {shift.hasConflicts && (
        <div
          className="shift-conflict-indicator"
          title={shift.conflictDetails?.[0]?.message}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      )}
      {showSwapButton && !isLocked && (
        <button
          className="shift-swap-button"
          onClick={handleSwapClick}
          onPointerDown={handleSwapPointerDown}
          onTouchStart={(e) => e.stopPropagation()}
          title="Request shift swap"
          aria-label="Request shift swap"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      )}
    </div>
  );
}
