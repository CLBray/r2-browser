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
   * Initialize the performance monitor
   */
  public init(options: { 
    userId?: string; 
    bucketName?: string; 
    flushIntervalMs?: number;
    analyticsEndpoint?: string;
  } = {}): void {
    if (this.isInitialized) return;

    this.userId = options.userId;
    this.bucketName = options.bucketName;
    
    if (options.analyticsEndpoint) {
      this.analyticsEndpoint = options.analyticsEndpoint;
    }

    // Start periodic flushing of metrics
    const flushIntervalMs = options.flushIntervalMs || 10000; // Default to 10 seconds
    this.flushInterval = window.setInterval(() => this.flushMetrics(), flushIntervalMs);

    // Track Core Web Vitals
    this.trackCoreWebVitals();

    // Track navigation timing
    this.trackNavigationTiming();

    // Track errors
    this.setupErrorTracking();

    this.isInitialized = true;
    console.debug('PerformanceMonitor initialized');
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.flushInterval) {
      window.clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushMetrics();
    this.isInitialized = false;
  }

  /**
   * Set user and session information
   */
  public setUserInfo(userId?: string, bucketName?: string): void {
    this.userId = userId;
    this.bucketName = bucketName;
  }

  /**
   * Track page load performance
   */
  public trackPageLoad(pageName: string): void {
    if (!this.isInitialized) return;

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!navigation) return;

      this.queueMetric('page_load', {
        page: pageName,
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint(),
        timeToInteractive: this.getTimeToInteractive(),
      });
    } catch (error) {
      console.error('Error tracking page load:', error);
    }
  }

  /**
   * Track user interaction with the application
   */
  public trackUserInteraction(action: string, duration: number, success: boolean, details?: Record<string, any>): void {
    if (!this.isInitialized) return;

    this.queueMetric('user_interaction', {
      action,
      duration,
      success,
      details,
      timestamp: Date.now(),
    });
  }

  /**
   * Track file operations
   */
  public trackFileOperation(
    operation: 'list' | 'upload' | 'download' | 'delete' | 'rename' | 'create_folder',
    fileSize?: number,
    duration?: number,
    success: boolean = true,
    details?: Record<string, any>
  ): void {
    if (!this.isInitialized) return;

    this.queueMetric('file_operation', {
      operation,
      fileSize,
      duration,
      success,
      details,
      timestamp: Date.now(),
    });
  }

  /**
   * Track API request performance
   */
  public trackApiRequest(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    success: boolean,
    details?: Record<string, any>
  ): void {
    if (!this.isInitialized) return;

    this.queueMetric('api_request', {
      endpoint,
      method,
      duration,
      status,
      success,
      details,
      timestamp: Date.now(),
    });
  }

  /**
   * Track errors that occur in the application
   */
  public trackError(
    errorType: string,
    message: string,
    source?: string,
    stack?: string,
    details?: Record<string, any>
  ): void {
    if (!this.isInitialized) return;

    this.queueMetric('error', {
      errorType,
      message,
      source,
      stack,
      details,
      timestamp: Date.now(),
      url: window.location.href,
    });
  }

  /**
   * Track Core Web Vitals
   */
  private trackCoreWebVitals(): void {
    try {
      // Only proceed if the web vitals API is available
      if ('web-vitals' in window) {
        import('web-vitals').then(({ onLCP, onFID, onCLS, onTTFB, onFCP }) => {
          // Largest Contentful Paint
          onLCP(metric => {
            const rating = metric.value <= PerformanceMonitor.LCP_THRESHOLD ? 'good' : 
                          (metric.value <= 4000 ? 'needs-improvement' : 'poor');
            this.queueMetric('web_vital', {
              name: 'LCP',
              value: metric.value,
              rating,
              timestamp: Date.now(),
            });
          });

          // First Input Delay
          onFID(metric => {
            const rating = metric.value <= PerformanceMonitor.FID_THRESHOLD ? 'good' : 
                          (metric.value <= 300 ? 'needs-improvement' : 'poor');
            this.queueMetric('web_vital', {
              name: 'FID',
              value: metric.value,
              rating,
              timestamp: Date.now(),
            });
          });

          // Cumulative Layout Shift
          onCLS(metric => {
            const rating = metric.value <= PerformanceMonitor.CLS_THRESHOLD ? 'good' : 
                          (metric.value <= 0.25 ? 'needs-improvement' : 'poor');
            this.queueMetric('web_vital', {
              name: 'CLS',
              value: metric.value,
              rating,
              timestamp: Date.now(),
            });
          });

          // Time to First Byte (additional metric)
          onTTFB(metric => {
            this.queueMetric('web_vital', {
              name: 'TTFB',
              value: metric.value,
              timestamp: Date.now(),
            });
          });

          // First Contentful Paint (additional metric)
          onFCP(metric => {
            this.queueMetric('web_vital', {
              name: 'FCP',
              value: metric.value,
              timestamp: Date.now(),
            });
          });
        }).catch(error => {
          console.error('Failed to load web-vitals:', error);
        });
      }
    } catch (error) {
      console.error('Error setting up Core Web Vitals tracking:', error);
    }
  }

  /**
   * Track navigation timing metrics
   */
  private trackNavigationTiming(): void {
    try {
      // Wait for the page to fully load
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (!navigation) return;

          this.queueMetric('navigation_timing', {
            dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcpConnection: navigation.connectEnd - navigation.connectStart,
            requestStart: navigation.requestStart - navigation.fetchStart,
            responseTime: navigation.responseEnd - navigation.responseStart,
            domProcessing: navigation.domComplete - navigation.responseEnd,
            domInteractive: navigation.domInteractive - navigation.fetchStart,
            loadEvent: navigation.loadEventEnd - navigation.loadEventStart,
            totalPageLoad: navigation.loadEventEnd - navigation.fetchStart,
            timestamp: Date.now(),
          });
        }, 0);
      });
    } catch (error) {
      console.error('Error tracking navigation timing:', error);
    }
  }

  /**
   * Set up global error tracking
   */
  private setupErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.trackError(
        'unhandled_error',
        event.message || 'Unknown error',
        event.filename,
        event.error?.stack,
        {
          lineno: event.lineno,
          colno: event.colno,
        }
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      this.trackError(
        'unhandled_promise_rejection',
        error?.message || 'Unhandled Promise rejection',
        'promise',
        error?.stack,
        { reason: error }
      );
    });
  }

  /**
   * Set up handler for when the user leaves the page
   */
  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      this.flushMetrics(true);
    });
  }

  /**
   * Get First Paint time
   */
  private getFirstPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const fpEntry = paintEntries.find(entry => entry.name === 'first-paint');
    return fpEntry ? fpEntry.startTime : null;
  }

  /**
   * Get First Contentful Paint time
   */
  private getFirstContentfulPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry ? fcpEntry.startTime : null;
  }

  /**
   * Estimate Time to Interactive
   * This is a simplified version as TTI is complex to measure accurately
   */
  private getTimeToInteractive(): number | null {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return null;
    
    // A simple estimation - in reality TTI is more complex
    return navigation.domInteractive;
  }

  /**
   * Add a metric to the queue
   */
  private queueMetric(type: string, data: any): void {
    this.metricsQueue.push({
      type,
      data,
      sessionId: this.sessionId,
      userId: this.userId,
      bucketName: this.bucketName,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
    });

    // If queue gets too large, flush it
    if (this.metricsQueue.length >= 20) {
      this.flushMetrics();
    }
  }

  /**
   * Send metrics to the backend
   */
  private flushMetrics(isSync: boolean = false): void {
    if (this.metricsQueue.length === 0) return;

    const metrics = [...this.metricsQueue];
    this.metricsQueue = [];

    const sendMetrics = () => {
      fetch(this.analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics }),
        // Use keepalive for beforeunload events
        keepalive: isSync,
      }).catch(error => {
        console.error('Failed to send metrics:', error);
        // If sending fails, add back to queue unless it's a sync send (page unload)
        if (!isSync) {
          this.metricsQueue = [...this.metricsQueue, ...metrics];
        }
      });
    };

    // If this is a synchronous flush (e.g., on page unload), use sendBeacon if available
    if (isSync && navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify({ metrics })], { type: 'application/json' });
        const success = navigator.sendBeacon(this.analyticsEndpoint, blob);
        if (!success) {
          sendMetrics();
        }
      } catch (error) {
        sendMetrics();
      }
    } else {
      sendMetrics();
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

// Export a singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();