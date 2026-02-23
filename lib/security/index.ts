/**
 * Security utilities
 * Per CLAUDE.md Section 7
 */

// Feature guard exports
export {
  guardToolAccess,
  guardFeatureAccess,
  guardToolRoute,
  guardToolRouteAuto,
  withToolGuard,
  withFeatureGuard,
  toolDisabledResponse,
  featureDisabledResponse,
  maintenanceModeResponse,
  toolNotFoundResponse,
} from "./feature-guard";

// Upload security exports
export {
  processUpload,
  detectMimeType,
  extractExtension,
  isDangerousExtension,
  generateSafeFilename,
  isWithinSandbox,
  deleteUploadedFile,
  cleanupOldFiles,
  createUploadResponse,
  createUploadErrorResponse,
  DEFAULT_UPLOAD_CONFIGS,
  DANGEROUS_EXTENSIONS,
  type UploadConfig,
  type UploadResult,
  type UploadError,
  type UploadErrorCode,
} from "./upload";

// Security headers exports
export {
  applySecurityHeaders,
  withSecurityHeaders,
  buildCSP,
  buildHSTS,
  buildPermissionsPolicy,
  apiSecurityHeaders,
  downloadSecurityHeaders,
  staticAssetHeaders,
  applyHeaders,
  DEFAULT_SECURITY_CONFIG,
  PRODUCTION_SECURITY_CONFIG,
  type SecurityHeadersConfig,
  type CSPDirectives,
} from "./headers";
