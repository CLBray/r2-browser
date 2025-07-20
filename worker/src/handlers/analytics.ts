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

// Handle RUM data - STUBBED OUT FOR DEVELOPMENT
analyticsRouter.post('/rum', async (c) => {
  try {
    // Get the metrics data from the request (but don't process them)
    const { metrics } = await c.req.json<{ metrics: any[] }>();
    
    // Just return success without processing
    logger.debug('Analytics stubbed - received metrics but not processing', { 
      metricCount: metrics?.length || 0 
    });
    
    return c.json({ success: true, count: metrics?.length || 0 });
  } catch (error) {
    // Even if parsing fails, return success for development
    logger.debug('Analytics stubbed - returning success despite error', { error });
    return c.json({ success: true, count: 0 });
  }
});

// Public health endpoint that doesn't require authentication
analyticsRouter.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});