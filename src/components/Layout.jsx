import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Receipt,
  CreditCard,
  DollarSign,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'sales', 'accounts'] },
  { name: 'Leads', href: '/leads', icon: Users, roles: ['admin', 'sales', 'accounts'] },
  { name: 'Follow-ups', href: '/followups', icon: ClipboardList, roles: ['admin', 'sales', 'accounts'] },
  { name: 'Quotations', href: '/quotations', icon: FileText, roles: ['admin', 'sales', 'accounts'] },
  { name: 'Invoices', href: '/invoices', icon: Receipt, roles: ['admin', 'accounts'] },
  { name: 'Payments', href: '/payments', icon: CreditCard, roles: ['admin', 'accounts'] },
  { name: 'Expenses', href: '/expenses', icon: DollarSign, roles: ['admin', 'accounts'] },
]

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Filter navigation based on user role
  const allowedNavigation = navigation.filter((item) =>
    item.roles.includes(profile?.role)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Nissi CRM</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {allowedNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User Menu */}
        <div className="border-t border-gray-200 p-4">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="ml-3 text-left min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  userMenuOpen ? 'transform rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Nissi CRM</h1>
          <div className="w-6" /> {/* Spacer for centering */}
        </div>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}