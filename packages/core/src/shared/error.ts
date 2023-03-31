import { isError, isNumber } from "../utils";

export class FourzeError extends Error {
  statusCode = 500;
  #baseError?: Error;

  get baseError(): Error {
    return this.#baseError ?? this;
  }

  constructor(code?: number | string | Error, message?: string | Error) {
    if (isNumber(code)) {
      if (isError(message)) {
        super(message.message);
        this.#baseError = message;
      } else {
        super(message);
      }
      this.statusCode = code;
    } else if (isError(code)) {
      super(code.message);
      this.#baseError = code;
      if (isFourzeError(code)) {
        this.statusCode = code.statusCode;
        this.#baseError = code.#baseError ?? code;
      }
    } else {
      super(code);
    }
  }

  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode
    };
  }
}

export function isFourzeError(error: any): error is FourzeError {
  return error instanceof FourzeError;
}
