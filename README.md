# Startup Hub

让想法遇见共建的人。为创业者和建设者整理项目、个人能力与合作意向，通过 AI 辅助匹配和站内消息建立连接。

正式站点：[Startup Hub](https://startup-hub-woad.vercel.app/)。

当前版本 `0.2.0`：Next.js 15 / React 19 / Prisma 6 / PostgreSQL，通用邀请码注册、用户名与密码登录，服务端 DeepSeek API。Supabase 负责数据库，Vercel 负责网站运行。

## 开始开发

要求 Node.js 22 LTS（项目固定 22.x）和 PostgreSQL。首次安装：

```bash
npm ci
npm run dev
```

本次已准备 `.env.local`，填写时保留引号；没有该文件时从 `.env.example` 复制。AI 密钥填写 `DEEPSEEK_API_KEY`，默认模型 `deepseek-flash` 可通过 `DEEPSEEK_MODEL` 更换。不要将密钥写入 `NEXT_PUBLIC_*` 变量。数据库与 `REGISTRATION_INVITE_CODE` 也需要配置，详见 [重新上线](docs/重新上线.md)。当前注册无需邮箱发信服务。

首次加入输入邀请码并设置用户名、至少 12 位密码；后续使用自己的用户名和密码登录。邀请码通过服务端环境变量配置，当前由站点所有者指定为 `2077`。邀请码本身不能登录已有账号。未配置服务时，AI / 登录 / 数据接口明确报错；不自动插入演示数据。

## 常用命令

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

`npm test` 默认运行独立测试；数据库集成测试只在显式设置本地 `TEST_DATABASE_URL` 时运行。数据库名必须为 `startup_hub_test`，主机必须为 `localhost` 或 `127.0.0.1`，防止误触真实数据。

```bash
TEST_DATABASE_URL='postgresql://USER@127.0.0.1:PORT/startup_hub_test' npm test
```

先在独立测试数据库应用 `prisma/migrations`。集成测试使用每轮唯一的数据标识，不清空任何数据库。

## 项目结构

- `src/app/api/`：登录、数据、聊天、匹配和消息接口。
- `src/lib/`：会话、邀请码准入、数据库、输入校验、限流和 DeepSeek 客户端。
- `src/components/`：首页、工作室、项目详情、资源、工作台和收件箱。
- `prisma/`：数据结构和增量迁移，保留旧业务表与旧 OAuth 列。
- `scripts/`：显式执行的数据库迁移、邀请码生成；不会在构建中自动执行。
- `tests/`：服务契约、权限、邀请码并发和消息往返回归测试。

## 运行与上线

- [重新上线：平台选择、环境变量、密码账户与数据迁移](docs/重新上线.md)
- [代码审核与验证](docs/代码审核与验证.md)

应用不再调用 SecondMe 或 Gemini。`.secondme/` 及其旧技能文件仅作历史初始化资料保留，当前运行不读取它们。原 `.env` 保留，新的 `.env.local` 优先级更高。

密钥、Cookie、数据库连接串、模型原始响应及个人对话不写入应用日志。通过浏览器进入工作室后，未提交草稿只在当前标签页的 sessionStorage 暂存，按用户隔离；“保存草稿 / 发布”才写入账号数据库。
