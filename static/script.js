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
    const sections = document.querySelectorAll('main > section');
    sections.forEach(s => s.classList.add('hidden'));
    
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
    }

    // Trigger data loading based on section ID
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

// --- INITIALIZATION ---
window.onload = () => {
    showSection('login'); // Start at Login for better UX
};