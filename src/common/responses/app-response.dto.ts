/**
 * Standardized API Response format
 */
export class AppResponse<T = any> {
  /**
   * HTTP Status Code (200, 201, 400, 401, 404, 500, etc.)
   */
  statusCode: number;

  /**
   * Success flag
   */
  success: boolean;

  /**
   * Human-readable message
   */
  message: string;

  /**
   * Response data payload
   */
  data?: T;

  /**
   * Error details (if any)
   */
  error?: string;

  /**
   * ISO 8601 timestamp when response was created
   */
  timestamp: string;

  constructor(
    statusCode: number,
    message: string,
    data?: T,
    error?: string,
  ) {
    this.statusCode = statusCode;
    this.success = statusCode >= 200 && statusCode < 300;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
}
