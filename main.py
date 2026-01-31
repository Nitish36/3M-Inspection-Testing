from flask import Flask, render_template, request, jsonify, make_response
import json
import os
from datetime import datetime, timedelta
import csv
import io

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
@app.route('/api/dashboard_stats', methods=['GET'])
def get_dashboard_stats():
    certs = load_data()
    today = datetime.now()
    
    stats = {
        "total": len(certs),
        "valid": 0,
        "expiring_soon": 0,
        "expired": 0
    }

    for c in certs:
        # If no date exists, treat it as valid for now
        if 'expiry_date' not in c:
            stats["valid"] += 1
            continue
            
        expiry = datetime.strptime(c['expiry_date'], '%Y-%m-%d')
        days_left = (expiry - today).days

        if days_left < 0:
            stats["expired"] += 1
        elif 0 <= days_left <= 7: # Urgent: within 7 days
            stats["expiring_soon"] += 1
        else:
            stats["valid"] += 1

    return jsonify(stats)


@app.route('/api/certificates', methods=['GET'])
def get_certificates():
    # Every time the user opens the tab, we read the LATEST data from the file
    certs = load_data()
    return jsonify(certs)


@app.route('/api/add_certificate', methods=['POST'])
def add_certificate():
    new_cert = request.json
    # When adding a new cert, we set an expiry date (e.g., 1 year from today)
    expiry_date = datetime.now() + timedelta(days=365)
    new_cert['status'] = "Valid"
    new_cert['expiry_date'] = expiry_date.strftime('%Y-%m-%d') # Save as YYYY-MM-DD string
    certs = load_data()
    certs.append(new_cert)
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


@app.route('/api/renewals', methods=['GET'])
def get_renewals():
    certs = load_data()
    today = datetime.now()
    upcoming_renewals = []

    for c in certs:
        # 1. Check if expiry_date exists (for old data)
        if 'expiry_date' not in c:
            # If missing, let's pretend it expires tomorrow for testing
            c['expiry_date'] = (today + timedelta(days=1)).strftime('%Y-%m-%d')
        
        try:
            expiry = datetime.strptime(c['expiry_date'], '%Y-%m-%d')
            days_left = (expiry - today).days
            
            # 2. TEST LOGIC: Show everything expiring in the next 400 days 
            # (This ensures your new 365-day certs show up)
            if days_left <= 400: 
                c['days_left'] = days_left
                upcoming_renewals.append(c)
        except Exception as e:
            print(f"Error processing date for {c['id']}: {e}")

    return jsonify(upcoming_renewals)


@app.route('/api/export_csv')
def export_csv():
    certs = load_data()

    # Create an "in-memory" file
    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Write the Header Row
    writer.writerow(['Asset ID', 'Certificate Type', 'Status', 'Expiry Date'])

    # 2. Write the Data Rows
    for c in certs:
        writer.writerow([
            c.get('id', 'N/A'),
            c.get('type', 'N/A'),
            c.get('status', 'N/A'),
            c.get('expiry_date', 'N/A')
        ])

    # 3. Create the response
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=safety_report.csv"
    response.headers["Content-type"] = "text/csv"

    return response


if __name__ == '__main__':
    app.run(debug=True)
