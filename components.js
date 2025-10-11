const { useState, useEffect, useRef } = React;

// ... Notification, SettingsModal, ConfirmDeleteModal components are unchanged ...
function Notification({ message, type, onClear }) { /* ... */ }
function SettingsModal({ onClose, onSetPassword, hasPassword, showNotification }) { /* ... */ }
function ConfirmDeleteModal({ onConfirm, onCancel }) { /* ... */ }


// [NEW] Modal to prompt for the master password to unlock a note
function PasswordPromptModal({ onConfirm, onCancel, showNotification }) {
    const [password, setPassword] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = () => {
        if (!password) {
            showNotification("Please enter your password.", "error");
            return;
        }
        onConfirm(password);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-sm mx-4">
                <h2 className="text-xl font-bold mb-4">Enter Password</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">This note is locked. Please enter your master password to view it.</p>
                <input
                    ref={inputRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Master Password"
                />
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Unlock</button>
                </div>
            </div>
        </div>
    );
}

// NoteCard component is updated to show a lock icon
function NoteCard({ note, isActive, onClick }) {
    const title = note.isLocked ? "Locked Note" : (note.title || 'Untitled Note');
    const contentSnippet = note.isLocked ? 'This note is encrypted.' : (note.contentPlainText || '').substring(0, 80) + '...';
    const activeClasses = isActive ? 'bg-blue-200 dark:bg-blue-800' : 'hover:bg-gray-300 dark:hover:bg-gray-700';

    return (
        <div onClick={onClick} className={`p-4 mb-2 rounded-lg cursor-pointer transition-colors ${activeClasses} flex justify-between items-center`}>
            <div>
                <h3 className="font-bold truncate">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{contentSnippet}</p>
            </div>
            {note.isLocked && (
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            )}
        </div>
    );
}

// Editor component is updated with a lock button
function Editor({ activeNote, onUpdate, onDelete, onToggleLock, hasPassword }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const debounceTimeout = useRef(null);

    useEffect(() => {
        if (activeNote) {
            setTitle(activeNote.title);
            setContent(activeNote.contentPlainText);
        } else {
            setTitle('');
            setContent('');
        }
    }, [activeNote]);

    const handleUpdate = (field, value) => {
        if (field === 'title') setTitle(value);
        if (field === 'content') setContent(value);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        debounceTimeout.current = setTimeout(() => {
            const updatedFields = field === 'title' 
                ? { title: value } 
                : { contentPlainText: value, content: value };
            onUpdate(updatedFields);
        }, 500);
    };

    if (!activeNote) {
        return <div className="text-center text-gray-400 dark:text-gray-500 h-full flex items-center justify-center"><p>Select a note to view or create a new one</p></div>;
    }

    const isLocked = activeNote.isLocked;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center mb-4">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => handleUpdate('title', e.target.value)}
                    placeholder="Note Title"
                    className="w-full text-2xl font-bold bg-transparent focus:outline-none"
                    disabled={isLocked}
                />
                 {hasPassword && (
                    <button onClick={onToggleLock} className="ml-4 p-2 text-gray-500 hover:text-blue-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title={isLocked ? "Unlock Note" : "Lock Note"}>
                        {isLocked ? 
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg> :
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        }
                    </button>
                 )}
                <button onClick={onDelete} className="ml-2 p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Delete Note">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
            <textarea
                value={content}
                onChange={(e) => handleUpdate('content', e.target.value)}
                placeholder="Start writing..."
                className="flex-1 w-full bg-transparent resize-none focus:outline-none text-lg leading-7"
                disabled={isLocked}
            ></textarea>
        </div>
    );
                            }
