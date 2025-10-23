import type { ReactElement } from "react";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import About from "./pages/about/about-page";
import ChangePassword from "./pages/change-password/change-password-page";
import Contact from "./pages/contact/contact-page";
import Dashboard from "./pages/dashboard/dashboard-page";
import DocumentEditorPage from "./pages/DocumentEditorPage";
import Documents from "./pages/documents/page";
import EmployeeManagement from "./pages/EmployeeManagement";
import ForgotPassword from "./pages/forgot-password/forgot-password";
import Home from "./pages/home/home-page";
import LoginPage from "./pages/login/login-page";
import ResetPassword from "./pages/ResetPassword";
import StructureOrganization from "./pages/structure-organization/structure-organization-page";

function App(): ReactElement {
  return (
    <Routes>
      {/* Login as landing page */}
      <Route path="/" element={<LoginPage />} />

      {/* Password reset routes */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Authenticated routes with sidebar */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Home />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <About />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contact"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Contact />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ChangePassword />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Placeholder routes for menu items */}
      {/* Quick Actions */}
      <Route
        path="/daily-standup"
        element={
          <DashboardLayout>
            <div className="p-8">
              <h1 className="text-2xl font-bold">Daily Standup</h1>
            </div>
          </DashboardLayout>
        }
      />
      <Route
        path="/work-arrangement"
        element={
          <DashboardLayout>
            <div className="p-8">
              <h1 className="text-2xl font-bold">Work Arrangement Request</h1>
            </div>
          </DashboardLayout>
        }
      />

      {/* Core Ops */}
      <Route
        path="/structure-organization"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <StructureOrganization />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee-management"
        element={
          <RoleProtectedRoute allowed={["hr", "internalops"]}>
            <DashboardLayout>
              <EmployeeManagement />
            </DashboardLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/attendance-tracker"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <div className="p-8">
                <h1 className="text-2xl font-bold">Attendance Tracker</h1>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Knowledge */}
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Documents />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Documents />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/file/:fileId"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DocumentEditorPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/charter-management"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <div className="p-8">
                <h1 className="text-2xl font-bold">Charter Management</h1>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/product-roadmap"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <div className="p-8">
                <h1 className="text-2xl font-bold">Product Roadmap</h1>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Productivity */}
      <Route
        path="/project-management"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <div className="p-8">
                <h1 className="text-2xl font-bold">Project Management</h1>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-startup-tracker"
        element={
          <DashboardLayout>
            <div className="p-8">
              <h1 className="text-2xl font-bold">Daily Startup Tracker</h1>
            </div>
          </DashboardLayout>
        }
      />

      {/* 404 page */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-6">404 - Page Not Found</h1>
              <p className="text-gray-600">
                The page you are looking for does not exist.
              </p>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
