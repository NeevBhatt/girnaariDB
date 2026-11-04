/**
 * GIR NAARI - 40-DAY CUSTOMER REMINDERS & FOLLOW-UP MODULE
 * Groups overdue customers (>= 40 days since latest order) by Ahmedabad locality/area.
 * Collapsible accordions, one-tap pre-filled WhatsApp messaging, and contacted status tracking.
 */

window.RemindersModule = {
    reminderData: null,
    collapsedAreas: new Set(),
    activeTab: 'all', // 'all' or 'uncontacted' or 'contacted'

    async init() {
        this.bindEvents();
        await this.loadReminders();
    },

    bindEvents() {
        const filterTabs = document.querySelectorAll('.reminder-filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                filterTabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.activeTab = e.target.dataset.filter || 'all';
                this.renderReminders();
            });
        });
    },

    async loadReminders() {
        const container = document.getElementById('remindersListContainer');
        if (container) {
            container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Checking 40-day customer re-order intervals...</p></div>';
        }

        try {
            const threshold = window.CONFIG.business.reminderThresholdDays || 40;
            this.reminderData = await window.DB.getDueReminders(threshold);
            this.renderReminders();

            // Update badge on reminder nav tab
            const navBadge = document.getElementById('navReminderBadge');
            if (navBadge) {
                if (this.reminderData.totalDue > 0) {
                    navBadge.textContent = this.reminderData.totalDue;
                    navBadge.style.display = 'inline-flex';
                } else {
                    navBadge.style.display = 'none';
                }
            }
        } catch (err) {
            console.error('Error loading reminders:', err);
            if (container) {
                container.innerHTML = `<div class="empty-state error"><p>Error calculating reminders: ${err.message}</p></div>`;
            }
        }
    },

    renderReminders() {
        const container = document.getElementById('remindersListContainer');
        const countHeader = document.getElementById('reminderCountHeader');
        if (!container || !this.reminderData) return;

        let items = this.reminderData.flatList;

        if (this.activeTab === 'uncontacted') {
            items = items.filter(i => !i.lastContactedAt);
        } else if (this.activeTab === 'contacted') {
            items = items.filter(i => !!i.lastContactedAt);
        }

        if (countHeader) {
            countHeader.textContent = `${items.length} Customers Due for Follow-up (≥ 40 Days)`;
        }

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🌿</div>
                    <h3>All caught up!</h3>
                    <p>No customers currently due for a 40-day follow-up under this filter.</p>
                </div>
            `;
            return;
        }

        // Group filtered items by Area
        const groups = {};
        for (const item of items) {
            const area = (item.customer.area || 'Other / General').trim();
            if (!groups[area]) groups[area] = [];
            groups[area].push(item);
        }

        const areaNames = Object.keys(groups).sort();

        let html = '';
        for (const area of areaNames) {
            const areaItems = groups[area];
            const isCollapsed = this.collapsedAreas.has(area);

            html += `
                <div class="reminder-area-group ${isCollapsed ? 'collapsed' : ''}" data-area="${this.escapeHTML(area)}">
                    <div class="area-group-header" onclick="RemindersModule.toggleAreaCollapse('${this.escapeHTML(area)}')">
                        <div class="agh-left">
                            <span class="agh-icon">📍</span>
                            <h3 class="agh-title">${this.escapeHTML(area.toUpperCase())}</h3>
                            <span class="badge badge-counter">${areaItems.length}</span>
                        </div>
                        <div class="agh-right">
                            <span class="collapse-caret">${isCollapsed ? '▼ Show' : '▲ Hide'}</span>
                        </div>
                    </div>

                    <div class="area-group-body" style="display: ${isCollapsed ? 'none' : 'block'};">
                        <div class="reminder-cards-grid">
                            ${areaItems.map(item => this.renderReminderCard(item)).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    renderReminderCard(item) {
        const c = item.customer;
        const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
        const message = window.CONFIG.business.reminderMessageTemplate(c.name);
        const encodedMessage = encodeURIComponent(message);
        const waLink = `https://wa.me/91${cleanPhone}?text=${encodedMessage}`;

        const isContactedRecently = !!item.lastContactedAt;
        const contactedDateFormatted = isContactedRecently ? this.formatDate(item.lastContactedAt) : null;

        return `
            <div class="reminder-card ${isContactedRecently ? 'card-contacted' : ''}">
                <div class="rc-header">
                    <div class="rc-info">
                        <h4 class="rc-name">${this.escapeHTML(c.name)}</h4>
                        <span class="rc-phone">📞 ${this.escapeHTML(c.phone)}</span>
                    </div>
                    <div class="rc-days-tag ${item.daysSinceLastOrder >= 60 ? 'urgent' : 'warning'}">
                        ⏳ <strong>${item.daysSinceLastOrder} days</strong> ago
                    </div>
                </div>

                <div class="rc-details">
                    <div class="rc-detail-line">
                        <span>Last Order:</span>
                        <strong>${item.lastOrderDate ? this.formatDate(item.lastOrderDate) : 'Never ordered'}</strong>
                        ${item.lastOrderQuantity ? `(${item.lastOrderQuantity} ${item.lastOrderUnit})` : ''}
                    </div>

                    ${isContactedRecently ? `
                        <div class="rc-contacted-badge">
                            ✓ Contacted on ${contactedDateFormatted}
                        </div>
                    ` : ''}
                </div>

                <div class="rc-actions">
                    <a href="tel:+91${cleanPhone}" class="btn btn-sm btn-outline" title="Call Customer">
                        📞 Call
                    </a>
                    <a href="${waLink}" target="_blank" class="btn btn-sm btn-whatsapp" onclick="RemindersModule.onWhatsAppClick('${c.id}')" title="Send Personalized WhatsApp Message">
                        💬 WhatsApp Follow-up
                    </a>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="RemindersModule.promptMarkContacted('${c.id}', '${this.escapeHTML(c.name)}')">
                        ${isContactedRecently ? '📝 Re-mark' : '✓ Mark Contacted'}
                    </button>
                    <button type="button" class="btn btn-sm btn-primary" onclick="RemindersModule.quickNewOrder('${c.id}')">
                        ➕ New Order
                    </button>
                </div>
            </div>
        `;
    },

    toggleAreaCollapse(area) {
        if (this.collapsedAreas.has(area)) {
            this.collapsedAreas.delete(area);
        } else {
            this.collapsedAreas.add(area);
        }
        this.renderReminders();
    },

    async onWhatsAppClick(customerId) {
        // Automatically ask if user wants to log the contact
        setTimeout(() => {
            if (confirm('Did you send the WhatsApp follow-up message to this customer? Mark as contacted?')) {
                this.markContactedConfirmed(customerId, 'Followed up via WhatsApp');
            }
        }, 1200);
    },

    async promptMarkContacted(customerId, customerName) {
        const note = prompt(`Mark ${customerName} as contacted.\nAdd an optional note (e.g. "Called, will order next week"):`, 'Called for ghee follow-up');
        if (note !== null) {
            await this.markContactedConfirmed(customerId, note);
        }
    },

    async markContactedConfirmed(customerId, notes) {
        try {
            await window.DB.markContacted(customerId, notes);
            window.App.showToast('Contact logged successfully! ✓', 'success');
            await this.loadReminders();
        } catch (err) {
            console.error('Error logging contact:', err);
            window.App.showToast('Failed to log contact: ' + err.message, 'error');
        }
    },

    quickNewOrder(customerId) {
        window.App.navigateTo('orders');
        setTimeout(() => {
            if (window.OrdersModule) {
                window.OrdersModule.selectCustomer(customerId);
                document.getElementById('orderQuantity').focus();
            }
        }, 100);
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    },

    escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
};

