import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { startOfWeek, addWeeks, subWeeks, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import html2canvas from "html2canvas";
import { scheduleService } from "../services/scheduleService";
import { employeeService } from "../services/employeeService";
import { tenantService } from "../services/tenantService";
import { shiftSwapService } from "../services/shiftSwapService";
import { useAuthorization } from "../hooks/useAuthorization";
import { useAuthStore } from "../stores/authStore";
import ScheduleHeader from "../components/scheduling/ScheduleHeader";
import ScheduleCalendar from "../components/scheduling/ScheduleCalendar";
import ShiftModal from "../components/scheduling/ShiftModal";
import SwapShiftModal from "../components/scheduling/SwapShiftModal";
import RoleLegend from "../components/scheduling/RoleLegend";
import ShiftContextMenu, {
  type ContextMenuPosition,
} from "../components/scheduling/ShiftContextMenu";
import { DEFAULT_ROLES } from "../components/scheduling/ShiftModal";
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
  const { user } = useAuthStore();

  // State
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [tenantRoles, setTenantRoles] =
    useState<Array<{ name: string; color: string }>>(DEFAULT_ROLES); // Default roles, will be replaced with tenant-specific roles
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

  // Swap modal state
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapShift, setSwapShift] = useState<Shift | null>(null);

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

  // Get current user's employee ID for swap button visibility
  const currentEmployeeId = useMemo(() => {
    if (!user) return null;
    const currentEmployee = employees.find((emp) => emp.userId === user.id);
    return currentEmployee?.id || null;
  }, [user, employees]);

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
      // Block employees from copying shifts
      if (!canManageEmployees()) return;

      setCopiedShift({ shift, mode: "copy" });
      setSelectedShift(shift);
      showToast(t("schedule.shiftCopied"), "success");
    },
    [t, showToast],
  );

  // Cut shift to clipboard
  const handleCutShift = useCallback(
    (shift: Shift) => {
      // Block employees from cutting shifts (destructive operation)
      if (!canManageEmployees()) return;

      setCopiedShift({ shift, mode: "cut" });
      setSelectedShift(shift);
      showToast(t("schedule.shiftCut"), "info");
    },
    [t, showToast],
  );

  // Delete shift by ID
  const handleDeleteShiftById = useCallback(
    async (shiftId: string) => {
      // Block employees from deleting shifts
      if (!canManageEmployees()) return;

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
      // Block employees from pasting shifts (creates new shift)
      if (!copiedShift || !schedule || !canManageEmployees()) return;

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
    (shift: Shift) => {
      if (!shift.employeeId) {
        showToast("Cannot swap unassigned shift", "error");
        return;
      }

      setSwapShift(shift);
      setIsSwapModalOpen(true);
    },
    [showToast],
  );

  // Handle swap submission
  const handleSwapSubmit = useCallback(
    async (targetEmployeeId: string, reason?: string) => {
      if (!swapShift) return;

      try {
        await shiftSwapService.create({
          shiftId: swapShift.id,
          requestedTo: targetEmployeeId,
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
    [swapShift, t, showToast],
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
      // Load tenant-configured roles or use defaults
      setTenantRoles(tenant.settings?.roles || DEFAULT_ROLES);
    } catch (err: any) {
      console.error("Failed to load tenant settings:", err);
    }
  };

  const loadScheduleForWeek = async () => {
    try {
      setLoading(true);
      setError(null);

      const weekEnd = addWeeks(currentWeekStart, 1);
      const startDateStr = format(currentWeekStart, "yyyy-MM-dd");
      const endDateStr = format(weekEnd, "yyyy-MM-dd");

      // Try to find existing schedule for this week (one schedule per week for entire business)
      const schedules = await scheduleService.getAll({
        startDate: startDateStr,
        endDate: endDateStr,
      });

      if (schedules.length > 0) {
        // Use the first matching schedule (should only be one per week)
        const existingSchedule = schedules[0];
        setSchedule(existingSchedule);

        // Load ALL shifts for this schedule
        // Location filtering happens in render, not in data loading
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

      const newSchedule = await scheduleService.create({
        title: `${t("schedule.weekOf")} ${format(currentWeekStart, "d MMM", { locale: es })}`,
        startDate: currentWeekStart.toISOString(),
        endDate: weekEndAdjusted.toISOString(),
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
      // Block employees from creating/editing shifts
      if (!schedule || schedule.status === "locked" || !canManageEmployees())
        return;

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

  // Open shift modal for viewing/editing
  const handleShiftClick = useCallback((shift: Shift) => {
    // Everyone can VIEW shifts, but employees see read-only modal
    setSelectedShift(shift);
    setDefaultShiftDate(null);
    setDefaultEmployeeId("");
    setIsShiftModalOpen(true);
  }, []);

  // Save shift (create or update)
  const handleSaveShift = async (data: CreateShiftInput | UpdateShiftInput) => {
    // Block employees from saving shifts
    if (!schedule || !canManageEmployees()) return;

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
    // Block employees from deleting shifts
    if (!selectedShift || !canManageEmployees()) return;

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

  // Share schedule to WhatsApp
  const handleShareWhatsApp = async () => {
    try {
      // Show loading toast
      showToast(t("schedule.capturingImage"), "info");

      console.log("Share WhatsApp: Starting capture, is mobile:", isMobile);

      // Find the calendar to capture
      // On mobile: Use hidden desktop calendar, on desktop: Use visible calendar
      let calendarElement: HTMLElement | null;

      if (isMobile) {
        // Mobile: Find hidden desktop calendar
        const hiddenContainer = document.getElementById(
          "hidden-desktop-calendar",
        );
        if (hiddenContainer) {
          calendarElement = hiddenContainer.querySelector(
            ".schedule-calendar",
          ) as HTMLElement;
        } else {
          calendarElement = null;
        }
        console.log("Mobile: Looking for hidden desktop calendar");
      } else {
        // Desktop: Use visible calendar
        calendarElement = document.querySelector(
          ".schedule-calendar.desktop",
        ) as HTMLElement;
        console.log("Desktop: Using visible calendar");
      }

      if (!calendarElement) {
        const errorMsg = `Calendar element not found (isMobile: ${isMobile})`;
        console.error(errorMsg);
        showToast(t("schedule.shareError") + ": " + errorMsg, "error");
        return;
      }

      console.log("Calendar found, preparing capture...");

      // FIX 1: Ensure fonts are loaded before capture
      await document.fonts.ready;
      // Small delay to ensure browser rendering is complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // FIX 2: Capture styles from ORIGINAL elements BEFORE cloning
      const originalEmployeeNames =
        calendarElement.querySelectorAll(".employee-name");
      const employeeNameStyles = Array.from(originalEmployeeNames).map((el) => {
        const computed = window.getComputedStyle(el as Element);
        return {
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          color: computed.color,
          lineHeight: computed.lineHeight,
        };
      });

      const originalEmployeePositions =
        calendarElement.querySelectorAll(".employee-position");
      const employeePositionStyles = Array.from(originalEmployeePositions).map(
        (el) => {
          const computed = window.getComputedStyle(el as Element);
          return {
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            color: computed.color,
          };
        },
      );

      // FIX 3: Capture with font rendering fixes
      const canvas = await html2canvas(calendarElement, {
        backgroundColor: "#ffffff",
        scale: 2, // Higher quality
        logging: false, // Disable logging in production
        useCORS: true,
        allowTaint: false,
        width: Math.max(1200, calendarElement.scrollWidth), // Capture full width
        windowWidth: 1400, // Force wide viewport to show all columns
        onclone: (clonedDoc) => {
          // CRITICAL FIX: Force employee-details to be visible (hidden on mobile by default)
          const employeeDetailsContainers =
            clonedDoc.querySelectorAll(".employee-details");
          employeeDetailsContainers.forEach((el) => {
            const container = el as HTMLElement;
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.minWidth = "120px"; // Ensure minimum width for full names
            container.style.width = "auto";
            container.style.maxWidth = "none"; // Remove max-width constraint
            container.style.visibility = "visible";
            container.style.opacity = "1";
          });

          // Force employee-info containers to be visible with full width
          const employeeInfoContainers =
            clonedDoc.querySelectorAll(".employee-info");
          employeeInfoContainers.forEach((el) => {
            const container = el as HTMLElement;
            container.style.display = "flex";
            container.style.visibility = "visible";
            container.style.width = "100%";
            container.style.minWidth = "0";
          });

          // Apply captured styles to cloned employee names
          const clonedEmployeeNames =
            clonedDoc.querySelectorAll(".employee-name");
          clonedEmployeeNames.forEach((el, index) => {
            const clonedEl = el as HTMLElement;
            const styles = employeeNameStyles[index];
            if (styles) {
              clonedEl.style.fontFamily = styles.fontFamily;
              clonedEl.style.fontSize = styles.fontSize;
              clonedEl.style.fontWeight = styles.fontWeight;
              clonedEl.style.color = styles.color;
              clonedEl.style.lineHeight = styles.lineHeight;
              clonedEl.style.visibility = "visible";
              clonedEl.style.display = "block"; // Changed to block for full width
              clonedEl.style.opacity = "1";
              // FIX: Remove text truncation to show full names
              clonedEl.style.whiteSpace = "normal";
              clonedEl.style.overflow = "visible";
              clonedEl.style.textOverflow = "clip";
              clonedEl.style.wordBreak = "break-word";
            }
          });

          // Apply styles to cloned employee positions
          const clonedEmployeePositions =
            clonedDoc.querySelectorAll(".employee-position");
          clonedEmployeePositions.forEach((el, index) => {
            const clonedEl = el as HTMLElement;
            const styles = employeePositionStyles[index];
            if (styles) {
              clonedEl.style.fontFamily = styles.fontFamily;
              clonedEl.style.fontSize = styles.fontSize;
              clonedEl.style.color = styles.color;
              clonedEl.style.visibility = "visible";
              clonedEl.style.opacity = "1";
              // FIX: Remove text truncation for positions too
              clonedEl.style.whiteSpace = "normal";
              clonedEl.style.overflow = "visible";
              clonedEl.style.textOverflow = "clip";
            }
          });

          // AGGRESSIVE FIX: Force all text to be visible
          const allTextElements = clonedDoc.querySelectorAll(
            "span, p, h1, h2, h3, h4, h5, h6, div",
          );
          allTextElements.forEach((el) => {
            const element = el as HTMLElement;
            if (element.textContent && element.textContent.trim() !== "") {
              element.style.opacity = "1";
              element.style.visibility = "visible";
              element.style.color = element.style.color || "#000";
            }
          });

          // Debug logging
          console.log("Cloned employee names:", clonedEmployeeNames.length);
          console.log(
            "Employee name styles applied:",
            employeeNameStyles.length,
          );
        },
      });

      console.log(
        "Canvas captured successfully, size:",
        canvas.width,
        "x",
        canvas.height,
      );

      // FIX 4: Use synchronous conversion for PWA compatibility
      const dataUrl = canvas.toDataURL("image/png", 0.95);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "schedule.png", { type: "image/png" });

      // Format week range for share message (both mobile and desktop)
      const weekRange = formatWeekRange(currentWeekStart);
      const shareMessage = `${t("schedule.shareText")} ${weekRange}`;

      // Mobile: Use Web Share API if available
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: t("schedule.shareTitle"),
            text: shareMessage, // Now includes date range
          });
          showToast(t("schedule.shareSuccess"), "success");
        } catch (err: any) {
          // User cancelled share or error occurred
          if (err.name !== "AbortError") {
            console.error("Share failed:", err);
            showToast(t("schedule.shareError"), "error");
          }
        }
      } else {
        // Desktop: Open WhatsApp Web with message
        const message = encodeURIComponent(shareMessage);
        const whatsappUrl = `https://wa.me/?text=${message}`;

        // Download image for manual sharing
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `schedule-${format(currentWeekStart, "yyyy-MM-dd")}.png`;
        a.click();
        URL.revokeObjectURL(url);

        // Open WhatsApp Web
        window.open(whatsappUrl, "_blank");
        showToast(t("schedule.imageDownloaded"), "success");
      }
    } catch (err: any) {
      console.error("Failed to share schedule:", err);
      const errorMessage = err?.message || err?.toString() || "Unknown error";
      showToast(t("schedule.shareError") + ": " + errorMessage, "error");

      // Log detailed error info
      console.error("Error details:", {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        isPWA: window.matchMedia("(display-mode: standalone)").matches,
        userAgent: navigator.userAgent,
      });
    }
  };

  // Helper function to format week range for share message (respects i18n language)
  const formatWeekRange = (startDate: Date) => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const startDay = startDate.getDate();
    const endDay = endDate.getDate();

    // Use current i18n language for date formatting
    const locale = t("schedule.locale"); // Get locale from translations
    const startMonth = startDate.toLocaleDateString(locale, {
      month: "short",
    });
    const endMonth = endDate.toLocaleDateString(locale, { month: "short" });
    const year = startDate.getFullYear();

    if (startMonth === endMonth) {
      return `${startDay}-${endDay} ${startMonth} ${year}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  };

  // Move shift (drag and drop)
  const handleShiftMove = async (
    shiftId: string,
    updates: UpdateShiftInput,
  ) => {
    // Block employees from moving shifts
    if (!schedule || schedule.status === "locked" || !canManageEmployees())
      return;

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

      {/* Role Color Legend */}
      <RoleLegend roles={tenantRoles} />

      <ScheduleHeader
        schedule={schedule}
        hasConflicts={hasConflicts}
        conflictCount={conflictCount}
        selectedLocation={selectedLocation}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onLock={handleLock}
        onUnlock={handleUnlock}
        onCopyWeek={handleCopyWeek}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onCreateSchedule={handleCreateSchedule}
        onPrint={handlePrint}
        onShareWhatsApp={handleShareWhatsApp}
        currentWeekStart={currentWeekStart}
        loading={loading}
        canManage={canManageEmployees()}
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
          shifts={
            selectedLocation
              ? shifts.filter((s) => s.location === selectedLocation)
              : shifts
          }
          employees={employees}
          onShiftClick={handleShiftClick}
          onCellClick={handleCellClick}
          onShiftMove={handleShiftMove}
          onShiftContextMenu={handleShiftContextMenu}
          onShiftSwapRequest={handleRequestSwap}
          currentEmployeeId={currentEmployeeId}
          isLocked={schedule.status === "locked" || !canEdit}
          isMobile={isMobile}
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          copiedShift={copiedShift}
          selectedShiftId={selectedShift?.id || null}
        />
      )}

      {/* Hidden desktop calendar for WhatsApp capture on mobile */}
      {schedule && isMobile && (
        <div
          id="hidden-desktop-calendar"
          style={{
            position: "absolute",
            left: "-9999px",
            top: "0",
            width: "1400px",
            visibility: "visible",
            pointerEvents: "none",
          }}
        >
          <ScheduleCalendar
            weekStart={currentWeekStart}
            shifts={
              selectedLocation
                ? shifts.filter((s) => s.location === selectedLocation)
                : shifts
            }
            employees={employees}
            onShiftClick={() => {}}
            onCellClick={() => {}}
            onShiftMove={() => {}}
            currentEmployeeId={currentEmployeeId}
            isLocked={true}
            isMobile={false}
            selectedDay={0}
            copiedShift={null}
            selectedShiftId={null}
          />
        </div>
      )}

      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleSaveShift}
        onDelete={selectedShift ? handleDeleteShift : undefined}
        shift={selectedShift}
        employees={employees}
        locations={locations}
        tenantRoles={tenantRoles}
        defaultDate={defaultShiftDate || undefined}
        defaultEmployeeId={defaultEmployeeId}
        conflicts={selectedShift?.conflictDetails}
        isLocked={schedule?.status === "locked" || !canManageEmployees()}
      />

      {/* Swap shift modal */}
      <SwapShiftModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        onSubmit={handleSwapSubmit}
        shift={swapShift}
        employees={employees}
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
          canManage={canManageEmployees()}
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
