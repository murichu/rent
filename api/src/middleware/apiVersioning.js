import logger from '../utils/logger.js';
import { errorResponse } from '../utils/responses.js';

/**
 * API Versioning Middleware
 * Provides comprehensive API versioning support with deprecation warnings
 */

// Supported API versions
const SUPPORTED_VERSIONS = ['1.0', '1.1', '2.0'];
const DEFAULT_VERSION = '1.0';
const LATEST_VERSION = '2.0';

// Deprecated versions with sunset dates
const DEPRECATED_VERSIONS = {
    '1.0': {
        sunsetDate: '2025-12-31',
        replacementVersion: '2.0',
        deprecationNotice: 'API v1.0 is deprecated. Please migrate to v2.0 by December 31, 2025.'
    }
};

// Version compatibility matrix
const VERSION_COMPATIBILITY = {
    '1.0': {
        features: ['basic_crud', 'auth', 'payments'],
        limitations: ['no_bulk_operations', 'limited_filtering'],
        responseFormat: 'legacy'
    },
    '1.1': {
        features: ['basic_crud', 'auth', 'payments', 'bulk_operations'],
        limitations: ['limited_filtering'],
        responseFormat: 'enhanced'
    },
    '2.0': {
        features: ['basic_crud', 'auth', 'payments', 'bulk_operations', 'advanced_filtering', 'webhooks'],
        limitations: [],
        responseFormat: 'standardized'
    }
};

/**
 * Extract API version from request
 */
function extractVersion(req) {
    // Priority order: header > query > URL path > default

    // 1. Check Accept-Version header
    const headerVersion = req.headers['accept-version'] || req.headers['api-version'];
    if (headerVersion) {
        return headerVersion;
    }

    // 2. Check query parameter
    const queryVersion = req.query.version || req.query.v;
    if (queryVersion) {
        return queryVersion;
    }

    // 3. Check URL path (e.g., /api/v2.0/properties)
    const pathMatch = req.path.match(/^\/api\/v?(\d+\.?\d*)(?:\/|$)/);
    if (pathMatch) {
        return pathMatch[1];
    }

    // 4. Default version
    return DEFAULT_VERSION;
}

/**
 * Validate API version
 */
function validateVersion(version) {
    if (!version) {
        return { valid: false, error: 'Version not specified' };
    }

    // Normalize version (e.g., "2" -> "2.0", "v1.1" -> "1.1")
    const normalizedVersion = version.toString().replace(/^v/, '');
    const versionParts = normalizedVersion.split('.');

    if (versionParts.length === 1) {
        normalizedVersion = `${versionParts[0]}.0`;
    }

    if (!SUPPORTED_VERSIONS.includes(normalizedVersion)) {
        return {
            valid: false,
            error: `Unsupported API version: ${version}`,
            supportedVersions: SUPPORTED_VERSIONS,
            latestVersion: LATEST_VERSION
        };
    }

    return { valid: true, version: normalizedVersion };
}

/**
 * Check if version is deprecated
 */
function checkDeprecation(version) {
    const deprecationInfo = DEPRECATED_VERSIONS[version];
    if (!deprecationInfo) {
        return null;
    }

    const sunsetDate = new Date(deprecationInfo.sunsetDate);
    const now = new Date();
    const daysUntilSunset = Math.ceil((sunsetDate - now) / (1000 * 60 * 60 * 24));

    return {
        ...deprecationInfo,
        daysUntilSunset,
        isExpired: daysUntilSunset <= 0
    };
}

/**
 * Get version capabilities
 */
function getVersionCapabilities(version) {
    return VERSION_COMPATIBILITY[version] || VERSION_COMPATIBILITY[DEFAULT_VERSION];
}

/**
 * API Versioning Middleware
 */
