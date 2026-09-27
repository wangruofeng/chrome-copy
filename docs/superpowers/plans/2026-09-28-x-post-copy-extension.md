# X 帖子正文一键复制扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可直接加载到 Chrome 的 Manifest V3 扩展，为 X 和 Twitter 的每条帖子提供只复制当前外层正文的按钮。

**Architecture:** 扩展由无构建步骤的 Manifest、内容脚本和样式组成。内容脚本以可单元测试的纯函数封装帖子正文选择规则，再用 `MutationObserver` 处理 X 的动态页面和按钮生命周期。

**Tech Stack:** Chrome Manifest V3、原生 JavaScript、CSS、Node.js 内置测试运行器（`node:test`）、JSDOM

**Spec:** `docs/superpowers/specs/2026-09-28-x-post-copy-extension-design.md`

## Global Constraints

- 只复制当前帖子的正文纯文本，不包含作者、发布时间、帖子链接或引用帖子正文。
- 只在 `https://x.com/*` 和 `https://twitter.com/*` 注入内容脚本。
- 不申请后台脚本、存储、网络请求、标签页或身份权限。
- 不引入前端框架或构建系统，产物可以作为已解压扩展直接加载。
- 所有用户文案和项目文档默认使用简体中文。

---

### Task 1: 建立可测试的正文提取模块

**Files:**
- Create: `package.json`
- Create: `src/post-content.js`
- Create: `tests/post-content.test.js`

**Interfaces:**
- Produces: `findOwnPostTextElement(article: Element): Element | null`
- Produces: `extractPostText(article: Element): string`

- [ ] **Step 1: 写入失败测试**

在 JSDOM 中覆盖普通正文、换行正文、带引用帖子的外层正文，以及只有引用正文时返回空字符串。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm install && npm test -- --test-name-pattern="extractPostText"`
Expected: FAIL，原因是 `src/post-content.js` 尚不存在或导出函数未定义。

- [ ] **Step 3: 实现最小正文提取逻辑**

`findOwnPostTextElement` 遍历当前 `article` 中的正文候选，排除最近所属 `article` 不是传入元素的候选，并排除位于引用容器 `[data-testid="quoteTweet"]` 内的候选；`extractPostText` 返回候选的 `innerText` 或 `textContent`，并执行首尾空白清理。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm test -- --test-name-pattern="extractPostText"`
Expected: 相关测试全部 PASS。

- [ ] **Step 5: 提交本任务**

```bash
git add package.json package-lock.json src/post-content.js tests/post-content.test.js
git commit -m "feat: add X post text extraction"
```

### Task 2: 实现按钮注入、复制与状态反馈

**Files:**
- Create: `src/content.js`
- Create: `src/content.css`
- Create: `tests/content.test.js`

**Interfaces:**
- Consumes: `extractPostText(article)`
- Produces: `findActionBar(article: Element): Element | null`
- Produces: `injectCopyButton(article: Element): HTMLButtonElement | null`
- Produces: `copyText(text: string): Promise<void>`
- Produces: `scanPosts(root?: ParentNode): void`

- [ ] **Step 1: 写入失败测试**

覆盖正确找到操作栏、单个操作栏只注入一次、无正文点击不写剪贴板、普通正文点击写入剪贴板，并验证按钮具备中文 `aria-label`。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- --test-name-pattern="copy button"`
Expected: FAIL，原因是 `src/content.js` 尚不存在或接口未实现。

- [ ] **Step 3: 实现内容脚本**

使用 X 的 `role="group"` 操作区及现有按钮特征定位操作栏；创建带 SVG 图标的原生 `button`，阻止事件冒泡，调用 `extractPostText` 后执行 Clipboard API，并提供 `execCommand` 回退。通过 `MutationObserver` 合并动态扫描请求，通过 `data-x-copy-button` 防止重复注入。成功、空正文和失败状态在短暂提示后复位。

- [ ] **Step 4: 添加主题适配样式**

样式使用 `currentColor`、继承字体、明确的 hover/focus-visible 状态和 34px 点击区域；按钮不改变 X 操作栏布局，不依赖固定背景色。

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: `npm test -- --test-name-pattern="copy button"`
Expected: 相关测试全部 PASS。

- [ ] **Step 6: 提交本任务**

```bash
git add src/content.js src/content.css tests/content.test.js
git commit -m "feat: inject one-click copy buttons"
```

### Task 3: 配置可加载扩展与图标

**Files:**
- Create: `manifest.json`
- Create: `icons/icon.svg`
- Create: `icons/icon16.png`
- Create: `icons/icon32.png`
- Create: `icons/icon48.png`
- Create: `icons/icon128.png`
- Create: `scripts/generate-icons.mjs`
- Create: `tests/manifest.test.js`

**Interfaces:**
- Consumes: `src/post-content.js`、`src/content.js`、`src/content.css`
- Produces: 可由 Chrome 加载的 Manifest V3 扩展目录

- [ ] **Step 1: 写入失败的 Manifest 测试**

验证版本为 3、权限列表为空、匹配范围只有两个目标站点、脚本按依赖顺序加载、CSS 和全部图标文件存在。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- --test-name-pattern="manifest"`
Expected: FAIL，原因是 `manifest.json` 尚不存在。

- [ ] **Step 3: 创建 Manifest 和图标**

Manifest 名称为“X 正文一键复制”，只声明两个目标站点的 content script。SVG 使用复制页图形，PNG 通过项目脚本从 SVG 生成四个标准尺寸。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm test -- --test-name-pattern="manifest"`
Expected: 相关测试全部 PASS。

- [ ] **Step 5: 提交本任务**

```bash
git add manifest.json icons scripts/generate-icons.mjs tests/manifest.test.js package.json package-lock.json
git commit -m "feat: package Chrome extension"
```

### Task 4: 完善文档并执行全量验收

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Modify: `docs/superpowers/plans/2026-09-28-x-post-copy-extension.md`

**Interfaces:**
- Produces: 用户可复现的安装、使用、测试和限制说明

- [ ] **Step 1: 编写中文 README**

说明打开 `chrome://extensions`、启用开发者模式、加载当前目录、刷新 X 页面、点击操作栏按钮；同时记录权限、隐私、引用帖子规则、媒体帖子限制及 `npm test` 命令。

- [ ] **Step 2: 运行静态与自动化验证**

Run: `npm test && node --check src/post-content.js && node --check src/content.js && git diff --check`
Expected: 全部命令退出码为 0，测试失败数为 0。

- [ ] **Step 3: 检查完整扩展清单**

Run: `node -e "const m=require('./manifest.json'); console.log(m.manifest_version,m.content_scripts[0].js)"`
Expected: 输出 `3` 以及 `src/post-content.js,src/content.js` 的正确顺序。

- [ ] **Step 4: 更新计划完成状态并提交**

将所有步骤勾选为完成后运行：

```bash
git add README.md .gitignore docs/superpowers/plans/2026-09-28-x-post-copy-extension.md
git commit -m "docs: add extension usage guide"
```
