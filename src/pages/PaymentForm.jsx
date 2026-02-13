import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, DollarSign } from 'lucide-react'

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
      setFormData(prev => ({ ...prev, invoice_id: invoiceId }))
      loadInvoice(invoiceId)
    }
  }, [location])

  useEffect(() => {
    if (formData.invoice_id) {
      loadInvoice(formData.invoice_id)
    }
  }, [formData.invoice_id])

  const fetchInvoices = async () => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, balance_amount, lead:lead_id(company_name)')
        .gt('balance_amount', 0)
        .order('invoice_date', { ascending: false })
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
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

      const { data: projectData } = await supabase
        .from('projects')
        .select('id')
        .eq('invoice_id', invoiceId)
        .maybeSingle()

      setProjectId(projectData?.id || null)
      
      if (!formData.amount) {
        setFormData(prev => ({ ...prev, amount: data.balance_amount }))
      }
    } catch (error) {
      console.error('Error loading invoice:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'invoice_id' && !value) {
      setProjectId(null)
      setSelectedInvoice(null)
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
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
    if (!formData.payment_date) newErrors.payment_date = 'Payment date required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return alert('Please fill required fields correctly')

    setLoading(true)
    try {
      const amount = parseFloat(formData.amount)
      
      // Create payment record
      const { error: paymentError } = await supabase.from('payments').insert({
        invoice_id: formData.invoice_id,
        project_id: projectId,
        amount: amount,
        payment_date: formData.payment_date,
        payment_mode: formData.payment_mode,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
        created_by: user.id
      })

      if (paymentError) throw paymentError

      // Update invoice amounts
      const newPaidAmount = parseFloat(selectedInvoice.paid_amount) + amount
      const newBalance = parseFloat(selectedInvoice.total_amount) - newPaidAmount

      let newStatus = selectedInvoice.status
      if (newBalance <= 0) {
        newStatus = 'paid'
      } else if (newPaidAmount > 0) {
        newStatus = 'partial'
      }

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalance,
          status: newStatus
        })
        .eq('id', formData.invoice_id)

      if (invoiceError) throw invoiceError

      alert('Payment recorded successfully')
      navigate('/payments')
    } catch (error) {
      console.error('Error:', error)
      alert('Error recording payment: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/payments')} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
          <p className="text-gray-600 mt-1">Record a customer payment against an invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="card-header"><h2 className="text-lg font-semibold">Payment Details</h2></div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice <span className="text-red-500">*</span>
                </label>
                <select
                  name="invoice_id"
                  value={formData.invoice_id}
                  onChange={handleChange}
                  className={`input ${errors.invoice_id ? 'input-error' : ''}`}
                  required
                >
                  <option value="">Select invoice...</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.lead?.company_name} - Balance: ₹{Number(inv.balance_amount).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                {errors.invoice_id && <p className="text-red-500 text-sm mt-1">{errors.invoice_id}</p>}
              </div>

              {selectedInvoice && (
                <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Amount</p>
                      <p className="font-semibold text-gray-900">
                        ₹{Number(selectedInvoice.total_amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Already Paid</p>
                      <p className="font-semibold text-green-600">
                        ₹{Number(selectedInvoice.paid_amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Balance Due</p>
                      <p className="font-semibold text-red-600">
                        ₹{Number(selectedInvoice.balance_amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">After This Payment</p>
                      <p className="font-semibold text-primary-600">
                        ₹{Math.max(0, Number(selectedInvoice.balance_amount) - Number(formData.amount || 0)).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className={`input pl-8 ${errors.amount ? 'input-error' : ''}`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={selectedInvoice?.balance_amount}
                    required
                  />
                </div>
                {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
                {selectedInvoice && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, amount: selectedInvoice.balance_amount }))}
                    className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                  >
                    Pay full balance (₹{Number(selectedInvoice.balance_amount).toLocaleString('en-IN')})
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select name="payment_mode" value={formData.payment_mode} onChange={handleChange} className="input">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  name="reference_number"
                  value={formData.reference_number}
                  onChange={handleChange}
                  className="input"
                  placeholder="Transaction ID, Cheque No, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="input"
                  placeholder="Any additional notes about this payment..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/payments')} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Recording...' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Record Payment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
