import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { apiError, json, readJson, sameOrigin } from "@/lib/http";
import { changeBooking, changeBookingSchema } from "@/lib/scheduling";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const user = await requireSession();
    const id = z
      .string()
      .cuid()
      .parse((await context.params).id);
    const data = await readJson(request, changeBookingSchema);
    await rateLimit(`booking-update:${user.id}`, 60, 600);
    return json(await changeBooking(user.id, id, data));
  } catch (error) {
    return apiError(error);
  }
}
