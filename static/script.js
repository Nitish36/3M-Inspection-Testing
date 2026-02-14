/* =====================================================
   GLOBAL STATE
===================================================== */
let html5QrCode = null;

/* =====================================================
   UI & NAVIGATION
===================================================== */
const mobileMenu = document.getElementById("mobile-menu");
const navMenu = document.getElementById("nav-menu");

if (mobileMenu) {
  mobileMenu.addEventListener("click", () => {
    mobileMenu.classList.toggle("active");
    navMenu.classList.toggle("active");
  });
}

document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", () => {
    mobileMenu?.classList.remove("active");
    navMenu?.classList.remove("active");
  });
});

function showSection(id) {
  // Stop scanner if leaving scan page
  if (id !== "barcode-scan" && html5QrCode?.isScanning) {
    stopScanner();
  }

  document.querySelectorAll("main > section").forEach(sec => {
    sec.classList.add("hidden");
  });

  const target = document.getElementById(id);
  target?.classList.remove("hidden");

  if (id === "dashboard") loadDashboard();
  if (id === "certificates") loadCertificates();
  if (id === "renewals") loadRenewals();
}

/* =====================================================
   AUTHENTICATION
===================================================== */
async function login() {
  const username = document.getElementById("username")?.value;
  const password = document.getElementById("password")?.value;

  if (!username || !password) {
    alert("Please enter login credentials");
    return;
  }

  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();

  if (response.ok) {
    document.getElementById("login-page").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    showSection("dashboard");
  } else {
    alert(result.message);
  }
}

function logout() {
  location.reload();
}

/* =====================================================
   DASHBOARD
===================================================== */
async function loadDashboard() {
  const response = await fetch("/api/dashboard_stats");
  const stats = await response.json();

  const values = document.querySelectorAll(".stat-card .value");
  if (values.length === 4) {
    values[0].textContent = stats.total;
    values[1].textContent = stats.valid;
    values[2].textContent = stats.expiring_soon;
    values[3].textContent = stats.expired;
  }
}

/* =====================================================
   CERTIFICATES
===================================================== */
async function saveCertificate() {
  const id = document.getElementById("new-cert-id").value;
  const type = document.getElementById("new-cert-type").value;

  if (!id) {
    alert("Enter certificate ID");
    return;
  }

  await fetch("/api/add_certificate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, type })
  });

  document.getElementById("new-cert-id").value = "";
  loadCertificates();
}

async function loadCertificates() {
  const response = await fetch("/api/certificates");
  const certs = await response.json();
  const grid = document.getElementById("cert-display-grid");

  grid.innerHTML = "";

  certs.forEach(cert => {
    const approve =
      cert.status === "Pending Verification"
        ? `<button onclick="approveCertificate('${cert.id}')" class="btn-success">Approve</button>`
        : "";

    grid.innerHTML += `
      <div class="card">
        <small>ID: ${cert.id}</small>
        <h3>${cert.type}</h3>
        <p>Status: <strong>${cert.status}</strong></p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${approve}
          <button onclick="deleteCertificate('${cert.id}')" class="btn-danger">Delete</button>
        </div>
      </div>`;
  });
}

async function deleteCertificate(id) {
  if (!confirm("Delete this record?")) return;
  await fetch(`/api/delete_certificate/${id}`, { method: "DELETE" });
  loadCertificates();
}

async function approveCertificate(id) {
  await fetch(`/api/approve_certificate/${id}`, { method: "PUT" });
  loadCertificates();
}

/* =====================================================
   RENEWALS
===================================================== */
async function loadRenewals() {
  const response = await fetch("/api/renewals");
  const renewals = await response.json();
  const grid = document.querySelector("#renewals .grid");

  grid.innerHTML = "";

  renewals.forEach(cert => {
    const color = cert.days_left < 0 ? "var(--danger)" : "var(--warning)";
    grid.innerHTML += `
      <div class="card" style="border-left:5px solid ${color}">
        <h3>${cert.type}</h3>
        <p>ID: ${cert.id}</p>
        <strong style="color:${color}">
          ${cert.days_left < 0 ? "EXPIRED" : `Expires in ${cert.days_left} days`}
        </strong>
        <button onclick="renewCertificate('${cert.id}')">Renew</button>
      </div>`;
  });
}

async function renewCertificate(id) {
  await fetch(`/api/approve_certificate/${id}`, { method: "PUT" });
  alert("Renewed successfully");
  loadRenewals();
}

/* =====================================================
   SCANNER
===================================================== */
async function startScanner() {
  if (html5QrCode?.isScanning) return;

  html5QrCode = new Html5Qrcode("reader");

  try {
    await html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      onScanSuccess
    );
  } catch (err) {
    alert("Camera access denied");
  }
}

async function stopScanner() {
  if (html5QrCode?.isScanning) {
    await html5QrCode.stop();
    html5QrCode.clear();
  }
}

function onScanSuccess(text) {
  stopScanner();
  document.getElementById("scanned-id").innerText = `Scanned ID: ${text}`;
  searchByBarcode(text);
}

async function searchByBarcode(id) {
  const response = await fetch("/api/certificates");
  const certs = await response.json();
  const cert = certs.find(c => c.id === id);

  const details = document.getElementById("scanner-details");

  if (!cert) {
    alert("Asset not found");
    details.classList.add("hidden");
    return;
  }

  document.getElementById("res-type").innerText = cert.type;
  document.getElementById("res-id").innerText = cert.id;
  document.getElementById("res-status").innerText = cert.status;
  document.getElementById("res-expiry").innerText = cert.expiry_date || "N/A";
  document.getElementById("res-renew-btn").onclick = () => renewCertificate(cert.id);

  details.classList.remove("hidden");
}

