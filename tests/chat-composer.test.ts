import { describe, expect, it } from "vitest";
import { composeChatMessage } from "../src/lib/chat-composer";
import { buildOnboardingMessages } from "../src/lib/onboarding-ai";
import { chatSchema } from "../src/lib/validation";
import { initialProfileData } from "../src/types";

describe("multi-select chat turns", () => {
  it("keeps every selected meaning and the free-text qualification in a single model turn", () => {
    const text = composeChatMessage("  但只考虑远程，不接受全职  ", [
      "我想做用户访谈",
      "我也可以做界面设计",
    ]);
    const parsed = chatSchema.parse({
      mode: "profile",
      currentData: initialProfileData,
      messages: [
        {
          role: "model",
          text: "你希望怎样参与？",
          suggestions: ["我想做用户访谈", "我也可以做界面设计", "我想全职加入"],
        },
        { role: "user", text },
      ],
    });
    const messages = buildOnboardingMessages(
      parsed.mode,
      parsed.messages,
      parsed.currentData,
    );
    const current = JSON.parse(messages.at(-1)!.content).message;
    expect(current).toContain("我想做用户访谈");
    expect(current).toContain("我也可以做界面设计");
    expect(current).toContain("但只考虑远程，不接受全职");
    expect(current).not.toContain("我想全职加入");
    expect(messages.filter((message) => message.role === "user")).toHaveLength(
      1,
    );
  });
  it("supports selecting without typing, and typing without selecting", () => {
    expect(composeChatMessage("", ["按项目合作", "长期兼职"])).toContain(
      "- 按项目合作\n- 长期兼职",
    );
    expect(composeChatMessage("  自己的想法  ", [])).toBe("自己的想法");
    expect(composeChatMessage(" ", [])).toBe("");
  });
});
