# app/services/halo_service.py

def get_halo():
    """Get halo message"""
    return {"message": "Halo! Welcome to Flask API"}

def post_halo(payload):
    """Post halo with nama and handphone"""
    nama = payload.get('nama', '')
    handphone = payload.get('handphone', '')
    
    return {
        "message": f"Halo {nama}!",
        "nama": nama,
        "handphone": handphone
    }
