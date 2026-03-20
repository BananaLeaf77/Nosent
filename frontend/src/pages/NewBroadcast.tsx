import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'react-query'
import { broadcastApi } from '../lib/api'
import toast from 'react-hot-toast'
import {
  Upload, FileSpreadsheet, X, Info, Send, RefreshCw, Download
} from 'lucide-react'

const DEFAULT_TEMPLATE = `Halo {{name}} 👋

Mengingatkan bahwa Anda memiliki jadwal kontrol kehamilan ke-*{{pregnancy_number}}*.

HPHT: *{{hpht}}*
Alamat: {{address}}

Mohon hadir tepat waktu. Jika perlu mengubah jadwal, silakan hubungi kami.

Terima kasih 🙏`

const CRON_PRESETS = [
  { label: 'Every 1st of month at 8am', value: '0 0 8 1 * *' },
  { label: 'Every Monday at 9am', value: '0 0 9 * * 1' },
  { label: 'Every day at 8am', value: '0 0 8 * * *' },
  { label: 'Every weekday at 7am', value: '0 0 7 * * 1-5' },
]

export default function NewBroadcast() {
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [scheduleType, setScheduleType] = useState<'once' | 'recurring'>('once')
  const [scheduledAt, setScheduledAt] = useState('')
  const [cronExpr, setCronExpr] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const mutation = useMutation(
    (form: FormData) => broadcastApi.create(form).then(r => r.data),
    {
      onSuccess: (data) => {
        toast.success('Broadcast scheduled!')
        nav(`/history/${data.id}`)
      },
      onError: (err: any): void => {
        toast.error(err.response?.data?.message || 'Failed to create broadcast')
      },
    }
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f)
    } else {
      toast.error('Please upload an .xlsx or .xls file')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error('Please upload an Excel file'); return }
    if (!name.trim()) { toast.error('Broadcast name is required'); return }
    if (scheduleType === 'once' && (!scheduledAt || !scheduledAt.includes('T') || scheduledAt.endsWith('T') || scheduledAt.endsWith('T'))) { toast.error('Please set date and time'); return }
    if (scheduleType === 'recurring' && !cronExpr) { toast.error('Please set a cron expression'); return }

    const form = new FormData()
    form.append('excel', file)
    form.append('name', name)
    form.append('message_tpl', template)
    form.append('schedule_type', scheduleType)
    if (scheduleType === 'once') {
      const iso = new Date(scheduledAt).toISOString()
      form.append('scheduled_at', iso)
    } else {
      form.append('cron_expr', cronExpr)
    }
    mutation.mutate(form)
  }

  const placeholders = ['{{name}}', '{{phone}}', '{{address}}', '{{hpht}}', '{{pregnancy_number}}']

  return (
    <div className="p-5 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">New Broadcast</h1>
        <p className="text-sm text-[#6b7fa3] mt-0.5">Upload patient data and schedule a reminder</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Name */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-xs font-medium text-[#6b7fa3] mb-2 uppercase tracking-wider">
            Broadcast Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. June Monthly Reminders"
            className="w-full bg-[#0f1923] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#6b7fa3] focus:outline-none focus:border-[#25d366]/50 transition-colors"
          />
        </div>

        {/* File upload */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-xs font-medium text-[#6b7fa3] mb-3 uppercase tracking-wider">
            Patient Excel File
          </label>

          {file ? (
            <div className="flex items-center gap-3 glass-2 rounded-xl px-4 py-3">
              <FileSpreadsheet size={18} className="text-[#25d366] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{file.name}</div>
                <div className="text-xs text-[#6b7fa3]">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
              <button type="button" onClick={() => setFile(null)}
                className="text-[#6b7fa3] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-[#25d366] bg-[#25d366]/5'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <Upload size={24} className="mx-auto mb-2 text-[#6b7fa3]" />
              <div className="text-sm text-white font-medium">Drop your Excel file here</div>
              <div className="text-xs text-[#6b7fa3] mt-1">or click to browse · .xlsx, .xls</div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }}
              />
            </div>
          )}

          {/* Column reference */}
          <div className="mt-3 glass-2 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <Info size={13} className="text-[#25d366] mt-0.5 shrink-0" />
            <div className="text-xs text-[#6b7fa3] flex-1">
              Required columns: <span className="text-white">Nama Pasien, No Telp</span>.
              Optional: Alamat, HPHT, Hamil Ke-.
            </div>
            <a
              href="/template_pasien.xlsx"
              download="template_pasien.xlsx"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-black shrink-0 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}
            >
              <Download size={11} />
              Download Template
            </a>
          </div>
        </div>

        {/* Message template */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-xs font-medium text-[#6b7fa3] mb-2 uppercase tracking-wider">
            Message Template
          </label>

          {/* Placeholder chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {placeholders.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setTemplate(t => t + p)}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          <textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={8}
            className="w-full bg-[#0f1923] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b7fa3] focus:outline-none focus:border-[#25d366]/50 transition-colors resize-none font-sans leading-relaxed"
          />
          <p className="text-xs text-[#6b7fa3] mt-2">
            Click a placeholder above to insert it. WhatsApp supports *bold*, _italic_, ~strikethrough~.
          </p>
        </div>

        {/* Schedule */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-xs font-medium text-[#6b7fa3] mb-3 uppercase tracking-wider">
            Schedule
          </label>

          {/* Toggle */}
          <div className="flex gap-2 mb-4">
            {(['once', 'recurring'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setScheduleType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  scheduleType === t
                    ? 'text-black'
                    : 'glass-2 text-[#6b7fa3] hover:text-white'
                }`}
                style={scheduleType === t ? { background: 'linear-gradient(135deg,#25d366,#128c7e)' } : {}}
              >
                {t === 'once' ? 'One-time' : 'Recurring'}
              </button>
            ))}
          </div>

          {scheduleType === 'once' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#6b7fa3] mb-1.5">Date</label>
                <input
                  type="date"
                  value={scheduledAt.split('T')[0] || ''}
                  onChange={e => setScheduledAt(prev => e.target.value + 'T' + (prev.split('T')[1] || '00:00'))}
                  className="w-full bg-[#0f1923] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#25d366]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6b7fa3] mb-1.5">Time</label>
                <input
                  type="time"
                  value={scheduledAt.split('T')[1] || ''}
                  onChange={e => setScheduledAt(prev => (prev.split('T')[0] || '') + 'T' + e.target.value)}
                  className="w-full bg-[#0f1923] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#25d366]/50 transition-colors"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#6b7fa3] mb-1.5">Cron Expression</label>
                <input
                  type="text"
                  value={cronExpr}
                  onChange={e => setCronExpr(e.target.value)}
                  placeholder="0 0 8 1 * *"
                  className="w-full bg-[#0f1923] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-[#6b7fa3] focus:outline-none focus:border-[#25d366]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6b7fa3] mb-1.5">Or pick a preset</label>
                <div className="space-y-1.5">
                  {CRON_PRESETS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setCronExpr(p.value)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between ${
                        cronExpr === p.value
                          ? 'bg-[#25d366]/10 text-[#25d366] border border-[#25d366]/30'
                          : 'glass-2 text-[#6b7fa3] hover:text-white'
                      }`}
                    >
                      <span>{p.label}</span>
                      <code className="font-mono text-[10px] opacity-60">{p.value}</code>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isLoading}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-black flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}
        >
          {mutation.isLoading ? (
            <><RefreshCw size={16} className="animate-spin" /> Scheduling…</>
          ) : (
            <><Send size={16} /> Schedule Broadcast</>
          )}
        </button>
      </form>
    </div>
  )
}