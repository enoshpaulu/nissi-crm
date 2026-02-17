import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft,
  Edit,
  TrendingUp,
  TrendingDown,
  DollarSign,
  User,
  FileText,
  Receipt,
  CheckCircle,
} from 'lucide-react'

const statusBadge = (status) => {
  const map = {
    completed: 'bg-green-100 text-green-700 ring-green-200',
    in_progress: 'bg-blue-100 text-blue-700 ring-blue-200',
    on_hold: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
    cancelled: 'bg-red-100 text-red-700 ring-red-200',
  }
  return map[status] || 'bg-gray-100 text-gray-700 ring-gray-200'
}

const timelineStyle = (type) => {
  // Tailwind-safe (no dynamic class names)
  const map = {
    project_start: { wrap: 'bg-blue-100 text-blue-700', line: 'bg-blue-200' },
    quotation: { wrap: 'bg-purple-100 text-purple-700', line: 'bg-purple-200' },
    payment: { wrap: 'bg-green-100 text-green-700', line: 'bg-green-200' },
    expense: { wrap: 'bg-red-100 text-red-700', line: 'bg-red-200' },
    project_end: { wrap: 'bg-green-100 text-green-700', line: 'bg-green-200' },
  }
  return map[type] || { wrap: 'bg-gray-100 text-gray-700', line: 'bg-gray-200' }
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjectDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`project-detail-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `project_id=eq.${id}` },
        () => fetchProjectDetails()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `project_id=eq.${id}` },
        () => fetchProjectDetails()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchProjectDetails = async () => {
    try {
      setLoading(true)

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(
          `
          *,
          lead:leads(*),
          quotation:quotations(*),
          invoice:invoices(*)
        `
        )
        .eq('id', id)
        .single()

      if (projectError) throw projectError

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', id)
        .order('payment_date', { ascending: true })

      if (paymentsError) throw paymentsError

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', id)
        .order('expense_date', { ascending: true })

      if (expensesError) throw expensesError

      setProject(projectData)
      setPayments(paymentsData || [])
      setExpenses(expensesData || [])

      buildTimeline(projectData, paymentsData || [], expensesData || [])
    } catch (error) {
      console.error('Error fetching project:', error)
      alert('Error loading project: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const buildTimeline = (proj, pays, exps) => {
    const events = []

    if (proj.start_date) {
      events.push({
        date: proj.start_date,
        type: 'project_start',
        title: 'Project Started',
        icon: CheckCircle,
      })
    }

    if (proj.quotation) {
      events.push({
        date: proj.quotation.quotation_date,
        type: 'quotation',
        title: 'Quotation Created',
        description: `Quote: ${proj.quotation.quotation_number}`,
        amount: proj.quote_amount,
        icon: FileText,
      })
    }

    pays.forEach((payment) => {
      events.push({
        date: payment.payment_date,
        type: 'payment',
        title: 'Payment Received',
        description: `${payment.payment_mode?.replace('_', ' ')}`,
        amount: payment.amount,
        icon: TrendingUp,
      })
    })

    exps.forEach((expense) => {
      events.push({
        date: expense.expense_date,
        type: 'expense',
        title: 'Material Purchase',
        description: `${expense.category} - ${expense.vendor_name || 'Vendor'}`,
        amount: expense.amount,
        icon: TrendingDown,
      })
    })

    if (proj.completion_date) {
      events.push({
        date: proj.completion_date,
        type: 'project_end',
        title: 'Project Completed',
        icon: CheckCircle,
      })
    }

    events.sort((a, b) => new Date(a.date) - new Date(b.date))
    setTimeline(events)
  }

  const calculateFinancials = () => {
    const totalReceived = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
    const profit = totalReceived - totalSpent
    const margin = totalReceived > 0 ? (profit / totalReceived) * 100 : 0
    const completion =
      project?.quote_amount > 0 ? (totalReceived / parseFloat(project.quote_amount)) * 100 : 0

    return { totalReceived, totalSpent, profit, margin, completion }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Project not found</p>
        <Link to="/projects" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to Projects
        </Link>
      </div>
    )
  }

  const financials = calculateFinancials()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </button>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                {project.project_name}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadge(
                  project.status
                )}`}
              >
                {project.status?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              {project.lead?.company_name || project.lead?.contact_person || '—'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/projects/${id}/edit`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Project
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Quote Amount</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ₹{parseFloat(project.quote_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          {/* progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Collection progress</span>
              <span className="font-medium text-gray-700">{financials.completion.toFixed(0)}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-primary-600"
                style={{ width: `${Math.min(100, Math.max(0, financials.completion))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-green-100 bg-green-50 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-green-700">Total Received</p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                ₹{financials.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-green-700/80 mt-1">
                {financials.completion.toFixed(0)}% of quote
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/70 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-700" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-red-700">Total Spent</p>
              <p className="mt-1 text-2xl font-bold text-red-700">
                ₹{financials.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-red-700/80 mt-1">{expenses.length} expenses</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/70 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-700" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-blue-50 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-purple-700">Profit</p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  financials.profit >= 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                ₹{financials.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-600 mt-1">{financials.margin.toFixed(1)}% margin</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/70 flex items-center justify-center">
              <DollarSign
                className={`w-5 h-5 ${financials.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-8">
          {/* Timeline */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>
              <span className="text-xs text-gray-500">{timeline.length} events</span>
            </div>

            <div className="space-y-6">
              {timeline.map((event, index) => {
                const Icon = event.icon
                const styles = timelineStyle(event.type)

                return (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.wrap}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {index < timeline.length - 1 && (
                        <div className={`w-px flex-1 mt-2 ${styles.line}`} />
                      )}
                    </div>

                    <div className="flex-1 pb-1">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-medium text-gray-900">{event.title}</p>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-0.5">{event.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(event.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>

                        {event.amount && (
                          <div
                            className={`shrink-0 text-right font-semibold ${
                              event.type === 'payment'
                                ? 'text-green-700'
                                : event.type === 'expense'
                                ? 'text-red-700'
                                : 'text-gray-900'
                            }`}
                          >
                            {event.type === 'payment' && '+'}
                            {event.type === 'expense' && '-'}₹
                            {parseFloat(event.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Payments Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <span className="text-sm text-gray-500">{payments.length} payments</span>
            </div>

            {payments.length === 0 ? (
              <div className="px-6 pb-6">
                <p className="text-gray-500 text-sm">No payments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left font-semibold px-6 py-3">Date</th>
                      <th className="text-left font-semibold px-6 py-3">Mode</th>
                      <th className="text-left font-semibold px-6 py-3">Reference</th>
                      <th className="text-right font-semibold px-6 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50/60">
                        <td className="px-6 py-3 whitespace-nowrap">
                          {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-3 capitalize">
                          {payment.payment_mode?.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {payment.reference_number || '—'}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-green-700">
                          ₹{parseFloat(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan="3" className="px-6 py-3 text-right text-gray-700">
                        Total Received
                      </td>
                      <td className="px-6 py-3 text-right text-green-700">
                        ₹{financials.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expenses Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Expense History</h3>
              <span className="text-sm text-gray-500">{expenses.length} expenses</span>
            </div>

            {expenses.length === 0 ? (
              <div className="px-6 pb-6">
                <p className="text-gray-500 text-sm">No expenses recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left font-semibold px-6 py-3">Date</th>
                      <th className="text-left font-semibold px-6 py-3">Vendor</th>
                      <th className="text-left font-semibold px-6 py-3">Category</th>
                      <th className="text-left font-semibold px-6 py-3">Description</th>
                      <th className="text-right font-semibold px-6 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50/60">
                        <td className="px-6 py-3 whitespace-nowrap">
                          {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-3">{expense.vendor_name || '—'}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-600 max-w-xs truncate">
                          {expense.description || '—'}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-red-700">
                          ₹{parseFloat(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan="4" className="px-6 py-3 text-right text-gray-700">
                        Total Spent
                      </td>
                      <td className="px-6 py-3 text-right text-red-700">
                        ₹{financials.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Details */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-medium capitalize text-gray-900">
                  {project.status.replace('_', ' ')}
                </p>
              </div>

              {project.start_date && (
                <div>
                  <p className="text-gray-500">Start Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(project.start_date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              )}

              {project.completion_date && (
                <div>
                  <p className="text-gray-500">Completion Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(project.completion_date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              )}

              {project.description && (
                <div>
                  <p className="text-gray-500">Description</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
            <div className="space-y-2">
              {project.lead && (
                <Link
                  to={`/leads/${project.lead.id}`}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  <User className="w-4 h-4" />
                  View Customer
                </Link>
              )}

              {project.quotation && (
                <Link
                  to={`/quotations/${project.quotation.id}`}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  <FileText className="w-4 h-4" />
                  View Quotation ({project.quotation.quotation_number})
                </Link>
              )}

              {project.invoice && (
                <Link
                  to={`/invoices/${project.invoice.id}`}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  <Receipt className="w-4 h-4" />
                  View Invoice ({project.invoice.invoice_number})
                </Link>
              )}
            </div>
          </div>

          {/* Profit Summary */}
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-blue-50 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Summary</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue</span>
                <span className="font-semibold text-green-700">
                  ₹{financials.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Costs</span>
                <span className="font-semibold text-red-700">
                  ₹{financials.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="border-t border-purple-200/60 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Net Profit</span>
                  <span
                    className={`text-xl font-bold ${
                      financials.profit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    ₹{financials.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-2 text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                      financials.margin >= 0
                        ? 'bg-green-100 text-green-700 ring-green-200'
                        : 'bg-red-100 text-red-700 ring-red-200'
                    }`}
                  >
                    {financials.margin.toFixed(1)}% Profit Margin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
