import base64
with open("/tmp/pc.b64", "r") as f:
    data = f.read()
with open("/opt/backend/src/routes/productoComposicion.ts", "wb") as f:
    f.write(base64.b64decode(data))
print("Done!")
