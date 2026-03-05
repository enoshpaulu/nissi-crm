import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Receipt,
  AlertCircle,
  Calendar,
  Filter,
} from 'lucide-react'

const statusMeta = {
  draft: {
    label: 'Draft',
    pill:
      'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-700',
    dot: 'bg-slate-400',
  },
  sent: {
    label: 'Sent',
    pill:
      'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60',
    dot: 'bg-blue-500',
  },
  paid: {
    label: 'Paid',
    pill:
      'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60',
    dot: 'bg-emerald-500',
  },
  partial: {
    label: 'Partial',
    pill:
      'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60',
    dot: 'bg-amber-500',
  },
  overdue: {
    label: 'Overdue',
    pill:
      'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60',
    dot: 'bg-rose-500',
  },
  cancelled: {
    label: 'Cancelled',
    pill:
      'bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-900/40 dark:text-zinc-200 dark:ring-zinc-700',
    dot: 'bg-zinc-400',
  },
}

const cx = (...classes) => classes.filter(Boolean).join(' ')

function StatusPill({ status }) {
  const meta = statusMeta[status] || statusMeta.draft
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold',
        meta.pill
      )}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

function IconButton({ title, children, className, ...props }) {
  return (
    <button
      title={title}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset ring-slate-200 text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] dark:ring-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:text-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function ActionLink({ title, children, className, ...props }) {
  return (
    <Link
      title={title}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset ring-slate-200 text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] dark:ring-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:text-white',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  )
}

function SummaryCard({ title, value, icon: Icon, iconClassName, valueClassName, sub }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {title}
            </p>
            <p className={cx('mt-1 text-2xl font-bold tracking-tight', valueClassName)}>
              {value}
            </p>
            {sub ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
            ) : null}
          </div>

          <div
            className={cx(
              'flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-inset',
              iconClassName
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* subtle gradient accent */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-70 dark:via-slate-700" />
    </div>
  )
}

export default function Invoices() {
  const { isAdmin, profile } = useAuth()
  const isAccounts = profile?.role === 'accounts'

  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('invoices')
        .select(
          `
          *,
          lead:lead_id(id, company_name, contact_person),
          quotation:quotation_id(id, quotation_number),
          created_user:created_by(id, full_name)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
      alert('Error loading invoices: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, invoiceNumber) => {
    if (!window.confirm(`Delete invoice "${invoiceNumber}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) throw error

      alert('Invoice deleted successfully')
      fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Error deleting invoice: ' + error.message)
    }
  }

  const filteredInvoices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return invoices.filter((invoice) => {
      const matchesSearch =
        !q ||
        invoice.invoice_number?.toLowerCase().includes(q) ||
        invoice.lead?.company_name?.toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [invoices, searchTerm, statusFilter])

  const totals = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
    const paid = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0)
    const pending = invoices.reduce((sum, inv) => sum + Number(inv.balance_amount || 0), 0)
    return { total, paid, pending }
  }, [invoices])

  const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-700 dark:border-t-slate-200" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Loading invoices…
          </span>
        </div>
      </div>
    )
  }

  const showFilteredLabel = Boolean(searchTerm) || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              {filteredInvoices.length}
            </span>{' '}
            {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
            {showFilteredLabel ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                filtered
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <IconButton title="Refresh" onClick={fetchInvoices}>
            <RefreshCw className="h-4 w-4" />
          </IconButton>

          {(isAdmin || isAccounts) && (
            <Link
              to="/invoices/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.99] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </Link>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total Invoiced"
          value={fmtINR(totals.total)}
          icon={Receipt}
          valueClassName="text-slate-900 dark:text-white"
          iconClassName="bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60"
        />
        <SummaryCard
          title="Paid Amount"
          value={fmtINR(totals.paid)}
          icon={Receipt}
          valueClassName="text-emerald-700 dark:text-emerald-200"
          iconClassName="bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
        />
        <SummaryCard
          title="Pending Amount"
          value={fmtINR(totals.pending)}
          icon={AlertCircle}
          valueClassName="text-rose-700 dark:text-rose-200"
          iconClassName="bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60"
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by invoice number or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800/60"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="lg:w-56">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800/60"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partially Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ▾
                </span>
              </div>
            </div>

            {/* Quick info */}
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              {showFilteredLabel ? (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due</th>
                <th className="text-right">Total</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
                <th className="w-[140px]">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {showFilteredLabel
                          ? 'No invoices match your filters'
                          : 'No invoices yet'}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {showFilteredLabel
                          ? 'Try clearing filters or changing your search.'
                          : 'Create your first invoice to get started.'}
                      </p>
                      {(isAdmin || isAccounts) && !showFilteredLabel ? (
                        <Link
                          to="/invoices/new"
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.99] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                        >
                          <Plus className="h-4 w-4" />
                          New Invoice
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const isOverdue =
                    invoice?.due_date &&
                    new Date(invoice.due_date) < new Date() &&
                    invoice.status !== 'paid'

                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-950/40"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900 dark:text-white">
                              {invoice.invoice_number}
                            </div>
                            {invoice?.quotation?.quotation_number ? (
                              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                                Quote: {invoice.quotation.quotation_number}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900 dark:text-white">
                            {invoice.lead?.company_name || 'N/A'}
                          </div>
                          {invoice.lead?.contact_person ? (
                            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {invoice.lead.contact_person}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        <div className="inline-flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {invoice.invoice_date
                            ? new Date(invoice.invoice_date).toLocaleDateString('en-IN')
                            : '—'}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {invoice.due_date ? (
                          <span
                            className={cx(
                              'font-medium',
                              isOverdue
                                ? 'text-rose-700 dark:text-rose-200'
                                : 'text-slate-700 dark:text-slate-200'
                            )}
                          >
                            {new Date(invoice.due_date).toLocaleDateString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-slate-900 dark:text-white">
                        {fmtINR(invoice.total_amount)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-emerald-700 dark:text-emerald-200">
                        {fmtINR(invoice.paid_amount || 0)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-rose-700 dark:text-rose-200">
                        {fmtINR(invoice.balance_amount || 0)}
                      </td>

                      <td className="px-4 py-4">
                        <StatusPill status={invoice.status} />
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <ActionLink
                            to={`/invoices/${invoice.id}`}
                            title="View"
                            className="text-slate-700 dark:text-slate-200"
                          >
                            <Eye className="h-4 w-4" />
                          </ActionLink>

                          {(isAdmin || isAccounts) && (
                            <>
                              <ActionLink
                                to={`/invoices/${invoice.id}/edit`}
                                title="Edit"
                                className="text-slate-700 dark:text-slate-200"
                              >
                                <Edit className="h-4 w-4" />
                              </ActionLink>

                              {isAdmin && (
                                <IconButton
                                  title="Delete"
                                  onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                                  className="text-rose-700 hover:text-rose-800 dark:text-rose-200"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </IconButton>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'].map((status) => {
          const count = invoices.filter((inv) => inv.status === status).length
          const total = invoices
            .filter((inv) => inv.status === status)
            .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)

          return (
            <div
              key={status}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <StatusPill status={status} />
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {count}
                </div>
              </div>

              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {total > 0 ? (
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {fmtINR(total)}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}