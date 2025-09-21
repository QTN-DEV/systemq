import { useState, type ReactElement } from 'react'
import Swal from 'sweetalert2'

import { logger } from '@/lib/logger'

import { useUser } from '../contexts/UserContext'

function ChangePassword(): ReactElement {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useUser()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
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

    if (newPassword.length < 6) {
      await Swal.fire({
        title: 'Password Too Short',
        text: 'New password must be at least 6 characters long.',
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
      // Mock API call - in real app this would call your password change API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      logger.log('Password change request:', { userId: user?.id })

      // Show success message
      await Swal.fire({
        title: 'Password Changed!',
        text: 'Your password has been successfully updated.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3B82F6'
      })

      // Reset form
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      logger.error('Password change failed:', error)
      await Swal.fire({
        title: 'Error',
        text: 'Failed to change password. Please check your current password and try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsLoading(false)
    }
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
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
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
                minLength={6}
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-500">
                <p>• Use a strong, unique password</p>
                <p>• Don't reuse passwords from other accounts</p>
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