// Profile Summary

async function showOnePageProfile() {
  showSection('profile'); // Your existing function to switch tabs
  
  try {
      const response = await fetch('/api/profile_summary');
      const data = await response.json();

      // Update Text
      document.getElementById('profile-customer').innerText = data.customer_name;
      document.getElementById('profile-site').innerText = "Location: " + data.site_location;
      document.getElementById('profile-rate').innerText = data.compliance_rate + "%";
      document.getElementById('profile-total').innerText = data.total_assets;
      document.getElementById('profile-valid').innerText = data.valid;
      document.getElementById('profile-expired').innerText = data.expired;

      // Create badges for equipment types
      const container = document.getElementById('type-breakdown');
      container.innerHTML = ''; // clear old ones
      for (const [type, count] of Object.entries(data.equipment_breakdown)) {
          container.innerHTML += `<span class="badge" style="background:#eee; padding:10px; border-radius:20px;">${type}: ${count}</span>`;
      }
  } catch (error) {
      console.error("Error loading profile:", error);
  }
}

// Charts

let myStatusChart = null;
let myTypeChart = null;

async function renderCharts() {
    const response = await fetch('/api/chart_data');
    const data = await response.json();

    // 1. Safety Status Pie Chart
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    if (myStatusChart) myStatusChart.destroy(); // Clean up old chart
    myStatusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: data.status_labels,
            datasets: [{
                data: data.status_values,
                backgroundColor: ['#28a745', '#dc3545'],
                borderWidth: 1
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    // 2. Equipment Type Bar Chart
    const ctxType = document.getElementById('typeChart').getContext('2d');
    if (myTypeChart) myTypeChart.destroy(); // Clean up old chart
    myTypeChart = new Chart(ctxType, {
        type: 'bar',
        data: {
            labels: data.type_labels,
            datasets: [{
                label: 'Quantity',
                data: data.type_values,
                backgroundColor: '#ffcc00',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

// Notifications
let alertsShown = false;

async function checkNotifications() {
    // Only show if not already shown in this session
    if (alertsShown) return;

    try {
        const response = await fetch('/api/notifications');
        const alerts = await response.json();

        if (alerts.length > 0) {
            const modal = document.getElementById('notification-modal');
            const body = document.getElementById('modal-body');
            const header = document.getElementById('modal-header');

            // Set header color based on most urgent alert
            const hasUrgent = alerts.some(a => a.type === 'urgent');
            header.style.backgroundColor = hasUrgent ? '#dc3545' : '#ffc107';

            // Build alert list
            body.innerHTML = alerts.map(a => `
              <div style="border-left: 5px solid ${a.type === 'urgent' ? '#dc3545' : '#ffc107'}; padding: 15px; margin-bottom: 15px; background: #fff5f5; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                      <strong>Asset #${a.id}:</strong><br>
                      <span style="font-size: 0.9rem;">${a.msg}</span>
                  </div>
                  <button onclick="requestRetest('${a.id}')" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                      Request Re-test
                  </button>
              </div>
          `).join('');

            modal.classList.remove('hidden');
            modal.style.display = 'flex'; // Ensure it's visible
            alertsShown = true;
        }
    } catch (error) {
        console.error("Notification Error:", error);
    }
}

async function requestRetest(certId) {
  if (!confirm(`Send re-test request for Asset #${certId} to RR Solutions?`)) return;

  try {
      const response = await fetch(`/api/request_retest/${certId}`, { method: 'POST' });
      const result = await response.json();

      if (result.status === 'success') {
          alert("Success: RR Solutions has been notified. We will contact you shortly.");
      } else {
          alert("Error: " + result.message);
      }
  } catch (error) {
      console.error("Retest Request Error:", error);
      alert("Failed to send request. Please check your connection.");
  }
}

async function submitNewCertificate(event) {
  event.preventDefault(); // Prevent page reload

  const payload = {
      id: document.getElementById('new-id').value,
      form_type: document.getElementById('new-form-type').value,
      type: document.getElementById('new-equipment').value,
      site: document.getElementById('new-site').value,
      date: document.getElementById('new-date').value,
      expiry_date: document.getElementById('new-expiry').value
  };

  try {
      const response = await fetch('/api/add_certificate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === 'success') {
          alert("Record added successfully!");
          document.getElementById('add-cert-form').reset();
          
          // Refresh the dashboard and list
          loadDashboardStats();
          showSection('certificates'); 
      } else {
          alert("Error: " + result.message);
      }
  } catch (error) {
      console.error("Add Error:", error);
      alert("Server connection failed.");
  }
}

function filterByForm(type) {
  const rows = document.querySelectorAll('tbody tr');
  rows.forEach(row => {
      const rowForm = row.getAttribute('data-form'); // We need to add this attribute to the row
      if (type === 'ALL' || rowForm === type) {
          row.style.display = '';
      } else {
          row.style.display = 'none';
      }
  });
}

function closeModal() {
    document.getElementById('notification-modal').style.display = 'none';
}

// Call this inside your login function after success!
// Example:
function login() {
    // ... your login logic ...
    // if success:
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    checkNotifications(); // <--- TRIGGER ALERTS HERE
}

// Update your existing showOnePageProfile function to call renderCharts()
async function showOnePageProfile() {
    showSection('profile');
    
    // ... your existing code to update text (Total, Valid, etc.) ...

    // ADD THIS LINE AT THE END
    renderCharts();
}

/* =====================================================
   EXPORT
===================================================== */
function exportData() {
  window.location.href = "/api/export_csv";
}

/* =====================================================
   INIT
===================================================== */
window.onload = () => {
  document.getElementById("app").classList.add("hidden");
};
