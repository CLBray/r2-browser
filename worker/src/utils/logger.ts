import type { Bindings } from '../types';

/**
 * Log levels for different types of log messages
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Interface for structured log entries
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  sessionId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  context?: Record<string, any>;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private env: Bindings;
  private requestId: string;
  private sessionId?: string;
  private userId?: string;
  private path?: string;
  private method?: string;
  
  constructor(env: Bindings, requestId: string) {
    this.env = env;
    this.requestId = requestId;
  }
  
  /**
   * Sets request context information
   */
  setContext(context: {
    sessionId?: string;
    userId?: string;
    path?: string;
    method?: string;
  }): void {
    if (context.sessionId) this.sessionId = context.sessionId;
    if (context.userId) this.userId = context.userId;
    if (context.path) this.path = context.path;
    if (context.method) this.method = context.method;
  }
  
  /**
   * Logs a debug message
   */
  debug(message: string, context: Record<string, any> = {}): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  /**
   * Logs an info message
   */
  info(message: string, context: Record<string, any> = {}): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * Logs a warning message
   */
  warn(message: string, context: Record<string, any> = {}): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * Logs an error message
   */
  error(message: string, error?: Error | unknown, context: Record<string, any> = {}): void {
    const errorContext = { ...context };
    
    if (error) {
      if (error instanceof Error) {
        errorContext.errorMessage = error.message;
        errorContext.stack = error.stack;
      } else {
        errorContext.errorDetails = String(error);
      }
    }
    
    this.log(LogLevel.ERROR, message, errorContext);
  }
  
  /**
   * Logs a request completion
   */
  logRequest(statusCode: number, duration: number, context: Record<string, any> = {}): void {
    this.log(LogLevel.INFO, 'Request completed', {
      ...context,
      statusCode,
      duration
    });
    
    // Log to analytics if available
    if (this.env.ANALYTICS) {
      try {
        this.env.ANALYTICS.writeDataPoint({
          blobs: [this.method || 'UNKNOWN', this.path || 'UNKNOWN'],
          doubles: [duration, statusCode],
          indexes: [this.env.ENVIRONMENT, this.requestId]
        });
      } catch (analyticsError) {
        console.error('Failed to log request to analytics:', analyticsError);
      }
    }
  }
  
  /**
   * Creates and logs a structured log entry
   */
  private log(level: LogLevel, message: string, context: Record<string, any> = {}): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      sessionId: this.sessionId,
      userId: this.userId,
      path: this.path,
      method: this.method,
      context
    };
    
    // Log to console with appropriate level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(entry));
        break;
      case LogLevel.INFO:
        console.info(JSON.stringify(entry));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(entry));
        break;
      case LogLevel.ERROR:
        console.error(JSON.stringify(entry));
        break;
    }
  }
}