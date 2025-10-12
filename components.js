const { useState, useEffect, useRef } = React;
const { useEditor, EditorContent } = TiptapReact;
const StarterKit = TiptapStarterKit.default;
const Placeholder = TiptapPlaceholder.default;

function Notification({ message, type, onClear }) {
    useEffect(() => { const timer = setTimeout(() => onClear(), 4000); return () => clearTimeout(timer); }, [onClear]);
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    return <div className={`notification-animation fixed bottom-5 right-5 ${bgColor} text-white py-3 px-5 rounded-lg shadow-xl z-50`}>{message}</div>;
}

function SettingsModal({ onClose, onSetPassword, hasPassword, showNotification }) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const handleSubmit = () => {
        if (password.length < 4) return showNotification("Password must be at least 4 characters long.", "error");
        if (password !== confirm) return showNotification("Passwords do not match.", "error");
        onSetPassword(password);
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md mx-4">
                <h2 className="text-2xl font-bold mb-4">{hasPassword ? "Change" : "Set"} Master Password</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4"><strong className="text-red-500">If you forget it, your locked notes cannot be recovered.</strong></p>
                <div className="space-y-4">
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} placeholder="Confirm new password" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save Password</button>
                </div>
            </div>
        </div>
    );
}

function ConfirmDeleteModal({ onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-sm mx-4">
                <h2 className="text-xl font-bold mb-4">Are you sure?</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">This note will be permanently deleted.</p>
                <div className="flex justify-end space-x-4">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Delete</button>
                </div>
            </div>
        </div>
    );
}

function PasswordPromptModal({ onConfirm, onCancel, showNotification }) {
    const [password, setPassword] = useState('');
    const inputRef = useRef(null);
    useEffect(() => { inputRef.current?.focus(); }, []);
    const handleSubmit = () => {
        if (!password) return showNotification("Please enter your password.", "error");
        onConfirm(password);
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-sm mx-4">
                <h2 className="text-xl font-bold mb-4">Enter Password</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Please enter your master password.</p>
                <input ref={inputRef} type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="Master Password" />
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Confirm</button>
                </div>
            </div>
        </div>
    );
}

function NoteCard({ note, isActive, onClick }) {
    const title = note.isLocked ? "Locked Note" : (note.title || 'Untitled Note');
    const contentSnippet = note.isLocked ? 'This note is encrypted.' : (note.contentPlainText || '').substring(0, 80) + '...';
    const activeClasses = isActive ? 'bg-blue-200 dark:bg-blue-800' : 'hover:bg-gray-200 dark:hover:bg-gray-700';
    return (
        <div onClick={onClick} className={`p-4 mb-2 rounded-lg cursor-pointer transition-colors ${activeClasses} flex justify-between items-start`}>
            <div className="overflow-hidden">
                <h3 className="font-bold truncate">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{contentSnippet}</p>
            </div>
            {note.isLocked && <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>}
        </div>
    );
}

function Toolbar({ editor }) {
    if (!editor) return null;
    return (
        <div className="editor-toolbar border-t border-x border-gray-300 dark:border-gray-600 rounded-t-lg p-2">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>Bold</button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}>Italic</button>
            <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''}>Strike</button>
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''}>List</button>
        </div>
    );
}

function RichTextEditor({ content, onUpdate, disabled }) {
    const editor = useEditor({
        extensions: [ StarterKit, Placeholder.configure({ placeholder: 'Start writing...' }) ],
        content: content,
        editable: !disabled,
        onUpdate: ({ editor }) => { onUpdate(editor.getHTML()); },
    });
    useEffect(() => { if (editor && !editor.isDestroyed && editor.getHTML() !== content) { editor.commands.setContent(content, false); } }, [content, editor]);
    useEffect(() => { if(editor) { editor.setEditable(!disabled); } }, [disabled, editor]);
    return <EditorContent editor={editor} className="border border-gray-300 dark:border-gray-600 rounded-b-lg flex-1 overflow-y-auto p-2" />;
}

function Editor({ activeNote, onUpdate, onDelete, onToggleLock, hasPassword, onBack }) {
    const [title, setTitle] = useState('');
    const debounceTimeout = useRef(null);

    useEffect(() => { setTitle(activeNote ? activeNote.title : ''); }, [activeNote]);

    const debouncedUpdate = (updatedFields) => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => { onUpdate(updatedFields); }, 500);
    };

    const handleTitleUpdate = (newTitle) => {
        setTitle(newTitle);
        debouncedUpdate({ title: newTitle });
    };

    const handleContentUpdate = (newContent) => {
        const div = document.createElement('div');
        div.innerHTML = newContent;
        const newContentPlainText = div.textContent || div.innerText || '';
        debouncedUpdate({ content: newContent, contentPlainText: newContentPlainText });
    };

    if (!activeNote) {
        return <div className="hidden md:flex text-center text-gray-400 dark:text-gray-500 h-full items-center justify-center"><p>Select a note to view</p></div>;
    }
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center mb-4 flex-shrink-0">
                <button onClick={onBack} className="md:hidden mr-2 p-2 text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <input type="text" value={title} onChange={(e) => handleTitleUpdate(e.target.value)} placeholder="Note Title" className="w-full text-2xl font-bold bg-transparent focus:outline-none" disabled={activeNote.isLocked} />
                {hasPassword && (
                    <button onClick={onToggleLock} className="ml-4 p-2 text-gray-500 hover:text-blue-500 rounded-full" title={activeNote.isLocked ? "Unlock Note" : "Lock Note"}>
                        {activeNote.isLocked ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>}
                    </button>
                 )}
                <button onClick={onDelete} className="ml-2 p-2 text-gray-500 hover:text-red-500 rounded-full" title="Delete Note">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
             <Toolbar editor={useEditor({ extensions: [StarterKit], editable: !activeNote.isLocked })} />
             <RichTextEditor key={activeNote.id} content={activeNote.content || ''} onUpdate={handleContentUpdate} disabled={activeNote.isLocked} />
        </div>
    );
                }
