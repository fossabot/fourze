import { isNumber } from "../utils";

export class FourzeError extends Error {
  statusCode = 500;
  constructor(code?: number | string, message?: string) {
    if (isNumber(code)) {
      super(message);
      this.statusCode = code;
    } else {
      super(code);
    }
  }
}
