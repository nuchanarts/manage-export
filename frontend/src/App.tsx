import { useState, useRef, useCallback, useEffect } from 'react'
import { ValidatePage } from './pages/ValidatePage'
import { DashboardPage } from './pages/DashboardPage'
import { BasicConfigPage } from './pages/BasicConfigPage'
import { EClaimConfigPage } from './pages/EClaimConfigPage'
import { DrugCatalogPage } from './pages/DrugCatalogPage'
import { NhsoLinksPage } from './pages/NhsoLinksPage'
import { HelpPage } from './pages/HelpPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { GlobalSearchPage } from './pages/GlobalSearchPage'
import { SnapshotsPage } from './pages/SnapshotsPage'
import { THEMES, getStoredTheme, storeTheme } from './theme/theme'
import { getOrCreateClientId } from './utils/clientId'
import { onNavigate } from './data/appNav'
import { LoginPage } from './pages/LoginPage'
import { getAuth, clearAuth, initAxiosAuth } from './data/auth'

type MenuKey = 'dashboard' | 'validate' | 'basic-config' | 'eclaim-config' | 'drug-catalog' | 'nhso-links' | 'help' | 'knowledge' | 'global-search' | 'snapshots' | 'chi-link'

interface NavItem {
  key: MenuKey
  icon: string
  label: string
  sublabel?: string
  ready: boolean
  children?: NavItem[]
  href?: string   // if set, the item is an external link (opens in a new tab)
}

const NAV: NavItem[] = [
  {
    key: 'validate',   // group header — uses children
    icon: '✅',
    label: 'ตรวจสอบข้อมูล',
    ready: true,
    children: [
      {
        key: 'dashboard',
        icon: '📊',
        label: 'ภาพรวมความครบถ้วน',
        sublabel: 'สรุปก่อนส่งออก 43 แฟ้ม',
        ready: true,
      },
      {
        key: 'validate',
        icon: '📋',
        label: 'ตรวจสอบ 43 แฟ้ม',
        sublabel: 'ตรวจสอบความถูกต้องข้อมูล 43 แฟ้ม',
        ready: true,
      },
    ],
  },
  {
    key: 'basic-config',   // group header — uses children
    icon: '⚙️',
    label: 'ตั้งค่าข้อมูลพื้นฐาน',
    ready: true,
    children: [
      {
        key: 'global-search',
        icon: '🔎',
        label: 'ค้นหาข้ามหมวด',
        sublabel: 'หารหัส/ชื่อทุกหมวด',
        ready: true,
      },
      {
        key: 'basic-config',
        icon: '🗂️',
        label: 'ตั้งค่าข้อมูลพื้นฐาน 43 แฟ้ม',
        sublabel: 'จับคู่รหัสส่งออก 43 แฟ้ม',
        ready: true,
      },
      {
        key: 'eclaim-config',
        icon: '💳',
        label: 'ตั้งค่าข้อมูลพื้นฐาน ส่ง E-Claim',
        sublabel: 'สิทธิ, คลินิก, ยา, ค่าบริการ',
        ready: true,
      },
      {
        key: 'drug-catalog',
        icon: '💊',
        label: 'Drug Catalog Export',
        sublabel: 'ส่งออกแคตตาล็อกยา',
        ready: true,
      },
      {
        key: 'snapshots',
        icon: '🗄️',
        label: 'เวอร์ชัน/สแน็ปช็อต',
        sublabel: 'บันทึก/กู้คืน mapping',
        ready: true,
      },
    ],
  },
  {
    key: 'nhso-links',   // group header — uses children
    icon: '📚',
    label: 'ลิงก์ & ช่วยเหลือ',
    ready: true,
    children: [
      {
        key: 'nhso-links',
        icon: '🔗',
        label: 'ลิงก์บริการ สปสช.',
        sublabel: 'รวมลิงก์งานจัดเก็บรายได้',
        ready: true,
      },
      {
        key: 'help',
        icon: '❓',
        label: 'ช่วยเหลือ',
        sublabel: 'คู่มือการใช้งาน',
        ready: true,
      },
      {
        key: 'knowledge',
        icon: '📖',
        label: 'คลังความรู้',
        sublabel: 'ถาม-ตอบ 43 แฟ้ม',
        ready: true,
      },
      {
        key: 'chi-link',
        icon: '🔗',
        label: 'ลิงก์บริการ สกส.',
        sublabel: 'CHI (chi.or.th)',
        ready: true,
        href: 'https://www.chi.or.th/',
      },
    ],
  },
]

