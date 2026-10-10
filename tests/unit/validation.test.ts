import { describe, expect, it } from "vitest";
import { BookingValidation } from "../../src/app/module/booking/booking.validation.js";
import { EventValidation } from "../../src/app/module/event/event.validation.js";
import { ReviewValidation } from "../../src/app/module/review/review.validation.js";

describe("review rating bounds", () => {
  const parse = (rating: number) =>
    ReviewValidation.addReviewValidationSchema.safeParse({
      body: { eventId: "e1", rating, comment: "nice" },
    });

  it("accepts 1..5", () => {
    expect(parse(1).success).toBe(true);
    expect(parse(5).success).toBe(true);
  });

  it("rejects 0, 6 and non-integers", () => {
    expect(parse(0).success).toBe(false);
    expect(parse(6).success).toBe(false);
    expect(parse(3.5).success).toBe(false);
  });
});

describe("event create validation", () => {
  const base = {
    title: "T",
    type: ["CONCERT"],
    description: "D",
    location: "L",
    joiningFee: 100,
    maxParticipants: 10,
  };

  it("accepts a valid future event", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(EventValidation.createEvent.safeParse({ ...base, eventDate: future }).success).toBe(
      true,
    );
  });

  it("rejects a past date", () => {
    const past = new Date(Date.now() - 86_400_000);
    expect(EventValidation.createEvent.safeParse({ ...base, eventDate: past }).success).toBe(false);
  });

  it("rejects zero/negative capacity and negative fee", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(
      EventValidation.createEvent.safeParse({ ...base, eventDate: future, maxParticipants: 0 })
        .success,
    ).toBe(false);
    expect(
      EventValidation.createEvent.safeParse({ ...base, eventDate: future, joiningFee: -1 }).success,
    ).toBe(false);
  });

  it("strips unknown fields (update whitelist)", () => {
    const parsed = EventValidation.updateEvent.safeParse({ title: "T2", status: "COMPLETED" });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).not.toHaveProperty("status");
  });
});

describe("booking create validation", () => {
  it("requires a valid uuid eventId", () => {
    const valid = BookingValidation.createBooking.safeParse({
      body: { eventId: "11111111-1111-4111-8111-111111111111" },
    });
    expect(valid.success).toBe(true);

    const invalid = BookingValidation.createBooking.safeParse({ body: { eventId: "nope" } });
    expect(invalid.success).toBe(false);
  });
});
