/**
 * Analytics service for sending metrics to the backend
 */
import { apiClient } from './api';
import { ErrorHandler } from '../utils/error-handler';

export interface AnalyticsEvent {
  type: string;
  data: Record<string, any>;
  timestamp: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private endpoint = '/api/analytics/rum';
  private enabled = false; // Disabled for development

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Configure the analytics service
   */
  public configure(options: { endpoint?: string; enabled?: boolean } = {}): void {
    if (options.endpoint) {
      this.endpoint = options.endpoint;
    }
    if (options.enabled !== undefined) {
      this.enabled = options.enabled;
    }
  }

  /**
   * Enable or disable analytics collection
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Send a batch of metrics to the backend
   */
  public async sendMetrics(metrics: any[]): Promise<boolean> {
    if (!this.enabled || !metrics.length) {
      return false;
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token if available
          ...(apiClient.getToken() ? { 'Authorization': `Bearer ${apiClient.getToken()}` } : {})
        },
        body: JSON.stringify({ metrics }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send metrics: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      // Log the error but don't throw - analytics failures shouldn't break the app
      ErrorHandler.logError(error, { context: 'analytics', metricsCount: metrics.length });
      return false;
    }
  }

  /**
   * Send a single event to the backend
   */
  public async sendEvent(type: string, data: Record<string, any> = {}): Promise<boolean> {
    return this.sendMetrics([{
      type,
      data,
      timestamp: Date.now(),
    }]);
  }

  /**
   * Use navigator.sendBeacon for reliable delivery during page unload
   */
  public sendBeacon(metrics: any[]): boolean {
    if (!this.enabled || !metrics.length || !navigator.sendBeacon) {
      return false;
    }

    try {
      const blob = new Blob([JSON.stringify({ metrics })], { type: 'application/json' });
      return navigator.sendBeacon(this.endpoint, blob);
    } catch (error) {
      console.error('Failed to send beacon:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const analyticsService = AnalyticsService.getInstance();