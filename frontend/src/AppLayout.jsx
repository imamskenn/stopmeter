import './AppLayout.css';

export default function AppLayout({
  user,
  role = 'Admin',
  title,
  nav = [],
  activePage,
  onNavigate,
  onLogout,
  children,
}) {
  const initial = (user?.name || role || 'S').charAt(0).toUpperCase();

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="app-brand">
          <div className="app-brand-mark">S</div>
          <div>
            <strong>STOPMETER</strong>
            <small>MANAGEMENT SYSTEM</small>
          </div>
        </div>

        <div className="app-workspace-label">WORKSPACE</div>

        <nav className="app-navigation">
          {nav.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={`app-nav-item ${activePage === id ? 'active' : ''}`}
              onClick={() => onNavigate?.(id)}
            >
              <span className="app-nav-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="app-sidebar-user">
          <div className="app-avatar">{initial}</div>
          <div className="app-user-info">
            <strong>{user?.name || role}</strong>
            <small>{role}</small>
          </div>
          <span className="app-online-dot" />
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-heading">
            <div className="app-eyebrow">STOPMETER / {role.toUpperCase()}</div>
            <h1>{title}</h1>
          </div>

          <div className="app-top-actions">
            <span className="app-system-status">
              <i />
              Sistem aktif
            </span>
            <div className="app-mobile-user">{initial}</div>
            <button
              type="button"
              className="app-logout"
              onClick={onLogout}
            >
              Keluar
            </button>
          </div>
        </header>

        <main className="app-content">
          <div key={activePage} className="app-page-transition">
            {children}
          </div>
        </main>
      </div>

      <nav className="app-mobile-nav">
        {nav.map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            className={`app-mobile-nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate?.(id)}
          >
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
