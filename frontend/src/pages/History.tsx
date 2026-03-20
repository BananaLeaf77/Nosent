import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { broadcastApi, type BroadcastSummary } from '../lib/api'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'Asia/Makassar'
function safeDate(v: string | null | undefined): Date | null {
  if (!v) return null
  try { const d = toZonedTime(parseISO(v), TZ); return isNaN(d.getTime()) ? null : d } catch { return null }
}
function fmt(v: string | null | undefined, p: string, fb = '—') {
  const d = safeDate(v); return d ? format(d, p) : fb
}
function fmtAgo(v: string | null | undefined) {
  const d = safeDate(v); return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'
}
import { ArrowRight, Clock, RefreshCw, CheckCircle2, XCircle, Ban, Send, Loader2 } from 'lucide-react'

const STATUS_CONFIG = {
  pending:   { icon: Clock,         color: '#f59e0b', bg: 'bg-amber-500/10',   label: 'Pending'  },
  sending:   { icon: Loader2,       color: '#60a5fa', bg: 'bg-blue-500/10',    label: 'Sending'  },
  completed: { icon: CheckCircle2,  color: '#25d366', bg: 'bg-[#25d366]/10',   label: 'Done'     },
  failed:    { icon: XCircle,       color: '#f87171', bg: 'bg-red-500/10',     label: 'Failed'   },
  cancelled: { icon: Ban,           color: '#6b7fa3', bg: 'bg-gray-500/10',    label: 'Cancelled'},
} as const

export default function History() {
  const { data: broadcasts = [], isLoading, refetch } = useQuery(
    'broadcasts',
    () => broadcastApi.list().then(r => Array.isArray(r.data) ? r.data : []),
    { refetchInterval: 15_000 }
  )

  return (
    <div className="p-5 md:p-8 pb-24 md:pb-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">History</h1>
          <p className="text-sm text-[#6b7fa3] mt-0.5">{broadcasts.length} broadcasts total</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 glass-2 rounded-xl text-[#6b7fa3] hover:text-white transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Send size={28} className="mx-auto mb-3 text-[#6b7fa3]" />
          <div className="text-sm font-medium text-white">No broadcasts yet</div>
          <Link to="/new" className="text-xs text-[#25d366] hover:underline mt-1 inline-block">
            Create your first broadcast →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {broadcasts.map(b => <BroadcastCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  )
}

function BroadcastCard({ b }: { b: BroadcastSummary }) {
  const s = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending
  const Icon = s.icon
  const successRate = b.total_count > 0
    ? Math.round((b.sent_count / b.total_count) * 100)
    : 0

  return (
    <Link
      to={`/history/${b.id}`}
      className="glass rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-white/10 transition-all group block"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
        <Icon size={17} style={{ color: s.color }} className={b.status === 'sending' ? 'animate-spin' : ''} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-white truncate group-hover:text-[#25d366] transition-colors">
            {b.name}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${s.bg}`}
            style={{ color: s.color }}>
            {s.label}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#6b7fa3]">
          <span>{b.total_count} patients</span>
          {b.status === 'completed' && (
            <>
              <span>·</span>
              <span className="text-[#25d366]">{b.sent_count} sent</span>
              {b.failed_count > 0 && (
                <><span>·</span><span className="text-red-400">{b.failed_count} failed</span></>
              )}
            </>
          )}
          <span>·</span>
          <span>
            {b.last_sent_at
              ? fmtAgo(b.last_sent_at)
              : b.scheduled_at
              ? fmt(b.scheduled_at, 'MMM d, HH:mm')
              : b.cron_expr
              ? `Recurring (${b.cron_expr})`
              : fmt(b.created_at, 'MMM d')}
          </span>
        </div>

        {/* Progress bar — only for completed */}
        {b.status === 'completed' && b.total_count > 0 && (
          <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${successRate}%`,
                background: successRate > 80
                  ? 'linear-gradient(90deg,#25d366,#128c7e)'
                  : 'linear-gradient(90deg,#f59e0b,#d97706)',
              }}
            />
          </div>
        )}
      </div>

      <ArrowRight size={14} className="text-[#6b7fa3] group-hover:text-[#25d366] transition-colors shrink-0" />
    </Link>
  )
}