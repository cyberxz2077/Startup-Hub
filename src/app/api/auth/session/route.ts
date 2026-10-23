import { getSession } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
export async function GET() {
  try {
    return json({ user: await getSession() });
  } catch (error) {
    return apiError(error);
  }
}
