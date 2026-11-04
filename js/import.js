/**
 * GIR NAARI - EXCEL IMPORT MODULE
 * Reads .xlsx, .xls, and .csv files via SheetJS.
 * Features:
 * - Dynamic column inspection & mapping
 * - Real-time preview of parsed rows
 * - Duplicate customer detection by mobile number
 * - Validation of names, phone numbers, and dates
 * - Historical orders import with preserved manual prices and dates
 * - Complete import summary
 */

window.ImportModule = {
    workbook: null,
    sheetData: [],
    headers: [],
    existingCustomersMap: new Map(), // phone -> customer

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const fileInput = document.getElementById('excelFileInput');
        const dropZone = document.getElementById('excelDropZone');
        const btnProcess = document.getElementById('btnStartExcelImport');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    fileInput.files = e.dataTransfer.files;
                    this.handleFileSelect({ target: { files: e.dataTransfer.files } });
                }
            });
        }

        if (btnProcess) {
            btnProcess.addEventListener('click', () => this.executeImport());
        }
    },

    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (typeof XLSX === 'undefined') {
            window.App.showToast('Excel parser library loading, please wait 2 seconds...', 'warning');
            return;
        }

        const dropZoneText = document.getElementById('excelDropZoneText');
        if (dropZoneText) {
            dropZoneText.innerHTML = `📄 <strong>${this.escapeHTML(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
        }

        // Load existing customers for duplicate checks
        const existingCusts = await window.DB.getCustomers();
        this.existingCustomersMap.clear();
        for (const c of existingCusts) {
            const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
            if (cleanPhone) {
                // Store last 10 digits
                this.existingCustomersMap.set(cleanPhone.slice(-10), c);
            }
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                this.workbook = XLSX.read(data, { type: 'array', cellDates: true });

                const firstSheetName = this.workbook.SheetNames[0];
                const worksheet = this.workbook.Sheets[firstSheetName];

                // Convert sheet to json array of objects
                this.sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

                if (this.sheetData.length === 0) {
                    window.App.showToast('The selected Excel sheet has no data rows.', 'error');
                    return;
                }

                // Extract all column keys
                this.headers = Object.keys(this.sheetData[0]);

                this.renderColumnMappingUI();
                this.renderPreviewTable();

                document.getElementById('excelMappingSection').style.display = 'block';
                document.getElementById('excelPreviewSection').style.display = 'block';

            } catch (err) {
                console.error('Failed to parse Excel file:', err);
                window.App.showToast('Could not read Excel file: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    },

    renderColumnMappingUI() {
        const fields = [
            { id: 'map_name', label: 'Customer Name *', required: true, match: ['name', 'customer', 'client', 'grahak'] },
            { id: 'map_phone', label: 'Mobile / Phone *', required: true, match: ['phone', 'mobile', 'contact', 'number', 'cell'] },
            { id: 'map_area', label: 'Area / Locality *', required: true, match: ['area', 'locality', 'location', 'city', 'zone', 'place'] },
            { id: 'map_address', label: 'Full Address (Optional)', required: false, match: ['address', 'pata', 'flat', 'residence'] },
            { id: 'map_type', label: 'Customer Type (Optional)', required: false, match: ['type', 'category', 'cust_type'] },
            { id: 'map_date', label: 'Order Date (Optional)', required: false, match: ['date', 'order_date', 'tarikh'] },
            { id: 'map_qty', label: 'Quantity (Optional)', required: false, match: ['qty', 'quantity', 'litre', 'kg', 'can'] },
            { id: 'map_unit', label: 'Unit (Optional)', required: false, match: ['unit', 'measure'] },
            { id: 'map_price', label: 'Price / Rate (Optional)', required: false, match: ['price', 'rate', 'bhav', 'amount'] },
            { id: 'map_paid', label: 'Amount Paid (Optional)', required: false, match: ['paid', 'amount_paid', 'jama', 'received'] },
            { id: 'map_method', label: 'Payment Method (Optional)', required: false, match: ['method', 'payment_method', 'mode', 'cash_upi'] },
            { id: 'map_notes', label: 'Notes (Optional)', required: false, match: ['notes', 'remarks', 'comment'] }
        ];

        const container = document.getElementById('excelColumnMappingGrid');
        if (!container) return;

        let html = '';
        fields.forEach(f => {
            // Auto match column header
            let matchedHeader = '';
            for (const h of this.headers) {
                const lh = h.toLowerCase().trim();
                if (f.match.some(m => lh.includes(m))) {
                    matchedHeader = h;
                    break;
                }
            }

            html += `
                <div class="mapping-field-item">
                    <label class="form-label">${f.label}</label>
                    <select id="${f.id}" class="form-select mapping-select" data-field="${f.id}">
                        <option value="">-- Ignore / Not in Excel --</option>
                        ${this.headers.map(h => `
                            <option value="${this.escapeHTML(h)}" ${h === matchedHeader ? 'selected' : ''}>
                                ${this.escapeHTML(h)}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        });

        container.innerHTML = html;

        // Auto trigger preview update on map change
        container.querySelectorAll('select').forEach(sel => {
            sel.addEventListener('change', () => this.renderPreviewTable());
        });
    },

    getMappingValues() {
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };

        return {
            name: getVal('map_name'),
            phone: getVal('map_phone'),
            area: getVal('map_area'),
            address: getVal('map_address'),
            customer_type: getVal('map_type'),
            order_date: getVal('map_date'),
            quantity: getVal('map_qty'),
            unit: getVal('map_unit'),
            price: getVal('map_price'),
            amount_paid: getVal('map_paid'),
            payment_method: getVal('map_method'),
            notes: getVal('map_notes')
        };
    },

    renderPreviewTable() {
        const previewEl = document.getElementById('excelPreviewTableContainer');
        const statsEl = document.getElementById('excelPreviewStats');
        if (!previewEl || this.sheetData.length === 0) return;

        const mapping = this.getMappingValues();
        const sampleRows = this.sheetData.slice(0, 5);

        let previewHeaders = ['#', 'Name', 'Phone', 'Area'];
        if (mapping.order_date || mapping.quantity) {
            previewHeaders.push('Order Date', 'Quantity', 'Price', 'Status');
        } else {
            previewHeaders.push('Customer Type', 'Status');
        }

        let duplicatesCount = 0;
        let validRowsCount = 0;

        for (const row of this.sheetData) {
            const rawPhone = String(row[mapping.phone] || '').replace(/[^0-9]/g, '');
            const clean10 = rawPhone.slice(-10);
            if (rawPhone.length >= 10 && this.existingCustomersMap.has(clean10)) {
                duplicatesCount++;
            }
            if (row[mapping.name] && rawPhone.length >= 10) {
                validRowsCount++;
            }
        }

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="import-stats-pill">Total Excel Rows: <strong>${this.sheetData.length}</strong></div>
                <div class="import-stats-pill success">Valid Rows: <strong>${validRowsCount}</strong></div>
                <div class="import-stats-pill ${duplicatesCount > 0 ? 'warning' : ''}">
                    Existing Mobile Matches: <strong>${duplicatesCount}</strong> (Will avoid duplicating)
                </div>
            `;
        }

        let tableHtml = `
            <table class="table table-bordered table-sm">
                <thead>
                    <tr>${previewHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
        `;

        sampleRows.forEach((row, idx) => {
            const name = String(row[mapping.name] || '').trim();
            const rawPhone = String(row[mapping.phone] || '').replace(/[^0-9]/g, '');
            const clean10 = rawPhone.slice(-10);
            const area = String(row[mapping.area] || '').trim();
            const isDuplicate = this.existingCustomersMap.has(clean10);

            tableHtml += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${this.escapeHTML(name || '--')}</strong></td>
                    <td>${this.escapeHTML(rawPhone || '--')}</td>
                    <td>${this.escapeHTML(area || '--')}</td>
            `;

            if (mapping.order_date || mapping.quantity) {
                const date = String(row[mapping.order_date] || '--');
                const qty = String(row[mapping.quantity] || '--');
                const price = String(row[mapping.price] || '--');
                tableHtml += `
                    <td>${this.escapeHTML(date)}</td>
                    <td>${this.escapeHTML(qty)}</td>
                    <td>₹${this.escapeHTML(price)}</td>
                    <td>${isDuplicate ? '<span class="badge badge-warning">Existing Customer</span>' : '<span class="badge badge-success">New Customer</span>'}</td>
                `;
            } else {
                tableHtml += `
                    <td>${this.escapeHTML(String(row[mapping.customer_type] || 'Regular'))}</td>
                    <td>${isDuplicate ? '<span class="badge badge-warning">Existing Customer</span>' : '<span class="badge badge-success">New Customer</span>'}</td>
                `;
            }

            tableHtml += `</tr>`;
        });

        tableHtml += `</tbody></table>`;
        previewEl.innerHTML = tableHtml;
    },

    async executeImport() {
        const mapping = this.getMappingValues();
        if (!mapping.name) {
            window.App.showToast('Please map the Customer Name column.', 'error');
            return;
        }
        if (!mapping.phone) {
            window.App.showToast('Please map the Mobile / Phone column.', 'error');
            return;
        }
        if (!mapping.area) {
            window.App.showToast('Please map the Area / Locality column.', 'error');
            return;
        }

        const btn = document.getElementById('btnStartExcelImport');
        const progressContainer = document.getElementById('excelImportProgressContainer');
        const progressBar = document.getElementById('excelImportProgressBar');
        const progressText = document.getElementById('excelImportProgressText');

        if (btn) btn.disabled = true;
        if (progressContainer) progressContainer.style.display = 'block';

        let importedCustomersCount = 0;
        let skippedExistingCustomers = 0;
        let importedOrdersCount = 0;
        let invalidRowsCount = 0;

        try {
            const total = this.sheetData.length;

            for (let i = 0; i < total; i++) {
                const row = this.sheetData[i];
                const name = String(row[mapping.name] || '').trim();
                const rawPhone = String(row[mapping.phone] || '').replace(/[^0-9]/g, '');
                const clean10 = rawPhone.slice(-10);
                const area = String(row[mapping.area] || '').trim() || 'Ahmedabad';
                const address = mapping.address ? String(row[mapping.address] || '').trim() : '';
                const custType = mapping.customer_type ? String(row[mapping.customer_type] || 'Regular').trim() : 'Regular';
                const notes = mapping.notes ? String(row[mapping.notes] || '').trim() : '';

                if (!name || rawPhone.length < 10) {
                    invalidRowsCount++;
                    continue;
                }

                let targetCustomer = null;

                // Check if customer already exists
                if (this.existingCustomersMap.has(clean10)) {
                    targetCustomer = this.existingCustomersMap.get(clean10);
                    skippedExistingCustomers++;
                } else {
                    // Create customer
                    targetCustomer = await window.DB.createCustomer({
                        name: name,
                        phone: clean10,
                        area: area,
                        address: address,
                        customer_type: custType,
                        notes: notes
                    });
                    this.existingCustomersMap.set(clean10, targetCustomer);
                    importedCustomersCount++;
                }

                // Check if row has historical order data
                if (targetCustomer && mapping.quantity && row[mapping.quantity]) {
                    const qty = parseFloat(row[mapping.quantity]) || 0;
                    if (qty > 0) {
                        const price = parseFloat(row[mapping.price]) || 0;
                        const totalAmount = parseFloat(row['total']) || (qty * price);
                        const paid = mapping.amount_paid ? (parseFloat(row[mapping.amount_paid]) || totalAmount) : totalAmount;
                        const orderDate = mapping.order_date && row[mapping.order_date] 
                            ? this.formatParsedDate(row[mapping.order_date]) 
                            : new Date().toISOString().split('T')[0];

                        await window.DB.createOrder({
                            customer_id: targetCustomer.id,
                            order_date: orderDate,
                            quantity: qty,
                            unit: mapping.unit && row[mapping.unit] ? String(row[mapping.unit]).trim() : 'litre',
                            price: price,
                            total: totalAmount,
                            amount_paid: paid,
                            payment_method: mapping.payment_method && row[mapping.payment_method] ? String(row[mapping.payment_method]).trim() : 'Cash',
                            notes: 'Imported from Excel: ' + (notes || '')
                        });
                        importedOrdersCount++;
                    }
                }

                // Update progress bar
                if (progressBar) {
                    const percent = Math.round(((i + 1) / total) * 100);
                    progressBar.style.width = percent + '%';
                    if (progressText) progressText.textContent = `Processing row ${i + 1} of ${total} (${percent}%)`;
                }
            }

            // Summary
            window.App.showToast('Excel Import Complete! 🎉', 'success');
            alert(`✅ Excel Import Summary:\n\n• New Customers Created: ${importedCustomersCount}\n• Existing Customers Preserved: ${skippedExistingCustomers}\n• Historical Orders Recorded: ${importedOrdersCount}\n• Invalid / Skipped Rows: ${invalidRowsCount}`);

            // Refresh app state
            if (window.CustomersModule) await window.CustomersModule.loadCustomers();
            if (window.DashboardModule) await window.DashboardModule.loadStats();
            if (window.RemindersModule) await window.RemindersModule.loadReminders();
            if (window.ReportsModule) await window.ReportsModule.loadReports();

            // Reset import UI
            this.sheetData = [];
            document.getElementById('excelFileInput').value = '';
            document.getElementById('excelMappingSection').style.display = 'none';
            document.getElementById('excelPreviewSection').style.display = 'none';
            if (progressContainer) progressContainer.style.display = 'none';

        } catch (err) {
            console.error('Import failed:', err);
            window.App.showToast('Import error: ' + err.message, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    formatParsedDate(val) {
        if (!val) return new Date().toISOString().split('T')[0];
        try {
            if (val instanceof Date) {
                return val.toISOString().split('T')[0];
            }
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }
        } catch (e) {}
        return new Date().toISOString().split('T')[0];
    },

    escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
};

