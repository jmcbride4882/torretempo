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
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {isClockedIn ? (
              // Stop/Clock Out icon
              <>
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </>
            ) : (
              // Play/Clock In icon
              <>
                <polygon points="5 3 19 12 5 21 5 3" />
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
