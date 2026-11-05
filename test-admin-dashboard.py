import requests
import getpass

BASE_URL = "https://stopmeter-api.onrender.com/api"

email = input("Email Admin: ")
password = getpass.getpass("Password Admin: ")

login = requests.post(
    f"{BASE_URL}/login",
    json={"email": email, "password": password}
)

print("Login:", login.status_code)

if login.status_code != 200:
    print(login.text)
    exit()

token = login.json()["token"]

response = requests.get(
    f"{BASE_URL}/admin/dashboard",
    headers={"Authorization": f"Bearer {token}"}
)

print("\nDashboard HTTP:", response.status_code)
print(response.text)
