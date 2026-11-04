/**
 * GIR NAARI - ORDER MANAGEMENT MODULE
 * Simplest, fastest order entry with searchable customer picker,
 * manual pricing, dynamic totals, partial payment tracking, and zero duplicates.
 */

window.OrdersModule = {
    customersCache: [],
    selectedCustomer: null,

    async init() {
        this.bindEvents();
        await this.loadCustomerOptions();
        this.resetForm();
    },

    bindEvents() {
        const custSearchInput = document.getElementById('orderCustomerSearch');
        const custDropdown = document.getElementById('orderCustomerDropdown');
        const qtyInput = document.getElementById('orderQuantity');
        const unitSelect = document.getElementById('orderUnit');
        const priceInput = document.getElementById('orderPrice');
        const paidInput = document.getElementById('orderAmountPaid');
        const form = document.getElementById('orderForm');

        if (custSearchInput) {
            custSearchInput.addEventListener('input', (e) => this.handleCustomerSearch(e.target.value));
            custSearchInput.addEventListener('focus', () => {
                this.handleCustomerSearch(custSearchInput.value);
                if (custDropdown) custDropdown.classList.add('show');
            });
        }

        // Close dropdown when clicked outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.customer-picker-container')) {
                if (custDropdown) custDropdown.classList.remove('show');
            }
        });

        // Auto-recalculate totals
        [qtyInput, priceInput, unitSelect].forEach(el => {
            if (el) el.addEventListener('input', () => this.recalculateTotals());
        });

        if (paidInput) {
            paidInput.addEventListener('input', () => this.recalculateBalance());
        }

        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Quick payment buttons
        document.querySelectorAll('.btn-quick-pay').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const total = parseFloat(document.getElementById('orderTotal').value) || 0;
                const paidInput = document.getElementById('orderAmountPaid');
                
                if (action === 'full') {
                    paidInput.value = total > 0 ? total : 0;
                } else if (action === 'zero') {
                    paidInput.value = 0;
                } else if (action === 'half') {
                    paidInput.value = total > 0 ? (total / 2) : 0;
                }
                this.recalculateBalance();
            });
        });
    },

    async loadCustomerOptions() {
        try {
            this.customersCache = await window.DB.getCustomers();
        } catch (err) {
            console.error('Failed to load customers for order form:', err);
        }
    },

    handleCustomerSearch(query) {
        const dropdown = document.getElementById('orderCustomerDropdown');
        if (!dropdown) return;

        const q = (query || '').toLowerCase().trim();
        const filtered = this.customersCache.filter(c => 
            c.name.toLowerCase().includes(q) || 
            (c.phone && c.phone.includes(q)) || 
            (c.area && c.area.toLowerCase().includes(q))
        );

        let html = '';
        if (filtered.length === 0) {
            html = `
                <div class="dropdown-item no-match">
                    <span>No customer found matching "${this.escapeHTML(query)}"</span>
                    <button type="button" class="btn btn-sm btn-primary mt-1" onclick="OrdersModule.openQuickAddCustomer('${this.escapeHTML(query)}')">
                        ➕ Add "${this.escapeHTML(query)}" as New Customer
                    </button>
                </div>
            `;
        } else {
            html = filtered.map(c => `
                <div class="dropdown-item" onclick="OrdersModule.selectCustomer('${c.id}')">
                    <div class="cust-item-main">
                        <strong>${this.escapeHTML(c.name)}</strong>
                        <span class="cust-tag">${this.escapeHTML(c.customer_type || 'Regular')}</span>
                    </div>
                    <div class="cust-item-sub">
                        <span>📞 ${this.escapeHTML(c.phone)}</span>
                        <span>📍 ${this.escapeHTML(c.area)}</span>
                    </div>
                </div>
            `).join('');

            // Also append quick add option at bottom
            html += `
                <div class="dropdown-item add-new-item" onclick="OrdersModule.openQuickAddCustomer('${this.escapeHTML(query)}')">
                    <span>➕ Add New Customer</span>
                </div>
            `;
        }

        dropdown.innerHTML = html;
        dropdown.classList.add('show');
    },

    selectCustomer(customerId) {
        const customer = this.customersCache.find(c => c.id === customerId);
        if (!customer) return;

        this.selectedCustomer = customer;
        const searchInput = document.getElementById('orderCustomerSearch');
        const selectedBadge = document.getElementById('selectedCustomerBadge');
        const dropdown = document.getElementById('orderCustomerDropdown');

        if (searchInput) {
            searchInput.value = '';
            searchInput.style.display = 'none';
        }

        if (selectedBadge) {
            selectedBadge.innerHTML = `
                <div class="selected-customer-card">
                    <div class="sc-info">
                        <strong>👤 ${this.escapeHTML(customer.name)}</strong>
                        <span class="sc-meta">📞 ${this.escapeHTML(customer.phone)} &bull; 📍 ${this.escapeHTML(customer.area)} &bull; <span class="badge">${this.escapeHTML(customer.customer_type || 'Regular')}</span></span>
                    </div>
                    <button type="button" class="btn-clear-customer" onclick="OrdersModule.clearCustomerSelection()" title="Change customer">✕ Change</button>
                </div>
            `;
            selectedBadge.style.display = 'block';
        }

        if (dropdown) dropdown.classList.remove('show');
    },

    clearCustomerSelection() {
        this.selectedCustomer = null;
        const searchInput = document.getElementById('orderCustomerSearch');
        const selectedBadge = document.getElementById('selectedCustomerBadge');

        if (searchInput) {
            searchInput.style.display = 'block';
            searchInput.value = '';
            searchInput.focus();
        }
        if (selectedBadge) {
            selectedBadge.style.display = 'none';
            selectedBadge.innerHTML = '';
        }
    },

    recalculateTotals() {
        const qty = parseFloat(document.getElementById('orderQuantity').value) || 0;
        const price = parseFloat(document.getElementById('orderPrice').value) || 0;
        const unit = document.getElementById('orderUnit').value;

        let total = 0;
        if (unit === 'gram') {
            // Price entered can be either per kg or per jar. If user types 500g at ₹1200/kg -> ₹600.
            // But per prompt: "5. Price, 6. Total amount (automatically calculated). Calculate the total automatically using quantity and entered price. Make the pricing unit clear, and ensure quantity and price units are consistent."
            // So if unit is gram, Price is per gram unless specified. To keep it 100% simple for parents: Quantity * Price.
            total = qty * price;
        } else if (unit === 'ml') {
            total = qty * price;
        } else {
            // litre or kg
            total = qty * price;
        }

        // Round to 2 decimals
        total = Math.round(total * 100) / 100;

        const totalInput = document.getElementById('orderTotal');
        if (totalInput) {
            totalInput.value = total > 0 ? total : '';
        }

        // If amount paid is empty, default to full paid
        const paidInput = document.getElementById('orderAmountPaid');
        if (paidInput && (!paidInput.value || parseFloat(paidInput.value) === 0)) {
            // leave as is or update if full was clicked
        }

        this.recalculateBalance();
    },

    recalculateBalance() {
        const total = parseFloat(document.getElementById('orderTotal').value) || 0;
        const paid = parseFloat(document.getElementById('orderAmountPaid').value) || 0;
        const balance = Math.max(0, total - paid);

        const balanceDisplay = document.getElementById('orderBalanceDisplay');
        if (balanceDisplay) {
            balanceDisplay.innerHTML = `
                <div class="balance-calc-row ${balance > 0 ? 'has-pending' : 'all-clear'}">
                    <span>Pending Balance:</span>
                    <strong>₹${balance.toLocaleString('en-IN')}</strong>
                    ${balance === 0 && total > 0 ? '<span class="status-tag paid">Fully Paid ✓</span>' : ''}
                    ${balance > 0 && paid > 0 ? '<span class="status-tag partial">Partially Paid</span>' : ''}
                    ${paid === 0 && total > 0 ? '<span class="status-tag unpaid">Unpaid</span>' : ''}
                </div>
            `;
        }
    },

    resetForm() {
        const form = document.getElementById('orderForm');
        if (form) form.reset();

        this.clearCustomerSelection();

        // Default date to today in YYYY-MM-DD
        const dateInput = document.getElementById('orderDate');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Default unit to litre
        const unitInput = document.getElementById('orderUnit');
        if (unitInput) {
            unitInput.value = 'litre';
        }

        // Default payment method to Cash
        const payMethodInput = document.getElementById('orderPaymentMethod');
        if (payMethodInput) {
            payMethodInput.value = 'Cash';
        }

        const totalInput = document.getElementById('orderTotal');
        if (totalInput) totalInput.value = '';

        this.recalculateBalance();
    },

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.selectedCustomer) {
            window.App.showToast('Please select or add an existing customer.', 'error');
            const searchInput = document.getElementById('orderCustomerSearch');
            if (searchInput) searchInput.focus();
            return;
        }

        const qty = parseFloat(document.getElementById('orderQuantity').value);
        if (!qty || qty <= 0) {
            window.App.showToast('Please enter a valid ghee quantity.', 'error');
            document.getElementById('orderQuantity').focus();
            return;
        }

        const price = parseFloat(document.getElementById('orderPrice').value);
        if (isNaN(price) || price < 0) {
            window.App.showToast('Please enter the manual selling price.', 'error');
            document.getElementById('orderPrice').focus();
            return;
        }

        const total = parseFloat(document.getElementById('orderTotal').value) || (qty * price);
        const amountPaid = parseFloat(document.getElementById('orderAmountPaid').value) || 0;

        if (amountPaid > total) {
            if (!confirm(`Amount paid (₹${amountPaid}) is greater than total order amount (₹${total}). Do you wish to continue?`)) {
                return;
            }
        }

        const submitBtn = document.getElementById('btnSubmitOrder');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving Order...';
        }

        try {
            const orderPayload = {
                customer_id: this.selectedCustomer.id,
                order_date: document.getElementById('orderDate').value || new Date().toISOString().split('T')[0],
                quantity: qty,
                unit: document.getElementById('orderUnit').value || 'litre',
                price: price,
                total: total,
                amount_paid: amountPaid,
                payment_method: document.getElementById('orderPaymentMethod').value || 'Cash',
                notes: document.getElementById('orderNotes').value || ''
            };

            await window.DB.createOrder(orderPayload);

            window.App.showToast(`Order for ${this.selectedCustomer.name} saved successfully! 🎉`, 'success');
            this.resetForm();

            // Refresh dashboard and reminders
            if (window.DashboardModule) window.DashboardModule.loadStats();
            if (window.RemindersModule) window.RemindersModule.loadReminders();
            if (window.ReportsModule) window.ReportsModule.loadReports();

        } catch (err) {
            console.error('Failed to save order:', err);
            window.App.showToast('Failed to save order: ' + (err.message || 'Database error'), 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>💾 Save Ghee Order</span>';
            }
        }
    },

    openQuickAddCustomer(initialName = '') {
        const modal = document.getElementById('customerModal');
        const form = document.getElementById('customerForm');
        if (form) form.reset();
        
        document.getElementById('customerModalTitle').textContent = 'Add New Customer';
        document.getElementById('customerId').value = '';
        
        if (initialName && isNaN(initialName)) {
            document.getElementById('custName').value = initialName;
        } else if (initialName && !isNaN(initialName)) {
            document.getElementById('custPhone').value = initialName;
        }

        // Set flag so upon customer creation, it auto-selects this customer in the order form!
        window.CustomersModule.autoSelectInOrderAfterSave = true;

        if (modal) modal.classList.add('active');
    },

    escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
};

