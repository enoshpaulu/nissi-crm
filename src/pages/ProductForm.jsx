import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, Image as ImageIcon, BadgeCheck, Calculator, Tag, Box } from 'lucide-react'

const initialFormData = {
  model: '',
  description: '',
  image_url: '',
  units: 'pcs',
  our_price: '',
  selling_price: '',
  category: '',
  hsn_code: '',
}

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [formData, setFormData] = useState(initialFormData)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [calculatedValues, setCalculatedValues] = useState({
    base_price: 0,
    gst_amount: 0,
    margin: 0,
    margin_percentage: 0,
  })

  const isEditing = !!id

  useEffect(() => {
    if (isEditing) fetchProduct()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const sellingPrice = parseFloat(formData.selling_price) || 0
    const ourPrice = parseFloat(formData.our_price) || 0

    if (!sellingPrice) {
      setCalculatedValues({ base_price: 0, gst_amount: 0, margin: 0, margin_percentage: 0 })
      return
    }

    const basePrice = sellingPrice / 1.18
    const gstAmount = sellingPrice - basePrice
    const margin = sellingPrice - ourPrice
    const marginPercentage = ourPrice > 0 ? (margin / ourPrice) * 100 : 0

    setCalculatedValues({
      base_price: basePrice,
      gst_amount: gstAmount,
      margin,
      margin_percentage: marginPercentage,
    })
  }, [formData.selling_price, formData.our_price])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (error) throw error

      setFormData({
        model: data.model || '',
        description: data.description || '',
        image_url: data.image_url || '',
        units: data.units || 'pcs',
        our_price: data.our_price?.toString?.() || data.our_price || '',
        selling_price: data.selling_price?.toString?.() || data.selling_price || '',
        category: data.category || '',
        hsn_code: data.hsn_code || '',
      })
    } catch (error) {
      console.error('Error fetching product:', error)
      alert('Error loading product: ' + error.message)
      navigate('/products')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.model.trim()) newErrors.model = 'Model number is required'
    if (!formData.our_price || parseFloat(formData.our_price) <= 0) newErrors.our_price = 'Our price must be greater than 0'
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0)
      newErrors.selling_price = 'Selling price must be greater than 0'
    if (formData.our_price && formData.selling_price && parseFloat(formData.selling_price) < parseFloat(formData.our_price))
      newErrors.selling_price = 'Selling price should be greater than our price'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const productData = {
        model: formData.model,
        description: formData.description || null,
        image_url: formData.image_url || null,
        units: formData.units,
        our_price: parseFloat(formData.our_price),
        selling_price: parseFloat(formData.selling_price),
        category: formData.category || null,
        hsn_code: formData.hsn_code || null,
        is_active: true,
      }

      if (isEditing) {
        const { error } = await supabase.from('products').update(productData).eq('id', id)
        if (error) throw error
        alert('Product updated successfully')
      } else {
        const { error } = await supabase.from('products').insert({ ...productData, created_by: user.id })
        if (error) throw error
        alert('Product created successfully')
      }

      navigate('/products')
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error saving product: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const ui = {
    card: 'rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden',
    header:
      'px-5 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex items-center justify-between',
    body: 'p-5',
    label: 'block text-sm font-medium text-gray-700 mb-1',
    help: 'text-xs text-gray-500 mt-1',
    input:
      'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition ' +
      'focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 border-gray-200',
    inputError: 'border-rose-300 focus:border-rose-400 focus:ring-rose-100',
    pill: 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-gray-50 text-gray-700 ring-gray-200',
    btnPrimary:
      'inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60',
    btnSecondary:
      'inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition',
  }

  const marginTone = useMemo(() => {
    const m = calculatedValues.margin
    if (!formData.selling_price) return 'text-gray-700'
    if (m >= 0) return 'text-emerald-700'
    return 'text-rose-700'
  }, [calculatedValues.margin, formData.selling_price])

  if (loading && isEditing) {
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
        <div className="absolute top-24 right-8 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl space-y-6 pb-10">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-4">
          <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur shadow-sm">
            <div className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => navigate('/products')}
                  className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs uppercase tracking-wider text-gray-500">Inventory</div>
                    <span className={ui.pill}>
                      <BadgeCheck className="w-3.5 h-3.5 mr-1" />
                      {isEditing ? 'Edit product' : 'Create product'}
                    </span>
                  </div>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">
                    {isEditing ? 'Edit Product' : 'New Product'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEditing ? 'Update product information and pricing.' : 'Add a new product to inventory.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button type="button" onClick={() => navigate('/products')} className={ui.btnSecondary}>
                  Cancel
                </button>

                <button type="submit" form="product-form" disabled={loading} className={ui.btnPrimary}>
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving…
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? 'Update' : 'Create'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Top layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Basic */}
            <div className={`lg:col-span-2 ${ui.card}`}>
              <div className={ui.header}>
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                </div>
                <span className="text-xs text-gray-500">SKU, category and details</span>
              </div>

              <div className={ui.body}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={ui.label}>
                      Model Number / SKU <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      className={`${ui.input} ${errors.model ? ui.inputError : ''}`}
                      placeholder="e.g., WID-123, GADG-456"
                      required
                    />
                    {errors.model ? <p className="text-rose-600 text-sm mt-1">{errors.model}</p> : null}
                  </div>

                  <div>
                    <label className={ui.label}>Category</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={`${ui.input} pl-9`}
                        placeholder="e.g., Electronics, Furniture"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className={ui.label}>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className={`${ui.input} resize-none`}
                      placeholder="Product description…"
                    />
                    <p className={ui.help}>Tip: include key specs and included items.</p>
                  </div>

                  <div>
                    <label className={ui.label}>Units / Measurement</label>
                    <select name="units" value={formData.units} onChange={handleChange} className={ui.input}>
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="m">Meters (m)</option>
                      <option value="sqft">Square Feet (sq ft)</option>
                      <option value="box">Box</option>
                      <option value="set">Set</option>
                      <option value="unit">Unit</option>
                    </select>
                  </div>

                  <div>
                    <label className={ui.label}>HSN Code</label>
                    <input type="text" name="hsn_code" value={formData.hsn_code} onChange={handleChange} className={ui.input} placeholder="e.g., 8471" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Image / Preview */}
            <div className={ui.card}>
              <div className={ui.header}>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Product Image</h2>
                </div>
                <span className="text-xs text-gray-500">URL + preview</span>
              </div>

              <div className={ui.body}>
                <label className={ui.label}>Image URL</label>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  className={ui.input}
                  placeholder="https://example.com/image.jpg"
                />
                <p className={ui.help}>Paste a direct image link (jpg/png/webp).</p>

                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Preview</div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
                    <div className="aspect-video w-full flex items-center justify-center">
                      {formData.image_url ? (
                        <img
                          src={formData.image_url}
                          alt="Product preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon className="w-10 h-10" />
                          <span className="text-xs mt-2">No image</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className={ui.card}>
            <div className={ui.header}>
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
              </div>
              <span className="text-xs text-gray-500">GST inclusive (18%)</span>
            </div>

            <div className={ui.body}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={ui.label}>
                    Our Price (Cost) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      name="our_price"
                      value={formData.our_price}
                      onChange={handleChange}
                      className={`${ui.input} pl-8 ${errors.our_price ? ui.inputError : ''}`}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  {errors.our_price ? <p className="text-rose-600 text-sm mt-1">{errors.our_price}</p> : null}
                  <p className={ui.help}>Internal cost (not shown to customers).</p>
                </div>

                <div>
                  <label className={ui.label}>
                    Selling Price (Incl. GST) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      name="selling_price"
                      value={formData.selling_price}
                      onChange={handleChange}
                      className={`${ui.input} pl-8 ${errors.selling_price ? ui.inputError : ''}`}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  {errors.selling_price ? <p className="text-rose-600 text-sm mt-1">{errors.selling_price}</p> : null}
                  <p className={ui.help}>Shown to customers (GST inclusive).</p>
                </div>
              </div>

              {/* Calculations */}
              {formData.selling_price ? (
                <div className="mt-6 rounded-2xl border border-gray-200/80 bg-gray-50/60 p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Automatic Calculations</div>
                    <span className="text-xs text-gray-500">Derived from selling price</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="rounded-2xl bg-white border border-gray-200/80 p-4">
                      <p className="text-gray-600">Base Price</p>
                      <p className="mt-1 font-semibold text-gray-900">₹{calculatedValues.base_price.toFixed(2)}</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-200/80 p-4">
                      <p className="text-gray-600">GST Amount (18%)</p>
                      <p className="mt-1 font-semibold text-gray-900">₹{calculatedValues.gst_amount.toFixed(2)}</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-200/80 p-4">
                      <p className="text-gray-600">Profit Margin</p>
                      <p className={`mt-1 font-semibold ${marginTone}`}>₹{calculatedValues.margin.toFixed(2)}</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-200/80 p-4">
                      <p className="text-gray-600">Margin %</p>
                      <p className={`mt-1 font-semibold ${marginTone}`}>{calculatedValues.margin_percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Bottom actions (non-sticky) */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
            <button type="button" onClick={() => navigate('/products')} className={ui.btnSecondary}>
              Cancel
            </button>

            <button type="submit" disabled={loading} className={ui.btnPrimary}>
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving…
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Update Product' : 'Create Product'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
