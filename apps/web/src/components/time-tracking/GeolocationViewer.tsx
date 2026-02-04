import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { es, enUS } from "date-fns/locale";
import * as Dialog from "@radix-ui/react-dialog";
import { reverseGeocode } from "../../hooks/useGeolocation";
import apiClient from "../../services/api";
import "./GeolocationViewer.css";

interface GeolocationViewerProps {
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Accuracy in meters (optional) */
  accuracy?: number;
  /** Timestamp of the geolocation record */
  timestamp: string;
  /** Time entry ID for audit logging */
  timeEntryId: string;
  /** Type of location (clock-in or clock-out) */
  locationType: "clockIn" | "clockOut";
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void;
}

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  viewedAt: string;
}

export default function GeolocationViewer({
  latitude,
  longitude,
  accuracy,
  timestamp,
  timeEntryId,
  locationType,
  open,
  onOpenChange,
}: GeolocationViewerProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "es" ? es : enUS;

  const [address, setAddress] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditLogged, setAuditLogged] = useState(false);

  // Log view access for GDPR compliance
  const logViewAccess = useCallback(async () => {
    if (auditLogged) return;

    try {
      // POST audit log entry - this endpoint should exist in the API
      await apiClient.post(`/time-entries/${timeEntryId}/geolocation/view`, {
        locationType,
        latitude,
        longitude,
      });
      setAuditLogged(true);
    } catch (err) {
      // Silently fail audit logging - don't block user from viewing
      console.warn("Failed to log geolocation view:", err);
    }
  }, [timeEntryId, locationType, latitude, longitude, auditLogged]);

  // Load audit trail
  const loadAuditTrail = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const response = await apiClient.get(
        `/time-entries/${timeEntryId}/geolocation/audit`,
      );
      setAuditTrail(response.data.data || []);
    } catch (err) {
      // If audit endpoint doesn't exist yet, show empty trail
      console.warn("Failed to load audit trail:", err);
      setAuditTrail([]);
    } finally {
      setLoadingAudit(false);
    }
  }, [timeEntryId]);

  // Reverse geocode the coordinates
  const loadAddress = useCallback(async () => {
    try {
      setLoadingAddress(true);
      const result = await reverseGeocode(latitude, longitude);
      setAddress(result);
    } catch (err) {
      console.warn("Failed to reverse geocode:", err);
      setAddress(null);
    } finally {
      setLoadingAddress(false);
    }
  }, [latitude, longitude]);

  // Handle open state change
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Log access and load data when opening
      logViewAccess();
      loadAddress();
      loadAuditTrail();
    } else {
      // Reset state when closing
      setAuditLogged(false);
    }
    onOpenChange(newOpen);
  };

  // Format coordinates for display
  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
  };

  // Format timestamp
  const formattedTimestamp = format(parseISO(timestamp), "PPpp", { locale });

  // Generate OpenStreetMap embed URL
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005}%2C${latitude - 0.005}%2C${longitude + 0.005}%2C${latitude + 0.005}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  // Generate link to OpenStreetMap
  const mapLink = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="geolocation-viewer__overlay" />
        <Dialog.Content className="geolocation-viewer__content">
          {/* Close button */}
          <Dialog.Close className="geolocation-viewer__close">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Dialog.Close>

          {/* Header */}
          <div className="geolocation-viewer__header">
            <div className="geolocation-viewer__icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <Dialog.Title className="geolocation-viewer__title">
              {locationType === "clockIn"
                ? t("timeTracking.geolocation.clockInLocation")
                : t("timeTracking.geolocation.clockOutLocation")}
            </Dialog.Title>
          </div>

          {/* GDPR Notice */}
          <div className="geolocation-viewer__gdpr-notice">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            {t("timeTracking.geolocation.gdprNotice")}
          </div>

          {/* Map */}
          <div className="geolocation-viewer__map-container">
            <iframe
              className="geolocation-viewer__map"
              src={mapUrl}
              title="Location map"
              loading="lazy"
            />
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="geolocation-viewer__map-link"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {t("timeTracking.geolocation.openInMaps")}
            </a>
          </div>

          {/* Location Details */}
          <div className="geolocation-viewer__details">
            {/* Address */}
            <div className="geolocation-viewer__detail-item">
              <div className="geolocation-viewer__detail-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="geolocation-viewer__detail-content">
                <span className="geolocation-viewer__detail-label">
                  {t("timeTracking.geolocation.address")}
                </span>
                <span className="geolocation-viewer__detail-value">
                  {loadingAddress ? (
                    <span className="geolocation-viewer__loading">
                      {t("common.loading")}
                    </span>
                  ) : address ? (
                    address
                  ) : (
                    <span className="geolocation-viewer__na">
                      {t("timeTracking.geolocation.addressUnavailable")}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Coordinates */}
            <div className="geolocation-viewer__detail-item">
              <div className="geolocation-viewer__detail-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div className="geolocation-viewer__detail-content">
                <span className="geolocation-viewer__detail-label">
                  {t("timeTracking.geolocation.coordinates")}
                </span>
                <span className="geolocation-viewer__detail-value geolocation-viewer__detail-value--mono">
                  {formatCoordinates(latitude, longitude)}
                </span>
              </div>
            </div>

            {/* Accuracy */}
            {accuracy !== undefined && (
              <div className="geolocation-viewer__detail-item">
                <div className="geolocation-viewer__detail-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <div className="geolocation-viewer__detail-content">
                  <span className="geolocation-viewer__detail-label">
                    {t("timeTracking.geolocation.accuracy")}
                  </span>
                  <span className="geolocation-viewer__detail-value">
                    {accuracy >= 1000
                      ? `±${(accuracy / 1000).toFixed(1)} km`
                      : `±${Math.round(accuracy)} m`}
                  </span>
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div className="geolocation-viewer__detail-item">
              <div className="geolocation-viewer__detail-icon">
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
              </div>
              <div className="geolocation-viewer__detail-content">
                <span className="geolocation-viewer__detail-label">
                  {t("timeTracking.geolocation.timestamp")}
                </span>
                <span className="geolocation-viewer__detail-value">
                  {formattedTimestamp}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="geolocation-viewer__audit">
            <h3 className="geolocation-viewer__audit-title">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {t("timeTracking.geolocation.auditTrail")}
            </h3>

            {loadingAudit ? (
              <div className="geolocation-viewer__audit-loading">
                <div className="geolocation-viewer__spinner" />
              </div>
            ) : auditTrail.length === 0 ? (
              <div className="geolocation-viewer__audit-empty">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>{t("timeTracking.geolocation.firstView")}</span>
              </div>
            ) : (
              <div className="geolocation-viewer__audit-list">
                {auditTrail.map((entry) => (
                  <div
                    key={entry.id}
                    className="geolocation-viewer__audit-entry"
                  >
                    <div className="geolocation-viewer__audit-icon">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </div>
                    <div className="geolocation-viewer__audit-content">
                      <span className="geolocation-viewer__audit-user">
                        {t("timeTracking.geolocation.viewedBy")}{" "}
                        <strong>{entry.userName}</strong>
                      </span>
                      <span className="geolocation-viewer__audit-time">
                        {format(parseISO(entry.viewedAt), "PPp", { locale })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
