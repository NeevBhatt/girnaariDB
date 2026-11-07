# 📖 Gir Naari – Family User Manual (વપરાશ માર્ગદર્શિકા)

A simple, step-by-step guide for **Papa**, **Mummy**, and **Neev** on how to use the Gir Naari digital register on mobile phones.

---

## 📱 Step 1: Add App to Mobile Home Screen (Make it look like an App)

Do this once on your father's and mother's phones so it opens full-screen like a regular mobile app:

### On Android Phone (Chrome):
1. Open the website link in Google Chrome.
2. Tap the **three dots menu (⋮)** in the top-right corner.
3. Tap **"Add to Home screen"** (or **"Install app"**).
4. An icon named **"Gir Naari"** will appear on the phone’s home screen.

### On iPhone (Safari):
1. Open the website link in Safari.
2. Tap the **Share button (⬆)** at the bottom.
3. Tap **"Add to Home Screen"**.

---

## 🔐 Step 2: Unlocking the Register (Family Login)

When opening the app:
1. Select who is using the phone:
   - **Papa (Father)**
   - **Mummy (Mother)**
   - **Neev**
2. Enter the Family PIN: **`1234`**
3. Tap **Unlock Register ➔**.
*(All 3 family members have equal access to add orders, customers, and view reports).*

---

## 🧭 Step 3: The 5 Bottom Navigation Buttons

At the bottom of the screen, you will see 5 simple buttons:

| Button | Name | Purpose |
| :---: | :--- | :--- |
| 📊 | **Dashboard** | Quick summary of today's sales, orders, and pending balances. |
| 👥 | **Customers** | List of all customers, phone numbers, areas, and purchase history. |
| ➕ | **Add Order** | **(Most Important)** The main screen to record daily ghee sales. |
| ⏳ | **Reminders** | Customers who haven't ordered in 40+ days, grouped by area. |
| 📈 | **Reports** | Monthly sales, cash vs UPI totals, and pending payment reminders. |

---

## 🛒 Step 4: How to Add a New Order (Daily Routine)

Tap the middle **➕ Add Order** button at the bottom:

1. **Select Customer:**
   - Type the customer's name or phone number in the search box.
   - Tap their name when it appears.
   - *(If it is a new customer, tap **"➕ Add New Customer"** to add them in 5 seconds).*
2. **Select Product:**
   - **🌿 A2 Gir Cow Desi Ghee** (Fixed Cost: ₹750/L)
   - **🥛 Milk Powder 500 gm** (Selling: ₹300 | Cost: ₹170 | Profit: ₹130)
   - **🍯 Gir Forest Honey 250 gm** (Selling: ₹200 | Cost: ₹70 | Profit: ₹130)
   - **🍯 Gir Forest Honey 500 gm** (Selling: ₹300 | Cost: ₹130 | Profit: ₹170)
   - **📦 Other / Custom Item**
