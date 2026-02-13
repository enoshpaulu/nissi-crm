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
  FileText,
  Copy,
  BadgeCheck,
} from 'lucide-react'

const statusMeta = {
  draft: { label: 'Draft', pill: 'bg-gray-50 text-gray-700 ring-gray-200', accent: 'bg-gray-400' },
  sent: { label: 'Sent', pill: 'bg-sky-50 text-sky-700 ring-sky-200', accent: 'bg-sky-500' },
  approved: { label: 'Approved', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', accent: 'bg-emerald-600' },
  rejected: { label: 'Rejected', pill: 'bg-rose-50 text-rose-700 ring-rose-200', accent: 'bg-rose-600' },
  expired: { label: 'Expired', pill: 'bg-amber-50 text-amber-700 ring-amber-200', accent: 'bg-amber-500' },
}

export default function Quotations() {
  const { isAdmin, isSales } = useAuth()
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchQuotations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchQuotations = async () => {
    try {
      setLoading(true)
      setRefreshing(true)

      const { data, error } = await supabase
        .from('quotations')
        .select(
          `
          *,
          lead:lead_id(id, company_name, contact_person),
          created_user:created_by(id, full_name)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuotations(data || [])
    } catch (error) {
      console.error('Error fetching quotations:', error)
      alert('Error loading quotations: ' + error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleDelete = async (id, quotationNumber) => {
    if (!window.confirm(`Delete quotation "${quotationNumber}"? This action cannot be undone.`)) return
    try {
      const { error } = await supabase.from('quotations').delete().eq('id', id)
      if (error) throw error
      alert('Quotation deleted successfully')
      fetchQuotations()
    } catch (error) {
      console.error('Error deleting quotation:', error)
      alert('Error deleting quotation: ' + error.message)
    }
  }

  const handleClone = async (quotation) => {
    if (!window.confirm(`Create a new version of quotation ${quotation.quotation_number}?`)) return

    try {
      const { data: items } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotation.id)

      const { data: newQuotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          quotation_number: quotation.quotation_number,
          version: quotation.version + 1,
          lead_id: quotation.lead_id,
          quotation_date: new Date().toISOString().split('T')[0],
          valid_until: quotation.valid_until,
          status: 'draft',
          subtotal: quotation.subtotal,
          tax_rate: quotation.tax_rate,
          tax_amount: quotation.tax_amount,
          total_amount: quotation.total_amount,
          notes: quotation.notes,
          terms_and_conditions: quotation.terms_and_conditions,
          created_by: quotation.created_by,
        })
        .select()
        .single()

      if (quotationError) throw quotationError

      if (items?.length) {
        const newItems = items.map((item) => ({
          quotation_id: newQuotation.id,
          product_id: item.product_id,
          item_name: item.item_name,
          description: item.description,
          image_url: item.image_url,
          units: item.units,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          base_price: item.base_price,
          gst_amount: item.gst_amount,
          sort_order: item.sort_order,
        }))
        await supabase.from('quotation_items').insert(newItems)
      }

      alert(`New version created: ${quotation.quotation_number} (v${quotation.version + 1})`)
      fetchQuotations()
    } catch (error) {
      console.error('Error cloning quotation:', error)
      alert('Error creating new version: ' + error.message)
    }
  }

  const filteredQuotations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return quotations.filter((quotation) => {
      const matchesSearch =
        !q ||
        quotation.quotation_number?.toLowerCase().includes(q) ||
        quotation.lead?.company_name?.toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [quotations, searchTerm, statusFilter])

  const counts = useMemo(() => {
    const base = { draft: 0, sent: 0, approved: 0, rejected: 0, expired: 0 }
    const totals = { draft: 0, sent: 0, approved: 0, rejected: 0, expired: 0 }

    for (const q of quotations) {
      if (base[q.status] !== undefined) {
        base[q.status] += 1
        totals[q.status] += Number(q.total_amount || 0)
      }
    }
    return { base, totals }
  }, [quotations])

  const inputBase =
    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition ' +
    'focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400'

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
        {/* Header */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-4">
          <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur shadow-sm">
            <div className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-xs uppercase tracking-wider text-gray-500">CRM</div>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 bg-gray-50 text-gray-700 ring-gray-200">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {filteredQuotations.length} {filteredQuotations.length === 1 ? 'quotation' : 'quotations'}
                    {(searchTerm || statusFilter !== 'all') ? ' • filtered' : ''}
                  </span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">Quotations</h1>
                <p className="text-sm text-gray-600 mt-1">Create versions, track status, and manage approvals.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {(isAdmin || isSales) && (
                  <Link
                    to="/quotations/new"
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Quotation
                  </Link>
                )}

                <button
                  onClick={fetchQuotations}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60"
                >
                  <span className={`mr-2 ${refreshing ? 'animate-spin' : ''}`}>
                    <RefreshCw className="w-4 h-4" />
                  </span>
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['draft', 'sent', 'approved', 'rejected', 'expired'].map((s) => (
            <div key={s} className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusMeta[s].pill}`}>
                  {statusMeta[s].label}
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${statusMeta[s].accent}`} />
              </div>
              <div className="mt-3 text-2xl font-bold text-gray-900">{counts.base[s]}</div>
              {counts.totals[s] > 0 ? (
                <div className="text-xs text-gray-500 mt-1">₹{counts.totals[s].toLocaleString('en-IN')}</div>
              ) : (
                <div className="text-xs text-gray-400 mt-1">—</div>
              )}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
            <div className="font-semibold text-gray-900">Filters</div>
            <div className="text-xs text-gray-500">Find quotations quickly</div>
          </div>

          <div className="p-5">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by quotation number or company…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${inputBase} pl-10 h-11 rounded-full border-gray-200`}
                  />
                </div>
              </div>

              <div className="lg:w-56">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`${inputBase} h-11 rounded-xl border-gray-200`}
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Status chips */}
              <div className="flex flex-wrap gap-2 lg:ml-auto">
                {['all', 'draft', 'sent', 'approved', 'rejected', 'expired'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setStatusFilter(k)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                      statusFilter === k
                        ? 'bg-gray-900 text-white ring-gray-900'
                        : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {k === 'all' ? 'All' : statusMeta[k]?.label || k}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-gray-50/70">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Quotation</th>
                  <th className="px-5 py-3">Lead / Company</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Valid Until</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created By</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-gray-500">
                      {searchTerm || statusFilter !== 'all'
                        ? 'No quotations match your filters'
                        : 'No quotations yet. Create your first quotation to get started!'}
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((q) => {
                    const pill = statusMeta[q.status]?.pill || 'bg-gray-50 text-gray-700 ring-gray-200'
                    const amount = Number(q.total_amount || 0)

                    return (
                      <tr key={q.id} className="hover:bg-gray-50/60 transition">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-200">
                              <FileText className="w-4 h-4 text-gray-500" />
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900">{q.quotation_number}</div>
                              {q.version > 1 ? (
                                <div className="text-xs text-gray-500">Version {q.version}</div>
                              ) : (
                                <div className="text-xs text-gray-400">—</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">{q.lead?.company_name || 'N/A'}</div>
                          {q.lead?.contact_person ? (
                            <div className="text-sm text-gray-500">{q.lead.contact_person}</div>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {q.quotation_date ? new Date(q.quotation_date).toLocaleDateString('en-IN') : '—'}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-IN') : '—'}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">₹{amount.toLocaleString('en-IN')}</div>
                          <div className="text-xs text-gray-500">incl. GST</div>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${pill}`}>
                            {statusMeta[q.status]?.label || q.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">{q.created_user?.full_name || 'Unknown'}</td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/quotations/${q.id}`}
                              className="inline-flex items-center justify-center rounded-xl p-2 text-emerald-700 hover:bg-emerald-50 transition"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {(isAdmin || isSales) ? (
                              <>
                                <Link
                                  to={`/quotations/${q.id}/edit`}
                                  className="inline-flex items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Link>

                                <button
                                  onClick={() => handleClone(q)}
                                  className="inline-flex items-center justify-center rounded-xl p-2 text-sky-700 hover:bg-sky-50 transition"
                                  title="Create New Version"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>

                                {isAdmin ? (
                                  <button
                                    onClick={() => handleDelete(q.id, q.quotation_number)}
                                    className="inline-flex items-center justify-center rounded-xl p-2 text-rose-700 hover:bg-rose-50 transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : null}
                              </>
                            ) : null}
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
      </div>
    </div>
  )
}
