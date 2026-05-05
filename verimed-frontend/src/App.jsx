// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Import all page components
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Manufacturer from './pages/Manufacturer';
import Retailer from './pages/Retailer';
import Customer from './pages/Customer';
import Verify from './pages/Verify';
import About from './pages/About';
import FakeReports from './pages/FakeReports';
import Partners from './pages/Partners';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication (Public Routes) */}
        <Route path="/"        element={<Login />} />
        <Route path="/signup"  element={<Signup />} />
        <Route path="/forgot"  element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route path="/dashboard"    element={<ProtectedRoute allowedRoles={['manufacturer', 'retailer', 'customer']}><Dashboard /></ProtectedRoute>} />
        <Route path="/manufacturer" element={<ProtectedRoute allowedRoles={['manufacturer']}><Manufacturer /></ProtectedRoute>} />
        <Route path="/retailer"     element={<ProtectedRoute allowedRoles={['retailer']}><Retailer /></ProtectedRoute>} />

        {/* Public / Semi-public Routes */}
        <Route path="/customer"      element={<Customer />} />
        <Route path="/verify"        element={<Verify />} />
        <Route path="/about"         element={<About />} />
        <Route path="/fake-reports"  element={<FakeReports />} />
        <Route path="/partners"      element={<Partners />} />

        {/* Fallback */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
