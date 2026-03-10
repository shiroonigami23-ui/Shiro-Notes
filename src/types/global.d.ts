export interface ShiroNotesApp {
  currentPage: string;
  data: {
    books: Array<{ id: string; title?: string; name?: string; tags?: string[] }>;
    notes: Array<{ id: string; title?: string; content?: string; tags?: string[] }>;
    settings: {
      theme: 'light' | 'dark' | 'auto' | string;
    };
  };
  showPage: (page: string) => void;
  showToast?: (msg: string, type?: string) => void;
  init: () => Promise<void>;
}

declare global {
  interface Window {
    app: ShiroNotesApp;
    lucide?: { createIcons: () => void };
  }
}

export {};
