import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceMonitor } from './performance-monitor';

// Mock fetch
global.fetch = vi.fn();

// Mock performance API
global.performance = {
  ...global.performance,
  getEntriesByType: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(),
};

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset fetch mock
    (global.fetch as any).mockReset();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    
    // Mock performance entries
    (performance.getEntriesByType as any).mockReturnValue([{
      name: 'navigation',
      startTime: 0,
      fetchStart: 0,
      domInteractive: 100,
      loadEventEnd: 200,
      domContentLoadedEventEnd: 150
    }]);
    
    // Mock window event listeners
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
    
    // Mock setInterval and clearInterval
    vi.spyOn(window, 'setInterval').mockReturnValue(123 as any);
    vi.spyOn(window, 'clearInterval').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Clean up
    performanceMonitor.destroy();
  });
  
  it('should initialize correctly', () => {
    performanceMonitor.init();
    
    expect(window.setInterval).toHaveBeenCalled();
    expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
  });
  
  it('should track page load', () => {
    performanceMonitor.init();
    performanceMonitor.trackPageLoad('test-page');
    
    // Should have queued a metric, but not sent it yet (queue size < 20)
    expect(global.fetch).not.toHaveBeenCalled();
  });
  
  it('should track user interaction', () => {
    performanceMonitor.init();
    performanceMonitor.trackUserInteraction('click', 100, true, { button: 'submit' });
    
    // Should have queued a metric, but not sent it yet (queue size < 20)
    expect(global.fetch).not.toHaveBeenCalled();
  });
  
  it('should track errors', () => {
    performanceMonitor.init();
    performanceMonitor.trackError('test_error', 'Test error message', 'test-source', 'stack trace');
    
    // Should have queued a metric, but not sent it yet (queue size < 20)
    expect(global.fetch).not.toHaveBeenCalled();
  });
  
  it('should set user info', () => {
    performanceMonitor.init();
    performanceMonitor.setUserInfo('test-user', 'test-bucket');
    
    // Track something to verify user info is included
    performanceMonitor.trackError('test_error', 'Test error message');
    
    // Force flush metrics
    (performanceMonitor as any).flushMetrics();
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics/rum',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('test-user'),
      })
    );
  });
  
  it('should clean up resources on destroy', () => {
    performanceMonitor.init();
    performanceMonitor.destroy();
    
    expect(window.clearInterval).toHaveBeenCalled();
  });
});