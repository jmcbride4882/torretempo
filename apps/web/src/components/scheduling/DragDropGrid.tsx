import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, addDays, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import type { Shift, CreateShiftInput } from "../../types/schedule";
import type { Employee } from "../../types/employee";
import type { ShiftTemplate } from "./ShiftTemplatePanel";
import "./DragDropGrid.css";

/**
 * Conflict type for visual indicators
 */
interface ConflictInfo {
  type: "overlap" | "rest_period" | "max_hours";
  severity: "error" | "warning";
  message: string;
}

/**
 * Detect conflicts for a shift
 */
function detectConflicts(
  shift: Shift,
  allShifts: Shift[],
  employeeId: string,
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // Filter shifts for same employee
  const employeeShifts = allShifts.filter(
    (s) => s.employeeId === employeeId && s.id !== shift.id,
  );

  const shiftStart = parseISO(shift.startTime);
  const shiftEnd = parseISO(shift.endTime);

  for (const otherShift of employeeShifts) {
    const otherStart = parseISO(otherShift.startTime);
    const otherEnd = parseISO(otherShift.endTime);

    // Check overlap
    if (shiftStart < otherEnd && shiftEnd > otherStart) {
      conflicts.push({
        type: "overlap",
        severity: "error",
        message: "Overlapping shifts",
      });
    }

    // Check rest period (11 hours between shifts)
    const restPeriod = 11 * 60 * 60 * 1000; // 11 hours in ms
    if (
      Math.abs(shiftEnd.getTime() - otherStart.getTime()) < restPeriod ||
      Math.abs(otherEnd.getTime() - shiftStart.getTime()) < restPeriod
    ) {
      if (!(shiftStart < otherEnd && shiftEnd > otherStart)) {
        // Only add rest period warning if not overlapping
        conflicts.push({
          type: "rest_period",
          severity: "warning",
          message: "Less than 11 hours rest",
        });
      }
    }
  }

  return conflicts;
}

/**
 * Calculate total hours for employee in a week
 */
function calculateWeeklyHours(
  shifts: Shift[],
  employeeId: string,
  weekStart: Date,
): number {
  const weekEnd = addDays(weekStart, 7);

  const employeeShifts = shifts.filter((s) => {
    if (s.employeeId !== employeeId) return false;
    const start = parseISO(s.startTime);
    return start >= weekStart && start < weekEnd;
  });

  let totalMinutes = 0;
  for (const shift of employeeShifts) {
    const start = parseISO(shift.startTime);
    const end = parseISO(shift.endTime);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60);
    totalMinutes += duration - (shift.breakMinutes || 0);
  }

  return totalMinutes / 60;
}

/**
 * Draggable shift card within the grid
 */
interface DraggableShiftProps {
  shift: Shift;
  conflicts: ConflictInfo[];
  isSelected?: boolean;
  onClick?: () => void;
}

