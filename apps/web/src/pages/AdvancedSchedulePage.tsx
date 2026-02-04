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
import { DndContext } from "@dnd-kit/core";
import { scheduleService } from "../services/scheduleService";
import { employeeService } from "../services/employeeService";
import { tenantService } from "../services/tenantService";
import { useAuthorization } from "../hooks/useAuthorization";
import { useModule } from "../hooks/useModule";
import ModuleLockedPanel from "../components/billing/ModuleLockedPanel";
import DragDropGrid from "../components/scheduling/DragDropGrid";
import ShiftTemplatePanel from "../components/scheduling/ShiftTemplatePanel";
import ShiftModal from "../components/scheduling/ShiftModal";
import { DEFAULT_ROLES } from "../components/scheduling/ShiftModal";
import type {
  Schedule,
  Shift,
  CreateShiftInput,
  UpdateShiftInput,
} from "../types/schedule";
import type { Employee } from "../types/employee";
import "./AdvancedSchedulePage.css";

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function AdvancedSchedulePage() {
  const { t } = useTranslation();
  const { isPlatformAdmin } = useAuthorization();
  const { enabled: moduleEnabled, isLoading: moduleLoading } = useModule(
    "advanced_scheduling",
  );

  // Module gating - show locked panel if not enabled
  if (!moduleLoading && !moduleEnabled) {
    return <ModuleLockedPanel moduleKey="advanced_scheduling" />;
  }

  // Platform admin placeholder
  if (isPlatformAdmin()) {
    return (
      <div className="platform-admin-placeholder">
        <div className="placeholder-content">
          <h2>{t("common.platformAdmin")}</h2>
          <p>{t("common.tenantSelectionRequired")}</p>
        </div>
      </div>
    );
  }

  return <AdvancedScheduleContent />;
}

/**
 * Main content component (separated to avoid hook rules violation)
 */
