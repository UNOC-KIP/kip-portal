export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(opts: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  }) {
    super(opts.message);
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export const NotFound = (resource: string) =>
  new AppError({
    statusCode: 404,
    code: "NOT_FOUND",
    message: `${resource} not found`,
  });

export const BadRequest = (message: string, details?: unknown) =>
  new AppError({
    statusCode: 400,
    code: "BAD_REQUEST",
    message,
    details,
  });

export const Unauthorized = (message = "Authentication required") =>
  new AppError({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message,
  });

export const Forbidden = (message = "Forbidden") =>
  new AppError({
    statusCode: 403,
    code: "FORBIDDEN",
    message,
  });

export const Conflict = (message: string) =>
  new AppError({
    statusCode: 409,
    code: "CONFLICT",
    message,
  });
