import os
import pytest
import shutil
from main import create_app
from utils.db import get_db_connection, get_db_cursor

DATASET_DIR = "dataset_test"

# Setup fixture: bersihkan data sebelum semua test dimulai
@pytest.fixture(scope="module")
def client():
    """Setup test client dan clear data sebelum test"""
    # Set environment variable untuk test
    os.environ["DATASET_DIR"] = DATASET_DIR
    
    app = create_app()
    app.config['TESTING'] = True
    
    # Clear database sebelum test
    clear_database()
    
    # Buat folder dataset test jika belum ada
    os.makedirs(DATASET_DIR, exist_ok=True)
    
    with app.test_client() as client:
        yield client
    
    # Cleanup: Hapus folder dataset testing setelah semua test selesai
    clear_database()
    if os.path.exists(DATASET_DIR):
        shutil.rmtree(DATASET_DIR)

@pytest.fixture(autouse=True)
def clear_data_per_test():
    """Clear data sebelum setiap test individual"""
    yield
    # Clear data setelah setiap test
    clear_database()
    # Clear dataset folders
    if os.path.exists("dataset"):
        for folder in os.listdir("dataset"):
            folder_path = os.path.join("dataset", folder)
            if os.path.isdir(folder_path):
                shutil.rmtree(folder_path)

def clear_database():
    """Helper function untuk clear semua data di database"""
    try:
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            # Delete all users
            cursor.execute("DELETE FROM users")
            # Reset auto-increment counter
            cursor.execute("ALTER SEQUENCE users_id_seq RESTART WITH 1")
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not clear database: {e}")

def test_create_user(client):
    """Test membuat user baru"""
    payload = {"name": "Edy", "email": "edy@example.com", "password": "password123"}
    res = client.post("/api/users", json=payload)

    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert data["message"] == "User created successfully"
    assert data["data"]["name"] == "Edy"
    assert data["data"]["email"] == "edy@example.com"
    assert "id" in data["data"]

    # Cek folder dataset/<id> dibuat
    folder = os.path.join("dataset", str(data["data"]["id"]))
    assert os.path.exists(folder)

def test_create_user_duplicate_email(client):
    """Test membuat user dengan email yang sudah ada"""
    # Buat user pertama
    payload = {"name": "User 1", "email": "same@example.com", "password": "pass1"}
    client.post("/api/users", json=payload)
    
    # Buat user kedua dengan email sama
    payload2 = {"name": "User 2", "email": "same@example.com", "password": "pass2"}
    res = client.post("/api/users", json=payload2)
    
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False
    assert "Email sudah terdaftar" in data["message"]

def test_create_user_missing_fields(client):
    """Test membuat user dengan field yang tidak lengkap"""
    # Missing password
    payload = {"name": "Test", "email": "test@example.com"}
    res = client.post("/api/users", json=payload)
    assert res.status_code == 400

def test_get_all_users(client):
    """Test mendapatkan semua users"""
    # Tambah beberapa user
    client.post("/api/users", json={"name": "Alice", "email": "alice@example.com", "password": "pass1"})
    client.post("/api/users", json={"name": "Bob", "email": "bob@example.com", "password": "pass2"})
    client.post("/api/users", json={"name": "Charlie", "email": "charlie@example.com", "password": "pass3"})

    res = client.get("/api/users")
    assert res.status_code == 200

    data = res.get_json()
    assert data["success"] is True
    assert data["message"] == "Users retrieved successfully"
    assert len(data["data"]) == 3
    
    # Verify password tidak ditampilkan
    for user in data["data"]:
        assert "password" not in user
        assert "name" in user
        assert "email" in user

def test_get_user_by_id(client):
    """Test mendapatkan user berdasarkan ID"""
    res = client.post("/api/users", json={"name": "Test User", "email": "testuser@example.com", "password": "test123"})
    user_id = res.get_json()["data"]["id"]

    res = client.get(f"/api/users/{user_id}")
    assert res.status_code == 200
    
    data = res.get_json()
    assert data["success"] is True
    assert data["message"] == "User retrieved successfully"
    assert data["data"]["id"] == user_id
    assert data["data"]["name"] == "Test User"
    assert data["data"]["email"] == "testuser@example.com"
    assert "password" not in data["data"]

def test_get_user_not_found(client):
    """Test mendapatkan user yang tidak ada"""
    res = client.get("/api/users/99999")
    assert res.status_code == 404
    
    data = res.get_json()
    assert data["success"] is False
    assert "tidak ditemukan" in data["message"]

def test_update_user(client):
    """Test update user"""
    res = client.post("/api/users", json={"name": "Old Name", "email": "old@example.com", "password": "oldpass"})
    user_id = res.get_json()["data"]["id"]

    res = client.put(f"/api/users/{user_id}", json={"name": "New Name", "email": "new@example.com", "password": "newpass"})
    assert res.status_code == 200

    data = res.get_json()
    assert data["success"] is True
    assert data["message"] == "User updated successfully"
    assert data["data"]["name"] == "New Name"
    assert data["data"]["email"] == "new@example.com"
    assert "password" not in data["data"]

def test_update_user_not_found(client):
    """Test update user yang tidak ada"""
    res = client.put("/api/users/99999", json={"name": "Test", "email": "test@example.com", "password": "pass"})
    assert res.status_code == 404
    
    data = res.get_json()
    assert data["success"] is False

def test_update_user_duplicate_email(client):
    """Test update user dengan email yang sudah dipakai user lain"""
    # Buat 2 user
    client.post("/api/users", json={"name": "User1", "email": "user1@example.com", "password": "pass1"})
    res = client.post("/api/users", json={"name": "User2", "email": "user2@example.com", "password": "pass2"})
    user2_id = res.get_json()["data"]["id"]
    
    # Update user2 dengan email user1
    res = client.put(f"/api/users/{user2_id}", json={"name": "User2", "email": "user1@example.com", "password": "pass2"})
    assert res.status_code == 400
    
    data = res.get_json()
    assert data["success"] is False
    assert "Email" in data["message"]

def test_delete_user(client):
    """Test delete user"""
    res = client.post("/api/users", json={"name": "Delete Me", "email": "delete@example.com", "password": "delpass"})
    user_id = res.get_json()["data"]["id"]

    folder = os.path.join("dataset", str(user_id))
    assert os.path.exists(folder)

    res = client.delete(f"/api/users/{user_id}")
    assert res.status_code == 200

    data = res.get_json()
    assert data["success"] is True
    assert str(user_id) in data["message"]

    # Folder harus hilang
    assert not os.path.exists(folder)

    # User tidak boleh ditemukan lagi
    res = client.get(f"/api/users/{user_id}")
    assert res.status_code == 404

def test_delete_user_not_found(client):
    """Test delete user yang tidak ada"""
    res = client.delete("/api/users/99999")
    assert res.status_code == 404
    
    data = res.get_json()
    assert data["success"] is False
    assert "tidak ditemukan" in data["message"]
