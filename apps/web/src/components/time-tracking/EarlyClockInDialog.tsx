import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import "./EarlyClockInDialog.css";

interface EarlyClockInDialogProps {
  open: boolean;
  minutesEarly: number;
  shiftStartTime: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function EarlyClockInDialog({
  open,
  minutesEarly,
  shiftStartTime,
  onConfirm,
  onCancel,
  loading = false,
}: EarlyClockInDialogProps) {
  const { t } = useTranslation();

  // Format shift start time
  const formattedShiftTime = shiftStartTime
    ? format(parseISO(shiftStartTime), "HH:mm")
    : "";

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="early-clock-dialog__overlay" />
        <Dialog.Content className="early-clock-dialog">
          {/* Warning icon */}
          <div className="early-clock-dialog__icon">
            <svg
              width="48"
              height="48"
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

          {/* Title */}
          <Dialog.Title className="early-clock-dialog__title">
            {t("timeTracking.earlyClockInTitle", {
              minutes: minutesEarly,
              defaultValue: `You are clocking in ${minutesEarly} minutes early`,
            })}
          </Dialog.Title>

          {/* Message */}
          <Dialog.Description className="early-clock-dialog__message">
            {t("timeTracking.earlyClockInMessage", {
              time: formattedShiftTime,
              defaultValue: `Your shift starts at ${formattedShiftTime}. You should not clock in early unless authorized.`,
            })}
          </Dialog.Description>

          {/* Actions */}
          <div className="early-clock-dialog__actions">
            <button
              className="early-clock-dialog__button early-clock-dialog__button--cancel"
              onClick={onCancel}
              disabled={loading}
            >
              {t("common.cancel")}
            </button>
            <button
              className="early-clock-dialog__button early-clock-dialog__button--confirm"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <div className="early-clock-dialog__spinner" />
              ) : (
                t("timeTracking.clockInAnyway", {
                  defaultValue: "Clock In Anyway",
                })
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
