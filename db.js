// =================================================================
// DATABASE SETUP (Dexie.js)
// =================================================================
const db = new Dexie('myEnhancedNotesDB');

db.version(1).stores({
    notes: '++id, title, tags, isPinned, isLocked, createdAt, updatedAt',
    settings: 'key' 
});
