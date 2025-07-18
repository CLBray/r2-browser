import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from './analytics';
import { apiClient } from './api';

// Mock fetch
global.fetch = vi.fn();

// Mock apiClient
vi.mock('./api', () => ({
  apiClient: {
    getToken: vi.fn().mockReturnValue('test-token')
  }
}));

// Mock navigator.sendBeacon
Object.defineProperty(navigator, 'sendBeacon', {
  value: vi.fn().mockReturnValue(true),
  configurable: true
});

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset fetch mock
    (global.fetch as any).mockReset();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    
    // Configure analytics service
    analyticsService.configure({
      endpoint: '/api/analytics/test',
      enabled: true
    });
  });
  
  it('should send metrics to the backend', async () => {
    const metrics = [
      { type: 'test', data: { value: 123 }, timestamp: Date.now() }
    ];
    
    await analyticsService.sendMetrics(metrics);
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics/test',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }),
        body: expect.any(String)
      })
    );
    
    // Verify the body contains the metrics
    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.metrics).toEqual(metrics);
  });
  
  it('should send a single event', async () => {
    await analyticsService.sendEvent('test_event', { value: 123 });
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics/test',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('test_event')
      })
    );
  });
  
  it('should use sendBeacon for reliable delivery', () => {
    const metrics = [
      { type: 'test', data: { value: 123 }, timestamp: Date.now() }
    ];
    
    analyticsService.sendBeacon(metrics);
    
    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      '/api/analytics/test',
      expect.any(Blob)
    );
  });
  
  it('should not send metrics when disabled', async () => {
    analyticsService.setEnabled(false);
    
    const metrics = [
      { type: 'test', data: { value: 123 }, timestamp: Date.now() }
    ];
    
    const result = await analyticsService.sendMetrics(metrics);
    
    expect(result).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});