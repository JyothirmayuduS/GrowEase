export const ErrorCodes = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  FORBIDDEN: "FORBIDDEN",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",

  INVALID_CSV: "INVALID_CSV",
  EMPTY_CSV: "EMPTY_CSV",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_FILE_TYPE: "UNSUPPORTED_FILE_TYPE",
  MALFORMED_HEADERS: "MALFORMED_HEADERS",
  CSV_PARSE_FAILED: "CSV_PARSE_FAILED",

  AI_TIMEOUT: "AI_TIMEOUT",
  AI_RATE_LIMIT: "AI_RATE_LIMIT",
  AI_INVALID_RESPONSE: "AI_INVALID_RESPONSE",
  AI_PROVIDER_ERROR: "AI_PROVIDER_ERROR",
  AI_BATCH_FAILED: "AI_BATCH_FAILED",

  IMPORT_NOT_FOUND: "IMPORT_NOT_FOUND",
  IMPORT_ALREADY_RUNNING: "IMPORT_ALREADY_RUNNING",
  IMPORT_CANCELLED: "IMPORT_CANCELLED",
  IMPORT_PARTIALLY_COMPLETED: "IMPORT_PARTIALLY_COMPLETED",
  IMPORT_FAILED: "IMPORT_FAILED",
  DUPLICATE_IMPORT: "DUPLICATE_IMPORT",

  INVALID_EMAIL: "INVALID_EMAIL",
  INVALID_PHONE: "INVALID_PHONE",
  INVALID_DATE: "INVALID_DATE",
  INVALID_CRM_STATUS: "INVALID_CRM_STATUS",
  INVALID_DATA_SOURCE: "INVALID_DATA_SOURCE",
  MISSING_CONTACT: "MISSING_CONTACT",
  DUPLICATE_EMAIL: "DUPLICATE_EMAIL",
  DUPLICATE_PHONE: "DUPLICATE_PHONE",

  GOOGLE_OAUTH_DENIED: "GOOGLE_OAUTH_DENIED",
  GOOGLE_STATE_MISMATCH: "GOOGLE_STATE_MISMATCH",
  GOOGLE_TOKEN_EXPIRED: "GOOGLE_TOKEN_EXPIRED",
  GOOGLE_DRIVE_ACCESS_REVOKED: "GOOGLE_DRIVE_ACCESS_REVOKED",
  GOOGLE_DRIVE_FILE_NOT_FOUND: "GOOGLE_DRIVE_FILE_NOT_FOUND",
  GOOGLE_DRIVE_DOWNLOAD_FAILED: "GOOGLE_DRIVE_DOWNLOAD_FAILED",

  MICROSOFT_OAUTH_DENIED: "MICROSOFT_OAUTH_DENIED",
  MICROSOFT_STATE_MISMATCH: "MICROSOFT_STATE_MISMATCH",
  MICROSOFT_TOKEN_EXPIRED: "MICROSOFT_TOKEN_EXPIRED",
  OUTLOOK_ACCESS_REVOKED: "OUTLOOK_ACCESS_REVOKED",
  OUTLOOK_MESSAGE_NOT_FOUND: "OUTLOOK_MESSAGE_NOT_FOUND",
  OUTLOOK_ATTACHMENT_NOT_FOUND: "OUTLOOK_ATTACHMENT_NOT_FOUND",
  OUTLOOK_ATTACHMENT_DOWNLOAD_FAILED: "OUTLOOK_ATTACHMENT_DOWNLOAD_FAILED",
  ONEDRIVE_FILE_NOT_FOUND: "ONEDRIVE_FILE_NOT_FOUND",
  ONEDRIVE_DOWNLOAD_FAILED: "ONEDRIVE_DOWNLOAD_FAILED",

  DATABASE_ERROR: "DATABASE_ERROR",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  CONSTRAINT_VIOLATION: "CONSTRAINT_VIOLATION",

  NETWORK_ERROR: "NETWORK_ERROR",
  UPSTREAM_TIMEOUT: "UPSTREAM_TIMEOUT",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_CONFIGURED: "NOT_CONFIGURED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: unknown[];
  readonly expose: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 500,
    details: unknown[] = [],
    expose = true
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.expose = expose;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: unknown[] = [], code: ErrorCode = ErrorCodes.VALIDATION_ERROR) {
    super(code, message, 400, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required", code: ErrorCode = ErrorCodes.AUTH_REQUIRED) {
    super(code, message, 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Forbidden") {
    super(ErrorCodes.FORBIDDEN, message, 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", code: ErrorCode = ErrorCodes.RESOURCE_NOT_FOUND) {
    super(code, message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCodes.DUPLICATE_IMPORT) {
    super(code, message, 409);
    this.name = "ConflictError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(code: ErrorCode, message: string, statusCode = 502) {
    super(code, message, statusCode);
    this.name = "ExternalServiceError";
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCodes.AI_PROVIDER_ERROR) {
    super(code, message, 502);
    this.name = "AIProviderError";
  }
}

export class OAuthError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 400);
    this.name = "OAuthError";
  }
}
