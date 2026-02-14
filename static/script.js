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
