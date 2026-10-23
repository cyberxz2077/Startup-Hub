import { NextResponse } from "next/server";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configured = process.env.APP_URL;
  const expected = configured
    ? new URL(configured).origin
    : new URL(request.url).origin;
  // Vercel supplies this exact deployment hostname. Do not trust request Host or
  // a wildcard: a staged production build needs its own origin before promotion.
  const deploymentOrigin =
    process.env.VERCEL === "1" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null;
  if (!origin || (origin !== expected && origin !== deploymentOrigin))
    throw new HttpError(403, "请求来源无效，请刷新页面后重试。");
}

export async function readJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
  maxBytes = 100_000,
): Promise<z.infer<T>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "请使用 JSON 请求。");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "请求内容为空。");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "内容过长，请缩短后重试。");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let json: unknown;
  try {
    json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "请求格式不正确。");
  }
  return schema.parse(json);
}

export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: "内容格式不正确，请检查必填项、长度和数据类型。" },
      { status: 400 },
    );
  // Never return/log database URLs, upstream payloads, tokens, prompts or stacks.
  console.error(
    "[Startup Hub]",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    { error: "服务暂时不可用，请稍后重试。" },
    { status: 503 },
  );
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
