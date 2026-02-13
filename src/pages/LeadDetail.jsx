import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft,
  Edit,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  DollarSign,
  Plus,
  X,
} from 'lucide-react'

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  status_change: FileText,
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, isSales } = useAuth()
  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [activityForm, setActivityForm] = useState({
    activity_type: 'note',
    subject: '',
    description: '',
  })
  const [followupForm, setFollowupForm] = useState({
    title: '',
    due_date: '',
    due_time: '',
    description: '',
  })

  useEffect(() => {
    fetchLeadDetails()
    fetchActivities()
    
    // Set default follow-up date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setFollowupForm((prev) => ({
      ...prev,
      due_date: tomorrow.toISOString().split('T')[0],
    }))
  }, [id])

  const fetchLeadDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          assigned_user:assigned_to(id, full_name),
          created_user:created_by(id, full_name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setLead(data)
    } catch (error) {
      console.error('Error fetching lead:', error)
      alert('Error loading lead details')
      navigate('/leads')
    } finally {
      setLoading(false)
    }
  }

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select(`
          *,
          created_user:created_by(id, full_name)
        `)
        .eq('lead_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  const handleAddActivity = async (e) => {
    e.preventDefault()

    try {
      const { error } = await supabase.from('lead_activities').insert({
        lead_id: id,
        activity_type: activityForm.activity_type,
        subject: activityForm.subject,
        description: activityForm.description,
        created_by: user.id,
      })

      if (error) throw error

      // Reset form and refresh activities
      setActivityForm({
        activity_type: 'note',
        subject: '',
        description: '',
      })
      setShowActivityForm(false)
      fetchActivities()
    } catch (error) {
      console.error('Error adding activity:', error)
      alert('Error adding activity: ' + error.message)
    }
  }

  const handleAddFollowup = async (e) => {
    e.preventDefault()

    if (!followupForm.title || !followupForm.due_date) {
      alert('Please enter title and due date')
      return
    }

    try {
      const { error } = await supabase.from('followups').insert({
        lead_id: id,
        title: followupForm.title,
        description: followupForm.description || null,
        due_date: followupForm.due_date,
        due_time: followupForm.due_time || null,
        assigned_to: user.id,
        status: 'pending',
        created_by: user.id,
      })

      if (error) throw error

      // Reset form
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setFollowupForm({
        title: '',
        due_date: tomorrow.toISOString().split('T')[0],
        due_time: '',
        description: '',
      })
      setShowFollowupForm(false)
      alert('Follow-up created successfully!')
    } catch (error) {
      console.error('Error adding followup:', error)
      alert('Error adding follow-up: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!lead) {
    return <div>Lead not found</div>
  }

  const statusColors = {
    new: 'badge-info',
    contacted: 'badge-gray',
    qualified: 'badge-warning',
    proposal: 'badge badge-purple',
    negotiation: 'badge badge-orange',
    won: 'badge-success',
    lost: 'badge-danger',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/leads')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.company_name}</h1>
            <p className="text-gray-600 mt-1">{lead.contact_person}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || isSales) && (
            <>
              <Link
                to={`/quotations/new?lead_id=${id}`}
                className="btn btn-secondary"
              >
                <FileText className="w-4 h-4 mr-2" />
                Create Quotation
              </Link>
              <button
                onClick={() => setShowFollowupForm(!showFollowupForm)}
                className="btn btn-secondary"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {showFollowupForm ? 'Cancel' : 'Quick Follow-up'}
              </button>
              <Link to={`/leads/${id}/edit`} className="btn btn-primary">
                <Edit className="w-4 h-4 mr-2" />
                Edit Lead
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Quick Follow-up Form */}
      {showFollowupForm && (
        <div className="card border-primary-200 bg-primary-50">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Create Quick Follow-up</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleAddFollowup} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={followupForm.title}
                    onChange={(e) =>
                      setFollowupForm({ ...followupForm, title: e.target.value })
                    }
                    className="input"
                    placeholder={`Follow up with ${lead.company_name}`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={followupForm.due_date}
                    onChange={(e) =>
                      setFollowupForm({ ...followupForm, due_date: e.target.value })
                    }
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={followupForm.due_time}
                    onChange={(e) =>
                      setFollowupForm({ ...followupForm, due_time: e.target.value })
                    }
                    className="input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={followupForm.description}
                    onChange={(e) =>
                      setFollowupForm({ ...followupForm, description: e.target.value })
                    }
                    className="input"
                    rows={2}
                    placeholder="Any specific notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFollowupForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Lead Information</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">Company</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                    {lead.company_name}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Contact Person</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    {lead.contact_person}
                  </div>
                </div>

                {lead.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <div className="mt-1 flex items-center text-gray-900">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={`mailto:${lead.email}`} className="hover:text-primary-600">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}

                {lead.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <div className="mt-1 flex items-center text-gray-900">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={`tel:${lead.phone}`} className="hover:text-primary-600">
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}

                {(lead.address || lead.city || lead.state) && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <div className="mt-1 flex items-start text-gray-900">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                      <div>
                        {lead.address && <div>{lead.address}</div>}
                        <div>
                          {[lead.city, lead.state, lead.pincode].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {lead.gstin && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">GSTIN</label>
                    <div className="mt-1 text-gray-900">{lead.gstin}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
              {(isAdmin || isSales) && (
                <button
                  onClick={() => setShowActivityForm(!showActivityForm)}
                  className="btn btn-sm btn-primary"
                >
                  {showActivityForm ? (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Activity
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="card-body">
              {/* Activity Form */}
              {showActivityForm && (
                <form onSubmit={handleAddActivity} className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Activity Type
                      </label>
                      <select
                        value={activityForm.activity_type}
                        onChange={(e) =>
                          setActivityForm({ ...activityForm, activity_type: e.target.value })
                        }
                        className="input"
                        required
                      >
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="meeting">Meeting</option>
                        <option value="note">Note</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={activityForm.subject}
                        onChange={(e) =>
                          setActivityForm({ ...activityForm, subject: e.target.value })
                        }
                        className="input"
                        placeholder="Brief description"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Details
                      </label>
                      <textarea
                        value={activityForm.description}
                        onChange={(e) =>
                          setActivityForm({ ...activityForm, description: e.target.value })
                        }
                        className="input"
                        rows={3}
                        placeholder="Activity details..."
                      />
                    </div>

                    <button type="submit" className="btn btn-primary w-full">
                      Add Activity
                    </button>
                  </div>
                </form>
              )}

              {/* Activities List */}
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    No activities yet. Add your first activity to track interactions.
                  </p>
                ) : (
                  activities.map((activity) => {
                    const Icon = activityIcons[activity.activity_type] || FileText
                    return (
                      <div key={activity.id} className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{activity.subject}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {activity.description}
                              </p>
                            </div>
                            <span className="badge badge-gray capitalize">
                              {activity.activity_type}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            {activity.created_user?.full_name} •{' '}
                            {new Date(activity.created_at).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Quick Info</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <span className={`badge ${statusColors[lead.status]}`}>
                    {lead.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Source</label>
                <div className="mt-1 text-gray-900 capitalize">{lead.source}</div>
              </div>

              {lead.estimated_value && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Estimated Value</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                    ₹{Number(lead.estimated_value).toLocaleString('en-IN')}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">Assigned To</label>
                <div className="mt-1 text-gray-900">
                  {lead.assigned_user?.full_name || 'Unassigned'}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Created By</label>
                <div className="mt-1 text-gray-900">
                  {lead.created_user?.full_name || 'Unknown'}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Created On</label>
                <div className="mt-1 text-gray-900">
                  {new Date(lead.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
              </div>
              <div className="card-body">
                <p className="text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}