import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateProfessionalInvoicePDF } from '../utils/professionalPdfGenerator'
import {
  ArrowLeft,
  Edit,
  Download,
  Receipt,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

const statusColors = {
  draft: 'badge-gray',
  sent: 'badge-info',
  paid: 'badge-success',
  partial: 'badge-warning',
  overdue: 'badge-danger',
  cancelled: 'badge-gray',
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, profile } = useAuth()
  const isAccounts = profile?.role === 'accounts'
  const [invoice, setInvoice] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoiceDetails()
    fetchPayments()
  }, [id])

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true)

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          lead:lead_id(
            id,
            company_name,
            contact_person,
            email,
            phone,
            address,
            city,
            state,
            pincode,
            gstin
          ),
          quotation:quotation_id(id, quotation_number),
          created_user:created_by(id, full_name)
        `)
        .eq('id', id)
        .single()

      if (invoiceError) throw invoiceError

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order')

      if (itemsError) throw itemsError

      setInvoice(invoiceData)
      setLineItems(itemsData || [])
    } catch (error) {
      console.error('Error fetching invoice:', error)
      alert('Error loading invoice details')
      navigate('/invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          created_user:created_by(id, full_name)
        `)
        .eq('invoice_id', id)
        .order('payment_date', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      setInvoice((prev) => ({ ...prev, status: newStatus }))
      alert('Status updated successfully')
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status: ' + error.message)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      await generateProfessionalInvoicePDF(invoice, invoice.lead, lineItems)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF: ' + error.message)
    }
  }

  const calculateTotals = () => {
    const total = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const taxableAmount = total / 1.18
    const gstAmount = total - taxableAmount
    return {
      total,
      taxableAmount,
      gstAmount,
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
    }
  }

  const isOverdue = () => {
    if (!invoice.due_date || invoice.status === 'paid') return false
    return new Date(invoice.due_date) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!invoice) {
    return <div>Invoice not found</div>
  }

  const totals = calculateTotals()
  const overdue = isOverdue()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/invoices')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {invoice.invoice_number}
              </h1>
              <span className={`badge ${statusColors[invoice.status]}`}>
                {invoice.status}
              </span>
              {overdue && (
                <span className="badge badge-danger">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Overdue
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              {invoice.lead?.company_name || 'No company'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || isAccounts) && (
            <>
              <Link to={`/invoices/${id}/edit`} className="btn btn-secondary">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
              <button onClick={handleDownloadPDF} className="btn btn-primary">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Overdue Alert */}
      {overdue && (
        <div className="card border-red-200 bg-red-50">
          <div className="card-body">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <p className="font-medium text-red-900">This invoice is overdue</p>
                <p className="text-sm text-red-700 mt-1">
                  Due date was {new Date(invoice.due_date).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">Company</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                    {invoice.lead?.company_name || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Contact Person</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    {invoice.lead?.contact_person || 'N/A'}
                  </div>
                </div>

                {invoice.lead?.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <div className="mt-1 flex items-center text-gray-900">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={`mailto:${invoice.lead.email}`} className="hover:text-primary-600">
                        {invoice.lead.email}
                      </a>
                    </div>
                  </div>
                )}

                {invoice.lead?.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <div className="mt-1 flex items-center text-gray-900">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={`tel:${invoice.lead.phone}`} className="hover:text-primary-600">
                        {invoice.lead.phone}
                      </a>
                    </div>
                  </div>
                )}

                {(invoice.lead?.address || invoice.lead?.city || invoice.lead?.state) && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <div className="mt-1 flex items-start text-gray-900">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                      <div>
                        {invoice.lead.address && <div>{invoice.lead.address}</div>}
                        <div>
                          {[invoice.lead.city, invoice.lead.state, invoice.lead.pincode]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {invoice.lead?.gstin && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">GSTIN</label>
                    <div className="mt-1 text-gray-900">{invoice.lead.gstin}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-16">Image</th>
                      <th>Model</th>
                      <th>Description</th>
                      <th>Units</th>
                      <th className="text-right">Quantity</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.item_name} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="font-medium">{item.item_name}</td>
                        <td className="text-sm text-gray-600">{item.description}</td>
                        <td>{item.units}</td>
                        <td className="text-right">{Number(item.quantity).toLocaleString('en-IN')}</td>
                        <td className="text-right">
                          ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right font-semibold">
                          ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
            </div>
            <div className="card-body">
              <div className="max-w-md ml-auto space-y-3">
                <div className="flex justify-between text-lg">
                  <span>Subtotal (Incl. GST):</span>
                  <span className="font-semibold">
                    ₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Taxable Amount:</span>
                    <span>₹{totals.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST (9%):</span>
                    <span>₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST (9%):</span>
                    <span>₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total GST (18%):</span>
                    <span>₹{totals.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="border-t-2 border-gray-300 pt-3 space-y-2">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total Amount:</span>
                    <span className="text-primary-600">
                      ₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg text-green-600">
                    <span>Paid:</span>
                    <span className="font-semibold">
                      ₹{Number(invoice.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg text-red-600">
                    <span>Balance Due:</span>
                    <span className="font-bold">
                      ₹{Number(invoice.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
            </div>
            <div className="card-body">
              {payments.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No payments recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            ₹{Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.payment_date).toLocaleDateString('en-IN')} • {payment.payment_mode}
                          </p>
                          {payment.reference_number && (
                            <p className="text-xs text-gray-500">Ref: {payment.reference_number}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.created_user?.full_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes and T&C */}
          {(invoice.notes || invoice.terms_and_conditions || invoice.payment_terms) && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
              </div>
              <div className="card-body space-y-4">
                {invoice.payment_terms && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment Terms</h3>
                    <p className="text-gray-700">{invoice.payment_terms}</p>
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms_and_conditions && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{invoice.terms_and_conditions}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          {(isAdmin || isAccounts) && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
              </div>
              <div className="card-body">
                <select value={invoice.status} onChange={(e) => handleStatusUpdate(e.target.value)} className="input">
                  <option value="draft">Draft</option>
                  <option value="sent">Sent to Customer</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partially Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  Update the invoice status based on payment status
                </p>
              </div>
            </div>
          )}

          {/* Invoice Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Invoice Details</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Invoice Number</label>
                <div className="mt-1 text-gray-900 font-medium">{invoice.invoice_number}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Invoice Date</label>
                <div className="mt-1 flex items-center text-gray-900">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {invoice.due_date && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Due Date</label>
                  <div className={`mt-1 flex items-center ${overdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              )}

              {invoice.quotation_id && (
                <div>
                  <label className="text-sm font-medium text-gray-600">From Quotation</label>
                  <div className="mt-1">
                    <Link to={`/quotations/${invoice.quotation_id}`} className="text-primary-600 hover:text-primary-700">
                      {invoice.quotation?.quotation_number || 'View Quotation'}
                    </Link>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">Created By</label>
                <div className="mt-1 text-gray-900">{invoice.created_user?.full_name || 'Unknown'}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Created On</label>
                <div className="mt-1 text-gray-900">
                  {new Date(invoice.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Items Count</label>
                <div className="mt-1 text-gray-900">{lineItems.length}</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="card-body space-y-2">
              {invoice.lead_id && (
                <Link to={`/leads/${invoice.lead_id}`} className="btn btn-secondary w-full">
                  View Customer
                </Link>
              )}
              {invoice.quotation_id && (
                <Link to={`/quotations/${invoice.quotation_id}`} className="btn btn-secondary w-full">
                  View Quotation
                </Link>
              )}
              {invoice.balance_amount > 0 && (isAdmin || isAccounts) && (
                <Link
                  to={`/payments/new?invoice_id=${invoice.id}`}
                  className="btn btn-primary w-full"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </Link>
              )}
              <button className="btn btn-secondary w-full" disabled>
                Send via Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}