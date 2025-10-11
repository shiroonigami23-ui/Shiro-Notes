const { useState, useEffect } = React;

// =================================================================
// MAIN APP COMPONENT
// =================================================================

function App() {
    // ... other state variables are unchanged ...
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [isInitialised, setIsInitialised] = useState(false);
    const [masterPasswordHash, setMasterPasswordHash] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [theme, setTheme] = useState('light');
    const [notification, setNotification] = useState(null);
    
    // [NEW] State for handling password prompts and temporarily storing decrypted data
    const [isPasswordPrompting, setIsPasswordPrompting] = useState(false);
    const [unlockedNoteData, setUnlockedNoteData] = useState(null); // { id, title, contentPlainText }
    const [passwordAttempt, setPasswordAttempt] = useState(null); // { id, password }


    useEffect(() => { /* ... init function is unchanged ... */ }, []);
    useEffect(() => { /* ... theme effect is unchanged ... */ }, [theme]);

    const showNotification = (message, type) => setNotification({ message, type });

    // When a user selects a note, check if it's locked
    const handleSelectNote = (noteId) => {
        const note = notes.find(n => n.id === noteId);
        if (note && note.isLocked) {
            // If it's locked, prompt for password instead of making it active
            setIsPasswordPrompting(true);
            setPasswordAttempt({ id: noteId });
        } else {
            // If not locked, make it active and clear any unlocked data
            setActiveNoteId(noteId);
            setUnlockedNoteData(null);
        }
    };
    
    // Decrypt the note if the password is correct
    const handlePasswordConfirm = (password) => {
        const enteredPasswordHash = hashPassword(password);
        if (enteredPasswordHash !== masterPasswordHash) {
            showNotification("Incorrect password.", "error");
            return;
        }

        const noteToUnlock = notes.find(n => n.id === passwordAttempt.id);
        if (noteToUnlock) {
            const title = decryptData(noteToUnlock.title, password);
            const contentPlainText = decryptData(noteToUnlock.contentPlainText, password);

            if (title === null || contentPlainText === null) {
                showNotification("Decryption failed. The data might be corrupt or password is wrong.", "error");
            } else {
                 // Store the decrypted data temporarily in state
                setUnlockedNoteData({ id: noteToUnlock.id, title, contentPlainText });
                setActiveNoteId(noteToUnlock.id); // Now make it the active note
            }
        }
        
        setIsPasswordPrompting(false);
        setPasswordAttempt(null);
    };

    // --- Note CRUD Handlers (Updated for Encryption) ---

    const handleNewNote = async () => { /* ... unchanged ... */ };
    
    // handleUpdateNote now encrypts data if the note is locked
    const handleUpdateNote = async (updatedFields) => {
        if (!activeNoteId) return;

        const noteToUpdate = notes.find(n => n.id === activeNoteId);
        if (!noteToUpdate) return;
        
        let dataToSave = { ...updatedFields };

        // If the note is locked, encrypt the data before saving
        if (noteToUpdate.isLocked) {
            const password = passwordAttempt?.password || prompt("This should not happen: password not found for locked note update. Please provide it again.");
            if (updatedFields.title) {
                dataToSave.title = encryptData(updatedFields.title, password);
            }
            if (updatedFields.contentPlainText) {
                const plainText = updatedFields.contentPlainText;
                dataToSave.content = encryptData(plainText, password); // For now, content is same as plaintext
                dataToSave.contentPlainText = encryptData(plainText, password);
            }
        } else {
            // Update temporary decrypted data if it exists
            if(unlockedNoteData && unlockedNoteData.id === activeNoteId){
                setUnlockedNoteData(prev => ({...prev, ...updatedFields}));
            }
        }
        
        const updatedNoteData = { ...dataToSave, updatedAt: new Date() };
        await db.notes.update(activeNoteId, updatedNoteData);
        
        const newNotesList = notes.map(note => 
            note.id === activeNoteId ? { ...note, ...updatedNoteData } : note
        ).sort((a, b) => b.updatedAt - a.updatedAt);
        setNotes(newNotesList);
    };

    const handleDeleteNote = async () => { /* ... unchanged ... */ };
    
    // [NEW] Handles toggling the lock state of the active note
    const handleToggleLock = () => {
        if (!activeNoteId) return;

        setIsPasswordPrompting(true);
        setPasswordAttempt({ id: activeNoteId, isToggle: true }); // 'isToggle' marks it as a lock/unlock action
    };

    const performToggleLock = async (password) => {
        const noteToToggle = notes.find(n => n.id === activeNoteId);
        if (!noteToToggle) return;

        const isCurrentlyLocked = noteToToggle.isLocked;
        let newTitle, newContent, newContentPlainText;

        if (isCurrentlyLocked) { // UNLOCKING
            newTitle = decryptData(noteToToggle.title, password);
            newContentPlainText = decryptData(noteToToggle.contentPlainText, password);
            if (newTitle === null || newContentPlainText === null) {
                showNotification("Decryption failed. Incorrect password.", "error");
                return;
            }
            newContent = newContentPlainText; // Simple content for now
            setUnlockedNoteData({id: activeNoteId, title: newTitle, contentPlainText: newContentPlainText});
            showNotification("Note unlocked.", "success");
        } else { // LOCKING
            const currentNoteData = unlockedNoteData || noteToToggle;
            newTitle = encryptData(currentNoteData.title, password);
            newContentPlainText = encryptData(currentNoteData.contentPlainText, password);
            newContent = newContentPlainText;
            setUnlockedNoteData(null); // Clear unlocked data after locking
            showNotification("Note locked.", "success");
        }
        
        const updatedNoteData = { 
            title: newTitle, 
            content: newContent, 
            contentPlainText: newContentPlainText, 
            isLocked: !isCurrentlyLocked,
            updatedAt: new Date()
        };

        await db.notes.update(activeNoteId, updatedNoteData);
        const newNotesList = notes.map(n => n.id === activeNoteId ? { ...n, ...updatedNoteData } : n);
        setNotes(newNotesList);
    };

    // Extend password confirmation to handle locking/unlocking
    const handlePasswordConfirmV2 = (password) => {
        const enteredPasswordHash = hashPassword(password);
        if (enteredPasswordHash !== masterPasswordHash) {
            showNotification("Incorrect password.", "error");
            setIsPasswordPrompting(false);
            setPasswordAttempt(null);
            return;
        }

        if (passwordAttempt.isToggle) {
            performToggleLock(password);
        } else {
            // Original decryption logic
            const noteToUnlock = notes.find(n => n.id === passwordAttempt.id);
            const title = decryptData(noteToUnlock.title, password);
            const contentPlainText = decryptData(noteToUnlock.contentPlainText, password);
            if (title === null) {
                 showNotification("Decryption failed.", "error");
            } else {
                setUnlockedNoteData({ id: noteToUnlock.id, title, contentPlainText });
                setActiveNoteId(noteToUnlock.id);
            }
        }

        setIsPasswordPrompting(false);
        setPasswordAttempt(null);
    }

    const handleSetPassword = async (newPassword) => { /* ... unchanged ... */ };
    const toggleTheme = async () => { /* ... unchanged ... */ };

    if (!isInitialised) { /* ... */ }

    // Check if the active note is unlocked to pass decrypted content to the editor
    const activeNote = notes.find(note => note.id === activeNoteId);
    let editorNote = activeNote;
    if (activeNote && unlockedNoteData && unlockedNoteData.id === activeNote.id) {
        editorNote = { ...activeNote, ...unlockedNoteData };
    }

    return (
        <div className="flex h-screen font-sans text-gray-900 dark:text-gray-100">
            {/* Sidebar and Note List */}
            {/* ... JSX is mostly the same, just updated handlers ... */}
            <aside className="w-64 bg-gray-200 dark:bg-gray-800 p-4 flex flex-col flex-shrink-0">{/* ... */}</aside>

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

            <section className="flex-1 bg-white dark:bg-gray-800 p-6 overflow-y-auto">
                <Editor 
                    activeNote={editorNote}
                    onUpdate={handleUpdateNote}
                    onDelete={() => setIsDeleting(true)}
                    onToggleLock={handleToggleLock}
                    hasPassword={!!masterPasswordHash}
                />
            </section>
            
            {/* Modals and Notifications */}
            {isSettingsOpen && <SettingsModal /* ... */ />}
            {isDeleting && <ConfirmDeleteModal /* ... */ />}
            {isPasswordPrompting && <PasswordPromptModal 
                onConfirm={handlePasswordConfirmV2}
                onCancel={() => {setIsPasswordPrompting(false); setPasswordAttempt(null);}}
                showNotification={showNotification}
            />}
            {notification && <Notification /* ... */ />}
        </div>
    );
}

// =================================================================
// RENDER THE APP
// =================================================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
