import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'

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

  const pageBg = 'min-h-[calc(100vh-80px)] bg-gradient-to-b from-slate-50 to-white'
  const shell = 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
  const card = 'bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow-sm overflow-hidden'
  const cardHeader = 'px-6 py-4 border-b border-slate-200 bg-slate-50/60'
  const cardBody = 'px-6 py-6'
  const label = 'block text-sm font-semibold text-slate-700 mb-1'
  const help = 'text-xs text-slate-500 mt-1'
  const inputBase =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition ' +
    'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15'
  const inputError = 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
  const btnBase =
    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition shadow-sm ' +
    'focus:outline-none focus:ring-4 disabled:opacity-60 disabled:cursor-not-allowed'
  const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20`
  const btnSecondary = `${btnBase} bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500/15`
  const chip =
    'inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700'
  const errorText = 'text-red-600 text-sm mt-1'

  useEffect(() => {
    if (isEditing) fetchProduct()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (formData.selling_price) {
      const sellingPrice = parseFloat(formData.selling_price) || 0
      const ourPrice = parseFloat(formData.our_price) || 0
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
    } else {
      setCalculatedValues({
        base_price: 0,
        gst_amount: 0,
        margin: 0,
        margin_percentage: 0,
      })
    }
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
        our_price: data.our_price || '',
        selling_price: data.selling_price || '',
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
    if (
      formData.our_price &&
      formData.selling_price &&
      parseFloat(formData.selling_price) < parseFloat(formData.our_price)
    ) {
      newErrors.selling_price = 'Selling price should be greater than our price'
    }
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
        const { error } = await supabase.from('products').insert({
          ...productData,
          created_by: user.id,
        })
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

  const calcCards = useMemo(() => {
    const items = [
      { k: 'Base Price', v: `₹${calculatedValues.base_price.toFixed(2)}` },
      { k: 'GST Amount (18%)', v: `₹${calculatedValues.gst_amount.toFixed(2)}` },
      { k: 'Profit Margin', v: `₹${calculatedValues.margin.toFixed(2)}`, good: true },
      { k: 'Margin %', v: `${calculatedValues.margin_percentage.toFixed(1)}%`, good: true },
    ]
    return items
  }, [calculatedValues])

  if (loading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={pageBg}>
      <div className={shell}>
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/products')}
              className="mt-1 sm:mt-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  {isEditing ? 'Edit Product' : 'New Product'}
                </h1>
                <span className={chip}>{isEditing ? 'Update' : 'Create'}</span>
              </div>
              <p className="text-slate-600 mt-1">
                {isEditing ? 'Update product information' : 'Add a new product to inventory'}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">GST:</span>
            <span className="text-xs font-semibold text-slate-700">18% inclusive pricing</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-lg font-bold text-slate-900">Basic Information</h2>
              <p className="text-sm text-slate-600 mt-1">Core details used for catalog + invoices</p>
            </div>

            <div className={cardBody}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={label}>
                    Model Number / SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className={`${inputBase} ${errors.model ? inputError : ''}`}
                    placeholder="e.g., WID-123, GADG-456"
                    required
                  />
                  {errors.model && <p className={errorText}>{errors.model}</p>}
                </div>

                <div>
                  <label className={label}>Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} className={inputBase}>
                    <option value="">Select Category</option>
                    <option value="SOUND SYSTEM">SOUND SYSTEM</option>
                    <option value="ELECTRONICS">ELECTRONICS</option>
                    <option value="DISPLAY SYSTEM">DISPLAY SYSTEM</option>
                    <option value="ACOUSTICS">ACOUSTICS</option>
                    <option value="ACCESSORIES">ACCESSORIES</option>
                  </select>
                  <p className={help}>Helps filtering and reporting</p>
                </div>

                <div className="md:col-span-2">
                  <label className={label}>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className={inputBase}
                    placeholder="Product description..."
                  />
                  <p className={help}>Keep it short and searchable</p>
                </div>

                <div>
                  <label className={label}>Units / Measurement</label>
                  <select name="units" value={formData.units} onChange={handleChange} className={inputBase}>
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
                  <label className={label}>HSN Code</label>
                  <input
                    type="text"
                    name="hsn_code"
                    value={formData.hsn_code}
                    onChange={handleChange}
                    className={inputBase}
                    placeholder="e.g., 8471"
                  />
                  <p className={help}>Optional (for GST invoices)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-lg font-bold text-slate-900">Product Image</h2>
              <p className="text-sm text-slate-600 mt-1">Use a direct public image URL</p>
            </div>

            <div className={cardBody}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2">
                  <label className={label}>Image URL</label>
                  <input
                    type="url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    className={inputBase}
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className={help}>Tip: Use a direct link ending with .jpg/.png/.webp</p>
                </div>

                <div>
                  <label className={label}>Preview</label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
                    {formData.image_url ? (
                      <img
                        src={formData.image_url}
                        alt="Product preview"
                        className="w-full h-44 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = ''
                          e.currentTarget.alt = 'Invalid image URL'
                        }}
                      />
                    ) : (
                      <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
                        No image yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-lg font-bold text-slate-900">Pricing (GST Inclusive)</h2>
              <p className="text-sm text-slate-600 mt-1">Auto-calculates base price + GST from selling price</p>
            </div>

            <div className={cardBody}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={label}>
                    Our Price (Cost) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span>
                    <input
                      type="number"
                      name="our_price"
                      value={formData.our_price}
                      onChange={handleChange}
                      className={`${inputBase} pl-10 ${errors.our_price ? inputError : ''}`}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  {errors.our_price && <p className={errorText}>{errors.our_price}</p>}
                  <p className={help}>Your internal cost price</p>
                </div>

                <div>
                  <label className={label}>
                    Selling Price (Inclusive of GST) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span>
                    <input
                      type="number"
                      name="selling_price"
                      value={formData.selling_price}
                      onChange={handleChange}
                      className={`${inputBase} pl-10 ${errors.selling_price ? inputError : ''}`}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  {errors.selling_price && <p className={errorText}>{errors.selling_price}</p>}
                  <p className={help}>Customer-facing price</p>
                </div>
              </div>

              {/* Calculated Values */}
              {formData.selling_price && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-extrabold text-slate-800">Automatic Calculations</h3>
                    <span className="text-xs font-semibold text-slate-500">Derived from Selling Price</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {calcCards.map((x) => (
                      <div
                        key={x.k}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <p className="text-xs font-semibold text-slate-500">{x.k}</p>
                        <p className={`mt-1 text-lg font-extrabold ${x.good ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {x.v}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button type="button" onClick={() => navigate('/products')} className={btnSecondary}>
              Cancel
            </button>

            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
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