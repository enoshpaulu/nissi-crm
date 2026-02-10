import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import LeadForm from './pages/LeadForm'
import LeadDetail from './pages/LeadDetail'
import Followups from './pages/Followups'
import FollowupForm from './pages/FollowupForm'

// Placeholder components for other pages
const ComingSoon = ({ title }) => (
  <div className="text-center py-12">
    <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
    <p className="text-gray-600">This module is under development</p>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Leads Routes */}
          <Route
            path="/leads"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']}>
                <Layout>
                  <Leads />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/leads/new"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales']}>
                <Layout>
                  <LeadForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/leads/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']}>
                <Layout>
                  <LeadDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/leads/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales']}>
                <Layout>
                  <LeadForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Follow-ups Routes */}
          <Route
            path="/followups"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']}>
                <Layout>
                  <Followups />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/followups/new"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']}>
                <Layout>
                  <FollowupForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/followups/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']}>
                <Layout>
                  <FollowupForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/followups"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']}>
                <Layout>
                  <ComingSoon title="Follow-ups Module" />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/quotations"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']}>
                <Layout>
                  <ComingSoon title="Quotations Module" />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <ComingSoon title="Invoices Module" />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <ComingSoon title="Payments Module" />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <ComingSoon title="Expenses Module" />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App