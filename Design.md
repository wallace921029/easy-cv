# Easy CV 磨砂玻璃质感设计规范系统 (Design.md)

> 本规范定义了 Easy CV 全站视觉风格升级的准则与技术约束：**半透明磨砂玻璃质感（Glassmorphism），极简现代，高级质感**。
> 所有界面重构严格遵循本规范，确保视觉层级一致、光影通透、内容清晰，且**绝不改动任何业务逻辑**。

---

## 1. 设计哲学与核心理念 (Core Philosophy)

1. **极简通透 (Minimal Translucency)**:
   - 摒弃厚重纯色色块，以高透光度与多层级景深呈现内容。
   - 界面整体呈现如轻薄水晶与雾面毛玻璃层叠的现代数字雕塑感。
2. **环境光折射 (Refractive Atmosphere)**:
   - 玻璃的质感必须依托底层环境光的折射而显现。背景并非单纯的死白或纯黑，而是蕴含细腻、流动的微光晕（Ambient Mesh / Aurora Glow），让上层的毛玻璃呈现真实的光线漫反射。
3. **微光边缘与高光切面 (Specular Edge & Crisp Contours)**:
   - 真实高级玻璃具有精细微倒角与物理高光边缘。通过 `1px` 微半透明边框及顶部微妙内发光（Specular Highlight），强化浮起感与高级触感。
4. **内容可读性与无干扰交互 (Clarity First)**:
   - 玻璃为背景服务，核心文字与输入控件保持极高对比度（WCAG AA/AAA），背景模糊度（Backdrop Blur）充足，绝不因半透明而产生眩光或背景透字干扰。

---

## 2. 色彩与光效系统 (Color & Atmosphere)

### 2.1 空间环境底色与微光几何点阵画卷 (Dynamic Geometric Dot Matrix & Ambient Spotlight)
- **极简工业风几何点阵 (Retina Geometric Dot Matrix)**:
  - 采用基于原生 HTML5 Canvas 硬件加速渲染的细密点阵网格，置于视口最底层 (`fixed inset-0 -z-50 pointer-events-none`)。
  - **点阵规格**: 间距 `28px`，基础半径 `1.15px`（适配 Retina 屏幕 `devicePixelRatio` 保证像素级锐利）。
  - **浅色模式**: 极度克制的中性冷灰点阵 `rgba(15, 23, 42, 0.06)`，静谧温润。
  - **深色模式**: 深空微亮星点 `rgba(255, 255, 255, 0.08)`，沉稳深邃。
- **互动光标聚光灯与环境呼吸 (Interactive Spotlight & Ambient Breathing)**:
  - **光标跟随微光**: 具备惯性缓动阻尼插值（Lerp `0.075`），半径约 340px 的柔和聚光灯伴随鼠标移动，临近点阵微增半径与亮度（浅色下呈雅致靛蓝微光 `rgba(99, 102, 241, ...)`，深色下呈柔和薰衣草星光 `rgba(196, 181, 253, ...)`）。
  - **静止呼吸机制 (Ambient Breathing)**: 鼠标无交互时，微光以平滑的利萨如曲线（Lissajous Curve）缓慢游弋漂移，保持空间的呼吸感与生命力。
  - **能耗与隐私优化**: 页面隐藏或失焦（`document.hidden`）时自动暂停动画渲染循环，零多余 CPU/GPU 占用。
- **毛玻璃光学共鸣 (Glass Refraction Synergy)**:
  - 当点阵与聚光灯经过上层的 `AppHeader` 或 `ClipCard`（`backdrop-blur-xl`）下方时，清晰点阵在玻璃后侧被柔化为漫反射光斑，聚光灯掠过时形成极具物理真实感的流动内发光，极致克制、不干扰文字内容阅读。

### 2.2 玻璃材质层级与色彩值 (Glass Hierarchy)

