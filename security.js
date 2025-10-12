// ===== Security & Lock Features =====

class SecurityManager {
    constructor() {
        this.setupSecurity();
    }

    setupSecurity() {
        // Auto-lock timer
        this.resetAutoLockTimer();
        
        document.addEventListener('mousemove', () => this.resetAutoLockTimer());
        document.addEventListener('keypress', () => this.resetAutoLockTimer());
        document.addEventListener('click', () => this.resetAutoLockTimer());
    }

    resetAutoLockTimer() {
        clearTimeout(this.autoLockTimer);
        
        if (app.data.settings.autoLock && app.data.settings.passcode) {
            this.autoLockTimer = setTimeout(() => {
                this.lockApp();
            }, 5 * 60 * 1000); // 5 minutes
        }
    }

    lockApp() {
        if (!app.data.settings.passcode) return;

        document.getElementById('lockScreen').classList.remove('hidden');
        document.getElementById('appContainer').style.display = 'none';
        app.showToast('App locked for security', 'info');
    }

    unlockApp(passcode) {
        if (passcode === app.data.settings.passcode) {
            document.getElementById('lockScreen').classList.add('hidden');
            document.getElementById('appContainer').style.display = 'flex';
            this.resetAutoLockTimer();
            return true;
        }
        return false;
    }

    changePasscode() {
        const currentPasscode = prompt('Enter current passcode:');
        if (currentPasscode !== app.data.settings.passcode) {
            app.showToast('Incorrect current passcode', 'error');
            return;
        }

        const newPasscode = prompt('Enter new 6-digit passcode:');
        if (!newPasscode || newPasscode.length !== 6 || !/^\d+$/.test(newPasscode)) {
            app.showToast('Please enter a valid 6-digit passcode', 'error');
            return;
        }

        const confirmPasscode = prompt('Confirm new passcode:');
        if (newPasscode !== confirmPasscode) {
            app.showToast('Passcodes do not match', 'error');
            return;
        }

        app.data.settings.passcode = newPasscode;
        app.saveData('settings');
        app.showToast('Passcode changed successfully', 'success');
    }

    removePasscode() {
        const passcode = prompt('Enter current passcode to remove:');
        if (passcode !== app.data.settings.passcode) {
            app.showToast('Incorrect passcode', 'error');
            return;
        }

        if (confirm('Remove passcode protection?')) {
            app.data.settings.passcode = null;
            app.saveData('settings');
            document.getElementById('lockScreen').classList.add('hidden');
            document.getElementById('appContainer').style.display = 'flex';
            app.showToast('Passcode removed', 'success');
        }
    }

    toggleAutoLock() {
        app.data.settings.autoLock = !app.data.settings.autoLock;
        app.saveData('settings');
        
        if (app.data.settings.autoLock) {
            this.resetAutoLockTimer();
            app.showToast('Auto-lock enabled', 'success');
        } else {
            clearTimeout(this.autoLockTimer);
            app.showToast('Auto-lock disabled', 'success');
        }
    }
}

// Initialize security
const securityManager = new SecurityManager();
