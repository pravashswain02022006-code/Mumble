import urllib.request
import json

url = "https://qjfnytssuyhtkxdgszdg.supabase.co/rest/v1/audit_log"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZm55dHNzdXlodGt4ZGdzemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI3MjYsImV4cCI6MjA5NjM4ODcyNn0.ZWgVN7ucLKalBvMpmM8gH_ICpI4j0xide_tk0FvOMTE",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZm55dHNzdXlodGt4ZGdzemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI3MjYsImV4cCI6MjA5NjM4ODcyNn0.ZWgVN7ucLKalBvMpmM8gH_ICpI4j0xide_tk0FvOMTE",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}
data = {
    "action": "add",
    "record_type": "transaction",
    "record_id": "#123",
    "performed_by": "masteradmin"
}
req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
