# Easy CV

[English](README.md) | [简体中文](README.zh-CN.md)

自托管的个人在线文本剪贴板：在任意设备打开网页，⌘/Ctrl + V 即存，点一下即取。

## 功能

- **粘贴与创建**：全局监听 `paste` 事件唤起编辑器，预填内容并聚焦标题，确认后保存；相同内容自动去重并移到最前
- **点击即复制**：单击卡片复制全文（HTTP 下自动降级，无需 HTTPS）
- **可选标题**：支持最长 64 字符的简短标题，支持重命名，列表与卡片显示更清晰
- **整理**：置顶、编辑、删除（5 秒内可撤销）、关键字搜索（含高亮）、无限滚动
- **多设备**：页面切回前台时自动刷新
- **多用户**：注册开关 + 邀请码；管理员可停用/启用、重置密码、删除用户（看不到他人内容）
- **安全**：argon2id 密码哈希、HttpOnly 会话 Cookie、Origin 校验、限流、纯文本渲染防 XSS

## 技术栈

React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui（前端）；Fastify + Drizzle ORM + SQLite（后端）。生产环境只有一个容器、一个 SQLite 文件。

## 本地开发

```bash
npm install                     # 前端依赖
npm --prefix backend install    # 后端依赖
cp .env.example .env            # 修改 ADMIN_INVITE_CODE（至少 8 位）
```

开两个终端：

```bash
npm run dev:backend   # 后端 http://127.0.0.1:10002
npm run dev           # 前端 http://localhost:10001（/api 已代理到后端）
```

打开 http://localhost:10001 会跳转到 `/setup`，用 `.env` 里的 `ADMIN_INVITE_CODE` 完成初始化。

## 测试与检查

| 命令 | 说明 |
| --- | --- |
| `npm run test:backend` | 后端测试（node:test，内存 SQLite） |
| `npm --prefix backend run typecheck` | 后端类型检查 |
| `npm run build` | 前端类型检查 + 生产构建 |
| `npm run lint` | oxlint |

## 部署（Ubuntu 24.04）

```bash
# 安装 Docker（官方脚本）
curl -fsSL https://get.docker.com | sh

git clone https://github.com/wallace921029/easy-cv.git && cd easy-cv
cp .env.example .env    # 修改 ADMIN_INVITE_CODE
mkdir -p data
docker compose up -d --build
```

访问 `http://<服务器IP>:8000` 完成初始化（创建管理员）。初始化后 `ADMIN_INVITE_CODE` 即失效，可从 `.env` 删除。

### 接入 Nginx（可选，用于域名 + HTTPS）

`.env` 中设置：

```
TRUST_PROXY=true
HOST_BIND=127.0.0.1
```

Nginx 最小配置：

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
client_max_body_size 4m;
```

注意：`Host` 必须用 `$http_host`（保留端口号），否则非标准端口下 Origin 校验会失败；`client_max_body_size` 默认 1m，放不下 1 MB 的文本。

## 运维

```bash
# 升级
git pull && docker compose up -d --build

# 备份：停止后复制整个 data/ 目录
docker compose stop && cp -r data data.bak && docker compose start

# 重置任意用户（含管理员）的密码，终端会打印一个新随机密码
docker compose exec app node backend/dist/cli.js reset-password <email>
```

## 常见问题

**通过 HTTP（IP 直连）访问时为什么没有「读取剪贴板」按钮？**
浏览器只在 HTTPS（安全上下文）下开放 `navigator.clipboard` 读取接口。HTTP 下该按钮自动隐藏；粘贴创建和点击复制不受影响（复制自动使用降级方案）。

**忘记管理员密码怎么办？**
在服务器上执行 `docker compose exec app node backend/dist/cli.js reset-password admin@example.com`，用打印出的新密码登录。

**启动报「数据目录不可写」？**
容器内以 `node`（uid 1000）用户运行，`./data` 属主不对时会出现。执行 `sudo chown -R 1000:1000 ./data` 后重启。不要把 `data/` 放在 NFS 等网络文件系统上（SQLite 文件锁不可靠）。

**浏览器控制台提示 Mixed Content / 资源被升级为 HTTPS？**
应用本身通过 IP 以 HTTP 运行时不会强制 HTTPS。若接入 Nginx + HTTPS 后出现，检查是否同时保留了旧的 HTTP 书签；HSTS 交由 Nginx 管理。

## 目录结构

```text
easy-cv/
├── src/                  # 前端（React）
├── backend/              # 后端（Fastify）
│   ├── src/              #   routes / services / plugins / jobs / cli
│   └── drizzle/          #   迁移（启动时自动执行）
├── data/                 # SQLite 数据（运行时生成，git 忽略）
├── Dockerfile
└── docker-compose.yml
```
