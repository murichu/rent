import logger from '../utils/logger.js';

/**
 * Environment Validator Service
 * Validates environment configuration and security settings
 */
class EnvironmentValidator {
  constructor() {
    this.validationResults = [];
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Validate all environment variables and security settings
   */
  async validateEnvironment() {
    this.validationResults = [];
    
    try {
      // Core validation checks
      this.validateRequiredVariables();
      this.validateDatabaseConfiguration();
      this.validateSecurityConfiguration();
      this.validateRedisConfiguration();
      this.validateEmailConfiguration();
      this.validatePaymentConfiguration();
      
      // Production-specific validations
      if (this.isProduction) {
        this.validateProductionSecurity();
        this.validateSSLConfiguration();
        this.validateCORSConfiguration();
      }

      const summary = this.getValidationSummary();
      
      if (summary.hasErrors) {
        logger.error('Environment validation failed', {
          errors: summary.errors,
          warnings: summary.warnings,
          type: 'environment_validation'
        });
        return { valid: false, ...summary };
      }

      if (summary.hasWarnings) {
        logger.warn('Environment validation completed with warnings', {
          warnings: summary.warnings,
          type: 'environment_validation'
        });
      } else {
        logger.info('Environment validation passed successfully', {
          type: 'environment_validation'
        });
      }

      return { valid: true, ...summary };
    } catch (error) {
      logger.error('Environment validation error', {
        error: error.message,
        stack: error.stack,
        type: 'environment_validation_error'
      });
      return {
        valid: false,
        errors: [`Validation process failed: ${error.message}`],
        warnings: [],
        hasErrors: true,
        hasWarnings: false
      };
    }
  }

  /**
   * Validate required environment variables
   */
  validateRequiredVariables() {
    const required = [
      'DATABASE_URL',
      'JWT_SECRET',
      'PORT'
    ];

    const conditionalRequired = [
      { var: 'REDIS_URL', condition: () => process.env.ENABLE_REDIS === 'true' },
      { var: 'EMAIL_HOST', condition: () => process.env.ENABLE_EMAIL === 'true' },
      { var: 'MPESA_CONSUMER_KEY', condition: () => process.env.ENABLE_MPESA === 'true' }
    ];

    // Check required variables
    required.forEach(varName => {
      if (!process.env[varName]) {
        this.addError(`Missing required environment variable: ${varName}`);
      }
    });

    // Check conditional variables
    conditionalRequired.forEach(({ var: varName, condition }) => {
      if (condition() && !process.env[varName]) {
        this.addError(`Missing required environment variable: ${varName} (required when feature is enabled)`);
      }
    });
  }

  /**
   * Validate database configuration
   */
  validateDatabaseConfiguration() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return; // Already handled in required variables
    }

