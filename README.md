# DSH 侧栏余额（@local/sidebar-balance）

在 [DeepSeek Harness](https://github.com/deepseek-ai) Web GUI 的**侧栏左下角**常驻显示 DeepSeek 账户余额；点开胶囊是一张明细面板，「查询用量 / 充值」一键直达，桌面版直接带登录态。

> 这是一个本地插件（bundle），不进 npm，靠 DSH 的 `plugin_manager` 以 `file:` 软链方式安装。

## 它长什么样

- **胶囊**：钱包图标 + 余额，位置在「设置」行正上方、与头像左边缘对齐；侧栏折叠成 56px rail 时只留一个 36×36 圆形图标。
- **面板**：充值余额、赠金余额（非零才显示）、合计、更新时间、刷新按钮，底部是「查询用量」「充值」两个动作。
- 金额格式复刻官方账号卡片：`0 → ¥0.00`、`0 < v < 0.01 → <¥0.01`、负数带 `-`、千分位、向下截断两位；币种跟着钱包走（`CNY → ¥`、`USD → $`）。

```
┌──────────────────────────┐
│ 账户余额              ⟳  │
│ 充值余额           ¥5.49 │
│ ──────────────────────── │
│ 合计               ¥5.49 │
│ 更新于 13:19             │
├──────────────────────────┤
│  查询用量  │    充值     │
└──────────────────────────┘
        [ 🪙 ¥5.49 ]
```

## 两个动作的打开顺序

1. **桌面版（Electron 壳）**：`window.dshPlatform.open('usage' | 'top-up', bounds)` —— 与官方「设置 › 账号与余额」完全同一条原生通道（按账号持久化的独立分区 + 请求头注入 + bootstrap token），所以**打开就是已登录状态**，不会落到登录页。全窗口浮层，顶部「返回」按钮或 Esc 关闭。
2. **没有桌面壳**（用普通浏览器打开 Web GUI）：按 DSH 自己的设置「设置 › 通用 › 网页链接默认打开方式」执行 —— `应用内侧边栏` 走侧栏内置 Browser 标签，`默认浏览器` 走普通新标签。
3. **都不可用**：保留 `<a target="_blank" rel="noreferrer">` 的原生行为，链接永远可点。

三档都是"失败自动降档"，不会出现点了没反应。

## 安装

在 DSH 会话里让助手执行（或自己调插件管理工具）：

```
plugin_manager { action: "install_bundle", target: "<本仓库绝对路径>" }
```

装完**刷新页面**（客户端 bundle 没有 HMR）。卸载同理：`remove_bundle`。想换安装目录，必须**先 remove_bundle 再 install_bundle**——同名同版本会被判为 `already-installed`，它不比较来源路径。

## 数据来源

全部走 DSH 自己的客户端远端服务，不自己拼 HTTP：

| 用途 | 调用 | 返回 |
|---|---|---|
| 余额 | `ctx.remote.account.getBalance({ version, locale, timezoneOffsetSeconds })` | `{ ok: true, value: { status: 'ready', value: [...], bonusWallets: [...] } }` |
| 平台链接 | `ctx.remote.account.getState()` | `{ links: { usageUrl, topUpUrl } }` |

`version` 取自 `window.__DSH_BOOT__.release.version`（缺失时回 `unknown`），平台侧只把它当请求头用，不做校验。

钱包是拆开的：`value` = 充值余额，`bonusWallets` = 赠金余额。**"充值 0、只有赠金"是正常账户**，不能当失败处理；合计按整数分累加，避免浮点误差少一分。

## 依赖哪些 DSH 内部能力

全部当**可选依赖**用（`ctx.get(...)` + `typeof fn === 'function'` + try/catch），任何一项缺失都只是降级，不会让插件不加载：

| 服务 / 全局 | 用途 | 缺失时 |
|---|---|---|
| `slots` / `locale` / `remote` | 注册槽位、文案、取余额 | 必需（写进 `inject`） |
| `window.dshPlatform` | 原生平台视图 | 走链接设置 |
| `configForms` + `ui-chat.linkOpening` | 读"网页链接默认打开方式" | 用默认 `sidebar` |
| `sidebarRight` / `sidebarRightTabs` | 侧栏内置 Browser 标签 | 走普通新标签 |

注册的槽位是 `sidebar.footer.action`（kind `list`、scope `root`），注册 `id: 'sidebar-balance'`、`order: 50`。

## 文件结构

| 文件 | 作用 |
|---|---|
| `package.json` | bundle 清单：`dsh.bundle.patch` + `dsh.client{platform:'web', immediately:true}` |
| `cordis.patch.yml` | 往宿主 loader 里插入 `sidebar-balance` 一行 |
| `index.js` | Host 半，空的 `apply()` —— 一切在客户端做，Host 半刻意不 inject 任何可选服务 |
| `client.js` | 全部逻辑：余额取数、胶囊、面板、原生视图、链接降级 |
| `icon.svg` | 插件图标（钱包，`#4D6BFE`） |
| `locale/zh.json`、`locale/en.json` | 插件管理里的展示名与描述 |

## 已知限制

- **只有桌面版能用原生视图**；普通浏览器里这个插件仍然能显示余额，但两个动作只能按链接设置打开。
- 原生视图打开期间，键盘焦点在那个 `WebContentsView` 里 —— `Ctrl+R` 之类发给平台页而不是 DSH，想刷新 DSH 得先点「返回」。
- 侧栏内置 Browser 是**独立 webview**，没有平台登录态，平台页会落在 `sign_in`；这就是为什么要优先走原生通道。
- 主题色只取 `--dsw-alias-*` 这组 token，跟随宿主深浅色；没有自己画一套配色。

## English summary

A small DSH (DeepSeek Harness) sidebar plugin: shows your DeepSeek account balance as a chip at the bottom-left of the sidebar. Clicking it opens a panel with recharge/bonus breakdown and two actions (usage / top-up). On the desktop shell the actions go through the app's own native platform view (`window.dshPlatform.open`), so they open already signed in; in a plain browser they follow DSH's own link-opening setting, and finally fall back to a normal link. Balance is read through `ctx.remote.account` — no own HTTP stack. Install with `plugin_manager install_bundle` and reload the page.

## License

MIT
