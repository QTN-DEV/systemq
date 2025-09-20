import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import EmployeeManagement from './pages/EmployeeManagement'
import DashboardLayout from './layouts/DashboardLayout'

function App() {
  return (
    <Routes>
      {/* Login as landing page */}
      <Route path="/" element={<Login />} />
      
      {/* Authenticated routes with sidebar */}
      <Route path="/dashboard" element={
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      } />
      <Route path="/home" element={
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      } />
      <Route path="/about" element={
        <DashboardLayout>
          <About />
        </DashboardLayout>
      } />
      <Route path="/contact" element={
        <DashboardLayout>
          <Contact />
        </DashboardLayout>
      } />
      
      {/* Placeholder routes for menu items */}
      {/* Quick Actions */}
      <Route path="/daily-standup" element={<DashboardLayout><div className="p-8"><h1 className="text-2xl font-bold">Daily Standup</h1></div></DashboardLayout>} />
      <Route path="/work-arrangement" element={<DashboardLayout><div className="p-8"><h1 className="text-2xl font-bold">Work Arrangement Request</h1></div></DashboardLayout>} />
      
      {/* Core Ops */}
      <Route path="/structure-organization" element={<DashboardLayout><div className="p-8"><h1 className="text-2xl font-bold">Structure Organization</h1></div></DashboardLayout>} />
      <Route path="/employee-management" element={<DashboardLayout><EmployeeManagement /></DashboardLayout>} />
      <Route path="/attendance-tracker" element={<DashboardLayout><div className="p-8"><h1 className="text-2xl font-bold">Attendance Tracker</h1></div></DashboardLayout>} />
      
      {/* Knowledge */}
      <Route path="/documents" element={<DashboardLayout><div className="p-8"><h1 className="text-2xl font-bold">Documents</h1></div></DashboardLayout>} />
      <Route path="/charter-management" element={<DashboardLayout><div className="p-8"><h1 className="text-2xl font-bold">Charter Management</h1></div></DashboardLayout>} />
      <Route path="/product-roadmap" element={<DashboardLayout><div className="p-8"><h1 className="text-2xl font-bold">Product Roadmap</h1></div></DashboardLayout>} />
      
      {/* Productivity */}
      <Route path="/project-management" element={<DashboardLayout><div className="p-8"><h1 className="text-2xl font-bold">Project Management</h1></div></DashboardLayout>} />
      <Route path="/daily-startup-tracker" element={<DashboardLayout><div className="p-8"><h1 className="text-2xl font-bold">Daily Startup Tracker</h1></div></DashboardLayout>} />
      
      {/* 404 page */}
      <Route path="*" element={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-6">404 - Page Not Found</h1>
            <p className="text-gray-600">The page you're looking for doesn't exist.</p>
          </div>
        </div>
      } />
    </Routes>
  )
}

export default App