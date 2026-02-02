import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type {
  Shift,
  CreateShiftInput,
  UpdateShiftInput,
  Conflict,
} from "../../types/schedule";
import type { Employee } from "../../types/employee";
import "./ShiftModal.css";

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateShiftInput | UpdateShiftInput) => void;
  onDelete?: () => void;
  shift?: Shift | null;
  employees: Employee[];
  locations?: string[];
  tenantRoles?: Array<{ name: string; color: string }>; // Tenant-configured roles
  defaultDate?: Date;
  defaultEmployeeId?: string;
  conflicts?: Conflict[];
  isLocked?: boolean;
}

// Default roles and colors (used as fallback when tenant hasn't configured custom roles)
export const DEFAULT_ROLES = [
  // Management (Purple/Indigo)
  { name: "General Manager", color: "#6366f1" },
  { name: "Manager", color: "#8b5cf6" },
  { name: "Assistant Manager", color: "#a78bfa" },
  { name: "Supervisor", color: "#c4b5fd" },

  // Kitchen (Red/Orange)
  { name: "Head Chef", color: "#dc2626" },
  { name: "Sous Chef", color: "#ef4444" },
  { name: "Chef", color: "#f87171" },
  { name: "Cook", color: "#f59e0b" },
  { name: "Kitchen Porter", color: "#fb923c" },

  // Bar (Green)
  { name: "Bar Manager", color: "#059669" },
  { name: "Bartender", color: "#10b981" },

  // Front of House (Blue)
  { name: "Receptionist", color: "#0284c7" },
  { name: "Waiter/Waitress", color: "#3b82f6" },
  { name: "Runner/Busser", color: "#60a5fa" },

  // Specialized (Various)
  { name: "Lifeguard", color: "#06b6d4" },
  { name: "Maintenance", color: "#f59e0b" },
  { name: "Accountant", color: "#1e293b" },
  { name: "Cleaning", color: "#94a3b8" },
  { name: "Security", color: "#475569" },
];

// Helper function to get color for a role from the roles array
export const getColorForRole = (
  role: string,
  roles: Array<{ name: string; color: string }>,
): string => {
  const foundRole = roles.find((r) => r.name === role);
  return foundRole?.color || "#6366f1"; // Fallback to indigo
};

export default function ShiftModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  shift,
  employees,
  locations = [],
  tenantRoles = DEFAULT_ROLES, // Use tenant roles or fallback to defaults
  defaultDate,
  defaultEmployeeId,
  conflicts,
  isLocked,
}: ShiftModalProps) {
  const { t } = useTranslation();
  const isEditing = !!shift;

  // Form state
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (shift) {
        // Editing existing shift
        const shiftStartDate = new Date(shift.startTime);
        const shiftEndDate = new Date(shift.endTime);
        setStartDate(format(shiftStartDate, "yyyy-MM-dd"));
        setStartTime(format(shiftStartDate, "HH:mm"));
        setEndTime(format(shiftEndDate, "HH:mm"));
        setBreakMinutes(shift.breakMinutes || 0);
        setRole(shift.role || "");
        setLocation(shift.location || "");
        setEmployeeId(shift.employeeId || "");
        setColor(shift.color || "#6366f1");
        setNotes(shift.notes || "");
      } else {
        // Creating new shift
        const date = defaultDate || new Date();
        setStartDate(format(date, "yyyy-MM-dd"));
        setStartTime("09:00");
        setEndTime("17:00");
        setBreakMinutes(30);
        setRole("");
        setLocation("");
        setEmployeeId(defaultEmployeeId || "");
        setColor("#6366f1");
        setNotes("");
      }
    }
  }, [isOpen, shift, defaultDate, defaultEmployeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const startDateTime = `${startDate}T${startTime}:00.000Z`;
      const endDateTime = `${startDate}T${endTime}:00.000Z`;

      const data: CreateShiftInput | UpdateShiftInput = {
        startTime: startDateTime,
        endTime: endDateTime,
        breakMinutes,
        role: role || undefined,
        location: location || undefined,
        employeeId: employeeId || undefined,
        color,
        notes: notes || undefined,
      };

      await onSave(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (onDelete && window.confirm(t("schedule.confirmDeleteShift"))) {
      onDelete();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content shift-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            {isLocked && isEditing
              ? "View Shift Details"
              : isEditing
                ? t("schedule.editShift")
                : t("schedule.createShift")}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <svg
              width="24"
              height="24"
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

        {conflicts && conflicts.length > 0 && (
          <div className="shift-conflicts">
            <div className="conflict-header">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{t("schedule.conflictsDetected")}</span>
            </div>
            <ul>
              {conflicts.map((conflict, index) => (
                <li key={index} className={`conflict-${conflict.severity}`}>
                  {conflict.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>{t("schedule.date")}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
          </div>

          <div className="form-row two-columns">
            <div className="form-group">
              <label>{t("schedule.startTime")}</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
            <div className="form-group">
              <label>{t("schedule.endTime")}</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
          </div>

          <div className="form-row two-columns">
            <div className="form-group">
              <label>{t("schedule.breakMinutes")}</label>
              <input
                type="number"
                min="0"
                max="120"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
                disabled={isLocked}
              />
            </div>
            <div className="form-group">
              <label>
                {t("schedule.role")} <span className="required">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => {
                  const selectedRole = e.target.value;
                  setRole(selectedRole);
                  // Automatically set color based on tenant's configured role
                  setColor(getColorForRole(selectedRole, tenantRoles));
                }}
                disabled={isLocked}
                required
              >
                <option value="">{t("schedule.selectRole")}</option>
                {tenantRoles.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t("schedule.assignEmployee")}</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={isLocked}
              >
                <option value="">{t("schedule.unassigned")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.user.firstName} {emp.user.lastName}
                    {emp.position ? ` - ${emp.position}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t("schedule.location")}</label>
              {locations.length > 0 ? (
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isLocked}
                >
                  <option value="">{t("schedule.allLocations")}</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t("schedule.locationPlaceholder")}
                  disabled={isLocked}
                />
              )}
            </div>
          </div>

          {/* Color is automatically assigned based on role - no manual selection needed */}

          <div className="form-row">
            <div className="form-group">
              <label>{t("schedule.notes")}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("schedule.notesPlaceholder")}
                rows={3}
                disabled={isLocked}
              />
            </div>
          </div>

          <div className="modal-footer">
            {isEditing && onDelete && !isLocked && (
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={saving}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {t("common.delete")}
              </button>
            )}
            <div className="modal-footer-right">
              <button type="button" className="btn-cancel" onClick={onClose}>
                {t("common.cancel")}
              </button>
              {!isLocked && (
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? t("common.loading") : t("common.save")}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
