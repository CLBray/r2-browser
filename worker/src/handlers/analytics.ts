/**
 * Analytics handler for processing Real User Monitoring (RUM) data
 */
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { cors } from 'hono/cors';
import { logger } from '../utils/logger';

// Define the analytics router
export const analyticsRouter = new Hono();

// Apply CORS middleware
analyticsRouter.use(
  '*',
  cors({
    origin: ['*'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    allowMethods: ['POST', 'OPTIONS'],
    maxAge: 86400,
  })
);

// Apply JWT authentication middleware
analyticsRouter.use(
  '*',
  jwt({
    secret: (c) => c.env.JWT_SECRET,
    cookie: 'auth',
  })
);

// Handle RUM data
analyticsRouter.post('/rum', async (c) => {
  try {
    // Get the metrics data from the request
    const { metrics } = await c.req.json<{ metrics: any[] }>();
    
    // Get user info from JWT
    const payload = c.get('jwtPayload');
    const sessionId = payload.sub;
    
    // Log the metrics for debugging
    logger.debug('Received RUM metrics', { 
      sessionId, 
      metricCount: metrics.length 
    });
    
    // Process each metric
    for (const metric of metrics) {
      // Add to Analytics Engine if available
      if (c.env.ANALYTICS) {
        try {
          await c.env.ANALYTICS.writeDataPoint({
            blobs: [
              metric.type || 'unknown',
              metric.sessionId || sessionId || 'anonymous',
              metric.userId || 'anonymous',
              metric.bucketName || 'unknown',
              JSON.stringify(metric.data || {})
            ],
            doubles: [
              metric.data?.duration || 0,
              metric.data?.value || 0,
              metric.timestamp || Date.now()
            ],
            indexes: [
              metric.type || 'unknown',
              metric.data?.success ? 'success' : 'failure',
              metric.data?.errorType || 'none',
              metric.data?.operation || 'none'
            ]
          });
        } catch (error) {
          logger.error('Failed to write to Analytics Engine', { error });
        }
      }
    }
    
    return c.json({ success: true, count: metrics.length });
  } catch (error) {
    logger.error('Error processing RUM data', { error });
    return c.json({ success: false, error: 'Failed to process metrics' }, 500);
  }
});

// Public health endpoint that doesn't require authentication
analyticsRouter.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});