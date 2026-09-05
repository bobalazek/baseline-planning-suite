/**
 * The one error shape every service returns. Handlers throw this; a single error hook turns it
 * into a response, so no handler ever hand-rolls an envelope.
 */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    override readonly message: string,
    readonly details?: readonly string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: readonly string[]): ApiError {
    return new ApiError(400, message, details);
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string, details?: readonly string[]): ApiError {
    return new ApiError(409, message, details);
  }
}

export interface ApiErrorBody {
  readonly error: { readonly message: string; readonly details?: readonly string[] };
}

export function toApiErrorBody(error: ApiError): ApiErrorBody {
  return {
    error: error.details
      ? { message: error.message, details: error.details }
      : { message: error.message },
  };
}
