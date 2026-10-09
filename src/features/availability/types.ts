export type ServiceTiming = {
  durationMinutes: number;
  bufferMinutes: number;
};

export type StaffDay = {
  staffId: string;
  ranges: { startMinute: number; endMinute: number }[];
  timeOff: { startsAt: Date; endsAt: Date }[];
  bookings: { startsAt: Date; endsAt: Date; bufferMinutes: number }[];
};

export type Slot = {
  startsAt: Date;
  staffIds: string[];
};
