/**
 * GIR NAARI - ORDER MANAGEMENT MODULE
 * Supports multiple products (A2 Ghee, Milk Powder 500g, Honey 250g & 500g),
 * fixed cost price tracking (Ghee: ₹750/L, Milk Powder: ₹170, Honey 250g: ₹70, Honey 500g: ₹130),
 * optional delivery charges, live profit & margin preview, searchable customer picker,
 * and seamless real-time Supabase sync.
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
        const productSelect = document.getElementById('orderProduct');
        const qtyInput = document.getElementById('orderQuantity');
        const unitSelect = document.getElementById('orderUnit');
        const priceInput = document.getElementById('orderPrice');
        const delivInput = document.getElementById('orderDeliveryCharge');
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

        // Product selection change
        if (productSelect) {
            productSelect.addEventListener('change', () => this.handleProductChange());
        }

        // Auto-recalculate totals & profit
        [qtyInput, priceInput, unitSelect, delivInput].forEach(el => {
            if (el) el.addEventListener('input', () => this.recalculateTotals());
        });

        if (paidInput) {
            paidInput.addEventListener('input', () => this.recalculateBalance());
        }

        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Quick delivery buttons
        document.querySelectorAll('.btn-quick-deliv').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = parseFloat(e.target.dataset.val) || 0;
                const deliv = document.getElementById('orderDeliveryCharge');
                if (deliv) {
                    deliv.value = val > 0 ? val : '';
                }
                document.querySelectorAll('.btn-quick-deliv').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.recalculateTotals();
            });
        });

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
                    paidInput.value = total > 0 ? Math.round(total / 2) : 0;
                }
                this.recalculateBalance();
            });
        });
    },

    handleProductChange() {
        const productSelect = document.getElementById('orderProduct');
        const unitSelect = document.getElementById('orderUnit');
        const priceInput = document.getElementById('orderPrice');
        const priceHint = document.getElementById('orderPriceHint');
        const qtyInput = document.getElementById('orderQuantity');
        if (!productSelect) return;

        const prodId = productSelect.value;

        if (prodId === 'ghee') {
            if (unitSelect) {
                unitSelect.innerHTML = `
                    <option value="litre" selected>litre</option>
                    <option value="kg">kg</option>
                    <option value="gram">gram</option>
                    <option value="ml">ml</option>
                `;
            }
            if (priceInput) priceInput.value = 1200;
            if (priceHint) priceHint.textContent = '(Cost: ₹750/L fixed | Selling: ₹1,200/L default)';
            if (qtyInput && !qtyInput.value) qtyInput.value = 1;

        } else if (prodId === 'milk_powder_500g') {
            if (unitSelect) {
                unitSelect.innerHTML = `
                    <option value="pack (500g)" selected>pack (500g)</option>
                    <option value="pack">pack</option>
                `;
            }
            if (priceInput) priceInput.value = 300;
            if (priceHint) priceHint.textContent = '(Cost: ₹170 | Selling: ₹300 | Profit: ₹130)';
            if (qtyInput && !qtyInput.value) qtyInput.value = 1;

        } else if (prodId === 'honey_250g') {
            if (unitSelect) {
                unitSelect.innerHTML = `
                    <option value="jar (250g)" selected>jar (250g)</option>
                    <option value="jar">jar</option>
                `;
            }
            if (priceInput) priceInput.value = 200;
            if (priceHint) priceHint.textContent = '(Cost: ₹70 | Selling: ₹200 | Profit: ₹130)';
            if (qtyInput && !qtyInput.value) qtyInput.value = 1;

        } else if (prodId === 'honey_500g') {
            if (unitSelect) {
                unitSelect.innerHTML = `
                    <option value="jar (500g)" selected>jar (500g)</option>
                    <option value="jar">jar</option>
                `;
            }
            if (priceInput) priceInput.value = 300;
            if (priceHint) priceHint.textContent = '(Cost: ₹130 | Selling: ₹300 | Profit: ₹170)';
            if (qtyInput && !qtyInput.value) qtyInput.value = 1;

        } else {
            // custom / other
            if (unitSelect) {
                unitSelect.innerHTML = `
                    <option value="unit" selected>unit</option>
                    <option value="pack">pack</option>
                    <option value="jar">jar</option>
                    <option value="litre">litre</option>
                    <option value="kg">kg</option>
                `;
            }
            if (priceInput) priceInput.value = '';
            if (priceHint) priceHint.textContent = '(Enter manual selling rate)';
        }

        this.recalculateTotals();
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
        const productSelect = document.getElementById('orderProduct');
        const prodId = productSelect ? productSelect.value : 'ghee';
        const qty = parseFloat(document.getElementById('orderQuantity').value) || 0;
        const price = parseFloat(document.getElementById('orderPrice').value) || 0;
        const unit = document.getElementById('orderUnit') ? document.getElementById('orderUnit').value : 'litre';
        const deliveryCharge = parseFloat(document.getElementById('orderDeliveryCharge').value) || 0;

        const subtotal = Math.round((qty * price) * 100) / 100;
        const total = Math.round((subtotal + deliveryCharge) * 100) / 100;

        // Calculate Cost Price:
        // 1. Ghee: Fixed cost ₹750/L
        // 2. Milk powder 500g: ₹170 cost
        // 3. Honey 250g: ₹70 cost
        // 4. Honey 500g: ₹130 cost
        let cost = 0;
        if (prodId === 'ghee') {
            if (unit === 'ml' || unit === 'gram') {
                cost = (qty / 1000) * 750;
            } else {
                cost = qty * 750;
            }
        } else if (prodId === 'milk_powder_500g') {
            cost = qty * 170;
        } else if (prodId === 'honey_250g') {
            cost = qty * 70;
        } else if (prodId === 'honey_500g') {
            cost = qty * 130;
        } else {
            cost = 0;
        }
        cost = Math.round(cost * 100) / 100;

        // Profit = Total billed (subtotal + delivery) - Cost
        const profit = Math.round((total - cost) * 100) / 100;
        const margin = total > 0 ? Math.round((profit / total) * 100) : 0;

        const totalInput = document.getElementById('orderTotal');
        if (totalInput) {
            totalInput.value = total > 0 ? total : '';
        }

        // Live Profit & Breakdown Display
        const profitDisplay = document.getElementById('orderProfitDisplay');
        if (profitDisplay) {
            if (total > 0 && cost > 0) {
                profitDisplay.innerHTML = `
                    <div class="order-profit-box">
                        <div class="opb-header">
                            <span>Order Total: <strong>₹${total.toLocaleString('en-IN')}</strong></span>
                            <span class="opb-profit-badge">+₹${profit.toLocaleString('en-IN')} Profit (${margin}%)</span>
                        </div>
                        <div class="opb-breakdown">
                            <span>Items: <strong>₹${subtotal.toLocaleString('en-IN')}</strong></span>
                            ${deliveryCharge > 0 ? `<span>Delivery: <strong>+₹${deliveryCharge}</strong></span>` : '<span>Delivery: <strong>Free</strong></span>'}
                            <span>Cost: <strong>₹${cost.toLocaleString('en-IN')}</strong></span>
                            <span class="${profit >= 0 ? 'text-success' : 'text-danger'} font-weight-bold">Net Margin: ${margin}%</span>
                        </div>
                    </div>
                `;
            } else if (total > 0) {
                profitDisplay.innerHTML = `
                    <div class="order-profit-box">
                        <div class="opb-header">
                            <span>Order Total: <strong>₹${total.toLocaleString('en-IN')}</strong></span>
                            <span class="opb-profit-badge">+₹${total.toLocaleString('en-IN')} Revenue</span>
                        </div>
                    </div>
                `;
            } else {
                profitDisplay.innerHTML = '';
            }
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

        // Default product to Ghee
        const productSelect = document.getElementById('orderProduct');
        if (productSelect) {
            productSelect.value = 'ghee';
            this.handleProductChange();
        }

        // Default delivery charge to 0
        const delivInput = document.getElementById('orderDeliveryCharge');
        if (delivInput) delivInput.value = '';
        document.querySelectorAll('.btn-quick-deliv').forEach(b => b.classList.remove('active'));

        // Default payment method to Cash
        const payMethodInput = document.getElementById('orderPaymentMethod');
        if (payMethodInput) {
            payMethodInput.value = 'Cash';
        }

        const totalInput = document.getElementById('orderTotal');
        if (totalInput) totalInput.value = '';

        const profitDisplay = document.getElementById('orderProfitDisplay');
        if (profitDisplay) profitDisplay.innerHTML = '';

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
            window.App.showToast('Please enter a valid quantity.', 'error');
            document.getElementById('orderQuantity').focus();
            return;
        }

        const price = parseFloat(document.getElementById('orderPrice').value);
        if (isNaN(price) || price < 0) {
            window.App.showToast('Please enter the selling price.', 'error');
            document.getElementById('orderPrice').focus();
            return;
        }

        const productSelect = document.getElementById('orderProduct');
        const prodId = productSelect ? productSelect.value : 'ghee';
        const prodNameMap = {
            'ghee': 'A2 Gir Cow Desi Ghee',
            'milk_powder_500g': 'Milk Powder (500 gm)',
            'honey_250g': 'Gir Forest Honey (250 gm)',
            'honey_500g': 'Gir Forest Honey (500 gm)',
            'custom': 'Custom Product'
        };
        const prodName = prodNameMap[prodId] || 'A2 Gir Cow Desi Ghee';
        const unit = document.getElementById('orderUnit').value || 'litre';
        const deliveryCharge = parseFloat(document.getElementById('orderDeliveryCharge').value) || 0;

        const subtotal = Math.round((qty * price) * 100) / 100;
        const total = parseFloat(document.getElementById('orderTotal').value) || (subtotal + deliveryCharge);
        const amountPaid = parseFloat(document.getElementById('orderAmountPaid').value) || 0;

        // Calculate Cost Price:
        let cost = 0;
        if (prodId === 'ghee') {
            if (unit === 'ml' || unit === 'gram') {
                cost = (qty / 1000) * 750;
            } else {
                cost = qty * 750;
            }
        } else if (prodId === 'milk_powder_500g') {
            cost = qty * 170;
        } else if (prodId === 'honey_250g') {
            cost = qty * 70;
        } else if (prodId === 'honey_500g') {
            cost = qty * 130;
        }
        cost = Math.round(cost * 100) / 100;
        const profit = Math.round((total - cost) * 100) / 100;

        if (amountPaid < 0 || isNaN(amountPaid)) {
            window.App.showToast('Amount paid cannot be negative.', 'error');
            document.getElementById('orderAmountPaid').focus();
            return;
        }

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
                unit: unit,
                price: price,
                delivery_charge: deliveryCharge,
                total: total,
                cost_price: cost,
                profit: profit,
                product_name: prodName,
                amount_paid: amountPaid,
                payment_method: document.getElementById('orderPaymentMethod').value || 'Cash',
                notes: document.getElementById('orderNotes').value || ''
            };

            await window.DB.createOrder(orderPayload);

            window.App.showToast(`Order for ${this.selectedCustomer.name} saved! (+₹${profit} profit) 🎉`, 'success');
            this.resetForm();

            // Refresh dashboard, customers, and reports
            if (window.DashboardModule) window.DashboardModule.loadStats();
            if (window.RemindersModule) window.RemindersModule.loadReminders();
            if (window.ReportsModule) window.ReportsModule.loadReports();
            if (window.CustomersModule) window.CustomersModule.loadCustomers();

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
