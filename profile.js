// Profile Management Module for Shiro Notes
class ProfileModule {
  constructor(app) {
    this.app = app;
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


