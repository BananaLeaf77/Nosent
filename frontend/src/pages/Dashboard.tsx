import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { broadcastApi, type WAStatus, type BroadcastSummary } from '../lib/api'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'Asia/Makassar'
function safeDate(v: string | null | undefined): Date | null {
  if (!v) return null
  try { const d = toZonedTime(parseISO(v), TZ); return isNaN(d.getTime()) ? null : d } catch { return null }
}
function fmt(v: string | null | undefined, p: string) {
  const d = safeDate(v); return d ? format(d, p) : '—'
}
function fmtAgo(v: string | null | undefined) {
  const d = safeDate(v); return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'
}
import {
  Send, Users, CheckCircle2, XCircle, Plus, ArrowRight, Clock
} from 'lucide-react'

export default function Dashboard({ status }: { status: WAStatus }) {
  const { data: broadcasts = [] } = useQuery<BroadcastSummary[]>('broadcasts', () =>
    broadcastApi.list().then(r => Array.isArray(r.data) ? r.data : [])
  )

  const total = broadcasts.length
  const completed = broadcasts.filter(b => b.status === 'completed').length
  const pending = broadcasts.filter(b => b.status === 'pending').length
  const totalSent = broadcasts.reduce((s, b) => s + b.sent_count, 0)
  const totalFailed = broadcasts.reduce((s, b) => s + b.failed_count, 0)
  const recent = broadcasts.slice(0, 5)

  return (
    <div className="p-5 md:p-8 pb-24 md:pb-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-[#6b7fa3] mt-0.5">
            {status === 'connected'
              ? 'WhatsApp connected — ready to send'
              : status === 'waiting_qr'
                ? 'Scan the QR code to activate'
                : 'WhatsApp disconnected'}
          </p>
        </div>
        <Link
          to="/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-black transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Broadcast</span>
        </Link>
      </div>

      {/* WA not connected banner */}
      {status !== 'connected' && (
        <Link to="/setup" className="block glass-2 rounded-2xl p-4 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Send size={17} className="text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-amber-300">WhatsApp not connected</div>
              <div className="text-xs text-[#6b7fa3]">Go to WA Setup to scan the QR code →</div>
            </div>
          </div>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Broadcasts" value={total} icon={<Clock size={18} />} color="#60a5fa" />
        <StatCard label="Completed" value={completed} icon={<CheckCircle2 size={18} />} color="#25d366" />
        <StatCard label="Messages Sent" value={totalSent} icon={<Users size={18} />} color="#a78bfa" />
        <StatCard label="Failed" value={totalFailed} icon={<XCircle size={18} />} color="#f87171" />
      </div>

      {/* Recent broadcasts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Recent Broadcasts</h2>
          <Link to="/history" className="text-xs text-[#25d366] hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {recent.map(b => <BroadcastRow key={b.id} b={b} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#6b7fa3] text-xs">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: color + '18', color }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-semibold text-white">{value.toLocaleString()}</div>
    </div>
  )
}

function BroadcastRow({ b }: { b: BroadcastSummary }) {
  const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Pending' },
    sending: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Sending…' },
    completed: { bg: 'bg-[#25d366]/10', text: 'text-[#25d366]', label: 'Done' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Failed' },
    cancelled: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Cancelled' },
  }
  const s = statusStyle[b.status] ?? statusStyle.pending

  return (
    <Link to={`/history/${b.id}`} className="glass-2 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-white/10 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate group-hover:text-[#25d366] transition-colors">
          {b.name}
        </div>
        <div className="text-xs text-[#6b7fa3] mt-0.5">
          {b.total_count} patients ·{' '}
          {b.last_sent_at
            ? `Sent ${fmtAgo(b.last_sent_at)}`
            : b.scheduled_at
              ? `Scheduled ${fmt(b.scheduled_at, 'MMM d, HH:mm')}`
              : b.cron_expr || 'Recurring'}
        </div>
      </div>
      <span className={`text-[11px] font-medium px-2 py-1 rounded-lg ${s.bg} ${s.text}`}>
        {s.label}
      </span>
      <ArrowRight size={14} className="text-[#6b7fa3] group-hover:text-[#25d366] transition-colors shrink-0" />
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'rgba(37,211,102,0.1)' }}>
        <Send size={22} color="#25d366" />
      </div>
      <div className="text-sm font-medium text-white mb-1">No broadcasts yet</div>
      <div className="text-xs text-[#6b7fa3] mb-4">Upload a patient Excel file to get started</div>
      <Link to="/new"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-black"
        style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
        <Plus size={13} /> Create broadcast
      </Link>
    </div>
  )
}