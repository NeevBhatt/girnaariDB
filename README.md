# 🌿 Gir Naari – Digital Customer & Order Register

A lightweight, lightning-fast digital register designed specifically for **Gir Naari (100% Pure & Organic A2 Gir Cow Desi Ghee)** based in Ahmedabad, Gujarat.

Built to replace the physical paper notebook with a clean, touch-friendly mobile interface for the family (**Neev, Papa, and Mummy**) to record ghee orders, track customer purchase histories, view pending balances, and follow up every 40 days.

---

## 🚀 Key Features

1. **Mobile-First & Parent-Friendly:**
   - Big touch-friendly buttons (minimum 48px).
   - High-contrast, clean typography.
   - Large readable text with no unnecessary animations or clutter.
   - Fixed bottom navigation bar with instant 1-tap **Add Order** access.

2. **Order Management (Manual Pricing):**
   - **Manual Pricing:** Selling price is never hardcoded. Enter agreed rates manually for every order (regular customers, small shops, wholesale cans).
   - Searchable customer combobox (search by customer name or phone).
   - Dynamic real-time calculation: `Total = Quantity × Manual Price`.
   - Partial payment tracking: Supports Full Paid, Partial Paid, and Unpaid with instant balance calculation.
   - Quick touch payment shortcuts: `[✓ Full Paid]`, `[½ Half Paid]`, `[✕ Unpaid (₹0)]`.

3. **Customer Management & Ahmedabad Locality:**
   - Stores Customer Name, Mobile Number, Locality/Area, Full Address, Customer Type, and Notes.
   - One-tap phone calling (`tel:`) and one-tap WhatsApp contact (`wa.me/`).
   - Customer purchase history modal with total ghee ordered (litres), total billing, and unpaid balance.

4. **40-Day Follow-Up Reminders (Grouped by Locality):**
   - Automatically tracks the date of every customer's **latest order**.
   - If a customer has not placed an order in **≥ 40 days**, they appear in the follow-up list.
   - **Grouped by Locality/Area in Ahmedabad** (e.g. GOTA, VAISHNODEVI CIRCLE, CHANDKHEDA, BODAKDEV) with collapsible accordions.
   - **One-tap WhatsApp button** opens chat with pre-filled respectful message:
     ```
     Namaste [Customer Name] ji! 🙏

     Hope you enjoyed Gir Naari's Pure A2 Gir Cow Desi Ghee.

     It has been a while since your last purchase. Would you like to place another order?

     Thank you for supporting Gir Naari! 🌿
     ```
   - **Mark as Contacted:** Records contact history in the `reminders` table so follow-ups stay organized.

5. **Reports & Pending Balances:**
   - Daily sales, monthly sales, and custom date range filters.
   - Total ghee quantity sold (litres).
   - Cash collections vs Online (UPI/Bank Transfer) breakdown.
   - Dedicated **Pending Payments Register** with one-click WhatsApp/calling follow-up.
   - One-click CSV export for orders and unpaid balances.

6. **Excel Import (.xlsx / .xls):**
   - Upload existing Excel workbooks.
   - Interactive column inspection and mapping.
   - Automatic duplicate customer detection via 10-digit mobile numbers.
   - Imports historical orders while preserving original order dates and custom prices.

7. **Zero-Overhead Tech Stack:**
   - Pure HTML5, CSS3, and Vanilla JavaScript.
   - Direct connection to **Supabase PostgreSQL** using the client-side publishable key.
   - No React, no Next.js, no Node.js backend server required.
   - Ready for instant static hosting on Vercel, Netlify, GitHub Pages, or Cloudflare Pages.

---

## 🗄️ Database Architecture (Only 3 Tables)

The database schema strictly adheres to 3 lightweight tables in PostgreSQL:

1. **`customers`**:
   - `id` (UUID PK)
   - `name` (TEXT)
   - `phone` (TEXT)
   - `area` (TEXT - used for reminder grouping)
   - `address` (TEXT)
   - `customer_type` (TEXT: Regular / Small Shop / Wholesaler / Other)
   - `notes` (TEXT)
   - `created_at` (TIMESTAMPTZ)

