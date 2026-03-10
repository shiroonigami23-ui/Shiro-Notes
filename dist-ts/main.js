import { applyEnhancements } from './enhancements';
async function bootstrap() {
    if (!window.app) {
        throw new Error('Core app instance not found. Ensure legacy scripts are loaded first.');
    }
    await window.app.init();
    window.lucide?.createIcons();
    applyEnhancements();
}
document.addEventListener('DOMContentLoaded', () => {
    bootstrap().catch((err) => {
        console.error('Bootstrap failed', err);
        alert('Shiro Notes failed to initialize. Check console.');
    });
});
