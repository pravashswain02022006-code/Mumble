import urllib.request
import json
url = "https://qjfnytssuyhtkxdgszdg.supabase.co/rest/v1/audit_log?select=*"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZm55dHNzdXlodGt4ZGdzemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI3MjYsImV4cCI6MjA5NjM4ODcyNn0.ZWgVN7ucLKalBvMpmM8gH_ICpI4j0xide_tk0FvOMTE",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZm55dHNzdXlodGt4ZGdzemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI3MjYsImV4cCI6MjA5NjM4ODcyNn0.ZWgVN7ucLKalBvMpmM8gH_ICpI4j0xide_tk0FvOMTE"
}
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("Data length:", len(data))
except Exception as e:
    print("Error:", e)
