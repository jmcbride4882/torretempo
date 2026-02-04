import { useTranslation } from "react-i18next";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import "./ShiftTemplatePanel.css";

/**
 * Shift template configuration
 */
export interface ShiftTemplate {
  id: string;
  name: string;
  nameEs: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  breakMinutes: number;
  color: string;
  icon: string;
}

/**
 * Predefined shift templates
 */
export const SHIFT_TEMPLATES: ShiftTemplate[] = [
  {
    id: "morning",
    name: "Morning",
    nameEs: "Manana",
    startTime: "09:00",
    endTime: "17:00",
    breakMinutes: 30,
    color: "#3b82f6", // Blue
    icon: "sun",
  },
  {
    id: "evening",
    name: "Evening",
    nameEs: "Tarde",
    startTime: "17:00",
    endTime: "01:00",
    breakMinutes: 30,
    color: "#8b5cf6", // Purple
    icon: "sunset",
  },
  {
    id: "night",
    name: "Night",
    nameEs: "Noche",
    startTime: "01:00",
    endTime: "09:00",
    breakMinutes: 30,
    color: "#1e3a5f", // Dark blue
    icon: "moon",
  },
  {
    id: "split",
    name: "Split Shift",
    nameEs: "Turno Partido",
    startTime: "09:00",
    endTime: "13:00",
    breakMinutes: 0,
    color: "#f59e0b", // Amber
    icon: "split",
  },
  {
    id: "short",
    name: "Short Shift",
    nameEs: "Turno Corto",
    startTime: "09:00",
    endTime: "14:00",
    breakMinutes: 0,
    color: "#10b981", // Green
    icon: "clock",
  },
];

/**
 * Icon components for shift templates
 */
function TemplateIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "sun":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );
    case "sunset":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M17 18a5 5 0 0 0-10 0" />
          <line x1="12" y1="2" x2="12" y2="9" />
          <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
          <line x1="1" y1="18" x2="3" y2="18" />
          <line x1="21" y1="18" x2="23" y2="18" />
          <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
          <line x1="23" y1="22" x2="1" y2="22" />
          <polyline points="8 6 12 2 16 6" />
        </svg>
      );
    case "moon":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    case "split":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="12" y1="4" x2="12" y2="20" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      );
    case "clock":
      return (
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
      );
    default:
      return (
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
      );
  }
}

/**
 * Calculate duration in hours from start/end times
 */
function calculateDuration(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
}

/**
 * Draggable template card
 */
interface DraggableTemplateProps {
  template: ShiftTemplate;
}

function DraggableTemplate({ template }: DraggableTemplateProps) {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === "es";

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `template-${template.id}`,
      data: {
        type: "template",
        template,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    "--template-color": template.color,
  } as React.CSSProperties;

  const duration = calculateDuration(template.startTime, template.endTime);
  const templateName = isSpanish ? template.nameEs : template.name;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`template-card ${isDragging ? "is-dragging" : ""}`}
      {...listeners}
      {...attributes}
    >
      <div className="template-card-color" />
      <div className="template-card-icon">
        <TemplateIcon icon={template.icon} />
      </div>
      <div className="template-card-info">
        <span className="template-name">{templateName}</span>
        <span className="template-time">
          {template.startTime} - {template.endTime}
        </span>
        <span className="template-duration">{duration}h</span>
      </div>
      <div className="template-drag-handle">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Shift template panel sidebar
 */
interface ShiftTemplatePanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ShiftTemplatePanel({
  isCollapsed = false,
  onToggleCollapse,
}: ShiftTemplatePanelProps) {
  const { t } = useTranslation();

  return (
    <div className={`template-panel ${isCollapsed ? "is-collapsed" : ""}`}>
      <div className="template-panel-header">
        <h3 className="template-panel-title">
          {t("advancedScheduling.templates.title")}
        </h3>
        {onToggleCollapse && (
          <button
            className="template-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline
                points={isCollapsed ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}
              />
            </svg>
          </button>
        )}
      </div>

      {!isCollapsed && (
        <>
          <p className="template-panel-hint">
            {t("advancedScheduling.grid.dragShift")}
          </p>

          <div className="template-list">
            {SHIFT_TEMPLATES.map((template) => (
              <DraggableTemplate key={template.id} template={template} />
            ))}
          </div>

          <div className="template-panel-footer">
            <div className="template-legend">
              <span className="legend-icon">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </span>
              <span className="legend-text">
                {t("advancedScheduling.grid.dropHere")}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
