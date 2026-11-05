import json
import getpass
import urllib.request
import urllib.error
import urllib.parse

BASE = "https://stopmeter-api.onrender.com/api"

email = input("Email Super Admin: ")
password = getpass.getpass("Password Super Admin: ")
admin_email = input("Email Admin yang dinonaktifkan: ")

def api(path, token, method="GET"):
    req = urllib.request.Request(
        BASE + path,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/json"
        },
        method=method
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read().decode()
        return r.status, json.loads(body) if body else {}

try:
    login = urllib.request.Request(
        BASE + "/login",
        data=json.dumps({
            "email": email,
            "password": password
        }).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(login, timeout=60) as r:
        token = json.loads(r.read())["token"]

    _, admins = api("/super-admin/admins", token)
    _, outlets = api("/super-admin/outlets", token)

    admin = next(
        (x for x in admins.get("data", [])
         if x.get("email", "").lower() == admin_email.lower()),
        None
    )
    outlet = next(
        (x for x in outlets.get("data", [])
         if x.get("code") == "BKTFLAT333"),
        None
    )

    if not admin:
        print("Admin tidak ditemukan.")
        raise SystemExit

    if not outlet:
        print("Outlet BKTFLAT333 tidak ditemukan.")
        raise SystemExit

    confirm = input("Ketik NONAKTIFKAN untuk lanjut: ")
    if confirm != "NONAKTIFKAN":
        print("Dibatalkan.")
        raise SystemExit

    status, result = api(
        "/super-admin/admins/" + urllib.parse.quote(str(admin.get("_id") or admin.get("id"))),
        token, "DELETE"
    )
    print("Admin:", status, result.get("message"))

    status, result = api(
        "/super-admin/outlets/" + urllib.parse.quote(str(outlet.get("_id") or outlet.get("id"))),
        token, "DELETE"
    )
    print("Outlet:", status, result.get("message"))

except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:500])
except Exception as e:
    print("Error:", e)
