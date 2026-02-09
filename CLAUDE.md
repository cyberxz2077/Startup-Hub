# SecondMe 集成项目 - Startup Hub

## 应用信息

- **App Name**: Startup Hub
- **Client ID**: 28454aca-bb08-****-****-************

## API 文档

开发时请参考官方文档:

| 文档 | 链接 |
|------|------|
| 快速入门 | https://develop-docs.second.me/zh/docs |
| OAuth2 认证 | https://develop-docs.second.me/zh/docs/authentication/oauth2 |
| API 参考 | https://develop-docs.second.me/zh/docs/api-reference/secondme |
| 错误码 | https://develop-docs.second.me/zh/docs/errors |

## 关键信息

- **API 基础 URL**: `https://app.mindos.com/gate/lab`
- **OAuth 授权 URL**: `https://go.second.me/oauth/`
- **Access Token 有效期**: 2 小时
- **Refresh Token 有效期**: 30 天

> 所有 API 端点配置请参考 `.secondme/state.json` 中的 `api` 和 `docs` 字段

## 已选模块

根据 Allowed Scopes 自动推断的功能模块:

| 模块 | 说明 | 依赖 Scope |
|------|------|-----------|
| **auth** | OAuth 认证 | `user.info` |
| **profile** | 用户信息展示 | `user.info.shades`, `user.info.softmemory` |
| **chat** | 聊天功能 | `chat` |
| **note** | 笔记功能 | `note.add` |

## 权限列表 (Scopes)

| 权限 | 说明 | 状态 |
|------|------|------|
| `user.info` | 用户基础信息 | ✅ 已授权 |
| `user.info.shades` | 用户兴趣标签 | ✅ 已授权 |
| `user.info.softmemory` | 用户软记忆 | ✅ 已授权 |
| `chat` | 聊天功能 | ✅ 已授权 |
| `note.add` | 添加笔记 | ✅ 已授权 |
| `voice` | 语音功能 | ✅ 已授权 (暂不生成代码) |

## 待补充信息

⚠️ 请在 `.secondme/state.json` 中补充以下信息:
- `config.client_secret`: SecondMe 应用的 Client Secret
- `config.database_url`: 数据库连接串 (PostgreSQL/MySQL/SQLite)
