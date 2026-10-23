import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, json, readJson, sameOrigin, HttpError } from "@/lib/http";
import { profileSchema, stringList, textValue } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { initialProfileData } from "@/types";

export async function GET() {
  try {
    const user = await requireSession();
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });
    const fields = Object.fromEntries(
      Object.keys(initialProfileData).map((key) => [
        key,
        textValue(profile?.[key as keyof typeof profile]),
      ]),
    );
    return json({
      ...initialProfileData,
      ...fields,
      name: user.name || "",
      bio: user.bio || "",
      avatar: user.avatar?.startsWith("data:image/") ? user.avatar : "",
      skills: stringList(profile?.skills),
      others: textValue(profile?.others),
      published: profile?.published || false,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireSession();
    const { name, avatar, bio, ...data } = await readJson(
      request,
      profileSchema.extend({ published: z.boolean().default(false) }).strict(),
      320000,
    );
    if (!name.trim()) throw new HttpError(400, "请先填写姓名或昵称。");
    if (data.published && (!data.title.trim() || !data.lookingFor.trim()))
      throw new HttpError(400, "公开前请填写职业方向和合作意向。");
    await rateLimit(`save:${user.id}`, 60, 600);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { name, avatar, bio },
      }),
      prisma.profile.upsert({
        where: { userId: user.id },
        update: data,
        create: { ...data, userId: user.id },
      }),
    ]);
    return json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
