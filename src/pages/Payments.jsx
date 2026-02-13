import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, RefreshCw, DollarSign, TrendingUp, Calendar, Trash2, BadgeCheck, AlertCircle } from 'lucide-react'

const paymentModeMeta = {
  cash: { label: 'Cash', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  upi: { label: 'UPI', pill: 'bg-sky-50 text-sky-700 ring-sky-200' },
  bank_transfer: { label: 'Bank Transfer', pill: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  cheque: { label: 'Cheque', pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  card: { label: 'Card', pill: 'bg-gray-50 text-gray-700 ring-gray-200' },
}

const fmtINR = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function Payments() {
  const { isAdmin, profile } = useAuth()
  const isAccounts = profile?.role === 'accounts'

  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modeFilter, setModeFilter] = useState('all')

  useEffect(() => {
    fetchPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      setRefreshing(true)

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoice_id(
            id,
            invoice_number,
            lead:lead_id(company_name)
          ),
          created_user:created_by(id, full_name)
        `)
        .order('payment_date', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
      alert('Error loading payments: ' + error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment? This will update the invoice balance.')) return

    try {
      const payment = payments.find((p) => p.id === id)
      if (!payment) return

      const { error: deleteError } = await supabase.from('payments').delete().eq('id', id)
      if (deleteError) throw deleteError

      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .select('paid_amount, total_amount')
        .eq('id', payment.invoice_id)
        .single()
      if (invErr) throw invErr

      const newPaidAmount = Number(invoice.paid_amount || 0) - Number(payment.amount || 0)
      const newBalance = Number(invoice.total_amount || 0) - newPaidAmount

      let newStatus = 'sent'
      if (newPaidAmount >= Number(invoice.total_amount || 0)) newStatus = 'paid'
      else if (newPaidAmount > 0) newStatus = 'partial'

      const { error: updErr } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalance,
          status: newStatus,
        })
        .eq('id', payment.invoice_id)

      if (updErr) throw updErr

      alert('Payment deleted successfully')
      fetchPayments()
    } catch (error) {
      console.error('Error deleting payment:', error)
      alert('Error deleting payment: ' + error.message)
    }
  }

  const filteredPayments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    return payments.filter((p) => {
      const matchesSearch =
        !q ||
        p.invoice?.invoice_number?.toLowerCase()?.includes(q) ||
        p.invoice?.lead?.company_name?.toLowerCase()?.includes(q) ||
        p.reference_number?.toLowerCase?.().includes(q)

      const matchesMode = modeFilter === 'all' || p.payment_mode === modeFilter
      return matchesSearch && matchesMode
    })
  }, [payments, searchTerm, modeFilter])

  const totals = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

    const todayStr = new Date().toDateString()
    const today = payments
      .filter((p) => new Date(p.payment_date).toDateString() === todayStr)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)

    const now = new Date()
    const thisMonth = payments
      .filter((p) => {
        const d = new Date(p.payment_date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)

    return { total, today, thisMonth }
  }, [payments])

  const modeSummary = useMemo(() => {
    const modes = ['cash', 'upi', 'bank_transfer', 'cheque', 'card']
    return modes.map((mode) => {
      const list = payments.filter((p) => p.payment_mode === mode)
      return {
        mode,
        count: list.length,
        total: list.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      }
    })
  }, [payments])

  const ui = {
    card: 'rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden',
    header:
      'px-5 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex items-center justify-between',
    body: 'p-5',
    input:
      'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition ' +
      'focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 border-gray-200',
    btnPrimary:
      'inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition',
    btnSecondary:
      'inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60',
    pillBase: 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
    th: 'px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500',
    td: 'px-5 py-4 align-middle text-sm text-gray-700 border-t border-gray-100',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-600" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-120px)]">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute top-28 right-8 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-4">
          <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur shadow-sm">
            <div className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-xs uppercase tracking-wider text-gray-500">Accounts</div>
                  <span className={`${ui.pillBase} bg-gray-50 text-gray-700 ring-gray-200`}>
                    <BadgeCheck className="w-3.5 h-3.5 mr-1" />
                    {filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'}
                    {(searchTerm || modeFilter !== 'all') ? ' • filtered' : ''}
                  </span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">Payments</h1>
                <p className="text-sm text-gray-600 mt-1">Track collections and reconcile invoices.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  onClick={fetchPayments}
                  disabled={refreshing}
                  className={ui.btnSecondary}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>

                {(isAdmin || isAccounts) && (
                  <Link to="/payments/new" className={ui.btnPrimary}>
                    <Plus className="w-4 h-4 mr-2" />
                    Record Payment
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Total received</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{fmtINR(totals.total)}</p>
                <p className="mt-1 text-xs text-gray-500">All time</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                <DollarSign className="w-7 h-7 text-emerald-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Today</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{fmtINR(totals.today)}</p>
                <p className="mt-1 text-xs text-gray-500">Today’s collection</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-100">
                <Calendar className="w-7 h-7 text-sky-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">This month</p>
                <p className="mt-2 text-2xl font-bold text-indigo-700">{fmtINR(totals.thisMonth)}</p>
                <p className="mt-1 text-xs text-gray-500">Month to date</p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                <TrendingUp className="w-7 h-7 text-indigo-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={ui.card}>
          <div className={ui.header}>
            <div className="font-semibold text-gray-900">Filters</div>
            <div className="text-xs text-gray-500">Search and narrow results</div>
          </div>

          <div className={ui.body}>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by invoice, company, or reference…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${ui.input} pl-10 h-11 rounded-full`}
                  />
                </div>
              </div>

              <div className="lg:w-56">
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className={`${ui.input} h-11 rounded-xl`}
                >
                  <option value="all">All Payment Modes</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>

            {(searchTerm || modeFilter !== 'all') && (
              <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 ring-1 ring-amber-100 flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-amber-100 p-2">
                  <AlertCircle className="w-5 h-5 text-amber-700" />
                </div>
                <div className="text-sm text-amber-900">
                  You are viewing filtered results.
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('')
                      setModeFilter('all')
                    }}
                    className="ml-2 font-semibold text-amber-900 underline underline-offset-2 hover:opacity-80"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className={ui.card}>
          <div className={ui.header}>
            <div className="font-semibold text-gray-900">Payment Records</div>
            <div className="text-xs text-gray-500">Latest first</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white">
                <tr>
                  <th className={ui.th}>Date</th>
                  <th className={ui.th}>Invoice</th>
                  <th className={ui.th}>Customer</th>
                  <th className={`${ui.th} text-right`}>Amount</th>
                  <th className={ui.th}>Mode</th>
                  <th className={ui.th}>Reference</th>
                  <th className={ui.th}>Recorded By</th>
                  <th className={`${ui.th} text-right`}>Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-gray-500">
                      {searchTerm || modeFilter !== 'all'
                        ? 'No payments match your filters'
                        : 'No payments recorded yet. Record your first payment to get started!'}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const meta = paymentModeMeta[p.payment_mode] || {
                      label: p.payment_mode?.replace?.('_', ' ') || 'Unknown',
                      pill: 'bg-gray-50 text-gray-700 ring-gray-200',
                    }

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/60">
                        <td className={ui.td}>
                          {new Date(p.payment_date).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        <td className={ui.td}>
                          <Link
                            to={`/invoices/${p.invoice_id}`}
                            className="font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            {p.invoice?.invoice_number || 'N/A'}
                          </Link>
                        </td>

                        <td className={ui.td}>
                          <div className="text-gray-900 font-medium">
                            {p.invoice?.lead?.company_name || 'N/A'}
                          </div>
                        </td>

                        <td className={`${ui.td} text-right`}>
                          <span className="font-bold text-emerald-700">{fmtINR(p.amount)}</span>
                        </td>

                        <td className={ui.td}>
                          <span className={`${ui.pillBase} ${meta.pill}`}>{meta.label}</span>
                        </td>

                        <td className={ui.td}>
                          <span className="text-gray-600">{p.reference_number || '—'}</span>
                        </td>

                        <td className={ui.td}>{p.created_user?.full_name || 'Unknown'}</td>

                        <td className={`${ui.td} text-right`}>
                          {isAdmin ? (
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="inline-flex items-center justify-center rounded-xl p-2 text-rose-700 hover:bg-rose-50 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mode summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {modeSummary.map(({ mode, count, total }) => {
            const meta = paymentModeMeta[mode]
            return (
              <div key={mode} className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-4 text-center">
                <div className={`${ui.pillBase} ${meta.pill}`}>{meta.label}</div>
                <div className="mt-3 text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500 mt-1">Payments</div>
                {total > 0 ? (
                  <div className="mt-2 text-sm font-semibold text-gray-800">{fmtINR(total)}</div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
