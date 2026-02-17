import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Trash2,
  Edit,
  Receipt,
  BadgeCheck,
  RefreshCw,
} from 'lucide-react'

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [stats, setStats] = useState({
    totalExpenses: 0,
    thisMonth: 0,
    lastMonth: 0,
    byCategory: {},
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
    'Miscellaneous',
  ]

  // ====== UI tokens (pure styling; no functionality changes) ======
  const ui = {
    card: 'rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden',
    header:
      'px-5 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex items-center justify-between',
    body: 'p-5',
    input:
      'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition ' +
      'focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 border-gray-200',
    pill: 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
    btnPrimary:
      'inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition',
    btnSecondary:
      'inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60',
    badge: 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-gray-50 text-gray-700 ring-gray-200',
    table:
      'w-full text-sm',
    th: 'px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 bg-gray-50/60',
    td: 'px-5 py-4 align-top border-b border-gray-100',
    iconBtn:
      'inline-flex items-center justify-center rounded-xl p-2 transition hover:bg-gray-100 text-gray-700',
    iconBtnDanger:
      'inline-flex items-center justify-center rounded-xl p-2 transition hover:bg-rose-50 text-rose-700',
  }

  const fmtINR = (n) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ====== Data ======
  useEffect(() => {
    fetchExpenses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      setRefreshing(true)

      const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false })
      if (error) throw error

      setExpenses(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
      alert('Error loading expenses: ' + error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
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
      .filter((exp) => {
        const expDate = new Date(exp.expense_date)
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear
      })
      .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)

    const lastMonthTotal = expenseData
      .filter((exp) => {
        const expDate = new Date(exp.expense_date)
        return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear
      })
      .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)

    const byCategory = {}
    expenseData.forEach((exp) => {
      const cat = exp.category || 'Uncategorized'
      byCategory[cat] = (byCategory[cat] || 0) + parseFloat(exp.amount || 0)
    })

    setStats({ totalExpenses: total, thisMonth: thisMonthTotal, lastMonth: lastMonthTotal, byCategory })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error

      setExpenses(expenses.filter((exp) => exp.id !== id))
      alert('Expense deleted successfully')
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Error deleting expense: ' + error.message)
    }
  }

  // ====== Filters ======
  const filteredExpenses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    return expenses.filter((expense) => {
      const matchesSearch =
        !q ||
        expense.vendor_name?.toLowerCase().includes(q) ||
        expense.description?.toLowerCase().includes(q) ||
        expense.category?.toLowerCase().includes(q)

      const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory

      const matchesMonth =
        selectedMonth === 'all' || new Date(expense.expense_date).toISOString().slice(0, 7) === selectedMonth

      return matchesSearch && matchesCategory && matchesMonth
    })
  }, [expenses, searchTerm, selectedCategory, selectedMonth])

  const monthlyTrend = stats.thisMonth > stats.lastMonth ? 'up' : 'down'
  const monthlyChange =
    stats.lastMonth > 0 ? (((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100).toFixed(1) : 0

  const topCategory = useMemo(() => {
    const entries = Object.entries(stats.byCategory || {})
    if (!entries.length) return null
    const [name, amount] = entries.sort((a, b) => b[1] - a[1])[0]
    return { name, amount }
  }, [stats.byCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading expenses...</p>
        </div>
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
        {/* Header */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-4">
          <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur shadow-sm">
            <div className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-xs uppercase tracking-wider text-gray-500">Finance</div>
                  <span className={`${ui.pill} bg-gray-50 text-gray-700 ring-gray-200`}>
                    <BadgeCheck className="w-3.5 h-3.5 mr-1" />
                    {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'}
                    {(searchTerm || selectedCategory !== 'all' || selectedMonth !== 'all') ? ' • filtered' : ''}
                  </span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">Expenses</h1>
                <p className="text-sm text-gray-600 mt-1">Track and manage business expenses.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Link to="/expenses/new" className={ui.btnPrimary}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Link>

                <button onClick={fetchExpenses} disabled={refreshing} className={ui.btnSecondary} type="button">
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Expenses */}
          <div className={`${ui.card} p-5`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{fmtINR(stats.totalExpenses)}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center ring-1 ring-rose-200">
                <DollarSign className="w-6 h-6 text-rose-700" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">All-time total recorded in the system.</p>
          </div>

          {/* This Month */}
          <div className={`${ui.card} p-5`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{fmtINR(stats.thisMonth)}</p>

                <div className="mt-2 inline-flex items-center gap-1.5 text-sm">
                  {monthlyTrend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-rose-700" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-emerald-700" />
                  )}
                  <span className={monthlyTrend === 'up' ? 'text-rose-700 font-medium' : 'text-emerald-700 font-medium'}>
                    {Math.abs(monthlyChange)}%
                  </span>
                  <span className="text-gray-500">vs last month</span>
                </div>
              </div>

              <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center ring-1 ring-indigo-200">
                <Calendar className="w-6 h-6 text-indigo-700" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Month-to-month trend for quick tracking.</p>
          </div>

          {/* Top Category */}
          <div className={`${ui.card} p-5`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">Top Category</p>
                {topCategory ? (
                  <>
                    <p className="mt-1 text-lg font-bold text-gray-900">{topCategory.name}</p>
                    <p className="text-sm text-gray-600">{fmtINR(topCategory.amount)}</p>
                  </>
                ) : (
                  <p className="mt-1 text-lg text-gray-400">No expenses</p>
                )}
              </div>

              <div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center ring-1 ring-purple-200">
                <Receipt className="w-6 h-6 text-purple-700" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Largest spend category based on totals.</p>
          </div>
        </div>

        {/* Filters */}
        <div className={ui.card}>
          <div className={ui.header}>
            <div className="font-semibold text-gray-900">Filters</div>
            <div className="text-xs text-gray-500">Search by vendor, description, category</div>
          </div>

          <div className={ui.body}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search expenses…"
                  className={`${ui.input} pl-10 h-11 rounded-full`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <select
                className={`${ui.input} h-11`}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Month Filter */}
              <select
                className={`${ui.input} h-11`}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="all">All Months</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date()
                  date.setMonth(date.getMonth() - i)
                  const value = date.toISOString().slice(0, 7)
                  const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Active filter chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedCategory !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`${ui.pill} bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100 transition`}
                  title="Clear category filter"
                >
                  Category: {selectedCategory} ✕
                </button>
              ) : null}

              {selectedMonth !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setSelectedMonth('all')}
                  className={`${ui.pill} bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100 transition`}
                  title="Clear month filter"
                >
                  Month: {selectedMonth} ✕
                </button>
              ) : null}

              {(searchTerm || selectedCategory !== 'all' || selectedMonth !== 'all') ? (
                <div className="ml-auto text-xs text-gray-500 self-center">
                  Showing <span className="font-semibold text-gray-900">{filteredExpenses.length}</span> results
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className={ui.card}>
          <div className={ui.header}>
            <div className="font-semibold text-gray-900">All Expenses</div>
            <div className="text-xs text-gray-500">Latest first</div>
          </div>

          <div className="overflow-x-auto">
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>Date</th>
                  <th className={ui.th}>Vendor</th>
                  <th className={ui.th}>Category</th>
                  <th className={ui.th}>Description</th>
                  <th className={`${ui.th} text-right`}>Amount</th>
                  <th className={ui.th}>Payment Mode</th>
                  <th className={`${ui.th} text-right`}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-gray-500">
                      No expenses found
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50/60 transition">
                      <td className={ui.td}>
                        <div className="font-medium text-gray-900">
                          {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(expense.expense_date).toLocaleDateString('en-IN', { weekday: 'short' })}
                        </div>
                      </td>

                      <td className={ui.td}>
                        <div className="font-medium text-gray-900">{expense.vendor_name || '—'}</div>
                      </td>

                      <td className={ui.td}>
                        <span className={`${ui.pill} bg-gray-50 text-gray-700 ring-gray-200`}>
                          {expense.category || 'Uncategorized'}
                        </span>
                      </td>

                      <td className={ui.td}>
                        <div className="max-w-xs truncate text-gray-700" title={expense.description}>
                          {expense.description || '—'}
                        </div>
                      </td>

                      <td className={`${ui.td} text-right`}>
                        <div className="font-bold text-rose-700">
                          {fmtINR(parseFloat(expense.amount || 0))}
                        </div>
                      </td>

                      <td className={ui.td}>
                        <span className="text-sm capitalize text-gray-700">
                          {expense.payment_mode?.replace('_', ' ') || '—'}
                        </span>
                      </td>

                      <td className={`${ui.td} text-right`}>
                        <div className="inline-flex items-center justify-end gap-1">
                          <Link to={`/expenses/${expense.id}/edit`} className={ui.iconBtn} title="Edit">
                            <Edit className="w-4 h-4" />
                          </Link>

                          {user?.role === 'admin' ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(expense.id)}
                              className={ui.iconBtnDanger}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : null}
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
        {Object.keys(stats.byCategory).length > 0 ? (
          <div className={ui.card}>
            <div className={ui.header}>
              <div className="font-semibold text-gray-900">Expenses by Category</div>
              <div className="text-xs text-gray-500">Share of total spend</div>
            </div>

            <div className={ui.body}>
              <div className="space-y-4">
                {Object.entries(stats.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => {
                    const percentage = stats.totalExpenses > 0 ? ((amount / stats.totalExpenses) * 100).toFixed(1) : '0.0'
                    return (
                      <div key={category} className="rounded-2xl border border-gray-200/70 bg-white p-4 ring-1 ring-gray-100">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`${ui.pill} bg-gray-50 text-gray-700 ring-gray-200`}>{category}</span>
                            <span className="text-xs text-gray-500">{percentage}%</span>
                          </div>

                          <div className="text-sm font-semibold text-gray-900">{fmtINR(amount)}</div>
                        </div>

                        <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-rose-600"
                            style={{ width: `${Math.min(100, Number(percentage))}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
