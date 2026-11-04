/**
 * GIR NAARI - UNIFIED DATA ACCESS REPOSITORY
 * Performs all CRUD operations on the 3 tables (customers, orders, reminders).
 * Uses live Supabase PostgreSQL client, with seamless fallback for testing.
 */

window.DB = {
    // --------------------------------------------------------------------------
    // CUSTOMERS
    // --------------------------------------------------------------------------
    async getCustomers() {
        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { data, error } = await client
                .from('customers')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        } else {
            const items = JSON.parse(localStorage.getItem('gn_customers') || '[]');
            return items.sort((a, b) => a.name.localeCompare(b.name));
        }
    },

    async getCustomerById(id) {
        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { data, error } = await client
                .from('customers')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } else {
            const items = JSON.parse(localStorage.getItem('gn_customers') || '[]');
            return items.find(c => c.id === id) || null;
        }
    },

    async createCustomer(customer) {
        // Sanitize phone (numbers only for clean WhatsApp/calling)
        const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
        const payload = {
            name: customer.name.trim(),
            phone: cleanPhone,
            area: customer.area.trim(),
            address: (customer.address || '').trim(),
            customer_type: customer.customer_type || 'Regular',
            notes: (customer.notes || '').trim()
        };

        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { data, error } = await client
                .from('customers')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const items = JSON.parse(localStorage.getItem('gn_customers') || '[]');
            const newCustomer = {
                id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                ...payload,
                created_at: new Date().toISOString()
            };
            items.push(newCustomer);
            localStorage.setItem('gn_customers', JSON.stringify(items));
            return newCustomer;
        }
    },

    async updateCustomer(id, customer) {
        const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
        const payload = {
            name: customer.name.trim(),
            phone: cleanPhone,
            area: customer.area.trim(),
            address: (customer.address || '').trim(),
            customer_type: customer.customer_type || 'Regular',
            notes: (customer.notes || '').trim()
        };

        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { data, error } = await client
                .from('customers')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const items = JSON.parse(localStorage.getItem('gn_customers') || '[]');
            const index = items.findIndex(c => c.id === id);
            if (index === -1) throw new Error('Customer not found');
            items[index] = { ...items[index], ...payload };
            localStorage.setItem('gn_customers', JSON.stringify(items));
            return items[index];
        }
    },

    async deleteCustomer(id) {
        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { error } = await client
                .from('customers')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } else {
            let items = JSON.parse(localStorage.getItem('gn_customers') || '[]');
            items = items.filter(c => c.id !== id);
            localStorage.setItem('gn_customers', JSON.stringify(items));

            // Cascade delete orders & reminders in mock mode
            let orders = JSON.parse(localStorage.getItem('gn_orders') || '[]');
            orders = orders.filter(o => o.customer_id !== id);
            localStorage.setItem('gn_orders', JSON.stringify(orders));

            let reminders = JSON.parse(localStorage.getItem('gn_reminders') || '[]');
            reminders = reminders.filter(r => r.customer_id !== id);
            localStorage.setItem('gn_reminders', JSON.stringify(reminders));
            return true;
        }
    },

    // --------------------------------------------------------------------------
    // ORDERS
    // --------------------------------------------------------------------------
    async getOrders() {
        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { data, error } = await client
                .from('orders')
                .select('*, customers (id, name, phone, area)')
                .order('order_date', { ascending: false })
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } else {
            const orders = JSON.parse(localStorage.getItem('gn_orders') || '[]');
            const customers = JSON.parse(localStorage.getItem('gn_customers') || '[]');
            const custMap = new Map(customers.map(c => [c.id, c]));

            return orders.map(o => ({
                ...o,
                customers: custMap.get(o.customer_id) || { name: 'Unknown Customer', phone: '', area: '' }
            })).sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        }
    },

    async getOrdersByCustomerId(customerId) {
        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { data, error } = await client
                .from('orders')
                .select('*')
                .eq('customer_id', customerId)
                .order('order_date', { ascending: false })
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } else {
            const orders = JSON.parse(localStorage.getItem('gn_orders') || '[]');
            return orders
                .filter(o => o.customer_id === customerId)
                .sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        }
    },

    async createOrder(order) {
        const quantity = parseFloat(order.quantity) || 0;
        const price = parseFloat(order.price) || 0;
        const total = parseFloat(order.total) || (quantity * price);
        const amount_paid = parseFloat(order.amount_paid) || 0;

        const payload = {
            customer_id: order.customer_id,
            order_date: order.order_date || new Date().toISOString().split('T')[0],
            quantity: quantity,
            unit: order.unit || 'litre',
            price: price,
            total: total,
            amount_paid: amount_paid,
            payment_method: order.payment_method || 'Cash',
            notes: (order.notes || '').trim()
        };

        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { data, error } = await client
                .from('orders')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const orders = JSON.parse(localStorage.getItem('gn_orders') || '[]');
            const newOrder = {
                id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                ...payload,
                created_at: new Date().toISOString()
            };
            orders.unshift(newOrder);
            localStorage.setItem('gn_orders', JSON.stringify(orders));
            return newOrder;
        }
    },

    async updateOrder(id, order) {
        const quantity = parseFloat(order.quantity) || 0;
        const price = parseFloat(order.price) || 0;
        const total = parseFloat(order.total) || (quantity * price);
        const amount_paid = parseFloat(order.amount_paid) || 0;

        const payload = {
            order_date: order.order_date,
            quantity: quantity,
            unit: order.unit,
            price: price,
            total: total,
            amount_paid: amount_paid,
            payment_method: order.payment_method,
            notes: (order.notes || '').trim()
        };

        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { data, error } = await client
                .from('orders')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const orders = JSON.parse(localStorage.getItem('gn_orders') || '[]');
            const idx = orders.findIndex(o => o.id === id);
            if (idx === -1) throw new Error('Order not found');
            orders[idx] = { ...orders[idx], ...payload };
            localStorage.setItem('gn_orders', JSON.stringify(orders));
            return orders[idx];
        }
    },

    async deleteOrder(id) {
        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { error } = await client
                .from('orders')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } else {
            let orders = JSON.parse(localStorage.getItem('gn_orders') || '[]');
            orders = orders.filter(o => o.id !== id);
            localStorage.setItem('gn_orders', JSON.stringify(orders));
            return true;
        }
    },

    // --------------------------------------------------------------------------
    // REMINDERS & CONTACT HISTORY
    // --------------------------------------------------------------------------
    async getReminders() {
        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { data, error } = await client
                .from('reminders')
                .select('*')
                .order('last_contacted_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } else {
            return JSON.parse(localStorage.getItem('gn_reminders') || '[]');
        }
    },

    async markContacted(customerId, notes = '') {
        const payload = {
            customer_id: customerId,
            last_contacted_at: new Date().toISOString(),
            notes: notes.trim()
        };

        const client = window.GirNaariDB.getClient();
        if (client && !window.GirNaariDB.isMock()) {
            const { data, error } = await client
                .from('reminders')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const reminders = JSON.parse(localStorage.getItem('gn_reminders') || '[]');
            const newReminder = {
                id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                ...payload,
                created_at: new Date().toISOString()
            };
            reminders.unshift(newReminder);
            localStorage.setItem('gn_reminders', JSON.stringify(reminders));
            return newReminder;
        }
    },

    // --------------------------------------------------------------------------
    // AGGREGATIONS & BUSINESS LOGIC
    // --------------------------------------------------------------------------
    async getCustomerSummary(customerId) {
        const orders = await this.getOrdersByCustomerId(customerId);
        let totalQtyLitre = 0;
        let totalAmount = 0;
        let totalPaid = 0;
        let latestOrderDate = null;

        for (const order of orders) {
            totalAmount += parseFloat(order.total) || 0;
            totalPaid += parseFloat(order.amount_paid) || 0;
            totalQtyLitre += parseFloat(order.quantity) || 0;

            if (!latestOrderDate || new Date(order.order_date) > new Date(latestOrderDate)) {
                latestOrderDate = order.order_date;
            }
        }

        return {
            totalOrders: orders.length,
            totalQuantity: totalQtyLitre,
            totalAmount: totalAmount,
            totalPaid: totalPaid,
            pendingBalance: Math.max(0, totalAmount - totalPaid),
            latestOrderDate: latestOrderDate,
            orders: orders
        };
    },

    /**
     * Calculates customer reminders:
     * - Checks latest order date for each customer
     * - Threshold: 40 days
     * - If >= 40 days since last order, customer is due
     * - Groups result by Area
     */
    async getDueReminders(thresholdDays = 40) {
        const customers = await this.getCustomers();
        const orders = await this.getOrders();
        const reminders = await this.getReminders();

        // Map latest order per customer
        const latestOrderMap = new Map();
        for (const order of orders) {
            const custId = order.customer_id;
            const existing = latestOrderMap.get(custId);
            if (!existing || new Date(order.order_date) > new Date(existing.order_date)) {
                latestOrderMap.set(custId, order);
            }
        }

        // Map latest reminder per customer
        const latestReminderMap = new Map();
        for (const reminder of reminders) {
            const custId = reminder.customer_id;
            const existing = latestReminderMap.get(custId);
            if (!existing || new Date(reminder.last_contacted_at) > new Date(existing.last_contacted_at)) {
                latestReminderMap.set(custId, reminder);
            }
        }

        const now = new Date();
        const dueList = [];

        for (const customer of customers) {
            const latestOrder = latestOrderMap.get(customer.id);
            if (!latestOrder) {
                // If customer has never ordered, check registration date
                const createdDate = new Date(customer.created_at || now);
                const diffDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
                if (diffDays >= thresholdDays) {
                    const lastReminder = latestReminderMap.get(customer.id);
                    dueList.push({
                        customer: customer,
                        lastOrderDate: null,
                        daysSinceLastOrder: diffDays,
                        lastOrderQuantity: 0,
                        lastOrderUnit: 'litre',
                        lastContactedAt: lastReminder ? lastReminder.last_contacted_at : null,
                        isNeverOrdered: true
                    });
                }
            } else {
                const orderDate = new Date(latestOrder.order_date);
                const diffDays = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

                if (diffDays >= thresholdDays) {
                    const lastReminder = latestReminderMap.get(customer.id);
                    dueList.push({
                        customer: customer,
                        lastOrderDate: latestOrder.order_date,
                        daysSinceLastOrder: diffDays,
                        lastOrderQuantity: latestOrder.quantity,
                        lastOrderUnit: latestOrder.unit,
                        lastContactedAt: lastReminder ? lastReminder.last_contacted_at : null,
                        isNeverOrdered: false
                    });
                }
            }
        }

        // Sort by days since last order descending (most overdue first)
        dueList.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);

        // Group by Area
        const areaGroups = {};
        for (const item of dueList) {
            const area = (item.customer.area || 'Other / General').trim();
            if (!areaGroups[area]) {
                areaGroups[area] = [];
            }
            areaGroups[area].push(item);
        }

        return {
            totalDue: dueList.length,
            groups: areaGroups,
            flatList: dueList
        };
    },

    /**
     * Dashboard Statistics
     */
    async getDashboardStats() {
        const customers = await this.getCustomers();
        const orders = await this.getOrders();
        const reminderData = await this.getDueReminders(window.CONFIG.business.reminderThresholdDays || 40);

        const todayStr = new Date().toISOString().split('T')[0];
        let todayOrdersCount = 0;
        let todaySales = 0;
        let totalPendingPayments = 0;

        for (const order of orders) {
            const total = parseFloat(order.total) || 0;
            const paid = parseFloat(order.amount_paid) || 0;
            const pending = Math.max(0, total - paid);
            totalPendingPayments += pending;

            if (order.order_date === todayStr) {
                todayOrdersCount++;
                todaySales += total;
            }
        }

        const recentOrders = orders.slice(0, 5);

        return {
            totalCustomers: customers.length,
            todayOrdersCount,
            todaySales,
            totalPendingPayments,
            dueRemindersCount: reminderData.totalDue,
            recentOrders
        };
    }
};

