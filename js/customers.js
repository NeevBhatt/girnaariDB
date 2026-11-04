/**
 * GIR NAARI - CUSTOMER MANAGEMENT MODULE
 * Complete Customer CRUD, search by name/phone, area filtering,
 * purchase history, pending balances, and one-tap contact buttons.
 */

window.CustomersModule = {
    customers: [],
    selectedAreaFilter: '',
    searchQuery: '',
    autoSelectInOrderAfterSave: false,

    async init() {
        this.bindEvents();
        await this.loadCustomers();
    },

    bindEvents() {
        const searchInput = document.getElementById('custSearchInput');
        const areaFilter = document.getElementById('custAreaFilter');
        const customerForm = document.getElementById('customerForm');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderCustomerList();
            });
        }

        if (areaFilter) {
            areaFilter.addEventListener('change', (e) => {
                this.selectedAreaFilter = e.target.value;
                this.renderCustomerList();
            });
        }

        if (customerForm) {
            customerForm.addEventListener('submit', (e) => this.handleCustomerSubmit(e));
        }

        // Area suggestions datalist populate
        const datalist = document.getElementById('suggestedAreasList');
        if (datalist && window.CONFIG.suggestedAreas) {
            datalist.innerHTML = window.CONFIG.suggestedAreas
                .map(area => `<option value="${area}"></option>`)
                .join('');
        }
    },

    async loadCustomers() {
        const container = document.getElementById('customerListContainer');
        if (container) {
            container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading customers...</p></div>';
        }

        try {
            this.customers = await window.DB.getCustomers();
            this.updateAreaFilterOptions();
            this.renderCustomerList();

            // Also keep OrdersModule cache in sync
            if (window.OrdersModule) {
                window.OrdersModule.customersCache = this.customers;
            }
        } catch (err) {
            console.error('Error loading customers:', err);
            if (container) {
                container.innerHTML = `<div class="empty-state error"><p>Error loading customers: ${err.message}</p></div>`;
            }
        }
    },

    updateAreaFilterOptions() {
        const areaFilter = document.getElementById('custAreaFilter');
        if (!areaFilter) return;

        const areas = Array.from(new Set(this.customers.map(c => (c.area || '').trim()).filter(Boolean))).sort();
        
        let html = '<option value="">All Areas (Ahmedabad)</option>';
        areas.forEach(area => {
            html += `<option value="${this.escapeHTML(area)}">${this.escapeHTML(area)}</option>`;
        });
        areaFilter.innerHTML = html;
        if (this.selectedAreaFilter) {
            areaFilter.value = this.selectedAreaFilter;
        }
    },

    async renderCustomerList() {
        const container = document.getElementById('customerListContainer');
        const countBadge = document.getElementById('customerTotalCountBadge');
        if (!container) return;

        let filtered = this.customers.filter(c => {
            const matchesQuery = !this.searchQuery || 
                (c.name && c.name.toLowerCase().includes(this.searchQuery)) ||
                (c.phone && c.phone.includes(this.searchQuery)) ||
                (c.area && c.area.toLowerCase().includes(this.searchQuery));

            const matchesArea = !this.selectedAreaFilter || c.area === this.selectedAreaFilter;
            return matchesQuery && matchesArea;
        });

        if (countBadge) {
            countBadge.textContent = `${filtered.length} of ${this.customers.length}`;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>No customers found</h3>
                    <p>${this.searchQuery || this.selectedAreaFilter ? 'Try clearing your search or filter' : 'Add your first customer to start recording ghee orders'}</p>
                    <button type="button" class="btn btn-primary mt-2" onclick="CustomersModule.openAddModal()">
                        ➕ Add New Customer
                    </button>
                </div>
            `;
            return;
        }

        // Fetch quick summaries for filtered customers to show pending balance & last order
        const orders = await window.DB.getOrders();
        const orderSummaryMap = new Map();

        for (const order of orders) {
            const cid = order.customer_id;
            let sum = orderSummaryMap.get(cid);
            if (!sum) {
                sum = { total: 0, paid: 0, lastDate: order.order_date, totalQty: 0 };
                orderSummaryMap.set(cid, sum);
            }
            sum.total += parseFloat(order.total) || 0;
            sum.paid += parseFloat(order.amount_paid) || 0;
            sum.totalQty += parseFloat(order.quantity) || 0;
            if (new Date(order.order_date) > new Date(sum.lastDate)) {
                sum.lastDate = order.order_date;
            }
        }

        const html = filtered.map(c => {
            const sum = orderSummaryMap.get(c.id) || { total: 0, paid: 0, lastDate: null, totalQty: 0 };
            const pending = Math.max(0, sum.total - sum.paid);
            const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');

            return `
                <div class="customer-card">
                    <div class="card-header">
                        <div class="cust-title-group">
                            <h3 class="cust-name">${this.escapeHTML(c.name)}</h3>
                            <span class="badge ${c.customer_type === 'Wholesaler' ? 'badge-gold' : 'badge-subtle'}">
                                ${this.escapeHTML(c.customer_type || 'Regular')}
                            </span>
                        </div>
                        <div class="cust-card-actions">
                            <button type="button" class="btn-icon" onclick="CustomersModule.openEditModal('${c.id}')" title="Edit Customer">✏️</button>
                            <button type="button" class="btn-icon danger" onclick="CustomersModule.confirmDelete('${c.id}', '${this.escapeHTML(c.name)}')" title="Delete Customer">🗑️</button>
                        </div>
                    </div>

                    <div class="cust-details-grid">
                        <div class="cust-detail-item">
                            <span class="label">📍 Area:</span>
                            <strong>${this.escapeHTML(c.area || 'Ahmedabad')}</strong>
                        </div>
                        <div class="cust-detail-item">
                            <span class="label">📞 Phone:</span>
                            <strong>${this.escapeHTML(c.phone)}</strong>
                        </div>
                        <div class="cust-detail-item">
                            <span class="label">📅 Last Order:</span>
                            <span>${sum.lastDate ? this.formatDate(sum.lastDate) : '<em class="text-muted">No orders yet</em>'}</span>
                        </div>
                        <div class="cust-detail-item">
                            <span class="label">📦 Total Ghee:</span>
                            <strong>${sum.totalQty} L</strong>
                        </div>
                    </div>

                    ${c.address ? `<div class="cust-address-row">🏠 <span>${this.escapeHTML(c.address)}</span></div>` : ''}

                    <div class="cust-balance-footer">
                        <div class="balance-status ${pending > 0 ? 'text-danger' : 'text-success'}">
                            ${pending > 0 ? `<strong>Pending: ₹${pending.toLocaleString('en-IN')}</strong>` : '<span class="status-badge paid">All Clear ✓</span>'}
                        </div>
                        <div class="action-buttons-group">
                            ${cleanPhone ? `
                                <a href="tel:+91${cleanPhone}" class="btn btn-sm btn-outline call-btn" title="Call">
                                    📞 Call
                                </a>
                                <a href="https://wa.me/91${cleanPhone}" target="_blank" class="btn btn-sm btn-outline wa-btn" title="WhatsApp">
                                    💬 WhatsApp
                                </a>
                            ` : ''}
                            <button type="button" class="btn btn-sm btn-secondary" onclick="CustomersModule.viewCustomerHistory('${c.id}')">
                                📜 History
                            </button>
                            <button type="button" class="btn btn-sm btn-primary" onclick="CustomersModule.startOrderForCustomer('${c.id}')">
                                ➕ Order
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    openAddModal() {
        const form = document.getElementById('customerForm');
        if (form) form.reset();
        document.getElementById('customerModalTitle').textContent = 'Add New Customer';
        document.getElementById('customerId').value = '';
        this.autoSelectInOrderAfterSave = false;
        
        const modal = document.getElementById('customerModal');
        if (modal) modal.classList.add('active');
        document.getElementById('custName').focus();
    },

    async openEditModal(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        document.getElementById('customerModalTitle').textContent = 'Edit Customer';
        document.getElementById('customerId').value = customer.id;
        document.getElementById('custName').value = customer.name || '';
        document.getElementById('custPhone').value = customer.phone || '';
        document.getElementById('custArea').value = customer.area || '';
        document.getElementById('custAddress').value = customer.address || '';
        document.getElementById('custType').value = customer.customer_type || 'Regular';
        document.getElementById('custNotes').value = customer.notes || '';

        const modal = document.getElementById('customerModal');
        if (modal) modal.classList.add('active');
    },

    closeModal() {
        const modal = document.getElementById('customerModal');
        if (modal) modal.classList.remove('active');
    },

    async handleCustomerSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('customerId').value;
        const name = document.getElementById('custName').value.trim();
        const phone = document.getElementById('custPhone').value.trim();
        const area = document.getElementById('custArea').value.trim();
        const address = document.getElementById('custAddress').value.trim();
        const customer_type = document.getElementById('custType').value;
        const notes = document.getElementById('custNotes').value.trim();

        if (!name) {
            window.App.showToast('Please enter the customer name.', 'error');
            return;
        }

        if (!phone || phone.replace(/[^0-9]/g, '').length < 10) {
            window.App.showToast('Please enter a valid 10-digit mobile number.', 'error');
            return;
        }

        if (!area) {
            window.App.showToast('Please enter an area/locality in Ahmedabad.', 'error');
            return;
        }

        const submitBtn = document.getElementById('btnSaveCustomer');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        try {
            let savedCustomer;
            if (id) {
                savedCustomer = await window.DB.updateCustomer(id, { name, phone, area, address, customer_type, notes });
                window.App.showToast(`Customer "${name}" updated successfully!`, 'success');
            } else {
                savedCustomer = await window.DB.createCustomer({ name, phone, area, address, customer_type, notes });
                window.App.showToast(`Customer "${name}" added successfully! 🎉`, 'success');
            }

            this.closeModal();
            await this.loadCustomers();

            // If triggered from order form, auto-select in order form!
            if (this.autoSelectInOrderAfterSave && savedCustomer && window.OrdersModule) {
                window.OrdersModule.selectCustomer(savedCustomer.id);
                this.autoSelectInOrderAfterSave = false;
                window.App.navigateTo('orders');
            }

        } catch (err) {
            console.error('Error saving customer:', err);
            window.App.showToast('Failed to save customer: ' + (err.message || 'Error'), 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Customer';
            }
        }
    },

    async confirmDelete(id, name) {
        if (!confirm(`Are you sure you want to delete customer "${name}"?\n\nThis will also remove their order history and reminders.`)) {
            return;
        }

        try {
            await window.DB.deleteCustomer(id);
            window.App.showToast(`Customer "${name}" deleted.`, 'info');
            await this.loadCustomers();
            if (window.DashboardModule) window.DashboardModule.loadStats();
        } catch (err) {
            console.error('Error deleting customer:', err);
            window.App.showToast('Failed to delete customer: ' + err.message, 'error');
        }
    },

    startOrderForCustomer(customerId) {
        window.App.navigateTo('orders');
        setTimeout(() => {
            if (window.OrdersModule) {
                window.OrdersModule.selectCustomer(customerId);
                document.getElementById('orderQuantity').focus();
            }
        }, 100);
    },

    async viewCustomerHistory(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const modal = document.getElementById('historyModal');
        const container = document.getElementById('historyModalContent');
        if (!modal || !container) return;

        modal.classList.add('active');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Fetching purchase history...</p></div>';

        try {
            const summary = await window.DB.getCustomerSummary(customerId);
            const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');

            let html = `
                <div class="history-profile-header">
                    <div class="profile-top">
                        <h2>${this.escapeHTML(customer.name)}</h2>
                        <span class="badge badge-gold">${this.escapeHTML(customer.customer_type || 'Regular')}</span>
                    </div>
                    <div class="profile-meta">
                        <span>📞 <strong>${this.escapeHTML(customer.phone)}</strong></span>
                        <span>📍 <strong>${this.escapeHTML(customer.area)}</strong></span>
                    </div>
                    ${customer.address ? `<div class="profile-address">🏠 ${this.escapeHTML(customer.address)}</div>` : ''}
                    
                    <div class="quick-contact-row mt-2">
                        <a href="tel:+91${cleanPhone}" class="btn btn-sm btn-outline">📞 Call</a>
                        <a href="https://wa.me/91${cleanPhone}" target="_blank" class="btn btn-sm btn-outline">💬 WhatsApp</a>
                        <button type="button" class="btn btn-sm btn-primary" onclick="CustomersModule.startOrderForCustomer('${customer.id}'); CustomersModule.closeHistoryModal();">
                            ➕ New Order
                        </button>
                    </div>
                </div>

                <div class="history-stats-grid">
                    <div class="stat-pill">
                        <span class="lbl">Total Orders</span>
                        <strong class="val">${summary.totalOrders}</strong>
                    </div>
                    <div class="stat-pill">
                        <span class="lbl">Total Ghee</span>
                        <strong class="val">${summary.totalQuantity} L</strong>
                    </div>
                    <div class="stat-pill">
                        <span class="lbl">Total Billing</span>
                        <strong class="val">₹${summary.totalAmount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div class="stat-pill ${summary.pendingBalance > 0 ? 'alert' : ''}">
                        <span class="lbl">Pending Balance</span>
                        <strong class="val">₹${summary.pendingBalance.toLocaleString('en-IN')}</strong>
                    </div>
                </div>

                <div class="history-orders-section">
                    <h3>Order History (${summary.orders.length})</h3>
            `;

            if (summary.orders.length === 0) {
                html += `
                    <div class="empty-state py-3">
                        <p>No orders recorded yet for this customer.</p>
                    </div>
                `;
            } else {
                html += `<div class="order-history-list">`;
                summary.orders.forEach(o => {
                    const balance = Math.max(0, (parseFloat(o.total) || 0) - (parseFloat(o.amount_paid) || 0));
                    html += `
                        <div class="history-order-card">
                            <div class="hoc-top">
                                <span class="order-date">📅 ${this.formatDate(o.order_date)}</span>
                                <span class="order-payment-tag ${balance > 0 ? 'unpaid' : 'paid'}">
                                    ${balance > 0 ? `Pending: ₹${balance}` : 'Paid ✓'}
                                </span>
                            </div>
                            <div class="hoc-details">
                                <span class="hoc-qty"><strong>${o.quantity} ${o.unit}</strong> @ ₹${o.price}/${o.unit}</span>
                                <span class="hoc-total">Total: <strong>₹${Number(o.total).toLocaleString('en-IN')}</strong></span>
                            </div>
                            <div class="hoc-sub">
                                <span>Paid: ₹${Number(o.amount_paid).toLocaleString('en-IN')} via ${o.payment_method}</span>
                                ${o.notes ? `<div class="hoc-notes">📝 ${this.escapeHTML(o.notes)}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                html += `</div>`;
            }

            html += `</div>`;
            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = `<div class="empty-state error"><p>Error fetching history: ${err.message}</p></div>`;
        }
    },

    closeHistoryModal() {
        const modal = document.getElementById('historyModal');
        if (modal) modal.classList.remove('active');
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