function DraggableShift({
  shift,
  conflicts,
  isSelected,
  onClick,
}: DraggableShiftProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: shift.id,
      data: {
        type: "shift",
        shift,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    "--shift-color": shift.color || "#6366f1",
  } as React.CSSProperties;

  const startTime = format(parseISO(shift.startTime), "HH:mm");
  const endTime = format(parseISO(shift.endTime), "HH:mm");

  const hasOverlap = conflicts.some((c) => c.type === "overlap");
  const hasRestWarning = conflicts.some((c) => c.type === "rest_period");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid-shift-card ${isDragging ? "is-dragging" : ""} ${isSelected ? "is-selected" : ""} ${hasOverlap ? "has-conflict-overlap" : ""} ${hasRestWarning ? "has-conflict-rest" : ""}`}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      <div className="grid-shift-color" />
      <div className="grid-shift-time">
        {startTime} - {endTime}
      </div>
      {shift.role && <div className="grid-shift-role">{shift.role}</div>}
      {conflicts.length > 0 && (
        <div
          className="grid-shift-conflict-icon"
          title={conflicts.map((c) => c.message).join(", ")}
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
    </div>
  );
}

/**
 * Droppable cell for a single day/employee intersection
 */
interface DroppableCellProps {
  id: string;
  date: Date;
  employeeId: string;
  shifts: Shift[];
  allShifts: Shift[];
  isToday: boolean;
  isWeekend: boolean;
  onShiftClick?: (shift: Shift) => void;
  selectedShiftId?: string | null;
}

function DroppableCell({
  id,
  date,
  employeeId,
  shifts,
  allShifts,
  isToday,
  isWeekend,
  onShiftClick,
  selectedShiftId,
}: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      date,
      employeeId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`grid-cell ${isToday ? "is-today" : ""} ${isWeekend ? "is-weekend" : ""} ${isOver ? "is-drop-target" : ""}`}
    >
      {shifts.map((shift) => {
        const conflicts = detectConflicts(shift, allShifts, employeeId);
        return (
          <DraggableShift
            key={shift.id}
            shift={shift}
            conflicts={conflicts}
            isSelected={selectedShiftId === shift.id}
            onClick={() => onShiftClick?.(shift)}
          />
        );
      })}
      {shifts.length === 0 && isOver && (
        <div className="cell-drop-placeholder">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * DragDropGrid main component props
 */
interface DragDropGridProps {
  weekStart: Date;
  shifts: Shift[];
  employees: Employee[];
  onShiftCreate: (data: CreateShiftInput) => Promise<void>;
  onShiftMove: (
    shiftId: string,
    newDate: Date,
    newEmployeeId: string,
  ) => Promise<void>;
  onShiftClick?: (shift: Shift) => void;
  selectedShiftId?: string | null;
  isLocked?: boolean;
}

/**
 * Deputy-style drag-drop scheduling grid
 */
export default function DragDropGrid({
  weekStart,
  shifts,
  employees,
  onShiftCreate,
  onShiftMove,
  onShiftClick,
  selectedShiftId,
  isLocked = false,
}: DragDropGridProps) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === "es";

  const [activeItem, setActiveItem] = useState<Shift | ShiftTemplate | null>(
    null,
  );
  const [activeType, setActiveType] = useState<"shift" | "template" | null>(
    null,
  );

  // Sensors for mouse and touch
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Today for highlighting
  const today = useMemo(() => new Date(), []);

  // Get shifts for a specific cell
  const getShiftsForCell = useCallback(
    (employeeId: string, date: Date) => {
      return shifts.filter((shift) => {
        if (shift.employeeId !== employeeId) return false;
        const shiftDate = parseISO(shift.startTime);
        return isSameDay(shiftDate, date);
      });
    },
    [shifts],
  );

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === "shift") {
      setActiveItem(data.shift);
      setActiveType("shift");
    } else if (data?.type === "template") {
      setActiveItem(data.template);
      setActiveType("template");
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveItem(null);
      setActiveType(null);

      if (!over || isLocked) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (!overData?.date || !overData?.employeeId) return;

      const targetDate = overData.date as Date;
      const targetEmployeeId = overData.employeeId as string;

      if (activeData?.type === "template") {
        // Create new shift from template
        const template = activeData.template as ShiftTemplate;
        const [startH, startM] = template.startTime.split(":").map(Number);
        const [endH, endM] = template.endTime.split(":").map(Number);

        const startTime = new Date(targetDate);
        startTime.setHours(startH, startM, 0, 0);

        const endTime = new Date(targetDate);
        endTime.setHours(endH, endM, 0, 0);

        // Handle overnight shifts
        if (endTime <= startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }

        await onShiftCreate({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          employeeId: targetEmployeeId,
          breakMinutes: template.breakMinutes,
          color: template.color,
        });
      } else if (activeData?.type === "shift") {
        // Move existing shift
        const shift = activeData.shift as Shift;

        // Check if actually moved
        const originalDate = parseISO(shift.startTime);
        if (
          isSameDay(originalDate, targetDate) &&
          shift.employeeId === targetEmployeeId
        ) {
          return; // No change
        }

        await onShiftMove(shift.id, targetDate, targetEmployeeId);
      }
    },
    [isLocked, onShiftCreate, onShiftMove],
  );

  // Format date for header
  const formatHeaderDate = useCallback(
    (date: Date) => {
      const dayName = format(date, "EEE", {
        locale: isSpanish ? es : undefined,
      });
      const dayNum = format(date, "d");
      return { dayName, dayNum };
    },
    [isSpanish],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="drag-drop-grid">
        {/* Header row with days */}
        <div className="grid-header-row">
          <div className="grid-header-cell grid-header-employee">
            {t("advancedScheduling.grid.employee")}
          </div>
          {weekDays.map((date) => {
            const { dayName, dayNum } = formatHeaderDate(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isTodayCol = isSameDay(date, today);

            return (
              <div
                key={date.toISOString()}
                className={`grid-header-cell grid-header-day ${isTodayCol ? "is-today" : ""} ${isWeekend ? "is-weekend" : ""}`}
              >
                <span className="header-day-name">{dayName}</span>
                <span className="header-day-num">{dayNum}</span>
              </div>
            );
          })}
        </div>

        {/* Employee rows */}
        <div className="grid-body">
          {employees.map((employee) => {
            const weeklyHours = calculateWeeklyHours(
              shifts,
              employee.id,
              weekStart,
            );
            const exceedsMaxHours = weeklyHours > 40;

            return (
              <div key={employee.id} className="grid-row">
                <div
                  className={`grid-employee-cell ${exceedsMaxHours ? "exceeds-max-hours" : ""}`}
                >
                  <div className="employee-avatar">
                    {employee.user.firstName[0]}
                    {employee.user.lastName[0]}
                  </div>
                  <div className="employee-info">
                    <span className="employee-name">
                      {employee.user.firstName} {employee.user.lastName}
                    </span>
                    <span
                      className={`employee-hours ${exceedsMaxHours ? "over-hours" : ""}`}
                    >
                      {weeklyHours.toFixed(1)}h
                      {exceedsMaxHours && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      )}
                    </span>
                  </div>
                </div>

                {weekDays.map((date) => {
                  const cellId = `${employee.id}-${format(date, "yyyy-MM-dd")}`;
                  const cellShifts = getShiftsForCell(employee.id, date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isTodayCell = isSameDay(date, today);

                  return (
                    <DroppableCell
                      key={cellId}
                      id={cellId}
                      date={date}
                      employeeId={employee.id}
                      shifts={cellShifts}
                      allShifts={shifts}
                      isToday={isTodayCell}
                      isWeekend={isWeekend}
                      onShiftClick={onShiftClick}
                      selectedShiftId={selectedShiftId}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {employees.length === 0 && (
          <div className="grid-empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>{t("advancedScheduling.grid.noEmployees")}</p>
          </div>
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem && activeType === "shift" && (
          <div
            className="drag-overlay-shift"
            style={
              {
                "--shift-color": (activeItem as Shift).color || "#6366f1",
              } as React.CSSProperties
            }
          >
            <div className="grid-shift-color" />
            <div className="grid-shift-time">
              {format(parseISO((activeItem as Shift).startTime), "HH:mm")} -{" "}
              {format(parseISO((activeItem as Shift).endTime), "HH:mm")}
            </div>
          </div>
        )}
        {activeItem && activeType === "template" && (
          <div
            className="drag-overlay-template"
            style={
              {
                "--template-color": (activeItem as ShiftTemplate).color,
              } as React.CSSProperties
            }
          >
            <div className="template-overlay-color" />
            <span className="template-overlay-time">
              {(activeItem as ShiftTemplate).startTime} -{" "}
              {(activeItem as ShiftTemplate).endTime}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
