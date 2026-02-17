import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, RefreshCw, BadgeCheck, Building2, Calendar, CreditCard } from 'lucide-react'

const initialFormData = {
  project_id: '',
  vendor_name: '',
  category: 'Miscellaneous',
  description: '',
  amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  payment_mode: 'cash',
  reference_number: '',
  notes: '',
}

export default function ExpenseForm() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState(initialFormData)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const isEditing = !!id

  const categories = [
    'Rent',
    'Utilities',
    'Salaries',
    'Inventory',
    'Marketing',
    'Transportation',
    'Office Supplies',
    'Maintenance',
    'Insurance',
    'Professional Fees',
    'Taxes',
    'Miscellaneous',
  ]

  const paymentModes = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'card', label: 'Card' },
  ]

  // ===== UI tokens (styling only) =====
  const ui = {
    page: 'min-h-[calc(100vh-120px)]',
    shell: 'mx-auto max-w-3xl space-y-6 pb-10',
    card: 'rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden',
    header:
      'px-5 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex items-center justify-between',
    body: 'p-5',
    input:
      'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition ' +
      'focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 border-gray-200',
    label: 'block text-sm font-medium text-gray-700 mb-1',
    helper: 'text-xs text-gray-500 mt-1',
    error: 'text-sm text-rose-600 mt-1',
    divider: 'border-t border-gray-100 pt-4',
    btnPrimary:
      'inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60',
    btnSecondary:
      'inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60',
    pill: 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
    field:
      'rounded-2xl border border-gray-200/70 bg-white p-4 ring-1 ring-gray-100',
    sectionTitle: 'text-sm font-semibold text-gray-900 flex items-center gap-2',
    requiredDot: 'text-rose-600',
  }

  const fmtINR = (n) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const amountPreview = useMemo(() => {
    const n = parseFloat(formData.amount || 0)
    if (!n || n <= 0) return null
    return fmtINR(n)
  }, [formData.amount])

  useEffect(() => {
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const projectId = params.get('project_id')
    if (!id && projectId) {
      setFormData((prev) => ({ ...prev, project_id: projectId }))
    }
  }, [location.search, id])

  useEffect(() => {
    if (id) fetchExpense()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name', { ascending: true })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchExpense = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('expenses').select('*').eq('id', id).single()
      if (error) throw error
      setFormData(data)
    } catch (error) {
      console.error('Error fetching expense:', error)
      alert('Error loading expense: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount is required'
    if (!formData.expense_date) newErrors.expense_date = 'Expense date is required'
    if (!formData.payment_mode) newErrors.payment_mode = 'Payment mode is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setLoading(true)

      const expenseData = {
        ...formData,
        project_id: formData.project_id || null,
        amount: parseFloat(formData.amount),
        created_by: user.id,
        updated_by: user.id,
      }

      if (id) {
        const { error } = await supabase.from('expenses').update(expenseData).eq('id', id)
        if (error) throw error
        alert('Expense updated successfully')
      } else {
        const { error } = await supabase.from('expenses').insert([expenseData])
        if (error) throw error
        alert('Expense recorded successfully')
      }

      navigate('/expenses')
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Error saving expense: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={ui.page}>
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute top-28 right-8 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />
      </div>

      <div className={ui.shell}>
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Expenses
          </button>

          <span className={`${ui.pill} bg-gray-50 text-gray-700 ring-gray-200 self-start sm:self-auto`}>
            <BadgeCheck className="w-4 h-4 mr-1" />
            {isEditing ? 'Editing expense' : 'New expense'}
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            {isEditing ? 'Edit Expense' : 'Record New Expense'}
          </h1>
          <p className="text-sm text-gray-600">
            Keep expense records clean for reporting and profitability tracking.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={ui.card}>
          {/* Header */}
          <div className={ui.header}>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-gray-900">Expense Details</div>
              {amountPreview ? (
                <span className={`${ui.pill} bg-rose-50 text-rose-700 ring-rose-200`}>{amountPreview}</span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={isEditing ? fetchExpense : () => setFormData(initialFormData)}
              disabled={loading}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 disabled:opacity-60"
              title={isEditing ? 'Reload expense' : 'Reset form'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {isEditing ? 'Reload' : 'Reset'}
            </button>
          </div>

          <div className={ui.body}>
            <div className="space-y-6">
              {/* Vendor */}
              <div className={ui.field}>
                <div className={ui.sectionTitle}>
                  <Building2 className="w-4 h-4 text-gray-400" />
                  Vendor Information
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={ui.label}>Vendor Name</label>
                    <input
                      type="text"
                      name="vendor_name"
                      className={ui.input}
                      value={formData.vendor_name}
                      onChange={handleChange}
                      placeholder="Enter vendor name"
                    />
                    <p className={ui.helper}>Optional, but helps with searching and audits.</p>
                  </div>

                  <div>
                    <label className={ui.label}>
                      Category <span className={ui.requiredDot}>*</span>
                    </label>
                    <select
                      name="category"
                      className={`${ui.input} ${errors.category ? 'border-rose-500 focus:ring-rose-100 focus:border-rose-500' : ''}`}
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {errors.category ? <p className={ui.error}>{errors.category}</p> : null}
                  </div>
                </div>
              </div>

              {/* Expense Details */}
              <div className={ui.field}>
                <div className={ui.sectionTitle}>
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Expense Details
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={ui.label}>Project (for profitability tracking)</label>
                    <select
                      name="project_id"
                      className={ui.input}
                      value={formData.project_id || ''}
                      onChange={handleChange}
                    >
                      <option value="">Not linked to a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.project_name}
                        </option>
                      ))}
                    </select>
                    <p className={ui.helper}>Optional. Use this if you want project-wise profitability.</p>
                  </div>

                  <div>
                    <label className={ui.label}>
                      Amount <span className={ui.requiredDot}>*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        name="amount"
                        className={`${ui.input} pl-8 ${errors.amount ? 'border-rose-500 focus:ring-rose-100 focus:border-rose-500' : ''}`}
                        value={formData.amount}
                        onChange={handleChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    {errors.amount ? <p className={ui.error}>{errors.amount}</p> : null}
                  </div>

                  <div>
                    <label className={ui.label}>
                      Expense Date <span className={ui.requiredDot}>*</span>
                    </label>
                    <input
                      type="date"
                      name="expense_date"
                      className={`${ui.input} ${errors.expense_date ? 'border-rose-500 focus:ring-rose-100 focus:border-rose-500' : ''}`}
                      value={formData.expense_date}
                      onChange={handleChange}
                      required
                    />
                    {errors.expense_date ? <p className={ui.error}>{errors.expense_date}</p> : null}
                  </div>

                  <div className="md:col-span-2">
                    <label className={ui.label}>Description</label>
                    <textarea
                      name="description"
                      className={ui.input}
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Brief description of the expense"
                    />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className={ui.field}>
                <div className={ui.sectionTitle}>
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  Payment Information
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={ui.label}>
                      Payment Mode <span className={ui.requiredDot}>*</span>
                    </label>
                    <select
                      name="payment_mode"
                      className={`${ui.input} ${errors.payment_mode ? 'border-rose-500 focus:ring-rose-100 focus:border-rose-500' : ''}`}
                      value={formData.payment_mode}
                      onChange={handleChange}
                      required
                    >
                      {paymentModes.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                    {errors.payment_mode ? <p className={ui.error}>{errors.payment_mode}</p> : null}
                  </div>

                  <div>
                    <label className={ui.label}>Reference Number</label>
                    <input
                      type="text"
                      name="reference_number"
                      className={ui.input}
                      value={formData.reference_number}
                      onChange={handleChange}
                      placeholder="Transaction ID, Cheque No., etc."
                    />
                    <p className={ui.helper}>Optional. Useful for UPI/Bank/Cheque reconciliation.</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className={ui.label}>Notes</label>
                    <textarea
                      name="notes"
                      className={ui.input}
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Additional notes or comments"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={`${ui.divider} flex flex-col sm:flex-row sm:justify-end gap-3`}>
                <button
                  type="button"
                  onClick={() => navigate('/expenses')}
                  className={ui.btnSecondary}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button type="submit" className={ui.btnPrimary} disabled={loading}>
                  {loading ? (
                    <span className="inline-flex items-center">
                      <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Saving…
                    </span>
                  ) : (
                    <span className="inline-flex items-center">
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? 'Update Expense' : 'Save Expense'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
