import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft,
  Save,
  Briefcase,
  FileText,
  Receipt,
  User as UserIcon,
  Calendar,
  StickyNote,
  Sparkles,
} from 'lucide-react'

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
    if (id) fetchProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchDropdownData = async () => {
    try {
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, company_name, contact_person')
        .order('company_name')

      setLeads(leadsData || [])

      const { data: quotationsData } = await supabase
        .from('quotations')
        .select('id, quotation_number, lead_id, total_amount')
        .order('quotation_number', { ascending: false })

      setQuotations(quotationsData || [])

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
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
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

    setFormData((prev) => ({ ...prev, [name]: value }))

    // Auto-fill quote amount + lead from quotation
    if (name === 'quotation_id' && value) {
      const selectedQuote = quotations.find((q) => q.id === value)
      if (selectedQuote) {
        setFormData((prev) => ({
          ...prev,
          quote_amount: selectedQuote.total_amount,
          lead_id: selectedQuote.lead_id,
          quotation_id: value,
        }))
      }
    }

    // Auto-fill lead from invoice
    if (name === 'invoice_id' && value) {
      const selectedInvoice = invoices.find((i) => i.id === value)
      if (selectedInvoice) {
        setFormData((prev) => ({
          ...prev,
          lead_id: selectedInvoice.lead_id,
          invoice_id: value,
        }))
      }
    }

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.project_name) newErrors.project_name = 'Project name is required'
    if (!formData.quote_amount || formData.quote_amount <= 0)
      newErrors.quote_amount = 'Valid quote amount is required'
    if (!formData.start_date) newErrors.start_date = 'Start date is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

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
        updated_by: user.id,
      }

      if (id) {
        const { error } = await supabase.from('projects').update(projectData).eq('id', id)
        if (error) throw error
        alert('Project updated successfully')
      } else {
        const { error } = await supabase.from('projects').insert([projectData])
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

  const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const selectedLeadLabel = useMemo(() => {
    if (!formData.lead_id) return 'No customer selected'
    const lead = leads.find((l) => l.id === formData.lead_id)
    return lead ? lead.company_name || lead.contact_person : 'Customer selected'
  }, [formData.lead_id, leads])

  if (loading && id) {
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

      <div className="mx-auto max-w-3xl space-y-6 pb-10">
        {/* Header */}
        <div className="pt-4">
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </button>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-white/80 ring-1 ring-gray-200">
                  <Briefcase className="w-3.5 h-3.5" />
                  Project
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-white/80 ring-1 ring-gray-200">
                  <UserIcon className="w-3.5 h-3.5" />
                  {selectedLeadLabel}
                </span>
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-gray-900">
                {id ? 'Edit Project' : 'Create New Project'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Link customer + quotation/invoice and track profitability with expenses & payments.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white/80 ring-1 ring-gray-200 px-3 py-2 text-xs text-gray-600">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Clean, modern form
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden"
        >
          {/* Section: Basic */}
          <div className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
                <p className="text-sm text-gray-600">Set name, customer, and quote amount.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  placeholder="e.g., Home Theater Installation - Mr. Kiran"
                  className={`w-full h-11 rounded-xl border bg-white px-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition
                    focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400
                    ${errors.project_name ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400' : 'border-gray-200'}
                  `}
                  required
                />
                {errors.project_name && (
                  <p className="text-rose-600 text-sm mt-1">{errors.project_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Quotation</label>
                <select
                  name="quotation_id"
                  value={formData.quotation_id}
                  onChange={handleChange}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm transition
                    focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                >
                  <option value="">Select quotation (optional)</option>
                  {quotations.map((quote) => (
                    <option key={quote.id} value={quote.id}>
                      {quote.quotation_number} — ₹{fmt(quote.total_amount)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Auto-fills customer and amount</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Invoice</label>
                <select
                  name="invoice_id"
                  value={formData.invoice_id}
                  onChange={handleChange}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm transition
                    focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                >
                  <option value="">Select invoice (optional)</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} — ₹{fmt(invoice.total_amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select
                  name="lead_id"
                  value={formData.lead_id}
                  onChange={handleChange}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm transition
                    focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                >
                  <option value="">Select customer (optional)</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.company_name || lead.contact_person}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quote Amount <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    name="quote_amount"
                    value={formData.quote_amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`w-full h-11 rounded-xl border bg-white pl-8 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition
                      focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400
                      ${errors.quote_amount ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400' : 'border-gray-200'}
                    `}
                    required
                  />
                </div>
                {errors.quote_amount && (
                  <p className="text-rose-600 text-sm mt-1">{errors.quote_amount}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Timeline */}
          <div className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-y border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Project Timeline</h3>
                <p className="text-sm text-gray-600">Dates + status to track progress.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={`w-full h-11 rounded-xl border bg-white px-3 text-sm text-gray-900 shadow-sm transition
                    focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400
                    ${errors.start_date ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400' : 'border-gray-200'}
                  `}
                  required
                />
                {errors.start_date && (
                  <p className="text-rose-600 text-sm mt-1">{errors.start_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Date</label>
                <input
                  type="date"
                  name="completion_date"
                  value={formData.completion_date}
                  onChange={handleChange}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm transition
                    focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm transition
                    focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Notes */}
          <div className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-y border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center">
                <StickyNote className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Additional Details</h3>
                <p className="text-sm text-gray-600">Scope + internal notes.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Project scope and requirements"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition
                    focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Internal notes and comments"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition
                    focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {id ? 'Update Project' : 'Create Project'}
                </>
              )}
            </button>
          </div>
        </form>

        {!id && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
            <span className="font-semibold">Tip:</span> After creating the project, link payments and
            expenses to this project to track profitability.
          </div>
        )}
      </div>
    </div>
  )
}
