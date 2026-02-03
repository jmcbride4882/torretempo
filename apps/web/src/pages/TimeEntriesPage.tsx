import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { startOfWeek, endOfWeek, startOfDay, endOfDay, format } from "date-fns";
import * as Select from "@radix-ui/react-select";
import * as Toast from "@radix-ui/react-toast";
import { timeEntryService } from "../services/timeEntryService";
import { locationService } from "../services/locationService";
import { useGeolocation, reverseGeocode } from "../hooks/useGeolocation";
import { useAuthorization } from "../hooks/useAuthorization";
import ClockButton from "../components/time-tracking/ClockButton";
import CurrentTimer from "../components/time-tracking/CurrentTimer";
import TimeEntryCard from "../components/time-tracking/TimeEntryCard";
import EarlyClockInDialog from "../components/time-tracking/EarlyClockInDialog";
import type {
  TimeEntry,
  TimeEntryStats,
  TimeEntryApiError,
} from "../types/timeEntry";
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
  const [breakLoading, setBreakLoading] = useState(false);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [earlyClockInDialog, setEarlyClockInDialog] = useState({
    open: false,
    minutesEarly: 0,
    shiftStartTime: "",
    pendingPosition: null as {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: string;
    } | null,
  });
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [tenantLocations, setTenantLocations] = useState<string[]>([]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

      // Load current entry, history, stats, and locations in parallel
      const [current, historyResponse, statsResponse, locations] =
        await Promise.all([
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
          locationService.getLocations().catch(() => []), // Locations might fail
        ]);

      // Geocode current entry location if available
      if (current && current.clockInLat && current.clockInLng) {
        try {
          const address = await reverseGeocode(
            current.clockInLat,
            current.clockInLng,
          );
          current.clockInAddress = address;
        } catch {
          // Ignore geocoding errors
        }
      }

      // Geocode history entries locations (limit to first 3 to avoid rate limiting)
      const entriesToGeocode = historyResponse.entries.slice(0, 3);
      for (const entry of entriesToGeocode) {
        if (entry.clockInLat && entry.clockInLng) {
          try {
            const address = await reverseGeocode(
              entry.clockInLat,
              entry.clockInLng,
            );
            entry.clockInAddress = address;
          } catch {
            // Ignore geocoding errors
          }
        }
        // Add a small delay to respect rate limits (1 req/sec for Nominatim)
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }

      setTenantLocations(locations);
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
    // Radix Toast handles auto-dismiss via duration prop on Provider
  };

  // Show location banner for 5 seconds
  const showLocation = (address: string) => {
    setLocationAddress(address);
    setShowLocationBanner(true);
    setTimeout(() => {
      setShowLocationBanner(false);
      setTimeout(() => setLocationAddress(null), 300); // Clear after fade out
    }, 5000);
  };

  // Break management handlers
  const handleStartBreak = useCallback(async () => {
    try {
      setBreakLoading(true);
      const entry = await timeEntryService.startBreak();
      setCurrentEntry(entry);
      showToast(t("timeTracking.breakStarted"));
    } catch (err) {
      console.error("Start break failed:", err);
      setError(t("timeTracking.startBreakError"));
    } finally {
      setBreakLoading(false);
    }
  }, [t]);

  const handleEndBreak = useCallback(async () => {
    try {
      setBreakLoading(true);
      const entry = await timeEntryService.endBreak();
      setCurrentEntry(entry);
      showToast(t("timeTracking.breakEnded"));
    } catch (err) {
      console.error("End break failed:", err);
      setError(t("timeTracking.endBreakError"));
    } finally {
      setBreakLoading(false);
    }
  }, [t]);

  // Handle clock-in with optional force override
  const performClockIn = useCallback(
    async (
      position: {
        latitude: number;
        longitude: number;
        accuracy: number;
        timestamp: string;
      } | null,
      forceOverride = false,
      location = "",
    ) => {
      const entry = await timeEntryService.clockIn({
        geolocation: position || undefined,
        forceOverride,
        location: location || undefined,
      });
      setCurrentEntry(entry);
      showToast(t("timeTracking.clockedInSuccess"));
      setSelectedLocation(""); // Clear location after successful clock-in

      // Show location if available
      if (position) {
        try {
          const address = await reverseGeocode(
            position.latitude,
            position.longitude,
          );
          showLocation(address);
        } catch {
          // Ignore geocoding errors
        }
      }
    },
    [t],
  );

  // Handle early clock-in confirmation
  const handleEarlyClockInConfirm = useCallback(async () => {
    const { pendingPosition } = earlyClockInDialog;
    setEarlyClockInDialog((prev) => ({ ...prev, open: false }));
    setActionLoading(true);

    try {
      await performClockIn(pendingPosition, true, selectedLocation);
    } catch (err) {
      console.error("Clock in with override failed:", err);
      setError(t("timeTracking.clockInError"));
    } finally {
      setActionLoading(false);
    }
  }, [earlyClockInDialog, performClockIn, selectedLocation, t]);

  const handleEarlyClockInCancel = useCallback(() => {
    setEarlyClockInDialog({
      open: false,
      minutesEarly: 0,
      shiftStartTime: "",
      pendingPosition: null,
    });
  }, []);

  const handleClockAction = useCallback(async () => {
    const isClockedIn = !!currentEntry;

    try {
      setGettingLocation(true);

      // Get geolocation
      const position = await geolocation.getPosition();

      // Show location getting feedback
      if (position) {
        try {
          const address = await reverseGeocode(
            position.latitude,
            position.longitude,
          );
          showLocation(address);
        } catch {
          // Ignore geocoding errors silently
        }
      }

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
        await performClockIn(position, false, selectedLocation);
      }
    } catch (err: unknown) {
      console.error("Clock action failed:", err);

      // Handle specific errors
      const error = err as {
        response?: {
          status?: number;
          data?: TimeEntryApiError;
        };
      };
      const code = error?.response?.data?.code;
      const status = error?.response?.status;

      if (code === "EARLY_CLOCK_IN_WARNING" && status === 409) {
        // Show confirmation dialog for early clock-in
        const position = await geolocation.getPosition();
        setEarlyClockInDialog({
          open: true,
          minutesEarly: error.response?.data?.minutesUntilStart || 0,
          shiftStartTime: error.response?.data?.shiftStart || "",
          pendingPosition: position,
        });
        setActionLoading(false);
        return;
      } else if (code === "EARLY_CLOCK_IN" && status === 403) {
        // Hard block - too early to clock in
        setError(t("timeTracking.earlyClockInBlocked"));
      } else if (code === "ALREADY_CLOCKED_IN") {
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
  }, [currentEntry, geolocation, t, performClockIn]);

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

  // Handle toast open state change (MUST be before early return)
  const handleToastOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setToastMessage(null);
    }
  }, []);

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
    <Toast.Provider swipeDirection="right" duration={4000}>
      <div className="time-entries-page">
        {/* Toast notification - Radix UI */}
        <Toast.Root
          className="toast toast--success"
          open={!!toastMessage}
          onOpenChange={handleToastOpenChange}
        >
          <div className="toast__content">
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
            <Toast.Description>{toastMessage}</Toast.Description>
          </div>
        </Toast.Root>
        <Toast.Viewport className="toast-viewport" />

        {/* Header */}
        <div className="time-entries-page__header">
          <div className="time-entries-page__header-left">
            <h1 className="time-entries-page__title">{t("nav.timeEntries")}</h1>
          </div>
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

        {/* Location display banner */}
        {(gettingLocation || showLocationBanner) && (
          <div
            className={`time-entries-page__location-banner ${showLocationBanner ? "time-entries-page__location-banner--visible" : ""}`}
          >
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
            <span>
              {gettingLocation
                ? t("timeTracking.gettingLocation")
                : locationAddress
                  ? t("timeTracking.yourLocation", {
                      address: locationAddress,
                      defaultValue: `You are at: ${locationAddress}`,
                    })
                  : ""}
            </span>
          </div>
        )}

        {/* Main content */}
        <div className="time-entries-page__content">
          {/* Left column: Clock button and current timer */}
          <div className="time-entries-page__main">
            {/* Current Timer (if clocked in) */}
            {currentEntry && (
              <CurrentTimer
                entry={currentEntry}
                onStartBreak={handleStartBreak}
                onEndBreak={handleEndBreak}
                breakLoading={breakLoading}
              />
            )}

            {/* Clock Button */}
            <div className="time-entries-page__clock-section">
              {/* Date/Time Display */}
              <div className="clock-section__datetime">
                <div className="clock-section__time">
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
                  <span className="time-value">
                    {format(currentTime, "HH:mm:ss")}
                  </span>
                </div>
                <div className="clock-section__date">
                  {format(currentTime, "EEEE, d MMMM yyyy")}
                </div>
              </div>

              {/* Location Selector */}
              <div className="clock-section__location-selector">
                <label className="location-selector__label">
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
                  {t("timeTracking.selectLocation")}
                </label>
                <Select.Root
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                >
                  <Select.Trigger className="location-selector__dropdown">
                    <Select.Value
                      placeholder={t("timeTracking.chooseLocation")}
                    />
                    <Select.Icon className="location-selector__icon">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="location-selector__content"
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.Viewport className="location-selector__viewport">
                        <Select.Item
                          value=""
                          className="location-selector__item"
                        >
                          <Select.ItemText>
                            {t("timeTracking.chooseLocation")}
                          </Select.ItemText>
                        </Select.Item>
                        {tenantLocations.map((location) => (
                          <Select.Item
                            key={location}
                            value={location}
                            className="location-selector__item"
                          >
                            <Select.ItemText>{location}</Select.ItemText>
                            <Select.ItemIndicator className="location-selector__item-indicator">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

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

        {/* Early Clock-In Warning Dialog */}
        <EarlyClockInDialog
          open={earlyClockInDialog.open}
          minutesEarly={earlyClockInDialog.minutesEarly}
          shiftStartTime={earlyClockInDialog.shiftStartTime}
          onConfirm={handleEarlyClockInConfirm}
          onCancel={handleEarlyClockInCancel}
          loading={actionLoading}
        />
      </div>
    </Toast.Provider>
  );
}
