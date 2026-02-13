import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, Plus, X, Search, Trash2, Image as ImageIcon } from 'lucide-react'

const initialFormData = {
  lead_id: '',
  quotation_id: '',
  invoice_date: new Date().toISOString().split('T')[0],
  due_date: '',
  payment_terms: '',
  notes: '',
  terms_and_conditions: 'Payment is due within 30 days of invoice date.\nLate payments may incur additional charges.',
}

export default function InvoiceForm() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState(initialFormData)
  const [leads, setLeads] = useState([])
  const [quotations, setQuotations] = useState([])
  const [products, setProducts] = useState([])
  const [lineItems, setLineItems] = useState([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [convertingFrom, setConvertingFrom] = useState(null)

  const isEditing = !!id

  useEffect(() => {
    fetchLeads()
    fetchProducts()
    
    const params = new URLSearchParams(location.search)
    const quotationId = params.get('quotation_id')
    
    if (quotationId) {
      setConvertingFrom('quotation')
      loadFromQuotation(quotationId)
    } else if (isEditing) {
      fetchInvoice()
    } else {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)
      setFormData(prev => ({ ...prev, due_date: dueDate.toISOString().split('T')[0] }))
    }
  }, [id, location])

  useEffect(() => {
    if (formData.lead_id) {
      fetchQuotationsForLead(formData.lead_id)
    }
  }, [formData.lead_id])

  const fetchLeads = async () => {
    try {
      const { data } = await supabase.from('leads').select('id, company_name, contact_person')
        .order('company_name')
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    }
  }

  const fetchQuotationsForLead = async (leadId) => {
    try {
      const { data } = await supabase.from('quotations')
        .select('id, quotation_number, total_amount, status')
        .eq('lead_id', leadId)
        .in('status', ['approved', 'sent'])
        .order('created_at', { ascending: false })
      setQuotations(data || [])
    } catch (error) {
      console.error('Error fetching quotations:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').eq('is_active', true).order('model')
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const loadFromQuotation = async (quotationId) => {
    try {
      setLoading(true)
      const { data: quotation, error: qError } = await supabase
        .from('quotations').select('*').eq('id', quotationId).single()
      if (qError) throw qError

      setFormData(prev => ({
        ...prev,
        lead_id: quotation.lead_id,
        quotation_id: quotationId,
        notes: quotation.notes || '',
        terms_and_conditions: quotation.terms_and_conditions || prev.terms_and_conditions,
      }))

      const { data: items, error: iError } = await supabase
        .from('quotation_items').select('*').eq('quotation_id', quotationId).order('sort_order')
      if (iError) throw iError

      setLineItems(items.map(item => ({
        id: Date.now() + Math.random(),
        product_id: item.product_id,
        item_name: item.item_name,
        description: item.description,
        image_url: item.image_url,
        units: item.units,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount
      })))
    } catch (error) {
      console.error('Error loading quotation:', error)
      alert('Error loading quotation')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      const { data: invoice, error: invError } = await supabase
        .from('invoices').select('*').eq('id', id).single()
      if (invError) throw invError

      setFormData({
        lead_id: invoice.lead_id || '',
        quotation_id: invoice.quotation_id || '',
        invoice_date: invoice.invoice_date || '',
        due_date: invoice.due_date || '',
        payment_terms: invoice.payment_terms || '',
        notes: invoice.notes || '',
        terms_and_conditions: invoice.terms_and_conditions || '',
      })

      const { data: items, error: itemsError } = await supabase
        .from('invoice_items').select('*').eq('invoice_id', id).order('sort_order')
      if (itemsError) throw itemsError

      setLineItems(items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        item_name: item.item_name,
        description: item.description,
        image_url: item.image_url,
        units: item.units,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount
      })))
    } catch (error) {
      console.error('Error:', error)
      alert('Error loading invoice')
      navigate('/invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleQuotationSelect = async (e) => {
    const quotationId = e.target.value
    setFormData(prev => ({ ...prev, quotation_id: quotationId }))
    
    if (quotationId) {
      await loadFromQuotation(quotationId)
    }
  }

  const handleAddProduct = (product) => {
    setLineItems(prev => [...prev, {
      id: Date.now() + Math.random(),
      product_id: product.id,
      item_name: product.model,
      description: product.description || '',
      image_url: product.image_url || '',
      units: product.units,
      quantity: 1,
      unit_price: Number(product.selling_price),
      amount: Number(product.selling_price)
    }])
    setShowProductPicker(false)
    setProductSearch('')
  }

  const handleUpdateLineItem = (index, field, value) => {
    const updated = [...lineItems]
    updated[index][field] = value
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? Number(value) : Number(updated[index].quantity)
      const price = field === 'unit_price' ? Number(value) : Number(updated[index].unit_price)
      updated[index].amount = qty * price
    }
    setLineItems(updated)
  }

  const handleRemoveLineItem = (index) => {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const total = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const taxableAmount = total / 1.18
    const gstAmount = total - taxableAmount
    return { total, taxableAmount, gstAmount, cgst: gstAmount / 2, sgst: gstAmount / 2 }
  }

  const generateInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_invoice_number')
      if (error) throw error
      return data
    } catch (error) {
      const year = new Date().getFullYear().toString().slice(-2)
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      return `INV-${year}-${random}`
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.lead_id) newErrors.lead_id = 'Please select a customer'
    if (!formData.invoice_date) newErrors.invoice_date = 'Invoice date required'
    if (lineItems.length === 0) newErrors.items = 'Add at least one item'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return alert('Please fill required fields')

    setLoading(true)
    try {
      const totals = calculateTotals()
      const invoiceData = {
        lead_id: formData.lead_id,
        quotation_id: formData.quotation_id || null,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        payment_terms: formData.payment_terms || null,
        status: 'draft',
        subtotal: totals.total,
        tax_rate: 18.0,
        tax_amount: totals.gstAmount,
        total_amount: totals.total,
        paid_amount: 0,
        balance_amount: totals.total,
        notes: formData.notes || null,
        terms_and_conditions: formData.terms_and_conditions || null
      }

      if (isEditing) {
        await supabase.from('invoices').update(invoiceData).eq('id', id)
        await supabase.from('invoice_items').delete().eq('invoice_id', id)
        
        const items = lineItems.map((item, idx) => ({
          invoice_id: id,
          product_id: item.product_id,
          item_name: item.item_name,
          description: item.description,
          image_url: item.image_url,
          units: item.units,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          base_price: item.unit_price / 1.18,
          gst_amount: item.amount - item.amount / 1.18,
          sort_order: idx
        }))
        await supabase.from('invoice_items').insert(items)
        alert('Invoice updated')
      } else {
        const invoiceNumber = await generateInvoiceNumber()
        const { data: newInvoice, error: invoiceError } = await supabase.from('invoices').insert({
          ...invoiceData,
          invoice_number: invoiceNumber,
          created_by: user.id
        }).select().single()

        if (invoiceError) {
          console.error('Invoice creation error:', invoiceError)
          throw new Error(`Failed to create invoice: ${invoiceError.message}`)
        }

        if (!newInvoice) {
          throw new Error('Invoice created but no data returned')
        }

        const items = lineItems.map((item, idx) => ({
          invoice_id: newInvoice.id,
          product_id: item.product_id,
          item_name: item.item_name,
          description: item.description,
          image_url: item.image_url,
          units: item.units,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          base_price: item.unit_price / 1.18,
          gst_amount: item.amount - item.amount / 1.18,
          sort_order: idx
        }))
        const { error: itemsError } = await supabase.from('invoice_items').insert(items)
        
        if (itemsError) {
          console.error('Invoice items error:', itemsError)
          throw new Error(`Failed to create invoice items: ${itemsError.message}`)
        }
        
        alert(`Invoice created: ${invoiceNumber}`)
      }
      navigate('/invoices')
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving invoice')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()
  const filteredProducts = products.filter(p =>
    p.model?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.description?.toLowerCase().includes(productSearch.toLowerCase())
  )

  if (loading && (isEditing || convertingFrom)) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/invoices')} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Invoice' : convertingFrom ? 'Create Invoice from Quotation' : 'New Invoice'}
          </h1>
          <p className="text-gray-600 mt-1">
            {convertingFrom ? 'Converting quotation to invoice' : 'Create a tax invoice for your customer'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="card-header"><h2 className="text-lg font-semibold">Invoice Details</h2></div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select name="lead_id" value={formData.lead_id} onChange={handleChange} 
                  className={`input ${errors.lead_id ? 'input-error' : ''}`} required
                  disabled={convertingFrom === 'quotation'}>
                  <option value="">Select customer...</option>
                  {leads.map(lead => <option key={lead.id} value={lead.id}>
                    {lead.company_name} - {lead.contact_person}
                  </option>)}
                </select>
                {errors.lead_id && <p className="text-red-500 text-sm mt-1">{errors.lead_id}</p>}
              </div>

              {!convertingFrom && formData.lead_id && quotations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Quotation (Optional)
                  </label>
                  <select value={formData.quotation_id} onChange={handleQuotationSelect} className="input">
                    <option value="">Create standalone invoice</option>
                    {quotations.map(q => <option key={q.id} value={q.id}>
                      {q.quotation_number} - ₹{Number(q.total_amount).toLocaleString('en-IN')}
                    </option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input type="date" name="invoice_date" value={formData.invoice_date} 
                  onChange={handleChange} className="input" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" name="due_date" value={formData.due_date} 
                  onChange={handleChange} className="input" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <input type="text" name="payment_terms" value={formData.payment_terms} 
                  onChange={handleChange} className="input" 
                  placeholder="e.g., Net 30, 50% advance 50% on delivery" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <button type="button" onClick={() => setShowProductPicker(true)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4 mr-1" />Add Product
            </button>
          </div>
          <div className="card-body">
            {errors.items && <p className="text-red-500 text-sm mb-4">{errors.items}</p>}
            
            {lineItems.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No items added. Click "Add Product" to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-16">Image</th>
                      <th>Model</th>
                      <th>Description</th>
                      <th className="w-24">Units</th>
                      <th className="w-32">Quantity</th>
                      <th className="w-32">Unit Price</th>
                      <th className="w-32">Amount</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
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
                        <td><input type="text" value={item.item_name} onChange={(e) => handleUpdateLineItem(idx, 'item_name', e.target.value)} className="input" /></td>
                        <td><input type="text" value={item.description} onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)} className="input" /></td>
                        <td><input type="text" value={item.units} onChange={(e) => handleUpdateLineItem(idx, 'units', e.target.value)} className="input" /></td>
                        <td><input type="number" value={item.quantity} onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)} className="input" min="0" step="0.01" /></td>
                        <td><input type="number" value={item.unit_price} onChange={(e) => handleUpdateLineItem(idx, 'unit_price', e.target.value)} className="input" min="0" step="0.01" /></td>
                        <td className="font-semibold">₹{Number(item.amount).toLocaleString('en-IN')}</td>
                        <td><button type="button" onClick={() => handleRemoveLineItem(idx)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="card">
            <div className="card-header"><h2 className="text-lg font-semibold">Totals</h2></div>
            <div className="card-body">
              <div className="max-w-md ml-auto space-y-3">
                <div className="flex justify-between text-lg"><span>Subtotal (Incl. GST):</span><span className="font-semibold">₹{totals.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                <div className="border-t border-gray-200 pt-3 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between"><span>Taxable Amount:</span><span>₹{totals.taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between"><span>CGST (9%):</span><span>₹{totals.cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between"><span>SGST (9%):</span><span>₹{totals.sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between font-medium"><span>Total GST (18%):</span><span>₹{totals.gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                </div>
                <div className="border-t-2 border-gray-300 pt-3 flex justify-between text-xl font-bold"><span>Grand Total:</span><span className="text-primary-600">₹{totals.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><h2 className="text-lg font-semibold">Additional Information</h2></div>
          <div className="card-body space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="input" placeholder="Any additional notes..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea name="terms_and_conditions" value={formData.terms_and_conditions} onChange={handleChange} rows={4} className="input" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/invoices')} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />{isEditing ? 'Update' : 'Create'} Invoice</>}
          </button>
        </div>
      </form>

      {showProductPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Select Product</h3>
              <button onClick={() => setShowProductPicker(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="Search products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="input pl-10" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.map(product => (
                  <div key={product.id} onClick={() => handleAddProduct(product)} className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 hover:bg-primary-50 cursor-pointer transition-colors">
                    <div className="flex gap-4">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.model} className="w-20 h-20 object-cover rounded" />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center flex-shrink-0"><ImageIcon className="w-8 h-8 text-gray-400" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900">{product.model}</h4>
                        <p className="text-sm text-gray-600 truncate">{product.description}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">{product.units}</span>
                          <span className="font-semibold text-primary-600">₹{Number(product.selling_price).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}