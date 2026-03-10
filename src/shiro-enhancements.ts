const PAGE_MAP: Array<{ id: string; page: string; icon: string }> = [
  { id: 'dashboard', page: 'dashboard', icon: 'home' },
  { id: 'books', page: 'books', icon: 'book-open' },
  { id: 'notes', page: 'notes', icon: 'sticky-note' },
  { id: 'canvas', page: 'canvas', icon: 'pen-tool' },
  { id: 'audio', page: 'audio', icon: 'mic' },
  { id: 'search', page: 'search', icon: 'search' },
  { id: 'templates', page: 'templates', icon: 'layout-template' },
  { id: 'scheduler', page: 'scheduler', icon: 'calendar' },
  { id: 'export', page: 'export', icon: 'download' },
  { id: 'security', page: 'security', icon: 'shield' },
  { id: 'profile', page: 'profile', icon: 'user' }
];

type AnyFunc = (...args: never[]) => void;

function debounce<T extends AnyFunc>(fn: T, delay = 180): (...args: Parameters<T>) => void {
  let timer: number | undefined;
  return (...args: Parameters<T>) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function getApp(): any {
  return (window as any).app;
}

function safeToast(msg: string, type = 'info'): void {
  const app = getApp();
  if (app?.showToast) {
    app.showToast(msg, type);
  } else {
    console.log(`[${type}] ${msg}`);
  }
}

function createCommandPalette(): void {
  const wrapper = document.createElement('div');
  wrapper.id = 'snCommandPalette';
  wrapper.className = 'sn-command-palette';
  wrapper.innerHTML = `
    <div class="sn-command-box">
      <input id="snCommandInput" class="sn-command-input" placeholder="Jump to page..." />
      <div id="snCommandList" class="sn-command-list"></div>
    </div>
  `;
  document.body.appendChild(wrapper);

  const input = wrapper.querySelector<HTMLInputElement>('#snCommandInput');
  const list = wrapper.querySelector<HTMLDivElement>('#snCommandList');

  const render = (query = ''): void => {
    if (!list) return;
    const q = query.trim().toLowerCase();
    const pages = PAGE_MAP.filter((p) => p.page.includes(q) || p.id.includes(q));

    list.innerHTML = pages
      .map(
        (p, idx) => `
          <button class="sn-command-item" data-page="${p.page}">
            <span class="flex items-center gap-2">
              <i data-lucide="${p.icon}" class="h-4 w-4"></i>
              <span class="capitalize">${p.page}</span>
            </span>
            <span class="sn-command-key">${idx < 9 ? idx + 1 : ''}</span>
          </button>
        `
      )
      .join('');

    (window as any).lucide?.createIcons();
  };

  const open = (): void => {
    wrapper.classList.add('is-open');
    render('');
    input?.focus();
  };

  const close = (): void => {
    wrapper.classList.remove('is-open');
    if (input) input.value = '';
  };

  wrapper.addEventListener('click', (e) => {
    if (e.target === wrapper) close();
  });

  input?.addEventListener('input', () => render(input.value));

  list?.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-page]');
    const page = target?.dataset.page;
    if (page) {
      getApp().showPage(page);
      close();
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (wrapper.classList.contains('is-open')) close(); else open();
    }
    if (e.key === 'Escape' && wrapper.classList.contains('is-open')) close();
  });
}

function enhanceQuickSearch(): void {
  const app = getApp();
  const input = document.getElementById('quickSearch') as HTMLInputElement | null;
  if (!input || !app) return;

  const results = document.createElement('div');
  results.id = 'quickSearchResults';
  results.className = 'sn-glass absolute left-0 right-0 top-[110%] z-[1200] hidden max-h-72 overflow-y-auto p-2';
  input.parentElement?.classList.add('relative');
  input.parentElement?.appendChild(results);

  const run = debounce((raw: string) => {
    const query = raw.trim().toLowerCase();
    if (!query) {
      results.classList.add('hidden');
      results.innerHTML = '';
      return;
    }

    const books = (app.data?.books || [])
      .filter((b: any) => (b.title || b.name || '').toLowerCase().includes(query))
      .slice(0, 5)
      .map((b: any) => ({ type: 'Book', title: b.title || b.name || 'Untitled' }));

    const notes = (app.data?.notes || [])
      .filter((n: any) => (n.title || '').toLowerCase().includes(query) || (n.content || '').toLowerCase().includes(query))
      .slice(0, 8)
      .map((n: any) => ({ type: 'Note', title: n.title || 'Untitled' }));

    const merged = [...books, ...notes].slice(0, 10);
    if (!merged.length) {
      results.classList.remove('hidden');
      results.innerHTML = '<div class="px-3 py-2 text-sm text-slate-500">No matching notes or books.</div>';
      return;
    }

    results.classList.remove('hidden');
    results.innerHTML = merged
      .map(
        (x) => `<button class="sn-command-item w-full text-left" data-target-page="${x.type === 'Book' ? 'books' : 'notes'}">
          <span>${x.title}</span>
          <span class="sn-command-key">${x.type}</span>
        </button>`
      )
      .join('');
  }, 160);

  input.addEventListener('input', () => run(input.value));

  results.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-target-page]');
    const page = btn?.dataset.targetPage;
    if (page) {
      app.showPage(page);
      results.classList.add('hidden');
      input.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!results.contains(e.target as Node) && e.target !== input) {
      results.classList.add('hidden');
    }
  });
}

function persistSidebarState(): void {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  if (!sidebar || !toggle) return;

  const key = 'shiro_sidebar_collapsed';
  if (localStorage.getItem(key) === '1') {
    sidebar.classList.add('collapsed');
  }

  toggle.addEventListener('click', () => {
    requestAnimationFrame(() => {
      localStorage.setItem(key, sidebar.classList.contains('collapsed') ? '1' : '0');
    });
  });
}

function applyEnhancements(): void {
  createCommandPalette();
  enhanceQuickSearch();
  persistSidebarState();

  window.addEventListener('error', (e) => {
    safeToast(`Runtime error: ${e.message}`, 'error');
  });

  safeToast('Shiro Notes TS enhancements loaded.', 'success');
}

function bootstrap(): void {
  const app = getApp();
  if (!app) {
    alert('Core app instance not found. app.js failed to load.');
    return;
  }

  Promise.resolve(app.init())
    .then(() => {
      (window as any).lucide?.createIcons();
      applyEnhancements();
    })
    .catch((err) => {
      console.error('Bootstrap failed', err);
      alert('Shiro Notes failed to initialize. Check console.');
    });
}

document.addEventListener('DOMContentLoaded', bootstrap);
