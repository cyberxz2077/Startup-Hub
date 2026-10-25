import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { availableTo } from "@/lib/scheduling";
export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const params = new URL(request.url).searchParams;
    const id = z.string().cuid().parse(params.get("userId"));
    const exclude = z
      .string()
      .cuid()
      .optional()
      .parse(params.get("excludeBookingId") || undefined);
    return json(await availableTo(user.id, id, exclude));
  } catch (error) {
    return apiError(error);
  }
}
