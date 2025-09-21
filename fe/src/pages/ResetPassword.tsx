import { useState, useEffect, type JSX } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Swal from 'sweetalert2'

import { logger } from '@/lib/logger'

import logo from '../assets/logo.png'

function ResetPassword(): JSX.Element {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Get token from URL parameters
    const tokenFromUrl = searchParams.get('token')
    if (!tokenFromUrl) {
      Swal.fire({
        title: 'Invalid Link',
        text: 'This password reset link is invalid or has expired.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3B82F6'
      }).then(() => {
        navigate('/')
      })
      return
    }
    setToken(tokenFromUrl)
  }, [searchParams, navigate])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      await Swal.fire({
        title: 'Password Mismatch',
        text: 'The passwords you entered do not match.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    if (newPassword.length < 6) {
      await Swal.fire({
        title: 'Password Too Short',
        text: 'Password must be at least 6 characters long.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    setIsLoading(true)

    try {
      // Mock API call - in real app this would call your password reset API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      logger.log('Password reset successful:', { token })

      // Show success message
      await Swal.fire({
        title: 'Password Reset Successful!',
        text: 'Your password has been successfully reset. You can now sign in with your new password.',
        icon: 'success',
        confirmButtonText: 'Go to Sign In',
        confirmButtonColor: '#3B82F6'
      })

      // Redirect to login page
      navigate('/')
    } catch (error) {
      logger.error('Password reset failed:', error)
      await Swal.fire({
        title: 'Error',
        text: 'Something went wrong. Please try again or request a new reset link.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Validating reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background overlay with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/10 to-gray-700/10" />

      {/* Header */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-2 text-white">
          <img src={logo} alt="Internal Ops" className="w-6 h-6" />
          <span className="text-sm font-medium">Internal Ops</span>
        </div>
      </div>

      {/* Reset Password Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Reset Password
            </h1>
            <p className="text-gray-600 text-sm">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
