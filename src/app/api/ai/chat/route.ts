import { requireSession } from "@/lib/auth";
import { apiError, json, readJson, sameOrigin, HttpError } from "@/lib/http";
import { chatSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { generateOnboardingReply, onboardingFields } from "@/lib/onboarding-ai";

export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireSession();
    const { mode, messages, currentData, editedFields } = await readJson(
      request,
      chatSchema,
      256000,
    );
    const draft = onboardingFields(mode).parse(currentData || {});
    if (JSON.stringify({ messages, draft }).length > 60000)
      throw new HttpError(413, "对话过长，请缩短内容后重试。");
    await rateLimit(`ai:${user.id}`, 20, 600);
    await rateLimit(`ai:daily:${user.id}`, 100, 86400);
    await rateLimit("ai:global", 1000, 86400);
    const result = await generateOnboardingReply(
      mode,
      messages,
      draft,
      request.signal,
      editedFields,
    );
    return json(result);
  } catch (error) {
    return apiError(error);
  }
}
