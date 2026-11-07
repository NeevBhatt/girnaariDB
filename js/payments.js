/**
 * GIR NAARI - PAYMENTS MODULE
 * Enables 1-tap delayed payment settlement for unpaid or partially paid ghee orders.
 * Works seamlessly from Customer History, Reports Pending Register, and Dashboard.
 */

window.PaymentsModule = {
    currentOrder: null,

    init() {
        const form = document.getElementById('paymentForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handlePaymentSubmit(e));
        }

        const btnFull = document.getElementById('btnPayFullBalance');
        if (btnFull) {
            btnFull.addEventListener('click', () => {
                const bal = parseFloat(document.getElementById('payOrderBalance').value) || 0;
                document.getElementById('payAmountReceived').value = bal;
            });
        }

        const btnHalf = document.getElementById('btnPayHalfBalance');
        if (btnHalf) {
            btnHalf.addEventListener('click', () => {
                const bal = parseFloat(document.getElementById('payOrderBalance').value) || 0;
                document.getElementById('payAmountReceived').value = Math.round(bal / 2);
            });
        }
    },

    async openPaymentModal(orderId) {
        try {
            // Find the order
            const orders = await window.DB.getOrders();
            const order = orders.find(o => o.id === orderId);
            if (!order) {
                window.App.showToast('Order not found.', 'error');
                return;
            }

            this.currentOrder = order;

            const total = parseFloat(order.total) || 0;
            const currentPaid = parseFloat(order.amount_paid) || 0;
            const balance = Math.max(0, total - currentPaid);

            if (balance <= 0) {
                window.App.showToast('This order is already fully paid! ✓', 'info');
                return;
            }

            const custName = order.customers ? order.customers.name : 'Customer';
            const custPhone = order.customers ? order.customers.phone : '';

            // Populate form hidden fields
            document.getElementById('payOrderId').value = order.id;
            document.getElementById('payCustomerId').value = order.customer_id;
            document.getElementById('payOrderTotal').value = total;
            document.getElementById('payCurrentPaid').value = currentPaid;
            document.getElementById('payOrderBalance').value = balance;

            // Default amount received to the entire remaining balance
            document.getElementById('payAmountReceived').value = balance;

            // Summary box
            const summaryBox = document.getElementById('paymentOrderSummary');
            if (summaryBox) {
                summaryBox.innerHTML = `
                    <div class="osb-row">
                        <strong>👤 ${this.escapeHTML(custName)}</strong>
                        <span class="text-muted">📞 ${this.escapeHTML(custPhone)}</span>
                    </div>
                    <div class="osb-row">
                        <span>📦 <strong>${order.quantity} ${order.unit}</strong> @ ₹${order.price}</span>
                        <span>📅 ${order.order_date || 'N/A'}</span>
                    </div>
                    <div class="osb-row">
                        <span>Order Total: <strong>₹${total.toLocaleString('en-IN')}</strong></span>
                        <span>Already Paid: <strong class="text-success">₹${currentPaid.toLocaleString('en-IN')}</strong></span>
                    </div>
                    <div class="osb-row osb-balance-row">
                        <span>Outstanding Balance:</span>
                        <span class="osb-balance">₹${balance.toLocaleString('en-IN')}</span>
                    </div>
                `;
            }

            // Quick button labels
            const btnFull = document.getElementById('btnPayFullBalance');
            if (btnFull) btnFull.textContent = `✓ Full Balance (₹${balance.toLocaleString('en-IN')})`;
            const btnHalf = document.getElementById('btnPayHalfBalance');
            if (btnHalf) btnHalf.textContent = `½ Half (₹${Math.round(balance / 2).toLocaleString('en-IN')})`;

            const modal = document.getElementById('paymentModal');
            if (modal) modal.classList.add('active');

            setTimeout(() => {
                const input = document.getElementById('payAmountReceived');
                if (input) input.focus();
            }, 100);

        } catch (err) {
            console.error('Error opening payment modal:', err);
            window.App.showToast('Error loading payment details: ' + err.message, 'error');
        }
    },

    async openSettleForCustomer(customerId) {
        try {
            const orders = await window.DB.getOrdersByCustomerId(customerId);
            const pendingOrders = orders.filter(o => {
                const total = parseFloat(o.total) || 0;
                const paid = parseFloat(o.amount_paid) || 0;
                return (total - paid) > 0;
            });

            if (pendingOrders.length === 0) {
                window.App.showToast('This customer has no pending balance! All clear ✓', 'success');
                return;
            }

            if (pendingOrders.length === 1) {
                // Exactly 1 pending order - directly open settlement for it!
                await this.openPaymentModal(pendingOrders[0].id);
            } else {
                // Multiple unpaid orders - open customer history so user can choose
                window.App.showToast(`Customer has ${pendingOrders.length} pending orders. Tap "Record Payment" on the order to settle.`, 'info');
                if (window.CustomersModule) {
                    await window.CustomersModule.viewCustomerHistory(customerId);
                }
            }
        } catch (err) {
            console.error('Error settling customer orders:', err);
            window.App.showToast('Error: ' + err.message, 'error');
        }
    },

    closeModal() {
        const modal = document.getElementById('paymentModal');
        if (modal) modal.classList.remove('active');
        this.currentOrder = null;
    },

    async handlePaymentSubmit(e) {
        e.preventDefault();

        const orderId = document.getElementById('payOrderId').value;
        const customerId = document.getElementById('payCustomerId').value;
        const total = parseFloat(document.getElementById('payOrderTotal').value) || 0;
        const currentPaid = parseFloat(document.getElementById('payCurrentPaid').value) || 0;
        const amountReceivedNow = parseFloat(document.getElementById('payAmountReceived').value) || 0;
        const method = document.getElementById('payPaymentMethod').value || 'UPI';
        const notes = document.getElementById('payNotes').value.trim();

        if (amountReceivedNow <= 0 || isNaN(amountReceivedNow)) {
            window.App.showToast('Please enter a valid amount received.', 'error');
            return;
        }

        const newPaid = currentPaid + amountReceivedNow;
        const remainingAfter = Math.max(0, total - newPaid);

        if (newPaid > total) {
            if (!confirm(`New total paid (₹${newPaid}) will exceed total order amount (₹${total}). Do you wish to continue?`)) {
                return;
            }
        }

        const submitBtn = document.getElementById('btnSavePayment');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving Payment...';
        }

        try {
            // Fetch latest order record
            const order = this.currentOrder || (await window.DB.getOrders()).find(o => o.id === orderId);
            if (!order) throw new Error('Order not found');

            // Format note stamp
            const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const paymentStamp = `[+₹${amountReceivedNow} via ${method} on ${todayStr}${notes ? ': ' + notes : ''}]`;
            const updatedNotes = order.notes ? `${order.notes} | ${paymentStamp}` : paymentStamp;

            const updatedPayload = {
                ...order,
                amount_paid: newPaid,
                payment_method: method, // update to latest payment method
                notes: updatedNotes
            };

            await window.DB.updateOrder(orderId, updatedPayload);

            const custName = (order.customers && order.customers.name) ? order.customers.name : 'Customer';
            if (remainingAfter === 0) {
                window.App.showToast(`🎉 ₹${amountReceivedNow.toLocaleString('en-IN')} received for ${custName}! Order is now FULLY PAID ✓`, 'success');
            } else {
                window.App.showToast(`Payment of ₹${amountReceivedNow.toLocaleString('en-IN')} recorded! Remaining balance: ₹${remainingAfter.toLocaleString('en-IN')}`, 'success');
            }

            this.closeModal();

            // Refresh UI across modules
            if (window.DashboardModule) window.DashboardModule.loadStats();
            if (window.ReportsModule) window.ReportsModule.loadReports();
            if (window.CustomersModule) {
                await window.CustomersModule.loadCustomers();
                // If customer history was open, refresh it in place
                const historyModal = document.getElementById('historyModal');
                if (historyModal && historyModal.classList.contains('active') && customerId) {
                    window.CustomersModule.viewCustomerHistory(customerId);
                }
            }

        } catch (err) {
            console.error('Error saving payment:', err);
            window.App.showToast('Failed to record payment: ' + (err.message || 'Database error'), 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>✓ Confirm & Save Payment</span>';
            }
        }
    },

    escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }
};
