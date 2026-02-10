import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import {
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  AlertCircle,
  Edit,
  Trash2,
  BadgeCheck,
  Clock,
} from 'lucide-react'

const statusMeta = {
  pending: { label: 'Pending', pill: 'bg-amber-50 text-amber-700 ring-amber-200', accent: 'bg-amber-500' },
  completed: { label: 'Completed', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', accent: 'bg-emerald-600' },
  cancelled: { label: 'Cancelled', pill: 'bg-rose-50 text-rose-700 ring-rose-200', accent: 'bg-rose-600' },
}

export default function Followups() {
  const { isAdmin } = useAuth()
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    fetchFollowups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchFollowups = async () => {
    try {
      setLoading(true)
      setRefreshing(true)

      const { data, error } = await supabase
        .from('followups')
        .select(
          `
          *,
          lead:lead_id(id, company_name, contact_person),
          invoice:invoice_id(id, invoice_number),
          assigned_user:assigned_to(id, full_name),
          created_user:created_by(id, full_name)
        `
        )
        .order('due_date', { ascending: true })
        .order('due_time', { ascending: true })

      if (error) throw error
      setFollowups(data || [])
    } catch (error) {
      console.error('Error fetching followups:', error)
      alert('Error loading follow-ups: ' + error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleComplete = async (id) => {
    try {
      const { error } = await supabase
        .from('followups')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      fetchFollowups()
    } catch (error) {
      console.error('Error completing followup:', error)
      alert('Error completing follow-up: ' + error.message)
    }
  }

  const handleCancel = async (id) => {
    try {
      const { error } = await supabase.from('followups').update({ status: 'cancelled' }).eq('id', id)
      if (error) throw error
      fetchFollowups()
    } catch (error) {
      console.error('Error cancelling followup:', error)
      alert('Error cancelling follow-up: ' + error.message)
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete follow-up "${title}"? This action cannot be undone.`)) return
    try {
      const { error } = await supabase.from('followups').delete().eq('id', id)
      if (error) throw error
      alert('Follow-up deleted successfully')
      fetchFollowups()
    } catch (error) {
      console.error('Error deleting followup:', error)
      alert('Error deleting follow-up: ' + error.message)
    }
  }

  const isOverdue = (followup) => {
    if (followup.status !== 'pending') return false
    const today = new Date().toISOString().split('T')[0]
    return followup.due_date < today
  }

  const filteredFollowups = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    return followups.filter((followup) => {
      const matchesSearch =
        !q ||
        followup.title?.toLowerCase().includes(q) ||
        followup.description?.toLowerCase().includes(q) ||
        followup.lead?.company_name?.toLowerCase().includes(q) ||
        followup.invoice?.invoice_number?.toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'all' || followup.status === statusFilter

      let matchesDate = true
      if (dateFilter !== 'all') {
        const today = new Date().toISOString().split('T')[0]
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        const weekFromNow = new Date()
        weekFromNow.setDate(weekFromNow.getDate() + 7)
        const weekStr = weekFromNow.toISOString().split('T')[0]

        if (dateFilter === 'overdue') matchesDate = isOverdue(followup)
        else if (dateFilter === 'today') matchesDate = followup.due_date === today
        else if (dateFilter === 'tomorrow') matchesDate = followup.due_date === tomorrowStr
        else if (dateFilter === 'week') matchesDate = followup.due_date >= today && followup.due_date <= weekStr
      }

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [followups, searchTerm, statusFilter, dateFilter])

  const overdueCount = useMemo(
    () => followups.filter((f) => f.status === 'pending' && isOverdue(f)).length,
    [followups]
  )

  const counts = useMemo(() => {
    const base = { pending: 0, completed: 0, cancelled: 0 }
    for (const f of followups) {
      if (base[f.status] !== undefined) base[f.status] += 1
    }
    return base
  }, [followups])

  const inputBase =
    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition ' +
    'focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400'

  const card =
    'rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden'

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
                    {filteredFollowups.length} {filteredFollowups.length === 1 ? 'task' : 'tasks'}
                    {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') ? ' • filtered' : ''}
                  </span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">Follow-ups</h1>
                <p className="text-sm text-gray-600 mt-1">Track tasks, due dates, and outcomes.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Link
                  to="/followups/new"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Follow-up
                </Link>

                <button
                  onClick={fetchFollowups}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['pending', 'completed', 'cancelled'].map((s) => (
            <div key={s} className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusMeta[s].pill}`}>
                  {statusMeta[s].label}
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${statusMeta[s].accent}`} />
              </div>
              <div className="mt-3 text-2xl font-bold text-gray-900">{counts[s]}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
          ))}
          <div className="rounded-2xl border border-rose-200/80 bg-white shadow-sm ring-1 ring-rose-100 p-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-rose-50 text-rose-700 ring-rose-200">
                Overdue
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-rose-600" />
            </div>
            <div className="mt-3 text-2xl font-bold text-gray-900">{overdueCount}</div>
            <div className="text-xs text-gray-500 mt-1">Pending</div>
          </div>
        </div>

        {/* Overdue Alert */}
        {overdueCount > 0 && (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50 shadow-sm ring-1 ring-rose-100">
            <div className="p-5 flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-rose-100 p-2">
                <AlertCircle className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <p className="font-semibold text-rose-900">
                  {overdueCount} overdue task{overdueCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-rose-800/80 mt-1">You have tasks that are past their due date.</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={card}>
          <div className="px-5 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
            <div className="font-semibold text-gray-900">Filters</div>
            <div className="text-xs text-gray-500">Find tasks quickly</div>
          </div>

          <div className="p-5">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search follow-ups…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${inputBase} pl-10 h-11 rounded-full border-gray-200`}
                  />
                </div>
              </div>

              <div className="lg:w-52">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`${inputBase} h-11 rounded-xl border-gray-200`}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="lg:w-52">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={`${inputBase} h-11 rounded-xl border-gray-200`}
                >
                  <option value="all">All Dates</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="week">This Week</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2 lg:ml-auto">
                {['all', 'overdue', 'today', 'tomorrow', 'week'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDateFilter(k)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                      dateFilter === k
                        ? 'bg-gray-900 text-white ring-gray-900'
                        : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {k === 'all'
                      ? 'All'
                      : k === 'overdue'
                      ? 'Overdue'
                      : k === 'today'
                      ? 'Today'
                      : k === 'tomorrow'
                      ? 'Tomorrow'
                      : 'This Week'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Follow-ups List */}
        <div className="space-y-4">
          {filteredFollowups.length === 0 ? (
            <div className={card}>
              <div className="p-10 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'No follow-ups match your filters'
                    : 'No follow-ups yet. Create your first task to get started!'}
                </p>
              </div>
            </div>
          ) : (
            filteredFollowups.map((followup) => {
              const overdue = isOverdue(followup)
              const pill = statusMeta[followup.status]?.pill || 'bg-gray-50 text-gray-700 ring-gray-200'
              const accent = statusMeta[followup.status]?.accent || 'bg-gray-400'

              return (
                <div
                  key={followup.id}
                  className={`rounded-2xl border shadow-sm ring-1 overflow-hidden transition ${
                    overdue
                      ? 'border-rose-200 ring-rose-100 bg-rose-50/40'
                      : 'border-gray-200/80 ring-gray-100 bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex">
                    <div className={`w-1.5 ${overdue ? 'bg-rose-600' : accent}`} />
                    <div className="p-5 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 text-lg truncate">
                                {followup.title}
                              </h3>
                              {followup.description ? (
                                <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                                  {followup.description}
                                </p>
                              ) : null}
                            </div>

                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${pill}`}>
                              {statusMeta[followup.status]?.label || followup.status}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              <span className={overdue ? 'text-rose-700 font-semibold' : ''}>
                                {new Date(followup.due_date).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>

                              {followup.due_time ? (
                                <span className="ml-2 inline-flex items-center text-gray-500">
                                  <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                  {followup.due_time}
                                </span>
                              ) : null}

                              {overdue ? (
                                <span className="ml-2 text-rose-700 font-semibold">(Overdue)</span>
                              ) : null}
                            </div>

                            {followup.lead ? (
                              <div className="flex items-center">
                                <span className="text-gray-500 mr-2">Lead:</span>
                                <Link
                                  to={`/leads/${followup.lead.id}`}
                                  className="font-medium text-emerald-700 hover:text-emerald-800"
                                >
                                  {followup.lead.company_name}
                                </Link>
                              </div>
                            ) : null}

                            {followup.invoice ? (
                              <div className="flex items-center">
                                <span className="text-gray-500 mr-2">Invoice:</span>
                                <Link
                                  to={`/invoices/${followup.invoice.id}`}
                                  className="font-medium text-emerald-700 hover:text-emerald-800"
                                >
                                  {followup.invoice.invoice_number}
                                </Link>
                              </div>
                            ) : null}

                            <div className="flex items-center">
                              <span className="text-gray-500 mr-2">Assigned:</span>
                              <span className="font-medium text-gray-800">
                                {followup.assigned_user?.full_name || 'Unassigned'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {followup.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleComplete(followup.id)}
                                className="inline-flex items-center justify-center rounded-xl p-2 text-emerald-700 hover:bg-emerald-50 transition"
                                title="Mark as Complete"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>

                              <button
                                onClick={() => handleCancel(followup.id)}
                                className="inline-flex items-center justify-center rounded-xl p-2 text-rose-700 hover:bg-rose-50 transition"
                                title="Cancel"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>

                              <Link
                                to={`/followups/${followup.id}/edit`}
                                className="inline-flex items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                            </>
                          ) : (
                            <Link
                              to={`/followups/${followup.id}/edit`}
                              className="inline-flex items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}

                          {isAdmin ? (
                            <button
                              onClick={() => handleDelete(followup.id, followup.title)}
                              className="inline-flex items-center justify-center rounded-xl p-2 text-rose-700 hover:bg-rose-50 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
