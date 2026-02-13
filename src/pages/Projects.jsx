import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  CheckCircle,
  Clock,
  Pause,
  XCircle,
} from 'lucide-react'

export default function Projects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalRevenue: 0,
    totalCosts: 0,
    totalProfit: 0,
    avgMargin: 0
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          lead:leads(id, company_name, contact_person),
          quotation:quotations(id, quotation_number),
          invoice:invoices(id, invoice_number)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch payments and expenses for each project
      const projectsWithFinancials = await Promise.all(
        data.map(async (project) => {
          // Get payments for this project
          const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .eq('project_id', project.id)

          // Get expenses for this project
          const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('project_id', project.id)

          const totalReceived = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
          const totalSpent = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0
          const profit = totalReceived - totalSpent
          const margin = totalReceived > 0 ? (profit / totalReceived * 100) : 0

          return {
            ...project,
            totalReceived,
            totalSpent,
            profit,
            margin
          }
        })
      )

      setProjects(projectsWithFinancials)
      calculateStats(projectsWithFinancials)
    } catch (error) {
      console.error('Error fetching projects:', error)
      alert('Error loading projects: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (projectData) => {
    const totalRevenue = projectData.reduce((sum, p) => sum + p.totalReceived, 0)
    const totalCosts = projectData.reduce((sum, p) => sum + p.totalSpent, 0)
    const totalProfit = totalRevenue - totalCosts
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0

    setStats({
      totalProjects: projectData.length,
      totalRevenue,
      totalCosts,
      totalProfit,
      avgMargin
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'on_hold':
        return <Pause className="w-4 h-4 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'badge-success',
      in_progress: 'badge-primary',
      on_hold: 'badge-warning',
      cancelled: 'badge-error'
    }
    return badges[status] || 'badge-secondary'
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.lead?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.lead?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Track project profitability and costs</p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Projects */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                Rs. {stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Costs */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Costs</p>
              <p className="text-2xl font-bold text-red-600">
                Rs. {stats.totalCosts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Total Profit */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-purple-600">
                Rs. {stats.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-500">Avg: {stats.avgMargin.toFixed(1)}% margin</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Customer</th>
                <th>Quote Amount</th>
                <th>Received</th>
                <th>Spent</th>
                <th>Profit</th>
                <th>Margin %</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    No projects found
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <div className="font-medium text-gray-900">{project.project_name}</div>
                      {project.quotation && (
                        <div className="text-sm text-gray-500">
                          Quote: {project.quotation.quotation_number}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="font-medium">
                        {project.lead?.company_name || project.lead?.contact_person || '-'}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">
                        Rs. {parseFloat(project.quote_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td>
                      <div className="text-green-600 font-medium">
                        Rs. {project.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td>
                      <div className="text-red-600 font-medium">
                        Rs. {project.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td>
                      <div className={`font-bold ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Rs. {project.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td>
                      <span className={`font-semibold ${project.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {project.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(project.status)}
                        <span className={`badge ${getStatusBadge(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}