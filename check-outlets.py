import json
import getpass
import urllib.request
import urllib.error

base = "https://stopmeter-api.onrender.com/api"

email = input("Email Super Admin: ")
password = getpass.getpass("Password: ")

data = json.dumps({"email": email, "password": password}).encode()
req = urllib.request.Request(
    base + "/login",
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=60) as r:
        token = json.loads(r.read()).get("token")

    req = urllib.request.Request(
        base + "/super-admin/outlets",
        headers={"Authorization": "Bearer " + token}
    )

    with urllib.request.urlopen(req, timeout=60) as r:
        result = json.loads(r.read())

    outlets = result.get("data", [])
    print("Jumlah outlet:", len(outlets))

    for outlet in outlets:
        print(json.dumps({
            "id": str(outlet.get("_id", outlet.get("id", ""))),
            "name": outlet.get("name"),
            "code": outlet.get("code"),
            "is_active": outlet.get("is_active")
        }, ensure_ascii=False))

except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:500])
except Exception as e:
    print("Error:", e)
