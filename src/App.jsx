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
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import Quotations from './pages/Quotations'
import QuotationForm from './pages/QuotationForm'
import QuotationDetail from './pages/QuotationDetail'
import Invoices from './pages/Invoices'
import InvoiceForm from './pages/InvoiceForm'
import InvoiceDetail from './pages/InvoiceDetail'
import Payments from './pages/Payments'
import PaymentForm from './pages/PaymentForm'
import Expenses from './pages/Expenses'
import ExpenseForm from './pages/ExpenseForm'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import ProjectForm from './pages/ProjectForm'

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
          
          {/* Products Routes */}
          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']}>
                <Layout>
                  <Products />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/products/new"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales']}>
                <Layout>
                  <ProductForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/products/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales']}>
                <Layout>
                  <ProductForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Quotations Routes */}
          <Route
            path="/quotations"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']}>
                <Layout>
                  <Quotations />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/quotations/new"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales']}>
                <Layout>
                  <QuotationForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/quotations/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales']}>
                <Layout>
                  <QuotationForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/quotations/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']}>
                <Layout>
                  <QuotationDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Invoices Routes */}
          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <Invoices />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/invoices/new"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <InvoiceForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/invoices/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <InvoiceForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <InvoiceDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Payments Routes */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <Payments />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/payments/new"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <PaymentForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Expenses Routes */}
          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <Expenses />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/expenses/new"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <ExpenseForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/expenses/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <ExpenseForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Projects Routes */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts', 'sales']}>
                <Layout>
                  <Projects />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/projects/new"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <ProjectForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts', 'sales']}>
                <Layout>
                  <ProjectDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/projects/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <Layout>
                  <ProjectForm />
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