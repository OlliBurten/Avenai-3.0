"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Share2, Users, Eye, Edit, Shield, X } from "lucide-react"

interface DocumentShareProps {
  documentId: string
  documentTitle: string
  onClose: () => void
}

interface Share {
  id: string
  permission: 'READ' | 'WRITE' | 'ADMIN'
  user: {
    firstName: string
    lastName: string
    email: string
  }
  createdAt: string
}

export default function DocumentShare({ documentId, documentTitle, onClose }: DocumentShareProps) {
  const [email, setEmail] = useState("")
  const [permission, setPermission] = useState<'READ' | 'WRITE' | 'ADMIN'>('READ')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [shares, setShares] = useState<Share[]>([])
  const [isLoadingShares, setIsLoadingShares] = useState(true)

  // Fetch existing shares
  const fetchShares = async () => {
    try {
      const response = await fetch(`/api/documents/share?type=shared`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok) {
        // Filter shares for this specific document
        const documentShares = data.sharedDocuments.filter((share: any) => 
          share.documentId === documentId
        )
        setShares(documentShares)
      }
    } catch (error) {
      console.error('Failed to fetch shares:', error)
    } finally {
      setIsLoadingShares(false)
    }
  }

  // Load shares when component mounts
  useState(() => {
    fetchShares()
  })

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch('/api/documents/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          documentId,
          userEmail: email,
          permission
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to share document')
      }

      setMessage('Document shared successfully!')
      setEmail("")
      setPermission('READ')
      fetchShares() // Refresh shares list
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePermission = async (shareId: string, newPermission: 'READ' | 'WRITE' | 'ADMIN') => {
    try {
      const response = await fetch('/api/documents/share', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          shareId,
          permission: newPermission
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update permission')
      }

      setMessage('Permission updated successfully!')
      fetchShares() // Refresh shares list
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleRemoveShare = async (shareId: string) => {
    try {
      const response = await fetch('/api/documents/share', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          shareId
          // No permission = remove share
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove share')
      }

      setMessage('Share removed successfully!')
      fetchShares() // Refresh shares list
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'READ': return <Eye className="h-4 w-4" />
      case 'WRITE': return <Edit className="h-4 w-4" />
      case 'ADMIN': return <Shield className="h-4 w-4" />
      default: return <Eye className="h-4 w-4" />
    }
  }

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'READ': return 'text-blue-600'
      case 'WRITE': return 'text-green-600'
      case 'ADMIN': return 'text-purple-600'
      default: return 'text-blue-600'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Share2 className="h-6 w-6 text-primary-600" />
              <div>
                <h2 className="text-2xl font-bold text-secondary-900">Share Document</h2>
                <p className="text-sm text-secondary-600">{documentTitle}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}

          {/* Share Form */}
          <form onSubmit={handleShare} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Share with user email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Permission level
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'READ' | 'WRITE' | 'ADMIN')}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="READ">Read - Can view and chat with document</option>
                <option value="WRITE">Write - Can edit document and manage shares</option>
                <option value="ADMIN">Admin - Full control including deletion</option>
              </select>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
              {isLoading ? "Sharing..." : "Share Document"}
            </Button>
          </form>

          {/* Existing Shares */}
          <div>
            <div className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Shared with ({shares.length})
            </div>

            {isLoadingShares ? (
              <div className="text-center py-4">
                <p className="text-secondary-600">Loading shares...</p>
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 text-secondary-600">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No shares yet</p>
                <p className="text-sm">Share this document with team members above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`${getPermissionColor(share.permission)}`}>
                        {getPermissionIcon(share.permission)}
                      </div>
                      <div>
                        <p className="font-medium text-secondary-900">
                          {share.user.firstName} {share.user.lastName}
                        </p>
                        <p className="text-sm text-secondary-600">{share.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={share.permission}
                        onChange={(e) => handleUpdatePermission(share.id, e.target.value as 'READ' | 'WRITE' | 'ADMIN')}
                        className="px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-primary-500"
                      >
                        <option value="READ">Read</option>
                        <option value="WRITE">Write</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveShare(share.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
