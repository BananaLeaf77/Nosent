import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useQuery } from 'react-query'
import { waApi, type WAStatus } from './lib/api'
import Dashboard from './pages/Dashboard'
import NewBroadcast from './pages/NewBroadcast'
import History from './pages/History'
import BroadcastDetail from './pages/BroadcastDetail'
import WASetup from './pages/WASetup'
import {
  LayoutGrid, Send, Clock, Wifi, WifiOff, Loader2, MessageSquare
} from 'lucide-react'

export default function App() {
  const { data, isLoading } = useQuery(
    'wa-status',
    () => waApi.status().then(r => r.data?.status ?? 'disconnected'),
    { refetchInterval: 8000 }
  )
  const status: WAStatus = data ?? 'disconnected'

  return (
    <div className="flex flex-col min-h-dvh md:flex-row">
      <Sidebar status={status} isLoading={isLoading} />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <Routes>
          <Route path="/" element={<Dashboard status={status} />} />
          <Route path="/new" element={<NewBroadcast />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<BroadcastDetail />} />
          <Route path="/setup" element={<WASetup />} />
        </Routes>
      </main>
    </div>
  )
}

function Sidebar({ status, isLoading }: { status: WAStatus; isLoading: boolean }) {
  const location = useLocation()

  const navItems = [
    { to: '/', icon: LayoutGrid, label: 'Dashboard' },
    { to: '/new', icon: Send, label: 'New Broadcast' },
    { to: '/history', icon: Clock, label: 'History' },
    { to: '/setup', icon: MessageSquare, label: 'WA Setup' },
  ]

  const statusConfig = {
    connected: { color: '#25d366', label: 'Connected', Icon: Wifi },
    waiting_qr: { color: '#f59e0b', label: 'Scan QR', Icon: Loader2 },
    disconnected: { color: '#ef4444', label: 'Disconnected', Icon: WifiOff },
  }
  const { color, label, Icon } = statusConfig[status]

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-dvh glass border-r border-white/5 sticky top-0">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
              <MessageSquare size={16} color="white" />
            </div>
            <div>
              <div className="font-semibold text-sm text-white">Nosent</div>
              <div className="text-[11px] text-[#6b7fa3]">Patient Reminders</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#25d366]/10 text-[#25d366] glow-green'
                    : 'text-[#6b7fa3] hover:text-[#e8edf2] hover:bg-white/5'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* WA Status pill */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="glass-2 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
            <div className="relative">
              <Icon
                size={15}
                color={color}
                className={status === 'waiting_qr' ? 'animate-spin' : ''}
              />
              {status === 'connected' && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#25d366] animate-pulse" />
              )}
            </div>
            <div>
              <div className="text-xs font-medium" style={{ color }}>WhatsApp</div>
              <div className="text-[11px] text-[#6b7fa3]">{label}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-white/5 flex">
        {navItems.map(({ to, icon: NavIcon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#25d366]' : 'text-[#6b7fa3]'
              }`
            }
          >
            <NavIcon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}