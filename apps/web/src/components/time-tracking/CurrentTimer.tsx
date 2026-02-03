import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO, differenceInSeconds } from "date-fns";
import type { TimeEntry } from "../../types/timeEntry";
// Geolocation utilities available if needed
// import { formatAccuracy, getAccuracyClass } from "../../hooks/useGeolocation";
import "./CurrentTimer.css";

interface CurrentTimerProps {
  entry: TimeEntry;
}

export default function CurrentTimer({ entry }: CurrentTimerProps) {
  const { t } = useTranslation();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Calculate initial elapsed time
  useEffect(() => {
    const clockInTime = parseISO(entry.clockIn);
    const initialElapsed = differenceInSeconds(new Date(), clockInTime);
    setElapsedSeconds(initialElapsed > 0 ? initialElapsed : 0);
  }, [entry.clockIn]);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  const clockInTime = parseISO(entry.clockIn);

  return (
    <div className="current-timer">
      {/* Status indicator */}
      <div className="current-timer__status">
        <div className="current-timer__status-dot" />
        <span className="current-timer__status-text">
          {t("timeTracking.clockedIn")}
        </span>
      </div>

      {/* Main timer display */}
      <div className="current-timer__display">
        <div className="current-timer__time">{formattedTime}</div>
        <div className="current-timer__decimal">
          {decimalHours} {t("timeTracking.hours")}
        </div>
      </div>

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
