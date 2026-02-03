import { useState, useCallback, useEffect } from "react";
import type { Geolocation } from "../types/timeEntry";

export interface GeolocationState {
  position: Geolocation | null;
  error: string | null;
  loading: boolean;
  permissionStatus: "granted" | "denied" | "prompt" | "unknown";
}

const CACHED_POSITION_KEY = "tt_last_geolocation";
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for geolocation with caching and error handling
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: false,
    permissionStatus: "unknown",
  });

  // Check and restore cached position on mount
  useEffect(() => {
    const cached = localStorage.getItem(CACHED_POSITION_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Geolocation;
        const cachedTime = new Date(parsed.timestamp).getTime();
        const now = Date.now();

        // Use cached position if less than 5 minutes old
        if (now - cachedTime < CACHE_MAX_AGE) {
          setState((prev) => ({ ...prev, position: parsed }));
        }
      } catch {
        // Invalid cached data
        localStorage.removeItem(CACHED_POSITION_KEY);
      }
    }

    // Check permission status
    checkPermission();
  }, []);

  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) {
      setState((prev) => ({ ...prev, permissionStatus: "unknown" }));
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      setState((prev) => ({ ...prev, permissionStatus: result.state }));

      // Listen for permission changes
      result.addEventListener("change", () => {
        setState((prev) => ({ ...prev, permissionStatus: result.state }));
      });
    } catch {
      setState((prev) => ({ ...prev, permissionStatus: "unknown" }));
    }
  }, []);

  const getPosition = useCallback(async (): Promise<Geolocation | null> => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "GEOLOCATION_NOT_SUPPORTED",
        loading: false,
      }));
      return null;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geo: Geolocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };

          // Cache the position
          localStorage.setItem(CACHED_POSITION_KEY, JSON.stringify(geo));

          setState((prev) => ({
            ...prev,
            position: geo,
            error: null,
            loading: false,
            permissionStatus: "granted",
          }));

          resolve(geo);
        },
        (error) => {
          let errorCode: string;
          let permStatus: "denied" | "prompt" = "prompt";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorCode = "PERMISSION_DENIED";
              permStatus = "denied";
              break;
            case error.POSITION_UNAVAILABLE:
              errorCode = "POSITION_UNAVAILABLE";
              break;
            case error.TIMEOUT:
              errorCode = "TIMEOUT";
              break;
            default:
              errorCode = "UNKNOWN_ERROR";
          }

          setState((prev) => ({
            ...prev,
            error: errorCode,
            loading: false,
            permissionStatus: permStatus,
          }));

          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      );
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearPosition = useCallback(() => {
    localStorage.removeItem(CACHED_POSITION_KEY);
    setState((prev) => ({ ...prev, position: null }));
  }, []);

  return {
    ...state,
    getPosition,
    clearError,
    clearPosition,
    checkPermission,
  };
}

/**
 * Format accuracy as human-readable string
 */
export function formatAccuracy(meters: number): string {
  if (meters < 10) return "Excellent";
  if (meters < 30) return "Good";
  if (meters < 100) return "Fair";
  return "Poor";
}

/**
 * Get accuracy color class
 */
export function getAccuracyClass(meters: number): string {
  if (meters < 10) return "accuracy-excellent";
  if (meters < 30) return "accuracy-good";
  if (meters < 100) return "accuracy-fair";
  return "accuracy-poor";
}
