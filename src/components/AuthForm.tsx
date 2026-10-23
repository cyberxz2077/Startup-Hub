"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { api, errorText } from "@/lib/client";
export type SessionUser = {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  avatar: string | null;
};

export function AuthForm({
  onSuccess,
}: {
  onSuccess: (user: SessionUser) => void;
}) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const registering = mode === "register";

  const submit = async () => {
    if (locked.current) return;
    setError("");
    if (registering && password !== confirmation) {
      setError("两次输入的密码不一致，请重新确认。");
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      const result = await api<{ user: SessionUser }>(`/api/auth/${mode}`, {
        username,
        password,
        ...(registering ? { inviteCode } : {}),
      });
      setPassword("");
      setConfirmation("");
      onSuccess(result.user);
    } catch (e) {
      setError(errorText(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="page-container py-12 md:py-24">
      <div className="mx-auto grid max-w-[920px] gap-12 md:grid-cols-2 md:gap-20 items-center">
        <div>
          <p className="eyebrow mb-6">A GOOD PLACE TO BEGIN</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            下一段合作，
            <br />
            从这里开始。
          </h1>
          <p className="mt-6 max-w-xs text-ink-light leading-7">
            带着想法来，带着能力来。和认真做事的人，找到一起开始的可能。
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm">
            <span className="h-2 w-2 rounded-full bg-accent-blue" /> 邀请制社区
            · 从一次连接开始
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="surface p-6 md:p-8 shadow-paper"
        >
          <div
            className="flex gap-2 mb-7 rounded-xl bg-paper p-1"
            aria-label="登录方式"
          >
            {(
              [
                ["register", "首次加入"],
                ["login", "已有账号"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={busy}
                aria-pressed={mode === value}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm transition-colors ${mode === value ? "bg-white text-ink shadow-sm" : "text-ink-light"}`}
                onClick={() => {
                  setMode(value);
                  setError("");
                  setPassword("");
                  setConfirmation("");
                  setShowPassword(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-accent-blue">
            <KeyRound size={23} />
          </div>
          <h2 className="text-2xl font-semibold">
            {registering ? "加入社区" : "欢迎回来"}
          </h2>
          <p className="mt-2 mb-7 text-sm text-ink-light leading-6">
            {registering
              ? "输入邀请码，设置你的用户名和密码。"
              : "使用注册时设置的用户名和密码登录。"}
          </p>
          <div className="space-y-5">
            {registering && (
              <label className="block text-sm font-medium">
                邀请码
                <input
                  className="field mt-2 font-mono"
                  name="inviteCode"
                  autoComplete="off"
                  required
                  maxLength={100}
                  placeholder="向邀请人获取"
                  value={inviteCode}
                  disabled={busy}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </label>
            )}
            <label className="block text-sm font-medium">
              用户名
              <input
                className="field mt-2"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                minLength={2}
                maxLength={32}
                placeholder="你的专属用户名"
                value={username}
                disabled={busy}
                onChange={(e) => setUsername(e.target.value)}
                aria-describedby="username-help"
              />
              <span
                id="username-help"
                className="block text-xs font-normal text-ink-light mt-2"
              >
                2–32 位中文、字母、数字、_ 或 -；英文不区分大小写。
              </span>
            </label>
            <div>
              <label
                htmlFor="account-password"
                className="block text-sm font-medium"
              >
                {registering ? "设置密码" : "密码"}
              </label>
              <div className="relative mt-2">
                <input
                  id="account-password"
                  className="field pr-12"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={
                    registering ? "new-password" : "current-password"
                  }
                  required
                  minLength={registering ? 12 : 1}
                  maxLength={128}
                  placeholder={
                    registering
                      ? "至少 12 位，可使用一句易记的话"
                      : "输入你的密码"
                  }
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-ink-light"
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            {registering && (
              <label className="block text-sm font-medium">
                确认密码
                <input
                  className="field mt-2"
                  type={showPassword ? "text" : "password"}
                  name="confirmation"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  placeholder="再输入一次"
                  value={confirmation}
                  disabled={busy}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </label>
            )}
          </div>
          {error && (
            <p role="alert" className="error-notice mt-5">
              {error}
            </p>
          )}
          <button className="btn-primary mt-7 w-full" disabled={busy}>
            {busy ? <Loader2 size={17} className="animate-spin" /> : null}
            {registering ? "创建账号并继续" : "登录并继续"}
            {!busy && <ArrowUpRight size={17} />}
          </button>
          <p className="mt-5 text-xs text-ink-light leading-5">
            {registering
              ? "邀请码仅用于加入社区；之后使用自己的用户名和密码登录。请妥善保存登录信息。"
              : "用户名与档案昵称独立，请使用注册时的用户名。"}
          </p>
        </form>
      </div>
    </section>
  );
}
