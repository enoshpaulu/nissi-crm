import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, Upload } from 'lucide-react'

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
    if (isEditing) {
      fetchProduct()
    }
  }, [id])

  useEffect(() => {
    // Calculate values when selling price or our price changes
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
        margin: margin,
        margin_percentage: marginPercentage,
      })
    }
  }, [formData.selling_price, formData.our_price])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

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
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.model.trim()) {
      newErrors.model = 'Model number is required'
    }
    if (!formData.our_price || parseFloat(formData.our_price) <= 0) {
      newErrors.our_price = 'Our price must be greater than 0'
    }
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
      newErrors.selling_price = 'Selling price must be greater than 0'
    }
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

    if (!validateForm()) {
      return
    }

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
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id)

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

  if (loading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/products')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Product' : 'New Product'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Update product information' : 'Add a new product to inventory'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Number / SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className={`input ${errors.model ? 'input-error' : ''}`}
                  placeholder="e.g., WID-123, GADG-456"
                  required
                />
                {errors.model && (
                  <p className="text-red-500 text-sm mt-1">{errors.model}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select Category</option>
                  <option value="SOUND SYSTEM">SOUND SYSTEM</option>
                  <option value="ELECTRONICS">ELECTRONICS</option>
                  <option value="DISPLAY SYSTEM">DISPLAY SYSTEM</option>
                  <option value="ACCESSORIES">ACCESSORIES</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="input"
                  placeholder="Product description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Units / Measurement
                </label>
                <select
                  name="units"
                  value={formData.units}
                  onChange={handleChange}
                  className="input"
                >
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HSN Code
                </label>
                <input
                  type="text"
                  name="hsn_code"
                  value={formData.hsn_code}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., 8471"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Product Image</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  className="input"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Paste a direct link to your product image
                </p>
              </div>

              {/* Image Preview */}
              {formData.image_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div className="max-w-xs">
                    <img
                      src={formData.image_url}
                      alt="Product preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        e.target.src = ''
                        e.target.alt = 'Invalid image URL'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Pricing (GST Inclusive)</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Our Price (Cost) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="our_price"
                    value={formData.our_price}
                    onChange={handleChange}
                    className={`input pl-8 ${errors.our_price ? 'input-error' : ''}`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                {errors.our_price && (
                  <p className="text-red-500 text-sm mt-1">{errors.our_price}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Your cost price (not shown to customers)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price (Inclusive of GST) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="selling_price"
                    value={formData.selling_price}
                    onChange={handleChange}
                    className={`input pl-8 ${errors.selling_price ? 'input-error' : ''}`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                {errors.selling_price && (
                  <p className="text-red-500 text-sm mt-1">{errors.selling_price}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">Price shown to customers</p>
              </div>
            </div>

            {/* Calculated Values */}
            {formData.selling_price && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Automatic Calculations
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Base Price</p>
                    <p className="font-semibold text-gray-900">
                      ₹{calculatedValues.base_price.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">GST Amount (18%)</p>
                    <p className="font-semibold text-gray-900">
                      ₹{calculatedValues.gst_amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Profit Margin</p>
                    <p className="font-semibold text-green-600">
                      ₹{calculatedValues.margin.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Margin %</p>
                    <p className="font-semibold text-green-600">
                      {calculatedValues.margin_percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? (
              <span className="flex items-center">
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
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
  )
}