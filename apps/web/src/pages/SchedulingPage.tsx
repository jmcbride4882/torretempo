import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  format,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { scheduleService } from "../services/scheduleService";
import { employeeService } from "../services/employeeService";
import { tenantService } from "../services/tenantService";
import { shiftSwapService } from "../services/shiftSwapService";
import { useAuthorization } from "../hooks/useAuthorization";
import { useAuthStore } from "../stores/authStore";
import ScheduleHeader from "../components/scheduling/ScheduleHeader";
import ScheduleCalendar from "../components/scheduling/ScheduleCalendar";
import MyShiftsToday from "../components/scheduling/MyShiftsToday";
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
  const { canManageEmployees, isPlatformAdmin } = useAuthorization();
  const { user } = useAuthStore();

  // Platform admins need tenant selection (future feature)
  if (isPlatformAdmin()) {
    return (
      <div className="platform-admin-placeholder">
        <div className="placeholder-content">
          <h2>{t("common.platformAdmin")}</h2>
          <p>{t("common.tenantSelectionRequired")}</p>
          <p>🚧 {t("common.tenantSelectorComingSoon")}</p>
        </div>
      </div>
    );
  }

  // State
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [tenantRoles, setTenantRoles] =
    useState<Array<{ name: string; color: string }>>(DEFAULT_ROLES); // Default roles, will be replaced with tenant-specific roles
  const [tenantName, setTenantName] = useState<string>(""); // Store tenant name for PDF
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
    async (
      targetEmployeeId: string | null,
      reason?: string,
      broadcastToRole?: boolean,
    ) => {
      if (!swapShift) return;

      try {
        await shiftSwapService.create({
          shiftId: swapShift.id,
          requestedTo: targetEmployeeId || undefined,
          reason: reason || undefined,
          broadcastToRole: broadcastToRole || undefined,
        });

        showToast(
          broadcastToRole
            ? t("schedule.swapBroadcastCreated") ||
                "Broadcast swap requests sent to all employees with same role"
            : t("schedule.swapRequestCreated"),
          "success",
        );
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
      // Store tenant name for PDF generation
      setTenantName(tenant.legalName || "");
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

  // Print schedule - Generate professional PDF
  const handlePrint = async () => {
    try {
      // Show loading toast
      showToast(t("schedule.generatingPDF"), "info");

      console.log("=== PDF Generation Started ===");

      // Dynamically import PDF libraries only when needed
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // Find the calendar element
      const calendarElement = document.querySelector(
        ".schedule-calendar",
      ) as HTMLElement;

      if (!calendarElement) {
        const errorMsg = "Calendar element not found";
        console.error(errorMsg);
        showToast(t("schedule.printError") + ": " + errorMsg, "error");
        return;
      }

      console.log("Calendar found:", calendarElement.className);

      // Ensure fonts loaded
      await document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Get the FULL scrollable width of the calendar
      const fullCalendarWidth = calendarElement.scrollWidth;
      const fullCalendarHeight = calendarElement.scrollHeight;

      console.log("Calendar dimensions:", {
        width: fullCalendarWidth,
        height: fullCalendarHeight,
      });

      // Capture calendar at HIGH resolution (scale: 3 for crisp print quality)
      const canvas = await html2canvas(calendarElement, {
        backgroundColor: "#ffffff",
        scale: 3, // High DPI for print quality
        logging: false,
        useCORS: true,
        allowTaint: false,
        width: fullCalendarWidth,
        height: fullCalendarHeight,
        windowWidth: fullCalendarWidth + 100,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          // Force full width in cloned document
          const clonedCalendar = clonedDoc.querySelector(
            ".schedule-calendar",
          ) as HTMLElement;
          if (clonedCalendar) {
            clonedCalendar.style.overflow = "visible";
            clonedCalendar.style.width = `${fullCalendarWidth}px`;
            clonedCalendar.style.maxWidth = "none";
          }

          // Ensure grid expands to full natural width
          const clonedGrid = clonedDoc.querySelector(
            ".calendar-grid",
          ) as HTMLElement;
          if (clonedGrid) {
            clonedGrid.style.minWidth = `${fullCalendarWidth}px`;
            clonedGrid.style.width = `${fullCalendarWidth}px`;
          }
        },
      });

      console.log("Canvas captured:", {
        width: canvas.width,
        height: canvas.height,
      });

      // Convert canvas to image data
      const imgData = canvas.toDataURL("image/png", 1.0);

      // Calculate PDF dimensions
      // Use A4 Landscape for wide schedules (297mm x 210mm)
      const pdfOrientation = "landscape";
      const pdfFormat = "a4";

      // A4 landscape: 297mm width, 210mm height
      const pdfWidth = 297;
      const pdfHeight = 210;

      // Margins
      const marginLeft = 10;
      const marginTop = 20; // Space for header
      const marginRight = 10;
      const marginBottom = 10;

      const contentWidth = pdfWidth - marginLeft - marginRight;
      const contentHeight = pdfHeight - marginTop - marginBottom;

      // Calculate image scaling to fit page width
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;

      // Create PDF
      const pdf = new jsPDF({
        orientation: pdfOrientation,
        unit: "mm",
        format: pdfFormat,
        compress: true,
      });

      // Add professional header with tenant and location
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);

      // Tenant name at top left
      pdf.text(tenantName || "Torre Tempo", marginLeft, 10);

      // Schedule title below tenant name
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Work Schedule", marginLeft, 16);

      // Location (if selected) - center top
      if (selectedLocation) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`Location: ${selectedLocation}`, pdfWidth / 2, 10, {
          align: "center",
        });
      }

      // Week range - center
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const weekRangeText = `${format(currentWeekStart, "MMM dd", {
        locale: t("common.language") === "es" ? es : undefined,
      })} - ${format(addDays(currentWeekStart, 6), "MMM dd, yyyy", {
        locale: t("common.language") === "es" ? es : undefined,
      })}`;
      pdf.text(weekRangeText, pdfWidth / 2, selectedLocation ? 16 : 12, {
        align: "center",
      });

      // Add generation date - top right
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`,
        pdfWidth - marginRight,
        10,
        { align: "right" },
      );

      // Add calendar image
      let yPosition = marginTop;

      // If image is taller than one page, split into multiple pages
      if (imgHeight > contentHeight) {
        let remainingHeight = imgHeight;
        let srcY = 0;

        while (remainingHeight > 0) {
          const sliceHeight = Math.min(contentHeight, remainingHeight);
          const srcHeight = (sliceHeight / imgWidth) * canvas.width;

          // Create a temporary canvas for this slice
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = srcHeight;
          const sliceCtx = sliceCanvas.getContext("2d");

          if (sliceCtx) {
            sliceCtx.drawImage(
              canvas,
              0,
              srcY,
              canvas.width,
              srcHeight,
              0,
              0,
              canvas.width,
              srcHeight,
            );

            const sliceImgData = sliceCanvas.toDataURL("image/png", 1.0);
            pdf.addImage(
              sliceImgData,
              "PNG",
              marginLeft,
              yPosition,
              imgWidth,
              sliceHeight,
            );
          }

          remainingHeight -= sliceHeight;
          srcY += srcHeight;

          if (remainingHeight > 0) {
            pdf.addPage();
            yPosition = marginTop;
          }
        }
      } else {
        // Single page - fits completely
        pdf.addImage(
          imgData,
          "PNG",
          marginLeft,
          yPosition,
          imgWidth,
          imgHeight,
        );
      }

      // Add footer to all pages
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `© ${new Date().getFullYear()} Lakeside La Torre (Murcia) Group SL - Designed by John McBride`,
          pdfWidth / 2,
          pdfHeight - 5,
          { align: "center" },
        );
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pdfWidth - marginRight,
          pdfHeight - 5,
          { align: "right" },
        );
      }

      // Generate filename
      const filename = `TorreTempo_Schedule_${format(currentWeekStart, "yyyy-MM-dd")}.pdf`;

      // Save PDF
      pdf.save(filename);

      console.log("PDF generated successfully:", filename);
      showToast(t("schedule.pdfGenerated"), "success");
    } catch (err: any) {
      console.error("Failed to generate PDF:", err);
      showToast(
        t("schedule.printError") + ": " + (err.message || "Unknown error"),
        "error",
      );
    }
  };

  // Share schedule to WhatsApp
  const handleShareWhatsApp = async () => {
    try {
      // Show loading toast
      showToast(t("schedule.capturingImage"), "info");

      console.log("=== WhatsApp Share (Simplified) ===");
      console.log("isMobile:", isMobile);
      console.log("Window width:", window.innerWidth);

      // Dynamically import html2canvas only when needed
      const { default: html2canvas } = await import("html2canvas");

      // Find the visible calendar (now mobile shows grid too!)
      const calendarElement = document.querySelector(
        ".schedule-calendar",
      ) as HTMLElement;

      if (!calendarElement) {
        const errorMsg = "Calendar element not found";
        console.error(errorMsg);
        showToast(t("schedule.shareError") + ": " + errorMsg, "error");
        return;
      }

      console.log("Calendar found:", calendarElement.className);

      // Ensure fonts loaded
      await document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture the calendar
      // CRITICAL FIX: Calculate the ACTUAL full width before cloning
      // The calendar has overflow-x: auto, so scrollWidth gives us the real content width
      const fullCalendarWidth = calendarElement.scrollWidth;
      console.log("Original calendar scrollWidth:", fullCalendarWidth);

      const canvas = await html2canvas(calendarElement, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: true, // Enable logging to debug
        useCORS: true,
        allowTaint: false,
        width: fullCalendarWidth, // Use the actual scrollable width
        height: calendarElement.scrollHeight,
        windowWidth: fullCalendarWidth + 100, // Add padding to ensure full capture
        x: 0, // Start from left edge
        y: 0, // Start from top edge
        scrollX: 0, // Reset any scroll offset
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          // Remove ALL overflow restrictions in the cloned document
          const clonedCalendar = clonedDoc.querySelector(
            ".schedule-calendar",
          ) as HTMLElement;
          if (clonedCalendar) {
            clonedCalendar.style.overflow = "visible";
            clonedCalendar.style.width = `${fullCalendarWidth}px`; // Set exact width
            clonedCalendar.style.maxWidth = "none";
          }

          // Ensure grid expands to full natural width
          const clonedGrid = clonedDoc.querySelector(
            ".calendar-grid",
          ) as HTMLElement;
          if (clonedGrid) {
            clonedGrid.style.width = `${fullCalendarWidth}px`;
            clonedGrid.style.minWidth = `${fullCalendarWidth}px`;
          }

          // Remove overflow from header
          const header = clonedDoc.querySelector(
            ".calendar-header",
          ) as HTMLElement;
          if (header) {
            header.style.overflow = "visible";
            header.style.width = `${fullCalendarWidth}px`;
          }

          // Remove overflow from all rows
          const rows = clonedDoc.querySelectorAll(".calendar-row");
          rows.forEach((row: Element) => {
            const rowEl = row as HTMLElement;
            rowEl.style.overflow = "visible";
            rowEl.style.width = `${fullCalendarWidth}px`;
          });

          // Ensure employee details are visible
          const employeeDetails =
            clonedDoc.querySelectorAll(".employee-details");
          employeeDetails.forEach((el: Element) => {
            const element = el as HTMLElement;
            element.style.display = "flex";
            element.style.visibility = "visible";
          });

          console.log("Cloned calendar set to width:", fullCalendarWidth);
          console.log("Captured employee details:", employeeDetails.length);
          console.log("Total rows:", rows.length);
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

      {/* My Shifts Today Widget - Shows current employee's shifts for today */}
      <MyShiftsToday shifts={shifts} currentEmployeeId={currentEmployeeId} />

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
