// Migrate preferences from older releases and expire only their known cookies.
// A fresh browser receives no cookie writes.
(() => {
  const preferences = new Map([
    ['structorizer_lang', 'structorizer.language'],
    ['projectTitle', 'projectTitle'], ['projectTtile', 'projectTitle'],
    ['structCode', 'structCode'], ['structCodeReOpen', 'structCodeReOpen'],
  ]);
  const obsolete = new Set([...preferences.keys(), '_ga', '_ga_J8R18F1LH0', 'userKey', 'googtrans']);
  const directory = new URL('.', document.currentScript.src).pathname;
  try {
    for (const entry of document.cookie.split(/;\s*/)) {
      const separator = entry.indexOf('=');
      if (separator < 0) continue;
      const name = entry.slice(0, separator);
      if (!obsolete.has(name)) continue;
      const key = preferences.get(name);
      if (key) {
        try {
          if (localStorage.getItem(key) === null) localStorage.setItem(key, entry.slice(separator + 1));
        } catch { /* Settings are optional. */ }
      }
      const domains = ['', '; Domain=' + location.hostname];
      // Analytics may have used the parent domain of this custom site.
      if (location.hostname === 'struct.labtoso.de' && (name.startsWith('_ga') || name === 'googtrans')) {
        domains.push('; Domain=labtoso.de');
      }
      for (const path of new Set(['/', directory, directory + 'legacy/'])) {
        for (const domain of domains) document.cookie = name + '=; Max-Age=0; Path=' + path + domain;
      }
    }
  } catch { /* Cookies may be blocked entirely. */ }
  try {
    localStorage.removeItem('structorizer-consent');
    localStorage.removeItem('structorizer-consent-at');
  } catch { /* Storage may be unavailable. */ }
})();
