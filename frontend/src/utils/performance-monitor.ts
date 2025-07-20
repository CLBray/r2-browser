/**
 * PerformanceMonitor class for Real User Monitoring (RUM)
 * Tracks Core Web Vitals and custom performance metrics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private isInitialized = false;
  private analyticsEndpoint = '/api/analytics/rum';
  private metricsQueue: any[] = [];
  private flushInterval: number | null = null;
  private sessionId: string;
  private userId?: string;
  private bucketName?: string;

  // Core Web Vitals thresholds
  private static readonly LCP_THRESHOLD = 2500; // Good LCP is under 2.5s
  private static readonly FID_THRESHOLD = 100; // Good FID is under 100ms
  private static readonly CLS_THRESHOLD = 0.1; // Good CLS is under 0.1

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.setupUnloadHandler();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize the performance monitor - DISABLED FOR DEVELOPMENT
   */
  public init(options: { 
    userId?: string; 
    bucketName?: string; 
    flushIntervalMs?: number;
    analyticsEndpoint?: string;
  } = {}): void {
    if (this.isInitialized) return;

    // Just mark as initialized but don't actually do anything
    this.isInitialized = true;
    console.debug('PerformanceMonitor initialized (stubbed for development)');
  }

  /**
   * Clean up resources - STUBBED
   */
  public destroy(): void {
    // No-op for development
  }

  /**
   * Set user and session information - STUBBED
   */
  public setUserInfo(userId?: string, bucketName?: string): void {
    // No-op for development
  }

  /**
   * Track page load performance - STUBBED
   */
  public trackPageLoad(pageName: string): void {
    // No-op for development
  }

  /**
   * Track user interaction with the application - STUBBED
   */
  public trackUserInteraction(action: string, duration: number, success: boolean, details?: Record<string, any>): void {
    // No-op for development
  }

  /**
   * Track file operations - STUBBED
   */
  public trackFileOperation(
    operation: 'list' | 'upload' | 'download' | 'delete' | 'rename' | 'create_folder',
    fileSize?: number,
    duration?: number,
    success: boolean = true,
    details?: Record<string, any>
  ): void {
    // No-op for development
  }

  /**
   * Track API request performance - STUBBED
   */
  public trackApiRequest(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    success: boolean,
    details?: Record<string, any>
  ): void {
    // No-op for development
  }

  /**
   * Track errors that occur in the application - STUBBED
   */
  public trackError(
    errorType: string,
    message: string,
    source?: string,
    stack?: string,
    details?: Record<string, any>
  ): void {
    // No-op for development
  }

  // All private methods stubbed out for development
  private trackCoreWebVitals(): void { /* No-op */ }
  private trackNavigationTiming(): void { /* No-op */ }
  private setupErrorTracking(): void { /* No-op */ }
  private setupUnloadHandler(): void { /* No-op */ }
  private getFirstPaint(): number | null { return null; }
  private getFirstContentfulPaint(): number | null { return null; }
  private getTimeToInteractive(): number | null { return null; }
  private queueMetric(type: string, data: any): void { /* No-op */ }
  private flushMetrics(isSync: boolean = false): void { /* No-op */ }
  private generateSessionId(): string { return 'dev-session'; }
}

// Export a singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();