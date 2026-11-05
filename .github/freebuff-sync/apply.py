import pathlib
import sys

path = pathlib.Path('frontend/src/App.jsx')
source = path.read_text(encoding='utf-8')
original = source


def replace(old, new, expected=1):
    global source
    found = source.count(old)
    if found != expected:
        sys.exit(f'anchor tidak ditemukan {expected}x (dapat {found}): {old[:70]!r}')
    source = source.replace(old, new)


replace(
    "import AppLayout from './AppLayout';\n",
    "import AppLayout from './AppLayout';\nimport EmployeeApp from './EmployeeApp';\n",
)

replace(
    """        if (!['super_admin', 'admin'].includes(account?.role)) {
          throw new Error('Role akun belum memiliki akses frontend.');
        }

""",
    '',
)

replace(
    "if (!['super_admin', 'admin'].includes(account.role)) {",
    "if (!['super_admin', 'admin', 'employee'].includes(account.role)) {",
)

replace(
    "  return <AdminDashboard user={user} onLogout={handleLogout} />;\n",
    """  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === 'employee') {
    return <EmployeeApp user={user} onLogout={handleLogout} />;
  }

  return null;
""",
)

if source == original:
    sys.exit('tidak ada perubahan yang diterapkan')

path.write_text(source, encoding='utf-8')
print(f'App.jsx diperbarui: {len(source)} byte')
