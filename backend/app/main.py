# run.py
from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_restx import Api
from api.halo import api as halo_ns
from api.detect import api as detect_ns
from api.users import api as users_ns
from api.face_registration import api as face_ns
from api.face_identification import api as identify_ns
import os
from flask_cors import CORS
from datetime import datetime

class CustomJSONProvider(DefaultJSONProvider):
    """Custom JSON provider to handle datetime serialization"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def create_app():
    app = Flask(__name__)
    app.json = CustomJSONProvider(app)
    api = Api(app, version="1.0", title="Flask Face Detection API", doc='/api/docs', prefix='/api')

    api.add_namespace(halo_ns, path="/halo")
    api.add_namespace(detect_ns, path="/detect")
    api.add_namespace(users_ns, path="/users")
    api.add_namespace(face_ns, path="/face")
    api.add_namespace(identify_ns, path="/identify")
    CORS(app)
    return app

    api.add_namespace(halo_ns, path="/halo")
    api.add_namespace(detect_ns, path="/detect")
    api.add_namespace(users_ns, path="/users")
    CORS(app)
    return app

app = create_app()

LOG_FILE = os.path.join("instance", "app.log")

@app.route("/api/logs")
def get_logs():
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r") as f:
            lines = f.readlines()
            return "".join(lines[-30:])
    return "No logs."

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)