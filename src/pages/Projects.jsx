import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  CheckCircle,
  Clock,
  Pause,
  XCircle,
  BadgeCheck,
  RefreshCw,
} from 'lucide-react'

export default function Projects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalRevenue: 0,
    totalCosts: 0,
    totalProfit: 0,
    avgMargin: 0,
  })

  useEffect(() => {
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select(
          `
          *,
          lead:leads(id, company_name, contact_person),
          quotation:quotations(id, quotation_number),
          invoice:invoices(id, invoice_number)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      const projectsWithFinancials = await Promise.all(
        (data || []).map(async (project) => {
          const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .eq('project_id', project.id)

          const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('project_id', project.id)

          const totalReceived =
            payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
          const totalSpent =
            expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0
          const profit = totalReceived - totalSpent
          const margin = totalReceived > 0 ? (profit / totalReceived) * 100 : 0

          return { ...project, totalReceived, totalSpent, profit, margin }
        })
      )

      setProjects(projectsWithFinancials)
      calculateStats(projectsWithFinancials)
    } catch (error) {
      console.error('Error fetching projects:', error)
      alert('Error loading projects: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (projectData) => {
    const totalRevenue = projectData.reduce((sum, p) => sum + p.totalReceived, 0)
    const totalCosts = projectData.reduce((sum, p) => sum + p.totalSpent, 0)
    const totalProfit = totalRevenue - totalCosts
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    setStats({
      totalProjects: projectData.length,
      totalRevenue,
      totalCosts,
      totalProfit,
      avgMargin,
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-indigo-600" />
      case 'on_hold':
        return <Pause className="w-4 h-4 text-amber-600" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-rose-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      in_progress: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
      on_hold: 'bg-amber-50 text-amber-700 ring-amber-200',
      cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
    }
    return map[status] || 'bg-gray-50 text-gray-700 ring-gray-200'
  }

  const filteredProjects = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    return projects.filter((project) => {
      const matchesSearch =
        !q ||
        project.project_name?.toLowerCase().includes(q) ||
        project.lead?.company_name?.toLowerCase().includes(q) ||
        project.lead?.contact_person?.toLowerCase().includes(q)

      const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus
      return matchesSearch && matchesStatus
    })
  }, [projects, searchTerm, selectedStatus])

  const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
                  <div className="text-xs uppercase tracking-wider text-gray-500">CRM</div>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 bg-gray-50 text-gray-700 ring-gray-200">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
                    {(searchTerm || selectedStatus !== 'all') ? ' • filtered' : ''}
                  </span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">Projects</h1>
                <p className="text-sm text-gray-600 mt-1">Track project profitability, revenue, and costs.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={fetchProjects}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>

                <Link
                  to="/projects/new"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProjects}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">₹{fmt(stats.totalRevenue)}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Costs</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">₹{fmt(stats.totalCosts)}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-rose-50 ring-1 ring-rose-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">₹{fmt(stats.totalProfit)}</p>
                <p className="text-xs text-gray-500 mt-1">Avg: {stats.avgMargin.toFixed(1)}% margin</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-purple-50 ring-1 ring-purple-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
            <div className="font-semibold text-gray-900">Filters</div>
            <div className="text-xs text-gray-500">Find projects fast</div>
          </div>

          <div className="p-5">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by project, company, or contact…"
                    className={
                      'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition ' +
                      'focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 border-gray-200 pl-10 h-11 rounded-full'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="lg:w-56">
                <select
                  className={
                    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition ' +
                    'focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 border-gray-200 h-11'
                  }
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* quick chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {['all', 'in_progress', 'completed', 'on_hold', 'cancelled'].map((k) => {
                const active = selectedStatus === k
                const label =
                  k === 'all'
                    ? 'All'
                    : k === 'in_progress'
                    ? 'In Progress'
                    : k === 'on_hold'
                    ? 'On Hold'
                    : k.charAt(0).toUpperCase() + k.slice(1).replace('_', ' ')

                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSelectedStatus(k)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                      active
                        ? 'bg-gray-900 text-white ring-gray-900'
                        : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
            <div className="font-semibold text-gray-900">Projects</div>
            <div className="text-xs text-gray-500">Profitability overview</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/70">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Quote</th>
                  <th className="px-5 py-3">Received</th>
                  <th className="px-5 py-3">Spent</th>
                  <th className="px-5 py-3">Profit</th>
                  <th className="px-5 py-3">Margin</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-gray-500">
                      No projects found.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => {
                    const statusPill = getStatusBadge(project.status)
                    const profitPositive = project.profit >= 0
                    const marginPositive = project.margin >= 0

                    return (
                      <tr key={project.id} className="hover:bg-gray-50/60 transition">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">{project.project_name}</div>
                          {project.quotation ? (
                            <div className="text-xs text-gray-500 mt-0.5">
                              Quote: {project.quotation.quotation_number}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">
                            {project.lead?.company_name || project.lead?.contact_person || '—'}
                          </div>
                          {project.lead?.contact_person && project.lead?.company_name ? (
                            <div className="text-xs text-gray-500 mt-0.5">{project.lead.contact_person}</div>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 font-medium text-gray-900">
                          ₹{fmt(project.quote_amount)}
                        </td>

                        <td className="px-5 py-4 font-semibold text-emerald-700">
                          ₹{fmt(project.totalReceived)}
                        </td>

                        <td className="px-5 py-4 font-semibold text-rose-700">
                          ₹{fmt(project.totalSpent)}
                        </td>

                        <td className={`px-5 py-4 font-bold ${profitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          ₹{fmt(project.profit)}
                        </td>

                        <td className={`px-5 py-4 font-semibold ${marginPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {project.margin.toFixed(1)}%
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(project.status)}
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusPill}`}>
                              {project.status?.replace('_', ' ')}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/projects/${project.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 text-xs font-semibold shadow-sm transition"
                          >
                            View Details
                          </Link>
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
