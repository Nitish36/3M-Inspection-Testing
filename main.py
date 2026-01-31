from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__, template_folder='template')

DATA = {
    "stats": {"total_assets": 128, "valid_certs": 112, "expiring_soon": 9, "expired": 3},
    "users": {"admin": "password123"}
}

# The name of our "database" file
DATA_FILE = 'certificates.json'

# --- HELPER FUNCTIONS (The "Logic" Layer) ---


def load_data():
    """Reads the JSON file and returns the list of certificates."""
    # Check if the file exists first
    if not os.path.exists(DATA_FILE):
        return []  # Return an empty list if no file exists yet

    with open(DATA_FILE, 'r') as file:
        try:
            return json.load(file)
        except json.JSONDecodeError:
            return []  # Return empty list if the file is corrupted/empty


def save_data(certs):
    """Writes the list of certificates into the JSON file."""
    with open(DATA_FILE, 'w') as file:
        # indent=4 makes the file easy for humans to read
        json.dump(certs, file, indent=4)


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
    # Every time the user opens the tab, we read the LATEST data from the file
    certs = load_data()
    return jsonify(certs)


@app.route('/api/add_certificate', methods=['POST'])
def add_certificate():
    new_cert = request.json

    # 1. Load existing data from the file
    certs = load_data()

    # 2. Add the new entry to our list
    new_cert['status'] = "Pending Verification"
    certs.append(new_cert)

    # 3. Save the updated list back to the file permanently
    save_data(certs)
    return jsonify({"status": "success", "message": "Saved to disk!"}), 201


@app.route('/api/delete_certificate/<cert_id>', methods=['DELETE'])
def delete_certificate(cert_id):
    # 1. Load the current data from the JSON file
    certs = load_data()
    # 2. Filtering Logic:
    # We create a NEW list that contains everything EXCEPT the one we want to delete.
    # This is the standard "Pythonic" way to delete an item from a list.
    updated_certs = [c for c in certs if c['id'] != cert_id]
    # Check if we actually removed something
    if len(updated_certs) == len(certs):
        return jsonify({"status": "error", "message": "Certificate not found"}), 404

    # 3. Save the filtered list back to the JSON file
    save_data(updated_certs)
    return jsonify({"status": "success", "message": f"ID {cert_id} deleted successfully"})


@app.route('/api/approve_certificate/<cert_id>', methods=['PUT'])
def approve_certificate(cert_id):
    # 1. Load the data
    certs = load_data()
    found = False

    # 2. Update Logic:
    # We loop through the list to find the one matching the ID
    for c in certs:
        if c['id'] == cert_id:
            c['status'] = "Valid"  # Change the status
            found = True
            break # Stop looking once we find it

    if not found:
        return jsonify({"status": "error", "message": "Certificate not found"}), 404

    # 3. Save the updated list back to the JSON file
    save_data(certs)
    return jsonify({"status": "success", "message": f"Certificate {cert_id} approved!"})


if __name__ == '__main__':
    app.run(debug=True)
