const { useState, useEffect, useCallback, useRef } = React;

// =================================================================
// DATABASE SETUP (Dexie.js)
// =================================================================
const db = new Dexie('myEnhancedNotesDB');
db.version(1).stores({
    notes: '++id, title, content, contentPlainText, tags, isPinned, isLocked, createdAt, updatedAt',
    settings: 'key, value' // Simple key-value store for theme and password hash
});

// =================================================================
// CRYPTOGRAPHY UTILITIES
// =================================================================
const SALT = "shiro-notes-unique-salt-value";
const KEY_SIZE = 256 / 32;
const ITERATIONS = 1000;

function hashPassword(password) {
    const key = CryptoJS.PBDF2(password, SALT, {
        keySize: KEY_SIZE,
        iterations: ITERATIONS
    });
    return key.toString();
}

// =================================================================
// UI COMPONENTS
// =================================================================

function Notification({ message, type, onClear }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClear();
        }, 4000); // Notification automatically dismisses after 4 seconds
        return () => clearTimeout(timer);
    }, [onClear]);

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className={`notification-animation fixed bottom-5 right-5 ${bgColor} text-white py-3 px-5 rounded-lg shadow-xl z-50`}>
            {message}
        </div>
    );
}

function SettingsModal({ onClose, onSetPassword, hasPassword, showNotification }) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const passwordInputRef = useRef(null);

    useEffect(() => {
        passwordInputRef.current?.focus();
    }, []);
    
    const handleSubmit = () => {
        if (password.length < 4) {
            showNotification("Password must be at least 4 characters long.", "error");
            return;
        }
        if (password !== confirm) {
            showNotification("Passwords do not match.", "error");
            return;
        }
        onSetPassword(password);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md mx-4">
                <h2 className="text-2xl font-bold mb-4">{hasPassword ? "Change" : "Set"} Master Password</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    This password encrypts your locked notes. <strong className="text-red-500">If you forget it, your locked notes cannot be recovered.</strong>
                </p>
                <div className="space-y-4">
                    <input
                        ref={passwordInputRef}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Confirm new password"
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Save Password</button>
                </div>
            </div>
        </div>
    );
}

// =================================================================
// MAIN APP COMPONENT
// =================================================================

function App() {
    const [isInitialised, setIsInitialised] = useState(false);
    const [masterPasswordHash, setMasterPasswordHash] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, setTheme] = useState('light');
    const [notification, setNotification] = useState(null);

    const showNotification = (message, type) => {
        setNotification({ message, type });
    };

    useEffect(() => {
        const init = async () => {
            const storedHash = await db.settings.get('masterPasswordHash');
            if (storedHash) setMasterPasswordHash(storedHash.value);
            
            const storedTheme = await db.settings.get('theme');
            setTheme(storedTheme ? storedTheme.value : 'light');
            
            setIsInitialised(true);
        };
        init();
    }, []);
    
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const handleSetPassword = async (newPassword) => {
        const newHash = hashPassword(newPassword);
        await db.settings.put({ key: 'masterPasswordHash', value: newHash });
        setMasterPasswordHash(newHash);
        setIsSettingsOpen(false);
        showNotification("Master password has been set!", "success");
    };

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        await db.settings.put({ key: 'theme', value: newTheme });
        setTheme(newTheme);
    };

    if (!isInitialised) {
        return <div className="flex items-center justify-center h-screen text-xl text-gray-500 dark:text-gray-400">Loading Shiro-Notes...</div>;
    }

    return (
        <div className="flex h-screen font-sans text-gray-900 dark:text-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-200 dark:bg-gray-800 p-4 flex flex-col flex-shrink-0">
                <div className="flex items-center mb-6">
                    <svg className="w-8 h-8 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    <h1 className="text-2xl font-bold">Shiro-Notes</h1>
                </div>
                <nav className="flex-1 space-y-2">
                     <a href="#" className="flex items-center p-2 text-base font-normal rounded-lg dark:text-white bg-gray-300 dark:bg-gray-700">All Notes</a>
                </nav>
                <div className="mt-auto">
                   <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center p-2 text-base font-normal rounded-lg dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Settings
                    </button>
                     <button onClick={toggleTheme} className="w-full flex items-center p-2 mt-2 text-base font-normal rounded-lg dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                        {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                    </button>
                </div>
            </aside>

            {/* Note List */}
            <main className="w-1/3 p-6 border-l border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">All Notes</h2>
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow transition-colors">New Note</button>
                </div>
                <div className="text-center text-gray-500 pt-10">No notes yet. Click "New Note" to get started!</div>
            </main>
            
            {/* Editor */}
            <section className="flex-1 bg-white dark:bg-gray-800 p-6 overflow-y-auto">
                 <div className="text-center text-gray-400 dark:text-gray-500 h-full flex items-center justify-center">
                    <p>Select a note to view or edit</p>
                 </div>
            </section>

            {isSettingsOpen && <SettingsModal 
                onClose={() => setIsSettingsOpen(false)} 
                onSetPassword={handleSetPassword}
                hasPassword={!!masterPasswordHash}
                showNotification={showNotification}
            />}

            {notification && <Notification 
                message={notification.message} 
                type={notification.type}
                onClear={() => setNotification(null)}
            />}
        </div>
    );
}

// =================================================================
// RENDER THE APP
// =================================================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
