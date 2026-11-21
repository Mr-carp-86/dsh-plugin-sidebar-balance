/**
 * Sidebar footer balance chip with a details popover.
 *
 * Data path: `ctx.remote.account.getBalance(metadata)` — the very call the
 * official Settings › Account card makes — plus `getState()` for the Platform
 * links the popover offers (usage / top-up). The app mounts `remote.account`
 * at boot, so this bundle needs no Host half, no web route and no raw HTTP: the
 * token, `x-client-*` headers and 401/40003 handling all stay inside DSH.
 *
 * The two Platform actions honour the app's own link destination preference —
 * Settings › General › link opening, the `linkOpening` field of the `ui-chat`
 * settings namespace, read through the shared `configForms` service. `sidebar`
 * opens DSH's right-sidebar Browser tab (`ctx.sidebarRight.openTab('browser',
 * { params: { url } })`), `new-tab` keeps the plain anchor. When the preference
 * cannot be read, the app's own default (`sidebar`) applies.
 */

window.__ModuleLoader__.load({
  id: '@local/sidebar-balance',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    /** Layout read before paint; the test stub only provides useEffect. */
    const useIsoEffect = React.useLayoutEffect === undefined ? React.useEffect : React.useLayoutEffect

    const NAMESPACE = 'sidebar-balance'
    const SLOT = 'sidebar.footer.action'
    const REFRESH_MS = 60000
    const PANEL_WIDTH = 248
    /** The Chat settings namespace owns the app-wide link destination choice. */
    const LINK_SETTINGS_NAMESPACE = 'ui-chat'
    const DEFAULT_LINK_OPENING = 'sidebar'
    /** Platform pages the Desktop shell can host in a native view, by action id. */
    const NATIVE_PAGE_OF = { usage: 'usage', topUp: 'top-up' }

    const dictionaries = {
      en: {
        label: 'Balance',
        panelTitle: 'Account balance',
        loading: 'Reading balance…',
        signedOut: 'Not signed in',
        unavailable: 'Balance unavailable',
        failed: 'Refresh failed, showing the last result',
        balance: 'Balance',
        total: 'Total',
        recharge: 'Topped-up',
        bonus: 'Granted',
        updated: 'Updated',
        refresh: 'Refresh',
        details: 'Balance, usage and top-up',
        usage: 'View usage',
        topUp: 'Top up',
        linkUnavailable: 'Platform link unavailable',
        back: 'Back',
        nativeFailed: 'This page could not open inside the app',
      },
      zh: {
        label: '余额',
        panelTitle: '账户余额',
        loading: '正在读取余额…',
        signedOut: '未登录',
        unavailable: '余额不可用',
        failed: '刷新失败，显示上次结果',
        balance: '余额',
        total: '合计',
        recharge: '充值余额',
        bonus: '赠金余额',
        updated: '更新于',
        refresh: '刷新',
        details: '查看余额、用量与充值',
        usage: '查询用量',
        topUp: '充值',
        linkUnavailable: '暂时取不到平台链接',
        back: '返回',
        nativeFailed: '无法在应用内打开这个平台页面',
      },
    }

    const styleSheet = [
      '.dsb-root{position:relative;flex:none;display:flex;align-items:center;height:42px;margin:8px 0 0;min-width:0}',
      ".dsb-root[data-rail='true']{width:36px;height:36px;margin:0;justify-content:center}",
      '.dsb-chip{box-sizing:border-box;display:inline-flex;align-items:center;gap:5px;max-width:100%;height:26px;padding:0 9px 0 7px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:12px;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap;cursor:pointer;transition:background 120ms ease,border-color 120ms ease,color 120ms ease}',
      "@media (hover:hover){.dsb-chip:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}}",
      '.dsb-chip:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      ".dsb-chip[aria-expanded='true']{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}",
      ".dsb-root[data-rail='true'] .dsb-chip{justify-content:center;gap:0;width:36px;height:36px;padding:0;border-color:transparent;border-radius:50%}",
      '.dsb-icon{flex:none;color:var(--dsw-alias-label-tertiary)}',
      ".dsb-chip:hover .dsb-icon{color:var(--dsw-alias-label-secondary)}",
      '.dsb-amount{min-width:0;overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-primary);font-weight:500}',
      ".dsb-chip[data-phase='loading'] .dsb-amount,",
      ".dsb-chip[data-phase='signedOut'] .dsb-amount,",
      ".dsb-chip[data-phase='unavailable'] .dsb-amount{color:var(--dsw-alias-label-tertiary);font-weight:400}",
      ".dsb-chip[data-phase='failed'] .dsb-amount{color:var(--dsw-alias-state-warn-primary)}",
      ".dsb-chip[data-busy='true'] .dsb-icon{animation:dsb-pulse 1.2s ease-in-out infinite}",
      '@keyframes dsb-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
      '@media (prefers-reduced-motion:reduce){.dsb-chip{transition:none}.dsb-chip[data-busy="true"] .dsb-icon{animation:none}}',
      /* Fixed so the sidebar's overflow clip cannot cut the surface; offsets are
         measured from the trigger before paint, like the Cordis footer panel. */
      '.dsb-panel{position:fixed;isolation:isolate;z-index:30;display:flex;flex-direction:column;width:248px;max-width:calc(100vw - 16px);border:0;border-radius:12px;--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:12px;text-align:left}',
      ".dsb-panel::before{position:absolute;z-index:-1;inset:0;border-radius:inherit;background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);content:'';pointer-events:none}",
      '.dsb-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 8px 2px 12px}',
      '.dsb-panel-title{font-size:12px;font-weight:500;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.dsb-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}',
      '@media (hover:hover){.dsb-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}}',
      '.dsb-icon-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      ".dsb-icon-btn[data-busy='true']{animation:dsb-pulse 1.2s ease-in-out infinite}",
      '.dsb-panel-body{display:flex;flex-direction:column;gap:6px;padding:6px 12px 10px}',
      '.dsb-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;line-height:20px}',
      '.dsb-row[data-strong="true"] .dsb-row-label,.dsb-row[data-strong="true"] .dsb-row-value{color:var(--dsw-alias-label-primary);font-weight:500}',
      '.dsb-row-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}',
      '.dsb-row-value{flex:none;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '.dsb-divider{height:1px;margin:2px 0;background:var(--dsw-alias-border-l4)}',
      '.dsb-note{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-caption)}',
      ".dsb-note[data-tone='error']{color:var(--dsw-alias-state-error-primary)}",
      '.dsb-actions{display:flex;gap:8px;padding:8px 12px 10px;border-top:1px solid var(--dsw-alias-border-l4)}',
      '.dsb-action{box-sizing:border-box;flex:1;display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:12px;line-height:16px;text-decoration:none;white-space:nowrap;cursor:pointer}',
      '@media (hover:hover){.dsb-action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}}',
      '.dsb-action:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.dsb-action.primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-on-color)}',
      "@media (hover:hover){.dsb-action.primary:hover{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-on-color);opacity:.9}}",
      ".dsb-action[aria-disabled='true']{opacity:.5;cursor:default;pointer-events:none}",
      '.dsb-native{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);-webkit-app-region:no-drag}',
      '.dsb-native-head{flex:none;display:flex;align-items:center;height:44px;padding:0 12px;border-bottom:1px solid var(--dsw-alias-border-l3);-webkit-app-region:no-drag}',
      '.dsb-native-back{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px 0 6px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;cursor:pointer;-webkit-app-region:no-drag}',
      '@media (hover:hover){.dsb-native-back:hover{background:var(--dsw-alias-interactive-bg-hover)}}',
      '.dsb-native-viewport{position:relative;flex:1;min-height:0}',
      '.dsb-native-note{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px}',
    ].join('\n')

    /** The app's own account namespace, resolved lazily: another plugin mounts it. */
    function resolveAccount(ctx) {
      try {
        const remote = ctx.remote
        const nested = remote === undefined || remote === null ? undefined : remote.account
        if (nested !== undefined && nested !== null && typeof nested.getBalance === 'function') return nested
      } catch (error) {
        /* fall through to the explicit lookup */
      }
      try {
        const direct = ctx.get('remote.account')
        if (direct !== undefined && direct !== null && typeof direct.getBalance === 'function') return direct
      } catch (error) {
        /* the namespace is not mounted in this build */
      }
      return undefined
    }

    function clientMetadata(locale) {
      const boot = window.__DSH_BOOT__
      const release = boot === undefined || boot === null ? undefined : boot.release
      const version = release === undefined || release === null || typeof release.version !== 'string' || release.version === ''
        ? 'unknown'
        : release.version
      return {
        version,
        locale: typeof locale === 'string' && locale !== '' ? locale : 'en_US',
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      }
    }

    function errorText(error) {
      if (error === undefined || error === null) return ''
      const text = typeof error === 'string' ? error : String(error.message === undefined ? error : error.message)
      return text.length > 120 ? text.slice(0, 120) + '…' : text
    }

    /** A refused call arrives as `{ ok: false, error }`; dig out the reason. */
    function failureText(result) {
      if (result !== undefined && result !== null && typeof result === 'object' && result.error !== undefined) {
        return errorText(result.error)
      }
      return errorText(result)
    }

    /** Only absolute Platform URLs are rendered as links; anything else stays inert. */
    function absoluteUrl(value) {
      if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return ''
      return value
    }

    /** The account state carries the Platform destinations the popover offers. */
    function readLinks(state) {
      const links = state === undefined || state === null ? undefined : state.links
      if (links === undefined || links === null) return { usage: '', topUp: '' }
      return { usage: absoluteUrl(links.usageUrl), topUp: absoluteUrl(links.topUpUrl) }
    }

    /**
     * Decimal string -> exact integer cents, truncating beyond two decimals the
     * way the official card does. Values that are non-zero yet smaller than one
     * cent carry `tiny`, so `0.004` can still render as `<¥0.01` instead of
     * collapsing to `¥0.00`.
     */
    function toCents(text) {
      const matched = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(text === undefined || text === null ? '' : text).trim())
      if (matched === null) return undefined
      const fraction = matched[3] === undefined ? '' : matched[3]
      const cents = Number(matched[2]) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2))
      const negative = matched[1] === '-'
      return {
        cents: negative ? -cents : cents,
        tiny: cents === 0 && /[1-9]/.test(fraction),
        negative,
      }
    }

    function money(cents, tiny, negative) {
      return { cents, tiny: tiny === true, negative: negative === true }
    }
    const zeroMoney = money(0, false, false)

    function addMoney(left, right) {
      const cents = left.cents + right.cents
      if (cents !== 0) return money(cents, false, false)
      return money(0, left.tiny || right.tiny, left.negative || right.negative)
    }

    function groupThousands(whole) {
      return Number(whole).toLocaleString()
    }

    /** Mirrors the official formatBalance(): 0, negative, below one cent, thousands, two decimals. */
    function formatMoney(value, symbol) {
      if (value === undefined || !Number.isFinite(value.cents)) return symbol + '—'
      if (value.cents === 0) {
        if (!value.tiny) return symbol + '0.00'
        if (value.negative) return '-' + symbol + '0.01'
        return '<' + symbol + '0.01'
      }
      const magnitude = Math.abs(value.cents)
      const body = groupThousands(Math.trunc(magnitude / 100)) + '.' + String(magnitude % 100).padStart(2, '0')
      return (value.cents < 0 ? '-' + symbol : symbol) + body
    }

    /**
     * Collapse the platform's two wallets (recharge + bonus) into one figure.
     * A fresh account usually carries bonus credit only, which is still a
     * perfectly good balance — never treat it as missing.
     */
    function totalWallet(balance) {
      const entries = []
      const add = (list, bonus) => {
        if (!Array.isArray(list)) return
        for (const wallet of list) {
          if (wallet === undefined || wallet === null) continue
          const currency = wallet.currency === 'USD' ? 'USD' : 'CNY'
          const value = toCents(wallet.balance)
          if (value === undefined) continue
          entries.push({ currency, value, bonus })
        }
      }
      add(balance.value, false)
      add(balance.bonusWallets, true)
      if (entries.length === 0) return null
      const currency = entries.some((entry) => entry.currency === 'CNY')
        ? 'CNY'
        : (entries.find((entry) => entry.currency === 'USD') === undefined ? 'CNY' : 'USD')
      const picked = entries.filter((entry) => entry.currency === currency)
      let recharge = zeroMoney
      let bonus = zeroMoney
      for (const entry of picked) {
        if (entry.bonus) bonus = addMoney(bonus, entry.value)
        else recharge = addMoney(recharge, entry.value)
      }
      return {
        currency,
        symbol: currency === 'CNY' ? '¥' : '$',
        recharge,
        bonus,
        total: addMoney(recharge, bonus),
      }
    }

    function clockText(at) {
      try {
        return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } catch (error) {
        return ''
      }
    }

    function chipText(view) {
      if (view.wallet !== null && (view.phase === 'ready' || view.phase === 'failed')) {
        return formatMoney(view.wallet.total, view.wallet.symbol)
      }
      if (view.phase === 'loading') return '…'
      return '—'
    }

    function chipTitle(view, t) {
      const parts = []
      if (view.wallet !== null) {
        parts.push(t('balance') + ' ' + formatMoney(view.wallet.total, view.wallet.symbol))
      } else if (view.phase === 'loading') {
        parts.push(t('loading'))
      } else if (view.phase === 'signedOut') {
        parts.push(t('signedOut'))
      } else if (view.phase === 'unavailable') {
        parts.push(t('unavailable'))
      }
      if (view.phase === 'failed') {
        parts.push(t('failed') + (view.error === '' ? '' : ' — ' + view.error))
      }
      parts.push(t('details'))
      return parts.join(' · ')
    }

    function WalletIcon(props) {
      const size = props.size
      return h(
        'svg',
        {
          className: 'dsb-icon',
          width: size,
          height: size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('rect', { key: 'body', x: 2, y: 4.2, width: 12, height: 8.6, rx: 2.2 }),
        h('path', { key: 'line', d: 'M2 6.8h12' }),
        h('circle', { key: 'dot', cx: 10.6, cy: 9.6, r: 0.95, fill: 'currentColor', stroke: 'none' }),
      )
    }

    function RefreshIcon(props) {
      return h(
        'svg',
        {
          width: props.size,
          height: props.size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('path', { key: 'arc', d: 'M12.9 8a4.9 4.9 0 1 1-1.44-3.47' }),
        h('path', { key: 'tip', d: 'M12.95 2.6v3.2h-3.2' }),
      )
    }

    function BackIcon(props) {
      return h(
        'svg',
        {
          width: props.size,
          height: props.size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('path', { key: 'chevron', d: 'M10 3.5 5.5 8 10 12.5' }),
      )
    }

    /**
     * The app's link destination preference, read from the shared settings
     * form the Chat plugin owns. Both services are looked up optionally: an
     * older build without them keeps the app's own default.
     */
    function readLinkOpening(ctx) {
      try {
        const forms = ctx.get('configForms')
        if (forms === undefined || forms === null || typeof forms.get !== 'function') return DEFAULT_LINK_OPENING
        const form = forms.get(LINK_SETTINGS_NAMESPACE)
        if (form === undefined || form === null || typeof form.getSnapshot !== 'function') return DEFAULT_LINK_OPENING
        const snapshot = form.getSnapshot()
        const value = snapshot === undefined || snapshot === null ? undefined : snapshot.value
        const opening = value === undefined || value === null ? undefined : value.linkOpening
        return opening === 'sidebar' || opening === 'new-tab' ? opening : DEFAULT_LINK_OPENING
      } catch (error) {
        return DEFAULT_LINK_OPENING
      }
    }

    /** Whether the right sidebar can host a Browser page at all. */
    function browserPageRegistered(ctx) {
      try {
        const tabs = ctx.get('sidebarRightTabs')
        if (tabs === undefined || tabs === null || typeof tabs.get !== 'function') return true
        return tabs.get('browser') !== undefined && tabs.get('browser') !== null
      } catch (error) {
        return true
      }
    }

    /**
     * Open a Platform page in DSH's own right-sidebar Browser tab (the pick of
     * `@deepseek-ai/dsh-client-ui-sidebar-browser`, kind `browser`, whose
     * navigation params are `{ url }`). Returns false when this build has no
     * right sidebar or no Browser page, so the caller keeps the plain <a>.
     */
    function openInSidebar(ctx, url) {
      try {
        const right = ctx.get('sidebarRight')
        if (right === undefined || right === null || typeof right.openTab !== 'function') return false
        right.openTab('browser', { params: { url } })
        return true
      } catch (error) {
        return false
      }
    }

    /**
     * Send an external link where the user's own setting points: the Sidebar
     * Browser, or the plain anchor that opens a new tab. Returning false always
     * leaves the click to the browser, which is why the anchor stays intact.
     */
    function openExternalLink(ctx, url) {
      if (readLinkOpening(ctx) !== 'sidebar') return false
      if (!browserPageRegistered(ctx)) return false
      return openInSidebar(ctx, url)
    }

    /** Last resort when the shell refuses the native view. */
    function fallbackOpen(ctx, url) {
      if (url === '') return
      if (openExternalLink(ctx, url)) return
      try {
        window.open(url, '_blank', 'noopener,noreferrer')
      } catch (error) {
        /* nothing else to try */
      }
    }

    /**
     * The Desktop shell's native Platform view: the Electron main process hosts
     * the real (signed-in) Platform page in its own WebContentsView, which is
     * added on top of this window at the bounds we report. Absent in a plain
     * browser, where only the account package's own overlay has it.
     */
    function nativePlatform() {
      try {
        const bridge = typeof window === 'undefined' ? undefined : window.dshPlatform
        if (bridge === undefined || bridge === null) return undefined
        if (typeof bridge.open !== 'function' || typeof bridge.close !== 'function') return undefined
        return bridge
      } catch (error) {
        return undefined
      }
    }

    /** Bounds the shell needs: whole CSS pixels, never negative. */
    function viewportBounds(node) {
      const rect = node.getBoundingClientRect()
      return {
        x: Math.max(0, Math.round(rect.left)),
        y: Math.max(0, Math.round(rect.top)),
        width: Math.max(0, Math.round(rect.width)),
        height: Math.max(0, Math.round(rect.height)),
      }
    }

    /** One Platform action: a link when the account supplied its URL, inert text otherwise. */
    function actionLink(key, label, href, primary, t, onNavigate, openInside) {
      const className = primary ? 'dsb-action primary' : 'dsb-action'
      if (href === '') {
        return h('span', { key, className, 'aria-disabled': 'true', title: t('linkUnavailable') }, label)
      }
      return h(
        'a',
        {
          key,
          className,
          href,
          target: '_blank',
          rel: 'noreferrer',
          onClick: function (event) {
            if (openInside(key, href)) {
              if (event !== undefined && event !== null && typeof event.preventDefault === 'function') {
                event.preventDefault()
              }
            }
            if (typeof onNavigate === 'function') onNavigate()
          },
        },
        label,
      )
    }

    function createChip(ctx) {
      const t = ctx.locale.bind(NAMESPACE)
      return function SidebarBalanceChip(props) {
        const wide = props === undefined || props === null || props.wide !== false
        const [view, setView] = React.useState({ phase: 'loading', wallet: null, at: 0, error: '' })
        const [links, setLinks] = React.useState({ usage: '', topUp: '' })
        const [open, setOpen] = React.useState(false)
        const [anchor, setAnchor] = React.useState(undefined)
        const mounted = React.useRef(true)
        const busy = React.useRef(false)
        const linksBusy = React.useRef(false)
        const rootRef = React.useRef(null)
        /** Set while the shell hosts a native Platform page over this window. */
        const [native, setNative] = React.useState(null)
        const [nativeStatus, setNativeStatus] = React.useState('idle')
        const viewportRef = React.useRef(null)

        const load = React.useCallback(function () {
          if (busy.current) return
          busy.current = true
          const account = resolveAccount(ctx)
          if (account === undefined) {
            busy.current = false
            if (mounted.current) setView({ phase: 'unavailable', wallet: null, at: 0, error: '' })
            return
          }
          const fail = (error) => {
            busy.current = false
            if (!mounted.current) return
            setView((previous) => ({ phase: 'failed', wallet: previous.wallet, at: previous.at, error: errorText(error) }))
          }
          let pending
          try {
            pending = account.getBalance(clientMetadata(ctx.locale.getSnapshot().active))
          } catch (error) {
            fail(error)
            return
          }
          Promise.resolve(pending).then((result) => {
            busy.current = false
            if (!mounted.current) return
            if (result === undefined || result === null || result.ok !== true) {
              setView((previous) => ({ phase: 'failed', wallet: previous.wallet, at: previous.at, error: failureText(result) }))
              return
            }
            const balance = result.value
            if (balance === undefined || balance === null) {
              setView({ phase: 'signedOut', wallet: null, at: Date.now(), error: '' })
              return
            }
            if (balance.status !== 'ready') {
              setView((previous) => ({ phase: 'failed', wallet: previous.wallet, at: previous.at, error: 'status ' + String(balance.status) }))
              return
            }
            const wallet = totalWallet(balance)
            if (wallet === null) {
              setView((previous) => ({ phase: 'failed', wallet: previous.wallet, at: previous.at, error: 'no wallet' }))
              return
            }
            setView({ phase: 'ready', wallet, at: Date.now(), error: '' })
          }, fail)
        }, [])

        /** The Platform destinations come from the account view, never hardcoded. */
        const loadLinks = React.useCallback(function () {
          if (linksBusy.current) return
          const account = resolveAccount(ctx)
          if (account === undefined || typeof account.getState !== 'function') return
          linksBusy.current = true
          let pending
          try {
            pending = account.getState()
          } catch (error) {
            linksBusy.current = false
            return
          }
          Promise.resolve(pending).then((result) => {
            linksBusy.current = false
            if (!mounted.current) return
            if (result === undefined || result === null || result.ok !== true) return
            const next = readLinks(result.value)
            if (next.usage === '' && next.topUp === '') return
            setLinks((previous) => {
              if (previous.usage === next.usage && previous.topUp === next.topUp) return previous
              return next
            })
          }, function () {
            linksBusy.current = false
          })
        }, [])

        React.useEffect(function () {
          mounted.current = true
          load()
          loadLinks()
          const timer = window.setInterval(function () {
            if (document.visibilityState === 'visible') load()
          }, REFRESH_MS)
          const onVisibility = function () {
            if (document.visibilityState === 'visible') {
              load()
              loadLinks()
            }
          }
          document.addEventListener('visibilitychange', onVisibility)
          return function () {
            mounted.current = false
            window.clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisibility)
          }
        }, [])

        /* The panel is fixed and hugs the trigger through a measured offset. */
        useIsoEffect(function () {
          if (!open) return undefined
          const place = function () {
            const node = rootRef.current
            if (node === null || node === undefined) return
            const rect = node.getBoundingClientRect()
            const maxLeft = Math.max(8, window.innerWidth - PANEL_WIDTH - 8)
            setAnchor({
              left: Math.min(Math.max(8, rect.left), maxLeft),
              bottom: window.innerHeight - rect.top + 8,
            })
          }
          place()
          window.addEventListener('resize', place)
          return function () {
            window.removeEventListener('resize', place)
          }
        }, [open])

        /* Nothing in the primitive package is reachable here, so dismissal is ours. */
        React.useEffect(function () {
          if (!open) return undefined
          const onPointer = function (event) {
            const node = rootRef.current
            if (node !== null && node !== undefined && typeof node.contains === 'function'
              && node.contains(event.target)) return
            setOpen(false)
          }
          const onKey = function (event) {
            if (event.key === 'Escape') setOpen(false)
          }
          document.addEventListener('pointerdown', onPointer, true)
          document.addEventListener('keydown', onKey)
          return function () {
            document.removeEventListener('pointerdown', onPointer, true)
            document.removeEventListener('keydown', onKey)
          }
        }, [open])

        const toggle = function () {
          setOpen(function (value) {
            const next = !value
            if (next) {
              load()
              loadLinks()
            }
            return next
          })
        }

        const title = chipTitle(view, t)
        const closeOnNavigate = function () {
          setOpen(false)
        }
        /**
         * Prefer the Desktop shell's native Platform view (the signed-in page),
         * then the app's own link-opening preference, then the plain anchor.
         */
        const openInside = function (key, url) {
          const page = NATIVE_PAGE_OF[key]
          if (page !== undefined && nativePlatform() !== undefined) {
            setNative({ page, url })
            return true
          }
          return openExternalLink(ctx, url)
        }

        // Hand the viewport rectangle to the shell so its native view lands here.
        useIsoEffect(function () {
          if (native === null) return undefined
          const bridge = nativePlatform()
          const node = viewportRef.current
          if (bridge === undefined || node === null || node === undefined) {
            setNative(null)
            return undefined
          }
          let closed = false
          const bounds = function () {
            return viewportBounds(node)
          }
          setNativeStatus('loading')
          let opened
          try {
            opened = bridge.open(native.page, bounds())
          } catch (error) {
            opened = undefined
          }
          if (opened !== undefined && opened !== null && typeof opened.then === 'function') {
            opened.then(function () {
              if (!closed) setNativeStatus('ready')
            }, function () {
              if (closed) return
              closed = true
              setNative(null)
              fallbackOpen(ctx, native.url)
            })
          } else if (opened === undefined) {
            setNative(null)
            fallbackOpen(ctx, native.url)
          } else {
            setNativeStatus('ready')
          }
          const sync = function () {
            try {
              bridge.setBounds(bounds())
            } catch (error) {
              /* the shell reports its own failures */
            }
          }
          let observer
          try {
            if (typeof ResizeObserver !== 'undefined') {
              observer = new ResizeObserver(sync)
              observer.observe(node)
            }
          } catch (error) {
            observer = undefined
          }
          window.addEventListener('resize', sync)
          return function () {
            closed = true
            if (observer !== undefined && observer !== null) observer.disconnect()
            window.removeEventListener('resize', sync)
            try {
              const closing = bridge.close()
              if (closing !== undefined && closing !== null && typeof closing.catch === 'function') {
                closing.catch(function () {})
              }
            } catch (error) {
              /* closing is best effort */
            }
          }
        }, [native])

        React.useEffect(function () {
          if (native === null) return undefined
          const onKey = function (event) {
            if (event.key === 'Escape') setNative(null)
          }
          document.addEventListener('keydown', onKey)
          return function () {
            document.removeEventListener('keydown', onKey)
          }
        }, [native])

        const rows = []
        if (view.wallet !== null) {
          rows.push(h('div', { key: 'recharge', className: 'dsb-row' },
            h('span', { key: 'l', className: 'dsb-row-label' }, t('recharge')),
            h('span', { key: 'v', className: 'dsb-row-value' }, formatMoney(view.wallet.recharge, view.wallet.symbol)),
          ))
          if (view.wallet.bonus.cents !== 0 || view.wallet.bonus.tiny) {
            rows.push(h('div', { key: 'bonus', className: 'dsb-row' },
              h('span', { key: 'l', className: 'dsb-row-label' }, t('bonus')),
              h('span', { key: 'v', className: 'dsb-row-value' }, formatMoney(view.wallet.bonus, view.wallet.symbol)),
            ))
          }
          rows.push(h('div', { key: 'divider', className: 'dsb-divider' }))
          rows.push(h('div', { key: 'total', className: 'dsb-row', 'data-strong': 'true' },
            h('span', { key: 'l', className: 'dsb-row-label' }, t('total')),
            h('span', { key: 'v', className: 'dsb-row-value' }, formatMoney(view.wallet.total, view.wallet.symbol)),
          ))
        } else if (view.phase === 'loading') {
          rows.push(h('p', { key: 'loading', className: 'dsb-note' }, t('loading')))
        } else if (view.phase === 'signedOut') {
          rows.push(h('p', { key: 'out', className: 'dsb-note' }, t('signedOut')))
        } else if (view.phase === 'unavailable') {
          rows.push(h('p', { key: 'na', className: 'dsb-note' }, t('unavailable')))
        }
        if (view.phase === 'failed' && view.error !== '') {
          rows.push(h('p', { key: 'error', className: 'dsb-note', 'data-tone': 'error' }, view.error))
        }
        if (view.at > 0) {
          rows.push(h('p', { key: 'at', className: 'dsb-note' }, t('updated') + ' ' + clockText(view.at)))
        }

        return h(
          'div',
          {
            ref: rootRef,
            className: 'dsb-root',
            'data-rail': wide ? 'false' : 'true',
            'data-slot': SLOT,
          },
          h('style', { key: 'style' }, styleSheet),
          open && anchor !== undefined
            ? h(
              'section',
              {
                key: 'panel',
                className: 'dsb-panel',
                role: 'dialog',
                'aria-label': t('panelTitle'),
                'data-testid': 'sidebar-balance-panel',
                style: anchor,
              },
              h('div', { key: 'head', className: 'dsb-panel-head' },
                h('span', { key: 'title', className: 'dsb-panel-title' }, t('panelTitle')),
                h('button', {
                  key: 'refresh',
                  type: 'button',
                  className: 'dsb-icon-btn',
                  title: t('refresh'),
                  'aria-label': t('refresh'),
                  'data-busy': view.phase === 'loading' ? 'true' : 'false',
                  onClick: function () {
                    load()
                    loadLinks()
                  },
                }, h(RefreshIcon, { size: 14 })),
              ),
              h('div', { key: 'body', className: 'dsb-panel-body' }, rows),
              h('div', { key: 'actions', className: 'dsb-actions' },
                actionLink('usage', t('usage'), links.usage, false, t, closeOnNavigate, openInside),
                actionLink('topUp', t('topUp'), links.topUp, true, t, closeOnNavigate, openInside),
              ),
            )
            : null,
          native === null
            ? null
            : h(
              'div',
              {
                key: 'native',
                className: 'dsb-native',
                role: 'dialog',
                'aria-modal': 'true',
                'aria-label': native.page === 'top-up' ? t('topUp') : t('usage'),
                'data-testid': 'sidebar-balance-native',
              },
              h('div', { key: 'head', className: 'dsb-native-head' },
                h('button', {
                  key: 'back',
                  type: 'button',
                  className: 'dsb-native-back',
                  onClick: function () {
                    setNative(null)
                  },
                }, h(BackIcon, { size: 14 }), t('back')),
              ),
              h('div', { key: 'viewport', ref: viewportRef, className: 'dsb-native-viewport' },
                nativeStatus === 'loading'
                  ? h('p', { key: 'loading', className: 'dsb-native-note' }, t('loading'))
                  : null,
              ),
            ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsb-chip',
              title: title,
              'aria-label': title,
              'aria-expanded': open ? 'true' : 'false',
              'aria-haspopup': 'dialog',
              'data-phase': view.phase,
              'data-busy': view.phase === 'loading' ? 'true' : 'false',
              'data-testid': 'sidebar-balance',
              onClick: toggle,
            },
            h(WalletIcon, { key: 'icon', size: wide ? 14 : 16 }),
            wide ? h('span', { key: 'amount', className: 'dsb-amount' }, chipText(view)) : null,
          ),
        )
      }
    }

    return {
      inject: ['slots', 'locale', 'remote'],
      apply(ctx) {
        ctx.effect(function () {
          const dispose = ctx.locale.register(NAMESPACE, dictionaries)
          return typeof dispose === 'function' ? dispose : undefined
        }, 'sidebar-balance/locale')

        const Chip = createChip(ctx)
        ctx.slots.inject(SLOT, function () {
          return ctx.slots.register(
            {
              name: SLOT,
              id: 'sidebar-balance',
              order: 50,
              locale: NAMESPACE,
              label: function () {
                return ctx.locale.bind(NAMESPACE)('label')
              },
            },
            Chip,
          )
        })
      },
    }
  },
})
