import { useTranslation } from "react-i18next";
import type { Schedule } from "../../types/schedule";
import "./ScheduleHeader.css";

interface ScheduleHeaderProps {
  schedule: Schedule | null;
  hasConflicts: boolean;
  conflictCount: number;
  selectedLocation?: string;
  onPublish: () => void;
  onUnpublish: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onCopyWeek: () => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCreateSchedule: () => void;
  onPrint: () => void;
  currentWeekStart: Date;
  loading?: boolean;
  canManage?: boolean; // Whether user can manage schedules (hide manager-only buttons)
}

export default function ScheduleHeader({
  schedule,
  hasConflicts,
  conflictCount,
  selectedLocation,
  onPublish,
  onUnpublish,
  onLock,
  onUnlock,
  onCopyWeek,
  onPreviousWeek,
  onNextWeek,
  onCreateSchedule,
  onPrint,
  currentWeekStart,
  loading,
  canManage = true, // Default to true for backwards compatibility
}: ScheduleHeaderProps) {
  const { t } = useTranslation();

  const formatWeekRange = (startDate: Date) => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const startMonth = startDate.toLocaleDateString("es-ES", {
      month: "short",
    });
    const endMonth = endDate.toLocaleDateString("es-ES", { month: "short" });
    const year = startDate.getFullYear();

    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth} ${year}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  };

  const getStatusBadge = () => {
    if (!schedule) return null;

    const statusClasses: Record<string, string> = {
      draft: "status-draft",
      published: "status-published",
      locked: "status-locked",
    };

    const statusLabels: Record<string, string> = {
      draft: t("schedule.status.draft"),
      published: t("schedule.status.published"),
      locked: t("schedule.status.locked"),
    };

    return (
      <span
        className={`schedule-status-badge ${statusClasses[schedule.status]}`}
      >
        {statusLabels[schedule.status]}
      </span>
    );
  };

  return (
    <div className="schedule-header">
      <div className="schedule-header-top">
        <div className="schedule-title-section">
          <h1 className="schedule-title">{t("nav.scheduling")}</h1>
          {selectedLocation && (
            <span className="location-print-badge">📍 {selectedLocation}</span>
          )}
          {getStatusBadge()}
          {hasConflicts && (
            <span className="conflict-badge">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {conflictCount} {t("schedule.conflicts")}
            </span>
          )}
        </div>

        <div className="schedule-actions">
          {/* Print button - always visible when schedule exists */}
          {schedule && (
            <button
              className="btn-secondary btn-print"
              onClick={onPrint}
              disabled={loading}
              title={t("schedule.print")}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              {t("schedule.print")}
            </button>
          )}

          {/* Manager-only buttons */}
          {canManage && schedule?.status === "draft" && (
            <>
              <button
                className="btn-secondary"
                onClick={onCopyWeek}
                disabled={loading}
                title={t("schedule.copyWeek")}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {t("schedule.copyWeek")}
              </button>
              <button
                className="btn-primary"
                onClick={onPublish}
                disabled={loading || hasConflicts}
                title={
                  hasConflicts
                    ? t("schedule.resolveConflictsFirst")
                    : t("schedule.publish")
                }
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
                {t("schedule.publish")}
              </button>
            </>
          )}

          {canManage && schedule?.status === "published" && (
            <>
              <button
                className="btn-secondary"
                onClick={onUnpublish}
                disabled={loading}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                {t("schedule.unpublish")}
              </button>
              <button
                className="btn-warning"
                onClick={onLock}
                disabled={loading}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {t("schedule.lock")}
              </button>
            </>
          )}

          {canManage && schedule?.status === "locked" && (
            <button
              className="btn-secondary"
              onClick={onUnlock}
              disabled={loading}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
              {t("schedule.unlock")}
            </button>
          )}

          {canManage && !schedule && (
            <button
              className="btn-primary"
              onClick={onCreateSchedule}
              disabled={loading}
            >
              <svg
                width="18"
                height="18"
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
      </div>

      <div className="schedule-header-bottom">
        <div className="week-navigation">
          <button
            className="btn-nav"
            onClick={onPreviousWeek}
            disabled={loading}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="current-week">
            {formatWeekRange(currentWeekStart)}
          </span>
          <button className="btn-nav" onClick={onNextWeek} disabled={loading}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="schedule-legend">
          <div className="legend-item">
            <span className="legend-color draft"></span>
            <span>{t("schedule.status.draft")}</span>
          </div>
          <div className="legend-item">
            <span className="legend-color conflict"></span>
            <span>{t("schedule.hasConflict")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