| 层级 | 材质角色 | 适用组件 | 浅色模式背景与模糊 | 深色模式背景与模糊 | 边框与高光 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **L0** | 底层画卷 | Body / Page Canvas | Base + 弥散微光层 | Base + 曜石暗光层 | 无 |
| **L1** | 悬浮表面 | ClipCard / 列表项 / 表单卡片 | `rgba(255,255,255, 0.70)` <br/>`backdrop-blur-xl saturate-160` | `rgba(28,28,34, 0.65)` <br/>`backdrop-blur-xl saturate-160` | 边框: `rgba(255,255,255, 0.60)` (浅) / `rgba(255,255,255, 0.10)` (深)<br/>内高光: `inset 0 1px 1px rgba(255,255,255,0.8)` |
| **L1.5** | 导航与固定栏 | AppHeader / PageHeader / FAB | `rgba(255,255,255, 0.75)` <br/>`backdrop-blur-2xl saturate-180` | `rgba(18,18,22, 0.75)` <br/>`backdrop-blur-2xl saturate-180` | 细微下边框 / 360° 环绕柔光 |
| **L2** | 弹窗与弹出层 | Dialog / Drawer / AlertDialog / Menu / Toast | `rgba(255,255,255, 0.86)` <br/>`backdrop-blur-2xl` | `rgba(24,24,28, 0.82)` <br/>`backdrop-blur-2xl` | 边框: `rgba(255,255,255, 0.75)` (浅) / `rgba(255,255,255, 0.16)` (深)<br/>外阴影: `0 20px 48px -12px rgba(0,0,0,0.12)` |
| **L3** | 输入与微交互元 | Input / Textarea / Button / Tabs | `rgba(255,255,255, 0.50)` (交互提升至 0.8) | `rgba(255,255,255, 0.05)` (交互提升至 0.12) | 细微内陷阴影与对焦柔和发光环 |

---

## 3. 阴影、倒角与高光系统 (Shadows, Radii & Specluar Highlights)

### 3.1 阴影阶梯 (Shadow Hierarchy)
- **Glass Card Shadow**: 
  - 浅色: `0 8px 32px 0 rgba(31, 38, 135, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.02)`
  - 深色: `0 8px 32px 0 rgba(0, 0, 0, 0.45), 0 1px 2px 0 rgba(255, 255, 255, 0.03)`
- **Glass Hover Lift**:
  - `transform: translateY(-1.5px)`，阴影扩散为 `0 14px 40px -4px rgba(31, 38, 135, 0.1)`，边框微亮。
- **Glass Modal Shadow**:
  - `0 24px 60px -12px rgba(0, 0, 0, 0.18), 0 0 1px 1px rgba(255, 255, 255, 0.4)`

### 3.2 圆角与尺寸规格 (Radii & Unified Control Sizes)
- **卡片与主容器**: `rounded-2xl` (16px) 或 `rounded-xl` (12px)，赋予现代温润的玉石感。
- **弹窗与抽屉**: `rounded-2xl` ~ `rounded-3xl`。
- **标签、开关与 FAB**: `rounded-full` (灵动胶囊形)。
- **表单控件统一尺寸阶梯 (Unified Form Control Scale)**:
  - **`default` (标准)**: 高度 `h-9` (36px)，圆角 `rounded-xl` (12px)，字号 `text-sm`，边距 `px-3`。适用于登录/注册表单、搜索栏、弹窗输入与主要操作。
  - **`sm` (紧凑)**: 高度 `h-8` (32px)，圆角 `rounded-lg` (8px-10px)，字号 `text-xs`，边距 `px-2.5`。适用于表格内操作、行内编辑（如邀请码修改）及密集排版。
  - **`lg` (大号)**: 高度 `h-10` (40px)，圆角 `rounded-xl` (12px)，字号 `text-base`，边距 `px-3.5`。
  - **`xs` (微型按钮)**: 高度 `h-7` (28px)，圆角 `rounded-md` (6px)，字号 `text-xs`。
  - **图标按钮 (`icon-*`)**: 尺寸严格与对应高度同步（`icon`: 36px, `icon-sm`: 32px, `icon-xs`: 28px, `icon-lg`: 40px）。

---

## 4. 各模块与组件的改造准则 (Component Design Directives)

### 4.1 全局背景与布局 (Global Background & Layout)
- 根节点放置非阻塞的全局环境氛围光层（`.ambient-canvas`），利用 CSS 多层 radial-gradient 提供弥散光芒。
- 保证页面滚动时光影流动自然，背景保持 `fixed`，消除性能负担。

### 4.2 顶部栏 (AppHeader & PageHeader)
- 采用吸顶玻璃条形态 (`sticky top-0`)。
- 背景: 高斯模糊 `backdrop-blur-2xl bg-background/70`，底部分割线采用微透明 `border-border/60`。
- 桌面端与移动端无缝过渡，搜索栏嵌入其中犹如冰晶嵌合。

