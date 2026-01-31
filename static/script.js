// --- 1. UI & NAVIGATION LOGIC ---

const mobileMenu = document.getElementById('mobile-menu');
const navMenu = document.getElementById('nav-menu');

// Fix: Use mobileMenu (the variable you actually defined)
mobileMenu.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close menu when a link is clicked
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Consolidated showSection (Only one version needed!)
function showSection(id) {
  // 1. If the camera is running and we are leaving the scanner section, stop it
  if (id !== 'barcode-scan' && html5QrCode && html5QrCode.isScanning) {
      stopScanner();
  }

  // 2. Hide all sections
  const sections = document.querySelectorAll('main > section');
  sections.forEach(s => s.classList.add('hidden'));
  
  // 3. Show the target section
  const target = document.getElementById(id);
  if (target) {
      target.classList.remove('hidden');
  }

  // 4. Trigger data loading
  if (id === 'dashboard') {
      loadDashboard();
  } else if (id === 'certificates') {
      loadCertificates();
  } else if (id === 'renewals') {
      loadRenewals();
  }
}

// --- 2. AUTHENTICATION ---

async function login() {
    const userIDInput = document.querySelector('input[placeholder="User ID"]');
    const passwordInput = document.querySelector('input[placeholder="Password"]');

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userIDInput.value, password: passwordInput.value })
    });

    const result = await response.json();

    if (response.ok) {
        alert(result.message);
        showSection('dashboard'); // This will automatically call loadDashboard()
    } else {
        alert(result.message);
    }
}

// --- 3. DASHBOARD LOGIC ---

async function loadDashboard() {
    const response = await fetch('/api/dashboard_stats');
    const stats = await response.json();
    
    const statElements = document.querySelectorAll('.stat-card .value');
    if (statElements.length >= 4) {
        statElements[0].innerText = stats.total;
        statElements[1].innerText = stats.valid;
        statElements[2].innerText = stats.expiring_soon;
        statElements[3].innerText = stats.expired;
    }
}

// --- 4. CERTIFICATE CRUD ---

async function saveCertificate() {
    const idInput = document.getElementById('new-cert-id');
    const typeInput = document.getElementById('new-cert-type');

    if (!idInput.value) {
        alert("Please enter a Certificate ID");
        return;
    }

    const response = await fetch('/api/add_certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idInput.value, type: typeInput.value })
    });

    if (response.ok) {
        idInput.value = ''; 
        loadCertificates(); 
    }
}

async function loadCertificates() {
    const response = await fetch('/api/certificates');
    const certs = await response.json();
    const displayGrid = document.getElementById('cert-display-grid');
    
    displayGrid.innerHTML = '';
    certs.forEach(cert => {
        const approveBtn = cert.status === "Pending Verification" 
            ? `<button onclick="approveCertificate('${cert.id}')" style="background: #10b981; margin-top: 10px;">Approve</button>` 
            : '';

        displayGrid.innerHTML += `
            <div class="card item-card">
                <span style="font-size: 11px; color: var(--text-light);">ID: ${cert.id}</span>
                <h3>${cert.type}</h3>
                <p>Status: <strong style="color: ${cert.status === 'Valid' ? '#10b981' : '#f59e0b'}">
                    ${cert.status}
                </strong></p>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${approveBtn}
                    <button onclick="deleteCertificate('${cert.id}')" style="background: #ef4444; margin-top: 10px;">
                        Delete
                    </button>
                </div>
            </div>
        `;
    });
}

async function deleteCertificate(certId) {
    if (!confirm(`Delete ${certId}?`)) return;
    const response = await fetch(`/api/delete_certificate/${certId}`, { method: 'DELETE' });
    if (response.ok) loadCertificates();
}

async function approveCertificate(certId) {
    const response = await fetch(`/api/approve_certificate/${certId}`, { method: 'PUT' });
    if (response.ok) loadCertificates();
}

// --- 5. RENEWALS ---

async function loadRenewals() {
    const response = await fetch('/api/renewals');
    const renewals = await response.json();
    const displayGrid = document.querySelector('#renewals .grid');
    
    displayGrid.innerHTML = '';
    if (renewals.length === 0) {
        displayGrid.innerHTML = '<p>No upcoming renewals.</p>';
        return;
    }

    renewals.forEach(cert => {
        const color = cert.days_left < 0 ? '#ef4444' : '#f59e0b';
        displayGrid.innerHTML += `
            <div class="card" style="border-left: 5px solid ${color}">
                <h3>${cert.type}</h3>
                <p>ID: ${cert.id}</p>
                <p style="color: ${color}; font-weight: bold;">
                    ${cert.days_left < 0 ? 'EXPIRED' : `Expires in ${cert.days_left} days`}
                </p>
                <button onclick="renewCertificate('${cert.id}')" style="margin-top:10px;">
                    Renew
                </button>
            </div>
        `;
    });
}

async function renewCertificate(certId) {
    const response = await fetch(`/api/approve_certificate/${certId}`, { method: 'PUT' });
    if (response.ok) {
        alert("Renewed!");
        loadRenewals();
    }
}

let html5QrCode;

async function startScanner() {
    // Check if it's already running to prevent errors
    if (html5QrCode && html5QrCode.isScanning) {
        console.log("Scanner is already running.");
        return;
    }

    document.getElementById('start-scan').classList.add('hidden');
    document.getElementById('stop-scan').classList.remove('hidden');

    // Create the instance
    html5QrCode = new Html5Qrcode("reader");

    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
    };

    try {
        await html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            onScanSuccess
        );
    } catch (err) {
        console.error("Camera access denied or error:", err);
        alert("Could not start camera. Ensure you are using HTTPS or Localhost.");
        stopScanner();
    }
}

function onScanSuccess(decodedText, decodedResult) {
    // When a code is found:
    console.log(`Code scanned: ${decodedText}`);
    document.getElementById('scanned-id').innerText = "Scanned ID: " + decodedText;
    
    // Stop the camera
    stopScanner();

    // Automatically search for this ID
    searchByBarcode(decodedText);
}

async function stopScanner() {
    if (html5QrCode) {
        await html5QrCode.stop();
        document.getElementById('start-scan').classList.remove('hidden');
        document.getElementById('stop-scan').classList.add('hidden');
    }
}

// Logic to find the certificate after scanning
async function searchByBarcode(id) {
  const response = await fetch('/api/certificates');
  const certs = await response.json();
  const found = certs.find(c => c.id === id);

  const detailsDiv = document.getElementById('scanner-details');

  if (found) {
      // Fill the card with data
      document.getElementById('res-type').innerText = found.type;
      document.getElementById('res-id').innerText = found.id;
      document.getElementById('res-status').innerText = found.status;
      document.getElementById('res-status').style.color = found.status === 'Valid' ? '#10b981' : '#ef4444';
      document.getElementById('res-expiry').innerText = found.expiry_date || 'N/A';

      // Set up the Renew button inside the result card
      const renewBtn = document.getElementById('res-renew-btn');
      renewBtn.onclick = () => renewCertificate(found.id);

      detailsDiv.classList.remove('hidden'); // Show the card
  } else {
      alert("System Error: Asset ID not found.");
      detailsDiv.classList.add('hidden');
  }
}

function exportData() {
  // This simply opens the Flask URL, which triggers a file download in the browser
  window.location.href = '/api/export_csv';
}

// --- INITIALIZATION ---
window.onload = () => {
    showSection('login'); // Start at Login for better UX
};

