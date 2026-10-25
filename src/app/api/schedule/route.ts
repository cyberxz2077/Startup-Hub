import { requireSession } from "@/lib/auth";
import { apiError, json, readJson, sameOrigin } from "@/lib/http";
import {
  ownSchedule,
  preferenceSchema,
  savePreferences,
} from "@/lib/scheduling";
import { rateLimit } from "@/lib/rate-limit";
export async function GET() {
  try {
    const user = await requireSession();
    return json(await ownSchedule(user.id));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireSession();
    const data = await readJson(request, preferenceSchema);
    await rateLimit(`schedule:${user.id}`, 30, 600);
    await savePreferences(user.id, data);
    return json(await ownSchedule(user.id));
  } catch (error) {
    return apiError(error);
  }
}
