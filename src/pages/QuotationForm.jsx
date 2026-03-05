import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, Plus, X, Search, Trash2, Image as ImageIcon } from 'lucide-react'

const initialFormData = {
  lead_id: '',
  quotation_date: new Date().toISOString().split('T')[0],
  valid_until: '',
  notes: '',
  terms_and_conditions:
    'Payment Terms: 50% advance, 50% on delivery\nDelivery: 15-20 working days\nWarranty: 1 year',
}

const cx = (...classes) => classes.filter(Boolean).join(' ')
const fmtINR = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

function IconButton({ title, className, children, ...props }) {
  return (
    <button
      title={title}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset ring-slate-200 text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:ring-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:text-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function PrimaryButton({ className, children, ...props }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ className, children, ...props }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function Card({ title, right, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          {right}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </div>
  )
}

function Label({ children, required }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {children} {required ? <span className="text-rose-600">*</span> : null}
    </label>
  )
}

function FieldError({ children }) {
  if (!children) return null
  return <p className="mt-1 text-sm text-rose-600">{children}</p>
}

const inputBase =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white'
const inputOk =
  'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-800 dark:focus:border-slate-600 dark:focus:ring-slate-800/60'
const inputErr =
  'border-rose-300 focus:border-rose-400 focus:ring-rose-100 dark:border-rose-900/60 dark:focus:border-rose-800 dark:focus:ring-rose-900/30'

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
    if (leadId) setFormData((prev) => ({ ...prev, lead_id: leadId }))

    if (isEditing) {
      fetchQuotation()
    } else {
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + 30)
      setFormData((prev) => ({ ...prev, valid_until: validUntil.toISOString().split('T')[0] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location])

  const fetchLeads = async () => {
    try {
      const { data } = await supabase
        .from('leads')
        .select('id, company_name, contact_person, status')
        .in('status', ['new', 'contacted', 'qualified', 'proposal', 'negotiation'])
        .order('company_name')
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('model')
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchQuotation = async () => {
    try {
      setLoading(true)
      const { data: quotation, error: qError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single()
      if (qError) throw qError

      setFormData({
        lead_id: quotation.lead_id || '',
        quotation_date: quotation.quotation_date || '',
        valid_until: quotation.valid_until || '',
        notes: quotation.notes || '',
        terms_and_conditions: quotation.terms_and_conditions || '',
      })

      const { data: items, error: iError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', id)
        .order('sort_order')
      if (iError) throw iError

      setLineItems(
        (items || []).map((item) => ({
          id: item.id,
          product_id: item.product_id,
          item_name: item.item_name,
          description: item.description,
          image_url: item.image_url,
          units: item.units,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          category: item.category || 'UNCATEGORIZED',
        }))
      )
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
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleAddProduct = (product) => {
    setLineItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        product_id: product.id,
        item_name: product.model,
        description: product.description || '',
        image_url: product.image_url || '',
        units: product.units,
        quantity: 1,
        unit_price: Number(product.selling_price),
        amount: Number(product.selling_price),
        category: product.category || 'UNCATEGORIZED',
      },
    ])
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
    setLineItems((prev) => prev.filter((_, i) => i !== index))
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
        lead_id: formData.lead_id,
        quotation_date: formData.quotation_date,
        valid_until: formData.valid_until || null,
        status: 'draft',
        subtotal: totals.total,
        tax_rate: 18.0,
        tax_amount: totals.gstAmount,
        total_amount: totals.total,
        notes: formData.notes || null,
        terms_and_conditions: formData.terms_and_conditions || null,
      }

      if (isEditing) {
        await supabase.from('quotations').update(quotationData).eq('id', id)
        await supabase.from('quotation_items').delete().eq('quotation_id', id)

        const items = lineItems.map((item, idx) => ({
          quotation_id: id,
          product_id: item.product_id,
          item_name: item.item_name,
          description: item.description,
          image_url: item.image_url,
          units: item.units,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          category: item.category || 'UNCATEGORIZED',
          base_price: item.unit_price / 1.18,
          gst_amount: item.amount - item.amount / 1.18,
          sort_order: idx,
        }))
        await supabase.from('quotation_items').insert(items)
        alert('Quotation updated')
      } else {
        const quotationNumber = await generateQuotationNumber()
        const { data: newQuot } = await supabase
          .from('quotations')
          .insert({
            ...quotationData,
            quotation_number: quotationNumber,
            version: 1,
            created_by: user.id,
          })
          .select()
          .single()

        const items = lineItems.map((item, idx) => ({
          quotation_id: newQuot.id,
          product_id: item.product_id,
          item_name: item.item_name,
          description: item.description,
          image_url: item.image_url,
          units: item.units,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          category: item.category || 'UNCATEGORIZED',
          base_price: item.unit_price / 1.18,
          gst_amount: item.amount - item.amount / 1.18,
          sort_order: idx,
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

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.model?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    )
  }, [products, productSearch])

  if (loading && isEditing) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-700 dark:border-t-slate-200" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Loading…
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <IconButton title="Back" onClick={() => navigate('/quotations')}>
              <ArrowLeft className="h-5 w-5" />
            </IconButton>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isEditing ? 'Edit Quotation' : 'New Quotation'}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Create a quotation with products from inventory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SecondaryButton type="button" onClick={() => navigate('/quotations')}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" form="quotation-form" disabled={loading}>
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditing ? 'Update' : 'Create'} Quotation
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </div>

      <form id="quotation-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Quotation Details */}
        <Card title="Quotation Details">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label required>Lead / Company</Label>
              <select
                name="lead_id"
                value={formData.lead_id}
                onChange={handleChange}
                required
                className={cx(
                  inputBase,
                  errors.lead_id ? inputErr : inputOk,
                  'pr-10 appearance-none'
                )}
              >
                <option value="">Select a lead...</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.company_name} - {lead.contact_person}
                  </option>
                ))}
              </select>
              <FieldError>{errors.lead_id}</FieldError>
            </div>

            <div>
              <Label required>Quotation Date</Label>
              <input
                type="date"
                name="quotation_date"
                value={formData.quotation_date}
                onChange={handleChange}
                required
                className={cx(inputBase, errors.quotation_date ? inputErr : inputOk)}
              />
              <FieldError>{errors.quotation_date}</FieldError>
            </div>

            <div>
              <Label>Valid Until</Label>
              <input
                type="date"
                name="valid_until"
                value={formData.valid_until}
                onChange={handleChange}
                className={cx(inputBase, inputOk)}
              />
            </div>
          </div>
        </Card>

        {/* Line Items */}
        <Card
          title="Line Items"
          right={
            <PrimaryButton
              type="button"
              onClick={() => setShowProductPicker(true)}
              className="px-3 py-2 text-xs rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </PrimaryButton>
          }
        >
          {errors.items ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              {errors.items}
            </div>
          ) : null}

          {lineItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center dark:border-slate-800 dark:bg-slate-950/40">
              <p className="font-semibold text-slate-900 dark:text-white">No items added</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Click <span className="font-semibold">Add Product</span> to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                  <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide">
                    <th className="w-20">Image</th>
                    <th className="min-w-[180px]">Model</th>
                    <th className="min-w-[240px]">Description</th>
                    <th className="w-28">Units</th>
                    <th className="w-32 text-right">Req. Units</th>
                    <th className="w-40 text-right">Unit Price</th>
                    <th className="w-36 text-right">Total Price</th>
                    <th className="w-16" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lineItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/40">
                      <td className="px-3 py-4">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.item_name}
                            className="h-12 w-12 rounded-xl object-cover ring-1 ring-inset ring-slate-200 dark:ring-slate-800"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                            <ImageIcon className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => handleUpdateLineItem(idx, 'item_name', e.target.value)}
                          className={cx(inputBase, inputOk)}
                        />
                      </td>

                      <td className="px-3 py-4">
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) =>
                            handleUpdateLineItem(idx, 'description', e.target.value)
                          }
                          className={cx(inputBase, inputOk)}
                        />
                      </td>

                      <td className="px-3 py-4">
                        <input
                          type="text"
                          value={item.units || ''}
                          onChange={(e) => handleUpdateLineItem(idx, 'units', e.target.value)}
                          className={cx(inputBase, inputOk)}
                        />
                      </td>

                      <td className="px-3 py-4">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                          className={cx(inputBase, inputOk, 'text-right')}
                          min="0"
                          step="0.01"
                        />
                      </td>

                      <td className="px-3 py-4">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleUpdateLineItem(idx, 'unit_price', e.target.value)
                          }
                          className={cx(inputBase, inputOk, 'text-right')}
                          min="0"
                          step="0.01"
                        />
                      </td>

                      <td className="px-3 py-4 text-right font-semibold text-slate-900 dark:text-white">
                        ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="px-3 py-4">
                        <IconButton
                          type="button"
                          title="Remove"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="text-rose-700 hover:text-rose-800 dark:text-rose-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Totals */}
        {lineItems.length > 0 ? (
          <Card title="Totals">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Grand Total (Incl. GST)
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {fmtINR(totals.total)}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Tax breakup shown on the right (18% GST).
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-slate-600 dark:text-slate-300">Taxable Amount</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {fmtINR(totals.taxableAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-slate-600 dark:text-slate-300">CGST (9%)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {fmtINR(totals.cgst)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-slate-600 dark:text-slate-300">SGST (9%)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {fmtINR(totals.sgst)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Total GST (18%)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {fmtINR(totals.gstAmount)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Additional Info */}
        <Card title="Additional Information">
          <div className="space-y-4">
            <div>
              <Label>Notes</Label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className={cx(inputBase, inputOk, 'min-h-[96px]')}
                placeholder="Any additional notes..."
              />
            </div>

            <div>
              <Label>Terms & Conditions</Label>
              <textarea
                name="terms_and_conditions"
                value={formData.terms_and_conditions}
                onChange={handleChange}
                rows={4}
                className={cx(inputBase, inputOk, 'min-h-[120px]')}
              />
            </div>
          </div>
        </Card>
      </form>

      {/* Product Picker Modal */}
      {showProductPicker ? (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setShowProductPicker(false)}
            className="absolute inset-0 bg-black/50"
          />

          {/* Dialog */}
          <div className="relative mx-auto mt-10 w-[calc(100%-24px)] max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Select Product
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Click a product to add it to this quotation.
                  </p>
                </div>
                <IconButton title="Close" onClick={() => setShowProductPicker(false)}>
                  <X className="h-5 w-5" />
                </IconButton>
              </div>

              <div className="p-5">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className={cx(inputBase, inputOk, 'pl-10')}
                    autoFocus
                  />
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {filteredProducts.map((product) => (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.model}
                            className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover ring-1 ring-inset ring-slate-200 dark:ring-slate-800"
                          />
                        ) : (
                          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                            <ImageIcon className="h-8 w-8 text-slate-400" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate font-semibold text-slate-900 dark:text-white">
                                {product.model}
                              </h4>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                                {product.description || '—'}
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                              {product.units || '—'}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {product.category || 'UNCATEGORIZED'}
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {fmtINR(product.selling_price)}
                            </span>
                          </div>

                          <div className="mt-2 text-xs text-slate-500 opacity-0 transition group-hover:opacity-100 dark:text-slate-400">
                            Click to add
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        No products found
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Try a different search term.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                <SecondaryButton type="button" onClick={() => setShowProductPicker(false)}>
                  Close
                </SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}