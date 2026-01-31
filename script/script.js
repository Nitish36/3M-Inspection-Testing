// Toggle Mobile Menu
const menuToggle = document.getElementById('mobile-menu');
const navMenu = document.getElementById('nav-menu');

menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// Close menu when a link is clicked (for mobile)
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
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