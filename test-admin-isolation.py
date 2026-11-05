import json
import getpass
import urllib.request
import urllib.error

BASE = "https://stopmeter-api.onrender.com/api"

def request(path, token, method="GET", payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except:
            return e.code, {}

def login(label):
    print(f"\n--- {label} ---")
    email = input("Email: ")
    password = getpass.getpass("Password: ")
    status, result = request_login(email, password)
    if status != 200 or not result.get("token"):
        raise SystemExit(f"Login gagal: HTTP {status}")
    if result.get("user", {}).get("role") != "admin":
        raise SystemExit("Akun ini bukan Admin.")
    print("Login berhasil.")
    return result["token"]

def request_login(email, password):
    data = json.dumps({"email": email, "password": password}).encode()
    req = urllib.request.Request(
        BASE + "/login",
        data=data,
        headers={"Accept": "application/json",
                 "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except:
            return e.code, {}

a = login("ADMIN A")
b = login("ADMIN B")

status_a, data_a = request("/management/employees", a)
status_b, data_b = request("/management/employees", b)

if status_a != 200 or status_b != 200:
    raise SystemExit(
        f"Gagal mengambil daftar: Admin A HTTP {status_a}, "
        f"Admin B HTTP {status_b}"
    )

employees_a = data_a.get("data", [])
employees_b = data_b.get("data", [])

ids_a = {str(x.get("id", x.get("_id"))) for x in employees_a}
ids_b = {str(x.get("id", x.get("_id"))) for x in employees_b}

print("\nEmployee terlihat Admin A:", len(ids_a))
print("Employee terlihat Admin B:", len(ids_b))

overlap = ids_a & ids_b

if overlap:
    print("PERINGATAN: Ada Employee terlihat oleh kedua Admin:", overlap)
else:
    print("OK: Tidak ada Employee yang terlihat oleh kedua Admin.")

if not ids_a or not ids_b:
    print("Belum bisa tes akses silang: masing-masing Admin harus punya Employee.")
    raise SystemExit(0)

target_id = next(iter(ids_a))
target = next(x for x in employees_a
              if str(x.get("id", x.get("_id"))) == target_id)

print("\nMenguji akses Admin B ke Employee Admin A.")
status, result = request(
    f"/management/employees/{target_id}",
    b,
    "PUT",
    {"name": target.get("name")}
)

print("HTTP akses silang:", status)

if status == 403 or status == 404:
    print("LULUS: akses silang ditolak.")
else:
    print("PERIKSA: respons tidak sesuai harapan:", result)

