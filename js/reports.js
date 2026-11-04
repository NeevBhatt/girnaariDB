/**
 * GIR NAARI - REPORTS & PAYMENT TRACKING MODULE
 * Sales summaries (Today, Month, Custom Date Range),
 * Total quantity sold, Cash vs Online collections, Pending Payments register,
 * and one-click CSV export.
 */

window.ReportsModule = {
    allOrders: [],
    allCustomers: [],
    filteredOrders: [],

    async init() {
        this.bindEvents();
        await this.loadReports();
    },

    bindEvents() {
        const filterPreset = document.getElementById('reportDatePreset');
        const startDate = document.getElementById('reportStartDate');
        const endDate = document.getElementById('reportEndDate');
        const btnApply = document.getElementById('btnApplyReportFilter');
        const btnExportCsv = document.getElementById('btnExportOrdersCsv');
        const btnExportPending = document.getElementById('btnExportPendingCsv');

        if (filterPreset) {
            filterPreset.addEventListener('change', (e) => this.handlePresetChange(e.target.value));
        }

        if (btnApply) {
            btnApply.addEventListener('click', () => this.applyDateFilter());
        }

        if (btnExportCsv) {
            btnExportCsv.addEventListener('click', () => this.exportOrdersCSV());
        }

        if (btnExportPending) {
            btnExportPending.addEventListener('click', () => this.exportPendingCSV());
        }
    },

    handlePresetChange(preset) {
        const startInput = document.getElementById('reportStartDate');
        const endInput = document.getElementById('reportEndDate');
        const today = new Date();

        if (preset === 'today') {
            const todayStr = today.toISOString().split('T')[0];
            startInput.value = todayStr;
            endInput.value = todayStr;
        } else if (preset === 'this_month') {
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            startInput.value = `${y}-${m}-01`;
            endInput.value = today.toISOString().split('T')[0];
        } else if (preset === 'last_30') {
            const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            startInput.value = past.toISOString().split('T')[0];
            endInput.value = today.toISOString().split('T')[0];
        } else if (preset === 'all') {
            startInput.value = '';
            endInput.value = '';
        }

        this.applyDateFilter();
    },

    async loadReports() {
        try {
            this.allOrders = await window.DB.getOrders();
            this.allCustomers = await window.DB.getCustomers();
            
            // Default to 'this_month'
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const startInput = document.getElementById('reportStartDate');
            const endInput = document.getElementById('reportEndDate');
            if (startInput && !startInput.value) startInput.value = `${y}-${m}-01`;
            if (endInput && !endInput.value) endInput.value = today.toISOString().split('T')[0];

            this.applyDateFilter();
            this.renderPendingPaymentsRegister();
            this.renderAreaCustomerSummary();

        } catch (err) {
            console.error('Error loading reports:', err);
        }
    },

    applyDateFilter() {
        const startVal = document.getElementById('reportStartDate').value;
        const endVal = document.getElementById('reportEndDate').value;

        this.filteredOrders = this.allOrders.filter(order => {
            const d = order.order_date;
            if (startVal && d < startVal) return false;
            if (endVal && d > endVal) return false;
            return true;
        });

        this.calculateAndRenderMetrics();
        this.renderFilteredOrdersTable();
    },

    calculateAndRenderMetrics() {
        let totalSales = 0;
        let totalReceived = 0;
        let totalPending = 0;
        let cashCollected = 0;
        let onlineCollected = 0;
        let totalQtySold = 0;

        for (const order of this.filteredOrders) {
            const total = parseFloat(order.total) || 0;
            const paid = parseFloat(order.amount_paid) || 0;
            const pending = Math.max(0, total - paid);
            const qty = parseFloat(order.quantity) || 0;

            totalSales += total;
            totalReceived += paid;
            totalPending += pending;
            totalQtySold += qty;

            if (order.payment_method === 'Cash') {
                cashCollected += paid;
            } else {
                // UPI or Bank Transfer or Other
                onlineCollected += paid;
            }
        }

        document.getElementById('repTotalSales').textContent = '₹' + totalSales.toLocaleString('en-IN');
        document.getElementById('repTotalQuantity').textContent = totalQtySold + ' L';
        document.getElementById('repCashCollected').textContent = '₹' + cashCollected.toLocaleString('en-IN');
        document.getElementById('repOnlineCollected').textContent = '₹' + onlineCollected.toLocaleString('en-IN');
        document.getElementById('repTotalPending').textContent = '₹' + totalPending.toLocaleString('en-IN');
        document.getElementById('repOrdersCount').textContent = this.filteredOrders.length;
    },

    renderFilteredOrdersTable() {
        const container = document.getElementById('reportOrdersTableBody');
        if (!container) return;

        if (this.filteredOrders.length === 0) {
            container.innerHTML = `<tr><td colspan="7" class="text-center py-3">No orders found in this date range.</td></tr>`;
            return;
        }

        const html = this.filteredOrders.map(order => {
            const custName = order.customers ? order.customers.name : 'Unknown';
            const total = parseFloat(order.total) || 0;
            const paid = parseFloat(order.amount_paid) || 0;
            const pending = Math.max(0, total - paid);

            return `
                <tr>
                    <td>${order.order_date}</td>
                    <td><strong>${this.escapeHTML(custName)}</strong></td>
                    <td>${order.quantity} ${order.unit}</td>
                    <td>₹${order.price}</td>
                    <td>₹${total.toLocaleString('en-IN')}</td>
                    <td>
                        <span class="badge ${paid >= total ? 'badge-success' : 'badge-warning'}">
                            ₹${paid.toLocaleString('en-IN')} (${order.payment_method})
                        </span>
                    </td>
                    <td>
                        ${pending > 0 
                            ? `<span class="text-danger font-weight-bold">₹${pending.toLocaleString('en-IN')}</span>` 
                            : `<span class="text-success">Paid</span>`}
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = html;
    },

    renderPendingPaymentsRegister() {
        const container = document.getElementById('reportPendingPaymentsContainer');
        if (!container) return;

        // Group pending balances by customer
        const pendingMap = new Map();

        for (const order of this.allOrders) {
            const total = parseFloat(order.total) || 0;
            const paid = parseFloat(order.amount_paid) || 0;
            const pending = Math.max(0, total - paid);

            if (pending > 0) {
                const cid = order.customer_id;
                let entry = pendingMap.get(cid);
                if (!entry) {
                    entry = {
                        customer: order.customers || { name: 'Customer', phone: '', area: '' },
                        totalPending: 0,
                        ordersCount: 0,
                        orders: []
                    };
                    pendingMap.set(cid, entry);
                }
                entry.totalPending += pending;
                entry.ordersCount++;
                entry.orders.push(order);
            }
        }

        const pendingList = Array.from(pendingMap.values()).sort((a, b) => b.totalPending - a.totalPending);

        if (pendingList.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-3">
                    <p>🎉 All customer payments are fully settled! Zero pending balances.</p>
                </div>
            `;
            return;
        }

        const html = pendingList.map(item => {
            const c = item.customer;
            const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');

            return `
                <div class="pending-payment-card">
                    <div class="ppc-top">
                        <div class="ppc-name">
                            <strong>${this.escapeHTML(c.name)}</strong>
                            <span class="ppc-area">📍 ${this.escapeHTML(c.area)}</span>
                        </div>
                        <div class="ppc-amount text-danger">
                            ₹${item.totalPending.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div class="ppc-sub">
                        <span>${item.ordersCount} unpaid/partial order(s)</span>
                        <div class="ppc-actions">
                            ${cleanPhone ? `<a href="tel:+91${cleanPhone}" class="btn btn-sm btn-outline">📞 Call</a>` : ''}
                            ${cleanPhone ? `<a href="https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Namaste ${c.name} ji! Reminder regarding pending ghee payment of ₹${item.totalPending}. Thank you, Gir Naari.`)}" target="_blank" class="btn btn-sm btn-whatsapp">💬 WhatsApp</a>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    renderAreaCustomerSummary() {
        const container = document.getElementById('reportAreaSummaryContainer');
        if (!container) return;

        const areaMap = new Map();
        for (const c of this.allCustomers) {
            const area = (c.area || 'Other / General').trim();
            areaMap.set(area, (areaMap.get(area) || 0) + 1);
        }

        const sortedAreas = Array.from(areaMap.entries()).sort((a, b) => b[1] - a[1]);

        const html = `
            <div class="area-tag-grid">
                ${sortedAreas.map(([area, count]) => `
                    <div class="area-pill">
                        <span class="area-name">📍 ${this.escapeHTML(area)}</span>
                        <span class="area-count">${count} customers</span>
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = html;
    },

    exportOrdersCSV() {
        if (this.filteredOrders.length === 0) {
            window.App.showToast('No orders to export in this date range.', 'info');
            return;
        }

        const headers = ['Order Date', 'Customer Name', 'Phone', 'Area', 'Quantity', 'Unit', 'Price (Rs)', 'Total (Rs)', 'Amount Paid (Rs)', 'Pending (Rs)', 'Payment Method', 'Notes'];
        const rows = this.filteredOrders.map(o => {
            const total = parseFloat(o.total) || 0;
            const paid = parseFloat(o.amount_paid) || 0;
            const pending = Math.max(0, total - paid);
            const cust = o.customers || {};

            return [
                o.order_date,
                `"${(cust.name || '').replace(/"/g, '""')}"`,
                `"${(cust.phone || '').replace(/"/g, '""')}"`,
                `"${(cust.area || '').replace(/"/g, '""')}"`,
                o.quantity,
                o.unit,
                o.price,
                total,
                paid,
                pending,
                o.payment_method,
                `"${(o.notes || '').replace(/"/g, '""')}"`
            ];
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Gir_Naari_Orders_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.App.showToast('Orders exported to CSV! 📥', 'success');
    },

    exportPendingCSV() {
        const headers = ['Customer Name', 'Phone', 'Area', 'Total Orders', 'Total Billing (Rs)', 'Amount Paid (Rs)', 'Total Pending Balance (Rs)'];
        
        // Compute per customer
        const custStats = new Map();
        for (const order of this.allOrders) {
            const cid = order.customer_id;
            let s = custStats.get(cid);
            if (!s) {
                s = { cust: order.customers || {}, total: 0, paid: 0, orders: 0 };
                custStats.set(cid, s);
            }
            s.total += parseFloat(order.total) || 0;
            s.paid += parseFloat(order.amount_paid) || 0;
            s.orders++;
        }

        const rows = [];
        for (const [_, s] of custStats) {
            const pending = Math.max(0, s.total - s.paid);
            if (pending > 0) {
                rows.push([
                    `"${(s.cust.name || '').replace(/"/g, '""')}"`,
                    `"${(s.cust.phone || '').replace(/"/g, '""')}"`,
                    `"${(s.cust.area || '').replace(/"/g, '""')}"`,
                    s.orders,
                    s.total,
                    s.paid,
                    pending
                ]);
            }
        }

        if (rows.length === 0) {
            window.App.showToast('No pending balances to export!', 'info');
            return;
        }

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Gir_Naari_Pending_Payments_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.App.showToast('Pending payments exported to CSV! 📥', 'success');
    },

    escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
};

