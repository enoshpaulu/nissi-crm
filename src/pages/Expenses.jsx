import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Trash2,
  Edit,
  Receipt,
} from 'lucide-react'

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [stats, setStats] = useState({
    totalExpenses: 0,
    thisMonth: 0,
    lastMonth: 0,
    byCategory: {}
  })

  const categories = [
    'Rent',
    'Utilities',
    'Salaries',
    'Inventory',
    'Marketing',
    'Transportation',
    'Office Supplies',
    'Maintenance',
    'Insurance',
    'Professional Fees',
    'Taxes',
    'Miscellaneous'
  ]

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (error) throw error

      setExpenses(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
      alert('Error loading expenses: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (expenseData) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

    const total = expenseData.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
    
    const thisMonthTotal = expenseData
      .filter(exp => {
        const expDate = new Date(exp.expense_date)
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear
      })
      .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)

    const lastMonthTotal = expenseData
      .filter(exp => {
        const expDate = new Date(exp.expense_date)
        return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear
      })
      .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)

    const byCategory = {}
    expenseData.forEach(exp => {
      const cat = exp.category || 'Uncategorized'
      byCategory[cat] = (byCategory[cat] || 0) + parseFloat(exp.amount || 0)
    })

    setStats({
      totalExpenses: total,
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
      byCategory
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error

      setExpenses(expenses.filter(exp => exp.id !== id))
      alert('Expense deleted successfully')
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Error deleting expense: ' + error.message)
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory

    const matchesMonth = selectedMonth === 'all' || 
      new Date(expense.expense_date).toISOString().slice(0, 7) === selectedMonth

    return matchesSearch && matchesCategory && matchesMonth
  })

  const monthlyTrend = stats.thisMonth > stats.lastMonth ? 'up' : 'down'
  const monthlyChange = stats.lastMonth > 0 
    ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600">Track and manage business expenses</p>
        </div>
        <Link to="/expenses/new" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Expenses */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                Rs. {stats.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                Rs. {stats.thisMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center mt-1">
                {monthlyTrend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-red-600 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
                )}
                <span className={`text-sm ${monthlyTrend === 'up' ? 'text-red-600' : 'text-green-600'}`}>
                  {Math.abs(monthlyChange)}% vs last month
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Top Category */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Top Category</p>
              {Object.keys(stats.byCategory).length > 0 ? (
                <>
                  <p className="text-lg font-bold text-gray-900">
                    {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0][0]}
                  </p>
                  <p className="text-sm text-gray-600">
                    Rs. {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0][1].toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </>
              ) : (
                <p className="text-lg text-gray-400">No expenses</p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search expenses..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            className="input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date()
              date.setMonth(date.getMonth() - i)
              const value = date.toISOString().slice(0, 7)
              const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
              return <option key={value} value={value}>{label}</option>
            })}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Payment Mode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No expenses found
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <div className="font-medium">
                        {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-gray-900">
                        {expense.vendor_name || '-'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary">
                        {expense.category}
                      </span>
                    </td>
                    <td>
                      <div className="max-w-xs truncate" title={expense.description}>
                        {expense.description || '-'}
                      </div>
                    </td>
                    <td>
                      <div className="font-bold text-red-600">
                        Rs. {parseFloat(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td>
                      <span className="text-sm capitalize">
                        {expense.payment_mode?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/expenses/${expense.id}/edit`}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Category Breakdown */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
          <div className="space-y-3">
            {Object.entries(stats.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => {
                const percentage = (amount / stats.totalExpenses * 100).toFixed(1)
                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{category}</span>
                      <span className="text-sm text-gray-600">
                        Rs. {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}