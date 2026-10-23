import { json } from "@/lib/http";

// Retired OTP endpoint cannot create an account or session.
export async function POST() {
  return json({ error: "请使用用户名和密码登录。" }, 410);
}
