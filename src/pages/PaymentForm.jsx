import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'

const initialFormData = {
  invoice_id: '',
  amount: '',
  payment_date: new Date().toISOString().split('T')[0],
  payment_mode: 'cash',
  reference_number: '',
  notes: '',
}

export default function PaymentForm() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [formData, setFormData] = useState(initialFormData)
  const [invoices, setInvoices] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [projectId, setProjectId] = useState(null)

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchInvoices()

    const params = new URLSearchParams(location.search)
    const invoiceId = params.get('invoice_id')
    if (invoiceId) {
      setFormData((prev) => ({ ...prev, invoice_id: invoiceId }))
      loadInvoice(invoiceId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  useEffect(() => {
    if (formData.invoice_id) {
      loadInvoice(formData.invoice_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.invoice_id])

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, balance_amount, lead:lead_id(company_name)')
        .gt('balance_amount', 0)
        .order('invoice_date', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
      alert('Error fetching invoices: ' + error.message)
    }
  }

  const loadInvoice = async (invoiceId) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, lead:lead_id(company_name)')
        .eq('id', invoiceId)
        .single()

      if (error) throw error

      setSelectedInvoice(data)

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('invoice_id', invoiceId)
        .maybeSingle()

      if (projectError) throw projectError
      setProjectId(projectData?.id || null)

      // Auto-fill amount only if user hasn't typed one yet
      setFormData((prev) => {
        if (!prev.amount) return { ...prev, amount: data.balance_amount }
        return prev
      })
    } catch (error) {
      console.error('Error loading invoice:', error)
      // keep silent or show alert depending on your preference
      alert('Error loading invoice: ' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({ ...prev, [name]: value }))

    // If invoice is cleared, reset dependent state
    if (name === 'invoice_id' && !value) {
      setProjectId(null)
      setSelectedInvoice(null)
      setFormData((prev) => ({ ...prev, amount: '' }))
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.invoice_id) newErrors.invoice_id = 'Please select an invoice'

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (selectedInvoice && parseFloat(formData.amount) > parseFloat(selectedInvoice.balance_amount)) {
      newErrors.amount = 'Amount cannot exceed balance due'
    }

    if (!formData.payment_date) newErrors.payment_date = 'Payment date is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return alert('Please fill required fields correctly')
    }

    setLoading(true)

    try {
      if (!selectedInvoice) {
        throw new Error('Please select a valid invoice')
      }

      const amount = parseFloat(formData.amount)

      // Create payment record
      const { error: paymentError } = await supabase.from('payments').insert({
        invoice_id: formData.invoice_id,
        project_id: projectId,
        amount,
        payment_date: formData.payment_date,
        payment_mode: formData.payment_mode,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
        created_by: user.id,
      })

      if (paymentError) throw paymentError

      // Update invoice amounts
      const newPaidAmount = parseFloat(selectedInvoice.paid_amount || 0) + amount
      const newBalance = parseFloat(selectedInvoice.total_amount || 0) - newPaidAmount

      let newStatus = selectedInvoice.status
      if (newBalance <= 0) newStatus = 'paid'
      else if (newPaidAmount > 0) newStatus = 'partial'

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalance,
          status: newStatus,
        })
        .eq('id', formData.invoice_id)

      if (invoiceError) throw invoiceError

      alert('Payment recorded successfully')
      navigate('/payments')
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Error recording payment: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const afterThisPayment =
    selectedInvoice
      ? Math.max(0, Number(selectedInvoice.balance_amount) - Number(formData.amount || 0))
      : 0

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/payments')}
          className="p-2 rounded-xl hover:bg-gray-100 transition"
          type="button"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Record Payment</h1>
          <p className="text-gray-500 mt-1">Record a customer payment against an invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
            {projectId && (
              <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                Linked to project
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Invoice */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice <span className="text-red-500">*</span>
              </label>
              <select
                name="invoice_id"
                value={formData.invoice_id}
                onChange={handleChange}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition
                  ${errors.invoice_id ? 'border-red-500' : 'border-gray-300'}
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                required
              >
                <option value="">Select invoice...</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.lead?.company_name} — Balance: ₹
                    {Number(inv.balance_amount).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
              {errors.invoice_id && <p className="text-red-500 text-sm mt-2">{errors.invoice_id}</p>}
            </div>

            {/* Invoice Summary */}
            {selectedInvoice && (
              <div className="md:col-span-2 bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <Summary label="Total" value={selectedInvoice.total_amount} />
                  <Summary label="Paid" value={selectedInvoice.paid_amount} color="green" />
                  <Summary label="Balance" value={selectedInvoice.balance_amount} color="red" />
                  <Summary label="After Payment" value={afterThisPayment} color="primary" />
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={`w-full pl-9 rounded-xl border px-4 py-3 text-sm outline-none transition
                    ${errors.amount ? 'border-red-500' : 'border-gray-300'}
                    focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={selectedInvoice?.balance_amount}
                  required
                />
              </div>
              {errors.amount && <p className="text-red-500 text-sm mt-2">{errors.amount}</p>}

              {selectedInvoice && (
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, amount: selectedInvoice.balance_amount }))
                  }
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Pay full balance (₹{Number(selectedInvoice.balance_amount).toLocaleString('en-IN')})
                </button>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition
                  ${errors.payment_date ? 'border-red-500' : 'border-gray-300'}
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                required
              />
              {errors.payment_date && (
                <p className="text-red-500 text-sm mt-2">{errors.payment_date}</p>
              )}
            </div>

            {/* Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                name="payment_mode"
                value={formData.payment_mode}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
              </select>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                name="reference_number"
                value={formData.reference_number}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Transaction ID, Cheque No, etc."
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Any additional notes about this payment..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/payments')}
            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Summary({ label, value, color = 'gray' }) {
  const colorMap = {
    gray: 'text-gray-900',
    green: 'text-green-600',
    red: 'text-red-600',
    primary: 'text-primary-600',
  }

  return (
    <div>
      <p className="text-gray-600">{label}</p>
      <p className={`font-semibold ${colorMap[color]}`}>
        ₹{Number(value || 0).toLocaleString('en-IN')}
      </p>
    </div>
  )
}
