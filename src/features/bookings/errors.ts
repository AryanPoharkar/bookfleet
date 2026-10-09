export const BOOKING_ERROR_CODES = [
  "INVALID_INPUT",
  "SERVICE_NOT_FOUND",
  "SLOT_TAKEN",
  "PLAN_LIMIT_REACHED",
  "BOOKING_NOT_FOUND",
  "NOT_CONFIRMED",
  "ALREADY_STARTED",
] as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];
export type BookingFailureVia = "CHECK" | "CONSTRAINT";

export class BookingFailure extends Error {
  readonly code: BookingErrorCode;
  readonly via?: BookingFailureVia;

  constructor(code: BookingErrorCode, via?: BookingFailureVia) {
    super(code);
    this.name = "BookingFailure";
    this.code = code;
    this.via = via;
  }
}
