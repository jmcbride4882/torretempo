import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Employee } from "../../types/employee";
import "./EmployeeTimeEntriesTab.css";

interface EmployeeTimeEntriesTabProps {
  employee: Employee;
}

interface TimeEntry {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  totalHours: number;
  status: "complete" | "in_progress";
  location?: string;
}

// Mock data - will be replaced with API call
const MOCK_TIME_ENTRIES: TimeEntry[] = [
  {
    id: "1",
    date: new Date().toISOString(),
    clockIn: "09:00",
    clockOut: "17:30",
    breakMinutes: 30,
    totalHours: 8,
    status: "complete",
    location: "Main Office",
  },
  {
    id: "2",
    date: new Date(Date.now() - 86400000).toISOString(),
    clockIn: "08:45",
    clockOut: "17:15",
    breakMinutes: 45,
    totalHours: 7.75,
    status: "complete",
    location: "Main Office",
  },
  {
    id: "3",
    date: new Date(Date.now() - 172800000).toISOString(),
    clockIn: "09:15",
    clockOut: "18:00",
    breakMinutes: 30,
    totalHours: 8.25,
    status: "complete",
    location: "Remote",
  },
];

export default function EmployeeTimeEntriesTab({
  employee,
}: EmployeeTimeEntriesTabProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const entriesPerPage = 10;

  useEffect(() => {
    loadTimeEntries();
  }, [employee.id, page]);

  const loadTimeEntries = async () => {
    // TODO: Replace with actual API call
    setLoading(true);
    setTimeout(() => {
      setEntries(MOCK_TIME_ENTRIES);
      setLoading(false);
    }, 500);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t("timeTracking.today");
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return t("timeTracking.yesterday");
    }
    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  };

  const calculateWeeklyTotal = () => {
    const total = entries.reduce((sum, entry) => sum + entry.totalHours, 0);
    return formatHours(total);
  };

  if (loading) {
    return (
      <div className="time-entries-tab">
        <div className="loading-entries">
          <div className="loading-spinner" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="time-entries-tab">
      {/* Summary Stats */}
      <div className="entries-summary">
        <div className="summary-card">
          <div className="summary-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value">{calculateWeeklyTotal()}</span>
            <span className="summary-label">{t("timeTracking.thisWeek")}</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon success">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value">{entries.length}</span>
            <span className="summary-label">
              {t("timeTracking.recentEntries")}
            </span>
          </div>
        </div>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="empty-entries">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h3>{t("timeTracking.noEntries")}</h3>
          <p>{t("employees.profile.noTimeEntriesDesc")}</p>
        </div>
      ) : (
        <div className="entries-list">
          <div className="entries-header">
            <span>{t("schedule.date")}</span>
            <span>{t("timeTracking.clockIn")}</span>
            <span>{t("timeTracking.clockOut")}</span>
            <span>{t("timeTracking.break")}</span>
            <span>{t("timeTracking.total")}</span>
            <span>{t("employee.status")}</span>
          </div>
          {entries.map((entry) => (
            <div key={entry.id} className="entry-row">
              <div className="entry-date">
                <span className="date-main">{formatDate(entry.date)}</span>
                {entry.location && (
                  <span className="date-location">{entry.location}</span>
                )}
              </div>
              <div className="entry-time">{entry.clockIn}</div>
              <div className="entry-time">{entry.clockOut || "-"}</div>
              <div className="entry-time">{entry.breakMinutes}m</div>
              <div className="entry-total">{formatHours(entry.totalHours)}</div>
              <div className={`entry-status ${entry.status}`}>
                {entry.status === "in_progress" ? (
                  <>
                    <span className="status-dot" />
                    {t("timeTracking.inProgress")}
                  </>
                ) : (
                  t("timeTracking.clockedOut")
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {entries.length > 0 && (
        <div className="entries-pagination">
          <button
            className="pagination-btn"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t("common.previous")}
          </button>
          <span className="pagination-info">
            {t("employees.profile.page")} {page}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setPage(page + 1)}
            disabled={entries.length < entriesPerPage}
          >
            {t("common.next")}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
