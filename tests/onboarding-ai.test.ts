import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/lib/auth", () => ({
  requireSession: vi.fn(async () => ({ id: "onboarding-test-user" })),
}));
vi.mock("../src/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
import {
  buildOnboardingMessages,
  generateOnboardingReply,
  onboardingResponseSchema,
} from "../src/lib/onboarding-ai";
import { chatSchema, chatMessageSchema } from "../src/lib/validation";
import { initialProfileData, initialProjectData } from "../src/types";
import { POST } from "../src/app/api/ai/chat/route";
import { rateLimit } from "../src/lib/rate-limit";

const completion = (value: unknown, finishReason = "stop") =>
  Response.json({
    choices: [
      {
        finish_reason: finishReason,
        message: {
          content: typeof value === "string" ? value : JSON.stringify(value),
        },
      },
    ],
  });
const input = [{ role: "user" as const, text: "创业项目" }];

beforeEach(() => {
  vi.stubEnv("DEEPSEEK_API_KEY", "qa-only-secret");
  vi.stubEnv("APP_URL", "http://localhost:3100");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("onboarding conversation contract", () => {
  it("accepts a clarification without pretending that anything was filled", () => {
    const parse = onboardingResponseSchema("project");
    expect(parse.parse({ reply: "想先帮助哪些人？" })).toEqual({
      reply: "想先帮助哪些人？",
      updates: {},
      suggestions: [],
    });
    expect(
      parse.parse({
        reply: "再说一点也可以。",
        updates: null,
        suggestions: null,
      }).updates,
    ).toEqual({});
  });

  it("ignores null placeholders without erasing a previous draft", () => {
    const { updates } = onboardingResponseSchema("profile").parse({
      reply: "已归纳出你的方向。",
      updates: { name: null, location: null, bio: "擅长理解用户需求" },
    });
    expect({
      ...initialProfileData,
      name: "小林",
      location: "杭州",
      ...updates,
    }).toMatchObject({
      name: "小林",
      location: "杭州",
      bio: "擅长理解用户需求",
    });
  });

  it("normalizes string lists but rejects fabricated object-shaped field values", () => {
    expect(
      onboardingResponseSchema("profile").parse({
        reply: "已整理技能。",
        updates: { skills: "用户访谈、需求梳理，用户访谈" },
      }).updates,
    ).toEqual({ skills: ["用户访谈", "需求梳理"] });
    expect(
      onboardingResponseSchema("project").safeParse({
        reply: "已整理。",
        updates: { problem: { text: "某个问题" } },
      }).success,
    ).toBe(false);
    expect(
      onboardingResponseSchema("profile").safeParse({
        reply: "已整理。",
        updates: { skills: [42] },
      }).success,
    ).toBe(false);
  });

  it("only allows fields belonging to the current editor", () => {
    expect(
      onboardingResponseSchema("profile").parse({
        reply: "继续。",
        updates: {
          bio: "做用户研究",
          avatar: "untrusted",
          published: true,
          solution: "wrong mode",
        },
      }).updates,
    ).toEqual({ bio: "做用户研究" });
  });

  it("retains ordered choices through request validation and history serialization", () => {
    const previous = chatMessageSchema.parse({
      role: "model",
      text: "你倾向怎样合作？",
      suggestions: ["我想全职加入", "我想按项目合作", "我希望先聊聊"],
    });
    const request = chatSchema.parse({
      mode: "profile",
      currentData: initialProfileData,
      messages: [previous, { role: "user", text: "第二个" }],
    });
    const history = buildOnboardingMessages(
      request.mode,
      request.messages,
      request.currentData,
    );
    expect(JSON.parse(history.at(-2)!.content).suggestions[1]).toBe(
      "我想按项目合作",
    );
    expect(JSON.parse(history.at(-1)!.content).message).toBe("第二个");
  });

  it("bundles the latest draft with the current turn after stale history", () => {
    const history = buildOnboardingMessages(
      "profile",
      [
        { role: "user", text: "我住深圳" },
        {
          role: "model",
          text: "你在深圳，想和哪种团队合作？",
          suggestions: ["早期团队", "成熟公司"],
        },
        { role: "user", text: "早期团队" },
      ],
      { ...initialProfileData, location: "上海" },
    );
    expect(history[1].content).toBe("我住深圳");
    expect(JSON.parse(history.at(-1)!.content)).toMatchObject({
      currentDraft: { location: "上海" },
      message: "早期团队",
    });
  });

  it("bounds choice count and size, and removes repeated display choices", () => {
    expect(
      onboardingResponseSchema("project").parse({
        reply: "想先从哪里开始？",
        suggestions: ["目标用户", "目标用户", "核心问题"],
      }).suggestions,
    ).toEqual(["目标用户", "核心问题"]);
    expect(
      chatMessageSchema.safeParse({
        role: "model",
        text: "选择",
        suggestions: Array(5).fill("选项"),
      }).success,
    ).toBe(false);
    expect(
      chatMessageSchema.safeParse({
        role: "model",
        text: "选择",
        suggestions: ["a".repeat(161)],
      }).success,
    ).toBe(false);
  });
});

describe("recovering model output without losing the conversation", () => {
  it("accepts a layout-only rewrite of selected evidence while still rejecting stale manual-field changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        completion({
          reply: "早期团队和成熟产品都可以，远程按项目合作。",
          updates: {
            lookingFor: "远程按项目合作，早期团队和成熟产品都可以",
            location: "深圳",
          },
          evidence: {
            lookingFor:
              "我选择以下方向：我偏向早期团队 我也考虑成熟产品 补充：只做远程，按项目合作",
            location: "我在深圳",
          },
        }),
      ),
    );
    const result = await generateOnboardingReply(
      "profile",
      [
        { role: "user", text: "我在深圳" },
        {
          role: "model",
          text: "想与什么样的团队合作？",
          suggestions: ["我偏向早期团队", "我也考虑成熟产品"],
        },
        {
          role: "user",
          text: "我选择以下方向：\n- 我偏向早期团队\n- 我也考虑成熟产品\n\n补充：只做远程，按项目合作",
        },
      ],
      { ...initialProfileData, lookingFor: "远程按项目合作", location: "上海" },
      undefined,
      ["lookingFor", "location"],
    );
    expect(result.updates).toEqual({
      lookingFor: "远程按项目合作，早期团队和成熟产品都可以",
    });
  });

  it("keeps existing fields when a model cites stale history or omits current evidence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        completion({
          reply: "你希望和早期团队合作。",
          updates: {
            location: "深圳",
            title: "旧职称",
            lookingFor: "按项目与早期团队合作",
          },
          evidence: {
            location: "我住深圳",
            lookingFor: "更想和早期创业团队合作",
          },
        }),
      ),
    );
    const result = await generateOnboardingReply(
      "profile",
      [
        { role: "user", text: "我住深圳" },
        { role: "model", text: "想和哪种团队合作？" },
        { role: "user", text: "更想和早期创业团队合作" },
      ],
      {
        ...initialProfileData,
        location: "上海",
        title: "用户研究",
        lookingFor: "按项目合作",
      },
      undefined,
      ["location", "title"],
    );
    expect(result.updates).toEqual({ lookingFor: "按项目与早期团队合作" });
    expect(result).not.toHaveProperty("evidence");
    expect(console.warn).toHaveBeenCalledWith(
      "[DeepSeek] stale_update_ignored",
      { fields: expect.arrayContaining(["location", "title"]) },
    );
  });

  it("allows semantic corrections supported by the current utterance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        completion({
          reply: "城市改为上海，合作方式改为按项目合作。",
          updates: { location: "上海", lookingFor: "按项目合作" },
          evidence: { location: "换成魔都", lookingFor: "第二个" },
        }),
      ),
    );
    const result = await generateOnboardingReply(
      "profile",
      [
        {
          role: "model",
          text: "怎么合作？",
          suggestions: ["全职加入", "按项目合作"],
        },
        { role: "user", text: "第二个。另外城市换成魔都。" },
      ],
      { ...initialProfileData, location: "深圳", lookingFor: "全职加入" },
      undefined,
      ["location"],
    );
    expect(result.updates).toEqual({
      location: "上海",
      lookingFor: "按项目合作",
    });
  });

  it("repairs malformed JSON once using the same deadline and original context", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(completion("not-json PRIVATE-RESPONSE"))
      .mockResolvedValueOnce(
        completion({
          reply: "想为谁解决问题？",
          updates: {},
          suggestions: ["小店经营者", "独立开发者"],
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const result = await generateOnboardingReply(
      "project",
      input,
      initialProjectData,
    );
    expect(result.suggestions).toHaveLength(2);
    expect(result.updates).toEqual({});
    expect(fetcher).toHaveBeenCalledTimes(2);
    const first = fetcher.mock.calls[0][1];
    const retry = fetcher.mock.calls[1][1];
    expect(retry.signal).toBe(first.signal);
    const firstMessages = JSON.parse(first.body).messages;
    expect(
      JSON.parse(retry.body).messages.slice(0, firstMessages.length),
    ).toEqual(firstMessages);
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(
      /PRIVATE-RESPONSE|qa-only-secret|创业项目/,
    );
  });

  it("repairs a wrong field type and only returns the corrected patch", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        completion({ reply: "理解了。", updates: { problem: ["账目混乱"] } }),
      )
      .mockResolvedValueOnce(
        completion({
          reply: "先从记账切入。",
          updates: { problem: "小店每天的收支难以理清" },
          suggestions: [],
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await generateOnboardingReply("project", input, initialProjectData))
        .updates,
    ).toEqual({ problem: "小店每天的收支难以理清" });
    expect(console.warn).toHaveBeenCalledWith(
      "[DeepSeek] output_rejected",
      expect.objectContaining({ reason: "schema" }),
    );
  });

  it("never applies even parseable output marked as truncated", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        completion(
          { reply: "不完整的回答", updates: { name: "不应使用" } },
          "length",
        ),
      )
      .mockResolvedValueOnce(
        completion({ reply: "你的项目主要想帮助谁？", updates: {} }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await generateOnboardingReply("project", input, initialProjectData))
        .updates,
    ).toEqual({});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("stops after two rejected results and records only diagnostic categories", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(async () => completion("PRIVATE-BROKEN-JSON"));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      generateOnboardingReply("project", input, initialProjectData),
    ).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("格式异常"),
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(
      "PRIVATE-BROKEN-JSON",
    );
  });

  it("accepts one harmless JSON code fence, with no invented updates", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          completion('```json\n{"reply":"可以先聊聊想帮助谁。"}\n```'),
        ),
    );
    expect(
      await generateOnboardingReply("project", input, initialProjectData),
    ).toEqual({ reply: "可以先聊聊想帮助谁。", updates: {}, suggestions: [] });
  });

  it("does not retry rate limiting or call the provider after cancellation", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      generateOnboardingReply("project", input, {}),
    ).rejects.toMatchObject({ status: 429 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const abort = new AbortController();
    abort.abort();
    await expect(
      generateOnboardingReply("project", input, {}, abort.signal),
    ).rejects.toMatchObject({ status: 504 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("carries choices through the actual route and counts a repair as one user request", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(completion("bad JSON"))
      .mockResolvedValueOnce(
        completion({
          reply: "可以按项目合作。",
          updates: { lookingFor: "按项目合作" },
          suggestions: ["我想做用户研究", "我想做需求梳理"],
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(
      new Request("http://localhost:3100/api/ai/chat", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3100",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "profile",
          messages: [
            {
              role: "model",
              text: "如何合作？",
              suggestions: ["全职加入", "按项目合作"],
            },
            { role: "user", text: "第二个" },
          ],
          currentData: initialProfileData,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      updates: { lookingFor: "按项目合作" },
      suggestions: ["我想做用户研究", "我想做需求梳理"],
    });
    expect(rateLimit).toHaveBeenCalledTimes(3);
    const upstream = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(JSON.parse(upstream.messages.at(-2).content).suggestions[1]).toBe(
      "按项目合作",
    );
  });
});
