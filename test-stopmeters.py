import requests
from getpass import getpass

base = "https://stopmeter-api.onrender.com/api"

email = input("Email: ")
password = getpass("Password: ")

r = requests.post(
    f"{base}/login",
    json={"email": email, "password": password},
    timeout=30
)

print("Login HTTP:", r.status_code)

if r.status_code != 200:
    print(r.text)
    raise SystemExit

token = r.json().get("token")

r = requests.get(
    f"{base}/stopmeters",
    headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    },
    timeout=30
)

print("Stopmeter HTTP:", r.status_code)
print(r.text[:1500])
