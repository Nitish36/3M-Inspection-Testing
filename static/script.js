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
async function loadDashboardStats() {
  const response = await fetch('/api/stats');
  const stats = await response.json();

  // Update the HTML numbers dynamically
  // Note: I'm selecting by the order they appear in your grid
  const statValues = document.querySelectorAll('.stat-card .value');
  statValues[0].innerText = stats.total_assets;
  statValues[1].innerText = stats.valid_certs;
  statValues[2].innerText = stats.expiring_soon;
  statValues[3].innerText = stats.expired;
}

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
  
  const activeSection = document.getElementById(id);
  if (activeSection) {
      activeSection.classList.remove('hidden');
  }

  // NEW: If user clicks the certificates tab, fetch the data
  if (id === 'certificates') {
      loadCertificates();
  }
}