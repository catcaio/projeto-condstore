const THEME_BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const key = 'condstore.theme';
    const stored = window.localStorage.getItem(key);
    const pref = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  } catch {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />;
}
