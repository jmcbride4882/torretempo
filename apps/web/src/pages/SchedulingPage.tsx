import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { startOfWeek, addWeeks, subWeeks, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { scheduleService } from "../services/scheduleService";
import { employeeService } from "../services/employeeService";
import { tenantService } from "../services/tenantService";
import { shiftSwapService } from "../services/shiftSwapService";
import { useAuthorization } from "../hooks/useAuthorization";
import ScheduleHeader from "../components/scheduling/ScheduleHeader";
import ScheduleCalendar from "../components/scheduling/ScheduleCalendar";
import ShiftModal from "../components/scheduling/ShiftModal";
import ShiftContextMenu, {
  type ContextMenuPosition,
} from "../components/scheduling/ShiftContextMenu";
import type { ClipboardMode } from "../components/scheduling/ShiftCard";
import type {
  Schedule,
  Shift,
  CreateShiftInput,
  UpdateShiftInput,
} from "../types/schedule";
import type { Employee } from "../types/employee";
import "./SchedulingPage.css";

interface CopiedShift {
  shift: Shift;
  mode: ClipboardMode;
}

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function SchedulingPage() {
  const { t } = useTranslation();
  const { canManageEmployees } = useAuthorization();

  // State
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday start
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  // Modal state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [defaultShiftDate, setDefaultShiftDate] = useState<Date | null>(null);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string>("");

  // Mobile state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedDay, setSelectedDay] = useState(0);

  // Clipboard state for copy/cut/paste
  const [copiedShift, setCopiedShift] = useState<CopiedShift | null>(null);
  const [contextMenuShift, setContextMenuShift] = useState<Shift | null>(null);
  const [contextMenuPosition, setContextMenuPosition] =
    useState<ContextMenuPosition | null>(null);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Target cell for paste operation (when clicking on empty cell)
  const [pasteTargetCell, setPasteTargetCell] = useState<{
    date: Date;
    employeeId: string;
  } | null>(null);

  // Conflict tracking
  const hasConflicts = useMemo(() => {
    return shifts.some((s) => s.hasConflicts);
  }, [shifts]);

  const conflictCount = useMemo(() => {
    return shifts.filter((s) => s.hasConflicts).length;
  }, [shifts]);

  // Toast notification helper
  const showToast = useCallback(
    (message: string, type: ToastMessage["type"] = "success") => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 3000);
    },
    [],
  );

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
    setContextMenuShift(null);
  }, []);

  // Copy shift to clipboard
  const handleCopyShift = useCallback(
    (shift: Shift) => {
      setCopiedShift({ shift, mode: "copy" });
      setSelectedShift(shift);
      showToast(t("schedule.shiftCopied"), "success");
    },
    [t, showToast],
  );

  // Cut shift to clipboard
  const handleCutShift = useCallback(
    (shift: Shift) => {
      setCopiedShift({ shift, mode: "cut" });
      setSelectedShift(shift);
      showToast(t("schedule.shiftCut"), "info");
    },
    [t, showToast],
  );

  // Delete shift by ID
  const handleDeleteShiftById = useCallback(
    async (shiftId: string) => {
      try {
        await scheduleService.deleteShift(shiftId);
        setShifts((prev) => prev.filter((s) => s.id !== shiftId));
        setSelectedShift(null);

        // If deleted shift was in clipboard, clear it
        if (copiedShift?.shift.id === shiftId) {
          setCopiedShift(null);
        }

        showToast(t("schedule.shiftDeleted"), "success");
      } catch (err: unknown) {
        console.error("Failed to delete shift:", err);
        showToast(t("schedule.deleteError"), "error");
      }
    },
    [copiedShift, t, showToast],
  );

  // Paste shift to target cell
  const handlePasteShift = useCallback(
    async (targetDate: Date, targetEmployeeId: string) => {
      if (!copiedShift || !schedule) return;

      try {
        const originalShift = copiedShift.shift;

        // Calculate new times preserving duration
        const oldStart = parseISO(originalShift.startTime);
        const oldEnd = parseISO(originalShift.endTime);
        const duration = oldEnd.getTime() - oldStart.getTime();

        const newStart = new Date(targetDate);
        newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
        const newEnd = new Date(newStart.getTime() + duration);

        // Create new shift with same properties but new date/employee
        const newShiftInput: CreateShiftInput = {
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
          employeeId:
            targetEmployeeId && targetEmployeeId !== ""
              ? targetEmployeeId
              : undefined,
          role:
            originalShift.role && originalShift.role !== ""
              ? originalShift.role
              : undefined,
          location:
            originalShift.location && originalShift.location !== ""
              ? originalShift.location
              : undefined,
          notes:
            originalShift.notes && originalShift.notes !== ""
              ? originalShift.notes
              : undefined,
          color:
            originalShift.color && originalShift.color !== ""
              ? originalShift.color
              : undefined,
          breakMinutes: originalShift.breakMinutes || 0,
        };

        const created = await scheduleService.createShift(
          schedule.id,
          newShiftInput,
        );
        setShifts((prev) => [...prev, created]);

        // If it was a cut operation, delete the original shift
        if (copiedShift.mode === "cut") {
          await scheduleService.deleteShift(originalShift.id);
          setShifts((prev) => prev.filter((s) => s.id !== originalShift.id));
        }

        // Clear clipboard after paste (both copy and cut)
        setCopiedShift(null);

        showToast(t("schedule.shiftPasted"), "success");
        setPasteTargetCell(null);
      } catch (err: unknown) {
        console.error("Failed to paste shift:", err);
        showToast(t("schedule.pasteError"), "error");
      }
    },
    [copiedShift, schedule, t, showToast],
  );

  // Request swap for a shift
  const handleRequestSwap = useCallback(
    async (shift: Shift) => {
      if (!shift.employeeId) {
        showToast("Cannot swap unassigned shift", "error");
        return;
      }

      // For now, use a simple prompt to select target employee
      // TODO: Replace with proper modal UI
      const targetEmployeeId = window.prompt(
        t("schedule.swapWith") +
          ":\n\n" +
          employees
            .map((e) => `${e.id}: ${e.user.firstName} ${e.user.lastName}`)
            .join("\n") +
          "\n\nEnter employee ID:",
      );

      if (!targetEmployeeId || targetEmployeeId.trim() === "") {
        return; // User cancelled
      }

      const reason = window.prompt(t("schedule.swapReasonPlaceholder"));

      try {
        await shiftSwapService.create({
          shiftId: shift.id,
          requestedTo: targetEmployeeId.trim(),
          reason: reason || undefined,
        });

        showToast(t("schedule.swapRequestCreated"), "success");
      } catch (err: any) {
        console.error("Failed to create swap request:", err);
        showToast(
          err.response?.data?.error || t("schedule.swapError"),
          "error",
        );
      }
    },
    [employees, t, showToast],
  );

  // Handle right-click on shift card to show context menu
  const handleShiftContextMenu = useCallback(
    (shift: Shift, e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setContextMenuShift(shift);
      setSelectedShift(shift);
    },
    [],
  );

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load employees and locations on mount
  useEffect(() => {
    loadEmployees();
    loadLocations();
  }, []);

  // Load schedule and shifts when week or location changes
  useEffect(() => {
    loadScheduleForWeek();
  }, [currentWeekStart, selectedLocation]);

  // Keyboard shortcuts for copy/cut/paste/delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ignore if modal is open
      if (isShiftModalOpen) return;

      // Ignore if schedule is locked
      if (schedule?.status === "locked") return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Copy: Ctrl+C
      if (isCtrlOrCmd && e.key === "c" && selectedShift) {
        e.preventDefault();
        handleCopyShift(selectedShift);
      }

      // Cut: Ctrl+X
      if (isCtrlOrCmd && e.key === "x" && selectedShift) {
        e.preventDefault();
        handleCutShift(selectedShift);
      }

      // Paste: Ctrl+V
      if (isCtrlOrCmd && e.key === "v" && copiedShift && pasteTargetCell) {
        e.preventDefault();
        handlePasteShift(pasteTargetCell.date, pasteTargetCell.employeeId);
      }

      // Delete: Delete key
      if (e.key === "Delete" && selectedShift) {
        e.preventDefault();
        handleDeleteShiftById(selectedShift.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedShift,
    copiedShift,
    pasteTargetCell,
    isShiftModalOpen,
    schedule?.status,
    handleCopyShift,
    handleCutShift,
    handlePasteShift,
    handleDeleteShiftById,
  ]);

  const loadEmployees = async () => {
    try {
      const data = await employeeService.getAll();
      setEmployees(data.filter((e) => e.status === "active"));
    } catch (err: any) {
      console.error("Failed to load employees:", err);
    }
  };

  const loadLocations = async () => {
    try {
      const tenant = await tenantService.getSettings();
      setLocations(tenant.settings?.locations || []);
    } catch (err: any) {
      console.error("Failed to load locations:", err);
    }
  };

  const loadScheduleForWeek = async () => {
    try {
      setLoading(true);
      setError(null);

      const weekEnd = addWeeks(currentWeekStart, 1);
      const startDateStr = format(currentWeekStart, "yyyy-MM-dd");
      const endDateStr = format(weekEnd, "yyyy-MM-dd");

      // Try to find existing schedule for this week and location
      const schedules = await scheduleService.getAll({
        startDate: startDateStr,
        endDate: endDateStr,
      });

      // Filter by location if one is selected
      const filteredSchedules = selectedLocation
        ? schedules.filter((s) => s.location === selectedLocation)
        : schedules;

      if (filteredSchedules.length > 0) {
        // Use the first matching schedule
        const existingSchedule = filteredSchedules[0];
        setSchedule(existingSchedule);

        // Load shifts for this schedule
        const scheduleShifts = await scheduleService.getAllShiftsForSchedule(
          existingSchedule.id,
        );
        setShifts(scheduleShifts);
      } else {
        // No schedule exists for this week
        setSchedule(null);
        setShifts([]);
      }
    } catch (err: any) {
      console.error("Failed to load schedule:", err);
      setError(err.response?.data?.message || t("schedule.loadError"));
    } finally {
      setLoading(false);
    }
  };

  // Create a new schedule for the current week
  const handleCreateSchedule = async () => {
    try {
      setLoading(true);
      const weekEnd = addWeeks(currentWeekStart, 1);
      const weekEndAdjusted = new Date(weekEnd);
      weekEndAdjusted.setDate(weekEndAdjusted.getDate() - 1); // End on Sunday

      const locationSuffix = selectedLocation ? ` - ${selectedLocation}` : "";
      const newSchedule = await scheduleService.create({
        title: `${t("schedule.weekOf")} ${format(currentWeekStart, "d MMM", { locale: es })}${locationSuffix}`,
        startDate: currentWeekStart.toISOString(),
        endDate: weekEndAdjusted.toISOString(),
        location: selectedLocation || undefined,
      });

      setSchedule(newSchedule);
      setShifts([]);
    } catch (err: any) {
      console.error("Failed to create schedule:", err);
      setError(err.response?.data?.message || t("schedule.createError"));
    } finally {
      setLoading(false);
    }
  };

  // Publish schedule
  const handlePublish = async () => {
    if (!schedule || hasConflicts) return;

    try {
      setLoading(true);
      const updated = await scheduleService.publish(schedule.id);
      setSchedule(updated);
    } catch (err: any) {
      console.error("Failed to publish schedule:", err);
      setError(err.response?.data?.message || t("schedule.publishError"));
    } finally {
      setLoading(false);
    }
  };

  // Unpublish schedule
  const handleUnpublish = async () => {
    if (!schedule) return;

    try {
      setLoading(true);
      const updated = await scheduleService.unpublish(schedule.id);
      setSchedule(updated);
    } catch (err: any) {
      console.error("Failed to unpublish schedule:", err);
      setError(err.response?.data?.message || t("schedule.unpublishError"));
    } finally {
      setLoading(false);
    }
  };

  // Lock schedule
  const handleLock = async () => {
    if (!schedule) return;

    try {
      setLoading(true);
      const updated = await scheduleService.lock(schedule.id);
      setSchedule(updated);
    } catch (err: any) {
      console.error("Failed to lock schedule:", err);
      setError(err.response?.data?.message || t("schedule.lockError"));
    } finally {
      setLoading(false);
    }
  };

  // Unlock schedule
  const handleUnlock = async () => {
    if (!schedule) return;

    const reason = window.prompt(t("schedule.unlockReasonPrompt"));
    if (!reason) return;

    try {
      setLoading(true);
      const updated = await scheduleService.unlock(schedule.id, { reason });
      setSchedule(updated);
    } catch (err: any) {
      console.error("Failed to unlock schedule:", err);
      setError(err.response?.data?.message || t("schedule.unlockError"));
    } finally {
      setLoading(false);
    }
  };

  // Copy week
  const handleCopyWeek = async () => {
    if (!schedule) return;

    const nextWeekStart = addWeeks(currentWeekStart, 1);
    const nextWeekEnd = addWeeks(nextWeekStart, 1);
    const nextWeekEndAdjusted = new Date(nextWeekEnd);
    nextWeekEndAdjusted.setDate(nextWeekEndAdjusted.getDate() - 1);

    try {
      setLoading(true);
      await scheduleService.copy(schedule.id, {
        targetStartDate: nextWeekStart.toISOString(),
        targetEndDate: nextWeekEndAdjusted.toISOString(),
        copyAssignments: true,
      });
      // Navigate to next week to see copied schedule
      setCurrentWeekStart(nextWeekStart);
    } catch (err: any) {
      console.error("Failed to copy schedule:", err);
      setError(err.response?.data?.message || t("schedule.copyError"));
    } finally {
      setLoading(false);
    }
  };

  // Week navigation
  const handlePreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  // Open shift modal for new shift, or paste if clipboard has data
  const handleCellClick = useCallback(
    (date: Date, employeeId: string) => {
      if (!schedule || schedule.status === "locked") return;

      // Set paste target cell (for keyboard paste)
      setPasteTargetCell({ date, employeeId });

      // If we have a shift in clipboard, paste it
      if (copiedShift) {
        handlePasteShift(date, employeeId);
        return;
      }

      // Otherwise, open modal to create new shift
      setSelectedShift(null);
      setDefaultShiftDate(date);
      setDefaultEmployeeId(employeeId);
      setIsShiftModalOpen(true);
    },
    [schedule, copiedShift, handlePasteShift],
  );

  // Open shift modal for editing
  const handleShiftClick = useCallback((shift: Shift) => {
    setSelectedShift(shift);
    setDefaultShiftDate(null);
    setDefaultEmployeeId("");
    setIsShiftModalOpen(true);
  }, []);

  // Save shift (create or update)
  const handleSaveShift = async (data: CreateShiftInput | UpdateShiftInput) => {
    if (!schedule) return;

    try {
      if (selectedShift) {
        // Update existing shift
        const updated = await scheduleService.updateShift(
          selectedShift.id,
          data,
        );
        setShifts((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
      } else {
        // Create new shift
        const created = await scheduleService.createShift(
          schedule.id,
          data as CreateShiftInput,
        );
        setShifts((prev) => [...prev, created]);
      }
    } catch (err: any) {
      console.error("Failed to save shift:", err);
      throw err;
    }
  };

  // Delete shift
  const handleDeleteShift = async () => {
    if (!selectedShift) return;

    try {
      await scheduleService.deleteShift(selectedShift.id);
      setShifts((prev) => prev.filter((s) => s.id !== selectedShift.id));
    } catch (err: any) {
      console.error("Failed to delete shift:", err);
    }
  };

  // Print schedule
  const handlePrint = () => {
    window.print();
  };

  // Move shift (drag and drop)
  const handleShiftMove = async (
    shiftId: string,
    updates: UpdateShiftInput,
  ) => {
    if (!schedule || schedule.status === "locked") return;

    try {
      const updated = await scheduleService.updateShift(shiftId, updates);
      setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err: any) {
      console.error("Failed to move shift:", err);
      // Reload shifts to revert to previous state
      if (schedule) {
        const reloaded = await scheduleService.getAllShiftsForSchedule(
          schedule.id,
        );
        setShifts(reloaded);
      }
    }
  };

  // Loading state
  if (loading && !schedule && shifts.length === 0) {
    return (
      <div className="scheduling-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  // Check permissions
  const canEdit = canManageEmployees() && schedule?.status !== "locked";

  return (
    <div className="scheduling-page">
      {error && (
        <div className="error-banner">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Location Selector */}
      <div className="schedule-toolbar">
        <div className="location-selector">
          <label>{t("schedule.location")}</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="location-dropdown"
          >
            <option value="">{t("schedule.allLocations")}</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          {selectedLocation && (
            <span className="location-badge">{selectedLocation}</span>
          )}
        </div>
      </div>

      <ScheduleHeader
        schedule={schedule}
        hasConflicts={hasConflicts}
        conflictCount={conflictCount}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onLock={handleLock}
        onUnlock={handleUnlock}
        onCopyWeek={handleCopyWeek}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onCreateSchedule={handleCreateSchedule}
        onPrint={handlePrint}
        currentWeekStart={currentWeekStart}
        loading={loading}
      />

      {!schedule && !loading && (
        <div className="empty-schedule">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h2>{t("schedule.noSchedule")}</h2>
          <p>{t("schedule.createSchedulePrompt")}</p>
          {canManageEmployees() && (
            <button
              className="btn-primary large"
              onClick={handleCreateSchedule}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t("schedule.createSchedule")}
            </button>
          )}
        </div>
      )}

      {schedule && (
        <ScheduleCalendar
          weekStart={currentWeekStart}
          shifts={shifts}
          employees={employees}
          onShiftClick={handleShiftClick}
          onCellClick={handleCellClick}
          onShiftMove={handleShiftMove}
          onShiftContextMenu={handleShiftContextMenu}
          isLocked={schedule.status === "locked" || !canEdit}
          isMobile={isMobile}
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          copiedShift={copiedShift}
          selectedShiftId={selectedShift?.id || null}
        />
      )}

      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleSaveShift}
        onDelete={selectedShift ? handleDeleteShift : undefined}
        shift={selectedShift}
        employees={employees}
        defaultDate={defaultShiftDate || undefined}
        defaultEmployeeId={defaultEmployeeId}
        conflicts={selectedShift?.conflictDetails}
        isLocked={schedule?.status === "locked"}
      />

      {/* Context menu for shift actions */}
      {contextMenuPosition && contextMenuShift && (
        <ShiftContextMenu
          position={contextMenuPosition}
          onClose={closeContextMenu}
          onEdit={() => handleShiftClick(contextMenuShift)}
          onCopy={() => handleCopyShift(contextMenuShift)}
          onCut={() => handleCutShift(contextMenuShift)}
          onPaste={() => {
            if (pasteTargetCell) {
              handlePasteShift(
                pasteTargetCell.date,
                pasteTargetCell.employeeId,
              );
            }
          }}
          onRequestSwap={() => handleRequestSwap(contextMenuShift)}
          onDelete={() => handleDeleteShiftById(contextMenuShift.id)}
          canPaste={!!copiedShift}
          isLocked={schedule?.status === "locked"}
        />
      )}

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === "success" && (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            {toast.type === "error" && (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            {toast.type === "info" && (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
