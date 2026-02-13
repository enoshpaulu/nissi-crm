import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'

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
    'Miscellaneous'
  ]

  const paymentModes = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'card', label: 'Card' }
  ]

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const projectId = params.get('project_id')
    if (!id && projectId) {
      setFormData(prev => ({ ...prev, project_id: projectId }))
    }
  }, [location.search, id])

  useEffect(() => {
    if (id) {
      fetchExpense()
    }
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
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single()

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
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
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

    if (!validate()) {
      return
    }

    try {
      setLoading(true)

      const expenseData = {
        ...formData,
        project_id: formData.project_id || null,
        amount: parseFloat(formData.amount),
        created_by: user.id,
        updated_by: user.id
      }

      if (id) {
        // Update existing expense
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', id)

        if (error) throw error

        alert('Expense updated successfully')
      } else {
        // Create new expense
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData])

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
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/expenses')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Expenses
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {id ? 'Edit Expense' : 'Record New Expense'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Vendor Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Vendor Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Vendor Name
              </label>
              <input
                type="text"
                name="vendor_name"
                className="input"
                value={formData.vendor_name}
                onChange={handleChange}
                placeholder="Enter vendor name"
              />
            </div>

            <div>
              <label className="label required">
                Category
              </label>
              <select
                name="category"
                className={`input ${errors.category ? 'border-red-500' : ''}`}
                value={formData.category}
                onChange={handleChange}
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category}</p>
              )}
            </div>
          </div>
        </div>

        {/* Expense Details */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Expense Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">
                Project (for profitability tracking)
              </label>
              <select
                name="project_id"
                className="input"
                value={formData.project_id || ''}
                onChange={handleChange}
              >
                <option value="">Not linked to a project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label required">
                Amount
              </label>
              <input
                type="number"
                name="amount"
                className={`input ${errors.amount ? 'border-red-500' : ''}`}
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="label required">
                Expense Date
              </label>
              <input
                type="date"
                name="expense_date"
                className={`input ${errors.expense_date ? 'border-red-500' : ''}`}
                value={formData.expense_date}
                onChange={handleChange}
                required
              />
              {errors.expense_date && (
                <p className="text-red-500 text-sm mt-1">{errors.expense_date}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="label">
                Description
              </label>
              <textarea
                name="description"
                className="input"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                placeholder="Brief description of the expense"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label required">
                Payment Mode
              </label>
              <select
                name="payment_mode"
                className={`input ${errors.payment_mode ? 'border-red-500' : ''}`}
                value={formData.payment_mode}
                onChange={handleChange}
                required
              >
                {paymentModes.map(mode => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
              {errors.payment_mode && (
                <p className="text-red-500 text-sm mt-1">{errors.payment_mode}</p>
              )}
            </div>

            <div>
              <label className="label">
                Reference Number
              </label>
              <input
                type="text"
                name="reference_number"
                className="input"
                value={formData.reference_number}
                onChange={handleChange}
                placeholder="Transaction ID, Cheque No., etc."
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">
                Notes
              </label>
              <textarea
                name="notes"
                className="input"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Additional notes or comments"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : id ? 'Update Expense' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  )
}
