import json
import getpass
import urllib.request
import urllib.error

url = "https://stopmeter-api.onrender.com/api/setup-super-admin"

key = getpass.getpass("Setup key: ")
name = input("Nama Super Admin: ")
email = input("Email: ")
password = getpass.getpass("Password minimal 12 karakter: ")

data = json.dumps({
    "name": name,
    "email": email,
    "password": password
}).encode()

req = urllib.request.Request(
    url,
    data=data,
    headers={
        "Content-Type": "application/json",
        "X-Setup-Key": key
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=60) as r:
        print(r.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode())
except Exception as e:
    print("Error:", e)
