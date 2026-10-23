import { logout } from "@/lib/auth";
import { apiError, json, sameOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await logout();
    return json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
