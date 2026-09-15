# Easy CV v0.0.1 开发任务清单

> 配套文档：[`prd_v0.0.1.md`](./prd_v0.0.1.md)（以下简称 PRD）。
> 本清单把 PRD 拆成可以逐项执行、逐项验收的任务，并补充了 PRD 没写到的实现细节。

---

## 0. 执行者须知

### 0.1 基本规则

1. **先完整读一遍 PRD 和本清单，再动手。** 本清单是 PRD 的落地细化；如果发现两者冲突，或者某个细节两份文档都没写清楚、而不同理解会导致明显不同的实现，**停下来问用户**，不要自行猜测。
2. **范围只到 PRD 的 P0。** 第 11 阶段（P1）只有在用户明确要求时才执行。PRD 标为 P2 或「不做」的内容一律不做。
3. **依赖规则**：只能安装 [§2.2](#22-依赖清单) 列出的依赖。确实需要其他依赖时，停下来向用户说明理由并等待确认。
4. **按阶段顺序执行。** 每个阶段内的任务基本也按编号顺序执行。
5. **每完成一个任务，把本文件中对应的 `- [ ]` 改成 `- [x]`。** 遇到偏离本清单的情况，在该任务下方加一行 `> 偏离说明：……`。
6. **每个阶段结束时**：
   - 跑通该阶段的「阶段检查」；
   - 提交一次 git commit，格式为 `<type>(<scope>): <说明>`，例如 `feat(backend): 认证与初始化接口`。

### 0.2 代码约定

- TypeScript 严格模式，ESM；标识符、注释、提交信息用英文；**界面文案一律中文**，集中放在 `src/lib/strings.ts`。
- 注释只写「为什么」，不写「做了什么」。
- 前端组件优先使用 `src/components/ui/` 中已有的 shadcn 组件（基于 Base UI），不要手写同类组件，也不要引入其他 UI 库。
- **不要在日志里输出剪贴板内容、密码、邀请码、session token。**

### 0.3 HTTP 环境陷阱（重要）

应用要支持用 `http://<IP>:8000` 直接访问。在非 HTTPS 页面上，以下浏览器 API **不存在或会报错**，一律不能无条件调用：

| API | 替代方案 |
| --- | --- |
| `navigator.clipboard.*` | 复制：降级为 `document.execCommand('copy')`；读取剪贴板：隐藏按钮 |
| `crypto.randomUUID()` | 使用 `crypto.getRandomValues()`（非安全上下文也可用）或自增计数器 |
| `crypto.subtle` | 前端不需要，别用 |

判断方法：`window.isSecureContext`。

---

## 1. 仓库现状（开始前的基线）

- 根目录是前端工程，模板已就绪：Vite 8、React 19、TypeScript 6、Tailwind CSS v4、shadcn/ui（style `base-nova`，底层是 `@base-ui/react`）、lucide、react-router 8、axios、react-hook-form、zod 4、day.js。
- `cn` 工具函数来自 npm 包 `cn`（`src/lib/utils.ts` 重新导出），UI 组件直接 `import { cn } from "cn"`，保持这个用法。
- `src/components/ui/` 已有需要用到的组件：`button`、`input`、`input-group`、`textarea`、`dialog`、`drawer`、`alert-dialog`、`dropdown-menu`、`tooltip`、`toast`（导出了 `Toaster` 和 `toast` 管理器）、`switch`、`table`、`tabs`、`field`、`label`、`card`、`badge`、`kbd`、`empty`、`skeleton`、`spinner`、`separator`、`avatar`。
- `src/index.css` 已定义 `:root` 和 `.dark` 两套主题变量，暗色通过给 `<html>` 加 `dark` class 启用。
- `vite.config.ts` 已配置 `@` 别名，并把 `/api` 代理到 `http://127.0.0.1:8000`。
- `.gitignore` 已忽略 `node_modules`、`dist`、`.env`（保留 `.env.example`）、`/data`。
- `backend/` 目录为空。
- 仓库还没有任何提交。
- 本机 Node 版本为 v24。

---

## 2. 关键技术决定

以下决定是对 PRD 的细化，执行时直接遵守。

### 2.1 决定列表

| # | 决定 | 说明 |
| --- | --- | --- |
| D1 | 根目录仍是前端，`backend/` 是独立的 npm 包 | 不用 npm workspaces，不建 shared 包。前后端各自定义类型和 zod 校验，以 [§3 API 契约](#3-api-契约) 为唯一标准 |
| D2 | 后端用 `tsc` 编译到 `backend/dist`，生产环境运行 `node dist/server.js`；开发用 `tsx watch` | ESM（`"type": "module"`），`module: nodenext`，源码内相对导入写 `.js` 后缀 |
| D3 | 后端提供 `buildApp(options)` 工厂函数，`server.ts` 只负责读配置、启动检查、监听端口 | 测试用 `:memory:` 数据库调用 `buildApp`，再用 `app.inject()` 发请求 |
| D4 | 后端测试使用 Node 内置 `node:test` + `tsx --test`，不引入测试框架 | 前端不写自动化测试，靠 [§5 验收清单](#5-端到端验收清单) 手工验收 |
| D5 | Drizzle 使用 **最新稳定版（0.x，`latest` 标签）**，不要用 1.0 beta | 驱动 `better-sqlite3` |
| D6 | SQLite 连接建立后依次执行 `journal_mode = WAL`、`foreign_keys = ON`、`busy_timeout = 5000` | **`foreign_keys` 不开，级联删除就不生效** |
| D7 | 路径约定：数据目录 = `<仓库根>/data`，前端产物 = `<仓库根>/dist`，均由 `backend/` 目录向上一级推算 | 容器内目录结构与仓库保持一致（`/app/backend`、`/app/dist`、`/app/data`），同一套代码无需额外配置 |
| D8 | 环境变量：开发时 `config.ts` 用 `process.loadEnvFile()` 读取 `<仓库根>/.env`（文件不存在就跳过）；生产环境由 compose 的 `env_file` 注入 | 不引入 dotenv |
| D9 | 前端请求用已安装的 axios（封装一个实例）+ TanStack Query | |
| D10 | 表单用已安装的 react-hook-form，自己写一个十几行的 zod resolver | 不安装 `@hookform/resolvers` |
| D11 | 列表接口返回完整文本；前端折叠状态下只渲染前 3000 个字符 | 复制时直接用内存里的完整文本，避免异步取数导致 Safari 拒绝写剪贴板 |
| D12 | `clips.updated_at` **只在内容被编辑时更新**；置顶和重复粘贴都不改它 | 前端「已编辑」= `updatedAt > createdAt` |
| D13 | Session Cookie 名为 `ecv_session` | |
| D14 | helmet 关闭 `Strict-Transport-Security` 和 CSP 的 `upgrade-insecure-requests` | 否则通过 HTTP / IP 访问时资源加载会被强制升级为 HTTPS 而失败。HSTS 交给 Nginx |
| D15 | 主题防闪烁脚本放在 `public/theme-init.js`，在 `index.html` 的 `<head>` 中同步引用 | CSP 禁止内联脚本，不能写成 inline script |
| D16 | `GET /api/system/status` 额外返回 `maxTextBytes` | 前端据此在提交前检查文本大小 |
| D17 | 新增环境变量 `HOST_BIND`（默认 `0.0.0.0`），compose 端口写成 `${HOST_BIND}:${HOST_PORT}:8000` | 接入 Nginx 后改 `.env` 即可只绑定本机，不用改被 git 跟踪的 compose 文件，`git pull` 不会冲突 |
| D18 | 登录、注册、初始化、修改密码的限流参数做成 `buildApp` 的可选项 | 测试里默认放宽，只有专门的限流测试用真实参数 |

### 2.2 依赖清单

**后端 `backend/package.json`**

| 类型 | 包 |
| --- | --- |
| dependencies | `fastify`、`@fastify/cookie`、`@fastify/static`、`@fastify/rate-limit`、`@fastify/helmet`、`zod`、`fastify-type-provider-zod`、`drizzle-orm`、`better-sqlite3`、`@node-rs/argon2`、`nanoid` |
| devDependencies | `typescript`、`tsx`、`drizzle-kit`、`@types/node`、`@types/better-sqlite3` |

- `typescript` 和两个 `@types/*` 是已确认依赖的配套包，可以直接安装。
- `fastify-type-provider-zod` v7 把 `@fastify/swagger`、`openapi-types` 声明为 peer 依赖，npm 会自动装上，这是预期行为；**不需要注册 swagger**。

**前端（根目录 `package.json`）**

| 操作 | 包 |
| --- | --- |
| 新增 | `@tanstack/react-query` |
| 移除 | `date-fns`、`react-day-picker`、`recharts`、`embla-carousel-react`、`input-otp`、`react-resizable-panels`、`cmdk`（见 T0.1） |

### 2.3 目标目录结构

```text
easy-cv/
├── .env.example
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── index.html
├── public/
│   └── theme-init.js
├── src/                               # 前端
│   ├── main.tsx
│   ├── router.tsx
│   ├── lib/        api.ts  types.ts  validation.ts  form.ts  strings.ts
│   │               time.ts  clipboard.ts  platform.ts  rich-text.tsx  utils.ts
│   ├── hooks/      use-mobile.ts  use-now.ts  use-debounced-value.ts  use-paste-to-create.ts
│   ├── queries/    system.ts  auth.ts  clips.ts  admin.ts
│   ├── components/
│   │   ├── ui/                        # shadcn 组件（已有）
│   │   ├── app/    route-guard.tsx  app-header.tsx  user-menu.tsx  theme-provider.tsx
│   │   │           auth-layout.tsx  password-input.tsx  logo.tsx  full-page-spinner.tsx
│   │   ├── clips/  clip-list.tsx  clip-card.tsx  clip-content.tsx  clip-editor.tsx
│   │   │           pending-clips.tsx  new-clip-fab.tsx  search-box.tsx
│   │   └── admin/  users-table.tsx  reset-password-dialog.tsx  delete-user-dialog.tsx
│   │               registration-settings.tsx
│   └── pages/      setup.tsx  login.tsx  register.tsx  home.tsx  settings.tsx  admin.tsx
├── backend/
│   ├── package.json
│   ├── tsconfig.json                  # 类型检查：src + test + drizzle.config.ts
│   ├── tsconfig.build.json            # 构建：只含 src，输出 dist
│   ├── drizzle.config.ts
│   ├── drizzle/                       # drizzle-kit 生成的迁移（提交到 git）
│   ├── src/
│   │   ├── server.ts                  # 入口
│   │   ├── app.ts                     # buildApp()
│   │   ├── config.ts
│   │   ├── cli.ts
│   │   ├── db/         schema.ts  client.ts
│   │   ├── lib/        errors.ts  crypto.ts  password.ts  codes.ts  validation.ts
│   │   ├── services/   settings.ts  sessions.ts  users.ts  clips.ts
│   │   ├── plugins/    auth.ts  origin-check.ts  web.ts
│   │   ├── routes/     system.ts  auth.ts  clips.ts  admin.ts
│   │   └── jobs/       cleanup.ts
│   └── test/           helpers.ts  system.test.ts  auth.test.ts  clips.test.ts  admin.test.ts
└── data/                              # 运行时生成，git 忽略
```

目录结构是建议，可以微调；如果调整，在对应任务下写偏离说明。

---

## 3. API 契约

前后端都以本节为准。

### 3.1 通用约定

- 所有接口以 `/api` 开头，请求和响应都是 JSON，认证靠 Cookie `ecv_session`。
- 时间字段均为 UTC 毫秒时间戳（`number`）。
- 成功时直接返回数据对象；`204` 没有响应体。
- 失败时统一返回：

```json
{ "error": { "code": "INVITE_CODE_INVALID", "message": "邀请码无效" } }
```

### 3.2 错误码

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 请求参数不符合校验规则 |
| 400 | `EMPTY_CONTENT` | 文本为空或只有空白字符 |
| 400 | `WRONG_PASSWORD` | 修改密码时当前密码错误 |
| 401 | `UNAUTHORIZED` | 未登录、会话过期、账户已被停用导致会话失效 |
| 401 | `INVALID_CREDENTIALS` | 用户名或密码错误 |
| 403 | `FORBIDDEN` | 普通用户访问管理接口 |
| 403 | `ORIGIN_MISMATCH` | 写操作的 `Origin` 与 `Host` 不一致 |
| 403 | `ACCOUNT_DISABLED` | 密码正确但账户被停用 |
| 403 | `INIT_CODE_INVALID` | 初始化码错误 |
| 403 | `REGISTRATION_CLOSED` | 未开放注册（包括系统尚未初始化） |
| 403 | `INVITE_CODE_INVALID` | 邀请码错误 |
| 403 | `CANNOT_MODIFY_ADMIN` | 对管理员账户执行停用、重置密码、删除 |
| 404 | `NOT_FOUND` | 资源不存在，或不属于当前用户 |
| 409 | `ALREADY_INITIALIZED` | 系统已初始化后再次调用 setup |
| 409 | `USERNAME_TAKEN` | 用户名已存在（不区分大小写） |
| 413 | `TEXT_TOO_LARGE` | 文本超过上限 |
| 429 | `RATE_LIMITED` | 触发限流 |
| 500 | `INTERNAL_ERROR` | 未预期的错误（不向前端暴露细节） |

`message` 字段是给人看的中文说明；前端优先按 `code` 映射自己的文案（见 T5.4），映射不到时再显示 `message`。

### 3.3 数据类型

```ts
type Role = "admin" | "user";
type UserStatus = "active" | "disabled";

type User = { id: string; username: string; role: Role };

type Clip = {
  id: string;
  content: string;
  pinnedAt: number | null;   // 非 null 即已置顶
  createdAt: number;
  updatedAt: number;         // 仅内容编辑时变化；updatedAt > createdAt 表示「已编辑」
  activeAt: number;          // 「最近」分组的排序依据
};

type AdminUser = {
  id: string;
  username: string;
  role: Role;
  status: UserStatus;
  clipCount: number;         // 不含软删除的条目
  createdAt: number;
  lastLoginAt: number | null;
};

type RegistrationSettings = {
  registrationEnabled: boolean;
  inviteCode: string | null; // 规范化后的形式，见 §3.4
};
```

### 3.4 校验规则

| 字段 | 规则 |
| --- | --- |
| `username` | `/^[A-Za-z0-9_-]{3,32}$/`；按输入原样存储，唯一性和登录查找都不区分大小写 |
| `password` | 字符串，长度 8–128 |
| `content` | 字符串；UTF-8 字节数 ≤ `MAX_TEXT_SIZE_KB × 1024`，否则 `413 TEXT_TOO_LARGE`；必须含非空白字符（`/\S/`），否则 `400 EMPTY_CONTENT`；**存储时不做 trim** |
| 邀请码 / 初始化码的输入 | 先规范化：去掉所有空白和 `-`，再转大写 |
| 管理员手动设置的邀请码 | 规范化后须匹配 `/^[A-Z0-9]{6,32}$/` |
| 搜索词 `q` | trim 后长度 1–200；trim 后为空视为没有搜索 |

- 邀请码在数据库里存规范化后的形式；前端展示时每 4 位插一个 `-`（例如 `K7XM-4QPA`）。
- 自动生成的邀请码：8 位，字符集 `ABCDEFGHJKMNPQRSTUVWXYZ23456789`（去掉了 0/O、1/I/L），用 `crypto.randomInt` 逐位生成。
- 比较邀请码或初始化码时：两边先规范化，再分别算 SHA-256，最后用 `crypto.timingSafeEqual` 比较（这样长度不同也能做常量时间比较）。

### 3.5 接口明细

权限列：「公开」= 无需登录；「用户」= 已登录；「管理员」= 已登录且 `role = admin`。未登录访问需要登录的接口返回 `401 UNAUTHORIZED`，普通用户访问管理接口返回 `403 FORBIDDEN`。

#### 系统

| 接口 | 权限 | 请求 | 成功响应 | 可能的错误 |
| --- | --- | --- | --- | --- |
| `GET /api/health` | 公开 | — | `200 { ok: true }` | — |
| `GET /api/system/status` | 公开 | — | `200 { initialized, registrationOpen, maxTextBytes }` | — |

- `registrationOpen = initialized && registration_enabled && invite_code 非空`。

#### 初始化与认证

| 接口 | 权限 | 请求体 | 成功响应 | 可能的错误 |
| --- | --- | --- | --- | --- |
| `POST /api/setup` | 公开 | `{ username, password, initCode }` | `201 { user }` + 设置 Cookie | 400、`403 INIT_CODE_INVALID`、`409 ALREADY_INITIALIZED`、429 |
| `POST /api/auth/register` | 公开 | `{ username, password, inviteCode }` | `201 { user }` + 设置 Cookie | 400、`403 REGISTRATION_CLOSED`、`403 INVITE_CODE_INVALID`、`409 USERNAME_TAKEN`、429 |
| `POST /api/auth/login` | 公开 | `{ username, password }` | `200 { user }` + 设置 Cookie | 400、`401 INVALID_CREDENTIALS`、`403 ACCOUNT_DISABLED`、429 |
| `POST /api/auth/logout` | 公开 | — | `204` + 清除 Cookie | —（未登录也返回 204） |
| `GET /api/auth/me` | 用户 | — | `200 { user }` | 401 |
| `PUT /api/auth/password` | 用户 | `{ currentPassword, newPassword }` | `204` | 400、`400 WRONG_PASSWORD`、429 |

- setup：先判断是否已初始化（是则 409），再校验初始化码（错则 403）。
- register：系统未初始化时返回 `403 REGISTRATION_CLOSED`。
- login：用户不存在时也要跑一次 argon2 校验（对一个固定的假哈希），让响应时间和「密码错误」一致；只有密码正确且账户被停用时才返回 `ACCOUNT_DISABLED`。
- setup、register、login 成功后都更新 `last_login_at`。
- 修改密码成功后，删除该用户**除当前会话以外**的所有会话。

#### 剪贴板

| 接口 | 权限 | 请求 | 成功响应 | 可能的错误 |
| --- | --- | --- | --- | --- |
| `GET /api/clips?pinned=true` | 用户 | — | `200 { items: Clip[] }` | 401 |
| `GET /api/clips?cursor=&q=&limit=` | 用户 | — | `200 { items: Clip[], nextCursor: string \| null }` | 400、401 |
| `POST /api/clips` | 用户 | `{ content }` | 新建 `201 { clip, deduplicated: false }`；命中去重 `200 { clip, deduplicated: true }` | `400 EMPTY_CONTENT`、`413 TEXT_TOO_LARGE`、401 |
| `PATCH /api/clips/:id` | 用户 | `{ content?, pinned? }`，至少一项 | `200 { clip }` | 400、413、401、404 |
| `DELETE /api/clips/:id` | 用户 | — | `204` | 401、404 |
| `POST /api/clips/:id/restore` | 用户 | — | `200 { clip }` | 401、404 |

列表规则：

- 所有查询都只看当前用户、`deleted_at IS NULL` 的条目。
- `pinned=true`：返回全部置顶条目，按 `pinned_at DESC` 排序，不分页。忽略其他参数。
- 不带 `q`：只返回**未置顶**条目，按 `active_at DESC, id DESC` 排序。
- 带 `q`：返回置顶和未置顶的全部匹配条目，同样按 `active_at DESC, id DESC` 排序。匹配方式为 `content LIKE '%' || q || '%' ESCAPE '\'`，`q` 中的 `\`、`%`、`_` 要先转义。
- `limit` 默认 30，允许 1–100。
- 游标 `cursor` = `base64url(JSON.stringify([activeAt, id]))`；下一页条件为 `active_at < ? OR (active_at = ? AND id < ?)`。没有更多数据时 `nextCursor` 为 `null`。非法游标返回 400。

创建规则：

- 计算 `content` 的 SHA-256，查找当前用户未删除的、`content_hash` 相同的条目：
  - 找到且未置顶 → 把它的 `active_at` 更新为当前时间，返回 `200 { clip, deduplicated: true }`；
  - 找到且已置顶 → 不修改任何字段，返回 `200 { clip, deduplicated: true }`；
  - 没找到 → 新建，`created_at = updated_at = active_at = now`，返回 `201`。

修改规则：

- `content`：校验规则同创建；更新 `content`、`content_hash`、`updated_at`；**不改** `active_at`；编辑时不做去重。
- `pinned: true`：设置 `pinned_at = now`（已经置顶则不变）。`pinned: false`：设置 `pinned_at = null`，同时 `active_at = now`，让取消置顶的条目回到「最近」的顶部。
- 置顶操作不修改 `updated_at`。

删除与撤销：

- `DELETE` 设置 `deleted_at = now`。
- `restore` 只对已软删除、尚未被清理的条目有效，把 `deleted_at` 置为 `null`；条目不存在或未删除都返回 404。

#### 管理

| 接口 | 权限 | 请求体 | 成功响应 | 可能的错误 |
| --- | --- | --- | --- | --- |
| `GET /api/admin/users` | 管理员 | — | `200 { items: AdminUser[] }`（管理员排第一，其余按注册时间升序） | 401、403 |
| `PATCH /api/admin/users/:id` | 管理员 | `{ status: "active" \| "disabled" }` | `200 { user: AdminUser }` | 400、`403 CANNOT_MODIFY_ADMIN`、404 |
| `PUT /api/admin/users/:id/password` | 管理员 | `{ password }` | `204` | 400、`403 CANNOT_MODIFY_ADMIN`、404 |
| `DELETE /api/admin/users/:id` | 管理员 | — | `204` | `403 CANNOT_MODIFY_ADMIN`、404 |
| `GET /api/admin/settings` | 管理员 | — | `200 RegistrationSettings` | 401、403 |
| `PATCH /api/admin/settings` | 管理员 | `{ registrationEnabled?, inviteCode? }`，至少一项 | `200 RegistrationSettings` | 400 |
| `POST /api/admin/settings/invite-code` | 管理员 | — | `200 RegistrationSettings`（新邀请码） | 401、403 |

- 停用：设置 `status = disabled`，并删除该用户的所有会话。
- 重置密码：更新密码哈希，删除该用户的所有会话。管理员修改自己的密码走 `/api/auth/password`。
- 删除：在事务中删除用户（依赖外键级联删除会话和条目）。
- 打开注册（`registrationEnabled: true`）时，如果还没有邀请码且本次请求也没带 `inviteCode`，自动生成一个。

### 3.6 横切规则

| 规则 | 说明 |
| --- | --- |
| 会话 | 登录成功生成 32 字节随机 token（base64url），数据库存 `sha256(token)`；Cookie 属性：`HttpOnly`、`SameSite=Lax`、`Path=/`、`Max-Age = SESSION_TTL_DAYS 天`、`Secure = (request.protocol === 'https')` |
| 滑动续期 | 认证通过时，如果距 `last_seen_at` 超过 1 小时，就更新 `last_seen_at` 和 `expires_at = now + TTL`，并重新下发 Cookie。避免每个请求都写数据库 |
| 会话校验 | 会话不存在或已过期 → 401（并删除过期会话）；用户状态为 `disabled` → 401 |
| Origin 校验 | 对 `POST`、`PUT`、`PATCH`、`DELETE` 请求：带了 `Origin` 头时，`new URL(origin).host` 必须等于请求的 `Host`（开启 `trustProxy` 时 Fastify 的 `request.host` 会取 `X-Forwarded-Host`），否则 `403 ORIGIN_MISMATCH`；`Origin: null` 视为不匹配；没带 `Origin`（如 curl）则放行 |
| 限流 | `@fastify/rate-limit` 注册时 `global: false`；setup、register、login、修改密码四个接口各自配置 15 分钟 10 次、按 IP 计数；超限返回 `429 RATE_LIMITED` |
| 请求体大小 | Fastify `bodyLimit` 设为 `maxTextBytes × 2 + 16 KB`（JSON 转义会使体积变大），真正的大小限制由 `content` 字节数校验负责 |
| 未知 `/api` 路径 | 返回 `404 NOT_FOUND`（JSON），不能回退到前端页面 |

---

## 4. 任务清单

### 阶段 0：仓库准备

- [x] **T0.1 清理前端模板中无关的依赖和组件**
  - 删除 `src/components/ui/` 下的 `calendar.tsx`、`chart.tsx`、`carousel.tsx`、`command.tsx`、`input-otp.tsx`、`resizable.tsx`。
  - 卸载 `date-fns`、`react-day-picker`、`recharts`、`embla-carousel-react`、`input-otp`、`react-resizable-panels`、`cmdk`。
  - 删除前先 `grep` 确认没有其他组件引用它们（例如 `combobox.tsx` 是否依赖 `cmdk`）。如果有引用且该组件本项目用得到，保留相关依赖，并写偏离说明。
  - 验收：`npm run build`、`npm run lint` 都通过。

- [x] **T0.2 调整根目录 `package.json`**
  - `name` 改为 `easy-cv`；增加 `"engines": { "node": ">=24" }`。
  - 增加脚本：`"dev:backend": "npm --prefix backend run dev"`、`"test:backend": "npm --prefix backend test"`。

- [x] **T0.3 新建 `.env.example`**
  - 包含 PRD §7.2 的全部变量（其中 `HOST_BIND` 见 D17）。每个变量上方用注释写明用途、默认值、是否必填。
  - `ADMIN_INVITE_CODE` 给一个明显的占位值（例如 `change-me-to-a-long-random-string`），并注释「首次启动前必须修改」。

- [x] **T0.4 新建 `.dockerignore`**
  - 至少包含：`.git`、`node_modules`、`backend/node_modules`、`dist`、`backend/dist`、`data`、`.env`、`docs`。

**阶段检查**：前端能正常 `npm run dev`、`npm run build`、`npm run lint`。

---

### 阶段 1：后端基础

- [x] **T1.1 初始化 `backend/` 工程**
  - `package.json`：`"type": "module"`、`"private": true`、`"engines": { "node": ">=24" }`。
  - 脚本：

    | 脚本 | 命令 |
    | --- | --- |
    | `dev` | `tsx watch src/server.ts` |
    | `build` | `tsc -p tsconfig.build.json` |
    | `start` | `node dist/server.js` |
    | `typecheck` | `tsc -p tsconfig.json --noEmit` |
    | `test` | `tsx --test "test/**/*.test.ts"` |
    | `db:generate` | `drizzle-kit generate` |

  - `tsconfig.json`：`target es2023`、`module nodenext`、`strict`、`verbatimModuleSyntax`、`noUnusedLocals`、`noUnusedParameters`、`skipLibCheck`；include `src`、`test`、`drizzle.config.ts`。
  - `tsconfig.build.json`：继承上面的配置，`rootDir: src`、`outDir: dist`，只 include `src`。
  - 按 §2.2 安装依赖。

- [x] **T1.2 配置模块 `src/config.ts`**
  - 非生产环境下，如果 `<仓库根>/.env` 存在就调用 `process.loadEnvFile()` 读取。
  - 用 zod 解析环境变量，缺失时使用默认值：

    | 变量 | 类型 | 默认值 |
    | --- | --- | --- |
    | `ADMIN_INVITE_CODE` | string，可选 | — |
    | `PORT` | int | 8000 |
    | `MAX_TEXT_SIZE_KB` | int，≥ 1 | 1024 |
    | `SESSION_TTL_DAYS` | int，≥ 1 | 30 |
    | `TRUST_PROXY` | boolean（接受 `true`/`false`/`1`/`0`） | false |
    | `NODE_ENV` | string | development |

  - 导出 `Config` 类型，其中还包含计算出来的 `dataDir`、`dbPath`（`<dataDir>/easy-cv.db`）、`webDir`、`migrationsDir`、`maxTextBytes`、`sessionTtlMs`（路径推算规则见 D7）。
  - 解析失败时抛出带有变量名的清晰错误。

- [x] **T1.3 数据库**
  - `src/db/schema.ts`：按 PRD §6.4 定义 `users`、`sessions`、`settings`、`clips` 四张表。
    - 所有时间字段为 `integer`（毫秒），ID 为 `text`。
    - 外键 `ON DELETE CASCADE`。
    - 索引：`clips(user_id, deleted_at, active_at)`、`clips(user_id, content_hash)`、`sessions(user_id)`。
    - 用户名大小写不敏感的唯一约束：用 `lower(username)` 表达式唯一索引，或者在迁移 SQL 里用 `COLLATE NOCASE`，两种都可以，但必须有测试覆盖（见 T2.7）。
  - `src/db/client.ts`：`createDb(path)` 打开 better-sqlite3 连接，执行 D6 中的 PRAGMA，返回 drizzle 实例和原始连接（关闭时要用）；`path` 为 `:memory:` 时跳过 WAL。
  - `drizzle.config.ts`：dialect `sqlite`，schema 指向 `src/db/schema.ts`，out 为 `drizzle/`。
  - 运行 `npm run db:generate` 生成首个迁移并提交。
  - 提供 `runMigrations(db, migrationsDir)`，使用 `drizzle-orm/better-sqlite3/migrator` 的 `migrate`。
  - 如果数据目录不存在就自动创建；创建或写入失败时抛出清晰的错误：「数据目录不可写：<路径>。如果使用 Docker，请执行 `sudo chown -R 1000:1000 ./data`」。

- [x] **T1.4 应用工厂 `src/app.ts`**
  - `buildApp({ config, db, rateLimit? })` 返回 Fastify 实例：
    - Fastify 选项：`trustProxy: config.trustProxy`、`bodyLimit`（见 §3.6）、`logger`（生产环境 `info`，测试时关闭）。
    - 注册 `fastify-type-provider-zod` 的 `validatorCompiler` 和 `serializerCompiler`。
    - 注册 `@fastify/helmet`，按 D14 关闭 HSTS 和 `upgrade-insecure-requests`。
    - 注册 `@fastify/cookie`、`@fastify/rate-limit`（`global: false`）。
    - 注册 origin 校验插件（`src/plugins/origin-check.ts`）。
    - 所有路由挂在 `/api` 前缀下。
    - 注册前端静态资源插件 `src/plugins/web.ts`（T1.5）。
  - `src/lib/errors.ts`：定义 `AppError(status, code, message)`；统一的 `setErrorHandler`：
    - `AppError` → 按 §3.1 的格式返回；
    - zod 校验错误 → `400 VALIDATION_ERROR`，message 为「请求参数不正确」；
    - rate-limit 错误 → `429 RATE_LIMITED`，message「操作太频繁，请稍后再试」；
    - 其他错误 → 记录日志，返回 `500 INTERNAL_ERROR`。

- [x] **T1.5 前端静态资源托管 `src/plugins/web.ts`**
  - `config.webDir` 不存在时（开发环境）跳过注册静态资源。
  - 存在时用 `@fastify/static` 托管，`/assets/*` 设置 `Cache-Control: public, max-age=31536000, immutable`，`index.html` 设置 `Cache-Control: no-cache`。
  - `setNotFoundHandler`：`/api` 开头的路径返回 `404 NOT_FOUND`（JSON）；其他 `GET` 请求返回 `index.html`（SPA 回退）；其他情况返回 404。

- [x] **T1.6 入口 `src/server.ts`**
  - 顺序：加载配置 → 打开数据库 → 执行迁移 → 启动检查（T2.6）→ `buildApp` → 启动定时清理任务（T3.3）→ 监听 `0.0.0.0:PORT`。
  - 收到 `SIGINT` 或 `SIGTERM` 时：停止定时任务、`app.close()`、关闭数据库，然后退出。

- [x] **T1.7 测试脚手架 `test/helpers.ts`**
  - `createTestApp(overrides?)`：使用 `:memory:` 数据库并执行迁移，限流默认放宽（D18），返回 `app`。
  - 常用辅助函数：`setupAdmin(app)`、`registerUser(app, …)`、`login(app, …)` 返回 Cookie 字符串、`authed(app, cookie)` 包装 `inject`。
  - 写一个 `system.test.ts`，验证 `GET /api/health` 返回 200。

**阶段检查**：`npm --prefix backend run typecheck`、`npm --prefix backend test`、`npm --prefix backend run build` 全部通过；`npm run dev:backend` 能启动，`curl http://127.0.0.1:8000/api/health` 返回 `{"ok":true}`，`curl http://127.0.0.1:8000/api/nope` 返回 JSON 404。

---

### 阶段 2：认证与系统初始化

- [x] **T2.1 基础工具**
  - `lib/crypto.ts`：`randomToken()`（32 字节 base64url）、`sha256(text)`（hex）、`safeEqual(a, b)`（§3.4 的比较方式）。
  - `lib/password.ts`：基于 `@node-rs/argon2` 的 `hashPassword`、`verifyPassword`（默认参数，argon2id），以及模块加载时生成一次的假哈希 `DUMMY_HASH`，用于用户不存在时的等时校验。
  - `lib/codes.ts`：`normalizeCode(input)`、`generateInviteCode()`（§3.4）。
  - `lib/validation.ts`：§3.4 中各字段的 zod schema。

- [x] **T2.2 设置项服务 `services/settings.ts`**
  - `getRegistrationSettings(db)`、`updateRegistrationSettings(db, patch)`、`regenerateInviteCode(db)`。
  - 键为 `registration_enabled`（值为 `"true"`/`"false"`，默认 false）和 `invite_code`（不存在表示还没有邀请码）。

- [x] **T2.3 会话服务 `services/sessions.ts`**
  - `createSession(db, userId, userAgent)` 返回 token；`findValidSession(db, token)`；`touchSession`（滑动续期）；`deleteSession`；`deleteUserSessions(db, userId, exceptSessionId?)`；`deleteExpiredSessions(db, now)`。
  - `setSessionCookie(reply, request, token, config)` 和 `clearSessionCookie(reply)`，Cookie 属性见 §3.6。

- [x] **T2.4 认证插件 `plugins/auth.ts`**
  - 给 `request` 增加 `user`（`User & { status }`）和 `sessionId`。
  - 提供两个 `preHandler`：`requireUser`、`requireAdmin`，行为见 §3.5 开头和 §3.6。

- [x] **T2.5 系统与认证路由**
  - `routes/system.ts`：`GET /health`、`GET /system/status`。
  - `routes/auth.ts`：`POST /setup`、`POST /auth/register`、`POST /auth/login`、`POST /auth/logout`、`GET /auth/me`、`PUT /auth/password`。
  - setup 的并发安全：**先在事务外完成 argon2 哈希**（异步），再在 better-sqlite3 的同步事务里重新检查「用户表为空」并插入管理员。多个请求同时到达时只有一个成功，其余返回 `409 ALREADY_INITIALIZED`。
  - register 同样先哈希，再插入；插入时因唯一索引冲突要转换成 `409 USERNAME_TAKEN`。

- [x] **T2.6 启动检查（在 `server.ts` 中）**
  - 用户表为空，且 `ADMIN_INVITE_CODE` 未设置或长度 < 8 → 输出错误日志「系统尚未初始化，请在 .env 中设置 ADMIN_INVITE_CODE（至少 8 位）后重启」，以退出码 1 退出。
  - 用户表非空，且设置了 `ADMIN_INVITE_CODE` → 输出 info 日志「系统已初始化，ADMIN_INVITE_CODE 已失效，可以从 .env 中删除」。

- [x] **T2.7 测试 `test/auth.test.ts`**，至少覆盖：
  - [ ] 未初始化时 `status.initialized = false`；`register` 返回 `403 REGISTRATION_CLOSED`。
  - [ ] setup 初始化码错误 → 403；正确 → 201，返回 `role: admin`，并设置 Cookie。
  - [ ] 初始化码校验忽略大小写、空格和 `-`。
  - [ ] 再次 setup → 409。
  - [ ] 并发发起 5 个 setup 请求，恰好 1 个成功。
  - [ ] 注册：未开放 → 403；邀请码错误 → 403；邀请码写成小写并加空格也能通过；用户名 `Alice` 已存在时注册 `alice` → 409。
  - [ ] 登录：用户名不存在和密码错误返回同样的 401；用户名大小写不同也能登录；被停用的账户密码正确 → 403，密码错误 → 401。
  - [ ] `me`：带 Cookie → 200；不带 → 401；退出登录后原 Cookie → 401。
  - [ ] 修改密码：当前密码错误 → 400 `WRONG_PASSWORD`；成功后当前会话仍然有效、另一个会话失效、新密码可以登录。
  - [ ] Cookie 包含 `HttpOnly`、`SameSite=Lax`；普通 HTTP 请求下**没有** `Secure`；开启 `trustProxy` 且带 `X-Forwarded-Proto: https` 时**有** `Secure`。
  - [ ] Origin 校验：写请求带不匹配的 `Origin` → 403 `ORIGIN_MISMATCH`；带匹配的 `Origin` 或不带 `Origin` → 正常。
  - [ ] 限流：用真实限流参数，同一 IP 第 11 次登录请求 → 429。

**阶段检查**：typecheck、test、build 全部通过。手动验证：不设置 `ADMIN_INVITE_CODE` 时启动服务会失败并输出清晰提示。

---

### 阶段 3：剪贴板接口

- [x] **T3.1 条目服务与路由**（`services/clips.ts`、`routes/clips.ts`）
  - 严格按 §3.5「剪贴板」部分实现，包括去重、排序、游标、搜索转义、置顶和取消置顶对各时间字段的影响。
  - 所有查询都以 `user_id = request.user.id AND deleted_at IS NULL` 为前提；访问别人的条目返回 404（不要返回 403，避免暴露条目是否存在）。
  - 字节数用 `Buffer.byteLength(content, 'utf8')` 计算。

- [x] **T3.2 数据库行到 API 对象的转换**
  - 在一个地方统一实现 snake_case 行 → §3.3 中 `Clip` 结构的转换，不要把 `user_id`、`content_hash`、`deleted_at` 返回给前端。

- [x] **T3.3 定时清理 `jobs/cleanup.ts`**
  - `runCleanup(db, now)`：物理删除 `deleted_at < now - 24h` 的条目，删除 `expires_at < now` 的会话；返回删除数量。
  - `startCleanupJob(db, logger)`：启动时立即执行一次，之后每小时执行一次（`setInterval(...).unref()`）；返回停止函数。清理数量大于 0 时输出一条 info 日志。
  - 定时器只在 `server.ts` 中启动，`buildApp` 不负责，这样测试可以自己控制调用时机。

- [x] **T3.4 测试 `test/clips.test.ts`**，至少覆盖：
  - [ ] 创建：正常 → 201；空字符串和纯空白（空格、换行、制表符）→ 400 `EMPTY_CONTENT`；首尾空格原样保留；超过上限（在测试里把上限配小）→ 413。
  - [ ] 去重：相同内容第二次创建 → 200、`deduplicated: true`、ID 相同、`activeAt` 变大；与置顶条目内容相同 → `activeAt` 不变；与已软删除的条目内容相同 → 正常新建。
  - [ ] 列表：创建 35 条，第一页 30 条、带 `nextCursor`，第二页 5 条、`nextCursor = null`，没有重复和遗漏；置顶条目不出现在默认列表中；`pinned=true` 按置顶时间倒序返回。
  - [ ] 搜索：不区分大小写；结果同时包含置顶和未置顶条目；搜索 `%` 和 `_` 只匹配这两个字符本身；中文可以搜索。
  - [ ] 编辑：`updatedAt` 变大、`activeAt` 不变；编辑成与另一条相同的内容也允许。
  - [ ] 置顶：置顶不改 `updatedAt`；取消置顶后 `activeAt` 更新，条目出现在默认列表第一位。
  - [ ] 删除与撤销：删除后不出现在列表中；restore 后恢复；对未删除的条目 restore → 404；执行 `runCleanup(now + 25h)` 后 restore → 404。
  - [ ] 隔离：用户 B 读取、修改、删除、撤销用户 A 的条目都返回 404；B 的列表和搜索看不到 A 的内容。
  - [ ] 清理：`runCleanup` 只删除超过 24 小时的软删除条目和过期会话。

**阶段检查**：typecheck、test、build 全部通过。

---

### 阶段 4：管理接口与 CLI

- [x] **T4.1 用户管理路由**（`routes/admin.ts`、`services/users.ts`）
  - 按 §3.5「管理」部分实现 `GET/PATCH/PUT/DELETE /api/admin/users…`。
  - `clipCount` 用子查询统计未软删除的条目。

- [x] **T4.2 注册设置路由**
  - `GET/PATCH /api/admin/settings`、`POST /api/admin/settings/invite-code`。
  - 打开注册时自动生成邀请码的逻辑放在 `services/settings.ts` 里，不要写在路由中。

- [x] **T4.3 运维 CLI `src/cli.ts`**
  - 用法：`node dist/cli.js reset-password <username>`（开发时可用 `tsx src/cli.ts …`）。
  - 行为：按用户名查找用户（不区分大小写）→ 生成 16 位随机密码（字母和数字）→ 更新哈希 → 删除该用户所有会话 → 在终端打印新密码。
  - 用户不存在、参数缺失、命令未知时：打印用法说明，以退出码 1 退出。
  - 复用 `config.ts` 和 `db/client.ts`，执行前先跑迁移。

- [x] **T4.4 测试 `test/admin.test.ts`**，至少覆盖：
  - [ ] 普通用户访问任何 `/api/admin/*` → 403；未登录 → 401。
  - [ ] 用户列表：管理员排第一；`clipCount` 不包含软删除的条目。
  - [ ] 停用：用户已有的 Cookie 立刻变为 401；密码正确时登录返回 403；重新启用后可以登录。
  - [ ] 重置密码：旧会话失效，新密码可以登录，旧密码不行。
  - [ ] 删除：用户、会话、条目全部被删除（直接查数据库确认级联生效）。
  - [ ] 对管理员账户执行停用、重置密码、删除 → 403 `CANNOT_MODIFY_ADMIN`。
  - [ ] 注册设置：初始状态 `registrationEnabled: false`、`inviteCode: null`；打开注册后自动生成 8 位邀请码，且只包含规定的字符集；`status.registrationOpen` 随之变为 true。
  - [ ] 手动设置 `"abcd-1234"` → 存储为 `ABCD1234`；设置 `"ab"` 或 `"abc!@#"` → 400。
  - [ ] 重新生成邀请码后，旧邀请码注册失败，新邀请码注册成功。
  - [ ] 关闭注册后邀请码保留，但注册返回 `REGISTRATION_CLOSED`。

**阶段检查**：typecheck、test、build 全部通过；手动运行一次 CLI 重置密码并用新密码登录成功。

---

### 阶段 5：前端基础设施

- [x] **T5.1 安装 TanStack Query，并改造 `src/main.tsx`**
  - 按 T0.1 清理后的状态，安装 `@tanstack/react-query`。
  - `QueryClient` 默认配置：`refetchOnWindowFocus: true`（即 PRD 的「页面重新可见时自动刷新」）；`retry` 只对网络错误和 5xx 重试 1 次，4xx 不重试；`staleTime: 0`。
  - 组件层级：`ThemeProvider` → `QueryClientProvider` → `Toaster`（来自 `@/components/ui/toast`）→ `RouterProvider`。
  - 删除模板自带的 `App.tsx`。

- [x] **T5.2 API 客户端 `src/lib/api.ts`**
  - axios 实例，`baseURL: "/api"`。
  - 定义 `ApiError { status, code, message }`；把响应错误统一转成 `ApiError`；网络错误转成 `code: "NETWORK_ERROR"`。
  - 响应拦截器：收到 401，且请求不是 `/auth/me`、`/auth/login`、`/setup`、`/auth/register` 时，触发「会话过期」事件（一个简单的事件订阅即可），由路由守卫清掉 `me` 缓存并跳转到 `/login?expired=1`。
  - 每个接口一个带类型的函数，例如 `api.clips.create(content)`，类型取自 `src/lib/types.ts`。

- [x] **T5.3 类型、校验与表单**
  - `src/lib/types.ts`：§3.3 的全部类型，以及各接口的响应类型。
  - `src/lib/validation.ts`：与 §3.4 一致的 zod schema（用户名、密码、确认密码一致、邀请码）。
  - `src/lib/form.ts`：极简 zod resolver，把 zod 错误映射为 react-hook-form 的 `errors`（D10）。

- [x] **T5.4 文案 `src/lib/strings.ts`**
  - 集中存放所有界面文案，包括 PRD §4.10 的提示文案。
  - 提供 `errorMessage(err)`：按 §3.2 的 `code` 返回中文提示；`NETWORK_ERROR` →「网络异常，请重试」；未知 code 时回退到服务端返回的 `message`。

- [x] **T5.5 工具函数与 hooks**
  - `src/lib/time.ts`：注册 day.js 的 `zh-cn` 语言包；`formatClipTime(ts, now)` 严格按 PRD §4.1 的时间显示表实现；`formatFullTime(ts)` 返回 `YYYY-MM-DD HH:mm:ss`。
  - `src/hooks/use-now.ts`：每 60 秒更新一次当前时间，列表层只挂一个，把 `now` 往下传。
  - `src/hooks/use-debounced-value.ts`。
  - `src/lib/platform.ts`：`isMac`，以及 `modKeyLabel`（`⌘` 或 `Ctrl`）。
  - `src/lib/clipboard.ts`：
    - `copyText(text): Promise<boolean>`：安全上下文且支持时用 `navigator.clipboard.writeText`；否则用隐藏的 `<textarea>` + `document.execCommand('copy')` 降级；必须在点击事件中**同步发起**，不要在调用前 `await` 其他请求。
    - `canReadClipboard(): boolean`：`window.isSecureContext && typeof navigator.clipboard?.readText === 'function'`。
  - `src/lib/codes.ts` 或写进 `strings.ts`：`formatInviteCode(code)`，每 4 位插一个 `-`。

- [x] **T5.6 主题**
  - `public/theme-init.js`：读取 `localStorage['ecv-theme']`（`system` | `light` | `dark`，默认 `system`），结合 `prefers-color-scheme` 决定是否给 `<html>` 加 `dark` class。所有 `localStorage` 访问都要 try/catch。
  - `index.html` 的 `<head>` 中用 `<script src="/theme-init.js"></script>` 同步引用（D15）。
  - `components/app/theme-provider.tsx`：提供 `theme` 和 `setTheme`；主题为 `system` 时监听系统主题变化。

- [x] **T5.7 路由与守卫**
  > 偏离说明：`vite.config.ts` 的 `/api` 代理显式加了 `changeOrigin: false`；Vite 8 默认把 Host 改写为代理目标，会导致开发环境下 §3.6 的 Origin 校验误报 403。
  - `src/router.tsx`：用 `createBrowserRouter` 定义 `/setup`、`/login`、`/register`、`/`、`/settings`、`/admin`，以及 `*`（跳转到 `/`）。
  - `components/app/route-guard.tsx`：用 `system/status` 和 `auth/me` 两个查询决定跳转；两者都在加载时显示全屏 Spinner。跳转规则：

    | 条件 | 行为 |
    | --- | --- |
    | 未初始化 | 除 `/setup` 外全部跳转到 `/setup` |
    | 已初始化，访问 `/setup` | 已登录跳转到 `/`，未登录跳转到 `/login` |
    | 未登录，访问 `/`、`/settings`、`/admin` | 跳转到 `/login?redirect=<原路径>` |
    | 已登录，访问 `/login`、`/register` | 跳转到 `/` |
    | 非管理员访问 `/admin` | 跳转到 `/` |

  - `redirect` 参数只接受以 `/` 开头、且不以 `//` 开头的路径，防止开放重定向。

**阶段检查**：`npm run build`、`npm run lint` 通过；前后端同时启动后，未初始化时打开任意页面都会跳转到 `/setup`（页面内容可以先用占位）。

---

### 阶段 6：认证页面

- [x] **T6.1 公共组件**
  - `auth-layout.tsx`：页面居中的卡片，顶部是 Logo 和标题。
  - `password-input.tsx`：基于 `input-group`，右侧有显示 / 隐藏切换按钮（带 `aria-label`）。
  - 表单统一使用 `field.tsx` 组件展示标签和错误信息；提交中按钮显示 Spinner 并禁用。

- [x] **T6.2 `/setup` 创建管理员**
  - 标题「创建管理员账户」，副标题说明初始化码来自服务器 `.env` 中的 `ADMIN_INVITE_CODE`。
  - 字段：用户名、密码、确认密码、初始化码。
  - 成功后刷新 `status` 和 `me` 查询，跳转到 `/`。

- [x] **T6.3 `/login` 登录**
  - 带 `?expired=1` 时在表单上方显示「登录已过期，请重新登录」。
  - 错误提示按 PRD §4.6（`INVALID_CREDENTIALS`、`ACCOUNT_DISABLED`、`RATE_LIMITED`）。
  - 成功后跳转到 `redirect` 参数指定的路径，没有则跳转到 `/`。
  - `status.registrationOpen` 为 true 时显示「没有账户？注册」链接。

- [x] **T6.4 `/register` 注册**
  - `registrationOpen` 为 false 时，只显示「当前未开放注册，请联系管理员」和返回登录的链接。
  - 字段：用户名、密码、确认密码、邀请码；带 `?code=` 时自动填入邀请码。
  - 成功后跳转到 `/`。

**阶段检查**：在浏览器中完整走通「初始化 → 退出 → 登录」；各种错误提示正确；刷新页面后仍保持登录。

---

### 阶段 7：剪贴板主页

- [x] **T7.1 查询与变更 `src/queries/clips.ts`**
  - 查询键：`["clips", "pinned"]`、`["clips", "list", { q }]`（`q` 为空字符串表示默认列表）。
  - `usePinnedClips()`：仅在没有搜索词时启用。
  - `useClipList(q)`：`useInfiniteQuery`，用 `nextCursor` 翻页。
  - `useCreateClip()`：配合 T7.5 的「待保存」状态使用，见下。
  - `useUpdateClip()`（编辑、置顶）：成功后 `invalidateQueries(["clips"])`。
  - `useDeleteClip()`：乐观更新，立即从所有 `["clips", …]` 缓存中移除该条目；失败时 `invalidateQueries` 恢复，并提示错误。
  - `useRestoreClip()`：成功后 `invalidateQueries(["clips"])`。

- [x] **T7.2 顶栏 `app-header.tsx` 与用户菜单 `user-menu.tsx`**
  - 桌面端（≥ 768px）：一行，依次为 Logo、搜索框、「新建」按钮、用户菜单。
  - 移动端（< 768px）：两行，第一行 Logo + 用户菜单，第二行搜索框；「新建」按钮不显示，改用悬浮按钮（T7.6）。
  - 用户菜单（`dropdown-menu`）：显示用户名；「账户设置」；「管理后台」（仅管理员）；主题（跟随系统 / 浅色 / 深色，单选）；「退出登录」。
  - 退出登录：调用接口 → 清空全部查询缓存 → 跳转到 `/login`。

- [x] **T7.3 条目内容渲染 `clip-content.tsx` 和 `src/lib/rich-text.tsx`**
  - `renderRichText(text, keyword?)`：先把文本切分为 URL 片段和普通片段，再在各片段内高亮关键词（不区分大小写，用 `<mark>`）。
    - URL 正则只匹配 `http://` 和 `https://`，并去掉末尾的中英文标点（`.,;:!?)]}` 以及 `，。！？、；：）】》`）。
    - 链接渲染为 `<a target="_blank" rel="noopener noreferrer">`，点击时 `stopPropagation`，避免触发卡片的复制。
    - **禁止使用 `dangerouslySetInnerHTML`。**
  - 折叠状态：只渲染前 3000 个字符（D11），样式为 `whitespace-pre-wrap break-words` + `line-clamp-8`；通过比较 `scrollHeight` 和 `clientHeight` 判断是否溢出，溢出时底部加渐隐遮罩并显示「展开」。
  - 展开状态：渲染全文，最大高度 `60vh`，超出部分可滚动，显示「收起」。

- [x] **T7.4 条目卡片 `clip-card.tsx`**
  - 结构：内容区（T7.3）+ 元信息行 + 操作区。
  - 元信息行：时间（`formatClipTime`，悬停时用 `tooltip` 显示 `formatFullTime`）· 字数（`Array.from(content).length`）· 「已编辑」（`updatedAt > createdAt` 时显示）；已置顶时显示图钉图标。
  - 操作区：「复制」按钮始终可见；复制成功后图标变成 ✓，1.5 秒后恢复，同时 toast「已复制」；复制失败时 toast 提示。
  - 「⋯」菜单：置顶 / 取消置顶、编辑、删除。
  - **单击卡片即复制**：在卡片根元素上监听 click；以下情况不复制：`window.getSelection()?.toString()` 非空，或者点击目标位于 `a`、`button`、`[role="menuitem"]` 之内。
  - 高亮：接收 `highlighted` 属性，显示约 1.5 秒逐渐淡出的描边，用于新建、去重、撤销删除后的定位；高亮时自动 `scrollIntoView({ block: "nearest" })`。

- [x] **T7.5 待保存条目 `pending-clips.tsx` 与创建流程**
  > 偏离说明：`useCreateClip` 设了 `networkMode: "always"`——TanStack Query 默认在断网时挂起 mutation，那样断网粘贴会一直停在「保存中」而不是 PRD 要求的失败卡片。
  - 维护一个页面级的「待保存」列表：`{ tempId, content, status: "saving" | "failed" }[]`。`tempId` 用自增计数器生成（见 §0.3）。
  - 待保存条目渲染在「最近」分组的最上方，外观与普通卡片一致：保存中显示 Spinner；失败时显示红色边框、错误原因，以及「重试」「移除」两个按钮。
  - 提交成功：
    - `deduplicated: false` → 移除待保存条目，把返回的 `clip` 插入 `["clips", "list", { q: "" }]` 缓存第一页的最前面，并高亮；toast「已保存」，带「撤销」按钮（点击后调用删除接口）。
    - `deduplicated: true` → 移除待保存条目，`invalidateQueries(["clips"])`，刷新后高亮该条目；toast「内容已存在，已移到最前」，**不带撤销**（撤销会误删原来的条目）。
  - 提交前在前端检查字节数（`new TextEncoder().encode(text).length > status.maxTextBytes`），超出时直接 toast，不发请求。

- [x] **T7.6 新建 / 编辑编辑器 `clip-editor.tsx` 与悬浮按钮 `new-clip-fab.tsx`**
  - 同一个组件用于「新建」和「编辑」两种模式；桌面端用 `dialog`，移动端（`useIsMobile()`）用 `drawer`。
  - 内容：`textarea`（打开时自动聚焦，最小 6 行，内容过长时可滚动）；底部左侧显示字数，右侧是「取消」「保存」按钮。
  - 「读取剪贴板」按钮：仅在 `canReadClipboard()` 为 true 时显示，读取成功后把文本**插入到光标位置**。读取失败（用户拒绝授权等）时 toast 提示。
  - ⌘/Ctrl + Enter 保存；Esc 或点击遮罩关闭，有未保存内容时用 `alert-dialog` 确认「放弃未保存的内容？」。
  - 新建模式保存时走 T7.5 的流程（关闭编辑器，由待保存列表显示状态）；编辑模式保存时调用 `useUpdateClip`，成功后关闭并 toast「已保存」，失败时编辑器保持打开并显示错误。
  - 编辑模式下内容没有改动时，「保存」按钮禁用。
  - 悬浮按钮：仅移动端显示，固定在右下角（考虑 `env(safe-area-inset-bottom)`），点击打开新建编辑器。

- [x] **T7.7 全局粘贴 `src/hooks/use-paste-to-create.ts`**
  > 偏离说明：对话框检测不用 `[role="dialog"]` 选择器——Base UI 的 Toast.Root 带 `role="dialog"`，任何 toast 显示期间粘贴都会被误吞。改为按 data-slot 匹配 `dialog-content` / `alert-dialog-content` / `drawer-popup`。
  - 只在主页挂载，监听 `document` 的 `paste` 事件。
  - 以下情况直接 return，不调用 `preventDefault`：
    - 事件目标或 `document.activeElement` 位于 `input`、`textarea`、`select` 中，或 `isContentEditable` 为 true；
    - 页面上存在打开的对话框（`document.querySelector('[role="dialog"], [role="alertdialog"]')` 非空）。
  - 读取 `event.clipboardData.getData("text/plain")`：
    - 含非空白字符 → `preventDefault()`，走 T7.5 的创建流程；
    - 否则，如果 `clipboardData.files.length > 0` 或 `types` 中包含 `image/*` → toast「目前只支持保存文本」；
    - 否则 → toast「剪贴板中没有可保存的内容」。

- [x] **T7.8 列表页 `pages/home.tsx` 与 `clip-list.tsx`**
  - 没有搜索词时：依次显示「已置顶」分组（没有置顶条目时不显示该分组标题）、待保存条目、「最近」分组。
  - 有搜索词时：只显示一个结果列表，关键词高亮，不显示待保存条目。
  - 无限滚动：在列表末尾放一个哨兵元素，用 `IntersectionObserver` 触发 `fetchNextPage`；加载中显示 Spinner；没有更多数据时显示「没有更多了」（只有一页时不显示）。
  - 首次加载显示 3 个 `skeleton` 卡片。
  - 空状态（`empty` 组件），文案按 PRD §4.10：
    - 桌面端：大字「按 {modKeyLabel} V 粘贴，即刻保存」，其中快捷键用 `kbd` 渲染；小字「或点击『新建』」。
    - 移动端：「点击右下角 + 开始」。
    - 搜索无结果：「没有找到包含"xxx"的内容」。
  - 列表加载失败：显示错误提示和「重试」按钮。
  - 布局：内容区 `max-w-3xl` 居中；移动端卡片全宽，底部留出悬浮按钮的空间。

- [x] **T7.9 搜索框 `search-box.tsx`**
  - 输入防抖 300ms 后更新搜索词；左侧放搜索图标；有内容时右侧显示清除按钮。
  - 聚焦时按 Esc：清空内容并失去焦点。

- [x] **T7.10 删除与撤销**
  > 偏离说明：「已删除+撤销」toast 由主页层（而非卡片）触发——删除会卸载卡片组件，TanStack Query 会丢弃已卸载组件 `mutate()` 的回调，toast 永远不显示。
  - 点击删除后乐观移除，toast「已删除」，带「撤销」按钮，`timeout: 5000`。
  - 点击撤销 → 调用 restore → 刷新列表并高亮恢复的条目。

**阶段检查**：[§5 验收清单](#5-端到端验收清单) 中「剪贴板主页」部分全部通过，并在 Chrome 和 Safari 上各验证一遍全局粘贴与复制。

---

### 阶段 8：账户设置与管理后台

- [x] **T8.1 `/settings` 账户设置**
  - 「修改密码」卡片：当前密码、新密码、确认新密码；成功后 toast「密码已修改，其他设备已退出登录」并清空表单。
  - 「外观」卡片：主题三选一（`toggle-group` 或 `radio-group`）。
  - 页面顶部有返回主页的入口。

- [x] **T8.2 `/admin` 布局**
  - 使用 `tabs` 分为「用户管理」和「注册设置」两个标签，当前标签同步到 URL 查询参数 `?tab=users|registration`，刷新后保持。
  - 页面顶部有返回主页的入口。

- [x] **T8.3 用户管理 `users-table.tsx`**
  - 使用 `table` 组件，列：用户名、角色（`badge`）、状态（`badge`，停用的用醒目颜色）、条目数、注册时间、最近登录（从未登录显示「—」）。外层容器 `overflow-x-auto`，保证移动端可以横向滚动。
  - 每行末尾的「⋯」菜单（管理员所在行不显示菜单）：
    - 「停用」：`alert-dialog` 确认「停用后该用户将立即退出所有设备，且无法登录。数据会保留。」；「启用」：直接执行。
    - 「重置密码」→ `reset-password-dialog.tsx`：密码输入框 + 「生成」按钮（用 `crypto.getRandomValues` 生成 12 位字母数字密码并填入）；提交成功后在对话框中显示新密码和「复制」按钮，提示「请立即告知用户，此密码不会再次显示」。
    - 「删除」→ `delete-user-dialog.tsx`：说明「将永久删除该用户及其全部 N 条内容，不可恢复」，需要输入该用户名才能点击删除按钮。
  - 所有操作成功后刷新列表并 toast 提示。

- [x] **T8.4 注册设置 `registration-settings.tsx`**
  - 「开放注册」开关（`switch`），切换后立即保存。
  - 邀请码区域：
    - 没有邀请码时显示「尚未生成，开放注册时会自动生成」。
    - 有邀请码时用等宽字体显示 `formatInviteCode(code)`，后面依次是按钮：复制邀请码、复制注册链接（`${location.origin}/register?code=${code}`）、刷新（`alert-dialog` 确认「旧邀请码将立即失效」）、修改。
    - 修改：切换为输入框 + 「保存」「取消」，前端按 §3.4 校验。
  - 注册处于关闭状态时，在邀请码区域上方显示提示「注册已关闭，邀请码暂不可用」。

**阶段检查**：[§5 验收清单](#5-端到端验收清单) 中「账户」「管理后台」部分全部通过。

---

### 阶段 9：部署

- [x] **T9.1 `Dockerfile`（多阶段构建，基础镜像全部使用 `node:24-slim`）**
  1. `web` 阶段：`WORKDIR /app`，复制根目录的 `package.json`、`package-lock.json` → `npm ci` → 复制前端源码（`index.html`、`public/`、`src/`、各个 `tsconfig*.json`、`vite.config.ts`、`components.json`）→ `npm run build`，产物在 `/app/dist`。
  2. `server` 阶段：`apt-get install -y --no-install-recommends python3 make g++`（原生模块预编译包不可用时的后备方案），`WORKDIR /app/backend`，复制 `backend/package*.json` → `npm ci` → 复制 `backend/` 其余内容 → `npm run build` → `npm prune --omit=dev`。
  3. 运行阶段：
     - `ENV NODE_ENV=production`，`WORKDIR /app`；
     - 从 `server` 阶段复制 `dist/`、`drizzle/`、`node_modules/`、`package.json` 到 `/app/backend/`；从 `web` 阶段复制 `/app/dist` 到 `/app/dist`；
     - `mkdir -p /app/data && chown node:node /app/data`，`USER node`；
     - `EXPOSE 8000`；
     - `HEALTHCHECK` 使用 `node -e "fetch('http://127.0.0.1:8000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`；
     - `CMD ["node", "backend/dist/server.js"]`。

- [x] **T9.2 `docker-compose.yml`**
  - 只有一个 `app` 服务：`build: .`、`image: easy-cv:latest`、`restart: unless-stopped`、`env_file: .env`。
  - 端口：`"${HOST_BIND:-0.0.0.0}:${HOST_PORT:-8000}:8000"`。
  - 数据卷：`./data:/app/data`。
  - 日志轮转：`logging.driver: json-file`，`max-size: 10m`，`max-file: 3`。

- [x] **T9.3 容器验证**
  > 偏离说明：「把 data/ 属主改为 root」在本机无法复现——macOS Docker Desktop 的 virtiofs 绑定挂载不映射属主。改为在宿主机把 data/ 设为只读（chmod 555）直接运行后端，确认启动时报出规定文案并以退出码 1 退出。Docker 内 root 属主场景需在 Linux 服务器上确认。
  - 在一个干净的目录中：`cp .env.example .env` 并填写 → `mkdir -p data` → `docker compose up -d --build`。
  - 检查：`docker compose ps` 显示 healthy；通过 `http://<本机局域网IP>:8000` 完成初始化并创建条目；`docker compose restart` 后数据仍在；`docker compose exec app node backend/dist/cli.js reset-password <username>` 可以正常运行。
  - 故意把 `data/` 的属主改为 root，确认启动日志中有 T1.3 规定的清晰报错。

**阶段检查**：[§5 验收清单](#5-端到端验收清单) 中「部署」部分全部通过。

---

### 阶段 10：文档与整体验收

- [x] **T10.1 重写 `README.md`**
  - 项目简介和功能列表。
  - 本地开发：`npm install`、`npm --prefix backend install`、复制 `.env.example` 为 `.env`，然后开两个终端分别运行 `npm run dev:backend` 和 `npm run dev`。
  - 测试与检查命令。
  - 部署（Ubuntu 24.04）：安装 Docker → `git clone` → 配置 `.env` → `mkdir -p data` → `docker compose up -d --build` → 访问 `http://<服务器IP>:8000` 完成初始化。
  - 接入 Nginx：设置 `TRUST_PROXY=true`、`HOST_BIND=127.0.0.1`；给出一个最小的 `location /` 配置示例，包含：
    - `proxy_set_header Host $http_host;`（用 `$http_host` 而不是 `$host`，否则非标准端口下 Origin 校验会失败）
    - `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
    - `proxy_set_header X-Forwarded-Proto $scheme;`
    - `client_max_body_size 4m;`（Nginx 默认只有 1m，放不下 1 MB 的文本）
  - 升级、备份、重置密码的命令。
  - 常见问题：为什么通过 HTTP 访问时看不到「读取剪贴板」按钮；忘记管理员密码怎么办；数据目录权限报错怎么办。

- [x] **T10.2 按 [§5 验收清单](#5-端到端验收清单) 完整验收一遍**，把结果记录在本文件末尾的「验收记录」中（日期、浏览器、未通过的项目和原因）。

---

### 阶段 11（P1，可选）：仅在用户明确要求时执行

- [ ] **T11.1 清空未置顶**：`DELETE /api/clips?scope=unpinned` 返回 `{ count }`，软删除所有未置顶条目；前端在用户菜单或列表标题旁放入口，`alert-dialog` 确认框中显示将删除的条数（取当前已加载数据，或新增一个计数接口，届时再定）。
- [ ] **T11.2 退出所有设备**：`POST /api/auth/logout-all` 删除当前用户的全部会话；入口放在 `/settings`。
- [ ] **T11.3 管理员直接创建用户**：`POST /api/admin/users { username, password }`；在用户管理页加「新建用户」按钮，对话框与重置密码类似，支持「生成」密码。
- [ ] **T11.4 快捷键 N 和 /**：焦点不在输入框、且没有对话框打开时，`N` 打开新建编辑器，`/` 聚焦搜索框；在界面上用 `kbd` 提示。

---

## 5. 端到端验收清单

每一项都要实际操作验证。「HTTP」指通过 `http://<局域网IP>:8000` 访问（不是 localhost），「移动端」指真实手机或浏览器的设备模拟。

### 初始化与认证

- [ ] 全新数据库、未配置 `ADMIN_INVITE_CODE` 时，服务拒绝启动并输出清晰提示。
- [ ] 配置后打开任意页面，都会跳转到 `/setup`。
- [ ] 初始化码错误时提示错误；正确时创建管理员并进入主页。
- [ ] 初始化后访问 `/setup` 会被跳转走；服务日志提示可以删除 `ADMIN_INVITE_CODE`。
- [ ] 未开放注册时，登录页没有注册入口，`/register` 显示「当前未开放注册」。
- [ ] 开放注册后，用「复制注册链接」得到的链接打开，邀请码已自动填好，可以注册成功。
- [ ] 登录失败的提示不暴露用户是否存在；连续输错 10 次后提示「操作太频繁」。
- [ ] 关闭浏览器后重新打开，仍保持登录。

### 剪贴板主页

- [ ] 空列表时显示正确的空状态（桌面端和移动端各自的文案，快捷键显示为 ⌘ 或 Ctrl）。
- [ ] 在页面空白处按 ⌘/Ctrl + V：立即出现新条目并高亮，toast「已保存」；点击「撤销」后条目消失。
- [ ] 通过右键菜单「粘贴」也能创建。
- [ ] 焦点在搜索框里时粘贴，只是把文字粘进搜索框，不会创建条目。
- [ ] 编辑器打开时粘贴，只是把文字粘进文本框。
- [ ] 粘贴一张截图：提示「目前只支持保存文本」。
- [ ] 从 Excel 或 WPS 复制几个单元格后粘贴：保存的是文字。
- [ ] 连续两次粘贴相同内容：只有一条，提示「内容已存在，已移到最前」，没有撤销按钮。
- [ ] 带缩进的代码粘贴后缩进完整保留；纯空格的内容不会被保存。
- [ ] 超过 1 MB 的文本：提示超出上限，不发请求。
- [ ] 单击卡片即复制，并显示「已复制」；拖选卡片中的一部分文字时不会触发复制；点击卡片中的链接会在新标签页打开，也不会触发复制。
- [ ] 超过 8 行的文本显示「展开」，展开后能看到全部内容。
- [ ] 时间显示符合 PRD 的规则，鼠标悬停显示完整时间；停留 1 分钟后「刚刚」自动变为「1 分钟前」。
- [ ] 置顶后条目进入「已置顶」分组；取消置顶后回到「最近」的顶部。
- [ ] 编辑后内容更新、位置不变，显示「已编辑」；没有改动时「保存」按钮不可用；有改动时按 Esc 会提示确认。
- [ ] 删除后 5 秒内点击撤销，条目恢复并高亮。
- [ ] 搜索：300ms 后出现结果，关键词高亮，结果中包含置顶条目；按 Esc 清空搜索。
- [ ] 创建 40 条以上的条目，滚动到底部时自动加载更多。
- [ ] 在设备 A 上新建条目，切到设备 B 的标签页，列表自动出现新条目。
- [ ] 断网后粘贴：卡片显示失败状态，恢复网络后点击「重试」保存成功。
- [ ] **HTTP**：点击复制正常；「读取剪贴板」按钮不显示；控制台没有 CSP 或 mixed content 报错。
- [ ] **移动端**：顶栏两行布局；悬浮 + 按钮打开底部抽屉，可以正常输入并保存；列表和卡片没有横向溢出。

### 账户

- [ ] 修改密码：当前密码错误时有提示；成功后另一个浏览器上的登录失效。
- [ ] 主题：切换浅色、深色、跟随系统都生效，刷新页面后保持，页面加载时不会先闪一下白色。
- [ ] 退出登录后回到登录页，浏览器后退按钮也回不到主页。

### 管理后台

- [ ] 普通用户看不到「管理后台」入口，直接访问 `/admin` 会被跳转回主页。
- [ ] 用户列表的条目数正确；管理员所在行没有操作菜单。
- [ ] 停用某个已登录的用户后，该用户下一次操作就被踢回登录页，再登录时提示账户已被停用；重新启用后可以登录。
- [ ] 重置密码：新密码只显示一次，可以复制；该用户的旧登录失效，用新密码可以登录。
- [ ] 删除用户：必须输入正确的用户名才能删除；删除后该用户无法登录。
- [ ] 注册开关、邀请码的复制、刷新、修改都生效；刷新后旧邀请码不能再注册。
- [ ] 刷新页面后停留在原来的标签页。

### 部署

- [ ] `docker compose up -d --build` 一次成功，容器状态为 healthy。
- [ ] `docker compose restart` 以及 `docker compose down && docker compose up -d` 之后数据仍在。
- [ ] CLI 重置密码可以正常使用。
- [ ] 设置 `HOST_BIND=127.0.0.1` 后，从局域网其他机器无法直接访问 8000 端口。

---

## 验收记录

| 日期 | 环境 / 浏览器 | 结果 | 未通过项与原因 |
| --- | --- | --- | --- |
| 2026-09-15 | macOS 15 · Chrome 152（headless CDP 驱动，含移动端模拟）· Docker 29（compose 部署于干净目录） | 通过（后端 32 项测试 + 六组端到端脚本全绿） | ① 验收项「Docker 中把 data/ 属主改为 root 后的报错」无法在 macOS Docker Desktop 复现（virtiofs 不映射属主），已在宿主机以只读 data/ 验证报错文案正确，Docker 场景需到 Linux 服务器确认；②「在 Safari 上验证全局粘贴与复制」未自动化，需人工在 Safari 过一遍；③「相对时间停留 1 分钟后自动刷新」与「悬停显示完整时间」未自动化验证（实现为 60s 定时器 + tooltip），需人工抽查。 |
