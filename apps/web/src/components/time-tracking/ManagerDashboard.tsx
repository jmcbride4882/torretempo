import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, differenceInMinutes } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { timeEntryService } from "../../services/timeEntryService";
import type { TimeEntry } from "../../types/timeEntry";
import "./ManagerDashboard.css";

interface ManagerDashboardProps {
  /** Refresh interval in milliseconds (default: 30000 = 30 seconds) */
  refreshInterval?: number;
}

interface ActiveEmployee {
  entry: TimeEntry;
  elapsedMinutes: number;
  employeeName: string;
  employeeInitials: string;
  location: string | null;
  position: string | null;
}

export default function ManagerDashboard({
  refreshInterval = 30000,
}: ManagerDashboardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "es" ? es : enUS;

  const [activeEntries, setActiveEntries] = useState<ActiveEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for elapsed time calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load active entries
  const loadActiveEntries = async () => {
    try {
      setError(null);
      // Fetch all active entries (clocked in but not clocked out)
      const response = await timeEntryService.getHistory({
        status: "active",
        limit: 100,
        sortBy: "clockIn",
        sortOrder: "desc",
      });

      const entries = response.entries.map((entry) => {
        const firstName = entry.employee?.user?.firstName || "Unknown";
        const lastName = entry.employee?.user?.lastName || "";
        const employeeName = `${firstName} ${lastName}`.trim();
        const employeeInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
        const elapsedMinutes = differenceInMinutes(
          new Date(),
          new Date(entry.clockIn),
        );
        const location = entry.location || entry.shift?.location || null;
        const position = entry.shift?.role || null;

        return {
          entry,
          elapsedMinutes,
          employeeName,
          employeeInitials,
          location,
          position,
        };
      });

      setActiveEntries(entries);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load active entries:", err);
      setError(t("timeTracking.manager.loadError"));
    } finally {
      setLoading(false);
    }
  };

  // Initial load and polling
  useEffect(() => {
    loadActiveEntries();

    const interval = setInterval(loadActiveEntries, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Update elapsed times in real-time
  const entriesWithUpdatedTime = useMemo(() => {
    return activeEntries.map((item) => ({
      ...item,
      elapsedMinutes: differenceInMinutes(
        currentTime,
        new Date(item.entry.clockIn),
      ),
    }));
  }, [activeEntries, currentTime]);

  // Format elapsed time
  const formatElapsedTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="manager-dashboard manager-dashboard--loading">
        <div className="manager-dashboard__spinner" />
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manager-dashboard manager-dashboard--error">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{error}</p>
        <button
          className="manager-dashboard__retry-btn"
          onClick={loadActiveEntries}
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      {/* Header */}
      <div className="manager-dashboard__header">
        <div className="manager-dashboard__title-row">
          <h2 className="manager-dashboard__title">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {t("timeTracking.manager.title")}
          </h2>
          <span className="manager-dashboard__count">
            {entriesWithUpdatedTime.length}{" "}
            {entriesWithUpdatedTime.length === 1
              ? t("timeTracking.manager.employee")
              : t("timeTracking.manager.employees")}
          </span>
        </div>
        <div className="manager-dashboard__meta">
          <span className="manager-dashboard__last-updated">
            {t("timeTracking.manager.lastUpdated")}{" "}
            {format(lastUpdated, "HH:mm:ss")}
          </span>
          <div className="manager-dashboard__live-indicator">
            <span className="manager-dashboard__live-dot" />
            {t("timeTracking.manager.live")}
          </div>
        </div>
      </div>

      {/* Employee List */}
      {entriesWithUpdatedTime.length === 0 ? (
        <div className="manager-dashboard__empty">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p>{t("timeTracking.manager.noOneWorking")}</p>
        </div>
      ) : (
        <div className="manager-dashboard__list">
          {entriesWithUpdatedTime.map((item, index) => (
            <div
              key={item.entry.id}
              className="manager-dashboard__employee"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Status indicator */}
              <div
                className={`manager-dashboard__status ${
                  item.entry.breakStart
                    ? "manager-dashboard__status--break"
                    : "manager-dashboard__status--active"
                }`}
              />

              {/* Avatar */}
              <div className="manager-dashboard__avatar">
                {item.employeeInitials}
              </div>

              {/* Employee Info */}
              <div className="manager-dashboard__info">
                <div className="manager-dashboard__name-row">
                  <span className="manager-dashboard__name">
                    {item.employeeName}
                  </span>
                  {item.position && (
                    <span className="manager-dashboard__position">
                      {item.position}
                    </span>
                  )}
                </div>

                <div className="manager-dashboard__details">
                  <div className="manager-dashboard__clock-time">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {t("timeTracking.manager.clockedIn")}:{" "}
                    {format(new Date(item.entry.clockIn), "HH:mm", { locale })}
                  </div>

                  <div className="manager-dashboard__elapsed">
                    <span className="manager-dashboard__elapsed-value">
                      {formatElapsedTime(item.elapsedMinutes)}
                    </span>
                    <span className="manager-dashboard__elapsed-label">
                      {t("timeTracking.manager.ago")}
                    </span>
                  </div>
                </div>

                {/* Location */}
                {item.location && (
                  <div className="manager-dashboard__location">
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
                    {item.location}
                  </div>
                )}

                {/* Break indicator */}
                {item.entry.breakStart && (
                  <div className="manager-dashboard__break-badge">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                      <line x1="6" y1="1" x2="6" y2="4" />
                      <line x1="10" y1="1" x2="10" y2="4" />
                      <line x1="14" y1="1" x2="14" y2="4" />
                    </svg>
                    {t("timeTracking.onBreak")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
