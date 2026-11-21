(() => {
  const key = 'structorizer.appearance';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const options = ['system', 'studio', 'midnight', 'lagoon', 'orchid', 'ember', 'oled'];
  let chosen = 'system';
  try {
    const stored = localStorage.getItem(key);
    if (options.includes(stored)) chosen = stored;
  } catch { /* Storage can be disabled. */ }

  function apply() {
    const automatic = system.matches ? 'system-dark' : 'system-light';
    const root = document.documentElement;
    root.dataset.theme = chosen === 'system' ? automatic : chosen;
    document.querySelectorAll('[data-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.choice === chosen));
      button.dataset.theme = button.dataset.choice === 'system' ? automatic : button.dataset.choice;
    });
    const color = getComputedStyle(root).getPropertyValue('--surface').trim();
    if (color) document.querySelector('meta[name="theme-color"]').content = color;
  }

  apply();
  system.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    const dialog = document.getElementById('appearance');
    for (const opener of document.querySelectorAll('.appearance-open')) {
      opener.addEventListener('click', () => {
        dialog.showModal();
        dialog.querySelector('[aria-pressed="true"]').focus();
      });
    }
    dialog.addEventListener('click', event => {
      const button = event.target.closest('[data-choice]');
      if (!button) return;
      chosen = button.dataset.choice;
      try { localStorage.setItem(key, chosen); } catch { /* Keep this session's choice. */ }
      apply();
    });
    apply();
  });
})();
