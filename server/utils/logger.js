// utils/logger.js - Centralized logging utility
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be set via environment variable)
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase() || 'INFO'];

// Format timestamp
const formatTimestamp = () => {
  return new Date().toISOString();
};

// Format log message
const formatMessage = (level, message, data = null) => {
  const timestamp = formatTimestamp();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };
  
  return JSON.stringify(logEntry);
};

// Write to log file
const writeToFile = (level, message, data = null) => {
  try {
    const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
    const logEntry = formatMessage(level, message, data);
    
    fs.appendFileSync(logFile, logEntry + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

// Logger class
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  // Error logging
  error(message, data = null) {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      const formattedMessage = `❌ ERROR: ${message}`;
      console.error(formattedMessage, data || '');
      writeToFile('ERROR', message, data);
    }
  }

  // Warning logging
  warn(message, data = null) {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      const formattedMessage = `⚠️ WARN: ${message}`;
      console.warn(formattedMessage, data || '');
      writeToFile('WARN', message, data);
    }
  }

  // Info logging
  info(message, data = null) {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      const formattedMessage = `ℹ️ INFO: ${message}`;
      console.info(formattedMessage, data || '');
      writeToFile('INFO', message, data);
    }
  }

  // Debug logging
  debug(message, data = null) {
    if (currentLogLevel >= LOG_LEVELS.DEBUG && this.isDevelopment) {
      const formattedMessage = `🔍 DEBUG: ${message}`;
      console.debug(formattedMessage, data || '');
      writeToFile('DEBUG', message, data);
    }
  }

  // Success logging
  success(message, data = null) {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      const formattedMessage = `✅ SUCCESS: ${message}`;
      console.log(formattedMessage, data || '');
      writeToFile('INFO', `SUCCESS: ${message}`, data);
    }
  }

  // API request logging
  logRequest(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      };
      
      if (res.statusCode >= 400) {
        this.error(`${req.method} ${req.url} - ${res.statusCode}`, logData);
      } else {
        this.info(`${req.method} ${req.url} - ${res.statusCode}`, logData);
      }
    });
    
    next();
  }

  // Database operation logging
  logDatabase(operation, collection, duration, success = true) {
    const message = `DB ${operation} on ${collection}`;
    const data = { operation, collection, duration: `${duration}ms`, success };
    
    if (success) {
      this.debug(message, data);
    } else {
      this.error(message, data);
    }
  }

  // AI model operation logging
  logAIModel(model, operation, duration, success = true, tokens = null) {
    const message = `AI ${operation} using ${model}`;
    const data = { 
      model, 
      operation, 
      duration: `${duration}ms`, 
      success,
      ...(tokens && { tokens })
    };
    
    if (success) {
      this.info(message, data);
    } else {
      this.error(message, data);
    }
  }

  // Authentication logging
  logAuth(action, userId, success = true, details = null) {
    const message = `AUTH ${action} for user ${userId}`;
    const data = { action, userId, success, ...(details && { details }) };
    
    if (success) {
      this.info(message, data);
    } else {
      this.warn(message, data);
    }
  }

  // Performance logging
  logPerformance(operation, duration, details = null) {
    const message = `PERF ${operation} took ${duration}ms`;
    const data = { operation, duration, ...(details && { details }) };
    
    if (duration > 1000) {
      this.warn(message, data);
    } else {
      this.debug(message, data);
    }
  }

  // Get log statistics
  getLogStats() {
    try {
      const stats = {};
      const logFiles = ['error.log', 'warn.log', 'info.log', 'debug.log'];
      
      logFiles.forEach(file => {
        const filePath = path.join(logsDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          stats[file.replace('.log', '')] = lines.length;
        } else {
          stats[file.replace('.log', '')] = 0;
        }
      });
      
      return stats;
    } catch (error) {
      this.error('Failed to get log statistics', error);
      return {};
    }
  }

  // Clear old logs (keep last 7 days)
  clearOldLogs() {
    try {
      const logFiles = ['error.log', 'warn.log', 'info.log', 'debug.log'];
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      logFiles.forEach(file => {
        const filePath = path.join(logsDir, file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() < sevenDaysAgo) {
            fs.unlinkSync(filePath);
            this.info(`Cleared old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      this.error('Failed to clear old logs', error);
    }
  }
}

// Create and export logger instance
const logger = new Logger();

export default logger;