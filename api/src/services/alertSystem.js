import logger from '../utils/logger.js';
import { performanceMetrics } from './performanceMetrics.js';
import { systemMonitoring } from './systemMonitoring.js';
import { databaseMonitoring } from './databaseMonitoring.js';
import { healthCheck } from './healthCheck.js';

/**
 * Alert System Service
 * Monitors system metrics and triggers alerts based on configurable thresholds
 */
class AlertSystem {
  constructor() {
    this.alerts = [];
    this.alertHistory = [];
    this.alertRules = new Map();
    this.escalationPolicies = new Map();
    this.suppressedAlerts = new Set();
    
    // Configuration
    this.maxAlertHistory = 1000;
    this.alertSuppressionTime = 5 * 60 * 1000; // 5 minutes
    this.escalationDelays = {
      warning: 15 * 60 * 1000, // 15 minutes
      critical: 5 * 60 * 1000   // 5 minutes
    };

    // Initialize default alert rules
    this.initializeDefaultAlertRules();
    
    // Initialize default escalation policies
    this.initializeDefaultEscalationPolicies();
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Initialize default alert rules
   */
  initializeDefaultAlertRules() {
    // Response time alerts
    this.addAlertRule({
      id: 'api_response_time_critical',
      name: 'API Response Time Critical',
      type: 'api_response_time',
      severity: 'critical',
      threshold: 3000, // 3 seconds
      condition: 'greater_than',
      description: 'API endpoint response time exceeds 3 seconds',
      enabled: true,
      escalationPolicy: 'critical_escalation'
    });

    this.addAlertRule({
      id: 'api_response_time_warning',
      name: 'API Response Time Warning',
      type: 'api_response_time',
      severity: 'warning',
      threshold: 1000, // 1 second
      condition: 'greater_than',
      description: 'API endpoint response time exceeds 1 second',
      enabled: true,
      escalationPolicy: 'warning_escalation'
    });

    // Memory usage alerts
    this.addAlertRule({
      id: 'memory_usage_critical',
      name: 'Memory Usage Critical',
      type: 'memory_usage',
      severity: 'critical',
      threshold: 90, // 90%
      condition: 'greater_than',
      description: 'Memory usage exceeds 90%',
      enabled: true,
      escalationPolicy: 'critical_escalation'
    });

    this.addAlertRule({
      id: 'memory_usage_warning',
      name: 'Memory Usage Warning',
      type: 'memory_usage',
      severity: 'warning',
      threshold: 80, // 80%
      condition: 'greater_than',
      description: 'Memory usage exceeds 80%',
      enabled: true,
      escalationPolicy: 'warning_escalation'
    });

    // CPU usage alerts
    this.addAlertRule({
      id: 'cpu_usage_critical',
      name: 'CPU Usage Critical',
      type: 'cpu_usage',
      severity: 'critical',
      threshold: 90, // 90%
      condition: 'greater_than',
      description: 'CPU usage exceeds 90%',
      enabled: true,
      escalationPolicy: 'critical_escalation'
    });

    this.addAlertRule({
      id: 'cpu_usage_warning',
      name: 'CPU Usage Warning',
      type: 'cpu_usage',
      severity: 'warning',
      threshold: 80, // 80%
      condition: 'greater_than',
      description: 'CPU usage exceeds 80%',
      enabled: true,
      escalationPolicy: 'warning_escalation'
    });

    // Database performance alerts
    this.addAlertRule({
      id: 'db_query_time_critical',
      name: 'Database Query Time Critical',
      type: 'database_query_time',
      severity: 'critical',
      threshold: 5000, // 5 seconds
      condition: 'greater_than',
      description: 'Database query execution time exceeds 5 seconds',
      enabled: true,
      escalationPolicy: 'critical_escalation'
    });

    this.addAlertRule({
      id: 'db_connection_pool_critical',
      name: 'Database Connection Pool Critical',
      type: 'database_connection_pool',
      severity: 'critical',
      threshold: 90, // 90%
      condition: 'greater_than',
      description: 'Database connection pool utilization exceeds 90%',
      enabled: true,
      escalationPolicy: 'critical_escalation'
    });

    // Error rate alerts
    this.addAlertRule({
      id: 'error_rate_critical',
      name: 'Error Rate Critical',
      type: 'error_rate',
      severity: 'critical',
      threshold: 10, // 10%
      condition: 'greater_than',
      description: 'API error rate exceeds 10%',
      enabled: true,
      escalationPolicy: 'critical_escalation'
    });

    this.addAlertRule({
      id: 'error_rate_warning',
      name: 'Error Rate Warning',
      type: 'error_rate',
      severity: 'warning',
      threshold: 5, // 5%
      condition: 'greater_than',
      description: 'API error rate exceeds 5%',
      enabled: true,
      escalationPolicy: 'warning_escalation'
    });

    // Health check alerts
    this.addAlertRule({
      id: 'health_check_failure',
      name: 'Health Check Failure',
      type: 'health_check',
      severity: 'critical',
      threshold: 1,
      condition: 'equals',
      description: 'System health check failed',
      enabled: true,
      escalationPolicy: 'critical_escalation'
    });

    logger.info('Default alert rules initialized', { 
      ruleCount: this.alertRules.size 
    });
  }

  /**
   * Initialize default escalation policies
   */
  initializeDefaultEscalationPolicies() {
    this.addEscalationPolicy({
      id: 'critical_escalation',
      name: 'Critical Alert Escalation',
      steps: [
        {
          delay: 0, // Immediate
          actions: ['log', 'console']
        },
        {
          delay: 5 * 60 * 1000, // 5 minutes
          actions: ['log', 'console', 'repeat_notification']
        },
        {
          delay: 15 * 60 * 1000, // 15 minutes
          actions: ['log', 'console', 'escalate_to_admin']
        }
      ]
    });

    this.addEscalationPolicy({
      id: 'warning_escalation',
      name: 'Warning Alert Escalation',
      steps: [
        {
          delay: 0, // Immediate
          actions: ['log']
        },
        {
          delay: 15 * 60 * 1000, // 15 minutes
          actions: ['log', 'console']
        },
        {
          delay: 60 * 60 * 1000, // 1 hour
          actions: ['log', 'console', 'escalate_to_admin']
        }
      ]
    });

    logger.info('Default escalation policies initialized', { 
      policyCount: this.escalationPolicies.size 
    });
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule) {
    this.alertRules.set(rule.id, {
      ...rule,
      createdAt: new Date(),
      lastTriggered: null,
      triggerCount: 0
    });
  }

  /**
   * Add escalation policy
   */
  addEscalationPolicy(policy) {
    this.escalationPolicies.set(policy.id, {
      ...policy,
      createdAt: new Date()
    });
  }

  /**
   * Start monitoring system metrics
   */
  startMonitoring() {
    // Monitor every 30 seconds
    setInterval(() => {
      this.checkAllAlerts();
    }, 30000);

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000);

    logger.info('Alert system monitoring started');
  }