function SidebarItem({
  item,
  activeMenu,
  setActiveMenu,
  depth = 0,
}: {
  item: NavItem
  activeMenu: MenuKey
  setActiveMenu: (k: MenuKey) => void
  depth?: number
}) {
  const hasChildren = item.children && item.children.length > 0
  const isChildActive = hasChildren && item.children!.some(c => c.key === activeMenu && c.ready)
  const [open, setOpen] = useState(isChildActive || true)

  if (hasChildren) {
    return (
      <div>
        {/* Parent row */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
        >
          <span className="text-base shrink-0">{item.icon}</span>
          <span className="flex-1 text-sm font-semibold text-gray-600">{item.label}</span>
          <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        </button>

        {/* Children */}
        {open && (
          <div className="border-l-2 border-gray-100 ml-6 mr-2 mb-1">
            {item.children!.map((child, i) => (
              <SidebarItem key={i} item={child} activeMenu={activeMenu} setActiveMenu={setActiveMenu} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = item.key === activeMenu && item.ready
  const innerContent = (
    <>
      <span className="text-sm shrink-0 mt-0.5">{item.icon}</span>
      <div className="min-w-0">
        <p className={`text-sm leading-snug ${isActive ? 'font-semibold text-blue-800' : 'font-medium text-gray-700'}`}>
          {item.label}
        </p>
        {item.sublabel && <p className="text-[11px] text-gray-400 mt-0.5">{item.sublabel}</p>}
        {!item.ready && (
          <span className="inline-block mt-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">เร็วๆ นี้</span>
        )}
      </div>
    </>
  )

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full text-left px-3 py-2 flex items-start gap-2 rounded-md mx-1 my-0.5 transition-colors hover:bg-blue-50 cursor-pointer border-l-[3px] border-transparent"
      >
        {innerContent}
        <span aria-hidden="true" className="text-[10px] text-gray-400 ml-auto mt-0.5">↗</span>
      </a>
    )
  }

  return (
    <button
      onClick={() => item.ready && setActiveMenu(item.key)}
      className={`w-full text-left px-3 py-2 flex items-start gap-2 rounded-md mx-1 my-0.5 transition-colors ${
        item.ready ? 'hover:bg-blue-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'
      } ${isActive ? 'bg-blue-50 border-l-[3px] border-blue-600' : 'border-l-[3px] border-transparent'}`}
    >
      {innerContent}
    </button>
  )
}

export function App() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(288)
  const isResizing = useRef(false)

  const [theme, setTheme] = useState<string>(() => getStoredTheme(window.localStorage))
  const [online, setOnline] = useState<number>(1)

  // F8: pending deep-link category key — passed to BasicConfigPage / EClaimConfigPage
  // so ConfigCatalog can pre-select the right category.
  const [pendingCategory, setPendingCategory] = useState<string | null>(null)

  // F9: auth state — null means "haven't checked yet"; false means "no login needed"
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null)
  const [authUser, setAuthUser] = useState<string | null>(null)
  const [authRole, setAuthRole] = useState<string | null>(null)

  // On mount: initialise axios header from stored token, then check /auth/status
  useEffect(() => {
    initAxiosAuth(window.localStorage)
    const stored = getAuth(window.localStorage)
    if (stored) {
      setAuthUser(stored.u)
      setAuthRole(stored.role)
    }

    fetch('/api/auth/status')
      .then(r => r.ok ? (r.json() as Promise<{ enabled: boolean }>) : Promise.resolve({ enabled: false }))
      .then(data => {
        setAuthEnabled(data.enabled)
      })
      .catch(() => {
        // Cannot reach server — treat as disabled to not block the UI
        setAuthEnabled(false)
      })
  }, [])

  function handleLoginSuccess() {
    const stored = getAuth(window.localStorage)
    if (stored) {
      setAuthUser(stored.u)
      setAuthRole(stored.role)
    }
  }

  function handleLogout() {
    clearAuth(window.localStorage)
    setAuthUser(null)
    setAuthRole(null)
  }

  // Subscribe to navigation requests from ValidatePage deep-link buttons.
  useEffect(() => {
    const unsub = onNavigate(r => {
      setActiveMenu(r.menu as MenuKey)
      setPendingCategory(r.categoryKey ?? null)
    })
    return unsub
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Presence heartbeat — ping every 20 s and refresh count on the same cadence.
  // Network errors are swallowed so a backend restart never crashes the UI.
  useEffect(() => {
    const clientId = getOrCreateClientId(window.localStorage)

    async function pingAndCount() {
      try {
        await fetch('/api/presence/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: clientId }),
        })
      } catch {
        // swallow — server may be temporarily unavailable
      }
      try {
        const res = await fetch('/api/presence/count')
        if (res.ok) {
          const data = await res.json() as { count: number }
          setOnline(data.count)
        }
      } catch {
        // swallow
      }
    }

    // Fire immediately on mount
    void pingAndCount()

    const handle = setInterval(() => { void pingAndCount() }, 20_000)
    return () => clearInterval(handle)
  }, [])

  function handleThemeChange(id: string) {
    setTheme(id)
    document.documentElement.setAttribute('data-theme', id)
    storeTheme(window.localStorage, id)
  }

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return
      setSidebarWidth(Math.min(460, Math.max(240, ev.clientX)))
    }
    const onUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const allItems = NAV.flatMap(n => n.children ?? [n])
  const currentLabel = allItems.find(m => m.key === activeMenu)?.label ?? ''

  // F9: auth gate — show login when enabled and no user logged in yet
  if (authEnabled === true && !authUser) {
    return <LoginPage onSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="app-header text-white shadow-md z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(o => !o)} className="p-1.5 rounded hover:bg-white/10 transition-colors shrink-0">
            <div className="space-y-1">
              <span className="block w-5 h-0.5 bg-white" />
              <span className="block w-5 h-0.5 bg-white" />
              <span className="block w-5 h-0.5 bg-white" />
            </div>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">ระบบตรวจสอบการส่งออกข้อมูลมาตรฐาน</h1>
            <p className="text-white/70 text-xs">{currentLabel}</p>
          </div>
          {/* Online user count pill */}
          <span
            className="bg-white/15 text-white text-xs rounded px-2 py-1 shrink-0"
            title="ผู้ใช้งานออนไลน์ขณะนี้"
          >
            🟢 {online} ออนไลน์
          </span>

          {/* F9: logged-in user badge + logout button */}
          {authUser && (
            <span className="bg-white/15 text-white text-xs rounded px-2 py-1 shrink-0 flex items-center gap-1.5">
              <span>{authUser} ({authRole})</span>
              <button
                onClick={handleLogout}
                className="ml-1 underline hover:no-underline text-white/80 hover:text-white transition-colors"
                title="ออกจากระบบ"
              >
                ออกจากระบบ
              </button>
            </span>
          )}

          {/* Theme switcher */}
          <select
            value={theme}
            onChange={e => handleThemeChange(e.target.value)}
            className="text-xs bg-white/15 text-white border border-white/30 rounded px-2 py-1 cursor-pointer hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
            title="เปลี่ยนสีธีม"
          >
            {THEMES.map(t => (
              <option key={t.id} value={t.id} className="text-gray-900 bg-white">
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className="bg-white border-r border-gray-200 shadow-sm flex-shrink-0 overflow-y-auto"
          style={{ width: sidebarOpen ? sidebarWidth : 0, transition: 'width 0.2s' }}
        >
          <nav className="py-2">
            {NAV.map((item, i) => (
              <SidebarItem key={i} item={item} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
            ))}
          </nav>
        </aside>

        {sidebarOpen && (
          <div onMouseDown={startResize} className="w-1 flex-shrink-0 cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-600 transition-colors" />
        )}

        <main className="flex-1 overflow-y-auto p-6">
          {activeMenu === 'dashboard' && <DashboardPage />}
          {activeMenu === 'validate' && <ValidatePage />}
          {activeMenu === 'nhso-links' && <NhsoLinksPage />}
          {activeMenu === 'basic-config' && <BasicConfigPage initialCategoryKey={pendingCategory ?? undefined} />}
          {activeMenu === 'eclaim-config' && <EClaimConfigPage initialCategoryKey={pendingCategory ?? undefined} />}
          {activeMenu === 'drug-catalog' && <DrugCatalogPage />}
          {activeMenu === 'help' && <HelpPage />}
          {activeMenu === 'knowledge' && <KnowledgePage />}
          {activeMenu === 'global-search' && <GlobalSearchPage />}
          {activeMenu === 'snapshots' && <SnapshotsPage />}
        </main>
      </div>
    </div>
  )
}
