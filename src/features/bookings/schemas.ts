import { z } from "zod";

const phoneSchema = z.string().trim().transform((value) => value === "" ? undefined : value).pipe(
  z.string().regex(/^[0-9+()\- ]{6,30}$/).optional(),
);

export const createBookingSchema = z.object({
  serviceId: z.string().min(1).max(40),
  staffId: z.string().min(1).max(40).nullable(),
  startsAt: z.iso.datetime({ offset: false }).refine((value) => value.endsWith("Z"), "Use a UTC datetime ending in Z").transform((value) => new Date(value)),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
    phone: phoneSchema.optional(),
  }),
  notes: z.string().trim().max(500).optional(),
});

export type CreateBookingInput = z.output<typeof createBookingSchema>;

export const bookingRefSchema = z.union([
  z.object({ bookingId: z.string().min(1).max(40) }),
  z.object({ cancelToken: z.string().regex(/^[A-Za-z0-9_-]{32}$/) }),
]);

export type BookingRef = z.output<typeof bookingRefSchema>;
