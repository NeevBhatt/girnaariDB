/**
 * GIR NAARI - DASHBOARD MODULE
 * Clean, fast, live overview: Customers count, Today's orders & sales,
 * pending payments, 40-day reminders count, quick order CTA, and recent orders list.
 */

window.DashboardModule = {
    async init() {
        await this.loadStats();
    },

    async loadStats() {
        try {
            const stats = await window.DB.getDashboardStats();

            // Total Customers
            const elCust = document.getElementById('dashTotalCustomers');
            if (elCust) elCust.textContent = stats.totalCustomers;

            // Today's Orders
            const elTodayOrd = document.getElementById('dashTodayOrders');
            if (elTodayOrd) elTodayOrd.textContent = stats.todayOrdersCount;

            // Today's Sales
            const elTodaySales = document.getElementById('dashTodaySales');
            if (elTodaySales) elTodaySales.textContent = '₹' + stats.todaySales.toLocaleString('en-IN');

            // Pending Payments
            const elPending = document.getElementById('dashPendingPayments');
            if (elPending) elPending.textContent = '₹' + stats.totalPendingPayments.toLocaleString('en-IN');

            // Due Reminders
            const elReminders = document.getElementById('dashDueReminders');
            if (elReminders) elReminders.textContent = stats.dueRemindersCount;

            // Render Recent Orders
            this.renderRecentOrders(stats.recentOrders);

        } catch (err) {
            console.error('Error loading dashboard stats:', err);
        }
    },

    renderRecentOrders(orders) {
        const container = document.getElementById('dashRecentOrdersList');
        if (!container) return;

        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-3">
                    <p>No ghee orders recorded yet today.</p>
                    <button type="button" class="btn btn-sm btn-primary mt-1" onclick="App.navigateTo('orders')">
                        ➕ Add First Order
                    </button>
                </div>
            `;
            return;
        }

        const html = orders.map(order => {
            const custName = order.customers ? order.customers.name : 'Customer';
            const custArea = order.customers ? order.customers.area : '';
            const pending = Math.max(0, (parseFloat(order.total) || 0) - (parseFloat(order.amount_paid) || 0));

            return `
                <div class="dash-order-row">
                    <div class="dor-left">
                        <div class="dor-name-line">
                            <strong>${this.escapeHTML(custName)}</strong>
                            ${custArea ? `<span class="dor-area">📍 ${this.escapeHTML(custArea)}</span>` : ''}
                        </div>
                        <div class="dor-meta">
                            <span>📦 <strong>${order.quantity} ${order.unit}</strong></span>
                            <span>•</span>
                            <span>📅 ${this.formatDate(order.order_date)}</span>
                            <span>•</span>
                            <span class="pay-method">${order.payment_method}</span>
                        </div>
                    </div>
                    <div class="dor-right">
                        <div class="dor-amount">₹${Number(order.total).toLocaleString('en-IN')}</div>
                        ${pending > 0 
                            ? `<span class="badge-pending">₹${pending} due</span>` 
                            : `<span class="badge-paid">Paid ✓</span>`}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            const today = new Date().toISOString().split('T')[0];
            if (dateStr === today) return 'Today';
            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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

