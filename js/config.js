/**
 * GIR NAARI - CONFIGURATION
 * 
 * Default Supabase credentials for Gir Naari live database.
 * Stored localStorage values (if any) take precedence, with automatic URL origin normalization.
 */

// Normalizes URL so only the origin (https://xyz.supabase.co) is ever used
function normalizeSupabaseUrl(inputUrl) {
    const fallback = 'https://xhfrdursmcibnnqrnwwg.supabase.co';
    if (!inputUrl || typeof inputUrl !== 'string') return fallback;
    let u = inputUrl.trim();
    if (!u) return fallback;

    // Direct string split guard: if it contains .supabase.co, take only the prefix + .supabase.co
    if (u.includes('.supabase.co')) {
        const parts = u.split('.supabase.co');
        let domainPart = parts[0];
        if (!domainPart.startsWith('http://') && !domainPart.startsWith('https://')) {
            domainPart = 'https://' + domainPart.replace(/^\/+/, '');
        }
        return domainPart + '.supabase.co';
    }

    try {
        if (!u.startsWith('http://') && !u.startsWith('https://')) {
            u = 'https://' + u;
        }
        const parsed = new URL(u);
        return parsed.origin;
    } catch (e) {
        return fallback;
    }
}

// Clean and persist clean URL
const rawStoredUrl = localStorage.getItem('girnaari_supabase_url');
const cleanUrl = normalizeSupabaseUrl(rawStoredUrl || 'https://xhfrdursmcibnnqrnwwg.supabase.co');
if (rawStoredUrl !== cleanUrl) {
    localStorage.setItem('girnaari_supabase_url', cleanUrl);
}

const CONFIG = {
    // Supabase Settings (Pre-configured for Gir Naari family register)
    supabase: {
        url: cleanUrl,
        anonKey: localStorage.getItem('girnaari_supabase_anon_key') || 'sb_publishable_TagAA0deGkls2XMHYoWb6A_GYOgNpqq',
    },

    // Family Member Access
    family: {
        pin: localStorage.getItem('girnaari_family_pin') || '1234', // Simple 4-digit PIN for the family
        members: [
            { id: 'father', name: 'Papa', role: 'Full Access' },
            { id: 'mother', name: 'Mummy', role: 'Full Access' },
            { id: 'neev', name: 'Neev', role: 'Full Access' }
        ]
    },

    // Business & Product Info
    business: {
        name: 'Gir Naari',
        tagline: '100% Pure & Organic A2 Gir Cow Desi Ghee',
        location: 'Ahmedabad, Gujarat',
        phone: '9825000000',
        website: 'https://girnaari.liveblog365.com/',
        currency: '₹',
        units: ['litre', 'kg', 'gram', 'ml'],
        paymentMethods: ['Cash', 'UPI', 'Bank Transfer', 'Other'],
        customerTypes: ['Regular', 'Small Shop', 'Wholesaler', 'Other'],
        reminderThresholdDays: 40, // 40-day reminder threshold as requested
        
        // WhatsApp Follow-up message template
        reminderMessageTemplate: (customerName) => 
            `Namaste ${customerName} ji! 🙏\n\nHope you enjoyed Gir Naari's Pure A2 Gir Cow Desi Ghee.\n\nIt has been a while since your last purchase. Would you like to place another order?\n\nThank you for supporting Gir Naari! 🌿`
    },

    // Products Catalog with Fixed Cost Prices and Selling Prices
    products: [
        {
            id: 'ghee',
            name: 'A2 Gir Cow Desi Ghee',
            shortName: 'A2 Cow Ghee',
            icon: '🌿',
            defaultUnit: 'litre',
            units: ['litre', 'kg', 'ml', 'gram'],
            costPerLitre: 750, // Fixed cost: ₹750 per litre no matter the quantity
            defaultSellingPrice: 1200,
            hasFixedUnitCost: false
        },
        {
            id: 'milk_powder_500g',
            name: 'Milk Powder (500 gm)',
            shortName: 'Milk Powder 500g',
            icon: '🥛',
            defaultUnit: 'pack (500g)',
            units: ['pack (500g)', 'pack', 'gram'],
            costPerUnit: 170, // Cost: ₹170
            defaultSellingPrice: 300, // Sells at ₹300 (Profit: ₹130)
            hasFixedUnitCost: true
        },
        {
            id: 'honey_250g',
            name: 'Gir Forest Honey (250 gm)',
            shortName: 'Honey 250g',
            icon: '🍯',
            defaultUnit: 'jar (250g)',
            units: ['jar (250g)', 'jar', 'gram'],
            costPerUnit: 70, // Cost: ₹70
            defaultSellingPrice: 200, // Sells at ₹200 (Profit: ₹130)
            hasFixedUnitCost: true
        },
        {
            id: 'honey_500g',
            name: 'Gir Forest Honey (500 gm)',
            shortName: 'Honey 500g',
            icon: '🍯',
            defaultUnit: 'jar (500g)',
            units: ['jar (500g)', 'jar', 'gram'],
            costPerUnit: 130, // Cost: ₹130
            defaultSellingPrice: 300, // Sells at ₹300 (Profit: ₹170)
            hasFixedUnitCost: true
        },
        {
            id: 'custom',
            name: 'Custom / Other Product',
            shortName: 'Other Item',
            icon: '📦',
            defaultUnit: 'unit',
            units: ['unit', 'pack', 'litre', 'kg', 'jar'],
            costPerUnit: 0,
            defaultSellingPrice: 0,
            hasFixedUnitCost: true
        }
    ],

    // Common areas in Ahmedabad for quick auto-suggestions
    suggestedAreas: [
        'Gota',
        'Vaishnodevi Circle',
        'Chandkheda',
        'Bodakdev',
        'Satellite',
        'Vastrapur',
        'Thaltej',
        'Prahlad Nagar',
        'Bopal',
        'South Bopal',
        'Ghatlodia',
        'Motera',
        'Sabarmati',
        'Navrangpura',
        'Paldi',
        'Science City',
        'Ranip',
        'Ambawadi',
        'Ellisbridge',
        'Naranpura'
    ]
};

// Export to window
window.CONFIG = CONFIG;
