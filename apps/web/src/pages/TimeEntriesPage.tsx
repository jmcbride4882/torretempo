import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { startOfWeek, endOfWeek, startOfDay, endOfDay, format } from "date-fns";
import { timeEntryService } from "../services/timeEntryService";
import { useGeolocation } from "../hooks/useGeolocation";
import { useAuthorization } from "../hooks/useAuthorization";
import ClockButton from "../components/time-tracking/ClockButton";
import CurrentTimer from "../components/time-tracking/CurrentTimer";
import TimeEntryCard from "../components/time-tracking/TimeEntryCard";
import type { TimeEntry, TimeEntryStats } from "../types/timeEntry";
import "./TimeEntriesPage.css";

export default function TimeEntriesPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { canViewAllTimeEntries, canViewTeamTimeEntries } = useAuthorization();
  const geolocation = useGeolocation();

  // State
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [history, setHistory] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<TimeEntryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check if starting unscheduled shift from query param
  const startUnscheduled = searchParams.get("unscheduled") === "true";

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Auto-clock-in for unscheduled shift
  useEffect(() => {
    if (startUnscheduled && !currentEntry && !loading) {
      handleClockAction();
    }
  }, [startUnscheduled, currentEntry, loading]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load current entry, history, and stats in parallel
      const [current, historyResponse, statsResponse] = await Promise.all([
        timeEntryService.getCurrent(),
        timeEntryService.getHistory({
          limit: 10,
          sortBy: "clockIn",
          sortOrder: "desc",
        }),
        timeEntryService
          .getStats({
            startDate: format(
              startOfWeek(new Date(), { weekStartsOn: 1 }),
              "yyyy-MM-dd",
            ),
            endDate: format(
              endOfWeek(new Date(), { weekStartsOn: 1 }),
              "yyyy-MM-dd",
            ),
          })
          .catch(() => null), // Stats might fail if no data
      ]);

      setCurrentEntry(current);
      setHistory(historyResponse.entries);
      setStats(statsResponse);
    } catch (err: unknown) {
      console.error("Failed to load time entries:", err);
      setError(t("timeTracking.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleClockAction = useCallback(async () => {
    const isClockedIn = !!currentEntry;

    try {
      setGettingLocation(true);

      // Get geolocation
      const position = await geolocation.getPosition();

      setGettingLocation(false);
      setActionLoading(true);

      if (isClockedIn) {
        // Clock out
        const entry = await timeEntryService.clockOut({
          geolocation: position || undefined,
        });
        setCurrentEntry(null);
        showToast(t("timeTracking.clockedOutSuccess"));

        // Add completed entry to history
        setHistory((prev) => [entry, ...prev.slice(0, 9)]);

        // Refresh stats
        const statsResponse = await timeEntryService
          .getStats({
            startDate: format(
              startOfWeek(new Date(), { weekStartsOn: 1 }),
              "yyyy-MM-dd",
            ),
            endDate: format(
              endOfWeek(new Date(), { weekStartsOn: 1 }),
              "yyyy-MM-dd",
            ),
          })
          .catch(() => null);
        setStats(statsResponse);
      } else {
        // Clock in
        const entry = await timeEntryService.clockIn({
          geolocation: position || undefined,
        });
        setCurrentEntry(entry);
        showToast(t("timeTracking.clockedInSuccess"));
      }
    } catch (err: unknown) {
      console.error("Clock action failed:", err);

      // Handle specific errors
      const error = err as {
        response?: { data?: { code?: string; currentEntry?: TimeEntry } };
      };
      const code = error?.response?.data?.code;

      if (code === "ALREADY_CLOCKED_IN") {
        setError(t("timeTracking.alreadyClockedIn"));
        // Refresh to get current entry
        await loadData();
      } else if (code === "NOT_CLOCKED_IN") {
        setError(t("timeTracking.notClockedIn"));
        setCurrentEntry(null);
      } else if (code === "GEOLOCATION_REQUIRED") {
        setError(t("timeTracking.geolocationRequired"));
      } else if (geolocation.error === "PERMISSION_DENIED") {
        setError(t("timeTracking.locationPermissionDenied"));
      } else {
        setError(
          isClockedIn
            ? t("timeTracking.clockOutError")
            : t("timeTracking.clockInError"),
        );
      }
    } finally {
      setGettingLocation(false);
      setActionLoading(false);
    }
  }, [currentEntry, geolocation, t]);

  // Calculate today's stats from current entry and history
  const todayStats = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    let todayHours = 0;
    let todayBreaks = 0;

    // Include current entry elapsed time
    if (currentEntry) {
      const elapsedMinutes = currentEntry.elapsedMinutes || 0;
      todayHours += elapsedMinutes / 60;
    }

    // Include completed entries today
    history.forEach((entry) => {
      if (entry.clockOut) {
        const clockIn = new Date(entry.clockIn);
        if (clockIn >= todayStart && clockIn <= todayEnd) {
          todayHours += entry.totalHours || 0;
          todayBreaks += entry.breakMinutes || 0;
        }
      }
    });

    return {
      hours: todayHours,
      breaks: todayBreaks,
    };
  }, [currentEntry, history]);

  // Show appropriate view for managers/admins
  const showTeamView = canViewAllTimeEntries() || canViewTeamTimeEntries();

  if (loading) {
    return (
      <div className="time-entries-page">
        <div className="time-entries-page__header">
          <h1 className="time-entries-page__title">{t("nav.timeEntries")}</h1>
        </div>
        <div className="time-entries-page__loading">
          <div className="loading-spinner" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="time-entries-page">
      {/* Toast notification */}
      {toastMessage && (
        <div className="toast toast--success">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="time-entries-page__header">
        <h1 className="time-entries-page__title">{t("nav.timeEntries")}</h1>
        {geolocation.permissionStatus === "granted" && (
          <div className="time-entries-page__geo-status">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{t("timeTracking.locationEnabled")}</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="time-entries-page__error">
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
          <button className="error-dismiss" onClick={() => setError(null)}>
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

      {/* Geolocation permission prompt */}
      {geolocation.permissionStatus === "denied" && (
        <div className="time-entries-page__geo-warning">
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
          <div className="geo-warning-content">
            <strong>{t("timeTracking.locationBlocked")}</strong>
            <p>{t("timeTracking.locationBlockedDesc")}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="time-entries-page__content">
        {/* Left column: Clock button and current timer */}
        <div className="time-entries-page__main">
          {/* Current Timer (if clocked in) */}
          {currentEntry && <CurrentTimer entry={currentEntry} />}

          {/* Clock Button */}
          <div className="time-entries-page__clock-section">
            <ClockButton
              isClockedIn={!!currentEntry}
              isLoading={actionLoading}
              isGettingLocation={gettingLocation}
              onClick={handleClockAction}
            />

            {!currentEntry && (
              <p className="time-entries-page__hint">
                {t("timeTracking.tapToClockIn")}
              </p>
            )}
          </div>

          {/* Today's quick stats */}
          <div className="time-entries-page__today-stats">
            <h3 className="stats-title">{t("timeTracking.todayStats")}</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-item__value">
                  {todayStats.hours.toFixed(1)}h
                </div>
                <div className="stat-item__label">
                  {t("timeTracking.hoursWorked")}
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-item__value">{todayStats.breaks}m</div>
                <div className="stat-item__label">
                  {t("timeTracking.breaks")}
                </div>
              </div>
              {stats && (
                <div className="stat-item">
                  <div className="stat-item__value">
                    {stats.totalHours.toFixed(1)}h
                  </div>
                  <div className="stat-item__label">
                    {t("timeTracking.thisWeek")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: History */}
        <div className="time-entries-page__history">
          <h2 className="time-entries-page__section-title">
            {t("timeTracking.recentEntries")}
          </h2>

          {history.length === 0 ? (
            <div className="time-entries-page__empty">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p>{t("timeTracking.noEntries")}</p>
            </div>
          ) : (
            <div className="time-entries-page__history-list">
              {history.map((entry) => (
                <TimeEntryCard
                  key={entry.id}
                  entry={entry}
                  showEmployeeName={showTeamView}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
