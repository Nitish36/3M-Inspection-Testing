from flask import Flask, render_template, request, jsonify

app = Flask(__name__, template_folder='template')

DATA = {
    "stats": {"total_assets": 128, "valid_certs": 112, "expiring_soon": 9, "expired": 3},
    "users": {"admin": "password123"}
}

# New: Our list of certificates (this stays in memory while the server runs)
CERTIFICATES_LIST = [
    {"id": "CERT-101", "type": "Form 11", "status": "Valid"},
    {"id": "CERT-102", "type": "Form 13", "status": "Valid"}
]


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if username in DATA['users'] and DATA['users'][username] == password:
        return jsonify({"status": "success", "message": "Welcome back!"}), 200
    else:
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401


# API Route to get Dashboard Stats
@app.route('/api/stats', methods=['GET'])
def get_stats():
    return jsonify(DATA['stats'])


@app.route('/api/certificates', methods=['GET'])
def get_certificates():
    return jsonify(CERTIFICATES_LIST)


@app.route('/api/add_certificate', methods=['POST'])
def add_certificate():
    new_cert = request.json # Get the data sent from JavaScript

    # Basic Validation
    if not new_cert.get('id') or not new_cert.get('type'):
        return jsonify({"status": "error", "message": "Missing fields"}), 400

    # Add a default status
    new_cert['status'] = "Pending Verification"

    # Add to our list
    CERTIFICATES_LIST.append(new_cert)

    return jsonify({"status": "success", "message": "Certificate saved successfully!"}), 201


if __name__ == '__main__':
    app.run(debug=True)
