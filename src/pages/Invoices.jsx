import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Receipt,
  Download,
  AlertCircle,
} from 'lucide-react'

const statusColors = {
  draft: 'badge-gray',
  sent: 'badge-info',
  paid: 'badge-success',
  partial: 'badge-warning',
  overdue: 'badge-danger',
  cancelled: 'badge-gray',
}

export default function Invoices() {
  const { isAdmin, profile } = useAuth()
  const isAccounts = profile?.role === 'accounts'
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          lead:lead_id(id, company_name, contact_person),
          quotation:quotation_id(id, quotation_number),
          created_user:created_by(id, full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
      alert('Error loading invoices: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, invoiceNumber) => {
    if (!window.confirm(`Delete invoice "${invoiceNumber}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) throw error

      alert('Invoice deleted successfully')
      fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Error deleting invoice: ' + error.message)
    }
  }

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.lead?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Calculate totals
  const totals = {
    total: invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    paid: invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0),
    pending: invoices.reduce((sum, inv) => sum + Number(inv.balance_amount || 0), 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">
            {filteredInvoices.length}{' '}
            {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
            {searchTerm || statusFilter !== 'all' ? ' (filtered)' : ''}
          </p>
        </div>

        {(isAdmin || isAccounts) && (
          <Link to="/invoices/new" className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoiced</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{totals.total.toLocaleString('en-IN')}
                </p>
              </div>
              <Receipt className="w-12 h-12 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid Amount</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ₹{totals.paid.toLocaleString('en-IN')}
                </p>
              </div>
              <Receipt className="w-12 h-12 text-green-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Amount</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  ₹{totals.pending.toLocaleString('en-IN')}
                </p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by invoice number or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="lg:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="partial">Partially Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button onClick={fetchInvoices} className="btn btn-secondary lg:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Total Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-gray-500">
                    {searchTerm || statusFilter !== 'all'
                      ? 'No invoices match your filters'
                      : 'No invoices yet. Create your first invoice to get started!'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <div className="flex items-center">
                        <Receipt className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="font-medium text-gray-900">
                          {invoice.invoice_number}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="font-medium text-gray-900">
                          {invoice.lead?.company_name || 'N/A'}
                        </div>
                        {invoice.lead?.contact_person && (
                          <div className="text-sm text-gray-500">
                            {invoice.lead.contact_person}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</td>
                    <td>
                      {invoice.due_date ? (
                        <div
                          className={
                            new Date(invoice.due_date) < new Date() &&
                            invoice.status !== 'paid'
                              ? 'text-red-600 font-medium'
                              : ''
                          }
                        >
                          {new Date(invoice.due_date).toLocaleDateString('en-IN')}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="font-semibold">
                      ₹{Number(invoice.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="text-green-600">
                      ₹{Number(invoice.paid_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="text-red-600 font-medium">
                      ₹{Number(invoice.balance_amount).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${statusColors[invoice.status]}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="text-primary-600 hover:text-primary-700"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {(isAdmin || isAccounts) && (
                          <>
                            <Link
                              to={`/invoices/${invoice.id}/edit`}
                              className="text-gray-600 hover:text-gray-700"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            {isAdmin && (
                              <button
                                onClick={() =>
                                  handleDelete(invoice.id, invoice.invoice_number)
                                }
                                className="text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'].map((status) => {
          const count = invoices.filter((inv) => inv.status === status).length
          const total = invoices
            .filter((inv) => inv.status === status)
            .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)

          return (
            <div key={status} className="card">
              <div className="card-body text-center">
                <div className={`badge ${statusColors[status]} mb-2`}>{status}</div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                {total > 0 && (
                  <div className="text-sm text-gray-600 mt-1">
                    ₹{total.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}