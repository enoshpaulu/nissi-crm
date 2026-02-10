import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'

const initialFormData = {
  company_name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  status: 'new',
  source: 'other',
  estimated_value: '',
  notes: '',
  assigned_to: '',
}

const initialFollowupData = {
  create_followup: false,
  followup_title: '',
  followup_due_date: '',
  followup_due_time: '',
  followup_description: '',
}

export default function LeadForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [formData, setFormData] = useState(initialFormData)
  const [followupData, setFollowupData] = useState(initialFollowupData)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const isEditing = !!id

  useEffect(() => {
    fetchUsers()
    if (isEditing) {
      fetchLead()
    } else {
      // Auto-assign to current user for new leads
      setFormData((prev) => ({ ...prev, assigned_to: user.id }))
      
      // Set default follow-up due date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setFollowupData((prev) => ({
        ...prev,
        followup_due_date: tomorrow.toISOString().split('T')[0],
        followup_title: 'Follow up with lead'
      }))
    }
  }, [id])

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

  const fetchLead = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        company_name: data.company_name || '',
        contact_person: data.contact_person || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        gstin: data.gstin || '',
        status: data.status || 'new',
        source: data.source || 'other',
        estimated_value: data.estimated_value || '',
        notes: data.notes || '',
        assigned_to: data.assigned_to || '',
      })
    } catch (error) {
      console.error('Error fetching lead:', error)
      alert('Error loading lead: ' + error.message)
      navigate('/leads')
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

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required'
    }
    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Contact person is required'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (formData.gstin && formData.gstin.length !== 15) {
      newErrors.gstin = 'GSTIN must be 15 characters'
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
      const leadData = {
        ...formData,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        assigned_to: formData.assigned_to || null,
      }

      if (isEditing) {
        // Update existing lead
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', id)

        if (error) throw error

        // Add activity log for update
        await supabase.from('lead_activities').insert({
          lead_id: id,
          activity_type: 'note',
          subject: 'Lead Updated',
          description: 'Lead information was updated',
          created_by: user.id,
        })

        alert('Lead updated successfully')
      } else {
        // Create new lead
        const { data: newLead, error } = await supabase
          .from('leads')
          .insert({
            ...leadData,
            created_by: user.id,
          })
          .select()
          .single()

        if (error) throw error

        // Add activity log for creation
        await supabase.from('lead_activities').insert({
          lead_id: newLead.id,
          activity_type: 'note',
          subject: 'Lead Created',
          description: `Lead created from ${formData.source}`,
          created_by: user.id,
        })

        // Create follow-up if requested
        if (followupData.create_followup && followupData.followup_due_date) {
          await supabase.from('followups').insert({
            lead_id: newLead.id,
            title: followupData.followup_title || `Follow up with ${formData.company_name}`,
            description: followupData.followup_description || null,
            due_date: followupData.followup_due_date,
            due_time: followupData.followup_due_time || null,
            assigned_to: user.id,
            status: 'pending',
            created_by: user.id,
          })
        }

        alert(followupData.create_followup 
          ? 'Lead and follow-up created successfully!' 
          : 'Lead created successfully')
      }

      navigate('/leads')
    } catch (error) {
      console.error('Error saving lead:', error)
      alert('Error saving lead: ' + error.message)
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
          onClick={() => navigate('/leads')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Lead' : 'New Lead'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Update lead information' : 'Add a new lead to your CRM'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className={`input ${errors.company_name ? 'input-error' : ''}`}
                  placeholder="Acme Corporation"
                  required
                />
                {errors.company_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  className={`input ${errors.contact_person ? 'input-error' : ''}`}
                  placeholder="John Doe"
                  required
                />
                {errors.contact_person && (
                  <p className="text-red-500 text-sm mt-1">{errors.contact_person}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  className={`input ${errors.gstin ? 'input-error' : ''}`}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
                {errors.gstin && (
                  <p className="text-red-500 text-sm mt-1">{errors.gstin}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="john@acme.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                  placeholder="+91-9876543210"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                  className="input"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="input"
                  placeholder="Mumbai"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="input"
                  placeholder="Maharashtra"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="input"
                  placeholder="400001"
                  maxLength={6}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lead Details */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Lead Details</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="cold_call">Cold Call</option>
                  <option value="social_media">Social Media</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Value (₹)
                </label>
                <input
                  type="number"
                  name="estimated_value"
                  value={formData.estimated_value}
                  onChange={handleChange}
                  className="input"
                  placeholder="100000"
                  min="0"
                  step="0.01"
                />
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

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="input"
                  placeholder="Additional notes about this lead..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Follow-up (Only for new leads) */}
        {!isEditing && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Quick Follow-up</h2>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followupData.create_followup}
                    onChange={(e) =>
                      setFollowupData((prev) => ({
                        ...prev,
                        create_followup: e.target.checked,
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Create follow-up task</span>
                </label>
              </div>
            </div>
            {followupData.create_followup && (
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Follow-up Title
                    </label>
                    <input
                      type="text"
                      value={followupData.followup_title}
                      onChange={(e) =>
                        setFollowupData((prev) => ({
                          ...prev,
                          followup_title: e.target.value,
                        }))
                      }
                      className="input"
                      placeholder="E.g., Call to discuss requirements"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Leave blank to auto-generate: "Follow up with [Company Name]"
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={followupData.followup_due_date}
                      onChange={(e) =>
                        setFollowupData((prev) => ({
                          ...prev,
                          followup_due_date: e.target.value,
                        }))
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={followupData.followup_due_time}
                      onChange={(e) =>
                        setFollowupData((prev) => ({
                          ...prev,
                          followup_due_time: e.target.value,
                        }))
                      }
                      className="input"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={followupData.followup_description}
                      onChange={(e) =>
                        setFollowupData((prev) => ({
                          ...prev,
                          followup_description: e.target.value,
                        }))
                      }
                      rows={2}
                      className="input"
                      placeholder="Any specific notes for this follow-up..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/leads')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center">
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Lead' : 'Create Lead'}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}