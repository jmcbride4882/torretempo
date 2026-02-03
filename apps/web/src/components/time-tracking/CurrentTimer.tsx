import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO, differenceInSeconds } from "date-fns";
import type { TimeEntry } from "../../types/timeEntry";
// Geolocation utilities available if needed
// import { formatAccuracy, getAccuracyClass } from "../../hooks/useGeolocation";
import "./CurrentTimer.css";

interface CurrentTimerProps {
  entry: TimeEntry;
  onStartBreak?: () => Promise<void>;
  onEndBreak?: () => Promise<void>;
  breakLoading?: boolean;
}

export default function CurrentTimer({
  entry,
  onStartBreak,
  onEndBreak,
  breakLoading = false,
}: CurrentTimerProps) {
  const { t } = useTranslation();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [breakElapsedSeconds, setBreakElapsedSeconds] = useState(0);

  // Check if currently on break
  const isOnBreak = !!entry.breakStart;

  // Calculate initial elapsed time
  useEffect(() => {
    const clockInTime = parseISO(entry.clockIn);
    const initialElapsed = differenceInSeconds(new Date(), clockInTime);
    setElapsedSeconds(initialElapsed > 0 ? initialElapsed : 0);
  }, [entry.clockIn]);

  // Calculate initial break elapsed time
  useEffect(() => {
    if (entry.breakStart) {
      const breakStartTime = parseISO(entry.breakStart);
      const initialBreakElapsed = differenceInSeconds(
        new Date(),
        breakStartTime,
      );
      setBreakElapsedSeconds(initialBreakElapsed > 0 ? initialBreakElapsed : 0);
    } else {
      setBreakElapsedSeconds(0);
    }
  }, [entry.breakStart]);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      if (isOnBreak) {
        setBreakElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnBreak]);

  // Format elapsed time
  const formattedTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }, [elapsedSeconds]);

  // Calculate decimal hours for display
  const decimalHours = useMemo(() => {
    return (elapsedSeconds / 3600).toFixed(2);
  }, [elapsedSeconds]);

  // Format break elapsed time
  const formattedBreakTime = useMemo(() => {
    const minutes = Math.floor(breakElapsedSeconds / 60);
    const seconds = breakElapsedSeconds % 60;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }, [breakElapsedSeconds]);

  const clockInTime = parseISO(entry.clockIn);

  const handleStartBreak = async () => {
    if (onStartBreak && !breakLoading) {
      await onStartBreak();
    }
  };

  const handleEndBreak = async () => {
    if (onEndBreak && !breakLoading) {
      await onEndBreak();
    }
  };

  return (
    <div
      className={`current-timer ${isOnBreak ? "current-timer--on-break" : ""}`}
    >
      {/* Status indicator */}
      <div className="current-timer__status">
        <div
          className={`current-timer__status-dot ${isOnBreak ? "current-timer__status-dot--break" : ""}`}
        />
        <span className="current-timer__status-text">
          {t("timeTracking.clockedIn")}
        </span>
        {isOnBreak && (
          <span className="current-timer__break-badge">
            {t("timeTracking.onBreak")}
          </span>
        )}
      </div>

      {/* Main timer display */}
      <div className="current-timer__display">
        <div className="current-timer__time">{formattedTime}</div>
        <div className="current-timer__decimal">
          {decimalHours} {t("timeTracking.hours")}
        </div>
      </div>

      {/* Break timer (when on break) */}
      {isOnBreak && (
        <div className="current-timer__break-display">
          <svg
            width="16"
            height="16"
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
          <span className="current-timer__break-time">
            {formattedBreakTime}
          </span>
        </div>
      )}

      {/* Break action buttons */}
      {(onStartBreak || onEndBreak) && (
        <div className="current-timer__break-actions">
          {!isOnBreak && onStartBreak && (
            <button
              className="break-button break-button--start"
              onClick={handleStartBreak}
              disabled={breakLoading}
            >
              {breakLoading ? (
                <div className="break-button__spinner" />
              ) : (
                <svg
                  width="18"
                  height="18"
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
              )}
              <span>{t("timeTracking.startBreak")}</span>
            </button>
          )}
          {isOnBreak && onEndBreak && (
            <button
              className="break-button break-button--end"
              onClick={handleEndBreak}
              disabled={breakLoading}
            >
              {breakLoading ? (
                <div className="break-button__spinner" />
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
              <span>{t("timeTracking.endBreak")}</span>
            </button>
          )}
        </div>
      )}

      {/* Clock in details */}
      <div className="current-timer__details">
        <div className="current-timer__detail">
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
          <span>
            {t("timeTracking.startedAt")}{" "}
            <strong>{format(clockInTime, "HH:mm")}</strong>
          </span>
        </div>

        {/* Shift info if linked */}
        {entry.shift && (
          <>
            {entry.shift.role && (
              <div className="current-timer__detail">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{entry.shift.role}</span>
              </div>
            )}
            {entry.shift.location && (
              <div className="current-timer__detail">
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
                <span>{entry.shift.location}</span>
              </div>
            )}
          </>
        )}

        {/* Geolocation accuracy indicator */}
        {entry.clockInLat && entry.clockInLng && (
          <div className="current-timer__geolocation">
            <svg
              width="14"
              height="14"
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
            <span className="geolocation-text">
              {t("timeTracking.locationRecorded")}
            </span>
          </div>
        )}

        {/* Entry type badge */}
        <div
          className={`current-timer__type current-timer__type--${entry.entryType}`}
        >
          {entry.entryType === "scheduled"
            ? t("timeTracking.scheduledShift")
            : t("timeTracking.unscheduledShift")}
        </div>
      </div>
    </div>
  );
}
