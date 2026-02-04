import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Employee } from "../../types/employee";
import "./EmployeeScheduleTab.css";

interface EmployeeScheduleTabProps {
  employee: Employee;
}

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  location?: string;
  role?: string;
  status: "scheduled" | "completed" | "missed";
}

// Mock data - will be replaced with API call
const generateMockShifts = (): Shift[] => {
  const shifts: Shift[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    // Skip weekends for mock data
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      shifts.push({
        id: `shift-${i}`,
        date: date.toISOString(),
        startTime: "09:00",
        endTime: "17:00",
        breakMinutes: 30,
        location: i % 2 === 0 ? "Main Kitchen" : "Bar",
        role: i % 2 === 0 ? "Chef" : "Bartender",
        status: i === 0 ? "scheduled" : "scheduled",
      });
    }
  }

  return shifts;
};

export default function EmployeeScheduleTab({
  employee,
}: EmployeeScheduleTabProps) {
  const { t } = useTranslation();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    loadSchedule();
  }, [employee.id]);

  const loadSchedule = async () => {
    // TODO: Replace with actual API call
    setLoading(true);
    setTimeout(() => {
      setShifts(generateMockShifts());
      setLoading(false);
    }, 500);
  };

  const formatDayNumber = (dateString: string) => {
    return new Date(dateString).getDate();
  };

  const formatDayName = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      weekday: "short",
    });
  };

  const calculateDuration = (start: string, end: string, breakMins: number) => {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const totalMins = endH * 60 + endM - (startH * 60 + startM) - breakMins;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim();
  };

  const isToday = (dateString: string) => {
    return new Date(dateString).toDateString() === new Date().toDateString();
  };

  if (loading) {
    return (
      <div className="schedule-tab">
        <div className="loading-schedule">
          <div className="loading-spinner" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-tab">
      {/* Header with view toggle */}
      <div className="schedule-header">
        <h3>{t("employees.profile.upcomingShifts")}</h3>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <button
            className={`toggle-btn ${view === "calendar" ? "active" : ""}`}
            onClick={() => setView("calendar")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>
      </div>

      {shifts.length === 0 ? (
        <div className="empty-schedule">
          <svg
            width="64"
            height="64"
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
          <h3>{t("employees.profile.noUpcomingShifts")}</h3>
          <p>{t("employees.profile.noShiftsDesc")}</p>
        </div>
      ) : view === "list" ? (
        <div className="shifts-list">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className={`shift-card ${isToday(shift.date) ? "today" : ""}`}
            >
              <div className="shift-date">
                <span className="date-number">
                  {formatDayNumber(shift.date)}
                </span>
                <span className="date-day">{formatDayName(shift.date)}</span>
                {isToday(shift.date) && (
                  <span className="today-badge">{t("timeTracking.today")}</span>
                )}
              </div>
              <div className="shift-details">
                <div className="shift-time">
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
                    {shift.startTime} - {shift.endTime}
                  </span>
                  <span className="shift-duration">
                    (
                    {calculateDuration(
                      shift.startTime,
                      shift.endTime,
                      shift.breakMinutes,
                    )}
                    )
                  </span>
                </div>
                {shift.location && (
                  <div className="shift-location">
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
                    <span>{shift.location}</span>
                  </div>
                )}
                {shift.role && (
                  <div className="shift-role">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="7" r="4" />
                      <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
                    </svg>
                    <span>{shift.role}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="shifts-calendar">
          <div className="calendar-week">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className={`calendar-day ${isToday(shift.date) ? "today" : ""}`}
              >
                <div className="day-header">
                  <span className="day-name">{formatDayName(shift.date)}</span>
                  <span className="day-number">
                    {formatDayNumber(shift.date)}
                  </span>
                </div>
                <div className="day-shift">
                  <span className="shift-time-small">
                    {shift.startTime} - {shift.endTime}
                  </span>
                  {shift.location && (
                    <span className="shift-location-small">
                      {shift.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
