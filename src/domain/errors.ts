/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export abstract class AppError extends Error {
  abstract readonly code: string;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnsupportedFileTypeError extends AppError {
  readonly code = 'UNSUPPORTED_FILE_TYPE';
}

export class ParseError extends AppError {
  readonly code = 'PARSE_ERROR';
}

export class EmptyDataError extends AppError {
  readonly code = 'EMPTY_DATA_ERROR';
}

export class StoreWriteError extends AppError {
  readonly code = 'STORE_WRITE_ERROR';
}

export class StoreReadError extends AppError {
  readonly code = 'STORE_READ_ERROR';
}

export class ProjectNotFoundError extends AppError {
  readonly code = 'PROJECT_NOT_FOUND';
}

export class TableNotFoundError extends AppError {
  readonly code = 'TABLE_NOT_FOUND';
}

export class DuplicateProjectNameError extends AppError {
  readonly code = 'DUPLICATE_PROJECT_NAME';
}

export class UpdateCheckError extends AppError {
  readonly code = 'UPDATE_CHECK_ERROR';
}

export class UpdateDownloadError extends AppError {
  readonly code = 'UPDATE_DOWNLOAD_ERROR';
}
