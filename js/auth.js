/**
 * GIR NAARI - SIMPLE FAMILY AUTHENTICATION
 * Shared PIN access for the 3 family members: Neev, Papa, Mummy.
 * All members have identical full permissions without complex roles.
 */

window.Auth = {
    currentUser: null,

    init() {
        const saved = localStorage.getItem('girnaari_active_member');
        if (saved) {
            try {
                this.currentUser = JSON.parse(saved);
            } catch (e) {
                this.currentUser = null;
            }
        }
        this.renderUserBadge();
    },

    isAuthenticated() {
        return !!this.currentUser;
    },

    getCurrentUser() {
        return this.currentUser;
    },

    login(memberId, enteredPin) {
        const correctPin = window.CONFIG.family.pin || '1234';
        if (enteredPin !== correctPin) {
            return { success: false, message: 'Incorrect PIN. Please try again.' };
        }

        const member = window.CONFIG.family.members.find(m => m.id === memberId);
        if (!member) {
            return { success: false, message: 'Please select who is using the app.' };
        }

        this.currentUser = member;
        localStorage.setItem('girnaari_active_member', JSON.stringify(member));
        this.renderUserBadge();
        return { success: true, member };
    },

    logout() {
        this.currentUser = null;
        localStorage.removeItem('girnaari_active_member');
        this.renderUserBadge();
        this.showLoginModal();
    },

    renderUserBadge() {
        const badgeEl = document.getElementById('userBadge');
        if (!badgeEl) return;

        if (this.currentUser) {
            badgeEl.innerHTML = `
                <button type="button" class="family-badge-btn" onclick="Auth.showSwitchModal()" title="Switch family member">
                    <span class="user-avatar">👤</span>
                    <span class="user-name">${this.escapeHTML(this.currentUser.name)}</span>
                    <span class="switch-hint">🔄</span>
                </button>
            `;
            badgeEl.style.display = 'block';
        } else {
            badgeEl.innerHTML = '';
            badgeEl.style.display = 'none';
        }
    },

    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.add('active');
            const pinInput = document.getElementById('familyPinInput');
            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
        }
    },

    hideLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    showSwitchModal() {
        this.showLoginModal();
    },

    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
};

