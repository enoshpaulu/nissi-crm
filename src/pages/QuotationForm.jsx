import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, Plus, X, Search, Trash2, Image as ImageIcon, RefreshCw } from 'lucide-react'

const initialFormData = {
  lead_id: '',
  quotation_date: new Date().toISOString().split('T')[0],
  valid_until: '',
  notes: '',
  terms_and_conditions: 'Payment Terms: 50% advance, 50% on delivery\nDelivery: 15-20 working days\nWarranty: 1 year',
}

export default function QuotationForm() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState(initialFormData)
  const [leads, setLeads] = useState([])
  const [products, setProducts] = useState([])
  const [lineItems, setLineItems] = useState([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const isEditing = !!id

  useEffect(() => {
    fetchLeads()
    fetchProducts()
    
    const params = new URLSearchParams(location.search)
    const leadId = params.get('lead_id')
    if (leadId) {
      setFormData(prev => ({ ...prev, lead_id: leadId }))
    }
    
    if (isEditing) {
      fetchQuotation()
    } else {
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + 30)
      setFormData(prev => ({ ...prev, valid_until: validUntil.toISOString().split('T')[0] }))
    }
  }, [id, location])

  const fetchLeads = async () => {
    try {
      const { data } = await supabase.from('leads').select('id, company_name, contact_person, status')
        .in('status', ['new', 'contacted', 'qualified', 'proposal', 'negotiation']).order('company_name')
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
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

  const fetchQuotation = async () => {
    try {
      setLoading(true)
      const { data: quotation, error: qError } = await supabase.from('quotations').select('*').eq('id', id).single()
      if (qError) throw qError

      setFormData({
        lead_id: quotation.lead_id || '',
        quotation_date: quotation.quotation_date || '',
        valid_until: quotation.valid_until || '',
        notes: quotation.notes || '',
        terms_and_conditions: quotation.terms_and_conditions || '',
      })

      const { data: items, error: iError } = await supabase.from('quotation_items').select('*').eq('quotation_id', id).order('sort_order')
      if (iError) throw iError

      setLineItems(items.map(item => ({
        id: item.id, product_id: item.product_id, item_name: item.item_name,
        description: item.description, image_url: item.image_url, units: item.units,
        quantity: item.quantity, unit_price: item.unit_price, amount: item.amount
      })))
    } catch (error) {
      console.error('Error:', error)
      alert('Error loading quotation')
      navigate('/quotations')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleAddProduct = (product) => {
    setLineItems(prev => [...prev, {
      id: Date.now(), product_id: product.id, item_name: product.model,
      description: product.description || '', image_url: product.image_url || '',
      units: product.units, quantity: 1, unit_price: Number(product.selling_price),
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

  const generateQuotationNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_quotation_number')
      if (error) throw error
      return data
    } catch (error) {
      const year = new Date().getFullYear().toString().slice(-2)
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      return `QT-${year}-${random}`
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.lead_id) newErrors.lead_id = 'Please select a lead'
    if (!formData.quotation_date) newErrors.quotation_date = 'Date required'
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
      const quotationData = {
        lead_id: formData.lead_id, quotation_date: formData.quotation_date,
        valid_until: formData.valid_until || null, status: 'draft',
        subtotal: totals.total, tax_rate: 18.0, tax_amount: totals.gstAmount,
        total_amount: totals.total, notes: formData.notes || null,
        terms_and_conditions: formData.terms_and_conditions || null
      }

      if (isEditing) {
        await supabase.from('quotations').update(quotationData).eq('id', id)
        await supabase.from('quotation_items').delete().eq('quotation_id', id)
        
        const items = lineItems.map((item, idx) => ({
          quotation_id: id, product_id: item.product_id, item_name: item.item_name,
          description: item.description, image_url: item.image_url, units: item.units,
          quantity: item.quantity, unit_price: item.unit_price, amount: item.amount,
          base_price: item.unit_price / 1.18, gst_amount: item.amount - item.amount / 1.18, sort_order: idx
        }))
        await supabase.from('quotation_items').insert(items)
        alert('Quotation updated')
      } else {
        const quotationNumber = await generateQuotationNumber()
        const { data: newQuot } = await supabase.from('quotations').insert({
          ...quotationData, quotation_number: quotationNumber, version: 1, created_by: user.id
        }).select().single()

        const items = lineItems.map((item, idx) => ({
          quotation_id: newQuot.id, product_id: item.product_id, item_name: item.item_name,
          description: item.description, image_url: item.image_url, units: item.units,
          quantity: item.quantity, unit_price: item.unit_price, amount: item.amount,
          base_price: item.unit_price / 1.18, gst_amount: item.amount - item.amount / 1.18, sort_order: idx
        }))
        await supabase.from('quotation_items').insert(items)
        alert(`Quotation created: ${quotationNumber}`)
      }
      navigate('/quotations')
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving quotation')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()
  const filteredProducts = products.filter(p =>
    p.model?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.description?.toLowerCase().includes(productSearch.toLowerCase())
  )

  if (loading && isEditing) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/quotations')} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Quotation' : 'New Quotation'}</h1>
          <p className="text-gray-600 mt-1">Create a quotation with products from inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="card-header"><h2 className="text-lg font-semibold">Quotation Details</h2></div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead / Company <span className="text-red-500">*</span></label>
                <select name="lead_id" value={formData.lead_id} onChange={handleChange} className={`input ${errors.lead_id ? 'input-error' : ''}`} required>
                  <option value="">Select a lead...</option>
                  {leads.map(lead => <option key={lead.id} value={lead.id}>{lead.company_name} - {lead.contact_person}</option>)}
                </select>
                {errors.lead_id && <p className="text-red-500 text-sm mt-1">{errors.lead_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Date <span className="text-red-500">*</span></label>
                <input type="date" name="quotation_date" value={formData.quotation_date} onChange={handleChange} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input type="date" name="valid_until" value={formData.valid_until} onChange={handleChange} className="input" />
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
                      <th className="w-32">Req. Units</th>
                      <th className="w-32">Unit Price</th>
                      <th className="w-32">Total Price</th>
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
          <button type="button" onClick={() => navigate('/quotations')} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />{isEditing ? 'Update' : 'Create'} Quotation</>}
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
                        <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center flex-shrink-0"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
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