2. **`orders`**:
   - `id` (UUID PK)
   - `customer_id` (UUID FK -> customers.id)
   - `order_date` (DATE)
   - `quantity` (NUMERIC)
   - `unit` (TEXT: litre / kg / gram / ml)
   - `price` (NUMERIC - manual selling price)
   - `total` (NUMERIC - calculated)
   - `amount_paid` (NUMERIC)
   - `payment_method` (TEXT: Cash / UPI / Bank Transfer / Other)
   - `notes` (TEXT)
   - `created_at` (TIMESTAMPTZ)

3. **`reminders`**:
   - `id` (UUID PK)
   - `customer_id` (UUID FK -> customers.id)
   - `last_contacted_at` (TIMESTAMPTZ)
   - `notes` (TEXT)
   - `created_at` (TIMESTAMPTZ)

Dynamic calculation: `Pending Balance = Total Order Amount - Amount Paid`.

---

## 🛠️ Supabase Setup (3-Minute Guide)

1. Create a free account at [supabase.com](https://supabase.com).
2. Create a new project (e.g., `girnaari-register`).
3. In the left sidebar, click **SQL Editor**.
4. Open the file [`sql/schema.sql`](file:///Users/neevbhatt/girnaariDB/sql/schema.sql) in this repository, copy all the SQL code, paste it into the Supabase SQL Editor, and click **Run**.
5. Go to **Project Settings** ➔ **API**:
   - Copy the **Project URL** (e.g., `https://your-id.supabase.co`).
   - Copy the **anon / public** key.
6. Open the Gir Naari web app, tap the **⚙️ (Settings)** icon in the top header, paste the URL and Anon Key, and tap **Save Settings**. (You can also click **⚡ Test Supabase Connection** to verify).

---

## 📱 Mobile Usage for Family (Papa, Mummy & Neev)

### Shared Family Access:
- When opening the app, select who is using it (**Papa**, **Mummy**, or **Neev**) and enter the family PIN (default: `1234`).
- All family members have identical full access to add orders, update payments, view history, and send reminders.
- To switch user, simply tap the user badge at the top right.

### Add to Mobile Home Screen (Save as App):
1. **On Android (Chrome):**
   - Open the web register link.
   - Tap the three dots menu (⋮) in the top-right corner.
   - Tap **"Add to Home screen"** or **"Install app"**.
2. **On iPhone (Safari):**
   - Open the web register link.
   - Tap the **Share** button (box with an upward arrow) at the bottom.
   - Tap **"Add to Home Screen"**.

Now it opens full-screen just like a native mobile app directly from the phone's home screen!

---

## 🌐 Free Static Hosting Deployment

This project contains only static files (`index.html`, `css/`, `js/`), so it deploys instantly for free to any static hosting provider.

### Option A: Vercel
1. Install Vercel CLI: `npm i -g vercel` or link your GitHub repo at [vercel.com](https://vercel.com).
2. Run `vercel` in the project root.
3. Done!

### Option B: Netlify
1. Drag and drop the `girnaariDB` folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
2. Your live URL is generated immediately.

---

## 📂 Project Structure

```
girnaariDB/
├── index.html           # Main semantic HTML5 single-page application shell
├── css/
│   └── style.css        # Authentic Gir Naari Vedic palette & mobile design system
├── js/
│   ├── config.js        # Business constants, default areas & templates
│   ├── supabaseClient.js# Supabase client initializer with offline fallback
│   ├── db.js            # Unified repository for the 3 tables & aggregations
│   ├── auth.js          # Simple family PIN login & profile switcher
│   ├── dashboard.js     # Dashboard counters, recent orders & alerts
│   ├── orders.js        # Fast order entry, customer search & manual pricing
│   ├── customers.js     # Customer cards, locality filtering, calling & history
│   ├── reminders.js     # 40-day follow-ups grouped by Ahmedabad locality
│   ├── reports.js       # Sales summaries, pending payments & CSV export
│   ├── import.js        # Excel (.xlsx/.xls) workbook parser & duplicate check
│   └── app.js           # Core navigation, toast notifications & settings
├── sql/
│   └── schema.sql       # PostgreSQL DDL, indexes, and RLS policies
├── .env.example         # Example configuration for Supabase
└── README.md            # Complete documentation
```

---

🌿 *Gir Naari – 100% Pure & Organic A2 Gir Cow Desi Ghee, Ahmedabad.*

