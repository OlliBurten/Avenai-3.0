'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft,
  Building2,
  Users,
  FileText,
  Database,
  MessageSquare,
  Calendar,
  Mail,
  Globe,
  Shield,
  Crown,
  DollarSign,
  Activity,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Save,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Organization {
  id: string
  name: string
  slug: string
  domain?: string
  subscriptionTier: 'FREE' | 'PRO' | 'FOUNDER'
  subscriptionStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  users: Array<{
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    isActive: boolean
    emailVerified: boolean
    lastLoginAt?: string
    createdAt: string
  }>
  documents: Array<{
    id: string
    title: string
    status: string
    createdAt: string
    updatedAt: string
  }>
  datasets: Array<{
    id: string
    name: string
    description: string
    createdAt: string
    updatedAt: string
  }>
  chatSessions: Array<{
    id: string
    sessionId: string
    userIdentifier?: string
    startedAt: string
    lastActivityAt: string
  }>
  _count: {
    documents: number
    datasets: number
    chatSessions: number
    analyticsEvents: number
  }
}

export default function OrganizationDetail() {
  const router = useRouter()
  const params = useParams()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    domain: '',
    subscriptionTier: 'FREE' as 'FREE' | 'PRO' | 'FOUNDER',
    subscriptionStatus: 'ACTIVE' as 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED'
  })
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [userEditForm, setUserEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'MEMBER' as 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
    isActive: true,
    emailVerified: false
  })

  useEffect(() => {
    if (params.id) {
      fetchOrganization()
    }
  }, [params.id])

  const fetchOrganization = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/organizations/${params.id}`)
      
      if (response.ok) {
        const data = await response.json()
        const org = data.data.organization
        setOrganization(org)
        setEditForm({
          name: org.name,
          slug: org.slug,
          domain: org.domain || '',
          subscriptionTier: org.subscriptionTier,
          subscriptionStatus: org.subscriptionStatus
        })
      } else {
        console.error('Failed to fetch organization')
        router.push('/admin')
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (organization) {
      setEditForm({
        name: organization.name,
        slug: organization.slug,
        domain: organization.domain || '',
        subscriptionTier: organization.subscriptionTier,
        subscriptionStatus: organization.subscriptionStatus
      })
    }
  }

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/admin/organizations/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        const data = await response.json()
        setOrganization(data.data)
        setIsEditing(false)
        alert('Organization updated successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to update organization: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating organization:', error)
      alert('Failed to update organization')
    }
  }

  const handleEditUser = (user: any) => {
    setEditingUser(user.id)
    setUserEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified
    })
  }

  const handleCancelUserEdit = () => {
    setEditingUser(null)
    setUserEditForm({
      firstName: '',
      lastName: '',
      email: '',
      role: 'MEMBER',
      isActive: true,
      emailVerified: false
    })
  }

  const handleSaveUserEdit = async () => {
    if (!editingUser) return

    try {
      const response = await fetch(`/api/users/${editingUser}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: userEditForm.firstName,
          lastName: userEditForm.lastName,
          email: userEditForm.email,
          role: userEditForm.role,
          isActive: userEditForm.isActive,
          emailVerified: userEditForm.emailVerified
        })
      })

      if (response.ok) {
        // Refresh organization data to get updated user info
        await fetchOrganization()
        setEditingUser(null)
        alert('User updated successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to update user: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user')
    }
  }

  const handleDeactivateUser = async (userId: string, isActive: boolean) => {
    if (!confirm(`Are you sure you want to ${isActive ? 'deactivate' : 'activate'} this user?`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !isActive
        })
      })

      if (response.ok) {
        // Refresh organization data to get updated user info
        await fetchOrganization()
        alert(`User ${!isActive ? 'activated' : 'deactivated'} successfully!`)
      } else {
        const error = await response.json()
        alert(`Failed to ${isActive ? 'deactivate' : 'activate'} user: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      alert(`Failed to ${isActive ? 'deactivate' : 'activate'} user`)
    }
  }

  const handleDeleteUser = async (userId: string, userRole: string) => {
    if (userRole === 'SUPER_ADMIN' || userRole === 'OWNER') {
      alert('Cannot delete SUPER_ADMIN or OWNER users')
      return
    }

    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh organization data to get updated user info
        await fetchOrganization()
        alert('User deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to delete user: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const handleDeleteOrganization = async () => {
    if (!confirm(`Are you sure you want to delete the entire organization "${organization?.name}"? This will deactivate all users and cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/organizations/${params.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Organization deleted successfully!')
        router.push('/admin')
      } else {
        const error = await response.json()
        alert(`Failed to delete organization: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
      alert('Failed to delete organization')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      PAST_DUE: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircle },
      SUSPENDED: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.CANCELLED
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const getTierBadge = (tier: string) => {
    const tierConfig = {
      FREE: { color: 'bg-gray-100 text-gray-800', icon: Shield },
      PRO: { color: 'bg-blue-100 text-blue-800', icon: Crown },
      FOUNDER: { color: 'bg-purple-100 text-purple-800', icon: Crown }
    }
    
    const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.FREE
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {tier}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    return formatDate(dateString)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization not found</h1>
            <Button onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
              <p className="text-gray-600">{organization.slug}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDeleteOrganization}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Organization
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {getTierBadge(organization.subscriptionTier)}
            {getStatusBadge(organization.subscriptionStatus)}
            {organization.domain && (
              <div className="flex items-center gap-1 text-gray-600">
                <Globe className="h-4 w-4" />
                {organization.domain}
              </div>
            )}
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Organization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Organization name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                <Input
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  placeholder="organization-slug"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
                <Input
                  value={editForm.domain}
                  onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                  placeholder="example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Tier</label>
                <select
                  value={editForm.subscriptionTier}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionTier: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                  <option value="FOUNDER">FOUNDER</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Status</label>
                <select
                  value={editForm.subscriptionStatus}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSaveEdit} className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{organization.users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {organization.users.filter(u => u.isActive).length} active
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Documents</p>
                <p className="text-3xl font-bold text-gray-900">{organization._count.documents}</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {organization._count.datasets} datasets
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chat Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{organization._count.chatSessions}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {organization._count.analyticsEvents} events
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Created</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatDate(organization.createdAt)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {formatDate(organization.updatedAt)}
            </p>
          </Card>
        </div>

        {/* Content Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({organization.users.length})
            </h3>
            <div className="space-y-3">
              {organization.users.map((user) => (
                <div key={user.id} className="p-3 bg-gray-50 rounded-lg">
                  {editingUser === user.id ? (
                    // Edit form
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                          <Input
                            value={userEditForm.firstName}
                            onChange={(e) => setUserEditForm({ ...userEditForm, firstName: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                          <Input
                            value={userEditForm.lastName}
                            onChange={(e) => setUserEditForm({ ...userEditForm, lastName: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                          <Input
                            value={userEditForm.email}
                            onChange={(e) => setUserEditForm({ ...userEditForm, email: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                          <select
                            value={userEditForm.role}
                            onChange={(e) => setUserEditForm({ ...userEditForm, role: e.target.value as any })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="OWNER">OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="MEMBER">MEMBER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={userEditForm.isActive ? 'active' : 'inactive'}
                            onChange={(e) => setUserEditForm({ ...userEditForm, isActive: e.target.value === 'active' })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Email Verified</label>
                          <select
                            value={userEditForm.emailVerified ? 'verified' : 'unverified'}
                            onChange={(e) => setUserEditForm({ ...userEditForm, emailVerified: e.target.value === 'verified' })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="verified">Verified</option>
                            <option value="unverified">Unverified</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveUserEdit} className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelUserEdit}>
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span className={`flex items-center gap-1 ${
                            user.isActive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {user.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className={`flex items-center gap-1 ${
                            user.emailVerified ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {user.emailVerified ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            {user.emailVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs text-gray-500">
                          <p>Last login:</p>
                          <p>{formatLastActivity(user.lastLoginAt)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivateUser(user.id, user.isActive)}
                            className={user.isActive ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          {user.role !== 'SUPER_ADMIN' && user.role !== 'OWNER' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user.id, user.role)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Documents */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Documents ({organization._count.documents})
            </h3>
            <div className="space-y-3">
              {organization.documents.length > 0 ? (
                organization.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          className={`text-xs ${
                            doc.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            doc.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {doc.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(doc.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No documents yet</p>
              )}
            </div>
          </Card>

          {/* Recent Datasets */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Recent Datasets ({organization._count.datasets})
            </h3>
            <div className="space-y-3">
              {organization.datasets.length > 0 ? (
                organization.datasets.map((dataset) => (
                  <div key={dataset.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{dataset.name}</p>
                      {dataset.description && (
                        <p className="text-sm text-gray-600 mt-1">{dataset.description}</p>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDate(dataset.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No datasets yet</p>
              )}
            </div>
          </Card>

          {/* Recent Chat Sessions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Chat Sessions ({organization._count.chatSessions})
            </h3>
            <div className="space-y-3">
              {organization.chatSessions.length > 0 ? (
                organization.chatSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Session: {session.sessionId.slice(0, 8)}...
                      </p>
                      {session.userIdentifier && (
                        <p className="text-sm text-gray-600">User: {session.userIdentifier}</p>
                      )}
                      <span className="text-xs text-gray-500">
                        Started: {formatDate(session.startedAt)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No chat sessions yet</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
