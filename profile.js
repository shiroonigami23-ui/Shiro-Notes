// ===== Profile Management =====

class ProfileManager {
    constructor() {
        this.init();
    }

    init() {
        this.loadProfileData();
    }

    loadProfileData() {
        // Profile data is managed by the main app
        // This file can be extended for additional profile features
    }

    generateDefaultAvatars() {
        // Generate colorful avatar placeholders
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
        ];

        return colors.map((color, index) => ({
            id: `avatar${index + 1}`,
            color: color,
            icon: ['fa-user', 'fa-graduation-cap', 'fa-book', 'fa-star', 
                   'fa-heart', 'fa-rocket', 'fa-lightbulb', 'fa-crown'][index]
        }));
    }

    createAvatarSVG(color, icon) {
        return `
            <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
                <circle cx="64" cy="64" r="64" fill="${color}"/>
                <text x="64" y="80" font-size="48" text-anchor="middle" fill="white" font-family="FontAwesome">
                    ${this.getIconUnicode(icon)}
                </text>
            </svg>
        `;
    }

    getIconUnicode(iconClass) {
        const icons = {
            'fa-user': '\uf007',
            'fa-graduation-cap': '\uf19d',
            'fa-book': '\uf02d',
            'fa-star': '\uf005',
            'fa-heart': '\uf004',
            'fa-rocket': '\uf135',
            'fa-lightbulb': '\uf0eb',
            'fa-crown': '\uf521'
        };
        return icons[iconClass] || '\uf007';
    }

    exportProfile() {
        const profileData = {
            user: app.data.user,
            stats: {
                totalBooks: app.data.books.length,
                totalNotes: this.countTotalNotes(),
                totalDrawings: app.data.drawings.length,
                totalEvents: app.data.events.length
            },
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `profile-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        app.showToast('Profile exported', 'success');
    }

    countTotalNotes() {
        let total = 0;
        app.data.books.forEach(book => {
            book.chapters.forEach(chapter => {
                total += chapter.notes.length;
            });
        });
        return total;
    }

    shareProfile() {
        const profileUrl = window.location.href;
        const shareText = `Check out my Shiro Notes profile! I have ${app.data.books.length} books, ${this.countTotalNotes()} notes, and ${app.data.drawings.length} drawings.`;

        if (navigator.share) {
            navigator.share({
                title: 'Shiro Notes Profile',
                text: shareText,
                url: profileUrl
            }).then(() => {
                app.showToast('Profile shared', 'success');
            }).catch(() => {
                this.fallbackShare(shareText);
            });
        } else {
            this.fallbackShare(shareText);
        }
    }

    fallbackShare(text) {
        cryptoManager.copyToClipboard(text);
    }
}

// Initialize profile manager
const profileManager = new ProfileManager();
