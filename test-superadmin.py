import json
import getpass
import urllib.request
import urllib.error

BASE = "https://stopmeter-api.onrender.com/api"

email = input("Email Super Admin: ")
password = getpass.getpass("Password: ")

def request(path, token=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token

    req = urllib.request.Request(BASE + path, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read())
            print(f"[{r.status}] {path}:", data.get("message", "OK"))
            print("Response:", json.dumps(data, ensure_ascii=False, indent=2)[:5000])
    except urllib.error.HTTPError as e:
        print(f"[{e.code}] {path}:", e.read().decode()[:500])
    except Exception as e:
        print("ERROR:", path, e)

data = json.dumps({
    "email": email,
    "password": password
}).encode()

req = urllib.request.Request(
    BASE + "/login",
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=60) as r:
        result = json.loads(r.read())
        token = result.get("token")
        print("Login:", result.get("message"))
        print("Role:", result.get("user", {}).get("role"))

    if not token:
        print("Token tidak diterima.")
        raise SystemExit

    request("/super-admin/dashboard", token)
    request("/super-admin/activities", token)
    request("/super-admin/admins", token)
    request("/super-admin/outlets", token)

except urllib.error.HTTPError as e:
    print("Login gagal:", e.code, e.read().decode())
except Exception as e:
    print("Error:", e)
