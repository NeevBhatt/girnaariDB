/**
 * GIR NAARI - UNIFIED DATA ACCESS REPOSITORY
 * Performs all CRUD operations on the 3 tables (customers, orders, reminders).
 * Uses live Supabase PostgreSQL client with automatic self-healing on PGRST125 path errors.
 */

window.DB = {
    // --------------------------------------------------------------------------
    // SELF-HEALING SUPABASE QUERY RUNNER
    // Catches PGRST125 ("Invalid path specified in request URL"), normalizes origin, and retries automatically
    // --------------------------------------------------------------------------
    async exec(queryFn) {
        let client = window.GirNaariDB.getClient();
        if (!client || window.GirNaariDB.isMock()) return null;

        let res = await queryFn(client);
        if (res && res.error && res.error.code === 'PGRST125') {
            console.warn('⚠️ PGRST125 invalid path detected. Force-reinitializing Supabase client with clean origin and retrying...');
            window.GirNaariDB.forceReinit();
            client = window.GirNaariDB.getClient();
            res = await queryFn(client);
        }
        if (res && res.error) throw res.error;
        return res ? res.data : null;
    },

    // --------------------------------------------------------------------------
    // CUSTOMERS
    // --------------------------------------------------------------------------
    async getCustomers() {
        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            const data = await this.exec(c => 
                c.from('customers').select('*').order('name', { ascending: true })
            );
            return data || [];
        } else {
            const items = JSON.parse(localStorage.getItem('gn_customers') || '[]');
            return items.sort((a, b) => a.name.localeCompare(b.name));
        }
    },

    async getCustomerById(id) {
        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            return await this.exec(c => 
                c.from('customers').select('*').eq('id', id).single()
            );
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

        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            return await this.exec(c => 
                c.from('customers').insert([payload]).select().single()
            );
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

        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            return await this.exec(c => 
                c.from('customers').update(payload).eq('id', id).select().single()
            );
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
        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            await this.exec(c => c.from('customers').delete().eq('id', id));
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
        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            const data = await this.exec(c => 
                c.from('orders')
                    .select('*, customers (id, name, phone, area)')
                    .order('order_date', { ascending: false })
                    .order('created_at', { ascending: false })
            );
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
        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            const data = await this.exec(c => 
                c.from('orders')
                    .select('*')
                    .eq('customer_id', customerId)
                    .order('order_date', { ascending: false })
                    .order('created_at', { ascending: false })
            );
            return data || [];
        } else {
            const orders = JSON.parse(localStorage.getItem('gn_orders') || '[]');
            return orders
                .filter(o => o.customer_id === customerId)
                .sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        }
    },

    async getOrderById(id) {
        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            return await this.exec(c => 
                c.from('orders')
                    .select('*, customers (id, name, phone, area)')
                    .eq('id', id)
                    .single()
            );
        } else {
            const orders = await this.getOrders();
            return orders.find(o => o.id === id) || null;
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

        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            return await this.exec(c => 
                c.from('orders').insert([payload]).select().single()
            );
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

        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            return await this.exec(c => 
                c.from('orders').update(payload).eq('id', id).select().single()
            );
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
        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            await this.exec(c => c.from('orders').delete().eq('id', id));
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
        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            const data = await this.exec(c => 
                c.from('reminders').select('*').order('last_contacted_at', { ascending: false })
            );
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

        if (window.GirNaariDB.getClient() && !window.GirNaariDB.isMock()) {
            return await this.exec(c => 
                c.from('reminders').insert([payload]).select().single()
            );
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
                const todayStr = now.toISOString().split('T')[0];
                const createdStr = createdDate.toISOString().split('T')[0];
                const diffDays = Math.max(0, Math.round((new Date(todayStr + 'T00:00:00') - new Date(createdStr + 'T00:00:00')) / (1000 * 60 * 60 * 24)));
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
                const todayStr = now.toISOString().split('T')[0];
                const orderStr = latestOrder.order_date;
                const diffDays = Math.max(0, Math.round((new Date(todayStr + 'T00:00:00') - new Date(orderStr + 'T00:00:00')) / (1000 * 60 * 60 * 24)));

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
    },

    // --------------------------------------------------------------------------
    // OFFLINE-TO-SUPABASE SYNC
    // Detects and uploads any orders added locally before connecting Supabase
    // --------------------------------------------------------------------------
    hasUnsyncedLocalOrders() {
        try {
            const localOrders = JSON.parse(localStorage.getItem('gn_orders') || '[]');
            // Orders created while in mock/offline mode have IDs starting with 'ord_'
            const unsynced = localOrders.filter(o => 
                (o.id && o.id.startsWith('ord_')) && !o._synced_to_supabase
            );
            return unsynced.length;
        } catch (e) {
            return 0;
        }
    },

    getLocalOrdersForSync() {
        try {
            const localOrders = JSON.parse(localStorage.getItem('gn_orders') || '[]');
            const localCustomers = JSON.parse(localStorage.getItem('gn_customers') || '[]');
            const custMap = new Map(localCustomers.map(c => [c.id, c]));

            const unsynced = localOrders.filter(o => 
                (o.id && o.id.startsWith('ord_')) && !o._synced_to_supabase
            );

            return unsynced.map(o => ({
                ...o,
                customer: custMap.get(o.customer_id) || { name: 'Customer', phone: '', area: 'Ahmedabad' }
            }));
        } catch (e) {
            return [];
        }
    },

    async syncLocalDataToSupabase() {
        const client = window.GirNaariDB.getClient();
        if (!client || window.GirNaariDB.isMock()) {
            throw new Error('Supabase live database is not connected. Please check Settings.');
        }

        const localOrders = JSON.parse(localStorage.getItem('gn_orders') || '[]');
        const localCustomers = JSON.parse(localStorage.getItem('gn_customers') || '[]');
        const custMap = new Map(localCustomers.map(c => [c.id, c]));

        // Identify orders to sync: any user-created orders starting with 'ord_', or any unsynced
        let toSync = localOrders.filter(o => (o.id && o.id.startsWith('ord_')) && !o._synced_to_supabase);
        
        // If no 'ord_' found but user has local orders and Supabase is empty, allow syncing all local orders
        if (toSync.length === 0) {
            const { count } = await client.from('orders').select('*', { count: 'exact', head: true });
            if (count === 0 && localOrders.length > 0) {
                toSync = localOrders.filter(o => !o._synced_to_supabase);
            }
        }

        if (toSync.length === 0) {
            return { success: true, count: 0, message: 'No offline orders to sync.' };
        }

        let syncedOrdersCount = 0;
        let syncedCustCount = 0;

        // Fetch existing Supabase customers to avoid duplicates
        const { data: supaCusts, error: custErr } = await client.from('customers').select('*');
        if (custErr) throw custErr;

        const supaCustMapByPhone = new Map();
        const supaCustMapByName = new Map();
        (supaCusts || []).forEach(c => {
            if (c.phone) supaCustMapByPhone.set(c.phone.replace(/[^0-9]/g, '').slice(-10), c);
            if (c.name) supaCustMapByName.set(c.name.trim().toLowerCase(), c);
        });

        for (const order of toSync) {
            const localCust = custMap.get(order.customer_id);
            let targetSupaCustId = null;

            if (localCust) {
                const cleanPhone = (localCust.phone || '').replace(/[^0-9]/g, '').slice(-10);
                const normName = (localCust.name || '').trim().toLowerCase();

                let existingSupaCust = supaCustMapByPhone.get(cleanPhone) || supaCustMapByName.get(normName);

                if (existingSupaCust) {
                    targetSupaCustId = existingSupaCust.id;
                } else {
                    // Create customer in Supabase
                    const newCustPayload = {
                        name: localCust.name ? localCust.name.trim() : 'Customer',
                        phone: cleanPhone || '9825000000',
                        area: localCust.area ? localCust.area.trim() : 'Ahmedabad',
                        address: localCust.address ? localCust.address.trim() : '',
                        customer_type: localCust.customer_type || 'Regular',
                        notes: localCust.notes || ''
                    };

                    const { data: insertedCust, error: insErr } = await client
                        .from('customers')
                        .insert([newCustPayload])
                        .select()
                        .single();

                    if (insErr) throw insErr;
                    targetSupaCustId = insertedCust.id;
                    syncedCustCount++;
                    supaCustMapByPhone.set(cleanPhone, insertedCust);
                    supaCustMapByName.set(normName, insertedCust);
                }
            }

            if (!targetSupaCustId) {
                // If customer not found, create a generic one
                const { data: genericCust } = await client
                    .from('customers')
                    .insert([{ name: 'Customer', phone: '9825000000', area: 'Ahmedabad' }])
                    .select()
                    .single();
                targetSupaCustId = genericCust.id;
            }

            // Insert order into Supabase
            const orderPayload = {
                customer_id: targetSupaCustId,
                order_date: order.order_date || new Date().toISOString().split('T')[0],
                quantity: parseFloat(order.quantity) || 1,
                unit: order.unit || 'litre',
                price: parseFloat(order.price) || 0,
                total: parseFloat(order.total) || (parseFloat(order.quantity) * parseFloat(order.price)),
                amount_paid: parseFloat(order.amount_paid) || 0,
                payment_method: order.payment_method || 'Cash',
                notes: order.notes || ''
            };

            const { error: ordErr } = await client
                .from('orders')
                .insert([orderPayload]);

            if (ordErr) throw ordErr;

            // Mark this local order as synced
            order._synced_to_supabase = true;
            syncedOrdersCount++;
        }

        // Save updated localOrders back to localStorage
        localStorage.setItem('gn_orders', JSON.stringify(localOrders));

        return {
            success: true,
            count: syncedOrdersCount,
            customersCount: syncedCustCount,
            message: `Successfully uploaded ${syncedOrdersCount} order(s) to Supabase! Now visible on all family phones.`
        };
    }
};

