import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import type { Shift } from "../../types/schedule";
import type { Employee } from "../../types/employee";
import "./SwapShiftModal.css";

interface SwapShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    targetEmployeeId: string | null,
    reason?: string,
    broadcastToRole?: boolean,
  ) => void;
  shift: Shift | null;
  employees: Employee[];
}

export default function SwapShiftModal({
  isOpen,
  onClose,
  onSubmit,
  shift,
  employees,
}: SwapShiftModalProps) {
  const { t } = useTranslation();
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [broadcastToRole, setBroadcastToRole] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetEmployeeId("");
      setReason("");
      setSubmitting(false);
      setBroadcastToRole(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: either specific employee or broadcast to role
    if (!broadcastToRole && !targetEmployeeId) return;

    // Validate: shift must have a role if broadcasting
    if (broadcastToRole && !shift?.role) {
      alert(
        t("schedule.swapBroadcastNoRole") ||
          "Cannot broadcast: shift has no role assigned",
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        broadcastToRole ? null : targetEmployeeId,
        reason || undefined,
        broadcastToRole,
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !shift) return null;

  // Filter out the current shift's employee from the list
  const availableEmployees = employees.filter(
    (e) => e.id !== shift.employeeId && e.status === "active",
  );

  const startTime = parseISO(shift.startTime);
  const endTime = parseISO(shift.endTime);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content swap-shift-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Request Shift Swap</h2>
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

        <div className="swap-shift-info">
          <h3>Your Shift</h3>
          <div className="shift-details">
            <div className="detail-row">
              <span className="detail-label">{t("schedule.date")}:</span>
              <span className="detail-value">
                {format(startTime, "EEEE, d MMM yyyy")}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{t("schedule.time")}:</span>
              <span className="detail-value">
                {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
              </span>
            </div>
            {shift.role && (
              <div className="detail-row">
                <span className="detail-label">{t("schedule.role")}:</span>
                <span className="detail-value">{shift.role}</span>
              </div>
            )}
            {shift.location && (
              <div className="detail-row">
                <span className="detail-label">{t("schedule.location")}:</span>
                <span className="detail-value">{shift.location}</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Broadcast option toggle */}
          <div className="form-group">
            <label>{t("schedule.swapRequestType")}</label>
            <div
              className="radio-group"
              style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="swapType"
                  checked={!broadcastToRole}
                  onChange={() => {
                    setBroadcastToRole(false);
                    setTargetEmployeeId("");
                  }}
                  disabled={submitting}
                  style={{ marginRight: "0.5rem" }}
                />
                <span>{t("schedule.swapSpecificEmployee")}</span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="swapType"
                  checked={broadcastToRole}
                  onChange={() => {
                    setBroadcastToRole(true);
                    setTargetEmployeeId("");
                  }}
                  disabled={submitting || !shift?.role}
                  style={{ marginRight: "0.5rem" }}
                />
                <span>{t("schedule.swapBroadcastToRole")}</span>
              </label>
            </div>
            {shift?.role && broadcastToRole && (
              <p
                className="form-help-text"
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#6366f1",
                }}
              >
                {t("schedule.swapBroadcastHelpText")}{" "}
                <strong>{shift.role}</strong>
              </p>
            )}
            {!shift?.role && (
              <p
                className="form-help-text error"
                style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}
              >
                {t("schedule.swapBroadcastNoRole")}
              </p>
            )}
          </div>

          {/* Employee dropdown (only shown when NOT broadcasting) */}
          {!broadcastToRole && (
            <div className="form-group">
              <label htmlFor="targetEmployee">
                {t("schedule.swapWith")} <span className="required">*</span>
              </label>
              <select
                id="targetEmployee"
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">{t("schedule.selectEmployee")}</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.user.firstName} {emp.user.lastName}
                    {emp.position ? ` - ${emp.position}` : ""}
                  </option>
                ))}
              </select>
              {availableEmployees.length === 0 && (
                <p className="form-help-text error">
                  {t("schedule.noEmployeesAvailable")}
                </p>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="swapReason">
              {t("schedule.swapReason")} ({t("common.optional")})
            </label>
            <textarea
              id="swapReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("schedule.swapReasonPlaceholder")}
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={
                submitting ||
                (!broadcastToRole &&
                  (!targetEmployeeId || availableEmployees.length === 0)) ||
                (broadcastToRole && !shift?.role)
              }
            >
              {submitting
                ? t("common.submitting")
                : t("schedule.createSwapRequest")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
