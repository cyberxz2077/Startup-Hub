import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .max(64)
  .transform((value) => value.normalize("NFKC").toLowerCase())
  .pipe(
    z
      .string()
      .regex(
        /^[\p{Script=Han}a-z0-9_-]{2,32}$/u,
        "用户名需为 2–32 位中文、字母、数字、下划线或短横线。",
      ),
  );
export const passwordSchema = z.string().min(12).max(128);

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const short = z.string().max(160);
const paragraph = z.string().max(6000);
const tags = z.array(z.string().trim().min(1).max(100)).max(20);
export const projectSchema = z.object({
  name: short,
  oneLiner: z.string().max(300),
  sector: short,
  location: short,
  stage: short,
  vision: paragraph,
  problem: paragraph,
  solution: paragraph,
  talentNeeds: tags,
  productHighlights: paragraph,
  targetAudience: paragraph,
  businessModel: paragraph,
  differentiation: paragraph,
  marketSize: paragraph,
  teamMembers: paragraph,
  whyNow: paragraph,
  longTermMoat: paragraph,
  roadmapFinance: paragraph,
  others: paragraph,
});
export const profileSchema = z.object({
  name: short,
  title: short,
  location: short,
  bio: paragraph,
  skills: tags,
  experienceHighlights: paragraph,
  education: paragraph,
  lookingFor: paragraph,
  superpower: paragraph,
  others: paragraph,
  avatar: z
    .string()
    .max(150_000)
    .refine(
      (v) =>
        v === "" ||
        /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
      "头像格式不正确",
    ),
});
export const matchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  reason: z.string().min(1).max(2000),
  pros: z.array(z.string().max(500)).max(5),
  cons: z.array(z.string().max(500)).max(5),
});
export const chatSuggestionsSchema = z
  .array(z.string().trim().min(1).max(160))
  .max(4);
export const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(16000),
  suggestions: chatSuggestionsSchema.optional(),
});
export const chatSchema = z
  .object({
    mode: z.enum(["project", "profile"]),
    messages: z.array(chatMessageSchema).min(1).max(30),
    currentData: z.record(z.unknown()).optional(),
    editedFields: z.array(z.string().min(1).max(40)).max(20).optional(),
  })
  .strict()
  .refine(
    (v) => v.messages.at(-1)?.role === "user",
    "最后一条消息必须来自用户",
  );

export function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}
export function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function safeWebsite(value: string | null | undefined) {
  try {
    const url = new URL(value || "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
