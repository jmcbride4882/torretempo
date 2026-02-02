/**
 * OneSignal Push Notification Service
 * Uses OneSignal Web SDK (loaded via CDN script tag in index.html)
 *
 * SETUP REQUIRED:
 * 1. Add OneSignal SDK script to index.html:
 *    <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
 *
 * 2. Configure OneSignal dashboard with your domain
 * 3. Set VITE_ONESIGNAL_APP_ID in .env
 */

// Type definition for OneSignal global object
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

/**
 * Initialize OneSignal SDK
 * @param appId - OneSignal App ID from environment variable
 */
export async function initOneSignal(appId: string): Promise<void> {
  if (!appId) {
    console.warn(
      "[OneSignal] App ID not provided. Push notifications disabled.",
    );
    return;
  }

  // Wait for OneSignal to be loaded
  if (!window.OneSignalDeferred) {
    window.OneSignalDeferred = [];
  }

  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      await OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false, // We'll use custom UI
        },
      });

      console.log("[OneSignal] Initialized successfully");
    } catch (error) {
      console.error("[OneSignal] Initialization failed:", error);
    }
  });
}

/**
 * Subscribe user to push notifications
 * Prompts user for permission if not already granted
 * @returns OneSignal player ID (subscription ID) or null if user denied
 */
export async function subscribeToNotifications(): Promise<string | null> {
  if (!window.OneSignal) {
    console.warn("[OneSignal] SDK not loaded");
    return null;
  }

  try {
    const OneSignal = window.OneSignal;

    // Check if push is supported
    const isPushSupported = await OneSignal.Notifications.isPushSupported();
    if (!isPushSupported) {
      console.warn(
        "[OneSignal] Push notifications not supported in this browser",
      );
      return null;
    }

    // Check if already subscribed
    const permission = await OneSignal.Notifications.permissionNative;

    if (permission === "default") {
      // Request permission
      await OneSignal.Notifications.requestPermission();
    }

    // Get the subscription ID (player ID)
    const userId = await OneSignal.User.PushSubscription.id;

    if (userId) {
      console.log("[OneSignal] Subscribed successfully. Player ID:", userId);
    } else {
      console.log("[OneSignal] User denied notification permission");
    }

    return userId || null;
  } catch (error) {
    console.error("[OneSignal] Subscription failed:", error);
    return null;
  }
}

/**
 * Set external user ID for targeting notifications
 * This links the OneSignal player ID to your app's user ID
 * @param userId - Your app's user ID
 */
export async function setExternalUserId(userId: string): Promise<void> {
  if (!window.OneSignal) {
    console.warn("[OneSignal] SDK not loaded");
    return;
  }

  try {
    const OneSignal = window.OneSignal;
    await OneSignal.login(userId);
    console.log("[OneSignal] External user ID set:", userId);
  } catch (error) {
    console.error("[OneSignal] Failed to set external user ID:", error);
  }
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromNotifications(): Promise<void> {
  if (!window.OneSignal) {
    console.warn("[OneSignal] SDK not loaded");
    return;
  }

  try {
    const OneSignal = window.OneSignal;
    await OneSignal.User.PushSubscription.optOut();
    console.log("[OneSignal] Unsubscribed successfully");
  } catch (error) {
    console.error("[OneSignal] Unsubscribe failed:", error);
  }
}

/**
 * Check if push notifications are supported by the browser
 */
export async function isPushNotificationSupported(): Promise<boolean> {
  if (!window.OneSignal) {
    return false;
  }

  try {
    const OneSignal = window.OneSignal;
    return await OneSignal.Notifications.isPushSupported();
  } catch (error) {
    console.error("[OneSignal] Failed to check support:", error);
    return false;
  }
}

/**
 * Check if user has granted notification permission
 */
export async function isNotificationPermissionGranted(): Promise<boolean> {
  if (!window.OneSignal) {
    return false;
  }

  try {
    const OneSignal = window.OneSignal;
    const permission = await OneSignal.Notifications.permissionNative;
    return permission === "granted";
  } catch (error) {
    console.error("[OneSignal] Failed to check permission:", error);
    return false;
  }
}

/**
 * Get current OneSignal player ID (subscription ID)
 */
export async function getPlayerId(): Promise<string | null> {
  if (!window.OneSignal) {
    return null;
  }

  try {
    const OneSignal = window.OneSignal;
    const userId = await OneSignal.User.PushSubscription.id;
    return userId || null;
  } catch (error) {
    console.error("[OneSignal] Failed to get player ID:", error);
    return null;
  }
}
