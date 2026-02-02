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
  defaultDate?: Date;
  defaultEmployeeId?: string;
  conflicts?: Conflict[];
  isLocked?: boolean;
}

const SHIFT_COLORS = [
  { value: "#6366f1", name: "Indigo" },
  { value: "#8b5cf6", name: "Violeta" },
  { value: "#ec4899", name: "Rosa" },
  { value: "#ef4444", name: "Rojo" },
  { value: "#f59e0b", name: "Naranja" },
  { value: "#10b981", name: "Verde" },
  { value: "#06b6d4", name: "Cian" },
  { value: "#3b82f6", name: "Azul" },
];

const COMMON_ROLES = [
  "Camarero/a",
  "Bartender",
  "Chef",
  "Cocinero/a",
  "Recepcionista",
  "Limpieza",
  "Seguridad",
  "Manager",
];

export default function ShiftModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  shift,
  employees,
  locations = [],
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
            {isEditing ? t("schedule.editShift") : t("schedule.createShift")}
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
              <label>{t("schedule.role")}</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isLocked}
              >
                <option value="">{t("schedule.selectRole")}</option>
                {COMMON_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
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

          <div className="form-row">
            <div className="form-group">
              <label>{t("schedule.color")}</label>
              <div className="color-picker">
                {SHIFT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`color-option ${color === c.value ? "selected" : ""}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => !isLocked && setColor(c.value)}
                    title={c.name}
                    disabled={isLocked}
                  />
                ))}
              </div>
            </div>
          </div>

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
