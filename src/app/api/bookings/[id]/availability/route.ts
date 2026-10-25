import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, HttpError, json } from "@/lib/http";
import { availableTo, participantWhere } from "@/lib/scheduling";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const id = z
      .string()
      .cuid()
      .parse((await context.params).id);
    const booking = await prisma.booking.findFirst({
      where: { id, ...participantWhere(user.id) },
    });
    if (!booking) throw new HttpError(404, "预约不存在。");
    return json(await availableTo(booking.requesterId, booking.hostId, id));
  } catch (error) {
    return apiError(error);
  }
}
