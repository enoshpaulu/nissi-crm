import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Users,
  FileText,
  Receipt,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  CheckCircle,
  Target,
} from 'lucide-react'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    totalQuotations: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    pendingFollowups: 0,
    todayFollowups: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalProfit: 0,
  })
  const [todayTasks, setTodayTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
    fetchTodayTasks()
  }, [])

  const fetchTodayTasks = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data } = await supabase
        .from('followups')
        .select(`
          *,
          lead:lead_id(id, company_name)
        `)
        .eq('status', 'pending')
        .eq('due_date', today)
        .order('due_time', { ascending: true })
        .limit(5)
      
      setTodayTasks(data || [])
    } catch (error) {
      console.error('Error fetching today tasks:', error)
    }
  }

  const handleCompleteTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('followups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (error) throw error

      // Refresh tasks and stats
      fetchTodayTasks()
      fetchDashboardStats()
    } catch (error) {
      console.error('Error completing task:', error)
      alert('Error completing task')
    }
  }

  const fetchDashboardStats = async () => {
    try {
      // Fetch leads count
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })

      const { count: newLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new')

      // Fetch quotations count
      const { count: totalQuotations } = await supabase
        .from('quotations')
        .select('*', { count: 'exact', head: true })

      // Fetch invoices data
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, balance_amount')

      const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0
      const pendingAmount = invoices?.reduce((sum, inv) => sum + Number(inv.balance_amount || 0), 0) || 0
      const totalInvoices = invoices?.length || 0

      // Fetch pending follow-ups
      const today = new Date().toISOString().split('T')[0]
      const { count: pendingFollowups } = await supabase
        .from('followups')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lte('due_date', today)
      
      // Fetch today's follow-ups
      const { count: todayFollowups } = await supabase
        .from('followups')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('due_date', today)

      // Fetch projects data
      const { data: projects } = await supabase
        .from('projects')
        .select('id, status')

      const totalProjects = projects?.length || 0
      const activeProjects = projects?.filter(p => p.status === 'in_progress').length || 0

      // Calculate total profit from projects
      let totalProfit = 0
      if (projects && projects.length > 0) {
        for (const project of projects) {
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
          totalProfit += (totalReceived - totalSpent)
        }
      }

      setStats({
        totalLeads: totalLeads || 0,
        newLeads: newLeads || 0,
        totalQuotations: totalQuotations || 0,
        totalInvoices,
        totalRevenue,
        pendingAmount,
        pendingFollowups: pendingFollowups || 0,
        todayFollowups: todayFollowups || 0,
        totalProjects,
        activeProjects,
        totalProfit,
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Total Leads',
      value: stats.totalLeads,
      icon: Users,
      color: 'bg-blue-500',
      show: true,
    },
    {
      name: 'New Leads',
      value: stats.newLeads,
      icon: AlertCircle,
      color: 'bg-yellow-500',
      show: true,
    },
    {
      name: 'Quotations',
      value: stats.totalQuotations,
      icon: FileText,
      color: 'bg-purple-500',
      show: true,
    },
    {
      name: 'Total Invoices',
      value: stats.totalInvoices,
      icon: Receipt,
      color: 'bg-green-500',
      show: ['admin', 'accounts'].includes(profile?.role),
    },
    {
      name: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      show: ['admin', 'accounts'].includes(profile?.role),
    },
    {
      name: 'Pending Amount',
      value: `₹${stats.pendingAmount.toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'bg-red-500',
      show: ['admin', 'accounts'].includes(profile?.role),
    },
    {
      name: 'Active Projects',
      value: stats.activeProjects,
      icon: Target,
      color: 'bg-indigo-500',
      show: true,
    },
    {
      name: 'Total Profit',
      value: `₹${stats.totalProfit.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      show: ['admin', 'accounts'].includes(profile?.role),
    },
  ].filter(stat => stat.show)

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {profile?.full_name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Follow-ups Alert */}
      {stats.pendingFollowups > 0 && (
        <div className="card border-yellow-200 bg-yellow-50">
          <div className="card-body">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
              <div>
                <p className="font-medium text-yellow-900">
                  {stats.pendingFollowups} pending follow-up{stats.pendingFollowups !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  You have follow-ups that are due or overdue
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {profile?.role !== 'accounts' && (
              <Link to="/leads/new" className="btn btn-primary">
                Add New Lead
              </Link>
            )}
            {profile?.role !== 'accounts' && (
              <Link to="/followups/new" className="btn btn-secondary">
                Create Follow-up
              </Link>
            )}
            {['admin', 'accounts'].includes(profile?.role) && (
              <Link to="/invoices/new" className="btn btn-secondary">
                Generate Invoice
              </Link>
            )}
            {['admin', 'accounts'].includes(profile?.role) && (
              <Link to="/payments/new" className="btn btn-secondary">
                Record Payment
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Today's Tasks ({stats.todayFollowups})
            </h2>
            <Link to="/followups" className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <h3 className="font-medium text-gray-900 truncate">
                        {task.title}
                      </h3>
                    </div>
                    {task.lead && (
                      <Link
                        to={`/leads/${task.lead.id}`}
                        className="text-sm text-gray-600 hover:text-primary-600 ml-6"
                      >
                        {task.lead.company_name}
                      </Link>
                    )}
                    {task.due_time && (
                      <p className="text-sm text-gray-500 ml-6">
                        {task.due_time}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="text-green-600 hover:text-green-700 flex-shrink-0 ml-2"
                    title="Mark as complete"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}