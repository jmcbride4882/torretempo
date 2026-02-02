import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Shift, UpdateShiftInput } from "../../types/schedule";
import type { Employee } from "../../types/employee";
import ShiftCard, { type ClipboardMode } from "./ShiftCard";
import DropCell from "./DropCell";
import "./ScheduleCalendar.css";

interface CopiedShift {
  shift: Shift;
  mode: ClipboardMode;
}

interface ScheduleCalendarProps {
  weekStart: Date;
  shifts: Shift[];
  employees: Employee[];
  onShiftClick: (shift: Shift) => void;
  onCellClick: (date: Date, employeeId: string) => void;
  onShiftMove: (shiftId: string, updates: UpdateShiftInput) => void;
  onShiftContextMenu?: (shift: Shift, e: React.MouseEvent) => void;
  onShiftSwapRequest?: (shift: Shift) => void;
  currentEmployeeId?: string | null;
  isLocked?: boolean;
  isMobile?: boolean;
  selectedDay?: number; // 0-6 for mobile day view
  onDayChange?: (day: number) => void;
  copiedShift?: CopiedShift | null;
  selectedShiftId?: string | null;
}

export default function ScheduleCalendar({
  weekStart,
  shifts,
  employees,
  onShiftClick,
  onCellClick,
  onShiftMove,
  onShiftContextMenu,
  onShiftSwapRequest,
  currentEmployeeId,
  isLocked,
  isMobile,
  selectedDay = 0,
  onDayChange,
  copiedShift,
  selectedShiftId,
}: ScheduleCalendarProps) {
  const { t } = useTranslation();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    }),
  );

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Group shifts by employee and day
  const shiftsByEmployeeAndDay = useMemo(() => {
    const map = new Map<string, Map<string, Shift[]>>();

    shifts.forEach((shift) => {
      const empId = shift.employeeId || "unassigned";
      const dayKey = format(parseISO(shift.startTime), "yyyy-MM-dd");

      if (!map.has(empId)) {
        map.set(empId, new Map());
      }
      const empMap = map.get(empId)!;
      if (!empMap.has(dayKey)) {
        empMap.set(dayKey, []);
      }
      empMap.get(dayKey)!.push(shift);
    });

    return map;
  }, [shifts]);

  // Get shifts for a specific employee and day
  const getShiftsForCell = useCallback(
    (employeeId: string, date: Date): Shift[] => {
      const empId = employeeId || "unassigned";
      const dayKey = format(date, "yyyy-MM-dd");
      return shiftsByEmployeeAndDay.get(empId)?.get(dayKey) || [];
    },
    [shiftsByEmployeeAndDay],
  );

  // Get unassigned shifts for a day
  const getUnassignedShifts = useCallback(
    (date: Date): Shift[] => {
      const dayKey = format(date, "yyyy-MM-dd");
      return shiftsByEmployeeAndDay.get("unassigned")?.get(dayKey) || [];
    },
    [shiftsByEmployeeAndDay],
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const shiftId = event.active.id as string;
    const shift = shifts.find((s) => s.id === shiftId);
    if (shift) {
      setActiveShift(shift);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShift(null);

    if (!over || isLocked) return;

    const shiftId = active.id as string;
    const [targetEmployeeId, targetDateStr] = (over.id as string).split("__");

    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    // Calculate new times preserving duration
    const oldStart = parseISO(shift.startTime);
    const oldEnd = parseISO(shift.endTime);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const targetDate = parseISO(targetDateStr);
    const newStart = new Date(targetDate);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    const updates: UpdateShiftInput = {
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      employeeId:
        targetEmployeeId === "unassigned" ? undefined : targetEmployeeId,
    };

    onShiftMove(shiftId, updates);
  };

  // Mobile day selector (unused - now always showing grid)
  // @ts-ignore - temporarily unused
  const renderDaySelector = () => {
    if (!isMobile) return null;

    return (
      <div className="mobile-day-selector">
        {weekDays.map((day, index) => (
          <button
            key={index}
            className={`day-button ${selectedDay === index ? "active" : ""}`}
            onClick={() => onDayChange?.(index)}
          >
            <span className="day-name">
              {format(day, "EEE", { locale: es })}
            </span>
            <span className="day-number">{format(day, "d")}</span>
          </button>
        ))}
      </div>
    );
  };

  // Desktop: Full week grid view
  const renderWeekGrid = () => {
    return (
      <div className="calendar-grid">
        {/* Header row with days */}
        <div className="calendar-header">
          <div className="header-cell employee-header">
            {t("schedule.employee")}
          </div>
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`header-cell day-header ${isSameDay(day, new Date()) ? "today" : ""}`}
            >
              <span className="day-name">
                {format(day, "EEE", { locale: es })}
              </span>
              <span className="day-number">
                {format(day, "d MMM", { locale: es })}
              </span>
            </div>
          ))}
        </div>

        {/* Unassigned row */}
        <div className="calendar-row unassigned-row">
          <div className="employee-cell">
            <div className="employee-info">
              <div className="unassigned-avatar">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <span className="employee-name">{t("schedule.unassigned")}</span>
            </div>
          </div>
          {weekDays.map((day, index) => (
            <DropCell
              key={index}
              id={`unassigned__${format(day, "yyyy-MM-dd")}`}
              date={day}
              employeeId="unassigned"
              shifts={getUnassignedShifts(day)}
              onCellClick={() => onCellClick(day, "")}
              onShiftClick={onShiftClick}
              onShiftContextMenu={onShiftContextMenu}
              onShiftSwapRequest={onShiftSwapRequest}
              currentEmployeeId={currentEmployeeId}
              isLocked={isLocked}
              copiedShift={copiedShift}
              selectedShiftId={selectedShiftId}
              canPaste={!!copiedShift}
            />
          ))}
        </div>

        {/* Employee rows */}
        {employees.map((employee) => (
          <div key={employee.id} className="calendar-row">
            <div className="employee-cell">
              <div className="employee-info">
                <div className="employee-avatar">
                  {employee.user.firstName.charAt(0)}
                  {employee.user.lastName.charAt(0)}
                </div>
                <div className="employee-details">
                  <span className="employee-name">
                    {employee.user.firstName} {employee.user.lastName}
                  </span>
                  {employee.position && (
                    <span className="employee-position">
                      {employee.position}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {weekDays.map((day, index) => (
              <DropCell
                key={index}
                id={`${employee.id}__${format(day, "yyyy-MM-dd")}`}
                date={day}
                employeeId={employee.id}
                shifts={getShiftsForCell(employee.id, day)}
                onCellClick={() => onCellClick(day, employee.id)}
                onShiftClick={onShiftClick}
                onShiftContextMenu={onShiftContextMenu}
                onShiftSwapRequest={onShiftSwapRequest}
                currentEmployeeId={currentEmployeeId}
                isLocked={isLocked}
                copiedShift={copiedShift}
                selectedShiftId={selectedShiftId}
                canPaste={!!copiedShift}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Mobile: Single day view (unused - now always showing grid)
  // @ts-ignore - temporarily unused
  const renderDayView = () => {
    const currentDay = weekDays[selectedDay];

    return (
      <div className="calendar-day-view">
        {/* Unassigned shifts */}
        <div className="day-section">
          <div className="day-section-header">
            <div className="unassigned-avatar small">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <span>{t("schedule.unassigned")}</span>
          </div>
          <DropCell
            id={`unassigned__${format(currentDay, "yyyy-MM-dd")}`}
            date={currentDay}
            employeeId="unassigned"
            shifts={getUnassignedShifts(currentDay)}
            onCellClick={() => onCellClick(currentDay, "")}
            onShiftClick={onShiftClick}
            onShiftContextMenu={onShiftContextMenu}
            onShiftSwapRequest={onShiftSwapRequest}
            currentEmployeeId={currentEmployeeId}
            isLocked={isLocked}
            isMobile
            copiedShift={copiedShift}
            selectedShiftId={selectedShiftId}
            canPaste={!!copiedShift}
          />
        </div>

        {/* Employee shifts */}
        {employees.map((employee) => (
          <div key={employee.id} className="day-section">
            <div className="day-section-header">
              <div className="employee-avatar small">
                {employee.user.firstName.charAt(0)}
                {employee.user.lastName.charAt(0)}
              </div>
              <div className="employee-info-mobile">
                <span className="employee-name">
                  {employee.user.firstName} {employee.user.lastName}
                </span>
                {employee.position && (
                  <span className="employee-position">{employee.position}</span>
                )}
              </div>
            </div>
            <DropCell
              id={`${employee.id}__${format(currentDay, "yyyy-MM-dd")}`}
              date={currentDay}
              employeeId={employee.id}
              shifts={getShiftsForCell(employee.id, currentDay)}
              onCellClick={() => onCellClick(currentDay, employee.id)}
              onShiftClick={onShiftClick}
              onShiftContextMenu={onShiftContextMenu}
              onShiftSwapRequest={onShiftSwapRequest}
              currentEmployeeId={currentEmployeeId}
              isLocked={isLocked}
              isMobile
              copiedShift={copiedShift}
              selectedShiftId={selectedShiftId}
              canPaste={!!copiedShift}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`schedule-calendar ${isMobile ? "mobile" : "desktop"}`}>
        {/* Mobile: Always show compact grid (no more single day view) */}
        {renderWeekGrid()}
      </div>

      <DragOverlay>
        {activeShift && <ShiftCard shift={activeShift} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
