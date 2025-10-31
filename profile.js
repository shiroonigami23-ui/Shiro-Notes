// Profile Management Module for Shiro Notes
class ProfileModule {
  constructor(app) {
    this.app = app;
  }

  loadProfilePageContent(pageElement) {
    const profile = this.app.data.settings.profile;
    const avatarSrc = profile.avatar;
    let avatarHtml = '<i class="fas fa-user"></i>'; // Default icon

    if (avatarSrc) {
        avatarHtml = `<img src="${avatarSrc}" alt="Profile">`;
    } else if (profile.name) {
        const initials = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatarHtml = `<span>${initials}</span>`;
    }

    pageElement.innerHTML = `
    <div class="profile-container">
        <div class="profile-header-card">
            <div class="profile-avatar-large" id="profileAvatarLarge">
                ${avatarHtml}
            </div>
            <div class="profile-header-info">
                <span class="profile-name-display">${this.app.escapeHtml(profile.name) || 'Your Name'}</span>
                <span class="profile-email-display">${this.app.escapeHtml(profile.email) || 'your.email@example.com'}</span>
            </div>
            <button class="btn btn--secondary btn--sm" onclick="profileModule.changeAvatar()">
                <i class="fas fa-camera"></i> Change Avatar
            </button>
        </div>

        <div class="profile-tabs">
            <button class="profile-tab active" data-tab="profile-details">
                <i class="fas fa-user-circle"></i> Details
            </button>
            <button class="profile-tab" data-tab="tab-preferences">
                <i class="fas fa-sliders-h"></i> Preferences
            </button>
        </div>

        <div id="profile-details" class="profile-tab-content active">
            <div class="profile-card profile-form">
                <h3>Profile Details</h3>
                <div class="form-group">
                    <label for="profileName">Name</label>
                    <input type="text" id="profileName" class="form-control" value="${this.app.escapeHtml(profile.name || '')}">
                </div>
                <div class="form-group">
                    <label for="profileEmail">Email</label>
                    <input type="email" id="profileEmail" class="form-control" value="${this.app.escapeHtml(profile.email || '')}">
                </div>
                <div class="form-group">
                    <label for="profileBio">Bio</label>
                    <textarea id="profileBio" class="form-control" rows="3">${this.app.escapeHtml(profile.bio || '')}</textarea>
                </div>
                <button class="btn btn--primary" id="saveProfileBtn">Save Changes</button>
            </div>
        </div>

        <div id="tab-preferences" class="profile-tab-content">
            <div class="profile-card">
                <h3>App Preferences</h3>
                <div class="preference-item">
                    <div>
                        <strong>Theme</strong>
                        <p>Choose your preferred app theme.</p>
                    </div>
                    <select id="themeSelect" class="form-control" onchange="uiModule.handleThemeChange(this.value)">
                        <option value="auto">Auto (System)</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
    `;

    // Add event listeners for the new content
    this.setupProfileEventListeners();
    // Set the correct theme in the dropdown
    document.getElementById('themeSelect').value = this.app.data.settings.theme;
}

  setupProfileEventListeners() {
    // Tab switching
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;

            // Update tabs
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update content
            document.querySelectorAll('.profile-tab-content').forEach(content => {
                content.classList.toggle('active', content.id === tabId);
            });
        });
    });

    // Save button
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        const bio = document.getElementById('profileBio').value;

        this.updateProfile('name', name);
        this.updateProfile('email', email);
        this.updateProfile('bio', bio);

        // Update the header card display instantly
        document.querySelector('.profile-name-display').textContent = name || 'Your Name';
        document.querySelector('.profile-email-display').textContent = email || 'your.email@example.com';
    });
}

  // Update a profile field
  updateProfile(field, value) {
    if (this.app.data.settings.profile.hasOwnProperty(field)) {
      this.app.data.settings.profile[field] = value;
      this.app.saveData();
      this.app.showToast('Profile updated!', 'success');

      // Update UI elements like sidebar avatar if name changes
      if (field === 'name') {
        this.updateSidebarProfile();
      }
    }
  }

  // Handle avatar change
  changeAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png, image/jpeg, image/gif';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Check file size (e.g., limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.app.showToast('Image is too large. Please select an image under 2MB.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataURL = event.target.result;
        this.app.data.settings.profile.avatar = dataURL;
        this.app.saveData();

        // Update avatar on the page
        document.getElementById('profileAvatarLarge').innerHTML = `<img src="${dataURL}" alt="Profile">`;
        this.updateSidebarProfile();
        this.app.showToast('Avatar changed successfully!', 'success');
      };

      reader.readAsDataURL(file);
    };

    input.click();
  }

  // Update sidebar profile display
  updateSidebarProfile() {
    const avatarContainer = document.getElementById('sidebarAvatar');
    const profile = this.app.data.settings.profile;

    if (profile.avatar) {
      avatarContainer.innerHTML = `<img src="${profile.avatar}" alt="Avatar" style="width:100%; height:100%; object-fit:cover;">`;
    } else if (profile.name) {
      // Use initials if no avatar but has a name
      const initials = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarContainer.innerHTML = `<span>${initials}</span>`;
      avatarContainer.style.backgroundColor = 'var(--color-primary)';
    } else {
      // Default icon
      avatarContainer.innerHTML = '<i class="fas fa-user"></i>';
    }
  }
}

// Initialize the module
const profileModule = new ProfileModule(app);
window.profileModule = profileModule;

// Initial update of the sidebar profile on load
document.addEventListener('DOMContentLoaded', () => {
    profileModule.updateSidebarProfile();
});


