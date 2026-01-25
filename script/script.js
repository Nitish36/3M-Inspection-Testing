function login() {
    document.getElementById('login').classList.add('hidden');
    showSection('dashboard');
  }

  function showSection(sectionId) {
    const sections = document.querySelectorAll('section');
    sections.forEach(sec => sec.classList.add('hidden'));

    document.getElementById(sectionId).classList.remove('hidden');
  }

  function showAlert() {
    alert('⚠️ Certificate expiring soon!');
  }
  function submitContact() {
    alert('✅ Thank you! Your message has been submitted.');
  }