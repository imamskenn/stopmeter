import json
import getpass
import urllib.request

BASE = "https://stopmeter-api.onrender.com/api"

email = input("Email Super Admin: ")
password = getpass.getpass("Password: ")

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

for path in ["/super-admin/admins", "/super-admin/outlets"]:
    req = urllib.request.Request(
        BASE + path,
        headers={"Authorization": "Bearer " + token}
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read()).get("data", [])
        print("\n", path)
        for item in data[:3]:
            print({
                "name": item.get("name"),
                "created_at": item.get("created_at")
            })

