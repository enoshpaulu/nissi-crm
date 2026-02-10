import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, Calendar } from 'lucide-react'

const initialFormData = {
  title: '',
  description: '',
  due_date: '',
  due_time: '',
  lead_id: '',
  invoice_id: '',
  assigned_to: '',
}

export default function FollowupForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState(initialFormData)
  const [leads, setLeads] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [entityType, setEntityType] = useState('lead') // 'lead' or 'invoice'

  const isEditing = !!id

  useEffect(() => {
    fetchLeads()
    fetchUsers()
    if (isEditing) {
      fetchFollowup()
    } else {
      // Auto-assign to current user and set today's date
      const today = new Date().toISOString().split('T')[0]
      setFormData((prev) => ({
        ...prev,
        assigned_to: user.id,
        due_date: today,
      }))
    }
  }, [id])

  const fetchLeads = async () => {
    try {
      const { data } = await supabase
        .from('leads')
        .select('id, company_name, contact_person, status')
        .in('status', ['new', 'contacted', 'qualified', 'proposal', 'negotiation'])
        .order('company_name')

      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('is_active', true)
        .order('full_name')

      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchFollowup = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('followups')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        title: data.title || '',
        description: data.description || '',
        due_date: data.due_date || '',
        due_time: data.due_time || '',
        lead_id: data.lead_id || '',
        invoice_id: data.invoice_id || '',
        assigned_to: data.assigned_to || '',
      })

      // Set entity type based on what's linked
      if (data.lead_id) {
        setEntityType('lead')
      } else if (data.invoice_id) {
        setEntityType('invoice')
      }
    } catch (error) {
      console.error('Error fetching followup:', error)
      alert('Error loading follow-up: ' + error.message)
      navigate('/followups')
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

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required'
    }
    if (entityType === 'lead' && !formData.lead_id) {
      newErrors.lead_id = 'Please select a lead'
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
      const followupData = {
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date,
        due_time: formData.due_time || null,
        lead_id: entityType === 'lead' ? formData.lead_id : null,
        invoice_id: entityType === 'invoice' ? formData.invoice_id : null,
        assigned_to: formData.assigned_to || null,
        status: 'pending',
      }

      if (isEditing) {
        // Update existing followup
        const { error } = await supabase
          .from('followups')
          .update(followupData)
          .eq('id', id)

        if (error) throw error
        alert('Follow-up updated successfully')
      } else {
        // Create new followup
        const { error } = await supabase.from('followups').insert({
          ...followupData,
          created_by: user.id,
        })

        if (error) throw error
        alert('Follow-up created successfully')
      }

      navigate('/followups')
    } catch (error) {
      console.error('Error saving followup:', error)
      alert('Error saving follow-up: ' + error.message)
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
          onClick={() => navigate('/followups')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Follow-up' : 'New Follow-up'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Update follow-up details' : 'Schedule a new task or reminder'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Follow-up Details</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`input ${errors.title ? 'input-error' : ''}`}
                  placeholder="Follow up with client"
                  required
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="input"
                  placeholder="Additional details about this task..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className={`input ${errors.due_date ? 'input-error' : ''}`}
                    required
                  />
                  {errors.due_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.due_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Time (Optional)
                  </label>
                  <input
                    type="time"
                    name="due_time"
                    value={formData.due_time}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To
                </label>
                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Link to Entity */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Link to</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entity Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="lead"
                        checked={entityType === 'lead'}
                        onChange={(e) => {
                          setEntityType(e.target.value)
                          setFormData((prev) => ({
                            ...prev,
                            lead_id: '',
                            invoice_id: '',
                          }))
                        }}
                        className="mr-2"
                      />
                      Lead
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="invoice"
                        checked={entityType === 'invoice'}
                        onChange={(e) => {
                          setEntityType(e.target.value)
                          setFormData((prev) => ({
                            ...prev,
                            lead_id: '',
                            invoice_id: '',
                          }))
                        }}
                        className="mr-2"
                      />
                      Invoice (Coming Soon)
                    </label>
                  </div>
                </div>
              )}

              {entityType === 'lead' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Lead {!isEditing && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    name="lead_id"
                    value={formData.lead_id}
                    onChange={handleChange}
                    className={`input ${errors.lead_id ? 'input-error' : ''}`}
                    disabled={isEditing}
                  >
                    <option value="">Select a lead...</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.company_name} - {lead.contact_person} ({lead.status})
                      </option>
                    ))}
                  </select>
                  {errors.lead_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.lead_id}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Only active leads (not won/lost) are shown
                  </p>
                </div>
              )}

              {entityType === 'invoice' && (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
                  Invoice linking will be available when the Invoices module is built
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/followups')}
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
                {isEditing ? 'Update Follow-up' : 'Create Follow-up'}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}