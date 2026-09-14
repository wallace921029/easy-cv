# Easy CV

Easy CV 项目初始化工作空间。已配置现代前端开发工程栈，后端预留空白目录以便从零开始构建。

## 技术栈

### 前端 (Frontend)
- **核心框架**：React 19 + TypeScript
- **构建工具**：Vite
- **样式方案**：Tailwind CSS v4 + tw-animate-css
- **UI 组件库**：shadcn/ui (基于 `@base-ui/react` 与 `@shadcn/react`) + Lucide Icons
- **常用工具库**：React Router、Axios、React Hook Form、Zod、Recharts 等
- **代码规范**：oxlint + TypeScript

### 后端 (Backend)
- `backend/` 目录已清空，准备从 0 开始初始化。

---

## 目录结构

```text
easy-cv/
├── backend/            # 后端工程目录（待从零构建）
├── public/             # 静态公共资源（SVG 图标、favicon 等）
├── src/                # 前端源码目录
│   ├── components/     # 组件
│   │   └── ui/         # shadcn/ui 基础组件库
│   ├── hooks/          # 自定义 React Hooks（如 use-mobile 等）
│   ├── lib/            # 工具函数（如 cn 等）
│   ├── App.tsx         # 根组件
│   ├── index.css       # Tailwind CSS v4 与主题变量样式
│   └── main.tsx        # 前端入口
├── components.json     # shadcn/ui 配置文件
├── index.html          # HTML 模板
├── package.json        # 项目依赖与构建脚本
├── tsconfig.json       # TypeScript 根配置
├── tsconfig.app.json   # 前端应用 TypeScript 配置
├── tsconfig.node.json  # Vite/Node 相关的 TypeScript 配置
├── vite.config.ts      # Vite 配置文件（已配置 @ 别名与 /api 代理）
└── README.md           # 项目说明文档
```

---

## 快速开始

### 1. 前端本地开发

安装依赖：
```bash
npm install
```

启动开发服务器：
```bash
npm run dev
```

启动后可在浏览器中访问：`http://localhost:5173`。

### 2. 脚本命令

| 命令 | 说明 |
| :--- | :--- |
| `npm run dev` | 启动本地 Vite 开发服务器 |
| `npm run build` | 运行 TypeScript 编译检查并打包生产构建产物到 `dist/` |
| `npm run preview` | 本地预览生产构建产物 |
| `npm run lint` | 使用 oxlint 进行快速代码规范检查 |

### 3. 前后端联调配置

前端在 `vite.config.ts` 中已配置反向代理：
- 发往 `/api/*` 的请求将被自动转发至后端的 `http://127.0.0.1:8000`。
