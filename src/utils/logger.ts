/**
 * Production-ready logging utility for PHat5
 * Provides different log levels and can be configured for production vs development
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  component?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private constructor() {
    // Set log level based on environment
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, component?: string): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const componentStr = component ? `[${component}]` : '';
    return `${timestamp} ${levelStr} ${componentStr} ${message}`;
  }

  private addLog(level: LogLevel, message: string, data?: any, component?: string) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      component,
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  error(message: string, data?: any, component?: string) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formattedMessage = this.formatMessage(LogLevel.ERROR, message, component);
      console.error(formattedMessage, data);
      this.addLog(LogLevel.ERROR, message, data, component);
    }
  }

  warn(message: string, data?: any, component?: string) {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage(LogLevel.WARN, message, component);
      console.warn(formattedMessage, data);
      this.addLog(LogLevel.WARN, message, data, component);
    }
  }

  info(message: string, data?: any, component?: string) {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage(LogLevel.INFO, message, component);
      console.info(formattedMessage, data);
      this.addLog(LogLevel.INFO, message, data, component);
    }
  }

  debug(message: string, data?: any, component?: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, component);
      console.log(formattedMessage, data);
      this.addLog(LogLevel.DEBUG, message, data, component);
    }
  }

  // Get recent logs for debugging or crash reports
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Set log level programmatically
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  // Export logs for debugging
  exportLogs(): string {
    return this.logs
      .map(log => {
        const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
        const componentStr = log.component ? ` | Component: ${log.component}` : '';
        return `${log.timestamp} | ${LogLevel[log.level]} | ${log.message}${componentStr}${dataStr}`;
      })
      .join('\n');
  }
}

// Create singleton instance
const logger = Logger.getInstance();

// Export convenience functions
export const logError = (message: string, data?: any, component?: string) => 
  logger.error(message, data, component);

export const logWarn = (message: string, data?: any, component?: string) => 
  logger.warn(message, data, component);

export const logInfo = (message: string, data?: any, component?: string) => 
  logger.info(message, data, component);

export const logDebug = (message: string, data?: any, component?: string) => 
  logger.debug(message, data, component);

export default logger;
