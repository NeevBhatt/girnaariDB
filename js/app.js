/**
 * GIR NAARI - MAIN APPLICATION CONTROLLER
 * Handles bottom navigation, view switching, toasts, modals, and settings.
 */

window.App = {
    currentTab: 'dashboard',

    async init() {
        console.log('🌿 Starting Gir Naari Digital Register...');

        // Initialize Authentication
        window.Auth.init();

        // Check if user is logged in
        if (!window.Auth.isAuthenticated()) {
            window.Auth.showLoginModal();
        }

        // Setup Navigation
        this.bindNavigation();
        this.bindModals();
        this.checkDatabaseStatusBanner();

        // Initialize modules
        if (window.DashboardModule) await window.DashboardModule.init();
        if (window.OrdersModule) await window.OrdersModule.init();
        if (window.CustomersModule) await window.CustomersModule.init();
        if (window.RemindersModule) await window.RemindersModule.init();
        if (window.ReportsModule) await window.ReportsModule.init();
        if (window.ImportModule) window.ImportModule.init();

        // Check for URL hash
        const hash = window.location.hash.replace('#', '');
        if (['dashboard', 'orders', 'customers', 'reminders', 'reports'].includes(hash)) {
            this.navigateTo(hash);
        } else {
            this.navigateTo('dashboard');
        }
    },

    bindNavigation() {
        const navButtons = document.querySelectorAll('.nav-item');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.dataset.tab;
                if (target) {
                    this.navigateTo(target);
                }
            });
        });

        // Family PIN submission
        const pinForm = document.getElementById('familyLoginForm');
        if (pinForm) {
            pinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const memberSelect = document.getElementById('familyMemberSelect');
                const pinInput = document.getElementById('familyPinInput');
                
                const memberId = memberSelect ? memberSelect.value : 'father';
                const pin = pinInput ? pinInput.value.trim() : '';

                const res = window.Auth.login(memberId, pin);
                if (res.success) {
                    window.Auth.hideLoginModal();
                    this.showToast(`Welcome ${res.member.name}! 🙏`, 'success');
                } else {
                    this.showToast(res.message, 'error');
                }
            });
        }
    },

    navigateTo(tabName) {
        if (!tabName) return;
        this.currentTab = tabName;

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update view sections
        document.querySelectorAll('.app-section').forEach(sec => {
            if (sec.id === `section-${tabName}`) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        // Window scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.location.hash = tabName;

        // Auto trigger refresh for specific views
        if (tabName === 'dashboard' && window.DashboardModule) {
            window.DashboardModule.loadStats();
        } else if (tabName === 'customers' && window.CustomersModule) {
            window.CustomersModule.loadCustomers();
        } else if (tabName === 'reminders' && window.RemindersModule) {
            window.RemindersModule.loadReminders();
        } else if (tabName === 'reports' && window.ReportsModule) {
            window.ReportsModule.loadReports();
        } else if (tabName === 'orders' && window.OrdersModule) {
            window.OrdersModule.loadCustomerOptions();
        }
    },

    bindModals() {
        // Close modal buttons
        document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });

        // Close on background overlay click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal && modal.id !== 'loginModal') {
                    modal.classList.remove('active');
                }
            });
        });

        // Settings Modal
        const btnOpenSettings = document.getElementById('btnOpenSettings');
        if (btnOpenSettings) {
            btnOpenSettings.addEventListener('click', () => this.openSettingsModal());
        }

        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
        }

        const btnTestDb = document.getElementById('btnTestSupabase');
        if (btnTestDb) {
            btnTestDb.addEventListener('click', () => this.testSupabaseConnection());
        }
    },

    checkDatabaseStatusBanner() {
        const banner = document.getElementById('dbStatusBanner');
        if (!banner) return;

        if (window.GirNaariDB.isMock()) {
            banner.innerHTML = `
                <div class="db-banner-content">
                    <span>⚡ <strong>Offline / Demo Mode</strong>: Running with sample data. Enter your Supabase credentials in Settings to connect your live database.</span>
                    <button type="button" class="btn btn-sm btn-outline-white" onclick="App.openSettingsModal()">⚙️ Connect Supabase</button>
                </div>
            `;
            banner.style.display = 'block';
            banner.className = 'db-status-banner';
        } else {
            // Live Supabase is connected! Check if this phone has unsynced offline orders
            const unsyncedCount = window.DB.hasUnsyncedLocalOrders();
            if (unsyncedCount > 0) {
                banner.innerHTML = `
                    <div class="db-banner-content db-sync-highlight">
                        <span>📲 <strong>${unsyncedCount} offline order(s)</strong> recorded on this phone before Supabase was connected!</span>
                        <button type="button" class="btn btn-sm btn-whatsapp" onclick="App.syncOfflineOrders()">⚡ Sync ${unsyncedCount} Order(s) to Supabase</button>
                    </div>
                `;
                banner.style.display = 'block';
                banner.className = 'db-status-banner banner-sync';
            } else {
                banner.style.display = 'none';
            }
        }
    },

    async syncOfflineOrders() {
        if (!confirm('Sync locally recorded orders on this phone to the live Supabase database? Once uploaded, Neev, Papa, and Mummy will all see them.')) {
            return;
        }

        this.showToast('Uploading offline orders to Supabase...', 'info');

        try {
            const res = await window.DB.syncLocalDataToSupabase();
            if (res.success && res.count > 0) {
                this.showToast(`✓ ${res.count} order(s) synced to Supabase!`, 'success');
                alert(`✅ Synchronization Complete!\n\n${res.count} order(s) and ${res.customersCount} customer(s) are now uploaded to Supabase.\nAll family devices can now view these orders!`);
            } else {
                this.showToast('No new offline orders needed syncing.', 'info');
            }

            this.checkDatabaseStatusBanner();

            // Refresh all views
            if (window.DashboardModule) await window.DashboardModule.loadStats();
            if (window.CustomersModule) await window.CustomersModule.loadCustomers();
            if (window.RemindersModule) await window.RemindersModule.loadReminders();
            if (window.ReportsModule) await window.ReportsModule.loadReports();

        } catch (err) {
            console.error('Sync failed:', err);
            this.showToast('Sync failed: ' + err.message, 'error');
            alert('Failed to sync offline orders: ' + err.message);
        }
    },

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        document.getElementById('settingSupabaseUrl').value = window.CONFIG.supabase.url || '';
        document.getElementById('settingSupabaseKey').value = window.CONFIG.supabase.anonKey || '';
        document.getElementById('settingFamilyPin').value = window.CONFIG.family.pin || '1234';

        const testResEl = document.getElementById('supabaseTestResult');
        if (testResEl) testResEl.innerHTML = '';

        modal.classList.add('active');
    },

    async handleSaveSettings(e) {
        e.preventDefault();
        const url = document.getElementById('settingSupabaseUrl').value.trim();
        const key = document.getElementById('settingSupabaseKey').value.trim();
        const pin = document.getElementById('settingFamilyPin').value.trim();

        if (pin) {
            window.CONFIG.family.pin = pin;
            localStorage.setItem('girnaari_family_pin', pin);
        }

        window.GirNaariDB.updateCredentials(url, key);
        this.checkDatabaseStatusBanner();

        this.showToast('Settings saved successfully!', 'success');
        document.getElementById('settingsModal').classList.remove('active');

        // Reload data from new database
        if (window.CustomersModule) await window.CustomersModule.loadCustomers();
        if (window.DashboardModule) await window.DashboardModule.loadStats();
        if (window.RemindersModule) await window.RemindersModule.loadReminders();
        if (window.ReportsModule) await window.ReportsModule.loadReports();
    },

    async testSupabaseConnection() {
        const resultEl = document.getElementById('supabaseTestResult');
        const rawUrl = document.getElementById('settingSupabaseUrl').value.trim();
        const key = document.getElementById('settingSupabaseKey').value.trim() || window.CONFIG.supabase.anonKey;
        const url = window.GirNaariDB.cleanUrl(rawUrl);

        if (!url || !key) {
            resultEl.innerHTML = '<span class="text-danger">Please enter both URL and Publishable/Anon Key first.</span>';
            return;
        }

        resultEl.innerHTML = '<span>Testing connection...</span>';
        try {
            if (window.supabase && window.supabase.createClient) {
                const tempClient = window.supabase.createClient(url, key);
                const { data, error } = await tempClient.from('customers').select('count', { count: 'exact', head: true });
                if (error) throw error;
                resultEl.innerHTML = '<span class="text-success font-weight-bold">✓ Connection Successful! Customers table detected.</span>';
            } else {
                resultEl.innerHTML = '<span class="text-warning">Supabase JS library not loaded. Check internet connection.</span>';
            }
        } catch (err) {
            resultEl.innerHTML = `<span class="text-danger">✗ Connection Failed: ${err.message || 'Check URL/Key or schema.sql setup'}</span>`;
        }
    },

    showToast(message, type = 'info') {
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '⚠️';
        if (type === 'warning') icon = '🔔';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-msg">${this.escapeHTML(message)}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3500);
    },

    escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
});

