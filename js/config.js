/**
 * GIR NAARI - CONFIGURATION
 * 
 * You can provide your Supabase credentials here directly,
 * or configure them within the app's Settings modal (stored securely in browser localStorage).
 */

const CONFIG = {
    // Supabase Settings (Replace with your actual Supabase URL & Anon Key)
    supabase: {
        url: localStorage.getItem('girnaari_supabase_url') || '',
        anonKey: localStorage.getItem('girnaari_supabase_anon_key') || '',
    },

    // Family Member Access
    family: {
        pin: localStorage.getItem('girnaari_family_pin') || '1234', // Simple 4-digit PIN for the family
        members: [
            { id: 'neev', name: 'Neev', role: 'Full Access' },
            { id: 'father', name: 'Papa', role: 'Full Access' },
            { id: 'mother', name: 'Mummy', role: 'Full Access' }
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

