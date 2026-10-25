export type ScheduleSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  active?: boolean;
  booked?: boolean;
  available?: boolean;
};
export type SchedulePerson = {
  id: string;
  name: string | null;
  profile: { title: string | null; published: boolean } | null;
};
export type ScheduleBooking = {
  id: string;
  requesterId: string;
  hostId: string;
  conversationId: string;
  slotId: string;
  title: string;
  note: string;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "change_requested" | "cancelled";
  meetingUrl: string;
  changeReason: string;
  proposedSlotId: string | null;
  proposedStartsAt: string | null;
  proposedEndsAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  requester: SchedulePerson;
  host: SchedulePerson;
};
export type ScheduleSettings = {
  enabled: boolean;
  note: string;
  meetingUrl: string;
  version: number;
};
export type OwnSchedule = {
  settings: ScheduleSettings;
  slots: ScheduleSlot[];
  bookings: ScheduleBooking[];
};
export type PersonAvailability = {
  enabled: boolean;
  note: string;
  slots: ScheduleSlot[];
};
export type BookingEvent = {
  action:
    | "created"
    | "rescheduled"
    | "change_requested"
    | "cancelled"
    | "link_updated";
  title: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
  proposedStartsAt?: string | null;
  proposedEndsAt?: string | null;
};
