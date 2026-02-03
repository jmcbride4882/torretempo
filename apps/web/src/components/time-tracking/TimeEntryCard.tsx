import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { TimeEntry } from "../../types/timeEntry";
import "./TimeEntryCard.css";

interface TimeEntryCardProps {
  entry: TimeEntry;
  showEmployeeName?: boolean;
}

export default function TimeEntryCard({
  entry,
  showEmployeeName = false,
}: TimeEntryCardProps) {
  const { t, i18n } = useTranslation();

  const locale = i18n.language === "es" ? es : enUS;

  // Format date header
  const dateHeader = useMemo(() => {
    const date = parseISO(entry.clockIn);
    if (isToday(date)) {
      return t("timeTracking.today");
    }
    if (isYesterday(date)) {
      return t("timeTracking.yesterday");
    }
    return format(date, "EEEE, d MMMM", { locale });
  }, [entry.clockIn, t, locale]);

  // Format time range
  const timeRange = useMemo(() => {
    const clockIn = format(parseISO(entry.clockIn), "HH:mm");
    const clockOut = entry.clockOut
      ? format(parseISO(entry.clockOut), "HH:mm")
      : "--:--";
    return `${clockIn} - ${clockOut}`;
  }, [entry.clockIn, entry.clockOut]);

  // Format total hours
  const totalHoursDisplay = useMemo(() => {
    if (!entry.totalHours) return null;
    const hours = Math.floor(entry.totalHours);
    const minutes = Math.round((entry.totalHours - hours) * 60);
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    return `${minutes}m`;
  }, [entry.totalHours]);

  // Format break time
  const breakDisplay = useMemo(() => {
    if (!entry.breakMinutes || entry.breakMinutes === 0) return null;
    if (entry.breakMinutes >= 60) {
      const hours = Math.floor(entry.breakMinutes / 60);
      const mins = entry.breakMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${entry.breakMinutes}m`;
  }, [entry.breakMinutes]);

  const isActive = !entry.clockOut;

  return (
    <div
      className={`time-entry-card ${isActive ? "time-entry-card--active" : ""}`}
    >
      {/* Date header */}
      <div className="time-entry-card__date">{dateHeader}</div>

      {/* Main content */}
      <div className="time-entry-card__content">
        {/* Time range */}
        <div className="time-entry-card__time">
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
          <span className="time-entry-card__time-range">{timeRange}</span>
          {isActive && (
            <span className="time-entry-card__active-badge">
              {t("timeTracking.inProgress")}
            </span>
          )}
        </div>

        {/* Employee name (if showing team entries) */}
        {showEmployeeName && entry.employee && (
          <div className="time-entry-card__employee">
            <div className="time-entry-card__avatar">
              {entry.employee.user.firstName.charAt(0)}
              {entry.employee.user.lastName.charAt(0)}
            </div>
            <span>
              {entry.employee.user.firstName} {entry.employee.user.lastName}
            </span>
          </div>
        )}

        {/* Stats row */}
        <div className="time-entry-card__stats">
          {totalHoursDisplay && (
            <div className="time-entry-card__stat">
              <span className="time-entry-card__stat-value">
                {totalHoursDisplay}
              </span>
              <span className="time-entry-card__stat-label">
                {t("timeTracking.total")}
              </span>
            </div>
          )}

          {breakDisplay && (
            <div className="time-entry-card__stat">
              <span className="time-entry-card__stat-value">
                {breakDisplay}
              </span>
              <span className="time-entry-card__stat-label">
                {t("timeTracking.break")}
              </span>
            </div>
          )}

          {entry.overtimeHours && entry.overtimeHours > 0 && (
            <div className="time-entry-card__stat time-entry-card__stat--overtime">
              <span className="time-entry-card__stat-value">
                +{entry.overtimeHours.toFixed(1)}h
              </span>
              <span className="time-entry-card__stat-label">
                {t("timeTracking.overtime")}
              </span>
            </div>
          )}
        </div>

        {/* Location/Role info */}
        {(entry.shift?.location || entry.shift?.role) && (
          <div className="time-entry-card__meta">
            {entry.shift.role && (
              <span className="time-entry-card__tag">{entry.shift.role}</span>
            )}
            {entry.shift.location && (
              <span className="time-entry-card__location">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {entry.shift.location}
              </span>
            )}
          </div>
        )}

        {/* Geolocation indicator */}
        {(entry.clockInLat || entry.clockOutLat) && (
          <div className="time-entry-card__geo">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="2" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="22" />
              <line x1="2" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="22" y2="12" />
            </svg>
            {t("timeTracking.geoRecorded")}
          </div>
        )}

        {/* Entry type */}
        <div
          className={`time-entry-card__type time-entry-card__type--${entry.entryType}`}
        >
          {entry.entryType === "scheduled"
            ? t("timeTracking.scheduled")
            : t("timeTracking.unscheduled")}
        </div>
      </div>
    </div>
  );
}
