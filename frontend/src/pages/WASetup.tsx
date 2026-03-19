import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'react-query'
import { QRCodeSVG } from 'qrcode.react'
import { waApi } from '../lib/api'
import toast from 'react-hot-toast'
import {
  CheckCircle2, RefreshCw, LogOut, Smartphone, Wifi, WifiOff, AlertCircle
} from 'lucide-react'

export default function WASetup() {
  const [qr, setQr] = useState<string | null>(null)

  const { data: statusData, refetch: refetchStatus } = useQuery(
    'wa-status-page',
    () => waApi.status().then(r => r.data),
    { refetchInterval: 5000 }
  )
  const status = statusData?.status ?? 'disconnected'

  // Poll QR code when waiting
  useQuery(
    'wa-qr',
    () => waApi.qr().then(r => r.data),
    {
      enabled: status === 'waiting_qr',
      refetchInterval: 3000,
      onSuccess: (data) => {
        if (data.qr) setQr(data.qr)
      },
    }
  )

  const logoutMutation = useMutation(
    () => waApi.logout(),
    {
      onSuccess: () => {
        toast.success('Logged out. Scan new QR to reconnect.')
        setQr(null)
        refetchStatus()
      },
      onError: () => toast.error('Logout failed'),
    }
  )

  // Clear QR once connected
  useEffect(() => {
    if (status === 'connected') setQr(null)
  }, [status])

  return (
    <div className="p-5 md:p-8 pb-24 md:pb-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">WhatsApp Setup</h1>
        <p className="text-sm text-[#6b7fa3] mt-0.5">
          Connect your WhatsApp account to enable broadcasts
        </p>
      </div>

      {/* Status card */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            status === 'connected' ? 'bg-[#25d366]/15' :
            status === 'waiting_qr' ? 'bg-amber-500/15' : 'bg-red-500/15'
          }`}>
            {status === 'connected' ? <Wifi size={22} color="#25d366" /> :
             status === 'waiting_qr' ? <Smartphone size={22} color="#f59e0b" /> :
             <WifiOff size={22} color="#f87171" />}
          </div>
          <div>
            <div className={`text-base font-semibold ${
              status === 'connected' ? 'text-[#25d366]' :
              status === 'waiting_qr' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {status === 'connected' ? 'Connected' :
               status === 'waiting_qr' ? 'Waiting for QR scan' :
               'Disconnected'}
            </div>
            <div className="text-xs text-[#6b7fa3] mt-0.5">
              {status === 'connected'
                ? 'Your WhatsApp is linked and ready to send messages'
                : status === 'waiting_qr'
                ? 'Open WhatsApp on your phone and scan the QR code below'
                : 'Not connected — scan QR code to link your WhatsApp'}
            </div>
          </div>
        </div>

        {status === 'connected' && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#25d366]">
              <CheckCircle2 size={13} />
              <span>Ready to send broadcasts</span>
            </div>
            <button
              onClick={() => {
                if (confirm('Disconnect WhatsApp? You will need to scan QR again.')) {
                  logoutMutation.mutate()
                }
              }}
              disabled={logoutMutation.isLoading}
              className="flex items-center gap-1.5 text-xs text-[#6b7fa3] hover:text-red-400 transition-colors"
            >
              <LogOut size={12} />
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* QR Code */}
      {status !== 'connected' && (
        <div className="glass rounded-2xl p-6 text-center">
          {qr ? (
            <div className="space-y-4">
              <div className="p-3 bg-white rounded-2xl inline-block">
                <QRCodeSVG
                  value={qr}
                  size={220}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-xs text-[#6b7fa3]">
                QR refreshes automatically every 20s
              </div>
            </div>
          ) : (
            <div className="py-8 space-y-3">
              <RefreshCw size={28} className="mx-auto text-[#6b7fa3] animate-spin" />
              <div className="text-sm text-[#6b7fa3]">Loading QR code…</div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-5 glass rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-medium text-[#6b7fa3] uppercase tracking-wider">How to connect</h2>
        {[
          'Open WhatsApp on your phone',
          'Tap the three-dot menu (⋮) → Linked Devices',
          'Tap "Link a Device"',
          'Scan the QR code shown above',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#25d366]/15 text-[#25d366] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </div>
            <span className="text-sm text-[#e8edf2]">{step}</span>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="mt-3 glass-2 rounded-xl p-3.5 flex items-start gap-2.5">
        <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-[#6b7fa3]">
          Keep this server running to maintain the connection. WhatsApp may disconnect after 14 days of inactivity — simply re-scan to reconnect.
        </p>
      </div>
    </div>
  )
}
