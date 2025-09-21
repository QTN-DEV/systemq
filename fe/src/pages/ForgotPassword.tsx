import { useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'

import { logger } from '@/lib/logger'

import logo from '../assets/logo.png'

function ForgotPassword(): JSX.Element {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    setIsLoading(true)

    // Create an async function for the main logic
    const handleAsyncSubmit = async (): Promise<void> => {
      try {
        // Mock API call - in real app this would call your password reset API
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        logger.log('Password reset request:', { email })

        // Show success message
        await Swal.fire({
          title: 'Email Sent!',
          text: 'If an account with that email exists, we&apos;ve sent you a password reset link.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        })

        // Reset form
        setEmail('')
      } catch (error) {
        logger.error('Password reset failed:', error)
        await Swal.fire({
          title: 'Error',
          text: 'Something went wrong. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Call the async function
    void handleAsyncSubmit()
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

      {/* Forgot Password Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Forgot Password
            </h1>
            <p className="text-gray-600 text-sm">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
