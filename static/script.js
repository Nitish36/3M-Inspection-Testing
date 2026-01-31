// Toggle Mobile Menu
const mobileMenu  = document.getElementById('mobile-menu');
const navMenu = document.getElementById('nav-menu');

mobileMenu.addEventListener('click', () => {
  // Toggle the 'active' class on both the icon and the menu
  mobileMenu.classList.toggle('active');
  navMenu.classList.toggle('active');
});

menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// Close menu when a link is clicked (for mobile)
document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', () => {
      mobileMenu.classList.remove('active');
      navMenu.classList.remove('active');
  });
});

// Existing function logic (simplified for example)
function showSection(id) {
    const sections = document.querySelectorAll('main > section');
    sections.forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function login() {
    alert("Login successful!");
    showSection('dashboard');
}

async function login() {
  const userID = document.querySelector('input[placeholder="User ID"]').value;
  const password = document.querySelector('input[placeholder="Password"]').value;

  const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: userID, password: password })
  });

  const result = await response.json();

  if (response.ok) {
      alert(result.message);
      showSection('dashboard');
      loadDashboardStats(); // Fetch data after login
  } else {
      alert(result.message);
  }
}

// Function to fetch stats from Flask
async function loadDashboard() {  // <--- Make sure this name is correct
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

// Update showSection to include the dashboard trigger


async function saveCertificate() {
  const idInput = document.getElementById('new-cert-id');
  const typeInput = document.getElementById('new-cert-type');

  const certData = {
      id: idInput.value,
      type: typeInput.value
  };

  if (!certData.id) {
      alert("Please enter a Certificate ID");
      return;
  }

  try {
      const response = await fetch('/api/add_certificate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(certData)
      });

      const result = await response.json();

      if (response.ok) {
          alert(result.message);
          idInput.value = ''; // Clear input
          loadCertificates(); // Refresh the list automatically
      } else {
          alert("Error: " + result.message);
      }
  } catch (error) {
      console.error("Error saving certificate:", error);
  }
}

// 2. Function to LOAD certificates from the Flask Backend
async function loadCertificates() {
  const displayGrid = document.getElementById('cert-display-grid');
  
  try {
      const response = await fetch('/api/certificates');
      const certificates = await response.json();

      // Clear the grid first
      displayGrid.innerHTML = '';

      // Loop through the data and create cards
      certificates.forEach(cert => {
          const card = document.createElement('div');
          card.className = 'card item-card';
          card.innerHTML = `
              <span style="font-size: 12px; color: var(--text-light);">ID: ${cert.id}</span>
              <h3 style="margin: 5px 0;">${cert.type}</h3>
              <p style="color: var(--success); font-weight: 600; font-size: 14px;">● ${cert.status}</p>
              <button class="btn-outline" style="margin-top:10px; padding: 5px 10px; font-size: 12px;">Download PDF</button>
          `;
          displayGrid.appendChild(card);
      });
  } catch (error) {
      console.error("Error loading certificates:", error);
  }
}

// 3. Modify your existing showSection function to load data when needed
function showSection(id) {
  const sections = document.querySelectorAll('main > section');
  sections.forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');

  if (id === 'dashboard') {
      loadDashboard();
  } else if (id === 'certificates') {
      loadCertificates();
  } else if (id === 'renewals') {
      loadRenewals();
  }
}
// Function to ask Flask to delete a certificate
async function deleteCertificate(certId) {
  if (!confirm(`Are you sure you want to delete ${certId}?`)) return;

  const response = await fetch(`/api/delete_certificate/${certId}`, {
      method: 'DELETE'
  });

  if (response.ok) {
      loadCertificates(); // Refresh the list so the card disappears
  } else {
      alert("Failed to delete.");
  }
}

// Updated Load function (Add the button here)
async function loadCertificates() {
  const response = await fetch('/api/certificates');
  const certs = await response.json();
  const displayGrid = document.getElementById('cert-display-grid');
  
  displayGrid.innerHTML = '';
  certs.forEach(cert => {
      // Only show the Approve button if it's not already valid
      const approveBtn = cert.status === "Pending Verification" 
          ? `<button onclick="approveCertificate('${cert.id}')" style="background: #10b981; margin-top: 10px;">Approve</button>` 
          : '';

      displayGrid.innerHTML += `
          <div class="card item-card">
              <h3>${cert.type}</h3>
              <p>ID: ${cert.id}</p>
              <p>Status: <strong style="color: ${cert.status === 'Valid' ? '#10b981' : '#f59e0b'}">
                  ${cert.status}
              </strong></p>
              
              <div style="display: flex; gap: 10px;">
                  ${approveBtn}
                  <button onclick="deleteCertificate('${cert.id}')" style="background: #ef4444; margin-top: 10px;">
                      Delete
                  </button>
              </div>
          </div>
      `;
  });
}

// Function to tell Flask to approve a certificate
async function approveCertificate(certId) {
  const response = await fetch(`/api/approve_certificate/${certId}`, {
      method: 'PUT'
  });

  if (response.ok) {
      loadCertificates(); // Refresh UI
  } else {
      alert("Approval failed.");
  }
}


async function loadRenewals() {
  const response = await fetch('/api/renewals');
  const renewals = await response.json();
  const displayGrid = document.querySelector('#renewals .grid');
  
  displayGrid.innerHTML = '';

  if (renewals.length === 0) {
      displayGrid.innerHTML = '<p>All assets are compliant. No upcoming renewals.</p>';
      return;
  }

  renewals.forEach(cert => {
      // Color coding based on urgency
      const color = cert.days_left < 0 ? '#ef4444' : '#f59e0b';
      const statusText = cert.days_left < 0 ? 'EXPIRED' : `Expires in ${cert.days_left} days`;

      displayGrid.innerHTML += `
          <div class="card" style="border-left: 5px solid ${color}">
              <h3>${cert.type}</h3>
              <p>ID: ${cert.id}</p>
              <p style="color: ${color}; font-weight: bold;">${statusText}</p>
              <button onclick="renewCertificate('${cert.id}')" style="margin-top:10px;">
                  Renew (Extend 1 Year)
              </button>
          </div>
      `;
  });
}

// Function to handle the Renewal click
async function renewCertificate(certId) {
  // We can reuse our Update logic here! 
  // We will tell the backend to reset the expiry date.
  const response = await fetch(`/api/approve_certificate/${certId}`, {
      method: 'PUT'
  });

  if (response.ok) {
      alert("Certificate Renewed!");
      loadRenewals();
  }
}

function showSection(id) {
  const sections = document.querySelectorAll('main > section');
  sections.forEach(s => s.classList.add('hidden'));
  
  document.getElementById(id).classList.remove('hidden');

  // Add these triggers
  if (id === 'certificates') {
      loadCertificates();
  } else if (id === 'renewals') {
      loadRenewals(); // <--- Make sure this is here!
  }
}

// This runs as soon as the page loads
window.onload = () => {
  showSection('dashboard'); // Start on dashboard
};