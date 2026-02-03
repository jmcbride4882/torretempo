import { useTranslation } from "react-i18next";
import "./ClockButton.css";

interface ClockButtonProps {
  isClockedIn: boolean;
  isLoading: boolean;
  isGettingLocation: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function ClockButton({
  isClockedIn,
  isLoading,
  isGettingLocation,
  onClick,
  disabled = false,
}: ClockButtonProps) {
  const { t } = useTranslation();

  const getButtonText = () => {
    if (isGettingLocation) {
      return t("timeTracking.gettingLocation");
    }
    if (isLoading) {
      return isClockedIn
        ? t("timeTracking.clockingOut")
        : t("timeTracking.clockingIn");
    }
    return isClockedIn ? t("timeTracking.clockOut") : t("timeTracking.clockIn");
  };

  const isDisabled = disabled || isLoading || isGettingLocation;

  return (
    <button
      className={`clock-button ${isClockedIn ? "clock-button--out" : "clock-button--in"} ${isDisabled ? "clock-button--disabled" : ""}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading || isGettingLocation}
    >
      <div className="clock-button__content">
        {isLoading || isGettingLocation ? (
          <div className="clock-button__spinner" />
        ) : (
          <svg
            className="clock-button__icon"
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isClockedIn ? (
              // Stop/Clock Out icon - Square with rounded corners
              <>
                <rect
                  x="6"
                  y="6"
                  width="12"
                  height="12"
                  rx="2"
                  fill="currentColor"
                  fillOpacity="0.2"
                />
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </>
            ) : (
              // Play/Clock In icon - Filled play triangle
              <>
                <polygon
                  points="6 4 20 12 6 20 6 4"
                  fill="currentColor"
                  fillOpacity="0.2"
                />
                <polygon points="6 4 20 12 6 20 6 4" />
              </>
            )}
          </svg>
        )}
        <span className="clock-button__text">{getButtonText()}</span>
      </div>

      {/* Animated ring */}
      {!isDisabled && <div className="clock-button__ring" />}
    </button>
  );
}
