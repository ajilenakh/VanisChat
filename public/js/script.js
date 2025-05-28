// dark mode toggle
document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('check');
  const icon = document.querySelector('.toggle__circle .icon');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('theme');

  function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    checkbox.checked = theme === 'dark';
    icon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  checkbox.addEventListener('change', () => {
    const newTheme = checkbox.checked ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });
});

// temp in memory chat-rooms