### 4.3 卡片模块 (ClipCard, PendingClips, Auth Card, Settings Card)
- 核心内容卡片均披覆磨砂玻璃外衣。
- `ClipCard`:
  - 基础态: 半透明磨砂底，精致单像素亮边。
  - 悬浮态: 边缘高光微亮，平滑浮起 `scale-[1.002]`。
  - 高亮态 (Highlight): 保持玻璃质感同时加上 `ring-2 ring-primary/40`。
  - 折叠展开遮罩: 由 `from-card to-transparent` 平滑过渡，渐变贴合半透明毛玻璃底色。
- `AuthLayout`: 居中展示的身份卡片宛若一块漂浮在极光氛围中的磨砂琉璃板。

### 4.4 模态与弹出层 (Dialog, Drawer, AlertDialog, DropdownMenu, Toast)
- `DialogOverlay` & `DrawerOverlay`:
  - 覆盖层增加 `backdrop-blur-sm bg-black/25 dark:bg-black/50`，弱化背景干扰，强化聚焦点。
- `DialogContent` / `AlertDialogContent`:
  - 半透明高斯磨砂窗体，微高光边缘，搭配温润阴影。
- `DropdownMenuContent`:
  - 漂浮玻璃板，选项 hover 时呈现液态微光微调效果 (`hover:bg-white/40 dark:hover:bg-white/10`)。
- `Toast`:
  - 底部通知变为悬浮磨砂胶囊卡片，伴随轻盈动画。

### 4.5 输入与交互控件 (Input, Textarea, SearchBox, Button, Switch, Tabs)
- **保护毛玻璃透光率的悬浮光环 Focus 系统 (Outline Floating Halo)**:
  - **摒弃破坏透明度的实体纯白变化**: 聚焦时绝不大幅跳变背景透明度（取消 `bg-white/70` 等不透明填充），严密保持底层背景与氛围折射光的通透。
  - **采用 2px 悬浮外轮廓 (`outline-2 outline-offset-2`)**: 借助 CSS `outline` 的外偏置，使对焦光环以 2px 间隙悬浮于玻璃胶囊外围。既保留了玻璃组件自身 1px 晶莹的高光边框与磨砂质地，又提供了极具高级感与现代感的聚焦指引。
  - **异常状态一致性**: `aria-invalid` 同样采用外偏置 outline (`outline-destructive/40`)，实现全站交互语言的高度纯粹与统一。
- `Button`:
  - Default: 高对比度曜黑/纯白磨砂胶囊，干练高级。
  - Outline / Ghost / Secondary: 半透明微透玻璃按钮，hover 时吸光增亮。
  - Mobile FAB (`NewClipFab`): 悬浮磨砂玻璃球/圆钮，带微光光泽。
- `Tabs`:
  - 玻璃滑块轨道 `bg-white/30 dark:bg-white/5 backdrop-blur-md`，激活项为纯白玉润浮块。

### 4.6 辅助元素 (Badges, Skeletons, Empty States, Tables)
- `Badge`: 半透明微光胶囊。
- `Skeleton`: 磨砂感透光脉冲。
- `Table`: 磨砂玻璃盘，表头与数据行交替微透明度。

---

## 5. 技术实现与代码约束 (Technical Constraints)

1. **零业务逻辑修改**:
   - 绝不改动任何数据获取（React Query）、状态转移（useState/useForm）、API 接口、Route Guard、路由及权限判断。
2. **样式实现优先使用语义化 Tailwind Token 与 CSS 变量**:
   - 在 `src/index.css` 深度定义 `@theme`、`:root`、`.dark` 及针对玻璃质感的通用样式类（如 `.glass-surface`、`.glass-panel`、`.glass-input` 等），确保全局统一度与维护性。
3. **性能保证**:
   - `backdrop-filter: blur(...)` 结合硬件加速属性（`will-change` 或适当利用 CSS 变换），避免层级嵌套过多导致重绘卡顿。
4. **降级与兼容性 (Graceful Fallback)**:
   - 依赖 `supports-backdrop-filter`，在极特殊低版本浏览器自动回退为优雅的高透明度背景。
