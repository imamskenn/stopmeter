import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import EmployeeApp from './EmployeeApp.jsx';
import './style.css';

/**
 * /#employee membuka layar employee; selain itu aplikasi admin/super admin.
 * Hash dipakai supaya tidak perlu konfigurasi rewrite di hosting.
 */
function Root() {
  const isEmployee = window.location.hash.replace('#', '').toLowerCase() === 'employee';

  return isEmployee ? <EmployeeApp /> : <App />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
);
