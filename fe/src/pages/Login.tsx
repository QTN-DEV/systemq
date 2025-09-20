import { useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'

import { logger } from '@/lib/logger'

import logo from '../assets/logo.png'
import { useUser } from '../contexts/UserContext'

function Login(): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useUser()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(email, password)
      const result = navigate('/dashboard')
      if (result) {
        result.then(() => {
          logger.log('Login successful')
        }).catch((error) => {
          logger.error('Login failed', error)
        })
      }
    } catch (error) {
      logger.error('Login failed:', error)
      // Handle login error here
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitWrapper = (e: React.FormEvent): void => {
    handleSubmit(e).catch(error => {
      logger.error('Login failed:', error)
    })
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

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Sign in to your account
            </h1>
          </div>

          <form onSubmit={handleSubmitWrapper} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Try: admin@test.com, manager@test.com, employee@test.com, or secretary@test.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use different email prefixes to test different roles
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
