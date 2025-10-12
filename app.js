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

    useEffect(() => {
        const init = async () => {
            const storedHash = await db.settings.get('masterPasswordHash');
            if (storedHash) setMasterPasswordHash(storedHash.value);
            const storedTheme = await db.settings.get('theme');
            setTheme(storedTheme ? storedTheme.value : 'light');
            const allNotes = await db.notes.orderBy('updatedAt').reverse().toArray();
            setNotes(allNotes);
            if (allNotes.length > 0) setActiveNoteId(allNotes[0].id);
            setIsInitialised(true);
        };
        init();
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const showNotification = (message, type) => setNotification({ message, type });

    const handleSelectNote = (noteId) => {
        const note = notes.find(n => n.id === noteId);
        if (note && note.isLocked) {
            setIsPasswordPrompting(true);
            setPasswordAttempt({ id: noteId, isToggle: false });
        } else {
            setActiveNoteId(noteId);
            setUnlockedNoteData(null);
        }
    };
    
    const handleNewNote = async () => {
        const newNote = {
            title: 'Untitled Note',
            content: '', // HTML content
            contentPlainText: '', // Plain text for search/snippets
            tags: [],
            isPinned: false,
            isLocked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const id = await db.notes.add(newNote);
        const newNotesList = [{...newNote, id}, ...notes];
        setNotes(newNotesList);
        setActiveNoteId(id);
    };

    const handleUpdateNote = async (updatedFields) => {
        if (!activeNoteId) return;
        const noteToUpdate = notes.find(n => n.id === activeNoteId);
        if (!noteToUpdate) return;
        
        let dataToSave = { ...updatedFields };
        
        if (noteToUpdate.isLocked) {
            const password = passwordAttempt?.password;
            if (!password) {
                 showNotification("Error: Password session expired. Please re-open the note.", "error");
                return;
            }
            if (updatedFields.title) dataToSave.title = encryptData(updatedFields.title, password);
            if (updatedFields.content) dataToSave.content = encryptData(updatedFields.content, password);
            if (updatedFields.contentPlainText) dataToSave.contentPlainText = encryptData(updatedFields.contentPlainText, password);
        } else {
            if (unlockedNoteData && unlockedNoteData.id === activeNoteId) {
                setUnlockedNoteData(prev => ({ ...prev, ...updatedFields }));
            }
        }
        
        const updatedNoteData = { ...dataToSave, updatedAt: new Date() };
        await db.notes.update(activeNoteId, updatedNoteData);
        
        const newNotesList = notes.map(note => 
            note.id === activeNoteId ? { ...note, ...updatedNoteData } : note
        ).sort((a, b) => b.updatedAt - a.updatedAt);
        setNotes(newNotesList);
    };
    
    const handleDeleteNote = async () => {
        if (!activeNoteId) return;
        await db.notes.delete(activeNoteId);
        const newNotesList = notes.filter(note => note.id !== activeNoteId);
        setNotes(newNotesList);
        setActiveNoteId(newNotesList.length > 0 ? newNotesList[0].id : null);
        setIsDeleting(false);
        showNotification("Note deleted successfully.", "success");
    };

    const handleSetPassword = async (newPassword) => {
        const newHash = hashPassword(newPassword);
        await db.settings.put({ key: 'masterPasswordHash', value: newHash });
        setMasterPasswordHash(newHash);
        setIsSettingsOpen(false);
        showNotification("Master password has been set!", "success");
    };

    const handleToggleLock = () => {
        if (!activeNoteId) return;
        setIsPasswordPrompting(true);
        setPasswordAttempt({ id: activeNoteId, isToggle: true });
    };

    const handlePasswordConfirm = (password) => {
        const enteredPasswordHash = hashPassword(password);
        if (enteredPasswordHash !== masterPasswordHash) {
            showNotification("Incorrect password.", "error");
            return;
        }

        const { id, isToggle } = passwordAttempt;

        if (isToggle) {
            performToggleLock(id, password);
        } else {
            performUnlock(id, password);
        }

        setIsPasswordPrompting(false);
        setPasswordAttempt(null);
    };
    
    const performUnlock = (noteId, password) => {
        const noteToUnlock = notes.find(n => n.id === noteId);
        const title = decryptData(noteToUnlock.title, password);
        const content = decryptData(noteToUnlock.content, password);
        const contentPlainText = decryptData(noteToUnlock.contentPlainText, password);

        if (title === null || content === null) {
            showNotification("Decryption failed.", "error");
        } else {
            setUnlockedNoteData({ id: noteId, title, content, contentPlainText });
            setActiveNoteId(noteId);
            setPasswordAttempt(prev => ({ ...prev, password })); // Store password for this session
        }
    };
    
    const performToggleLock = async (noteId, password) => {
        const noteToToggle = notes.find(n => n.id === noteId);
        const isCurrentlyLocked = noteToToggle.isLocked;
        let newTitle, newContent, newContentPlainText;

        if (isCurrentlyLocked) { // UNLOCKING
            newTitle = decryptData(noteToToggle.title, password);
            newContent = decryptData(noteToToggle.content, password);
            newContentPlainText = decryptData(noteToToggle.contentPlainText, password);
            if (newTitle === null) return showNotification("Decryption failed.", "error");
            setUnlockedNoteData({ id: noteId, title: newTitle, content: newContent, contentPlainText: newContentPlainText });
            showNotification("Note unlocked.", "success");
        } else { // LOCKING
            const currentNoteData = unlockedNoteData || noteToToggle;
            newTitle = encryptData(currentNoteData.title, password);
            newContent = encryptData(currentNoteData.content, password);
            newContentPlainText = encryptData(currentNoteData.contentPlainText, password);
            setUnlockedNoteData(null);
            showNotification("Note locked.", "success");
        }
        
        const updatedDbData = { title: newTitle, content: newContent, contentPlainText: newContentPlainText, isLocked: !isCurrentlyLocked, updatedAt: new Date() };
        await db.notes.update(noteId, updatedDbData);
        
        const newNotesList = notes.map(n => n.id === noteId ? { ...n, ...updatedDbData } : n);
        setNotes(newNotesList);
    };

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        await db.settings.put({ key: 'theme', value: newTheme });
        setTheme(newTheme);
    };

    if (!isInitialised) {
        return <div className="flex items-center justify-center h-screen text-xl text-gray-500 dark:text-gray-400">Loading Shiro-Notes...</div>;
    }

    const activeNote = notes.find(note => note.id === activeNoteId);
    let editorNote = activeNote;
    if (activeNote && unlockedNoteData && unlockedNoteData.id === activeNote.id) {
        editorNote = { ...activeNote, ...unlockedNoteData };
    }

    return (
        <div className="flex h-screen font-sans text-gray-900 dark:text-gray-100">
            <aside className="w-64 bg-gray-200 dark:bg-gray-800 p-4 flex flex-col flex-shrink-0">
                <div className="flex items-center mb-6">
                    <svg className="w-8 h-8 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
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
            <main className="w-1/3 p-6 border-l border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">All Notes ({notes.length})</h2>
                    <button onClick={handleNewNote} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow transition-colors">New Note</button>
                </div>
                <div>
                    {notes.length > 0 ? (
                        notes.map(note => (
                            <NoteCard key={note.id} note={note} isActive={note.id === activeNoteId} onClick={() => handleSelectNote(note.id)} />
                        ))
                    ) : ( <div className="text-center text-gray-500 pt-10">No notes yet.</div> )}
                </div>
            </main>
            <section className="flex-1 bg-white dark:bg-gray-800 p-6 flex flex-col overflow-y-auto">
                <Editor activeNote={editorNote} onUpdate={handleUpdateNote} onDelete={() => setIsDeleting(true)} onToggleLock={handleToggleLock} hasPassword={!!masterPasswordHash} />
            </section>
            
            {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} onSetPassword={handleSetPassword} hasPassword={!!masterPasswordHash} showNotification={showNotification} />}
            {isDeleting && <ConfirmDeleteModal onConfirm={handleDeleteNote} onCancel={() => setIsDeleting(false)} />}
            {isPasswordPrompting && <PasswordPromptModal onConfirm={handlePasswordConfirm} onCancel={() => {setIsPasswordPrompting(false); setPasswordAttempt(null);}} showNotification={showNotification} />}
            {notification && <Notification message={notification.message} type={notification.type} onClear={() => setNotification(null)} />}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
