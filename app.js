const { useState, useEffect } = React;

function App() {
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [isInitialised, setIsInitialised] = useState(false);
    const [masterPasswordHash, setMasterPasswordHash] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);
    const [theme, setTheme] = useState('light');
    const [notification, setNotification] = useState(null);
    const [isPasswordPrompting, setIsPasswordPrompting] = useState(false);
    const [unlockedNoteData, setUnlockedNoteData] = useState(null);
    const [passwordAttempt, setPasswordAttempt] = useState(null);
    const [mobileView, setMobileView] = useState('list');
    const [activeTag, setActiveTag] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        const init = async () => {
            try {
                const storedHash = await db.settings.get('masterPasswordHash');
                if (storedHash) setMasterPasswordHash(storedHash.value);

                const storedTheme = await db.settings.get('theme');
                const currentTheme = storedTheme ? storedTheme.value : 'light';
                setTheme(currentTheme);
                document.documentElement.classList.toggle('dark', currentTheme === 'dark');

                const allNotes = await db.notes.toArray();
                setNotes(sortNotes(allNotes));

                if (allNotes.length > 0 && window.innerWidth >= 768) {
                    const firstNoteId = (sortNotes(allNotes)[0])?.id;
                    if (firstNoteId) setActiveNoteId(firstNoteId);
                }
            } catch (error) {
                console.error("Initialization failed:", error);
            } finally {
                setIsInitialised(true);
            }
        };
        init();
    }, []);

    const sortNotes = (notesToSort) => [...notesToSort].sort((a, b) => (a.isPinned !== b.isPinned) ? (a.isPinned ? -1 : 1) : (new Date(b.updatedAt) - new Date(a.updatedAt)));
    const showNotification = (message, type) => setNotification({ message, type });

    const handleNoteClick = (noteId) => {
        if (selectionMode) {
            const newSelectedIds = selectedIds.includes(noteId)
                ? selectedIds.filter(id => id !== noteId)
                : [...selectedIds, noteId];
            setSelectedIds(newSelectedIds);
            if (newSelectedIds.length === 0) setSelectionMode(false);
        } else {
            openNote(noteId);
        }
    };

    const handleNoteLongPress = (noteId) => {
        setSelectionMode(true);
        setSelectedIds([noteId]);
    };

    const openNote = (noteId) => {
        const note = notes.find(n => n.id === noteId);
        if (note.isLocked) {
            if (passwordAttempt?.id === noteId && passwordAttempt.password) performUnlock(noteId, passwordAttempt.password);
            else { setIsPasswordPrompting(true); setPasswordAttempt({ id: noteId, isToggle: false }); }
        } else {
            setActiveNoteId(noteId);
            setUnlockedNoteData(null);
            setMobileView('editor');
        }
    };
    
    const handleNewNote = async () => { 
        const newNote = { title: 'Untitled Note', content: '', contentPlainText: '', tags: activeTag ? [activeTag] : [], isPinned: false, isLocked: false, createdAt: new Date(), updatedAt: new Date() }; 
        const id = await db.notes.add(newNote); 
        const newNotesList = [{...newNote, id}, ...notes]; 
        setNotes(sortNotes(newNotesList)); 
        setActiveNoteId(id); 
        setUnlockedNoteData(null); 
        setSelectionMode(false);
        setSelectedIds([]);
        setMobileView('editor'); 
    };
    
    const handleUpdateNote = async (updatedFields) => { 
        if (!activeNoteId) return; 
        const noteToUpdate = notes.find(n => n.id === activeNoteId); 
        let dataToSave = { ...updatedFields }; 
        if (noteToUpdate.isLocked) { 
            const password = passwordAttempt?.password; 
            if (!password) return showNotification("Password session expired.", "error"); 
            if (updatedFields.title) dataToSave.title = encryptData(updatedFields.title, password); 
            if (updatedFields.content) { 
                dataToSave.content = encryptData(updatedFields.content, password); 
                dataToSave.contentPlainText = encryptData(updatedFields.contentPlainText, password); 
            } 
        } else if (unlockedNoteData?.id === activeNoteId) { 
            setUnlockedNoteData(prev => ({ ...prev, ...updatedFields })); 
        } 
        const updatedNoteData = { ...dataToSave, updatedAt: new Date() }; 
        await db.notes.update(activeNoteId, updatedNoteData); 
        setNotes(sortNotes(notes.map(n => n.id === activeNoteId ? { ...n, ...updatedNoteData } : n))); 
    };
    
    const handleTogglePin = async () => { 
        if (!activeNoteId) return; 
        const note = notes.find(n => n.id === activeNoteId); 
        const updatedNoteData = { isPinned: !note.isPinned, updatedAt: new Date() }; 
        await db.notes.update(activeNoteId, updatedNoteData); 
        setNotes(sortNotes(notes.map(n => n.id === activeNoteId ? { ...n, ...updatedNoteData } : n))); 
        showNotification(updatedNoteData.isPinned ? "Note pinned." : "Note unpinned.", "success"); 
    };
    
    const handleDeleteNote = async (noteId) => {
        setNoteToDelete(null);
        await db.notes.delete(noteId);
        const remainingNotes = notes.filter(note => note.id !== noteId);
        setNotes(sortNotes(remainingNotes));
        if (activeNoteId === noteId) {
            const nextNote = (activeTag ? remainingNotes.filter(n => n.tags?.includes(activeTag)) : remainingNotes)[0];
            setActiveNoteId(nextNote?.id || null);
        }
        setMobileView('list');
        showNotification("Note deleted.", "success");
    };

    const handleDeleteSelected = async () => {
        setNoteToDelete(null);
        await db.notes.bulkDelete(selectedIds);
        const remainingNotes = notes.filter(note => !selectedIds.includes(note.id));
        setNotes(sortNotes(remainingNotes));
        showNotification(`${selectedIds.length} note(s) deleted.`, "success");
        setSelectionMode(false);
        
        if (selectedIds.includes(activeNoteId)) {
            const nextNote = (activeTag ? remainingNotes.filter(n => n.tags?.includes(activeTag)) : remainingNotes)[0];
            setActiveNoteId(nextNote?.id || null);
        }
        setSelectedIds([]);
    };
    
    const handleSetPassword = async (newPassword, currentPassword) => { 
        if (masterPasswordHash) { 
            if (!currentPassword || hashPassword(currentPassword) !== masterPasswordHash) return showNotification("Incorrect current password.", "error"); 
        } 
        const newHash = hashPassword(newPassword); 
        await db.settings.put({ key: 'masterPasswordHash', value: newHash }); 
        setMasterPasswordHash(newHash); 
        setIsSettingsOpen(false); 
        showNotification("Password changed successfully!", "success"); 
    };
    
    const handleToggleLock = () => { 
        if (!activeNoteId) return; 
        const note = notes.find(n => n.id === activeNoteId); 
        if (note.isLocked && passwordAttempt?.id === activeNoteId && passwordAttempt.password) { 
            performToggleLock(activeNoteId, passwordAttempt.password); 
        } else { 
            setIsPasswordPrompting(true); 
            setPasswordAttempt({ id: activeNoteId, isToggle: true }); 
        } 
    };
    
    const handlePasswordConfirm = (password) => { 
        if (hashPassword(password) !== masterPasswordHash) return showNotification("Incorrect password.", "error"); 
        const { id, isToggle } = passwordAttempt; 
        if (isToggle) performToggleLock(id, password); else performUnlock(id, password); 
        setIsPasswordPrompting(false); 
    };
    
    const performUnlock = (noteId, password) => { 
        const note = notes.find(n => n.id === noteId); 
        const title = decryptData(note.title, password); 
        if (title === null) return showNotification("Decryption failed.", "error"); 
        const content = decryptData(note.content, password); 
        const contentPlainText = decryptData(note.contentPlainText, password); 
        setUnlockedNoteData({ id: noteId, title, content, contentPlainText, tags: note.tags }); 
        setActiveNoteId(noteId); 
        setPasswordAttempt({ id: noteId, password, isToggle: false }); 
        setMobileView('editor'); 
    };
    
    const performToggleLock = async (noteId, password) => { 
        const note = notes.find(n => n.id === noteId); 
        let newTitle, newContent, newContentPlainText, newIsLocked; 
        if (note.isLocked) { 
            const currentUnlocked = unlockedNoteData; 
            newTitle = currentUnlocked.title; 
            newContent = currentUnlocked.content; 
            newContentPlainText = currentUnlocked.contentPlainText;
            newIsLocked = false; 
            setUnlockedNoteData({ id: noteId, title: newTitle, content: newContent, contentPlainText, tags: note.tags }); 
            showNotification("Note unlocked.", "success"); 
        } else { 
            const current = unlockedNoteData || note; 
            newTitle = encryptData(current.title, password); 
            newContent = encryptData(current.content || '', password); 
            newContentPlainText = encryptData(current.contentPlainText || '', password); 
            newIsLocked = true; 
            setUnlockedNoteData(null); 
            setPasswordAttempt(null); 
            showNotification("Note locked.", "success"); 
        } 
        const updatedDbData = { title: newTitle, content: newContent, contentPlainText, isLocked: newIsLocked, updatedAt: new Date() }; 
        await db.notes.update(noteId, updatedDbData); 
        setNotes(sortNotes(notes.map(n => n.id === noteId ? { ...n, ...updatedDbData } : n))); 
    };
    
    const toggleTheme = async () => { 
        const newTheme = theme === 'light' ? 'dark' : 'light'; 
        await db.settings.put({ key: 'theme', value: newTheme }); 
        setTheme(newTheme); 
        document.documentElement.classList.toggle('dark', newTheme === 'dark'); 
        setIsMenuOpen(false); 
    };
    
    const filteredNotes = activeTag ? notes.filter(note => note.tags?.includes(activeTag)) : notes;
    
    if (!isInitialised) return <div className="flex items-center justify-center h-screen text-gray-500 bg-gray-100 dark:bg-gray-900">Loading Shiro-Notes...</div>;
    
    const activeNote = notes.find(note => note.id === activeNoteId);
    let editorNote = activeNote;
    if (activeNote && unlockedNoteData?.id === activeNote.id) editorNote = { ...activeNote, ...unlockedNoteData };
    
    return (
        <div className="h-screen flex flex-col md:flex-row font-sans text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900">
            <aside className="hidden md:flex w-64 bg-gray-200 dark:bg-gray-800 p-4 flex-col flex-shrink-0">
                <h1 className="text-2xl font-bold mb-6">Shiro-Notes</h1>
                <div className="mt-auto">
                    <button onClick={() => setIsSettingsOpen(true)} className="w-full text-left p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700">Settings</button>
                    <button onClick={toggleTheme} className="w-full text-left p-2 mt-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700">{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</button>
                </div>
            </aside>
            <main className={`hidden md:flex flex-col w-96 p-4 border-l border-r dark:border-gray-700 relative ${selectionMode ? 'selection-mode-active' : ''}`}>
                {selectionMode && <SelectionActionBar count={selectedIds.length} onCancel={() => { setSelectionMode(false); setSelectedIds([]); }} onDelete={() => setNoteToDelete('bulk')} />}
                <div className="flex-shrink-0 note-list-container">
                    <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-semibold">{activeTag ? `#${activeTag}` : `All Notes`} ({filteredNotes.length})</h2><button onClick={handleNewNote} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow">New</button></div>
                    {activeTag && <button onClick={() => setActiveTag(null)} className="text-sm text-blue-500 hover:underline mb-2">Clear filter</button>}
                </div>
                <div className="flex-1 overflow-y-auto">{filteredNotes.map(note => <NoteCard key={note.id} note={note} isActive={!selectionMode && note.id === activeNoteId} isSelected={selectionMode ? selectedIds.includes(note.id) : undefined} onClick={() => handleNoteClick(note.id)} onLongPress={() => handleNoteLongPress(note.id)} onTagClick={setActiveTag} />)}</div>
            </main>
            <section className={`flex-1 flex-col bg-white dark:bg-gray-800 md:flex ${mobileView === 'editor' ? 'flex' : 'hidden'}`}>
                <Editor activeNote={editorNote} onUpdate={handleUpdateNote} onDelete={() => setNoteToDelete(activeNoteId)} onToggleLock={handleToggleLock} onTogglePin={handleTogglePin} hasPassword={!!masterPasswordHash} onBack={() => setMobileView('list')} />
            </section>

            {/* Mobile View */}
            <div className={`md:hidden w-full h-full flex flex-col p-4 bg-gray-100 dark:bg-gray-900 relative ${mobileView === 'list' ? 'flex' : 'hidden'} ${selectionMode ? 'selection-mode-active' : ''}`}>
                {selectionMode && <SelectionActionBar count={selectedIds.length} onCancel={() => { setSelectionMode(false); setSelectedIds([]); }} onDelete={() => setNoteToDelete('bulk')} />}
                <div className="flex-shrink-0 note-list-container">
                    <div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold">Shiro-Notes</h1><button onClick={() => !selectionMode && setIsMenuOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg></button></div>
                    {isMenuOpen && <DropdownMenu onClose={() => setIsMenuOpen(false)} onSettingsClick={() => {setIsSettingsOpen(true); setIsMenuOpen(false);}} onThemeClick={toggleTheme} theme={theme} />}
                    <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">{activeTag ? `#${activeTag}` : `All Notes`} ({filteredNotes.length})</h2><button onClick={handleNewNote} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg shadow text-sm">New</button></div>
                     {activeTag && <button onClick={() => setActiveTag(null)} className="text-sm text-blue-500 hover:underline mb-2 self-start">Clear filter</button>}
                </div>
                <div className="flex-1 overflow-y-auto -mr-4 pr-4">{filteredNotes.map(note => <NoteCard key={note.id} note={note} isActive={false} isSelected={selectionMode ? selectedIds.includes(note.id) : undefined} onClick={() => handleNoteClick(note.id)} onLongPress={() => handleNoteLongPress(note.id)} onTagClick={setActiveTag}/>)}</div>
            </div>
             <div className={`md:hidden w-full h-full ${mobileView === 'editor' ? 'flex' : 'hidden'}`}>
                 <Editor activeNote={editorNote} onUpdate={handleUpdateNote} onDelete={() => setNoteToDelete(activeNoteId)} onToggleLock={handleToggleLock} onTogglePin={handleTogglePin} hasPassword={!!masterPasswordHash} onBack={() => setMobileView('list')} />
            </div>

            {/* Modals and Notifications */}
            {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} onSetPassword={handleSetPassword} hasPassword={!!masterPasswordHash} showNotification={showNotification} />}
            {noteToDelete && <ConfirmDeleteModal 
                onConfirm={() => noteToDelete === 'bulk' ? handleDeleteSelected() : handleDeleteNote(noteToDelete)} 
                onCancel={() => setNoteToDelete(null)} 
            />}
            {isPasswordPrompting && <PasswordPromptModal onConfirm={handlePasswordConfirm} onCancel={() => {setIsPasswordPrompting(false); setPasswordAttempt(null);}} showNotification={showNotification} />}
            {notification && <Notification message={notification.message} type={notification.type} onClear={() => setNotification(null)} />}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
