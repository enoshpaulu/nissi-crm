import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Building2,
  User,
  MapPin,
  RefreshCw,
  BadgeCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const statusMeta = {
  new: { label: 'New', pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
  contacted: { label: 'Contacted', pill: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  qualified: { label: 'Qualified', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  proposal: { label: 'Proposal', pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  negotiation: { label: 'Negotiation', pill: 'bg-orange-50 text-orange-700 ring-orange-200' },
  won: { label: 'Won', pill: 'bg-green-50 text-green-700 ring-green-200' },
  lost: { label: 'Lost', pill: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

export default function Leads() {
  const { isAdmin, isSales } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('leads')
        .select(
          `
          *,
          assigned_user:assigned_to(id, full_name),
          created_user:created_by(id, full_name)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
      alert('Error loading leads: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, companyName) => {
    if (!window.confirm(`Delete lead "${companyName}"? This action cannot be undone.`)) return

    try {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error

      alert('Lead deleted successfully')
      fetchLeads()
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Error deleting lead: ' + error.message)
    }
  }

  const filteredLeads = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    return leads.filter((lead) => {
      const matchesSearch =
        !q ||
        lead.company_name?.toLowerCase().includes(q) ||
        lead.contact_person?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q) ||
        lead.phone?.includes(searchTerm)

      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [leads, searchTerm, statusFilter])

  const counts = useMemo(() => {
    const base = { new: 0, contacted: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0 }
    for (const l of leads) {
      if (base[l.status] !== undefined) base[l.status] += 1
    }
    return base
  }, [leads])

  const inputBase =
    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition ' +
    'focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400'

  const card =
    'rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden'
  const cardHeader =
    'px-5 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex items-center justify-between'
  const cardBody = 'p-5'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-120px)]">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary-100/60 blur-3xl" />
        <div className="absolute top-32 right-10 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        {/* Header */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-4">
          <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-xs uppercase tracking-wider text-gray-500">CRM</div>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 bg-gray-50 text-gray-700 ring-gray-200">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
                    {searchTerm || statusFilter !== 'all' ? ' • filtered' : ''}
                  </span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">Leads</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Search, filter, and manage your pipeline.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {(isAdmin || isSales) && (
                  <Link
                    to="/leads/new"
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition ring-1 ring-emerald-600/20"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lead
                  </Link>
                )}

                <button
                  onClick={fetchLeads}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={card}>
          <div className={cardHeader}>
            <div className="font-semibold text-gray-900">Filters</div>
            <div className="text-xs text-gray-500">Find leads quickly</div>
          </div>

          <div className={cardBody}>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search company, contact, email, or phone…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${inputBase} pl-10 h-11 rounded-full border-gray-200`}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="lg:w-56">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`${inputBase} h-11 rounded-xl border-gray-200`}
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>

            {/* Quick filter chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                  statusFilter === 'all'
                    ? 'bg-gray-900 text-white ring-gray-900'
                    : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
                }`}
              >
                All
              </button>

              {Object.keys(statusMeta).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setStatusFilter(k)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                    statusFilter === k
                      ? 'bg-gray-900 text-white ring-gray-900'
                      : `${statusMeta[k].pill} hover:opacity-90`
                  }`}
                >
                  {statusMeta[k].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={card}>
          <div className={cardHeader}>
            <div className="font-semibold text-gray-900">All Leads</div>
            <div className="text-xs text-gray-500">
              Showing {filteredLeads.length} of {leads.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="text-left border-b border-gray-100 bg-gray-50/40">
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-500">Company</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-500">Contact</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-500">Contact Info</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-500">Assigned</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-500">Value</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-500">Created</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-500 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center text-gray-500">
                      {searchTerm || statusFilter !== 'all'
                        ? 'No leads match your filters'
                        : 'No leads yet. Create your first lead to get started!'}
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const pill = statusMeta[lead.status]?.pill || 'bg-gray-50 text-gray-700 ring-gray-200'

                    return (
                      <tr key={lead.id} className="hover:bg-gray-50/60 transition">
                        {/* Company */}
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-start gap-2">
                            <Building2 className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 truncate">{lead.company_name}</div>
                              {lead.city ? (
                                <div className="mt-1 inline-flex items-center text-sm text-gray-500">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {lead.city}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-4 align-top">
                          <div className="inline-flex items-center text-gray-800">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="font-medium">{lead.contact_person || '—'}</span>
                          </div>
                        </td>

                        {/* Contact info */}
                        <td className="px-5 py-4 align-top">
                          <div className="space-y-1.5">
                            {lead.email ? (
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                <a href={`mailto:${lead.email}`} className="hover:text-primary-700">
                                  {lead.email}
                                </a>
                              </div>
                            ) : null}

                            {lead.phone ? (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                <a href={`tel:${lead.phone}`} className="hover:text-primary-700">
                                  {lead.phone}
                                </a>
                              </div>
                            ) : null}

                            {!lead.email && !lead.phone ? (
                              <div className="text-sm text-gray-400">—</div>
                            ) : null}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 align-top">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 capitalize ${pill}`}>
                            {lead.status}
                          </span>
                        </td>

                        {/* Assigned */}
                        <td className="px-5 py-4 align-top">
                          {lead.assigned_user?.full_name ? (
                            <span className="text-sm font-medium text-gray-800">{lead.assigned_user.full_name}</span>
                          ) : (
                            <span className="text-sm text-gray-400">Unassigned</span>
                          )}
                        </td>

                        {/* Value */}
                        <td className="px-5 py-4 align-top">
                          {lead.estimated_value ? (
                            <span className="font-semibold text-gray-900">
                              ₹{Number(lead.estimated_value).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-5 py-4 align-top">
                          <div className="text-sm text-gray-600">
                            {new Date(lead.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/leads/${lead.id}`}
                              className="inline-flex items-center justify-center rounded-lg p-2 text-primary-700 hover:bg-primary-50 transition"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {(isAdmin || isSales) ? (
                              <>
                                <Link
                                  to={`/leads/${lead.id}/edit`}
                                  className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 transition"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Link>

                                {isAdmin ? (
                                  <button
                                    onClick={() => handleDelete(lead.id, lead.company_name)}
                                    className="inline-flex items-center justify-center rounded-lg p-2 text-rose-700 hover:bg-rose-50 transition"
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

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.keys(statusMeta).map((k) => (
            <div key={k} className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-4 hover:shadow-md transition">
              <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusMeta[k].pill}`}>
                {statusMeta[k].label}
              </div>
              <div className="mt-3 text-2xl font-bold text-gray-900">{counts[k]}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
