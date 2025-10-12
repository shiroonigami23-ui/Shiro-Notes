const { useState, useEffect } = React;

function App() {
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [isInitialised, setIsInitialised] = useState(false);
    const [masterPasswordHash, setMasterPasswordHash] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [theme, setTheme] = useState('light');
    const [notification, setNotification] = useState(null);
    const [isPasswordPrompting, setIsPasswordPrompting] = useState(false);
    const [unlockedNoteData, setUnlockedNoteData] = useState(null);
    const [passwordAttempt, setPasswordAttempt] = useState(null);
    const [mobileView, setMobileView] = useState('list');

    useEffect(() => {
        const init = async () => {
            try {
                const storedHash = await db.settings.get('masterPasswordHash');
                if (storedHash) setMasterPasswordHash(storedHash.value);
                
                const storedTheme = await db.settings.get('theme');
                const currentTheme = storedTheme ? storedTheme.value : 'light';
                setTheme(currentTheme);
                document.documentElement.classList.toggle('dark', currentTheme === 'dark');

                const allNotes = await db.notes.orderBy('updatedAt').reverse().toArray();
                setNotes(allNotes);

                if (allNotes.length > 0 && window.innerWidth >= 768) {
                    setActiveNoteId(allNotes[0].id);
                }
            } catch (error) {
                console.error("Initialization failed:", error);
                showNotification("Failed to load notes.", "error");
            } finally {
                setIsInitialised(true);
            }
        };
        init();
    }, []);

    const showNotification = (message, type) => setNotification({ message, type });

    const handleSelectNote = (noteId) => {
        const note = notes.find(n => n.id === noteId);
        if (note.isLocked) {
            setIsPasswordPrompting(true);
            setPasswordAttempt({ id: noteId, isToggle: false });
        } else {
            setActiveNoteId(noteId);
            setUnlockedNoteData(null);
            setMobileView('editor');
        }
    };
    
    const handleNewNote = async () => {
        const newNote = { title: 'Untitled Note', content: '', tags: [], isPinned: false, isLocked: false, createdAt: new Date(), updatedAt: new Date() };
        const id = await db.notes.add(newNote);
        const newNotesList = [{...newNote, id}, ...notes];
        setNotes(newNotesList);
        setActiveNoteId(id);
        setUnlockedNoteData(null);
        setMobileView('editor');
    };

    const handleUpdateNote = async (updatedFields) => {
        if (!activeNoteId) return;
        const noteToUpdate = notes.find(n => n.id === activeNoteId);
        let dataToSave = { ...updatedFields };

        if (noteToUpdate.isLocked) {
            const password = passwordAttempt?.password;
            if (!password) { return showNotification("Password session expired.", "error"); }
            if (updatedFields.title) dataToSave.title = encryptData(updatedFields.title, password);
            if (updatedFields.content) dataToSave.content = encryptData(updatedFields.content, password);
        } else if (unlockedNoteData?.id === activeNoteId) {
            setUnlockedNoteData(prev => ({ ...prev, ...updatedFields }));
        }

        const updatedNoteData = { ...dataToSave, updatedAt: new Date() };
        await db.notes.update(activeNoteId, updatedNoteData);
        
        const sortedNotes = notes.map(n => n.id === activeNoteId ? { ...n, ...updatedNoteData } : n)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setNotes(sortedNotes);
    };
    
    const handleDeleteNote = async () => {
        if (!activeNoteId) return;
        const remainingNotes = notes.filter(note => note.id !== activeNoteId);
        await db.notes.delete(activeNoteId);
        setNotes(remainingNotes);
        setActiveNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
        setIsDeleting(false);
        setMobileView('list');
        showNotification("Note deleted.", "success");
    };

    const handleSetPassword = async (newPassword) => {
        const newHash = hashPassword(newPassword);
        await db.settings.put({ key: 'masterPasswordHash', value: newHash });
        setMasterPasswordHash(newHash);
        setIsSettingsOpen(false);
        showNotification("Master password set!", "success");
    };

    const handleToggleLock = () => { if (activeNoteId) { setIsPasswordPrompting(true); setPasswordAttempt({ id: activeNoteId, isToggle: true }); } };

    const handlePasswordConfirm = (password) => {
        if (hashPassword(password) !== masterPasswordHash?.value) return showNotification("Incorrect password.", "error");
        
        const { id, isToggle } = passwordAttempt;
        if (isToggle) {
            performToggleLock(id, password);
        } else {
            performUnlock(id, password);
        }
        setIsPasswordPrompting(false);
    };
    
    const performUnlock = (noteId, password) => {
        const note = notes.find(n => n.id === noteId);
        const title = decryptData(note.title, password);
        if (title === null) return showNotification("Decryption failed. Wrong password?", "error");
        const content = decryptData(note.content, password);
        setUnlockedNoteData({ id: noteId, title, content });
        setActiveNoteId(noteId);
        setPasswordAttempt(prev => ({ ...prev, password }));
        setMobileView('editor');
    };
    
    const performToggleLock = async (noteId, password) => {
        const note = notes.find(n => n.id === noteId);
        let newTitle, newContent;

        if (note.isLocked) {
            const current = unlockedNoteData || note;
            newTitle = decryptData(current.title, password);
            if (newTitle === null) return showNotification("Decryption failed.", "error");
            newContent = decryptData(current.content, password);
            setUnlockedNoteData({ id: noteId, title: newTitle, content: newContent });
            showNotification("Note unlocked.", "success");
        } else {
            const current = unlockedNoteData || note;
            newTitle = encryptData(current.title, password);
            newContent = encryptData(current.content || '', password);
            setUnlockedNoteData(null);
            showNotification("Note locked.", "success");
        }
        
        const updatedDbData = { title: newTitle, content: newContent, isLocked: !note.isLocked, updatedAt: new Date() };
        await db.notes.update(noteId, updatedDbData);
        setNotes(notes.map(n => n.id === noteId ? { ...n, ...updatedDbData } : n));
    };

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        await db.settings.put({ key: 'theme', value: newTheme });
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    if (!isInitialised) return <div className="flex items-center justify-center h-screen text-gray-500 bg-gray-100 dark:bg-gray-900">Loading Shiro-Notes...</div>;

    const activeNote = notes.find(note => note.id === activeNoteId);
    let editorNote = activeNote;
    if (activeNote && unlockedNoteData?.id === activeNote.id) {
        editorNote = { ...activeNote, ...unlockedNoteData };
    }
    
    const listPanelClasses = mobileView === 'list' ? 'translate-x-0' : '-translate-x-full';
    const editorPanelClasses = mobileView === 'editor' ? 'translate-x-0' : 'translate-x-full';

    return (
        <div className="flex h-screen font-sans text-gray-900 dark:text-gray-100 overflow-hidden">
            {/* Desktop: Sidebar */}
            <aside className="hidden md:flex w-64 bg-gray-200 dark:bg-gray-800 p-4 flex-col flex-shrink-0">
                 <div className="flex items-center mb-6"><svg className="w-8 h-8 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg><h1 className="text-2xl font-bold">Shiro-Notes</h1></div>
                <div className="mt-auto"><button onClick={() => setIsSettingsOpen(true)} className="w-full text-left p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700">Settings</button><button onClick={toggleTheme} className="w-full text-left p-2 mt-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700">{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</button></div>
            </aside>
            
            {/* Desktop: Note List */}
            <main className="hidden md:flex flex-col w-96 p-4 border-l border-r border-gray-300 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4 flex-shrink-0"><h2 className="text-2xl font-semibold">All Notes ({notes.length})</h2><button onClick={handleNewNote} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow">New Note</button></div>
                <div className="overflow-y-auto">{notes.map(note => <NoteCard key={note.id} note={note} isActive={note.id === activeNoteId} onClick={() => handleSelectNote(note.id)} />)}</div>
            </main>

            {/* Desktop: Editor */}
            <section className="hidden md:flex flex-1 p-6 flex-col bg-white dark:bg-gray-800"><Editor activeNote={editorNote} onUpdate={handleUpdateNote} onDelete={() => setIsDeleting(true)} onToggleLock={handleToggleLock} hasPassword={!!masterPasswordHash} onBack={() => {}} /></section>
            
            {/* Mobile View Container */}
            <div className="md:hidden flex flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-900">
                {/* Mobile: Note List Panel */}
                <div className={`mobile-panel absolute inset-0 w-full p-4 flex flex-col ${listPanelClasses}`}>
                    <div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold">Shiro-Notes</h1><button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">{theme === 'light' ? '🌙' : '☀️'}</button></div>
                    <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">All Notes ({notes.length})</h2><button onClick={handleNewNote} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg shadow text-sm">New</button></div>
                    <div className="flex-1 overflow-y-auto -mr-4 pr-4">{notes.map(note => <NoteCard key={note.id} note={note} isActive={false} onClick={() => handleSelectNote(note.id)} />)}</div>
                    <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center justify-center p-2 mt-2 text-base rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">Settings</button>
                </div>
                {/* Mobile: Editor Panel */}
                <div className={`mobile-panel absolute inset-0 w-full p-4 flex flex-col bg-white dark:bg-gray-800 ${editorPanelClasses}`}>
                   <Editor activeNote={editorNote} onUpdate={handleUpdateNote} onDelete={() => setIsDeleting(true)} onToggleLock={handleToggleLock} hasPassword={!!masterPasswordHash} onBack={() => setMobileView('list')} />
                </div>
            </div>

            {/* Modals */}
            {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} onSetPassword={handleSetPassword} hasPassword={!!masterPasswordHash} showNotification={showNotification} />}
            {isDeleting && <ConfirmDeleteModal onConfirm={handleDeleteNote} onCancel={() => setIsDeleting(false)} />}
            {isPasswordPrompting && <PasswordPromptModal onConfirm={handlePasswordConfirm} onCancel={() => {setIsPasswordPrompting(false); setPasswordAttempt(null);}} showNotification={showNotification} />}
            {notification && <Notification message={notification.message} type={notification.type} onClear={() => setNotification(null)} />}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
