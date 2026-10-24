// Keep all selected meanings together in one user turn, including free text.
export function composeChatMessage(input: string, selected: string[]) {
  const text = input.trim();
  const choices = [
    ...new Set(selected.map((item) => item.trim()).filter(Boolean)),
  ];
  if (!choices.length) return text;
  const answer = `我选择以下方向：\n${choices.map((item) => `- ${item}`).join("\n")}`;
  return text ? `${answer}\n\n补充：${text}` : answer;
}
