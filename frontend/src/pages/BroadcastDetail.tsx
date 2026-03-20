import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { broadcastApi } from '../lib/api'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Download, Ban, CheckCircle2, XCircle, Phone,
  RefreshCw, User, Clock, Calendar
} from 'lucide-react'

const TZ = 'Asia/Makassar' // WITA — UTC+8

// Safely parse any date string, returns null if invalid
function safeDate(val: string | null | undefined): Date | null {
  if (!val) return null
  try {
    const d = toZonedTime(parseISO(val), TZ)
    if (isNaN(d.getTime())) return null
    return d
  } catch {
    return null
  }
}

function fmt(val: string | null | undefined, pattern: string, fallback = '—'): string {
  const d = safeDate(val)
  return d ? format(d, pattern) : fallback
}

export default function BroadcastDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()

  const { data: broadcast, isLoading } = useQuery(
    ['broadcast', id],
    () => broadcastApi.get(Number(id)).then(r => r.data),
    { refetchInterval: b => (b?.status === 'sending' ? 3000 : false) }
  )

  const { data: logs = [] } = useQuery(
    ['logs', id],
    () => broadcastApi.logs(Number(id)).then(r => Array.isArray(r.data) ? r.data : []),
    { enabled: !!id, refetchInterval: () => (broadcast?.status === 'sending' ? 3000 : false) }
  )

  const cancelMutation = useMutation(
    () => broadcastApi.cancel(Number(id)),
    {
      onSuccess: () => {
        toast.success('Broadcast cancelled')
        qc.invalidateQueries(['broadcast', id])
        qc.invalidateQueries('broadcasts')
      },
      onError: () => { toast.error('Failed to cancel') },
    }
  )

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-[#25d366]" />
      </div>
    )
  }

  if (!broadcast) {
    return <div className="p-8 text-center text-[#6b7fa3]">Broadcast not found.</div>
  }

  const successRate = broadcast.total_count > 0
    ? Math.round((broadcast.sent_count / broadcast.total_count) * 100)
    : 0

  const canCancel = ['pending', 'sending'].includes(broadcast.status)

  return (
    <div className="p-5 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => nav(-1)} className="p-2 glass-2 rounded-xl text-[#6b7fa3] hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-white truncate">{broadcast.name}</h1>
          <p className="text-xs text-[#6b7fa3] mt-0.5">{broadcast.excel_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={broadcastApi.downloadUrl(Number(id))}
            className="p-2 glass-2 rounded-xl text-[#6b7fa3] hover:text-white transition-colors"
            title="Download Excel"
          >
            <Download size={16} />
          </a>
          {canCancel && (
            <button
              onClick={() => { if (confirm('Cancel this broadcast?')) cancelMutation.mutate() }}
              className="p-2 glass-2 rounded-xl text-[#6b7fa3] hover:text-red-400 transition-colors"
              title="Cancel broadcast"
            >
              <Ban size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="glass rounded-2xl p-5">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Stat label="Total" value={broadcast.total_count} color="#e8edf2" />
          <Stat label="Sent" value={broadcast.sent_count} color="#25d366" />
          <Stat label="Failed" value={broadcast.failed_count} color="#f87171" />
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${successRate}%`, background: 'linear-gradient(90deg,#25d366,#128c7e)' }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-[#6b7fa3]">
          <span>{successRate}% success rate</span>
          <span>
            {broadcast.last_sent_at
              ? `Last sent ${fmt(broadcast.last_sent_at, 'MMM d, HH:mm')}`
              : broadcast.scheduled_at
              ? `Scheduled for ${fmt(broadcast.scheduled_at, 'MMM d, HH:mm')}`
              : `Cron: ${broadcast.cron_expr}`}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-medium text-[#6b7fa3] uppercase tracking-wider">Details</h2>
        <DetailRow icon={<Clock size={14} />} label="Schedule">
          {broadcast.schedule_type === 'once'
            ? fmt(broadcast.scheduled_at, 'EEEE, MMM d yyyy HH:mm')
            : `Recurring · ${broadcast.cron_expr}`}
        </DetailRow>
        <DetailRow icon={<User size={14} />} label="Patients">
          {broadcast.total_count} patients
        </DetailRow>
        <DetailRow icon={<Calendar size={14} />} label="Created">
          {fmt(broadcast.created_at, 'MMM d yyyy, HH:mm')}
        </DetailRow>
      </div>

      {/* Message logs */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">
          Message Logs
          <span className="ml-2 text-[11px] font-normal text-[#6b7fa3]">({logs.length})</span>
        </h2>
        {logs.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-sm text-[#6b7fa3]">
            No messages sent yet
          </div>
        ) : (
          <div className="space-y-1.5">
            {logs.map(log => (
              <div key={log.id} className="glass-2 rounded-xl px-4 py-3 flex items-center gap-3">
                {log.status === 'sent'
                  ? <CheckCircle2 size={15} className="text-[#25d366] shrink-0" />
                  : <XCircle size={15} className="text-red-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{log.patient_name}</div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7fa3]">
                    <Phone size={10} />
                    <span>{log.phone}</span>
                    {log.error && <span className="text-red-400 truncate">· {log.error}</span>}
                  </div>
                </div>
                <span className="text-[10px] text-[#6b7fa3] shrink-0">
                  {fmt(log.sent_at, 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-semibold" style={{ color }}>{value}</div>
      <div className="text-xs text-[#6b7fa3] mt-0.5">{label}</div>
    </div>
  )
}

function DetailRow({ icon, label, children }: {
  icon: React.ReactNode; label: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-[#6b7fa3]">{icon}</span>
      <span className="text-[#6b7fa3] w-20 shrink-0">{label}</span>
      <span className="text-white">{children}</span>
    </div>
  )
}