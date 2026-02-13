import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'

const initialFormData = {
  project_name: '',
  lead_id: '',
  quotation_id: '',
  invoice_id: '',
  quote_amount: '',
  status: 'in_progress',
  start_date: new Date().toISOString().split('T')[0],
  completion_date: '',
  description: '',
  notes: '',
}

export default function ProjectForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState(initialFormData)
  const [leads, setLeads] = useState([])
  const [quotations, setQuotations] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchDropdownData()
    if (id) {
      fetchProject()
    }
  }, [id])

  const fetchDropdownData = async () => {
    try {
      // Fetch leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, company_name, contact_person')
        .order('company_name')

      setLeads(leadsData || [])

      // Fetch quotations
      const { data: quotationsData } = await supabase
        .from('quotations')
        .select('id, quotation_number, lead_id, total_amount')
        .order('quotation_number', { ascending: false })

      setQuotations(quotationsData || [])

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, invoice_number, lead_id, total_amount')
        .order('invoice_number', { ascending: false })

      setInvoices(invoicesData || [])
    } catch (error) {
      console.error('Error fetching dropdown data:', error)
    }
  }

  const fetchProject = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData(data)
    } catch (error) {
      console.error('Error fetching project:', error)
      alert('Error loading project: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Auto-fill quote amount from quotation
    if (name === 'quotation_id' && value) {
      const selectedQuote = quotations.find(q => q.id === value)
      if (selectedQuote) {
        setFormData(prev => ({
          ...prev,
          quote_amount: selectedQuote.total_amount,
          lead_id: selectedQuote.lead_id
        }))
      }
    }

    // Auto-fill from invoice
    if (name === 'invoice_id' && value) {
      const selectedInvoice = invoices.find(i => i.id === value)
      if (selectedInvoice) {
        setFormData(prev => ({
          ...prev,
          lead_id: selectedInvoice.lead_id
        }))
      }
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.project_name) newErrors.project_name = 'Project name is required'
    if (!formData.quote_amount || formData.quote_amount <= 0) newErrors.quote_amount = 'Valid quote amount is required'
    if (!formData.start_date) newErrors.start_date = 'Start date is required'

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

      const projectData = {
        ...formData,
        quote_amount: parseFloat(formData.quote_amount),
        lead_id: formData.lead_id || null,
        quotation_id: formData.quotation_id || null,
        invoice_id: formData.invoice_id || null,
        completion_date: formData.completion_date || null,
        created_by: user.id,
        updated_by: user.id
      }

      if (id) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', id)

        if (error) throw error

        alert('Project updated successfully')
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([projectData])

        if (error) throw error

        alert('Project created successfully')
      }

      navigate('/projects')
    } catch (error) {
      console.error('Error saving project:', error)
      alert('Error saving project: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {id ? 'Edit Project' : 'Create New Project'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label required">
                Project Name
              </label>
              <input
                type="text"
                name="project_name"
                className={`input ${errors.project_name ? 'border-red-500' : ''}`}
                value={formData.project_name}
                onChange={handleChange}
                placeholder="e.g., Home Theater Installation - Mr. Kiran"
                required
              />
              {errors.project_name && (
                <p className="text-red-500 text-sm mt-1">{errors.project_name}</p>
              )}
            </div>

            <div>
              <label className="label">
                Select Quotation
              </label>
              <select
                name="quotation_id"
                className="input"
                value={formData.quotation_id}
                onChange={handleChange}
              >
                <option value="">Select quotation (optional)</option>
                {quotations.map(quote => (
                  <option key={quote.id} value={quote.id}>
                    {quote.quotation_number} - Rs. {parseFloat(quote.total_amount).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Auto-fills customer and amount</p>
            </div>

            <div>
              <label className="label">
                Select Invoice
              </label>
              <select
                name="invoice_id"
                className="input"
                value={formData.invoice_id}
                onChange={handleChange}
              >
                <option value="">Select invoice (optional)</option>
                {invoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - Rs. {parseFloat(invoice.total_amount).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                Customer
              </label>
              <select
                name="lead_id"
                className="input"
                value={formData.lead_id}
                onChange={handleChange}
              >
                <option value="">Select customer (optional)</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.company_name || lead.contact_person}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label required">
                Quote Amount
              </label>
              <input
                type="number"
                name="quote_amount"
                className={`input ${errors.quote_amount ? 'border-red-500' : ''}`}
                value={formData.quote_amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
              {errors.quote_amount && (
                <p className="text-red-500 text-sm mt-1">{errors.quote_amount}</p>
              )}
            </div>
          </div>
        </div>

        {/* Project Timeline */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Project Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label required">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                className={`input ${errors.start_date ? 'border-red-500' : ''}`}
                value={formData.start_date}
                onChange={handleChange}
                required
              />
              {errors.start_date && (
                <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>
              )}
            </div>

            <div>
              <label className="label">
                Completion Date
              </label>
              <input
                type="date"
                name="completion_date"
                className="input"
                value={formData.completion_date}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="label">
                Status
              </label>
              <select
                name="status"
                className="input"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
          <div className="space-y-4">
            <div>
              <label className="label">
                Description
              </label>
              <textarea
                name="description"
                className="input"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                placeholder="Project scope and requirements"
              ></textarea>
            </div>

            <div>
              <label className="label">
                Notes
              </label>
              <textarea
                name="notes"
                className="input"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Internal notes and comments"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/projects')}
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
            {loading ? 'Saving...' : id ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>

      {!id && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> After creating the project, link payments and expenses to this project 
            to track profitability. You can do this when recording payments or expenses.
          </p>
        </div>
      )}
    </div>
  )
}