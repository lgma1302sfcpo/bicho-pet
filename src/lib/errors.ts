export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code = "APP_ERROR", status = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