  /**
   * Check all alert rules
   */
  async checkAllAlerts() {
    try {
      for (const [ruleId, rule] of this.alertRules.entries()) {
        if (!rule.enabled) continue;

        const shouldAlert = await this.evaluateAlertRule(rule);
        
        if (shouldAlert) {
          await this.triggerAlert(rule, shouldAlert);
        }
      }
    } catch (error) {
      logger.error('Error checking alerts', { error: error.message });
    }
  }

  /**
   * Evaluate alert rule
   */
  async evaluateAlertRule(rule) {
    try {
      let currentValue;
      let context = {};

      switch (rule.type) {
        case 'api_response_time':
          const apiStats = performanceMetrics.getApiStats(5 * 60 * 1000); // Last 5 minutes
          const slowEndpoints = [];
          
          for (const [endpoint, stats] of Object.entries(apiStats)) {
            if (this.evaluateCondition(stats.averageResponseTime, rule.threshold, rule.condition)) {
              slowEndpoints.push({
                endpoint,
                responseTime: stats.averageResponseTime,
                p95ResponseTime: stats.p95ResponseTime
              });
            }
          }
          
          if (slowEndpoints.length > 0) {
            return {
              value: slowEndpoints[0].responseTime,
              context: { slowEndpoints }
            };
          }
          break;

        case 'memory_usage':
          const memoryStats = systemMonitoring.getMemoryStats(5 * 60 * 1000);
          if (memoryStats) {
            const heapUsagePercent = (memoryStats.process.current.heapUsed / memoryStats.process.current.heapTotal) * 100;
            if (this.evaluateCondition(heapUsagePercent, rule.threshold, rule.condition)) {
              return {
                value: heapUsagePercent,
                context: { 
                  heapUsed: memoryStats.process.current.heapUsed,
                  heapTotal: memoryStats.process.current.heapTotal
                }
              };
            }
          }
          break;

        case 'cpu_usage':
          const cpuStats = systemMonitoring.getCpuStats(5 * 60 * 1000);
          if (cpuStats) {
            const cpuPercent = cpuStats.process.current.percent;
            if (this.evaluateCondition(cpuPercent, rule.threshold, rule.condition)) {
              return {
                value: cpuPercent,
                context: {
                  loadAvg: cpuStats.system.current.loadAvg1,
                  cpuCount: cpuStats.system.current.cpuCount
                }
              };
            }
          }
          break;

        case 'database_query_time':
          const dbStats = databaseMonitoring.getPerformanceStats(5 * 60 * 1000);
          if (dbStats && dbStats.slowQueries) {
            const slowQueries = dbStats.slowQueries.filter(q => 
              this.evaluateCondition(q.executionTime, rule.threshold, rule.condition)
            );
            
            if (slowQueries.length > 0) {
              return {
                value: slowQueries[0].executionTime,
                context: { slowQueries: slowQueries.slice(0, 5) }
              };
            }
          }
          break;

        case 'database_connection_pool':
          const poolStats = databaseMonitoring.getPerformanceStats(5 * 60 * 1000);
          if (poolStats && poolStats.connectionPool) {
            const utilization = poolStats.connectionPool.utilization * 100;
            if (this.evaluateCondition(utilization, rule.threshold, rule.condition)) {
              return {
                value: utilization,
                context: {
                  activeConnections: poolStats.connectionPool.active,
                  totalConnections: poolStats.connectionPool.total,
                  waitingRequests: poolStats.connectionPool.waiting
                }
              };
            }
          }
          break;

        case 'error_rate':
          const errorStats = performanceMetrics.getErrorStats(5 * 60 * 1000);
          const apiStatsForErrors = performanceMetrics.getApiStats(5 * 60 * 1000);
          
          const totalRequests = Object.values(apiStatsForErrors).reduce((sum, stats) => sum + stats.totalRequests, 0);
          const errorRate = totalRequests > 0 ? (errorStats.totalErrors / totalRequests) * 100 : 0;
          
          if (this.evaluateCondition(errorRate, rule.threshold, rule.condition)) {
            return {
              value: errorRate,
              context: {
                totalErrors: errorStats.totalErrors,
                totalRequests,
                errorsByEndpoint: errorStats.errorsByEndpoint
              }
            };
          }
          break;

        case 'health_check':
          const healthStatus = await healthCheck.performHealthCheck();
          const isUnhealthy = healthStatus.status === 'critical' ? 1 : 0;
          
          if (this.evaluateCondition(isUnhealthy, rule.threshold, rule.condition)) {
            return {
              value: isUnhealthy,
              context: {
                healthStatus: healthStatus.status,
                failedServices: healthStatus.services?.filter(s => s.status !== 'healthy') || []
              }
            };
          }
          break;
      }

      return false;
    } catch (error) {
      logger.error('Error evaluating alert rule', { 
        ruleId: rule.id, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Evaluate condition
   */
  evaluateCondition(value, threshold, condition) {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      case 'not_equals':
        return value !== threshold;
      case 'greater_than_or_equal':
        return value >= threshold;
      case 'less_than_or_equal':
        return value <= threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  async triggerAlert(rule, alertData) {
    const alertId = this.generateAlertId();
    const suppressionKey = `${rule.id}_${JSON.stringify(alertData.context)}`;
    
    // Check if alert is suppressed
    if (this.suppressedAlerts.has(suppressionKey)) {
      return;
    }

    const alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      severity: rule.severity,
      description: rule.description,
      value: alertData.value,
      threshold: rule.threshold,
      context: alertData.context,
      timestamp: new Date(),
      status: 'active',
      escalationStep: 0,
      escalationPolicy: rule.escalationPolicy,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null
    };

    // Add to active alerts
    this.alerts.push(alert);
    
    // Add to history
    this.alertHistory.push({
      ...alert,
      action: 'triggered'
    });

    // Update rule statistics
    rule.lastTriggered = new Date();
    rule.triggerCount++;

    // Suppress similar alerts for the suppression time
    this.suppressedAlerts.add(suppressionKey);
    setTimeout(() => {
      this.suppressedAlerts.delete(suppressionKey);
    }, this.alertSuppressionTime);

    // Start escalation
    await this.startEscalation(alert);

    logger.warn('Alert triggered', {
      alertId: alert.id,
      ruleId: rule.id,
      severity: alert.severity,
      value: alert.value,
      threshold: alert.threshold
    });
  }

  /**
   * Start escalation process
   */
  async startEscalation(alert) {
    const policy = this.escalationPolicies.get(alert.escalationPolicy);
    
    if (!policy) {
      logger.error('Escalation policy not found', { 
        policyId: alert.escalationPolicy,
        alertId: alert.id 
      });
      return;
    }

    // Execute escalation steps
    for (let i = 0; i < policy.steps.length; i++) {
      const step = policy.steps[i];
      
      setTimeout(async () => {
        // Check if alert is still active and not acknowledged
        const currentAlert = this.alerts.find(a => a.id === alert.id);
        if (!currentAlert || currentAlert.status !== 'active') {
          return;
        }

        currentAlert.escalationStep = i;
        await this.executeEscalationActions(currentAlert, step.actions);
        
        // Log escalation
        this.alertHistory.push({
          ...currentAlert,
          action: 'escalated',
          escalationStep: i
        });

      }, step.delay);
    }
  }

  /**
   * Execute escalation actions
   */
  async executeEscalationActions(alert, actions) {
    for (const action of actions) {
      try {
        switch (action) {
          case 'log':
            logger.error('ALERT ESCALATION', {
              alertId: alert.id,
              severity: alert.severity,
              description: alert.description,
              value: alert.value,
              threshold: alert.threshold,
              escalationStep: alert.escalationStep
            });
            break;

          case 'console':
            console.error(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.description}`);
            console.error(`   Value: ${alert.value}, Threshold: ${alert.threshold}`);
            console.error(`   Alert ID: ${alert.id}, Time: ${alert.timestamp.toISOString()}`);
            break;

          case 'repeat_notification':
            logger.warn('REPEATED ALERT NOTIFICATION', {
              alertId: alert.id,
              severity: alert.severity,
              description: alert.description,
              escalationStep: alert.escalationStep
            });
            break;

          case 'escalate_to_admin':
            logger.error('ALERT ESCALATED TO ADMIN', {
              alertId: alert.id,
              severity: alert.severity,
              description: alert.description,
              escalationStep: alert.escalationStep,
              requiresImmediateAttention: true
            });
            break;

          // Additional actions can be added here (email, SMS, webhook, etc.)
          default:
            logger.warn('Unknown escalation action', { action, alertId: alert.id });
        }
      } catch (error) {
        logger.error('Error executing escalation action', {
          action,
          alertId: alert.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.status !== 'active') {
      throw new Error('Alert is not active');
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    // Add to history
    this.alertHistory.push({
      ...alert,
      action: 'acknowledged'
    });

    logger.info('Alert acknowledged', {
      alertId: alert.id,
      acknowledgedBy,
      acknowledgedAt: alert.acknowledgedAt
    });

    return alert;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId, resolvedBy) {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    // Add to history
    this.alertHistory.push({
      ...alert,
      action: 'resolved',
      resolvedBy
    });

    // Remove from active alerts
    this.alerts = this.alerts.filter(a => a.id !== alertId);

    logger.info('Alert resolved', {
      alertId: alert.id,
      resolvedBy,
      resolvedAt: alert.resolvedAt
    });

    return alert;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(severity = null) {
    let alerts = this.alerts.filter(a => a.status === 'active');
    
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    return alerts.sort((a, b) => {
      // Sort by severity (critical first) then by timestamp
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100, severity = null) {
    let history = [...this.alertHistory];
    
    if (severity) {
      history = history.filter(a => a.severity === severity);
    }

    return history
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(timeWindow = 24 * 60 * 60 * 1000) { // Default 24 hours
    const cutoff = Date.now() - timeWindow;
    const recentAlerts = this.alertHistory.filter(a => 
      a.timestamp.getTime() > cutoff && a.action === 'triggered'
    );

    const stats = {
      timeWindow: timeWindow / 1000,
      timestamp: new Date().toISOString(),
      total: recentAlerts.length,
      bySeverity: {
        critical: recentAlerts.filter(a => a.severity === 'critical').length,
        warning: recentAlerts.filter(a => a.severity === 'warning').length,
        info: recentAlerts.filter(a => a.severity === 'info').length
      },
      byType: {},
      topAlertRules: {},
      activeAlerts: this.alerts.length
    };

    // Group by type
    recentAlerts.forEach(alert => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
      stats.topAlertRules[alert.ruleId] = (stats.topAlertRules[alert.ruleId] || 0) + 1;
    });

    return stats;
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId, updates) {
    const rule = this.alertRules.get(ruleId);
    
    if (!rule) {
      throw new Error('Alert rule not found');
    }

    Object.assign(rule, updates, { updatedAt: new Date() });
    
    logger.info('Alert rule updated', { ruleId, updates });
    return rule;
  }

  /**
   * Delete alert rule
   */
  deleteAlertRule(ruleId) {
    const rule = this.alertRules.get(ruleId);
    
    if (!rule) {
      throw new Error('Alert rule not found');
    }

    this.alertRules.delete(ruleId);
    
    logger.info('Alert rule deleted', { ruleId });
    return true;
  }

  /**
   * Get all alert rules
   */
  getAlertRules() {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get escalation policies
   */
  getEscalationPolicies() {
    return Array.from(this.escalationPolicies.values());
  }

  /**
   * Clean up old alerts
   */
  cleanupOldAlerts() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Clean up alert history
    const initialHistoryCount = this.alertHistory.length;
    this.alertHistory = this.alertHistory.filter(a => a.timestamp.getTime() > cutoff);
    
    // Keep only recent history if it exceeds max
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory = this.alertHistory
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, this.maxAlertHistory);
    }

    const cleanedCount = initialHistoryCount - this.alertHistory.length;
    
    if (cleanedCount > 0) {
      logger.debug('Alert history cleaned up', { 
        cleanedCount,
        remainingCount: this.alertHistory.length 
      });
    }
  }

  /**
   * Generate alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset alert system
   */
  reset() {
    this.alerts = [];
    this.alertHistory = [];
    this.suppressedAlerts.clear();
    logger.info('Alert system reset');
  }

  /**
   * Get system health summary for alerts
   */
  getHealthSummary() {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');

    let overallStatus = 'healthy';
    if (criticalAlerts.length > 0) {
      overallStatus = 'critical';
    } else if (warningAlerts.length > 0) {
      overallStatus = 'warning';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      warningAlerts: warningAlerts.length,
      topAlerts: activeAlerts.slice(0, 5).map(a => ({
        id: a.id,
        severity: a.severity,
        description: a.description,
        value: a.value,
        timestamp: a.timestamp
      }))
    };
  }
}

// Export singleton instance
export const alertSystem = new AlertSystem();