    // Validate database URL format
    try {
      const url = new URL(databaseUrl);
      const protocol = url.protocol.replace(':', '');
      
      // Support both PostgreSQL and MongoDB
      const supportedProtocols = ['postgresql', 'postgres', 'mongodb', 'mongodb+srv'];
      if (!supportedProtocols.includes(protocol)) {
        this.addError(`DATABASE_URL must use supported protocol. Supported: ${supportedProtocols.join(', ')}, got: ${protocol}`);
      }

      if (!url.hostname) {
        this.addError('DATABASE_URL missing hostname');
      }

      // MongoDB+srv doesn't require pathname, but others do
      if (protocol !== 'mongodb+srv' && (!url.pathname || url.pathname === '/')) {
        this.addError('DATABASE_URL missing database name');
      }

      // Production-specific database checks
      if (this.isProduction) {
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          this.addWarning('Production database should not use localhost');
        }

        if (!url.username || !url.password) {
          this.addError('Production database must have authentication credentials');
        }

        // Protocol-specific port warnings
        if (protocol === 'postgresql' || protocol === 'postgres') {
          if (url.port && url.port === '5432' && url.hostname !== 'localhost') {
            this.addWarning('Using default PostgreSQL port in production may be a security risk');
          }
        } else if (protocol === 'mongodb') {
          if (url.port && url.port === '27017' && url.hostname !== 'localhost') {
            this.addWarning('Using default MongoDB port in production may be a security risk');
          }
        }
      }
    } catch (error) {
      this.addError(`Invalid DATABASE_URL format: ${error.message}`);
    }
  }

  /**
   * Validate security configuration
   */
  validateSecurityConfiguration() {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (jwtSecret) {
      if (jwtSecret.length < 32) {
        this.addError('JWT_SECRET must be at least 32 characters long');
      }

      if (jwtSecret === 'your-secret-key' || jwtSecret === 'secret') {
        this.addError('JWT_SECRET must not use default/common values');
      }

      // Check for weak secrets
      const weakPatterns = [
        /^123+$/,
        /^abc+$/i,
        /^password/i,
        /^secret/i
      ];

      if (weakPatterns.some(pattern => pattern.test(jwtSecret))) {
        this.addError('JWT_SECRET appears to be weak or predictable');
      }
    }

    // Validate session secret
    const sessionSecret = process.env.SESSION_SECRET;
    if (sessionSecret && sessionSecret.length < 32) {
      this.addWarning('SESSION_SECRET should be at least 32 characters long');
    }

    // Validate encryption keys
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (encryptionKey && encryptionKey.length < 32) {
      this.addError('ENCRYPTION_KEY must be at least 32 characters long');
    }
  }

  /**
   * Validate Redis configuration
   */
  validateRedisConfiguration() {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const disableRedis = process.env.DISABLE_REDIS === 'true';

    if (disableRedis) {
      this.addWarning('Redis is disabled - rate limiting will use in-memory store');
      return;
    }

    // Check if Redis is configured via URL or individual parameters
    if (redisUrl) {
      try {
        const url = new URL(redisUrl);
        
        if (!['redis', 'rediss'].includes(url.protocol.replace(':', ''))) {
          this.addError('REDIS_URL must use redis:// or rediss:// protocol');
        }

        if (this.isProduction && url.protocol === 'redis:') {
          this.addWarning('Production Redis should use secure connection (rediss://)');
        }

        if (!url.hostname) {
          this.addError('REDIS_URL missing hostname');
        }
      } catch (error) {
        this.addError(`Invalid REDIS_URL format: ${error.message}`);
      }
    } else if (redisHost) {
      // Redis configured via individual parameters (REDIS_HOST, REDIS_PORT, etc.)
      if (!process.env.REDIS_PORT) {
        this.addWarning('REDIS_PORT not specified, using default 6379');
      }
      
      if (this.isProduction && !process.env.REDIS_PASSWORD) {
        this.addWarning('Redis password not set in production');
      }
    } else {
      this.addWarning('Redis configuration not found - rate limiting will use in-memory store');
    }
  }

  /**
   * Validate email configuration
   */
  validateEmailConfiguration() {
    const enableEmail = process.env.ENABLE_EMAIL === 'true';
    
    if (!enableEmail) {
      this.addWarning('Email service is disabled');
      return;
    }

    const requiredEmailVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
    const missingEmailVars = requiredEmailVars.filter(varName => !process.env[varName]);

    if (missingEmailVars.length > 0) {
      this.addError(`Missing email configuration: ${missingEmailVars.join(', ')}`);
    }

    const emailPort = process.env.EMAIL_PORT;
    if (emailPort && !['25', '465', '587', '2525'].includes(emailPort)) {
      this.addWarning(`Unusual email port: ${emailPort}. Common ports are 25, 465, 587, 2525`);
    }
  }

  /**
   * Validate payment configuration
   */
  validatePaymentConfiguration() {
    const enableMpesa = process.env.ENABLE_MPESA === 'true';
    const enablePesapal = process.env.ENABLE_PESAPAL === 'true';

    if (enableMpesa) {
      const mpesaVars = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE'];
      const missingMpesaVars = mpesaVars.filter(varName => !process.env[varName]);
      
      if (missingMpesaVars.length > 0) {
        this.addError(`Missing M-Pesa configuration: ${missingMpesaVars.join(', ')}`);
      }
    }

    if (enablePesapal) {
      const pesapalVars = ['PESAPAL_CONSUMER_KEY', 'PESAPAL_CONSUMER_SECRET'];
      const missingPesapalVars = pesapalVars.filter(varName => !process.env[varName]);
      
      if (missingPesapalVars.length > 0) {
        this.addError(`Missing PesaPal configuration: ${missingPesapalVars.join(', ')}`);
      }
    }
  }

  /**
   * Production-specific security validations
   */
  validateProductionSecurity() {
    // Check for development values in production
    const dangerousValues = {
      'NODE_ENV': ['development', 'dev', 'test'],
      'LOG_LEVEL': ['debug'],
      'FRONTEND_URL': ['http://localhost', 'http://127.0.0.1']
    };

    Object.entries(dangerousValues).forEach(([varName, dangerousVals]) => {
      const value = process.env[varName];
      if (value && dangerousVals.some(dangerous => value.includes(dangerous))) {
        this.addError(`${varName} contains development value in production: ${value}`);
      }
    });

    // Check for debug flags
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '*') {
      this.addWarning('Debug mode is enabled in production');
    }

    // Check for insecure configurations
    if (process.env.DISABLE_HELMET === 'true') {
      this.addError('Security headers (Helmet) are disabled in production');
    }

    if (process.env.DISABLE_RATE_LIMITING === 'true') {
      this.addError('Rate limiting is disabled in production');
    }
  }

  /**
   * Validate SSL configuration
   */
  validateSSLConfiguration() {
    const frontendUrl = process.env.FRONTEND_URL;
    const apiUrl = process.env.API_URL;

    if (frontendUrl && !frontendUrl.startsWith('https://')) {
      this.addError('FRONTEND_URL must use HTTPS in production');
    }

    if (apiUrl && !apiUrl.startsWith('https://')) {
      this.addError('API_URL must use HTTPS in production');
    }

    // Check for SSL-related configurations
    if (process.env.FORCE_HTTPS !== 'true') {
      this.addWarning('FORCE_HTTPS is not enabled in production');
    }
  }

  /**
   * Validate CORS configuration
   */
  validateCORSConfiguration() {
    const corsOrigins = process.env.CORS_ORIGINS;
    
    if (!corsOrigins) {
      this.addWarning('CORS_ORIGINS not specified - using default configuration');
      return;
    }

    const origins = corsOrigins.split(',').map(origin => origin.trim());
    
    // Check for wildcard in production
    if (origins.includes('*')) {
      this.addError('CORS wildcard (*) is not allowed in production');
    }

    // Check for localhost origins in production
    const localhostOrigins = origins.filter(origin => 
      origin.includes('localhost') || origin.includes('127.0.0.1')
    );
    
    if (localhostOrigins.length > 0) {
      this.addWarning(`Localhost origins in production CORS: ${localhostOrigins.join(', ')}`);
    }

    // Validate origin formats
    origins.forEach(origin => {
      if (origin !== '*' && !origin.startsWith('http://') && !origin.startsWith('https://')) {
        this.addError(`Invalid CORS origin format: ${origin}`);
      }
    });
  }

  /**
   * Add validation error
   */
  addError(message) {
    this.validationResults.push({ type: 'error', message });
  }

  /**
   * Add validation warning
   */
  addWarning(message) {
    this.validationResults.push({ type: 'warning', message });
  }

  /**
   * Get validation summary
   */
  getValidationSummary() {
    const errors = this.validationResults
      .filter(result => result.type === 'error')
      .map(result => result.message);
    
    const warnings = this.validationResults
      .filter(result => result.type === 'warning')
      .map(result => result.message);

    return {
      errors,
      warnings,
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0,
      totalIssues: errors.length + warnings.length
    };
  }

  /**
   * Format validation results for display
   */
  formatValidationResults() {
    const summary = this.getValidationSummary();
    
    let output = '\n=== Environment Validation Results ===\n';
    
    if (summary.hasErrors) {
      output += '\n❌ ERRORS:\n';
      summary.errors.forEach((error, index) => {
        output += `  ${index + 1}. ${error}\n`;
      });
    }

    if (summary.hasWarnings) {
      output += '\n⚠️  WARNINGS:\n';
      summary.warnings.forEach((warning, index) => {
        output += `  ${index + 1}. ${warning}\n`;
      });
    }

    if (!summary.hasErrors && !summary.hasWarnings) {
      output += '\n✅ All validations passed successfully!\n';
    }

    output += `\nSummary: ${summary.errors.length} errors, ${summary.warnings.length} warnings\n`;
    output += '=====================================\n';

    return output;
  }

  /**
   * Validate specific connection string
   */
  static validateConnectionString(connectionString, type = 'database') {
    try {
      const url = new URL(connectionString);
      
      const validProtocols = {
        database: ['postgresql', 'postgres', 'mysql', 'mongodb', 'mongodb+srv'],
        redis: ['redis', 'rediss'],
        mongodb: ['mongodb', 'mongodb+srv']
      };

      const protocols = validProtocols[type] || [];
      const protocol = url.protocol.replace(':', '');

      if (!protocols.includes(protocol)) {
        return {
          valid: false,
          error: `Invalid protocol for ${type}. Expected: ${protocols.join(', ')}, got: ${protocol}`
        };
      }

      if (!url.hostname) {
        return {
          valid: false,
          error: `Missing hostname in ${type} connection string`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid ${type} connection string format: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export default new EnvironmentValidator();