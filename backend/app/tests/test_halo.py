#//test/test_halo.py
from run import create_app

def test_get_halo():
    app = create_app()
    client = app.test_client()

    res = client.get("/api/halo/")
    assert res.status_code == 200
    assert res.json["status"] == "success"

def test_post_halo():
    app = create_app()
    client = app.test_client()

    payload = {"nama": "edy", "handphone": "081111"}

    # Jika pakai payload json langsung di swagger
    res = client.post("/api/halo/", json=payload)

    # Jika pakai input form(form-data) di swagger 
    #res = client.post("/api/halo/", data=payload)

    assert res.status_code == 200
    assert res.json["data"]["nama"] == "edy"