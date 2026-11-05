import json
import getpass
import urllib.request
import urllib.error

BASE = "https://stopmeter-api.onrender.com/api"

def api(path, token=None, method="GET", payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token

    req = urllib.request.Request(
        BASE + path, data=data, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except:
            return e.code, {}

print("LOGIN SUPER ADMIN")
email = input("Email: ")
password = getpass.getpass("Password: ")

status, result = api("/login", payload={
    "email": email, "password": password
}, method="POST")

if status != 200 or not result.get("token"):
    raise SystemExit("Login gagal.")

if result.get("user", {}).get("role") != "super_admin":
    raise SystemExit("Akun bukan Super Admin.")

token = result["token"]
print("\nLogin berhasil.")

status, result = api("/super-admin/outlets", token)

if status != 200:
    raise SystemExit(f"Gagal mengambil outlet: HTTP {status}")

outlets = [
    x for x in result.get("data", [])
    if x.get("is_active")
]

if not outlets:
    raise SystemExit("Belum ada outlet aktif.")

print("\nDAFTAR OUTLET AKTIF")
for i, outlet in enumerate(outlets, 1):
    print(f"{i}. {outlet.get('name')} | ID: {outlet.get('id', outlet.get('_id'))}")

def create_employee(label):
    print(f"\nEMPLOYEE {label}")
    choice = int(input("Nomor outlet: "))
    outlet = outlets[choice - 1]
    name = input("Nama Employee: ")
    employee_email = input("Email Employee: ")
    employee_password = getpass.getpass("Password (min 10 karakter): ")

    status, result = api(
        "/management/employees",
        token,
        "POST",
        {
            "name": name,
            "email": employee_email,
            "password": employee_password,
            "outlet_ids": [str(outlet.get("id", outlet.get("_id")))]
        }
    )

    if status == 201:
        print("BERHASIL:", name, "->", outlet.get("name"))
    else:
        print("GAGAL:", status, result)

create_employee("A")
create_employee("B")

print("\nSelesai. Jangan bagikan password atau token.")