export function apiVersioning(req, res, next) {
    try {
        // Extract version from request
        const requestedVersion = extractVersion(req);

        // Validate version
        const validation = validateVersion(requestedVersion);
        if (!validation.valid) {
            logger.warn('Invalid API version requested', {
                requestedVersion,
                error: validation.error,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });

            return errorResponse(res, validation.error, 400, {
                requestedVersion,
                supportedVersions: validation.supportedVersions,
                latestVersion: validation.latestVersion
            }, 'UNSUPPORTED_API_VERSION');
        }

        const version = validation.version;

        // Check for deprecation
        const deprecation = checkDeprecation(version);
        if (deprecation) {
            if (deprecation.isExpired) {
                logger.error('Expired API version accessed', {
                    version,
                    url: req.url,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                });

                return errorResponse(res, 'API version has been sunset', 410, {
                    version,
                    sunsetDate: deprecation.sunsetDate,
                    replacementVersion: deprecation.replacementVersion
                }, 'API_VERSION_SUNSET');
            }

            // Add deprecation headers
            res.setHeader('Deprecation', 'true');
            res.setHeader('Sunset', deprecation.sunsetDate);
            res.setHeader('Link', `</api/v${deprecation.replacementVersion}>; rel="successor-version"`);

            logger.warn('Deprecated API version accessed', {
                version,
                daysUntilSunset: deprecation.daysUntilSunset,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });
        }

        // Get version capabilities
        const capabilities = getVersionCapabilities(version);

        // Add version info to request
        req.apiVersion = {
            version,
            capabilities,
            deprecation,
            isLatest: version === LATEST_VERSION
        };

        // Add version headers to response
        res.setHeader('API-Version', version);
        res.setHeader('API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
        res.setHeader('API-Latest-Version', LATEST_VERSION);

        // Add deprecation warning to response if applicable
        if (deprecation && !deprecation.isExpired) {
            res.setHeader('Warning', `299 - "${deprecation.deprecationNotice}"`);
        }

        logger.debug('API version processed', {
            version,
            capabilities: capabilities.features,
            isDeprecated: !!deprecation,
            url: req.url
        });

        next();
    } catch (error) {
        logger.error('API versioning middleware error', {
            error: error.message,
            url: req.url
        });

        return errorResponse(res, 'API versioning error', 500, null, 'API_VERSIONING_ERROR');
    }
}

/**
 * Feature availability check middleware
 */
export function requireFeature(featureName) {
    return (req, res, next) => {
        const capabilities = req.apiVersion?.capabilities;

        if (!capabilities || !capabilities.features.includes(featureName)) {
            logger.warn('Feature not available in API version', {
                feature: featureName,
                version: req.apiVersion?.version,
                availableFeatures: capabilities?.features,
                url: req.url
            });

            return errorResponse(res, `Feature '${featureName}' not available in API version ${req.apiVersion?.version}`, 400, {
                feature: featureName,
                version: req.apiVersion?.version,
                availableFeatures: capabilities?.features,
                upgradeToVersion: LATEST_VERSION
            }, 'FEATURE_NOT_AVAILABLE');
        }

        next();
    };
}

/**
 * Version-specific response formatter
 */
export function formatResponse(req, res, next) {
    const originalSend = res.send;

    res.send = function (data) {
        const responseFormat = req.apiVersion?.capabilities?.responseFormat || 'legacy';

        // Apply version-specific formatting
        let formattedData = data;

        if (typeof data === 'object' && data !== null) {
            switch (responseFormat) {
                case 'legacy':
                    // v1.0 format - simple structure
                    if (data.success !== undefined) {
                        formattedData = {
                            success: data.success,
                            data: data.data,
                            message: data.message,
                            timestamp: data.timestamp
                        };
                    }
                    break;

                case 'enhanced':
                    // v1.1 format - includes metadata
                    if (data.success !== undefined) {
                        formattedData = {
                            success: data.success,
                            data: data.data,
                            message: data.message,
                            timestamp: data.timestamp,
                            meta: {
                                version: req.apiVersion.version,
                                ...(data.pagination && { pagination: data.pagination })
                            }
                        };
                    }
                    break;

                case 'standardized':
                    // v2.0 format - full standardized response
                    if (data.success !== undefined) {
                        formattedData = {
                            success: data.success,
                            data: data.data,
                            message: data.message,
                            timestamp: data.timestamp,
                            meta: {
                                version: req.apiVersion.version,
                                requestId: req.correlationId,
                                ...(data.pagination && { pagination: data.pagination }),
                                ...(req.apiVersion.deprecation && {
                                    deprecation: {
                                        warning: req.apiVersion.deprecation.deprecationNotice,
                                        sunsetDate: req.apiVersion.deprecation.sunsetDate
                                    }
                                })
                            }
                        };
                    }
                    break;
            }
        }

        return originalSend.call(this, formattedData);
    };

    next();
}

/**
 * Get API version information
 */
export function getVersionInfo() {
    return {
        supportedVersions: SUPPORTED_VERSIONS,
        defaultVersion: DEFAULT_VERSION,
        latestVersion: LATEST_VERSION,
        deprecatedVersions: Object.keys(DEPRECATED_VERSIONS),
        versionCapabilities: VERSION_COMPATIBILITY
    };
}

/**
 * Version migration helper
 */
export function getMigrationGuide(fromVersion, toVersion = LATEST_VERSION) {
    const fromCapabilities = VERSION_COMPATIBILITY[fromVersion];
    const toCapabilities = VERSION_COMPATIBILITY[toVersion];

    if (!fromCapabilities || !toCapabilities) {
        return null;
    }

    const newFeatures = toCapabilities.features.filter(
        feature => !fromCapabilities.features.includes(feature)
    );

    const removedLimitations = fromCapabilities.limitations.filter(
        limitation => !toCapabilities.limitations.includes(limitation)
    );

    const breakingChanges = [];

    // Identify potential breaking changes
    if (fromCapabilities.responseFormat !== toCapabilities.responseFormat) {
        breakingChanges.push({
            type: 'response_format',
            description: `Response format changed from ${fromCapabilities.responseFormat} to ${toCapabilities.responseFormat}`,
            impact: 'Client code may need updates to handle new response structure'
        });
    }

    return {
        fromVersion,
        toVersion,
        newFeatures,
        removedLimitations,
        breakingChanges,
        migrationSteps: [
            'Update API version in requests (header, query, or URL)',
            'Test all existing functionality with new version',
            'Update client code to handle new response format if applicable',
            'Take advantage of new features and removed limitations',
            'Update error handling for new error codes'
        ]
    };
}

export default {
    apiVersioning,
    requireFeature,
    formatResponse,
    getVersionInfo,
    getMigrationGuide
};