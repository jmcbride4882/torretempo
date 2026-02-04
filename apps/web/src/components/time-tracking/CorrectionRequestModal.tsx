import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { es, enUS } from "date-fns/locale";
import * as Dialog from "@radix-ui/react-dialog";
import { useModule } from "../../hooks/useModule";
import ModuleLockedPanel from "../billing/ModuleLockedPanel";
import type { TimeEntry } from "../../types/timeEntry";
import "./CorrectionRequestModal.css";

interface CorrectionRequestModalProps {
  /** The time entry to request correction for */
  entry: TimeEntry;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when correction request is submitted */
  onSubmit?: (data: CorrectionRequestData) => Promise<void>;
}

export interface CorrectionRequestData {
  timeEntryId: string;
  correctedClockIn: string;
  correctedClockOut: string | null;
  reason: string;
}

const MIN_REASON_LENGTH = 250;

export default function CorrectionRequestModal({
  entry,
  open,
  onOpenChange,
  onSubmit,
}: CorrectionRequestModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "es" ? es : enUS;
  const { enabled: moduleEnabled, isLoading: moduleLoading } =
    useModule("approvals_workflow");

  // Form state
  const [correctedClockIn, setCorrectedClockIn] = useState("");
  const [correctedClockOut, setCorrectedClockOut] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when entry changes
  const resetForm = () => {
    const clockInDate = parseISO(entry.clockIn);
    setCorrectedClockIn(format(clockInDate, "yyyy-MM-dd'T'HH:mm"));
    if (entry.clockOut) {
      const clockOutDate = parseISO(entry.clockOut);
      setCorrectedClockOut(format(clockOutDate, "yyyy-MM-dd'T'HH:mm"));
    } else {
      setCorrectedClockOut("");
    }
    setReason("");
    setError(null);
  };

  // Reset form when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Validation
  const isValid =
    correctedClockIn && reason.length >= MIN_REASON_LENGTH && !submitting;

  // Character count for reason
  const reasonCharCount = reason.length;
  const remainingChars = MIN_REASON_LENGTH - reasonCharCount;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    try {
      setSubmitting(true);
      setError(null);

      const data: CorrectionRequestData = {
        timeEntryId: entry.id,
        correctedClockIn: new Date(correctedClockIn).toISOString(),
        correctedClockOut: correctedClockOut
          ? new Date(correctedClockOut).toISOString()
          : null,
        reason,
      };

      if (onSubmit) {
        await onSubmit(data);
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Correction request failed:", err);
      setError(t("timeTracking.correction.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  // Format original times for display
  const originalClockIn = format(parseISO(entry.clockIn), "PPpp", { locale });
  const originalClockOut = entry.clockOut
    ? format(parseISO(entry.clockOut), "PPpp", { locale })
    : t("timeTracking.inProgress");

  // Loading state
  if (moduleLoading) {
    return (
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="correction-modal__overlay" />
          <Dialog.Content className="correction-modal__content">
            <div className="correction-modal__loading">
              <div className="correction-modal__spinner" />
              <p>{t("common.loading")}</p>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // Module locked state
  if (!moduleEnabled) {
    return (
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="correction-modal__overlay" />
          <Dialog.Content className="correction-modal__content correction-modal__content--locked">
            <Dialog.Close className="correction-modal__close">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Dialog.Close>
            <ModuleLockedPanel moduleKey="approvals_workflow" compact />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="correction-modal__overlay" />
        <Dialog.Content className="correction-modal__content">
          {/* Close button */}
          <Dialog.Close className="correction-modal__close">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Dialog.Close>

          {/* Header */}
          <div className="correction-modal__header">
            <div className="correction-modal__icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <Dialog.Title className="correction-modal__title">
              {t("timeTracking.correction.title")}
            </Dialog.Title>
            <Dialog.Description className="correction-modal__description">
              {t("timeTracking.correction.description")}
            </Dialog.Description>
          </div>

          {/* Error */}
          {error && (
            <div className="correction-modal__error">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="correction-modal__form">
            {/* Original Times (Read-only) */}
            <div className="correction-modal__section">
              <h3 className="correction-modal__section-title">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {t("timeTracking.correction.currentTimes")}
              </h3>
              <div className="correction-modal__times-row">
                <div className="correction-modal__time-display">
                  <span className="correction-modal__time-label">
                    {t("timeTracking.clockIn")}
                  </span>
                  <span className="correction-modal__time-value">
                    {originalClockIn}
                  </span>
                </div>
                <div className="correction-modal__time-arrow">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                <div className="correction-modal__time-display">
                  <span className="correction-modal__time-label">
                    {t("timeTracking.clockOut")}
                  </span>
                  <span className="correction-modal__time-value">
                    {originalClockOut}
                  </span>
                </div>
              </div>
            </div>

            {/* Corrected Times */}
            <div className="correction-modal__section">
              <h3 className="correction-modal__section-title">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {t("timeTracking.correction.correctedTimes")}
              </h3>
              <div className="correction-modal__inputs-row">
                <div className="correction-modal__input-group">
                  <label htmlFor="correctedClockIn">
                    {t("timeTracking.clockIn")}
                  </label>
                  <input
                    id="correctedClockIn"
                    type="datetime-local"
                    value={correctedClockIn}
                    onChange={(e) => setCorrectedClockIn(e.target.value)}
                    required
                    className="correction-modal__input"
                  />
                </div>
                <div className="correction-modal__input-group">
                  <label htmlFor="correctedClockOut">
                    {t("timeTracking.clockOut")}
                  </label>
                  <input
                    id="correctedClockOut"
                    type="datetime-local"
                    value={correctedClockOut}
                    onChange={(e) => setCorrectedClockOut(e.target.value)}
                    className="correction-modal__input"
                  />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="correction-modal__section">
              <h3 className="correction-modal__section-title">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="21" y1="10" x2="3" y2="10" />
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" />
                  <line x1="21" y1="18" x2="3" y2="18" />
                </svg>
                {t("timeTracking.correction.reason")}
                <span className="correction-modal__required">*</span>
              </h3>
              <div className="correction-modal__textarea-wrapper">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("timeTracking.correction.reasonPlaceholder")}
                  required
                  minLength={MIN_REASON_LENGTH}
                  rows={4}
                  className="correction-modal__textarea"
                />
                <div
                  className={`correction-modal__char-count ${
                    remainingChars > 0
                      ? "correction-modal__char-count--insufficient"
                      : "correction-modal__char-count--sufficient"
                  }`}
                >
                  {remainingChars > 0
                    ? t("timeTracking.correction.minChars", {
                        count: remainingChars,
                      })
                    : `${reasonCharCount} ${t(
                        "timeTracking.correction.characters",
                      )}`}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="correction-modal__actions">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="correction-modal__btn correction-modal__btn--secondary"
                >
                  {t("common.cancel")}
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="correction-modal__btn correction-modal__btn--primary"
                disabled={!isValid}
              >
                {submitting ? (
                  <>
                    <div className="correction-modal__btn-spinner" />
                    {t("common.submitting")}
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    {t("timeTracking.correction.submit")}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Notice */}
          <div className="correction-modal__notice">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {t("timeTracking.correction.notice")}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
