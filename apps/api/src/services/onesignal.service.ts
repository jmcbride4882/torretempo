import { logger } from "../utils/logger";

/**
 * OneSignal Push Notification Service
 * Sends push notifications to users via OneSignal REST API
 */

interface OneSignalNotificationData {
  playerIds: string[];
  title: string;
  message: string;
  data?: Record<string, any>;
}

interface OneSignalResponse {
  id: string;
  recipients: number;
  errors?: any;
}

export class OneSignalService {
  private readonly appId: string | undefined;
  private readonly restApiKey: string | undefined;
  private readonly apiUrl = "https://onesignal.com/api/v1/notifications";

  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID;
    this.restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    // Log warning if credentials are not configured (but don't throw - notifications are optional)
    if (!this.appId || !this.restApiKey) {
      logger.warn(
        "OneSignal credentials not configured. Push notifications will be disabled.",
      );
    }
  }

  /**
   * Check if OneSignal is configured
   */
  isConfigured(): boolean {
    return !!(this.appId && this.restApiKey);
  }

  /**
   * Send a push notification to specific users
   *
   * @param playerIds - Array of OneSignal player IDs to send to
   * @param title - Notification title
   * @param message - Notification body/message
   * @param data - Optional data payload for the notification
   * @returns Promise<boolean> - Returns true if sent successfully, false otherwise
   */
  async sendNotification(
    playerIds: string[],
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    // Check if OneSignal is configured
    if (!this.isConfigured()) {
      logger.warn("OneSignal not configured - skipping push notification", {
        playerIds,
        title,
      });
      return false;
    }

    // Validate input
    if (!playerIds || playerIds.length === 0) {
      logger.warn("Cannot send notification: no player IDs provided");
      return false;
    }

    try {
      const payload = {
        app_id: this.appId,
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
        data: data || {},
      };

      logger.debug(
        { playerIds, title, message },
        "Sending OneSignal notification",
      );

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${this.restApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(
          {
            status: response.status,
            statusText: response.statusText,
            body: errorBody,
          },
          "OneSignal API request failed",
        );
        return false;
      }

      const result = (await response.json()) as OneSignalResponse;

      logger.info(
        {
          notificationId: result.id,
          recipients: result.recipients,
          playerIds,
        },
        "OneSignal notification sent successfully",
      );

      return true;
    } catch (error) {
      // Log the error but don't throw - notifications should not break the main flow
      logger.error(
        { error, playerIds, title },
        "Failed to send OneSignal notification",
      );
      return false;
    }
  }

  /**
   * Send a notification to multiple users (batch)
   * Filters out null/undefined player IDs automatically
   */
  async sendBatchNotification(
    playerIds: (string | null | undefined)[],
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    // Filter out null/undefined values
    const validPlayerIds = playerIds.filter(
      (id): id is string => id != null && id !== "",
    );

    if (validPlayerIds.length === 0) {
      logger.warn(
        "Cannot send batch notification: no valid player IDs provided",
      );
      return false;
    }

    return this.sendNotification(validPlayerIds, title, message, data);
  }
}

// Export singleton instance
export const oneSignalService = new OneSignalService();
