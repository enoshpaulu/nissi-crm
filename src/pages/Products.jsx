import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Edit, Trash2, RefreshCw, Package, Image as ImageIcon, BadgeCheck } from 'lucide-react'

export default function Products() {
  const { isAdmin, isSales } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setRefreshing(true)

      const { data, error } = await supabase
        .from('products')
        .select(
          `
          *,
          created_user:created_by(id, full_name)
        `
        )
        .eq('is_active', true)
        .order('model')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      alert('Error loading products: ' + error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleDelete = async (id, model) => {
    if (!window.confirm(`Delete product "${model}"? This action cannot be undone.`)) return

    try {
      const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id)
      if (error) throw error

      alert('Product deleted successfully')
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product: ' + error.message)
    }
  }

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return products

    return products.filter((p) => {
      return (
        p.model?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      )
    })
  }, [products, searchTerm])

  const ui = {
    // shared
    card: 'rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden',
    header:
      'px-5 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex items-center justify-between',
    body: 'p-5',
    input:
      'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition ' +
      'focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 border-gray-200',
    iconBtn:
      'inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60',
    btnPrimary:
      'inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition',
    btnSecondary:
      'inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition',
    pill: 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-gray-50 text-gray-700 ring-gray-200',
  }

  if (loading) {
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
        <div className="absolute top-28 right-8 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-4">
          <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur shadow-sm">
            <div className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-xs uppercase tracking-wider text-gray-500">CRM</div>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 bg-gray-50 text-gray-700 ring-gray-200">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                    {searchTerm ? ' • filtered' : ''}
                  </span>
                </div>

                <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">
                  Products <span className="text-gray-400">/</span> Inventory
                </h1>
                <p className="text-sm text-gray-600 mt-1">Browse items, pricing, and stock units.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {(isAdmin || isSales) && (
                  <Link to="/products/new" className={ui.btnPrimary}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Link>
                )}

                <button onClick={fetchProducts} disabled={refreshing} className={ui.btnSecondary}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Search bar strip */}
            <div className="px-4 sm:px-5 pb-5">
              <div className="rounded-2xl border border-gray-200/70 bg-white p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by model, description, or category…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${ui.input} pl-10 h-11 rounded-full`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full">
              <div className={ui.card}>
                <div className="p-10 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'No products match your search.' : 'No products yet. Add your first product to get started!'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const profit = Number(product.selling_price || 0) - Number(product.our_price || 0)
              const profitPct =
                Number(product.our_price || 0) > 0 ? (profit / Number(product.our_price || 0)) * 100 : null

              return (
                <div
                  key={product.id}
                  className="group rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden transition hover:shadow-md"
                >
                  {/* Image */}
                  <div className="relative aspect-video bg-gray-100 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.model}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}

                    {/* Top gradient + category pill */}
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent" />
                    {product.category ? (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-white/90 text-gray-800 ring-1 ring-white/60 backdrop-blur">
                          {product.category}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg truncate">{product.model}</h3>
                      {product.description ? (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                      ) : (
                        <p className="text-sm text-gray-400 mt-1">No description</p>
                      )}
                    </div>

                    {/* Price block */}
                    <div className="rounded-2xl border border-gray-200/80 bg-gray-50/60 p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Our Price</span>
                        <span className="font-medium text-gray-900">
                          ₹{Number(product.our_price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Selling Price</span>
                        <span className="font-bold text-emerald-700 text-xl">
                          ₹{Number(product.selling_price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          GST: ₹{Number(product.gst_amount || 0).toLocaleString('en-IN')}
                        </span>
                        {Number.isFinite(profitPct) ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold bg-white ring-1 ring-gray-200 text-gray-700">
                            Margin {profitPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold bg-white ring-1 ring-gray-200 text-gray-700">
                            Margin —
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 ring-1 ring-gray-200 bg-white">
                        Units: <span className="ml-1 font-semibold text-gray-800">{product.units || '—'}</span>
                      </span>
                      {product.hsn_code ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 ring-1 ring-gray-200 bg-white">
                          HSN: <span className="ml-1 font-semibold text-gray-800">{product.hsn_code}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 ring-1 ring-gray-200 bg-white">
                          HSN: <span className="ml-1 font-semibold text-gray-800">—</span>
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {(isAdmin || isSales) ? (
                      <div className="pt-1 flex gap-2">
                        <Link
                          to={`/products/${product.id}/edit`}
                          className="flex-1 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2.5 text-sm font-semibold shadow-sm transition"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Link>

                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id, product.model)}
                            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2.5 text-sm font-semibold shadow-sm transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
