import json
import getpass
import urllib.request
import urllib.error

email = input("Email Super Admin: ")
password = getpass.getpass("Password: ")

data = json.dumps({
    "email": email,
    "password": password
}).encode()

req = urllib.request.Request(
    "https://stopmeter-api.onrender.com/api/login",
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=60) as r:
        result = json.loads(r.read())
        print("Login:", result.get("message"))
        print("Role:", result.get("user", {}).get("role"))
        print("Token diterima:", bool(result.get("token")))
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode())
except Exception as e:
    print("Error:", e)
