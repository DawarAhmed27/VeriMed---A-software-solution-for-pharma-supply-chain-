import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LogoutButton({ className = '' }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/', { replace: true });
  };

  return (
    <button type="button" className={`logout-btn ${className}`.trim()} onClick={handleLogout}>
      Logout
    </button>
  );
}
