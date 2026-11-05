import json
import getpass
import urllib.request
import urllib.error
import urllib.parse

BASE = "https://stopmeter-api.onrender.com/api"

email = input("Email Super Admin: ")
password = getpass.getpass("Password Super Admin: ")
admin_email = input("Email Admin yang diaktifkan: ")

try:
    req = urllib.request.Request(
        BASE + "/login",
        data=json.dumps({
            "email": email,
            "password": password
        }).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=60) as r:
        token = json.loads(r.read())["token"]

    headers = {
        "Authorization": "Bearer " + token,
        "Accept": "application/json"
    }

    req = urllib.request.Request(
        BASE + "/super-admin/admins",
        headers=headers
    )

    with urllib.request.urlopen(req, timeout=60) as r:
        admins = json.loads(r.read()).get("data", [])

    admin = next(
        (a for a in admins if a.get("email", "").lower() == admin_email.lower()),
        None
    )

    if not admin:
        print("Admin tidak ditemukan.")
        raise SystemExit

    admin_id = admin.get("_id") or admin.get("id")
    if not admin_id:
        print("ID Admin tidak ditemukan.")
        raise SystemExit

    req = urllib.request.Request(
        BASE + "/super-admin/admins/" + urllib.parse.quote(str(admin_id)),
        data=json.dumps({"is_active": True}).encode(),
        headers={**headers, "Content-Type": "application/json"},
        method="PATCH"
    )

    with urllib.request.urlopen(req, timeout=60) as r:
        result = json.loads(r.read())
        print("HTTP:", r.status)
        print("Hasil:", result.get("message"))
        print("Status aktif:", result.get("data", {}).get("is_active"))

except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:500])
except Exception as e:
    print("Error:", e)
