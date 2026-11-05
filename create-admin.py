import json
import getpass
import urllib.request
import urllib.error

BASE = "https://stopmeter-api.onrender.com/api"

email = input("Email Super Admin: ")
password = getpass.getpass("Password Super Admin: ")

admin_name = input("Nama Admin baru: ")
admin_email = input("Email Admin baru: ")
admin_password = getpass.getpass("Password Admin baru: ")

login = urllib.request.Request(
    BASE + "/login",
    data=json.dumps({
        "email": email,
        "password": password
    }).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(login, timeout=60) as r:
        token = json.loads(r.read())["token"]

    payload = {
        "name": admin_name,
        "email": admin_email,
        "password": admin_password,
        "outlet_ids": ["6ae90f9187879dd36f07ce46"]
    }

    req = urllib.request.Request(
        BASE + "/super-admin/admins",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=60) as r:
        result = json.loads(r.read())
        print("Status:", r.status)
        print("Pesan:", result.get("message"))
        print("Admin:", result.get("data", {}).get("name"))
        print("Email:", result.get("data", {}).get("email"))
        print("Role:", result.get("data", {}).get("role"))
        print("Outlet:", result.get("data", {}).get("outlet_ids"))

except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:500])
except Exception as e:
    print("Error:", e)
