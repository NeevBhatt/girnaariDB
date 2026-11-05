/**
 * GIR NAARI - SUPABASE CLIENT & DATA ACCESS LAYER
 * Lightweight wrapper for Supabase JS SDK with automatic URL cleanup and local storage fallback
 */

(function () {
    let client = null;
    let isMockMode = false;

    // Clean URL: strictly extract origin (https://xyz.supabase.co) ignoring any paths or /rest/v1
    function cleanSupabaseUrl(url) {
        if (!url) return 'https://xhfrdursmcibnnqrnwwg.supabase.co';
        try {
            let u = url.trim();
            if (!u.startsWith('http://') && !u.startsWith('https://')) {
                u = 'https://' + u;
            }
            return new URL(u).origin;
        } catch (e) {
            return 'https://xhfrdursmcibnnqrnwwg.supabase.co';
        }
    }

    // Check if Supabase keys are configured
    function initSupabase() {
        let rawUrl = window.CONFIG.supabase.url ? window.CONFIG.supabase.url.trim() : '';
        const key = window.CONFIG.supabase.anonKey ? window.CONFIG.supabase.anonKey.trim() : '';
        const url = cleanSupabaseUrl(rawUrl);

        // Keep CONFIG and localStorage in sync with cleaned URL
        window.CONFIG.supabase.url = url;
        if (localStorage.getItem('girnaari_supabase_url') !== url) {
            localStorage.setItem('girnaari_supabase_url', url);
        }

        if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                client = window.supabase.createClient(url, key, {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true
                    }
                });
                isMockMode = false;
                console.log('✅ Gir Naari: Connected to Supabase Live Database:', url);
            } catch (err) {
                console.warn('⚠️ Gir Naari: Failed to init Supabase client, falling back to local database', err);
                isMockMode = true;
            }
        } else {
            console.info('ℹ️ Gir Naari: Supabase credentials not configured. Running in Local Storage Mode.');
            isMockMode = true;
        }

        // Initialize local mock tables if empty (only for offline testing)
        if (isMockMode) {
            initLocalStorageData();
        }
    }

    // Default seed data for offline preview if database not connected
    function initLocalStorageData() {
        if (!localStorage.getItem('gn_customers')) {
            const initialCustomers = [
                {
                    id: 'c1b827e1-8890-410a-9d22-111111111111',
                    name: 'Rajesh Patel',
                    phone: '9825012345',
                    area: 'Gota',
                    address: 'A-402, Shivalik Residency, Gota, Ahmedabad',
                    customer_type: 'Regular',
                    notes: 'Prefers 1-litre glass jar packaging',
                    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'c2b827e1-8890-410a-9d22-222222222222',
                    name: 'Meenaben Shah',
                    phone: '9898023456',
                    area: 'Vaishnodevi Circle',
                    address: 'B-12, Satyamev Vista, SG Highway',
                    customer_type: 'Regular',
                    notes: 'Call 30 mins before home delivery',
                    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'c3b827e1-8890-410a-9d22-333333333333',
                    name: 'Jayeshbhai Soni',
                    phone: '9426034567',
                    area: 'Chandkheda',
                    address: 'Shop 4, Swagat Complex',
                    customer_type: 'Small Shop',
                    notes: 'Wholesale shop rate, regular 5L can buyer',
                    created_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'c4b827e1-8890-410a-9d22-444444444444',
                    name: 'Kavitaben Joshi',
                    phone: '9824045678',
                    area: 'Bodakdev',
                    address: 'Flat 701, Dev Aurum',
                    customer_type: 'Regular',
                    notes: 'Pays via Google Pay UPI immediately',
                    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'c5b827e1-8890-410a-9d22-555555555555',
                    name: 'Harshad Vora',
                    phone: '9727056789',
                    area: 'Gota',
                    address: 'Flat 104, Royal Palms',
                    customer_type: 'Regular',
                    notes: 'Likes yellow grain texture',
                    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
                }
            ];
            localStorage.setItem('gn_customers', JSON.stringify(initialCustomers));
        }

        if (!localStorage.getItem('gn_orders')) {
            const todayStr = new Date().toISOString().split('T')[0];
            const d15DaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const d45DaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const d52DaysAgo = new Date(Date.now() - 52 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const d65DaysAgo = new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const initialOrders = [
                {
                    id: 'o111-1111-1111',
                    customer_id: 'c1b827e1-8890-410a-9d22-111111111111',
                    order_date: d45DaysAgo,
                    quantity: 2,
                    unit: 'litre',
                    price: 1200,
                    total: 2400,
                    amount_paid: 2400,
                    payment_method: 'Cash',
                    notes: 'Paid cash on delivery',
                    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'o222-2222-2222',
                    customer_id: 'c2b827e1-8890-410a-9d22-222222222222',
                    order_date: d52DaysAgo,
                    quantity: 1,
                    unit: 'litre',
                    price: 1250,
                    total: 1250,
                    amount_paid: 1250,
                    payment_method: 'UPI',
                    notes: 'Google Pay to Papa',
                    created_at: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'o333-3333-3333',
                    customer_id: 'c3b827e1-8890-410a-9d22-333333333333',
                    order_date: d65DaysAgo,
                    quantity: 5,
                    unit: 'litre',
                    price: 1100,
                    total: 5500,
                    amount_paid: 3500,
                    payment_method: 'Bank Transfer',
                    notes: '₹2,000 balance pending for next batch',
                    created_at: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'o444-4444-4444',
                    customer_id: 'c4b827e1-8890-410a-9d22-444444444444',
                    order_date: d15DaysAgo,
                    quantity: 1,
                    unit: 'litre',
                    price: 1200,
                    total: 1200,
                    amount_paid: 1200,
                    payment_method: 'UPI',
                    notes: 'Paid full',
                    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'o555-5555-5555',
                    customer_id: 'c5b827e1-8890-410a-9d22-555555555555',
                    order_date: todayStr,
                    quantity: 2,
                    unit: 'litre',
                    price: 1200,
                    total: 2400,
                    amount_paid: 1400,
                    payment_method: 'Cash',
                    notes: 'Delivered in morning, 1000 pending',
                    created_at: new Date().toISOString()
                }
            ];
            localStorage.setItem('gn_orders', JSON.stringify(initialOrders));
        }

        if (!localStorage.getItem('gn_reminders')) {
            localStorage.setItem('gn_reminders', JSON.stringify([]));
        }
    }

    // Expose Supabase Service Interface
    window.GirNaariDB = {
        init: initSupabase,
        isMock: () => isMockMode,
        getClient: () => client,
        cleanUrl: cleanSupabaseUrl,

        // Test Supabase connection
        async testConnection() {
            if (!client) return { success: false, message: 'Supabase client not initialized' };
            try {
                const { data, error } = await client.from('customers').select('count', { count: 'exact', head: true });
                if (error) throw error;
                return { success: true, message: 'Connected to Supabase successfully!' };
            } catch (err) {
                return { success: false, message: err.message || 'Connection failed' };
            }
        },

        // Update credentials dynamically from UI Settings
        updateCredentials(rawUrl, anonKey) {
            const cleanedUrl = cleanSupabaseUrl(rawUrl);
            window.CONFIG.supabase.url = cleanedUrl;
            window.CONFIG.supabase.anonKey = anonKey ? anonKey.trim() : '';
            localStorage.setItem('girnaari_supabase_url', cleanedUrl);
            localStorage.setItem('girnaari_supabase_anon_key', window.CONFIG.supabase.anonKey);
            initSupabase();
        }
    };

    // Auto initialize on load
    initSupabase();
})();