3. **Order Date:**
   - Automatically set to today. (Can change if recording yesterday's order).
4. **Quantity & Unit:**
   - Type the quantity (e.g., `1`, `2`, `5`, `0.5`).
   - Units update automatically based on product (`litre`, `kg`, `pack (500g)`, `jar (250g)`).
5. **Selling Price (Manual Rate):**
   - Pre-fills standard rate (e.g. ₹1,200 for ghee, ₹300 for milk powder, ₹200 for honey 250g).
   - You can edit this freely if giving a special discount or wholesale rate!
6. **Delivery Charge (If Applicable):**
   - Tap **[✓ Free (₹0)]**, or tap **[+₹50]**, **[+₹100]** if delivery is charged.
   - The delivery charge is automatically added to the customer's bill.
7. **Live Profit & Margin Display (નફો ગણતરી):**
   - The app instantly calculates and shows your exact net profit and profit margin percentage!  
   *(e.g., "Order Total: ₹1,250 | +₹500 Profit (40%)")*.
8. **Payment Received:**
   - If paid in full: Tap **[✓ Full Paid]**.
   - If unpaid: Tap **[✕ Unpaid (₹0)]**.
   - If partial: Tap **[½ Half Paid]** or type amount received.
9. **Payment Method:**
   - Select **Cash** or **UPI** (Google Pay / PhonePe) or **Bank Transfer**.
10. **Save Order:**
   - Tap **💾 Save Order**.
   - Recorded to Supabase with real-time sync to all family phones!

---

## 👥 Step 5: Managing Customers & Viewing History

Tap the **👥 Customers** tab at the bottom:

- **Search:** Quickly search by name, phone number, or area.
- **Filter by Area:** Select an area (e.g., *Gota*, *Bodakdev*, *Chandkheda*) to see only customers living there.
- **Customer Cards Show:**
  - Phone number
  - Total litres of ghee purchased all-time
  - Date of their last order
  - Outstanding pending balance (if any)
- **Quick Action Buttons:**
  - 📞 **Call:** Dials their mobile directly.
  - 💬 **WhatsApp:** Opens WhatsApp chat with this customer.
  - 💰 **Pay:** (Visible if they have an unpaid balance) Opens 1-tap settlement modal.
  - 📜 **History:** Shows their complete past orders, payment modes, and notes.
  - ➕ **Order:** Starts a new order for this customer immediately.

---

## 💰 Step 5B: What if a Customer Pays Later? (બાકી રકમ પછીથી ચૂકવે ત્યારે)

If you marked an order **Unpaid (₹0)** or **Partial Paid**, and after a few days or weeks the customer pays you (via Cash, Google Pay, PhonePe, or Bank Transfer):

### Method 1: From Customer History (📜 History)
1. Go to **👥 Customers** tab.
2. Find the customer and tap **📜 History**.
3. You will see their past orders. Any unpaid order has a green button:  
   👉 **`💰 Record Payment (₹... due)`**.
4. Tap it:
   - The app automatically fills the exact remaining balance!
   - Select payment mode (**UPI**, **Cash**, or **Bank Transfer**).
   - Tap **✓ Confirm & Save Payment**.
5. Done! The order status instantly turns green (**Paid ✓**), and their balance becomes ₹0 across all phones.

### Method 2: From Pending Register (📈 Reports)
1. Go to **📈 Reports** tab.
2. Scroll to **⚠️ Pending Payments Register**.
3. You will see every customer who owes money.
4. Tap **💰 Settle** next to their name.
5. Confirm the amount and tap **✓ Confirm & Save Payment**.

### Method 3: From Dashboard (📊 Dashboard)
- Under **Recent Orders**, any order with a pending balance has a **`₹... due • 💰 Pay`** button.
- Tap it to settle immediately!

---

## ⏳ Step 6: 40-Day Follow-Up Reminders (Grouped by Locality)

Tap the **⏳ Reminders** tab at the bottom:

### How it works:
- Gir Naari ghee typically lasts around 30 to 40 days for a household.
- If a customer placed an order 40 or more days ago and hasn't reordered, they **automatically appear here**.
- If they place a new order, they disappear from this list for the next 40 days.

### Grouped by Area (અમદાવાદ વિસ્તાર મુજબ):
- Customers are organized under expandable headers by locality:
  - **GOTA** (e.g., 3 customers due)
  - **VAISHNODEVI CIRCLE** (e.g., 2 customers due)
  - **CHANDKHEDA**
  - **BODAKDEV**
- This makes delivery planning easy when visiting a specific part of the city!

### How to Follow Up:
1. Tap **💬 WhatsApp Follow-up**:
   - Opens WhatsApp with a pre-written respectful Gujarati/Hindi/English greeting:
     > *"Namaste [Customer Name] ji! 🙏 Hope you enjoyed Gir Naari's Pure A2 Gir Cow Desi Ghee. It has been a while since your last purchase. Would you like to place another order? Thank you for supporting Gir Naari! 🌿"*
   - You can review and send the message.
2. Tap **✓ Mark Contacted**:
   - Logs that you reached out to them today so other family members know they have already been contacted.

---

## 📈 Step 7: Reports & Pending Payment Tracking

Tap the **📈 Reports** tab at the bottom:

1. **Date Filters:**
   - Tap the dropdown to view sales for **Today**, **This Month**, **Last 30 Days**, or a **Custom Date Range**.
2. **Sales Summary:**
   - Total Sales (₹)
   - Total Litres Sold
   - Cash Collected vs Online (UPI/Bank) Collected
3. **⚠️ Pending Payments Register:**
   - Shows a list of every customer who has an unpaid balance.
   - Tap **📞 Call** or **💬 WhatsApp** to politely remind them about their balance.
4. **📥 Export to CSV:**
   - Download an Excel/CSV file of orders or pending balances with one tap.

---

## 🔄 Live Cloud Sync (How the Family Stays Connected)

- Every order saved on **Papa's phone** immediately shows up on **Mummy's phone** and **Neev's phone**.
- Everything is backed up safely in your Supabase cloud database — no risk of losing physical paper notes or torn diary pages.

🌿 **Gir Naari – 100% Pure & Organic A2 Gir Cow Desi Ghee, Ahmedabad.**

