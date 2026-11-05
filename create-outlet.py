import json
import getpass
import urllib.request
import urllib.error

base = "https://stopmeter-api.onrender.com/api"

email = input("Email Super Admin: ")
password = getpass.getpass("Password: ")

login = urllib.request.Request(
    base + "/login",
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

    data = {
        "name": "BKTFLAT333",
        "code": "BKTFLAT333",
        "address": "",
        "settings": {}
    }

    req = urllib.request.Request(
        base + "/super-admin/outlets",
        data=json.dumps(data).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=60) as r:
        result = json.loads(r.read())
        outlet = result.get("data", {})
        print("Status:", r.status)
        print("Pesan:", result.get("message"))
        print("Outlet ID:", outlet.get("_id", outlet.get("id")))
        print("Nama:", outlet.get("name"))
        print("Kode:", outlet.get("code"))

except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:500])
except Exception as e:
    print("Error:", e)
