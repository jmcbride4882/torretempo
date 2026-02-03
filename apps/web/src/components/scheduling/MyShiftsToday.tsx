import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  isToday,
  parseISO,
  isBefore,
  isAfter,
  addMinutes,
} from "date-fns";
import { useNavigate } from "react-router-dom";
import type { Shift } from "../../types/schedule";
import { timeEntryService } from "../../services/timeEntryService";
import type { TimeEntry } from "../../types/timeEntry";
import "./MyShiftsToday.css";

interface MyShiftsTodayProps {
  shifts: Shift[];
  currentEmployeeId: string | null;
}

export default function MyShiftsToday({
  shifts,
  currentEmployeeId,
}: MyShiftsTodayProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [loadingShiftId, setLoadingShiftId] = useState<string | null>(null);

  // Fetch current time entry on mount
  useEffect(() => {
    const fetchCurrentEntry = async () => {
      try {
        const entry = await timeEntryService.getCurrent();
        setCurrentEntry(entry);
      } catch (error) {
        console.error("Failed to fetch current entry:", error);
      }
    };

    if (currentEmployeeId) {
      fetchCurrentEntry();
    }
  }, [currentEmployeeId]);

  // Filter shifts for current employee today
  const myShiftsToday = useMemo(() => {
    if (!currentEmployeeId) return [];

    const now = new Date();

    return shifts
      .filter(
        (shift) =>
          shift.employeeId === currentEmployeeId &&
          isToday(parseISO(shift.startTime)),
      )
      .map((shift) => {
        const startTime = parseISO(shift.startTime);
        const endTime = parseISO(shift.endTime);
        const thirtyMinBefore = addMinutes(startTime, -30);

        // Determine shift status
        let status: "upcoming" | "starting-soon" | "active" | "completed";
        if (isAfter(now, endTime)) {
          status = "completed";
        } else if (isBefore(now, thirtyMinBefore)) {
          status = "upcoming";
        } else if (isBefore(now, startTime)) {
          status = "starting-soon";
        } else {
          status = "active";
        }

        return { ...shift, status };
      })
      .sort(
        (a, b) =>
          parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime(),
      );
  }, [shifts, currentEmployeeId]);

  if (!currentEmployeeId) {
    return null;
  }

  const handleClockIn = () => {
    navigate("/time-entries");
  };

  const handleClockInShift = async (shiftId: string) => {
    setLoadingShiftId(shiftId);
    try {
      const entry = await timeEntryService.clockIn({ shiftId });
      setCurrentEntry(entry);
      // Navigate to time entries page to show timer
      navigate("/time-entries");
    } catch (error: any) {
      alert(error.message || "Failed to clock in");
    } finally {
      setLoadingShiftId(null);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;

    setLoadingShiftId(currentEntry.id);
    try {
      await timeEntryService.clockOut();
      setCurrentEntry(null);
      // Navigate to time entries page to show completion
      navigate("/time-entries");
    } catch (error: any) {
      alert(error.message || "Failed to clock out");
    } finally {
      setLoadingShiftId(null);
    }
  };

  const handleStartUnscheduledShift = () => {
    navigate("/time-entries?unscheduled=true");
  };

  // Show "Start Unscheduled Shift" if no shifts today
  if (myShiftsToday.length === 0) {
    return (
      <div className="my-shifts-today">
        <div className="my-shifts-header">
          <h3 className="my-shifts-title">
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
            {t("schedule.myShiftsToday")}
          </h3>
        </div>

        <div className="my-shifts-empty">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="empty-text">{t("schedule.noShiftsToday")}</p>
          <button
            className="btn-start-unscheduled"
            onClick={handleStartUnscheduledShift}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            {t("schedule.startUnscheduledShift")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-shifts-today">
      <div className="my-shifts-header">
        <h3 className="my-shifts-title">
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
          {t("schedule.myShiftsToday")}
        </h3>
        <button className="btn-clock-in" onClick={handleClockIn}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {t("schedule.clockInOut")}
        </button>
      </div>

      <div className="my-shifts-list">
        {myShiftsToday.map((shift) => (
          <div
            key={shift.id}
            className={`my-shift-card my-shift-${shift.status}`}
          >
            {shift.status === "starting-soon" && (
              <div className="shift-alert">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {t("schedule.shiftStartingSoon")}
              </div>
            )}

            {shift.status === "active" && (
              <div className="shift-active-badge">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
                {t("schedule.shiftActive")}
              </div>
            )}

            <div className="my-shift-time">
              <strong>
                {format(parseISO(shift.startTime), "HH:mm")} -{" "}
                {format(parseISO(shift.endTime), "HH:mm")}
              </strong>
            </div>

            {shift.role && <div className="my-shift-role">{shift.role}</div>}

            {shift.location && (
              <div className="my-shift-location">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {shift.location}
              </div>
            )}

            {shift.status === "starting-soon" && !currentEntry && (
              <button
                className="btn-clock-in-shift"
                onClick={() => handleClockInShift(shift.id)}
                disabled={loadingShiftId === shift.id}
              >
                {loadingShiftId === shift.id ? "..." : t("schedule.clockInNow")}
              </button>
            )}

            {shift.status === "active" &&
              currentEntry &&
              currentEntry.shiftId === shift.id && (
                <button
                  className="btn-clock-out-shift"
                  onClick={handleClockOut}
                  disabled={loadingShiftId === currentEntry.id}
                >
                  {loadingShiftId === currentEntry.id
                    ? "..."
                    : t("schedule.clockOut")}
                </button>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
