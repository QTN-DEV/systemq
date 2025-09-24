import { useState, type ReactElement } from 'react'
import Swal from 'sweetalert2'

import { logger } from '@/lib/logger'
import { changePassword } from '@/services/AuthService'
import { useAuthStore } from '@/stores/authStore'

function ChangePassword(): ReactElement {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const user = useAuthStore(state => state.user)

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()

    const handleAsyncSubmit = async (): Promise<void> => {
      if (!user) {
        await Swal.fire({
          title: 'Not Authenticated',
          text: 'Please sign in again to update your password.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        })
        return
      }

      if (newPassword !== confirmPassword) {
        await Swal.fire({
          title: 'Password Mismatch',
          text: 'The new passwords you entered do not match.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        })
        return
      }

      if (newPassword.length < 8) {
        await Swal.fire({
          title: 'Password Too Short',
          text: 'New password must be at least 8 characters long.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        })
        return
      }

      if (oldPassword === newPassword) {
        await Swal.fire({
          title: 'Same Password',
          text: 'New password must be different from your current password.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        })
        return
      }

      setIsLoading(true)

      try {
        const message = await changePassword(user.id, oldPassword, newPassword)
        logger.log('Password change request:', { userId: user.id })

        await Swal.fire({
          title: 'Password Changed!',
          text: message || 'Your password has been successfully updated.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        })

        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to change password. Please check your current password and try again.'
        logger.error('Password change failed:', error)
        await Swal.fire({
          title: 'Error',
          text: message,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        })
      } finally {
        setIsLoading(false)
      }
    }

    void handleAsyncSubmit()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Change Password</h1>
          <p className="text-gray-600">Update your account password</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
                minLength={8}
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-500">
                <p>• Use a strong, unique password</p>
                <p>• Don&apos;t reuse passwords from other accounts</p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isLoading ? 'Changing Password...' : 'Change Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOldPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
              Clear
            </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword
