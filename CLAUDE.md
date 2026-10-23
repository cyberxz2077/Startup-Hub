# Startup Hub

当前实现：Next.js 15 + React 19 + Prisma / PostgreSQL。自然语言整理与匹配使用服务端 DeepSeek API。

- 认证：服务端 `REGISTRATION_INVITE_CODE` 通用邀请码准入，首次设置用户名与至少 12 位密码；scrypt 密码哈希，7 天不透明会话。没有 SecondMe OAuth 入口；邮箱 OTP 路由已退役。
- 当前配置看 `.env.example`；本地密钥只填写被 Git 忽略的 `.env.local`。
- `README.md` 说明开发入口，`docs/重新上线.md` 说明部署选型、配置与迁移步骤，`docs/代码审核与验证.md` 记录本次修补与验证范围。
- `.secondme/` 和 `.agents/skills/secondme*` 是历史初始化资料，当前应用不读取它们。不要根据这些旧模板恢复登录或模型调用。
- `prisma/schema.prisma` 中保留的旧 OAuth 列仅用于无损迁移；不能用作认证依据。
- 本轮已获重新部署授权。现有 Supabase 项目 `gsvvxlqfkyeczoptonrd` 已恢复、快照并完成四个 Prisma 迁移；状态以部署文档与平台实况为准。历史账号关联仍需核实归属。构建不会自动迁移数据库。
