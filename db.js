// =================================================================
// DATABASE SETUP (Dexie.js)
// =================================================================
// This creates a global 'db' object that other scripts can access.
const db = new Dexie('myEnhancedNotesDB');

db.version(1).stores({
    // '++id' means auto-incrementing primary key.
    // The following are indexed properties for faster queries.
    notes: '++id, title, tags, isPinned, isLocked, createdAt, updatedAt',
    
    // A simple key-value store for app settings.
    settings: 'key' 
});
