import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateProfessionalQuotationPDF } from '../utils/professionalPdfGenerator'
import {
  ArrowLeft,
  Edit,
  Copy,
  Download,
  FileText,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Receipt,
} from 'lucide-react'

const statusColors = {
  draft: 'badge-gray',
  sent: 'badge-info',
  approved: 'badge-success',
  rejected: 'badge-danger',
  expired: 'badge-warning',
}

export default function QuotationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, isSales } = useAuth()
  const [quotation, setQuotation] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuotationDetails()
  }, [id])

  const fetchQuotationDetails = async () => {
    try {
      setLoading(true)

      // Fetch quotation
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
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
          created_user:created_by(id, full_name)
        `)
        .eq('id', id)
        .single()

      if (quotationError) throw quotationError

      // Fetch line items with product category
      const { data: itemsData, error: itemsError } = await supabase
        .from('quotation_items')
        .select(`
          *,
          product:product_id(category)
        `)
        .eq('quotation_id', id)
        .order('sort_order')

      if (itemsError) throw itemsError

      // Merge product category into item if item category is missing
      const itemsWithCategory = (itemsData || []).map(item => ({
        ...item,
        category: item.category || item.product?.category || 'UNCATEGORIZED'
      }))

      setQuotation(quotationData)
      setLineItems(itemsWithCategory)
    } catch (error) {
      console.error('Error fetching quotation:', error)
      alert('Error loading quotation details')
      navigate('/quotations')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      setQuotation((prev) => ({ ...prev, status: newStatus }))
      alert('Status updated successfully')
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status: ' + error.message)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      await generateProfessionalQuotationPDF(quotation, quotation.lead, lineItems)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF: ' + error.message)
    }
  }

  const handleClone = async () => {
    if (!window.confirm(`Create a new version of ${quotation.quotation_number}?`)) {
      return
    }

    try {
      // Create new quotation with incremented version
      const { data: newQuotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          quotation_number: quotation.quotation_number,
          version: quotation.version + 1,
          lead_id: quotation.lead_id,
          quotation_date: new Date().toISOString().split('T')[0],
          valid_until: quotation.valid_until,
          status: 'draft',
          subtotal: quotation.subtotal,
          tax_rate: quotation.tax_rate,
          tax_amount: quotation.tax_amount,
          total_amount: quotation.total_amount,
          notes: quotation.notes,
          terms_and_conditions: quotation.terms_and_conditions,
          created_by: user.id,
        })
        .select()
        .single()

      if (quotationError) throw quotationError

      // Copy line items
      if (lineItems.length > 0) {
        const newItems = lineItems.map((item) => ({
          quotation_id: newQuotation.id,
          product_id: item.product_id,
          item_name: item.item_name,
          description: item.description,
          image_url: item.image_url,
          units: item.units,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          base_price: item.base_price,
          gst_amount: item.gst_amount,
          sort_order: item.sort_order,
        }))

        await supabase.from('quotation_items').insert(newItems)
      }

      alert(`New version created: ${quotation.quotation_number} (v${quotation.version + 1})`)
      navigate(`/quotations/${newQuotation.id}`)
    } catch (error) {
      console.error('Error cloning quotation:', error)
      alert('Error creating new version: ' + error.message)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!quotation) {
    return <div>Quotation not found</div>
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {quotation.quotation_number}
              </h1>
              {quotation.version > 1 && (
                <span className="badge badge-gray">Version {quotation.version}</span>
              )}
              <span className={`badge ${statusColors[quotation.status]}`}>
                {quotation.status}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              {quotation.lead?.company_name || 'No company'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || isSales) && (
            <>
              <button
                onClick={handleClone}
                className="btn btn-secondary"
                title="Create New Version"
              >
                <Copy className="w-4 h-4 mr-2" />
                Clone
              </button>
              <Link
                to={`/invoices/new?quotation_id=${id}`}
                className="btn btn-secondary"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Convert to Invoice
              </Link>
              <Link to={`/quotations/${id}/edit`} className="btn btn-secondary">
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
                    {quotation.lead?.company_name || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Contact Person</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    {quotation.lead?.contact_person || 'N/A'}
                  </div>
                </div>

                {quotation.lead?.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <div className="mt-1 flex items-center text-gray-900">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <a
                        href={`mailto:${quotation.lead.email}`}
                        className="hover:text-primary-600"
                      >
                        {quotation.lead.email}
                      </a>
                    </div>
                  </div>
                )}

                {quotation.lead?.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <div className="mt-1 flex items-center text-gray-900">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <a
                        href={`tel:${quotation.lead.phone}`}
                        className="hover:text-primary-600"
                      >
                        {quotation.lead.phone}
                      </a>
                    </div>
                  </div>
                )}

                {(quotation.lead?.address || quotation.lead?.city || quotation.lead?.state) && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <div className="mt-1 flex items-start text-gray-900">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                      <div>
                        {quotation.lead.address && <div>{quotation.lead.address}</div>}
                        <div>
                          {[
                            quotation.lead.city,
                            quotation.lead.state,
                            quotation.lead.pincode,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {quotation.lead?.gstin && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">GSTIN</label>
                    <div className="mt-1 text-gray-900">{quotation.lead.gstin}</div>
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
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-12 h-12 object-cover rounded"
                            />
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
                    <span>
                      ₹{totals.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
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
                <div className="border-t-2 border-gray-300 pt-3 flex justify-between text-xl font-bold">
                  <span>Grand Total:</span>
                  <span className="text-primary-600">
                    ₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes and T&C */}
          {(quotation.notes || quotation.terms_and_conditions) && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
              </div>
              <div className="card-body space-y-4">
                {quotation.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
                  </div>
                )}
                {quotation.terms_and_conditions && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Terms & Conditions
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {quotation.terms_and_conditions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          {(isAdmin || isSales) && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
              </div>
              <div className="card-body">
                <select
                  value={quotation.status}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                  className="input"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent to Customer</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  Update the quotation status based on customer response
                </p>
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Quotation Details</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Quotation Number</label>
                <div className="mt-1 text-gray-900 font-medium">
                  {quotation.quotation_number}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Version</label>
                <div className="mt-1 text-gray-900">{quotation.version}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Date</label>
                <div className="mt-1 flex items-center text-gray-900">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {new Date(quotation.quotation_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {quotation.valid_until && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Valid Until</label>
                  <div className="mt-1 text-gray-900">
                    {new Date(quotation.valid_until).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">Created By</label>
                <div className="mt-1 text-gray-900">
                  {quotation.created_user?.full_name || 'Unknown'}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Created On</label>
                <div className="mt-1 text-gray-900">
                  {new Date(quotation.created_at).toLocaleDateString('en-IN', {
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
              {quotation.lead_id && (
                <Link
                  to={`/leads/${quotation.lead_id}`}
                  className="btn btn-secondary w-full"
                >
                  View Lead
                </Link>
              )}
              <Link
                to={`/invoices/new?quotation_id=${quotation.id}`}
                className="btn btn-secondary w-full"
              >
                Convert to Invoice
              </Link>
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