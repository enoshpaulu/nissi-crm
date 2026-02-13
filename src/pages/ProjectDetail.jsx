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
  Calendar,
  User,
  FileText,
  Receipt,
  Package,
  CheckCircle,
  Clock,
} from 'lucide-react'

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
  }, [id])

  const fetchProjectDetails = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          lead:leads(*),
          quotation:quotations(*),
          invoice:invoices(*)
        `)
        .eq('id', id)
        .single()

      if (projectError) throw projectError

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', id)
        .order('payment_date', { ascending: true })

      if (paymentsError) throw paymentsError

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', id)
        .order('expense_date', { ascending: true })

      if (expensesError) throw expensesError

      setProject(projectData)
      setPayments(paymentsData || [])
      setExpenses(expensesData || [])
      
      // Build timeline
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

    // Add project start
    if (proj.start_date) {
      events.push({
        date: proj.start_date,
        type: 'project_start',
        title: 'Project Started',
        icon: CheckCircle,
        color: 'blue'
      })
    }

    // Add quotation
    if (proj.quotation) {
      events.push({
        date: proj.quotation.quotation_date,
        type: 'quotation',
        title: 'Quotation Created',
        description: `Quote: ${proj.quotation.quotation_number}`,
        amount: proj.quote_amount,
        icon: FileText,
        color: 'purple'
      })
    }

    // Add payments
    pays.forEach(payment => {
      events.push({
        date: payment.payment_date,
        type: 'payment',
        title: 'Payment Received',
        description: `${payment.payment_mode?.replace('_', ' ')}`,
        amount: payment.amount,
        icon: TrendingUp,
        color: 'green'
      })
    })

    // Add expenses
    exps.forEach(expense => {
      events.push({
        date: expense.expense_date,
        type: 'expense',
        title: 'Material Purchase',
        description: `${expense.category} - ${expense.vendor_name || 'Vendor'}`,
        amount: expense.amount,
        icon: TrendingDown,
        color: 'red'
      })
    })

    // Add project completion
    if (proj.completion_date) {
      events.push({
        date: proj.completion_date,
        type: 'project_end',
        title: 'Project Completed',
        icon: CheckCircle,
        color: 'green'
      })
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date))
    setTimeline(events)
  }

  const calculateFinancials = () => {
    const totalReceived = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
    const profit = totalReceived - totalSpent
    const margin = totalReceived > 0 ? (profit / totalReceived * 100) : 0
    const completion = project.quote_amount > 0 ? (totalReceived / project.quote_amount * 100) : 0

    return {
      totalReceived,
      totalSpent,
      profit,
      margin,
      completion
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Project not found</p>
        <Link to="/projects" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Projects
        </Link>
      </div>
    )
  }

  const financials = calculateFinancials()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{project.project_name}</h1>
          <p className="text-gray-600 mt-1">
            {project.lead?.company_name || project.lead?.contact_person}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to={`/projects/${id}/edit`} className="btn btn-secondary">
            <Edit className="w-4 h-4 mr-2" />
            Edit Project
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Quote Amount */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Quote Amount</p>
              <p className="text-xl font-bold text-gray-900">
                Rs. {parseFloat(project.quote_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        {/* Total Received */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Received</p>
              <p className="text-xl font-bold text-green-600">
                Rs. {financials.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{financials.completion.toFixed(0)}% of quote</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Total Spent */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-xl font-bold text-red-600">
                Rs. {financials.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{expenses.length} expenses</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Profit */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Profit</p>
              <p className={`text-xl font-bold ${financials.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rs. {financials.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{financials.margin.toFixed(1)}% margin</p>
            </div>
            <DollarSign className={`w-8 h-8 ${financials.profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Timeline */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Project Timeline</h3>
            <div className="space-y-4">
              {timeline.map((event, index) => {
                const Icon = event.icon
                return (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full bg-${event.color}-100 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${event.color}-600`} />
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 my-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{event.title}</p>
                          {event.description && (
                            <p className="text-sm text-gray-600">{event.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(event.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        {event.amount && (
                          <div className={`text-right font-bold ${event.type === 'payment' ? 'text-green-600' : event.type === 'expense' ? 'text-red-600' : 'text-gray-900'}`}>
                            {event.type === 'payment' && '+'}
                            {event.type === 'expense' && '-'}
                            Rs. {parseFloat(event.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Payment History ({payments.length})</h3>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-sm">No payments recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Reference</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.payment_date).toLocaleDateString('en-IN')}</td>
                        <td className="capitalize">{payment.payment_mode?.replace('_', ' ')}</td>
                        <td className="text-sm text-gray-600">{payment.reference_number || '-'}</td>
                        <td className="text-right font-bold text-green-600">
                          Rs. {parseFloat(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-gray-50">
                      <td colSpan="3" className="text-right">Total Received:</td>
                      <td className="text-right text-green-600">
                        Rs. {financials.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expenses Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Expense History ({expenses.length})</h3>
            {expenses.length === 0 ? (
              <p className="text-gray-500 text-sm">No expenses recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Vendor</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{new Date(expense.expense_date).toLocaleDateString('en-IN')}</td>
                        <td>{expense.vendor_name || '-'}</td>
                        <td><span className="badge badge-secondary">{expense.category}</span></td>
                        <td className="text-sm text-gray-600 max-w-xs truncate">{expense.description || '-'}</td>
                        <td className="text-right font-bold text-red-600">
                          Rs. {parseFloat(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-gray-50">
                      <td colSpan="4" className="text-right">Total Spent:</td>
                      <td className="text-right text-red-600">
                        Rs. {financials.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
          {/* Project Info */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Project Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium capitalize">{project.status.replace('_', ' ')}</p>
              </div>
              {project.start_date && (
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-medium">{new Date(project.start_date).toLocaleDateString('en-IN')}</p>
                </div>
              )}
              {project.completion_date && (
                <div>
                  <p className="text-sm text-gray-600">Completion Date</p>
                  <p className="font-medium">{new Date(project.completion_date).toLocaleDateString('en-IN')}</p>
                </div>
              )}
              {project.description && (
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-sm">{project.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              {project.lead && (
                <Link
                  to={`/leads/${project.lead.id}`}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <User className="w-4 h-4" />
                  View Customer
                </Link>
              )}
              {project.quotation && (
                <Link
                  to={`/quotations/${project.quotation.id}`}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <FileText className="w-4 h-4" />
                  View Quotation ({project.quotation.quotation_number})
                </Link>
              )}
              {project.invoice && (
                <Link
                  to={`/invoices/${project.invoice.id}`}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <Receipt className="w-4 h-4" />
                  View Invoice ({project.invoice.invoice_number})
                </Link>
              )}
            </div>
          </div>

          {/* Profit Summary */}
          <div className="card bg-gradient-to-br from-purple-50 to-blue-50">
            <h3 className="text-lg font-semibold mb-4">Profit Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Revenue:</span>
                <span className="font-bold text-green-600">
                  Rs. {financials.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Costs:</span>
                <span className="font-bold text-red-600">
                  Rs. {financials.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Net Profit:</span>
                  <span className={`text-xl font-bold ${financials.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Rs. {financials.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-center mt-2">
                  <span className={`text-sm font-semibold ${financials.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
