"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Bot, 
  User, 
  Mail, 
  Building, 
  Calendar, 
  Shield, 
  Camera,
  Save,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Crown,
  Star,
  Settings,
  Key,
  UserCheck,
  Clock,
  Globe
} from "lucide-react"

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  emailVerified: boolean
  emailVerifiedAt: string | null
  createdAt: string
  organization: {
    id: string
    name: string
    slug: string
    subscriptionTier: string
    subscriptionStatus: string
  }
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const router = useRouter()

  // Get user and org data from session
  const user = session?.user // id, name, email, image
  const org = (session?.user as any)?.organization // injected in session callback (name, id, role)

  // Fallbacks
  const avatarInitials = getInitials({ name: user?.name, email: user?.email });

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'STARTER': return <Star className="h-5 w-5" />
      case 'PRO': return <Crown className="h-5 w-5" />
      case 'ENTERPRISE': return <Shield className="h-5 w-5" />
      default: return <Star className="h-5 w-5" />
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'STARTER': return 'text-gray-600'
      case 'PRO': return 'text-blue-600'
      case 'ENTERPRISE': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  function getInitialsFromName(name?: string | null) {
    const safe = (name ?? "").trim();
    if (!safe) return "U"; // Unknown
    const parts = safe.split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? ""; // second name if present
    const initials = `${a}${b}`.toUpperCase() || a.toUpperCase() || "U";
    return initials;
  }

  function getInitialsFromEmail(email?: string | null) {
    const left = (email ?? "").split("@")[0] ?? "";
    if (!left) return "U";
    // support names like "oliver.harburt" → "OH"
    const parts = left.split(/[._-]+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    const initials = `${a}${b}`.toUpperCase() || a.toUpperCase() || "U";
    return initials;
  }

  function getInitials({ name, email }: { name?: string | null; email?: string | null }) {
    const fromName = getInitialsFromName(name);
    if (fromName !== "U") return fromName;
    return getInitialsFromEmail(email);
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }
    if (status === "authenticated") {
      setIsLoading(false)
      // Extract name parts safely for form
      const nameParts = (user?.name ?? "").split(/\s+/)
      setFormData({
        firstName: nameParts[0] || "",
        lastName: nameParts[1] || "",
        email: user?.email || ""
      })
    }
  }, [status, user, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile", {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/signin")
          return
        }
        throw new Error(data.error || "Failed to fetch profile")
      }

      setProfile(data.data.user)
      setFormData({
        firstName: data.data.user.firstName,
        lastName: data.data.user.lastName,
        email: data.data.user.email
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile")
      }

      setProfile(data.data.user)
      setIsEditing(false)
      setMessage("Profile updated successfully!")
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password")
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
      setIsChangingPassword(false)
      setMessage("Password changed successfully!")
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setIsResendingVerification(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification email")
      }

      setMessage("Verification email sent! Please check your inbox.")
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsResendingVerification(false)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <img src="/logo-mark-black.svg" alt="Loading..." className="h-16 w-16 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-secondary-900">Loading profile...</h2>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <img src="/logo-mark-black.svg" alt="Avenai" className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900">Please sign in</h2>
          <Button onClick={() => router.push("/auth/signin")} className="mt-4 rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <User className="h-8 w-8 text-blue-600 mr-3" />
            Profile Settings
          </h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <span className="text-green-700">{message}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Personal Profile */}
          <Card className="rounded-xl border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Your profile</h2>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold">
                {avatarInitials}
              </div>
              <div>
                <div className="font-medium">{user?.name ?? "Unnamed user"}</div>
                <div className="text-sm text-gray-500">{user?.email ?? "—"}</div>
              </div>
            </div>
          </Card>

          {/* Organization (from onboarding) */}
          <Card className="rounded-xl border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Organization</h2>
              <Link 
                href="/settings/organization"
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Edit Organization
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-gray-500">Company</div>
                <div className="font-medium">{org?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">Role</div>
                <div className="font-medium">{(session?.user as any)?.role ?? "—"}</div>
              </div>
              {org?.website && (
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase text-gray-500">Website</div>
                  <div className="font-medium">{org.website}</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Personal Information
                </h2>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <Input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <Input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button type="submit" disabled={isLoading} className="flex items-center rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex items-center">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>


                      <p className="font-medium text-gray-900">{user?.name ?? "Unnamed user"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Email Address</p>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{user?.email ?? "—"}</p>
                        <div className="flex items-center space-x-2">
                          {profile?.emailVerified ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </span>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Unverified
                              </span>
                              <Button
                                onClick={handleResendVerification}
                                disabled={isResendingVerification}
                                size="sm"
                                variant="outline"
                                className="text-xs"
                              >
                                {isResendingVerification ? "Sending..." : "Resend"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Verified via Google OAuth
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Role</p>
                      <p className="font-medium text-gray-900 capitalize">{(session?.user as any)?.role?.toLowerCase() ?? "member"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Member Since</p>
                      <p className="font-medium text-gray-900">Recently</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>


          {/* Security Settings */}
          <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-blue-600" />
                  Security Settings
                </h2>
                {!isChangingPassword && (
                  <Button onClick={() => setIsChangingPassword(true)} variant="outline" size="sm">
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                )}
              </div>

              {isChangingPassword ? (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        aria-label={showPasswords.current ? "Hide current password" : "Show current password"}
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        aria-label={showPasswords.new ? "Hide new password" : "Show new password"}
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        aria-label={showPasswords.confirm ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button type="submit" disabled={isLoading} className="flex items-center rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
                      <Key className="h-4 w-4 mr-2" />
                      {isLoading ? "Changing..." : "Change Password"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsChangingPassword(false)} className="flex items-center">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Password Security</p>
                      <p className="font-medium text-gray-900">Keep your account secure with a strong password</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Last Password Change</p>
                      <p className="font-medium text-gray-900">Not available</p>
                    </div>
                  </div>
                </div>
              )}
          </Card>
        </div>
      </div>
    </div>
  )
}