function AdvancedScheduleContent() {
  const { t, i18n } = useTranslation();
  const { canManageEmployees } = useAuthorization();
  const isSpanish = i18n.language === "es";

  // State
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [tenantRoles, setTenantRoles] =
    useState<Array<{ name: string; color: string }>>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  // UI state
  const [templatePanelCollapsed, setTemplatePanelCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileTemplateVisible, setMobileTemplateVisible] = useState(false);

  // Modal state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast helper
  const showToast = useCallback(
    (message: string, type: ToastMessage["type"] = "success") => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 3000);
    },
    [],
  );

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileTemplateVisible(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load data on mount
  useEffect(() => {
    loadEmployees();
    loadLocations();
  }, []);

  // Load schedule when week changes
  useEffect(() => {
    loadScheduleForWeek();
  }, [currentWeekStart, selectedLocation]);

  const loadEmployees = async () => {
    try {
      const data = await employeeService.getAll();
      setEmployees(data.filter((e) => e.status === "active"));
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  const loadLocations = async () => {
    try {
      const tenant = await tenantService.getSettings();
      setLocations(tenant.settings?.locations || []);
      setTenantRoles(tenant.settings?.roles || DEFAULT_ROLES);
    } catch (err) {
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

      const schedules = await scheduleService.getAll({
        startDate: startDateStr,
        endDate: endDateStr,
      });

      if (schedules.length > 0) {
        const existingSchedule = schedules[0];
        setSchedule(existingSchedule);
        const scheduleShifts = await scheduleService.getAllShiftsForSchedule(
          existingSchedule.id,
        );
        setShifts(scheduleShifts);
      } else {
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

  // Create schedule for current week
  const handleCreateSchedule = async () => {
    try {
      setLoading(true);
      const weekEnd = addWeeks(currentWeekStart, 1);
      const weekEndAdjusted = new Date(weekEnd);
      weekEndAdjusted.setDate(weekEndAdjusted.getDate() - 1);

      const newSchedule = await scheduleService.create({
        title: `${t("schedule.weekOf")} ${format(currentWeekStart, "d MMM", { locale: isSpanish ? es : undefined })}`,
        startDate: currentWeekStart.toISOString(),
        endDate: weekEndAdjusted.toISOString(),
      });

      setSchedule(newSchedule);
      setShifts([]);
      showToast(t("advancedScheduling.scheduleCreated"));
    } catch (err: any) {
      console.error("Failed to create schedule:", err);
      setError(err.response?.data?.message || t("schedule.createError"));
    } finally {
      setLoading(false);
    }
  };

  // Week navigation
  const handlePreviousWeek = () =>
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () =>
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handleToday = () =>
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Create shift from template drop
  const handleShiftCreate = async (data: CreateShiftInput) => {
    if (!schedule || !canManageEmployees()) return;

    try {
      const created = await scheduleService.createShift(schedule.id, data);
      setShifts((prev) => [...prev, created]);
      showToast(t("advancedScheduling.shiftCreated"));
    } catch (err: any) {
      console.error("Failed to create shift:", err);
      showToast(t("advancedScheduling.shiftCreateError"), "error");
    }
  };

  // Move shift via drag
  const handleShiftMove = async (
    shiftId: string,
    newDate: Date,
    newEmployeeId: string,
  ) => {
    if (!schedule || schedule.status === "locked" || !canManageEmployees())
      return;

    try {
      const shift = shifts.find((s) => s.id === shiftId);
      if (!shift) return;

      // Calculate new times preserving duration
      const oldStart = parseISO(shift.startTime);
      const oldEnd = parseISO(shift.endTime);
      const duration = oldEnd.getTime() - oldStart.getTime();

      const newStart = new Date(newDate);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);

      const updates: UpdateShiftInput = {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        employeeId: newEmployeeId,
      };

      const updated = await scheduleService.updateShift(shiftId, updates);
      setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast(t("advancedScheduling.shiftMoved"));
    } catch (err: any) {
      console.error("Failed to move shift:", err);
      showToast(t("advancedScheduling.shiftMoveError"), "error");
      loadScheduleForWeek(); // Reload to revert
    }
  };

  // Open shift modal
  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift);
    setIsShiftModalOpen(true);
  };

  // Save shift from modal
  const handleSaveShift = async (data: CreateShiftInput | UpdateShiftInput) => {
    if (!schedule || !canManageEmployees()) return;

    try {
      if (selectedShift) {
        const updated = await scheduleService.updateShift(
          selectedShift.id,
          data,
        );
        setShifts((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
      } else {
        const created = await scheduleService.createShift(
          schedule.id,
          data as CreateShiftInput,
        );
        setShifts((prev) => [...prev, created]);
      }
    } catch (err) {
      console.error("Failed to save shift:", err);
      throw err;
    }
  };

  // Delete shift
  const handleDeleteShift = async () => {
    if (!selectedShift || !canManageEmployees()) return;

    try {
      await scheduleService.deleteShift(selectedShift.id);
      setShifts((prev) => prev.filter((s) => s.id !== selectedShift.id));
      showToast(t("schedule.shiftDeleted"));
    } catch (err) {
      console.error("Failed to delete shift:", err);
    }
  };

  // Bulk operations
  const handleCopyWeek = async () => {
    if (!schedule) return;

    try {
      setLoading(true);
      const nextWeekStart = addWeeks(currentWeekStart, 1);
      const nextWeekEnd = addWeeks(nextWeekStart, 1);
      const nextWeekEndAdjusted = new Date(nextWeekEnd);
      nextWeekEndAdjusted.setDate(nextWeekEndAdjusted.getDate() - 1);

      await scheduleService.copy(schedule.id, {
        targetStartDate: nextWeekStart.toISOString(),
        targetEndDate: nextWeekEndAdjusted.toISOString(),
        copyAssignments: true,
      });

      setCurrentWeekStart(nextWeekStart);
      showToast(t("advancedScheduling.weekCopied"));
    } catch (err: any) {
      console.error("Failed to copy week:", err);
      showToast(t("schedule.copyError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearWeek = async () => {
    if (!schedule || !confirm(t("advancedScheduling.confirmClearWeek"))) return;

    try {
      setLoading(true);
      // Delete all shifts for this schedule
      for (const shift of shifts) {
        await scheduleService.deleteShift(shift.id);
      }
      setShifts([]);
      showToast(t("advancedScheduling.weekCleared"));
    } catch (err) {
      console.error("Failed to clear week:", err);
      showToast(t("advancedScheduling.clearError"), "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter shifts by location
  const filteredShifts = useMemo(() => {
    if (!selectedLocation) return shifts;
    return shifts.filter((s) => s.location === selectedLocation);
  }, [shifts, selectedLocation]);

  // Format week range
  const weekRange = useMemo(() => {
    const endDate = addDays(currentWeekStart, 6);
    const startStr = format(currentWeekStart, "d MMM", {
      locale: isSpanish ? es : undefined,
    });
    const endStr = format(endDate, "d MMM yyyy", {
      locale: isSpanish ? es : undefined,
    });
    return `${startStr} - ${endStr}`;
  }, [currentWeekStart, isSpanish]);

  const canEdit = canManageEmployees() && schedule?.status !== "locked";

  // Loading state
  if (loading && !schedule && shifts.length === 0) {
    return (
      <div className="advanced-scheduling-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext>
      <div className="advanced-scheduling-page">
        {/* Error banner */}
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

        {/* Header */}
        <div className="advanced-schedule-header">
          <div className="header-left">
            <h1 className="page-title">{t("advancedScheduling.title")}</h1>
            {schedule && (
              <span className={`status-badge status-${schedule.status}`}>
                {t(`schedule.status.${schedule.status}`)}
              </span>
            )}
          </div>

          <div className="header-center">
            <button
              className="nav-btn"
              onClick={handlePreviousWeek}
              aria-label="Previous week"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button className="week-display" onClick={handleToday}>
              {weekRange}
            </button>
            <button
              className="nav-btn"
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="header-right">
            {/* Location selector */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="location-select"
            >
              <option value="">{t("schedule.allLocations")}</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {/* Bulk actions */}
            {canEdit && schedule && (
              <div className="bulk-actions">
                <button
                  className="btn-secondary"
                  onClick={handleCopyWeek}
                  title={t("advancedScheduling.actions.copyWeek")}
                >
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
                  <span className="btn-text">
                    {t("advancedScheduling.actions.copyWeek")}
                  </span>
                </button>
                <button
                  className="btn-secondary btn-danger"
                  onClick={handleClearWeek}
                  title={t("advancedScheduling.actions.clearWeek")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span className="btn-text">
                    {t("advancedScheduling.actions.clearWeek")}
                  </span>
                </button>
              </div>
            )}

            {/* Mobile template toggle */}
            {isMobile && canEdit && (
              <button
                className="btn-primary mobile-template-toggle"
                onClick={() => setMobileTemplateVisible(!mobileTemplateVisible)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Main content */}
        {!schedule && !loading ? (
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
        ) : (
          <div className="schedule-content">
            {/* Template sidebar (desktop) */}
            {!isMobile && canEdit && (
              <ShiftTemplatePanel
                isCollapsed={templatePanelCollapsed}
                onToggleCollapse={() =>
                  setTemplatePanelCollapsed(!templatePanelCollapsed)
                }
              />
            )}

            {/* Template panel (mobile overlay) */}
            {isMobile && mobileTemplateVisible && canEdit && (
              <>
                <div
                  className="mobile-overlay"
                  onClick={() => setMobileTemplateVisible(false)}
                />
                <ShiftTemplatePanel
                  isCollapsed={false}
                  onToggleCollapse={() => setMobileTemplateVisible(false)}
                />
              </>
            )}

            {/* Grid */}
            <div className="grid-container">
              <DragDropGrid
                weekStart={currentWeekStart}
                shifts={filteredShifts}
                employees={employees}
                onShiftCreate={handleShiftCreate}
                onShiftMove={handleShiftMove}
                onShiftClick={handleShiftClick}
                selectedShiftId={selectedShift?.id}
                isLocked={!canEdit}
              />
            </div>
          </div>
        )}

        {/* Shift modal */}
        <ShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => {
            setIsShiftModalOpen(false);
            setSelectedShift(null);
          }}
          onSave={handleSaveShift}
          onDelete={selectedShift ? handleDeleteShift : undefined}
          shift={selectedShift}
          employees={employees}
          locations={locations}
          tenantRoles={tenantRoles}
          conflicts={selectedShift?.conflictDetails}
          isLocked={!canEdit}
        />

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
    </DndContext>
  );
}
