// Global variables
let currentUser = null;
let currentTab = 'quotation';
let quotationItems = [];
let customers = [];
let quotations = [];
let products = [];
let users = [];
let systemSettings = {};

// IndexedDB database management
let db;
const DB_NAME = 'PriceDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'price_table';

// Initialize system
async function initializeSystem() {
    console.log('Initializing system...');
    try {
        await initializeDatabase();
        await loadAllData();
        console.log('System initialization completed');
    } catch (error) {
        console.error('Error during system initialization:', error);
    }
}

// Initialize IndexedDB database
async function initializeDatabase() {
    console.log('Initializing IndexedDB database...');
    
    try {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                db = request.result;
                console.log('IndexedDB database opened successfully');
                
                // Check if database has data
                checkDatabaseHasData().then(hasData => {
                    const sampleDataCreated = localStorage.getItem('sampleDataCreated') === 'true';
                    
                    if (!hasData && !sampleDataCreated) {
                        createDefaultSampleData().then(() => {
                            localStorage.setItem('sampleDataCreated', 'true');
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store for price table
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    
                    // Create indexes for better query performance
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('system', 'system', { unique: false });
                    store.createIndex('code1', 'code1', { unique: false });
                    store.createIndex('code2', 'code2', { unique: false });
                    store.createIndex('dimensions', ['width_min', 'width_max', 'height_min', 'height_max'], { unique: false });
                    store.createIndex('price', 'price', { unique: false });
                    
                    console.log('IndexedDB object store created successfully');
                }
            };
        });
    } catch (error) {
        console.error('Error initializing IndexedDB database:', error);
        throw error;
    }
}

// Check if database has data
async function checkDatabaseHasData() {
    try {
        if (!db) return false;
        
        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
                resolve(countRequest.result > 0);
            };
            
            countRequest.onerror = () => {
                resolve(false);
            };
        });
    } catch (error) {
        console.error('Error checking database data:', error);
        return false;
    }
}

// Create default sample data
async function createDefaultSampleData() {
    try {
        console.log('Creating default sample data...');
        
        const sampleData = [
            {
                category: 'Glass',
                system: 'Standard',
                code1: 'G001',
                code2: 'S001',
                width_min: 0,
                width_max: 100,
                height_min: 0,
                height_max: 100,
                price: 50.00
            },
            {
                category: 'Glass',
                system: 'Premium',
                code1: 'G002',
                code2: 'P001',
                width_min: 0,
                width_max: 150,
                height_min: 0,
                height_max: 150,
                price: 75.00
            }
        ];
        
        for (const item of sampleData) {
            await addPriceRecord(item);
        }
        
        console.log('Default sample data created successfully');
    } catch (error) {
        console.error('Error creating sample data:', error);
    }
}

// Add price record to database
async function addPriceRecord(record) {
    try {
        if (!db) return false;
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.add({
                ...record,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error adding price record:', error);
        return false;
    }
}

// Load all data
async function loadAllData() {
    console.log('Loading all data...');
    try {
        await Promise.all([
            loadUsers(),
            loadProducts(),
            loadSystemSettings()
        ]);
        console.log('Data loading completed');
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const savedUsers = localStorage.getItem('users');
        if (savedUsers) {
            users = JSON.parse(savedUsers);
        } else {
            // Default users
            users = [
                { username: 'admin', password: 'admin123', role: 'admin' },
                { username: 'sales', password: 'sales123', role: 'sales' }
            ];
            localStorage.setItem('users', JSON.stringify(users));
        }
        console.log('Users loaded:', users.length);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load products
async function loadProducts() {
    try {
        const savedProducts = localStorage.getItem('products');
        if (savedProducts) {
            products = JSON.parse(savedProducts);
        } else {
            products = [];
            localStorage.setItem('products', JSON.stringify(products));
        }
        console.log('Products loaded:', products.length);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load system settings
async function loadSystemSettings() {
    try {
        const savedSettings = localStorage.getItem('systemSettings');
        if (savedSettings) {
            systemSettings = JSON.parse(savedSettings);
        } else {
            systemSettings = {
                companyName: 'Your Company',
                companyAddress: 'Your Address',
                companyPhone: 'Your Phone',
                companyEmail: 'your@email.com'
            };
            localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
        }
        console.log('System settings loaded');
    } catch (error) {
        console.error('Error loading system settings:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Login form
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }
    
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('onclick').match(/'([^']+)'/)[1];
            showTab(tabName);
        });
    });
    
    // File input change
    const fileInput = document.getElementById('mainFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    // Import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', importDataFromSource);
    }
    
    // Clear file button
    const clearFileBtn = document.getElementById('clearFileBtn');
    if (clearFileBtn) {
        clearFileBtn.addEventListener('click', clearSelectedFile);
    }
    
    // Database test button
    const testDbBtn = document.getElementById('testDbBtn');
    if (testDbBtn) {
        testDbBtn.addEventListener('click', testDatabaseConnection);
    }
    
    console.log('Event listeners initialized');
}

// Login function
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showModal('Login Error', 'Please enter both username and password.');
        return;
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Check if user is admin
        if (user.role === 'admin') {
            showAdminBackend();
        } else {
            showSalesFrontend();
        }
        
        console.log('User logged in:', username, 'Role:', user.role);
    } else {
        showModal('Login Error', 'Invalid username or password.');
    }
}

// Show login page
function showLoginPage() {
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('salesFrontend').style.display = 'none';
    document.getElementById('adminBackend').style.display = 'none';
}

// Show sales frontend
function showSalesFrontend() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('salesFrontend').style.display = 'block';
    document.getElementById('adminBackend').style.display = 'none';
    document.getElementById('currentUser').textContent = currentUser.username;
    
    // Load user-specific data
    loadUserData();
    
    // Refresh database status
    refreshDatabaseStatus();
}

// Load user data
function loadUserData() {
    // Load quotations
    const savedQuotations = localStorage.getItem(`quotations_${currentUser.username}`);
    if (savedQuotations) {
        quotations = JSON.parse(savedQuotations);
    }
    
    // Load customers
    const savedCustomers = localStorage.getItem(`customers_${currentUser.username}`);
    if (savedCustomers) {
        customers = JSON.parse(savedCustomers);
    }
    
    // Update displays
    updateQuotationsDisplay();
    updateCustomersDisplay();
}

// Show tab
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked button
    const clickedButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    currentTab = tabName;
}

// Add product item to quotation
function addProductItem() {
    const productList = document.getElementById('productList');
    if (!productList) return;
    
    const newRow = document.createElement('tr');
    newRow.className = 'product-row';
    
    newRow.innerHTML = `
        <td>
            <select class="product-category" onchange="updateProductOptions(this)">
                <option value="">选择类别</option>
                <option value="拉珠卷帘">拉珠卷帘</option>
                <option value="其他类别">其他类别</option>
            </select>
        </td>
        <td>
            <select class="product-system" disabled>
                <option value="">选择系统</option>
            </select>
        </td>
        <td>
            <select class="product-code1" disabled>
                <option value="">选择CODE1</option>
            </select>
        </td>
        <td>
            <span class="product-code2-display">-</span>
        </td>
        <td>
            <input type="number" class="product-width" placeholder="宽度" step="0.1" min="0">
            <select class="product-unit">
                <option value="cm">cm</option>
                <option value="in">in</option>
                <option value="mm">mm</option>
            </select>
        </td>
        <td>
            <input type="number" class="product-height" placeholder="高度" step="0.1" min="0">
            <select class="product-height-unit">
                <option value="cm">cm</option>
                <option value="in">in</option>
                <option value="mm">mm</option>
            </select>
        </td>
        <td>
            <input type="number" class="product-quantity" placeholder="数量" min="1" value="1">
        </td>
        <td>
            <span class="unit-price">$0.00</span>
        </td>
        <td>
            <span class="total-price">$0.00</span>
        </td>
        <td>
            <button onclick="queryProductPrice(this)" class="btn-primary btn-sm">查询价格</button>
            <button onclick="removeProductItem(this)" class="btn-danger btn-sm">删除</button>
        </td>
    `;
    
    productList.appendChild(newRow);
    
    // Update quotation totals
    updateQuotationTotals();
}

// Remove product item from quotation
function removeProductItem(button) {
    const row = button.closest('tr');
    if (row) {
        row.remove();
        updateQuotationTotals();
    }
}

// Query product price for a specific row
async function queryProductPrice(button) {
    const row = button.closest('tr');
    if (!row) return;
    
    const category = row.querySelector('.product-category').value;
    const system = row.querySelector('.product-system').value;
    const code1 = row.querySelector('.product-code1').value;
    const width = parseFloat(row.querySelector('.product-width').value);
    const height = parseFloat(row.querySelector('.product-height').value);
    const widthUnit = row.querySelector('.product-unit').value;
    const heightUnit = row.querySelector('.product-height-unit').value;
    
    if (!category || !system || !code1 || !width || !height) {
        showModal('查询错误', '请选择产品类别、系统、CODE1，并输入宽度和高度。');
        return;
    }
    
    try {
        // Convert units to cm for database query
        let widthCm = width;
        let heightCm = height;
        
        if (widthUnit === 'in') {
            widthCm = width * 2.54;  // Convert inches to cm
        } else if (widthUnit === 'mm') {
            widthCm = width / 10;    // Convert mm to cm
        }
        
        if (heightUnit === 'in') {
            heightCm = height * 2.54; // Convert inches to cm
        } else if (heightUnit === 'mm') {
            heightCm = height / 10;   // Convert mm to cm
        }
        
        // Query database for matching price
        console.log('Product row query - Querying price with:', { category, system, code1, widthCm, heightCm });
        const priceRecord = await queryPriceWithCodes(category, system, code1, null, widthCm, heightCm, 'cm', 'cm');
        console.log('Product row query - Price query result:', priceRecord);
        
        if (priceRecord) {
            // Auto-fill CODE2
            const code2Display = row.querySelector('.product-code2-display');
            if (code2Display) {
                code2Display.textContent = priceRecord.code2 || 'N/A';
            }
            
            // Display unit price
            const unitPriceElement = row.querySelector('.unit-price');
            if (unitPriceElement) {
                unitPriceElement.textContent = `$${priceRecord.price.toFixed(2)}`;
            }
            
            // Update total price
            const quantity = parseFloat(row.querySelector('.product-quantity').value) || 1;
            const totalPrice = priceRecord.price * quantity;
            const totalPriceElement = row.querySelector('.total-price');
            if (totalPriceElement) {
                totalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
            }
            
            // Add to quotation items
            const quotationItem = {
                category: category,
                system: system,
                code1: code1,
                code2: priceRecord.code2 || '',
                width: width,
                height: height,
                price: priceRecord.price,
                quantity: parseFloat(row.querySelector('.product-quantity').value) || 1
            };
            
            console.log('Adding quotation item:', quotationItem);
            quotationItems.push(quotationItem);
            updateQuotationItemsDisplay();
            updateQuotationTotals();
            
            showModal('查询成功', `找到匹配价格: $${priceRecord.price.toFixed(2)}\nCODE2: ${priceRecord.code2 || 'N/A'}\n\n产品已添加到报价单中。`);
        } else {
            showModal('查询结果', '未找到匹配的价格记录。请检查输入参数或联系管理员。');
        }
        
    } catch (error) {
        console.error('Price query error:', error);
        showModal('查询错误', '查询价格时出错: ' + error.message);
    }
}

// Update product options based on category selection
function updateProductOptions(categorySelect) {
    const row = categorySelect.closest('tr');
    const systemSelect = row.querySelector('.product-system');
    const code1Input = row.querySelector('.product-code1');
    
    const category = categorySelect.value;
    console.log('Category changed to:', category);
    
    if (category) {
        console.log('Loading systems for category:', category);
        // Load systems from database for selected category
        loadSystemsForCategory(category, systemSelect);
        systemSelect.disabled = false;
        code1Input.disabled = false;
    } else {
        console.log('No category selected, disabling system and CODE1');
        systemSelect.innerHTML = '<option value="">选择系统</option>';
        systemSelect.disabled = true;
        code1Input.disabled = true;
    }
    
    // Clear values when category changes
    systemSelect.value = '';
    code1Input.value = '';
    
            // Clear CODE2 display
        const code2Display = row.querySelector('.product-code2-display');
        if (code2Display) {
            code2Display.textContent = '-';
        }
        
        // Debug: Check database data for this category
        if (category && db) {
            checkDatabaseDataForCategory(category);
        }
        
        // Debug: Check a specific record in database
        if (category && db) {
            checkSpecificRecord(category, '插片（方罩）系统', 'C3');
        }
    }

// Load systems for selected category from database
async function loadSystemsForCategory(category, systemSelect) {
    try {
        if (!db) return;
        
        console.log('Loading systems for category:', category);
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const records = request.result;
            console.log('Total records in database:', records.length);
            
            const filteredRecords = records.filter(r => r.category === category);
            console.log('Filtered records for category:', filteredRecords.length);
            console.log('Sample filtered records:', filteredRecords.slice(0, 3));
            
            const systems = [...new Set(filteredRecords.map(r => r.system))];
            console.log('Available systems:', systems);
            
            systemSelect.innerHTML = '<option value="">选择系统</option>' +
                systems.map(sys => `<option value="${sys}">${sys}</option>`).join('');
            
            console.log('System select updated with options:', systems.length);
            
            // Add change event for system selection
            systemSelect.onchange = function() {
                loadCode1sForSystem(category, this.value, systemSelect.closest('tr'));
            };
        };
        
    } catch (error) {
        console.error('Error loading systems:', error);
    }
}

// Load CODE1s for selected category and system from database
async function loadCode1sForSystem(category, system, row) {
    try {
        if (!db) return;
        
        console.log('Loading CODE1s for category:', category, 'system:', system);
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const records = request.result;
            console.log('Total records in database:', records.length);
            
            const filteredRecords = records.filter(r => 
                r.category === category && r.system === system
            );
            console.log('Filtered records for category/system:', filteredRecords.length);
            console.log('Sample filtered records:', filteredRecords.slice(0, 3));
            
            const code1s = [...new Set(filteredRecords.map(r => r.code1))];
            console.log('Available CODE1s:', code1s);
            
            const code1Input = row.querySelector('.product-code1');
            if (code1Input) {
                code1Input.innerHTML = '<option value="">选择CODE1</option>' +
                    code1s.map(code => `<option value="${code}">${code}</option>`).join('');
                
                console.log('CODE1 select updated with options:', code1s.length);
                
                // Add change event for CODE1 selection
                code1Input.onchange = function() {
                    autoFillCode2ForRow(category, system, this.value, row);
                };
            } else {
                console.error('CODE1 input element not found in row');
            }
        };
        
    } catch (error) {
        console.error('Error loading CODE1s:', error);
    }
}

// Auto-fill CODE2 for a specific row
async function autoFillCode2ForRow(category, system, code1, row) {
    try {
        if (!db || !category || !system || !code1) return;
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const records = request.result;
            const matchingRecord = records.find(record => 
                record.category === category &&
                record.system === system &&
                record.code1 === code1
            );
            
            if (matchingRecord) {
                const code2Display = row.querySelector('.product-code2-display');
                if (code2Display) {
                    code2Display.textContent = matchingRecord.code2 || 'N/A';
                }
            }
        };
        
    } catch (error) {
        console.error('Error auto-filling CODE2:', error);
    }
}

// Update quotation totals
function updateQuotationTotals() {
    const productRows = document.querySelectorAll('.product-row');
    let subtotal = 0;
    
    productRows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.product-quantity').value) || 0;
        const unitPrice = parseFloat(row.querySelector('.unit-price').textContent.replace('$', '')) || 0;
        const totalPrice = quantity * unitPrice;
        
        row.querySelector('.total-price').textContent = `$${totalPrice.toFixed(2)}`;
        subtotal += totalPrice;
    });
    
    // Update subtotal display
    const subtotalElement = document.getElementById('subtotal');
    if (subtotalElement) {
        subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    }
    
    // Update tax amount
    const taxRate = parseFloat(document.getElementById('taxRate')?.value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const taxAmountElement = document.getElementById('taxAmount');
    if (taxAmountElement) {
        taxAmountElement.textContent = `$${taxAmount.toFixed(2)}`;
    }
    
    // Update shipping fee
    const shippingFee = parseFloat(document.getElementById('shippingFee')?.value) || 0;
    
    // Update total amount
    const totalAmount = subtotal + taxAmount + shippingFee;
    const totalAmountElement = document.getElementById('totalAmount');
    if (totalAmountElement) {
        totalAmountElement.textContent = `$${totalAmount.toFixed(2)}`;
    }
}

// Update quotation items display
function updateQuotationItemsDisplay() {
    const itemsContainer = document.getElementById('quotationItems');
    if (!itemsContainer) return;
    
    itemsContainer.innerHTML = '';
    
    if (quotationItems.length === 0) {
        itemsContainer.innerHTML = '<p>暂无报价项目</p>';
        return;
    }
    
    quotationItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'quotation-item';
        itemDiv.innerHTML = `
            <div class="item-info">
                <span><strong>${item.category} - ${item.system}</strong></span>
                <span>代码: ${item.code1}-${item.code2 || 'N/A'}</span>
                <span>尺寸: ${item.width} × ${item.height} cm</span>
                <span>数量: ${item.quantity}</span>
            </div>
            <div class="item-price">
                <span>单价: $${item.price.toFixed(2)}</span>
                <span>小计: $${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <button onclick="removeQuotationItem(${index})" class="btn-danger btn-sm">删除</button>
        `;
        itemsContainer.appendChild(itemDiv);
    });
}

// Remove quotation item
function removeQuotationItem(index) {
    quotationItems.splice(index, 1);
    updateQuotationItemsDisplay();
    updateQuotationTotals();
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('salesFrontend').style.display = 'none';
    document.getElementById('adminBackend').style.display = 'none';
    document.getElementById('loginPage').style.display = 'block';
    
    // Clear form fields
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    console.log('User logged out');
}

// Reset system
function resetSystem() {
    if (confirm('Are you sure you want to reset the system? This will clear all data.')) {
        localStorage.clear();
        location.reload();
    }
}

// Show modal dialog
function showModal(title, message, onConfirm = null, onCancel = null) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    if (onConfirm) {
        confirmBtn.onclick = () => {
            onConfirm();
            hideModal(modal);
        };
    } else {
        confirmBtn.onclick = () => {
            hideModal(modal);
        };
    }
    
    if (onCancel) {
        cancelBtn.onclick = () => {
            onCancel();
            hideModal(modal);
        };
    } else {
        cancelBtn.onclick = () => {
            hideModal(modal);
        };
    }
    
    modal.style.display = 'block';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    
    // Add click outside to close functionality
    modal.onclick = (e) => {
        if (e.target === modal) {
            hideModal(modal);
        }
    };
}

// Hide modal dialog
function hideModal(modal) {
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    modal.style.pointerEvents = 'none';
    
    // Wait for transition to complete before hiding
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Handle file selection
function handleFileSelection(fileInput) {
    console.log('File selection event:', fileInput);
    
    if (!fileInput || !fileInput.files) {
        console.log('Invalid file input element');
        return;
    }
    
    const file = fileInput.files[0];
    
    if (!file) {
        console.log('No file selected');
        return;
    }
    
    console.log('Selected file:', file.name, file.size, 'bytes');
    
    // Display file information
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileType = document.getElementById('fileType');
    const clearFileBtn = document.getElementById('clearFileBtn');
    const importBtn = document.getElementById('importBtn');
    
    if (fileInfo && fileName && fileSize && fileType) {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileType.textContent = file.type || 'Unknown';
        
        fileInfo.style.display = 'block';
        if (clearFileBtn) clearFileBtn.style.display = 'inline-block';
        if (importBtn) {
            importBtn.style.display = 'inline-block';
            importBtn.disabled = false; // Enable the import button
        }
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Clear selected file
function clearSelectedFile() {
    const fileInput = document.getElementById('mainFileInput');
    const fileInfo = document.getElementById('fileInfo');
    const clearFileBtn = document.getElementById('clearFileBtn');
    const importBtn = document.getElementById('importBtn');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (clearFileBtn) clearFileBtn.style.display = 'none';
    if (importBtn) {
        importBtn.style.display = 'none';
        importBtn.disabled = true; // Disable the import button
    }
}

// Import data from file
async function importDataFromFile() {
    console.log('Starting file import...');
    const fileInput = document.getElementById('mainFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        console.log('No file selected for import');
        showModal('Import Error', 'Please select a file first.');
        return;
    }
    
    console.log('Importing file:', file.name, file.size, 'bytes');
    
    try {
        console.log('Reading file data...');
        const data = await readFileData(file);
        console.log('File data read, records:', data ? data.length : 0);
        
        if (data && data.length > 0) {
            console.log('Importing data to database...');
            const success = await importPriceDataToDatabase(data);
            if (success) {
                console.log('Import successful');
                showModal('Import Success', `Successfully imported ${data.length} records.`);
                clearSelectedFile();
                refreshDatabaseStatus();
            } else {
                console.log('Import failed');
                showModal('Import Error', 'Failed to import data to database.');
            }
        } else {
            console.log('No valid data found in file');
            showModal('Import Error', 'No valid data found in file.');
        }
    } catch (error) {
        console.error('Import error:', error);
        showModal('Import Error', 'Error reading file: ' + error.message);
    }
}

// Read file data
function readFileData(file) {
    return new Promise((resolve, reject) => {
        console.log('Reading file data for:', file.name);
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                console.log('File read successfully, size:', e.target.result.byteLength || e.target.result.length);
                let data;
                
                if (file.name.endsWith('.csv')) {
                    console.log('Parsing CSV file...');
                    data = parseCSV(e.target.result);
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    console.log('Parsing Excel file...');
                    data = parseExcel(e.target.result);
                } else {
                    reject(new Error('Unsupported file format. Please use CSV or Excel files.'));
                    return;
                }
                
                console.log('File parsing completed, data:', data);
                resolve(data);
            } catch (error) {
                console.error('Error in file parsing:', error);
                reject(error);
            }
        };
        
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            reject(new Error('Failed to read file.'));
        };
        
        if (file.name.endsWith('.csv')) {
            console.log('Reading CSV as text...');
            reader.readAsText(file);
        } else {
            console.log('Reading Excel as ArrayBuffer...');
            reader.readAsArrayBuffer(file);
        }
    });
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            data.push(row);
        }
    }
    
    return data;
}

// Parse Excel data
function parseExcel(arrayBuffer) {
    try {
        console.log('Parsing Excel file...');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        console.log('Workbook sheets:', workbook.SheetNames);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        console.log('Worksheet:', worksheet);
        
        const data = XLSX.utils.sheet_to_json(worksheet);
        console.log('Parsed data:', data);
        console.log('Data length:', data.length);
        
        if (data.length > 0) {
            console.log('First row sample:', data[0]);
            console.log('Available columns:', Object.keys(data[0]));
            
            // Check for price-related columns
            const priceColumns = Object.keys(data[0]).filter(key => 
                key.toLowerCase().includes('price') || 
                key.toLowerCase().includes('价格') || 
                key.toLowerCase().includes('cny') ||
                key.toLowerCase().includes('元')
            );
            console.log('Price-related columns found:', priceColumns);
            
            // Show sample price values
            priceColumns.forEach(col => {
                console.log(`Sample values for ${col}:`, data.slice(0, 3).map(row => row[col]));
            });
        }
        
        return data;
    } catch (error) {
        console.error('Error parsing Excel file:', error);
        throw error;
    }
}

// Import price data to database
async function importPriceDataToDatabase(priceData) {
    try {
        if (!db) {
            console.error('Database not initialized');
            return false;
        }
        
        let successCount = 0;
        
        for (const item of priceData) {
            // Map Excel column names to expected field names
            const mappedItem = {
                category: item.category_cn || item.category || '',
                system: item.system_cn || item.system || '',
                code1: item.product_code1 || item.code1 || '',
                code2: item.product_code2 || item.code2 || '',
                width_min: parseFloat(item.w_min_cm || item.width_min) || 0,
                width_max: parseFloat(item.w_max_cm || item.width_max) || 0,
                height_min: parseFloat(item.h_min_cm || item.height_min) || 0,
                height_max: parseFloat(item.h_max_cm || item.height_max) || 0,
                price: parseFloat(item.unit_price || item.price_cny || item.price) || 0
            };
            
            // Debug: Show price mapping details for first few records
            if (priceData.indexOf(item) < 3) {
                console.log('Price mapping debug for item:', item);
                console.log('item.unit_price:', item.unit_price, typeof item.unit_price);
                console.log('item.price_cny:', item.price_cny, typeof item.price_cny);
                console.log('item.price:', item.price, typeof item.price);
                console.log('parseFloat(item.unit_price):', parseFloat(item.unit_price));
                console.log('Final mapped price:', mappedItem.price);
            }
            
            // Validate required fields
            if (mappedItem.category && mappedItem.width_min !== undefined && mappedItem.width_max !== undefined && 
                mappedItem.height_min !== undefined && mappedItem.height_max !== undefined && mappedItem.price !== undefined) {
                
                console.log('Processing record:', mappedItem);
                
                const success = await addPriceRecord(mappedItem);
                if (success) successCount++;
            } else {
                console.log('Skipping invalid record:', item, 'Mapped:', mappedItem);
            }
        }
        
        console.log(`Imported ${successCount} records successfully`);
        return successCount > 0;
        
    } catch (error) {
        console.error('Error importing price data:', error);
        return false;
    }
}

// Query price with category, system, CODE1, CODE2 and dimensions
async function queryPriceWithCodes(category, system, code1, code2, width, height, widthUnit = 'cm', heightUnit = 'cm') {
    try {
        console.log('queryPriceWithCodes called with:', { category, system, code1, code2, width, height, widthUnit, heightUnit });
        
        if (!db || !category || !width || !height) {
            console.log('Missing required parameters:', { db: !!db, category, width, height });
            return null;
        }
        
        // Unit conversion
        let widthCm = width;
        let heightCm = height;
        
        if (widthUnit === 'mm') {
            widthCm = width / 10;
        } else if (widthUnit === 'm') {
            widthCm = width * 100;
        }
        
        if (heightUnit === 'mm') {
            heightCm = height / 10;
        } else if (heightUnit === 'm') {
            heightCm = height * 100;
        }
        
        console.log('Converted dimensions to cm:', { widthCm, heightCm });
        
        // Query database for matching price
        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            // Build query conditions
            let results = [];
            let totalRecords = 0;
            let matchedRecords = 0;
            
            store.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    totalRecords++;
                    const record = cursor.value;
                    
                    // Check if record matches all criteria
                    if (record.category === category &&
                        (!system || record.system === system) &&
                        (!code1 || record.code1 === code1) &&
                        (!code2 || record.code2 === code2) &&
                        widthCm >= record.width_min && widthCm <= record.width_max &&
                        heightCm >= record.height_min && heightCm <= record.height_max) {
                        
                        matchedRecords++;
                        results.push(record);
                        console.log('Found matching record:', record);
                        console.log('Record price field:', record.price, typeof record.price);
                        console.log('All record fields:', Object.keys(record));
                    }
                    
                    cursor.continue();
                } else {
                    console.log('Query completed. Total records:', totalRecords, 'Matched records:', matchedRecords);
                    // Sort results by price (lowest first)
                    results.sort((a, b) => a.price - b.price);
                    const finalResult = results.length > 0 ? results[0] : null;
                    console.log('Final result:', finalResult);
                    resolve(finalResult);
                }
            };
        });
        
    } catch (error) {
        console.error('Error querying price:', error);
        return null;
    }
}

// Auto-match CODE2 based on category, system, and CODE1
function autoMatchCode2(category, system, code1) {
    try {
        if (!db || !category || !system || !code1) {
            return null;
        }
        
        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('code1');
            
            const request = index.get(code1);
            
            request.onsuccess = () => {
                if (request.result) {
                    // Find matching CODE2 for the given category and system
                    const transaction2 = db.transaction([STORE_NAME], 'readonly');
                    const store2 = transaction2.objectStore(STORE_NAME);
                    const index2 = store2.index('category');
                    
                    const request2 = index2.getAll(category);
                    
                    request2.onsuccess = () => {
                        const matchingRecords = request2.result.filter(record => 
                            record.system === system && record.code1 === code1
                        );
                        
                        if (matchingRecords.length > 0) {
                            resolve(matchingRecords[0].code2);
                        } else {
                            resolve(null);
                        }
                    };
                } else {
                    resolve(null);
                }
            };
        });
        
    } catch (error) {
        console.error('Error auto-matching CODE2:', error);
        return null;
    }
}

// Get available categories
async function getAvailableCategories() {
    try {
        if (!db) return [];
        
        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('category');
            
            const request = index.getAll();
            
            request.onsuccess = () => {
                const categories = [...new Set(request.result.map(record => record.category))];
                resolve(categories.sort());
            };
        });
        
    } catch (error) {
        console.error('Error getting categories:', error);
        return [];
    }
}

// Get available systems for category
async function getAvailableSystems(category) {
    try {
        if (!db || !category) return [];
        
        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('category');
            
            const request = index.getAll(category);
            
            request.onsuccess = () => {
                const systems = [...new Set(request.result.map(record => record.system))];
                resolve(systems.sort());
            };
        });
        
    } catch (error) {
        console.error('Error getting systems:', error);
        return [];
    }
}

// Get available CODE1 for category and system
async function getAvailableCode1(category, system) {
    try {
        if (!db || !category || !system) return [];
        
        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('category');
            
            const request = index.getAll(category);
            
            request.onsuccess = () => {
                const code1List = [...new Set(
                    request.result
                        .filter(record => record.system === system)
                        .map(record => record.code1)
                )];
                resolve(code1List.sort());
            };
        });
        
    } catch (error) {
        console.error('Error getting CODE1:', error);
        return [];
    }
}

// Get available CODE2 for category, system, and CODE1
async function getAvailableCode2(category, system, code1) {
    try {
        if (!db || !category || !system || !code1) return [];
        
        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('category');
            
            const request = index.getAll(category);
            
            request.onsuccess = () => {
                const code2List = [...new Set(
                    request.result
                        .filter(record => record.system === system && record.code1 === code1)
                        .map(record => record.code2)
                )];
                resolve(code2List.sort());
            };
        });
        
    } catch (error) {
        console.error('Error getting CODE2:', error);
        return [];
    }
}

// Update category dropdown
async function updateCategoryDropdown() {
    const categorySelect = document.getElementById('categorySelect');
    if (!categorySelect) return;
    
    const categories = await getAvailableCategories();
    
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// Update system dropdown
async function updateSystemDropdown() {
    const systemSelect = document.getElementById('systemSelect');
    const categorySelect = document.getElementById('categorySelect');
    
    if (!systemSelect || !categorySelect) return;
    
    const category = categorySelect.value;
    if (!category) {
        systemSelect.innerHTML = '<option value="">Select System</option>';
        return;
    }
    
    const systems = await getAvailableSystems(category);
    
    systemSelect.innerHTML = '<option value="">Select System</option>';
    systems.forEach(system => {
        const option = document.createElement('option');
        option.value = system;
        option.textContent = system;
        systemSelect.appendChild(option);
    });
    
    // Clear dependent dropdowns
    updateCode1Dropdown();
}

// Update CODE1 dropdown
async function updateCode1Dropdown() {
    const code1Select = document.getElementById('code1Select');
    const categorySelect = document.getElementById('categorySelect');
    const systemSelect = document.getElementById('systemSelect');
    
    if (!code1Select || !categorySelect || !systemSelect) return;
    
    const category = categorySelect.value;
    const system = systemSelect.value;
    
    if (!category || !system) {
        code1Select.innerHTML = '<option value="">Select CODE1</option>';
        return;
    }
    
    const code1List = await getAvailableCode1(category, system);
    
    code1Select.innerHTML = '<option value="">Select CODE1</option>';
    code1List.forEach(code1 => {
        const option = document.createElement('option');
        option.value = code1;
        option.textContent = code1;
        code1Select.appendChild(option);
    });
    
    // Clear dependent dropdowns
    updateCode2Dropdown();
}

// Update CODE2 dropdown
async function updateCode2Dropdown() {
    const code2Select = document.getElementById('code2Select');
    const categorySelect = document.getElementById('categorySelect');
    const systemSelect = document.getElementById('systemSelect');
    const code1Select = document.getElementById('code1Select');
    
    if (!code2Select || !categorySelect || !systemSelect || !code1Select) return;
    
    const category = categorySelect.value;
    const system = systemSelect.value;
    const code1 = code1Select.value;
    
    if (!category || !system || !code1) {
        code2Select.innerHTML = '<option value="">Select CODE2</option>';
        return;
    }
    
    const code2List = await getAvailableCode2(category, system, code1);
    
    code2Select.innerHTML = '<option value="">Select CODE2</option>';
    code2List.forEach(code2 => {
        const option = document.createElement('option');
        option.value = code2;
        option.textContent = code2;
        code2Select.appendChild(option);
    });
}

// Auto-fill CODE2 when CODE1 changes
async function onCode1Change() {
    const code1Select = document.getElementById('code1Select');
    const code2Select = document.getElementById('code2Select');
    
    if (!code1Select || !code2Select) return;
    
    const category = document.getElementById('categorySelect').value;
    const system = document.getElementById('systemSelect').value;
    const code1 = code1Select.value;
    
    if (category && system && code1) {
        const autoCode2 = await autoMatchCode2(category, system, code1);
        if (autoCode2) {
            code2Select.value = autoCode2;
        }
    }
    
    updateCode2Dropdown();
}

// Query price button click
async function onQueryPriceClick() {
    const category = document.getElementById('categorySelect').value;
    const system = document.getElementById('systemSelect').value;
    const code1 = document.getElementById('code1Select').value;
    const code2 = document.getElementById('code2Select').value;
    const width = parseFloat(document.getElementById('widthInput').value);
    const height = parseFloat(document.getElementById('heightInput').value);
    const widthUnit = document.getElementById('widthUnit').value;
    const heightUnit = document.getElementById('heightUnit').value;
    
    if (!category || !width || !height) {
        showModal('Query Error', 'Please select category and enter width and height.');
        return;
    }
    
    try {
        const priceRecord = await queryPriceWithCodes(category, system, code1, code2, width, height, widthUnit, heightUnit);
        
        if (priceRecord) {
            document.getElementById('priceResult').textContent = `$${priceRecord.price.toFixed(2)}`;
            document.getElementById('priceDetails').style.display = 'block';
            
            // Store for quotation
            window.currentPriceRecord = priceRecord;
        } else {
            document.getElementById('priceResult').textContent = 'No matching price found';
            document.getElementById('priceDetails').style.display = 'none';
            window.currentPriceRecord = null;
        }
    } catch (error) {
        console.error('Price query error:', error);
        showModal('Query Error', 'Error querying price: ' + error.message);
    }
}

// Add item to quotation
function addItemToQuotation() {
    const priceRecord = window.currentPriceRecord;
    if (!priceRecord) {
        showModal('Add Item Error', 'Please query a price first.');
        return;
    }
    
    const quantity = parseInt(document.getElementById('quantityInput').value) || 1;
    const width = parseFloat(document.getElementById('widthInput').value);
    const height = parseFloat(document.getElementById('heightInput').value);
    
    if (!width || !height) {
        showModal('Add Item Error', 'Please enter width and height.');
        return;
    }
    
    const item = {
        id: Date.now(),
        category: priceRecord.category,
        system: priceRecord.system,
        code1: priceRecord.code1,
        code2: priceRecord.code2,
        width: width,
        height: height,
        price: priceRecord.price,
        quantity: quantity,
        total: priceRecord.price * quantity
    };
    
    quotationItems.push(item);
    updateQuotationItemsDisplay();
    calculateQuotationTotal();
    
    // Clear form
    document.getElementById('quantityInput').value = '1';
    document.getElementById('priceResult').textContent = '';
    document.getElementById('priceDetails').style.display = 'none';
    window.currentPriceRecord = null;
}

// Update quotation items display
function updateQuotationItemsDisplay() {
    const itemsContainer = document.getElementById('quotationItems');
    if (!itemsContainer) return;
    
    itemsContainer.innerHTML = '';
    
    quotationItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'quotation-item';
        itemDiv.innerHTML = `
            <div class="item-info">
                <span>${item.category} - ${item.system} (${item.code1}-${item.code2})</span>
                <span>${item.width} × ${item.height} cm</span>
                <span>Qty: ${item.quantity}</span>
            </div>
            <div class="item-price">
                <span>$${item.price.toFixed(2)}</span>
                <span>$${item.total.toFixed(2)}</span>
            </div>
            <button onclick="removeQuotationItem(${index})" class="btn-remove">Remove</button>
        `;
        itemsContainer.appendChild(itemDiv);
    });
}

// Remove quotation item
function removeQuotationItem(index) {
    quotationItems.splice(index, 1);
    updateQuotationItemsDisplay();
    calculateQuotationTotal();
}

// Calculate quotation total
function calculateQuotationTotal() {
    const total = quotationItems.reduce((sum, item) => sum + item.total, 0);
    const totalElement = document.getElementById('quotationTotal');
    if (totalElement) {
        totalElement.textContent = `$${total.toFixed(2)}`;
    }
}

// Generate quotation
function generateQuotation() {
    if (quotationItems.length === 0) {
        showModal('Generate Quotation Error', 'Please add at least one item to the quotation.');
        return;
    }
    
    const companyName = document.getElementById('companyName').value;
    const companyPhone = document.getElementById('companyPhone').value;
    const companyAddress = document.getElementById('companyAddress').value;
    const companyEmail = document.getElementById('companyEmail').value;
    
    if (!companyName || !companyPhone || !companyAddress || !companyEmail) {
        showModal('Generate Quotation Error', 'Please fill in all company information fields.');
        return;
    }
    
    const quotation = {
        id: Date.now(),
        date: new Date().toISOString(),
        company: {
            name: companyName,
            phone: companyPhone,
            address: companyAddress,
            email: companyEmail
        },
        items: [...quotationItems],
        total: quotationItems.reduce((sum, item) => sum + item.total, 0),
        user: currentUser.username
    };
    
    // Save quotation
    quotations.push(quotation);
    localStorage.setItem(`quotations_${currentUser.username}`, JSON.stringify(quotations));
    
    // Generate PDF
    generateQuotationPDF(quotation);
    
    // Clear current quotation
    quotationItems = [];
    updateQuotationItemsDisplay();
    calculateQuotationTotal();
    
    showModal('Quotation Generated', 'Quotation generated and saved successfully!');
}

// Generate quotation PDF
function generateQuotationPDF(quotation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add company logo/header
    doc.setFontSize(20);
    doc.text('QUOTATION', 105, 20, { align: 'center' });
    
    // Company information
    doc.setFontSize(12);
    doc.text('Company Information:', 20, 40);
    doc.setFontSize(10);
    doc.text(`Name: ${quotation.company.name}`, 20, 50);
    doc.text(`Phone: ${quotation.company.phone}`, 20, 60);
    doc.text(`Address: ${quotation.company.address}`, 20, 70);
    doc.text(`Email: ${quotation.company.email}`, 20, 80);
    
    // Quotation details
    doc.setFontSize(12);
    doc.text('Quotation Details:', 20, 100);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(quotation.date).toLocaleDateString()}`, 20, 110);
    doc.text(`Quotation #: ${quotation.id}`, 20, 120);
    
    // Items table
    const tableData = quotation.items.map(item => [
        `${item.category} - ${item.system}`,
        `${item.code1}-${item.code2}`,
        `${item.width} × ${item.height} cm`,
        item.quantity.toString(),
        `$${item.price.toFixed(2)}`,
        `$${item.total.toFixed(2)}`
    ]);
    
    doc.autoTable({
        head: [['Product', 'Code', 'Dimensions', 'Qty', 'Unit Price', 'Total']],
        body: tableData,
        startY: 140,
        headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Total
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total: $${quotation.total.toFixed(2)}`, 150, finalY);
    
    // Save PDF
    doc.save(`quotation_${quotation.id}.pdf`);
}

// Update quotations display
function updateQuotationsDisplay() {
    const container = document.getElementById('myQuotationsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (quotations.length === 0) {
        container.innerHTML = '<p>No quotations found.</p>';
        return;
    }
    
            quotations.forEach(quotation => {
            const quotationDiv = document.createElement('div');
            quotationDiv.className = 'quotation-card';
            quotationDiv.innerHTML = `
                <div class="quotation-header">
                    <h4>报价单 #${quotation.id}</h4>
                    <span>${new Date(quotation.date).toLocaleDateString()}</span>
                </div>
                <div class="quotation-body">
                    <p><strong>用户:</strong> ${quotation.user}</p>
                    <p><strong>项目数量:</strong> ${quotation.items.length}</p>
                    <p><strong>总金额:</strong> $${quotation.total.toFixed(2)}</p>
                </div>
                <div class="quotation-actions">
                    <button onclick="viewQuotation(${quotation.id})" class="btn-secondary">查看</button>
                    <button onclick="downloadQuotation(${quotation.id})" class="btn-primary">下载</button>
                </div>
            `;
            container.appendChild(quotationDiv);
        });
}

// View quotation
function viewQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    let message = `报价单 #${quotation.id}\n`;
    message += `日期: ${new Date(quotation.date).toLocaleDateString()}\n`;
    message += `用户: ${quotation.user}\n`;
    message += `总金额: $${quotation.total.toFixed(2)}\n\n`;
    message += '项目详情:\n';
    
    quotation.items.forEach(item => {
        message += `- ${item.category} - ${item.system} (${item.code1}-${item.code2})\n`;
        message += `  尺寸: ${item.width} × ${item.height} cm, 数量: ${item.quantity}, 单价: $${item.price.toFixed(2)}\n`;
    });
    
    showModal('Quotation Details', message);
}

// Download quotation
function downloadQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    generateQuotationPDF(quotation);
}

// Update customers display
function updateCustomersDisplay() {
    const container = document.getElementById('myCustomersList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (customers.length === 0) {
        container.innerHTML = '<p>No customers found.</p>';
        return;
    }
    
    customers.forEach(customer => {
        const customerDiv = document.createElement('div');
        customerDiv.className = 'customer-card';
        customerDiv.innerHTML = `
            <div class="customer-header">
                <h4>${customer.name}</h4>
                <span>${customer.phone}</span>
            </div>
            <div class="customer-body">
                <p><strong>Email:</strong> ${customer.email}</p>
                <p><strong>Address:</strong> ${customer.address}</p>
            </div>
        `;
        container.appendChild(customerDiv);
    });
}

// Refresh database status
function refreshDatabaseStatus() {
    console.log('Refreshing database status...');
    
    const dbStatus = document.getElementById('dbStatus');
    const dbStatusType = document.getElementById('dbStatusType');
    const dbRecordCount = document.getElementById('dbRecordCount');
    
    if (dbStatus) {
        if (db && db.readyState === 'open') {
            dbStatus.textContent = 'Connected';
            dbStatus.className = 'status-connected';
        } else {
            dbStatus.textContent = 'Disconnected';
            dbStatus.className = 'status-disconnected';
        }
    }
    
    if (dbStatusType) {
        dbStatusType.textContent = 'IndexedDB (Local)';
    }
    
    if (dbRecordCount && db) {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
            dbRecordCount.textContent = countRequest.result;
        };
        
        countRequest.onerror = () => {
            dbRecordCount.textContent = 'Error';
        };
    }
}

// Test database connection
async function testDatabaseConnection() {
    try {
        if (!db || db.readyState !== 'open') {
            alert('❌ Database not connected. Please check your connection.');
            return;
        }
        
        // Test by performing a simple query
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
            alert(`✅ Database connection successful! IndexedDB is working properly.\nTotal records: ${countRequest.result}`);
        };
        
        countRequest.onerror = () => {
            alert('❌ Database query failed. Please check your connection.');
        };
    } catch (error) {
        console.error('Database connection test error:', error);
        alert('❌ Database connection test failed: ' + error.message);
    }
}

// Show admin backend
function showAdminBackend() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('salesFrontend').style.display = 'none';
    document.getElementById('adminBackend').style.display = 'block';
    document.getElementById('adminUser').textContent = currentUser.username;
    
    // Load admin data
    loadAdminData();
    
    // Refresh database status
    refreshDatabaseStatus();
}

// Load admin data
function loadAdminData() {
    // Load all quotations for admin view
    const allQuotations = [];
    users.forEach(user => {
        const userQuotations = JSON.parse(localStorage.getItem(`quotations_${user.username}`) || '[]');
        allQuotations.push(...userQuotations);
    });
    
    // Update displays
    updateAllQuotationsDisplay(allQuotations);
    updateUsersTableDisplay();
    updatePromotionsTableDisplay();
}

// Show admin tab
function showAdminTab(tabName) {
    // Hide all admin tab contents
    const tabContents = document.querySelectorAll('.admin-tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all admin tab buttons
    const tabButtons = document.querySelectorAll('.header-controls .tab-btn');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked button
    const clickedButton = document.querySelector(`[onclick="showAdminTab('${tabName}')"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
}

// Toggle database configuration
function toggleDatabaseConfig() {
    const dbType = document.getElementById('dbType').value;
    const apiUrlGroup = document.getElementById('apiUrlGroup');
    const apiAuthGroup = document.getElementById('apiAuthGroup');
    
    if (dbType === 'api') {
        apiUrlGroup.style.display = 'block';
        apiAuthGroup.style.display = 'block';
    } else {
        apiUrlGroup.style.display = 'none';
        apiAuthGroup.style.display = 'none';
    }
}

// Toggle data source configuration
function toggleDataSourceConfig() {
    const dataSourceType = document.getElementById('dataSourceType').value;
    const localFileConfig = document.getElementById('localFileConfig');
    const remoteServerConfig = document.getElementById('remoteServerConfig');
    
    if (dataSourceType === 'local') {
        localFileConfig.style.display = 'block';
        remoteServerConfig.style.display = 'none';
    } else {
        localFileConfig.style.display = 'none';
        remoteServerConfig.style.display = 'block';
    }
}

// Save database configuration
function saveDatabaseConfig() {
    const dbType = document.getElementById('dbType').value;
    const apiBaseUrl = document.getElementById('apiBaseUrl').value;
    const apiKey = document.getElementById('apiKey').value;
    
    const config = {
        type: dbType,
        apiBaseUrl: apiBaseUrl,
        apiKey: apiKey
    };
    
    localStorage.setItem('databaseConfig', JSON.stringify(config));
    showModal('Configuration Saved', 'Database configuration saved successfully!');
}

// Save data source configuration
function saveDataSourceConfig() {
    const dataSourceType = document.getElementById('dataSourceType').value;
    const fileFormat = document.getElementById('fileFormat').value;
    const sheetName = document.getElementById('sheetName').value;
    const remoteUrl = document.getElementById('remoteUrl').value;
    
    const config = {
        type: dataSourceType,
        fileFormat: fileFormat,
        sheetName: sheetName,
        remoteUrl: remoteUrl
    };
    
    localStorage.setItem('dataSourceConfig', JSON.stringify(config));
    showModal('Configuration Saved', 'Data source configuration saved successfully!');
}

// Import data from source
async function importDataFromSource() {
    const dataSourceType = document.getElementById('dataSourceType').value;
    
    if (dataSourceType === 'local') {
        const fileInput = document.getElementById('mainFileInput');
        if (fileInput.files.length > 0) {
            await importDataFromFile();
        } else {
            showModal('Import Error', 'Please select a file first.');
        }
    } else {
        // Remote API import logic
        showModal('Import Info', 'Remote API import functionality will be implemented here.');
    }
}

// Clear database
function clearDatabase() {
    if (confirm('确认清空数据库？\n\n此操作将删除数据库中的所有数据，包括：\n• 所有价格记录\n• 产品信息\n• 系统配置\n\n此操作无法撤销！\n\n请确认您已备份重要数据。')) {
        try {
            if (db) {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                store.clear();
                
                showModal('数据库已清空', '数据库中的所有数据已成功清除。\n\n现在可以重新导入新的数据文件。\n\n注意：此操作无法撤销，请确保您已备份重要数据。');
                refreshDatabaseStatus();
            }
        } catch (error) {
            console.error('Error clearing database:', error);
            showModal('Error', 'Failed to clear database: ' + error.message);
        }
    }
}

// Recreate database tables
function recreateDatabaseTables() {
    if (confirm('确认重新创建数据库表？\n\n此操作将：\n• 删除现有数据库\n• 清除所有数据\n• 重新创建数据库结构\n\n此操作无法撤销！\n\n请确认您已备份重要数据。')) {
        try {
            // Close current database
            if (db) {
                db.close();
            }
            
            // Delete and recreate database
            const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
            deleteRequest.onsuccess = () => {
                // Reinitialize database
                initializeDatabase().then(() => {
                    showModal('数据库表已重建', '数据库表已成功重新创建。\n\n所有数据已被清除，数据库结构已重置为初始状态。\n\n现在可以重新导入数据文件。');
                    refreshDatabaseStatus();
                });
            };
        } catch (error) {
            console.error('Error recreating tables:', error);
            showModal('Error', 'Failed to recreate tables: ' + error.message);
        }
    }
}

// Check database data
function checkDatabaseData() {
    try {
        if (!db) {
            showModal('Database Error', 'Database not initialized.');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
            const totalRecords = countRequest.result;
            
            // Get sample data
            const sampleRequest = store.getAll();
            sampleRequest.onsuccess = () => {
                const sampleData = sampleRequest.result.slice(0, 5);
                let message = `Database Status:\n\n`;
                message += `Total Records: ${totalRecords}\n\n`;
                
                if (sampleData.length > 0) {
                    message += `Sample Records:\n`;
                    sampleData.forEach((record, index) => {
                        message += `${index + 1}. ${record.category} - ${record.system} (${record.code1}-${record.code2})\n`;
                        message += `   Size: ${record.width_min}-${record.width_max} × ${record.height_min}-${record.height_max} cm\n`;
                        message += `   Price: $${record.price}\n\n`;
                    });
                }
                
                showModal('Database Data Check', message);
            };
        };
        
    } catch (error) {
        console.error('Error checking database data:', error);
        showModal('Error', 'Failed to check database data: ' + error.message);
    }
}

// Update all quotations display for admin
function updateAllQuotationsDisplay(allQuotations) {
    const container = document.getElementById('allQuotationsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (allQuotations.length === 0) {
        container.innerHTML = '<p>No quotations found.</p>';
        return;
    }
    
    allQuotations.forEach(quotation => {
        const quotationDiv = document.createElement('div');
        quotationDiv.className = 'quotation-card';
        quotationDiv.innerHTML = `
            <div class="quotation-header">
                <h4>Quotation #${quotation.id}</h4>
                <span>${new Date(quotation.date).toLocaleDateString()}</span>
                <span class="user-tag">${quotation.user}</span>
            </div>
            <div class="quotation-body">
                <p><strong>Company:</strong> ${quotation.company.name}</p>
                <p><strong>Items:</strong> ${quotation.items.length}</p>
                <p><strong>Total:</strong> $${quotation.total.toFixed(2)}</p>
            </div>
            <div class="quotation-actions">
                <button onclick="viewQuotation(${quotation.id})" class="btn-secondary">View</button>
                <button onclick="downloadQuotation(${quotation.id})" class="btn-primary">Download</button>
            </div>
        `;
        container.appendChild(quotationDiv);
    });
}

// Update users table display
function updateUsersTableDisplay() {
    const container = document.getElementById('usersTableDisplay');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = '<p>No users found.</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Real Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${users.map(user => `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>${user.realName || '-'}</td>
                    <td>${user.phone || '-'}</td>
                    <td>${user.email || '-'}</td>
                    <td>
                        <button onclick="editUser('${user.username}')" class="btn-secondary">Edit</button>
                        <button onclick="deleteUser('${user.username}')" class="btn-danger">Delete</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    container.appendChild(table);
}

// Update promotions table display
function updatePromotionsTableDisplay() {
    const container = document.getElementById('promotionsTableDisplay');
    if (!container) return;
    
    container.innerHTML = '';
    
    const promotions = JSON.parse(localStorage.getItem('promotions') || '[]');
    
    if (promotions.length === 0) {
        container.innerHTML = '<p>No promotions found.</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Category</th>
                <th>System</th>
                <th>Discount</th>
                <th>Period</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${promotions.map(promotion => `
                <tr>
                    <td>${promotion.name}</td>
                    <td>${promotion.category}</td>
                    <td>${promotion.system}</td>
                    <td>${promotion.discount}%</td>
                    <td>${new Date(promotion.startDate).toLocaleDateString()} - ${new Date(promotion.endDate).toLocaleDateString()}</td>
                    <td>
                        <button onclick="editPromotion(${promotion.id})" class="btn-secondary">Edit</button>
                        <button onclick="deletePromotion(${promotion.id})" class="btn-danger">Delete</button>
            </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    container.appendChild(table);
}

// Add user
function addUser() {
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newUserRole').value;
    const realName = document.getElementById('newUserRealName').value;
    const phone = document.getElementById('newUserPhone').value;
    const email = document.getElementById('newUserEmail').value;
    
    if (!username || !password) {
        showModal('Add User Error', 'Username and password are required.');
        return;
    }
    
    if (users.find(u => u.username === username)) {
        showModal('Add User Error', 'Username already exists.');
        return;
    }
    
    const newUser = {
        username,
        password,
        role,
        realName,
        phone,
        email
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Clear form
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newUserRealName').value = '';
    document.getElementById('newUserPhone').value = '';
    document.getElementById('newUserEmail').value = '';
    
    // Update display
    updateUsersTableDisplay();
    
    showModal('User Added', 'User added successfully!');
}

// Create promotion
function createPromotion() {
    const name = document.getElementById('promotionName').value;
    const category = document.getElementById('promotionCategory').value;
    const system = document.getElementById('promotionSystem').value;
    const code = document.getElementById('promotionCode').value;
    const sizeCategory = document.getElementById('promotionSizeCategory').value;
    const discount = parseFloat(document.getElementById('promotionDiscount').value);
    const startDate = document.getElementById('promotionStartDate').value;
    const endDate = document.getElementById('promotionEndDate').value;
    const description = document.getElementById('promotionDescription').value;
    
    if (!name || !category || !discount || !startDate || !endDate) {
        showModal('Create Promotion Error', 'Please fill in all required fields.');
        return;
    }
    
    const promotion = {
        id: Date.now(),
        name,
        category,
        system,
        code,
        sizeCategory,
        discount,
        startDate,
        endDate,
        description,
        created: new Date().toISOString()
    };
    
    const promotions = JSON.parse(localStorage.getItem('promotions') || '[]');
    promotions.push(promotion);
    localStorage.setItem('promotions', JSON.stringify(promotions));
    
    // Clear form
    document.getElementById('promotionName').value = '';
    document.getElementById('promotionCategory').value = '';
    document.getElementById('promotionSystem').value = '';
    document.getElementById('promotionCode').value = '';
    document.getElementById('promotionDiscount').value = '';
    document.getElementById('promotionStartDate').value = '';
    document.getElementById('promotionEndDate').value = '';
    document.getElementById('promotionDescription').value = '';
    
    // Update display
    updatePromotionsTableDisplay();
    
    showModal('Promotion Created', 'Promotion created successfully!');
}

// Save system settings
function saveSystemSettings() {
    const companyName = document.getElementById('companyName').value;
    const companyAddress = document.getElementById('companyAddress').value;
    const companyPhone = document.getElementById('companyPhone').value;
    const companyEmail = document.getElementById('companyEmail').value;
    const paymentTerms = document.getElementById('paymentTerms').value;
    const additionalInfo = document.getElementById('additionalInfo').value;
    const importantNotes = document.getElementById('importantNotes').value;
    
    const settings = {
        companyName,
        companyAddress,
        companyPhone,
        companyEmail,
        paymentTerms,
        additionalInfo,
        importantNotes
    };
    
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    showModal('Settings Saved', 'System settings saved successfully!');
}

// Reset system settings
function resetSystemSettings() {
    if (confirm('Are you sure you want to reset system settings to default?')) {
        const defaultSettings = {
            companyName: 'Your Company',
            companyAddress: 'Your Address',
            companyPhone: 'Your Phone',
            companyEmail: 'your@email.com',
            paymentTerms: '',
            additionalInfo: '',
            importantNotes: ''
        };
        
        localStorage.setItem('systemSettings', JSON.stringify(defaultSettings));
        
        // Update form fields
        document.getElementById('companyName').value = defaultSettings.companyName;
        document.getElementById('companyAddress').value = defaultSettings.companyAddress;
        document.getElementById('companyPhone').value = defaultSettings.companyPhone;
        document.getElementById('companyEmail').value = defaultSettings.companyEmail;
        document.getElementById('paymentTerms').value = defaultSettings.paymentTerms;
        document.getElementById('additionalInfo').value = defaultSettings.additionalInfo;
        document.getElementById('importantNotes').value = defaultSettings.importantNotes;
        
        showModal('Settings Reset', 'System settings have been reset to default.');
    }
}

// DOM loaded event
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing all features...');
    
    try {
        await initializeSystem();
        initializeEventListeners();
        
        // Test localStorage
        console.log('Testing localStorage...');
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            console.log('localStorage test: PASSED');
        } catch (error) {
            console.error('localStorage test: FAILED', error);
        }
        
        // Check if user is already logged in
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                currentUser = JSON.parse(savedUser);
                console.log('User already logged in:', currentUser.username, 'Role:', currentUser.role);
                
                // Show appropriate interface based on user role
                if (currentUser.role === 'admin') {
                    showAdminBackend();
                } else {
                    showSalesFrontend();
                }
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('currentUser');
                showLoginPage();
            }
        } else {
            showLoginPage();
        }
        
        console.log('All features initialized successfully');
        
        // Load options from database if available
        if (db) {
            loadOptionsFromDatabase();
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Smart price query function
async function smartPriceQuery() {
    const category = document.getElementById('categorySelect')?.value;
    const system = document.getElementById('systemSelect')?.value;
    const code1 = document.getElementById('code1Select')?.value;
    const width = parseFloat(document.getElementById('widthInput')?.value);
    const height = parseFloat(document.getElementById('heightInput')?.value);
    const unit = document.getElementById('unitSelect')?.value || 'cm';
    
    if (!category || !system || !code1 || !width || !height) {
        showModal('查询错误', '请选择产品类别、系统、CODE1，并输入宽度和高度。');
        return null;
    }
    
    try {
        // Convert units to cm for database query
        let widthCm = width;
        let heightCm = height;
        
        if (unit === 'in') {
            widthCm = width * 2.54;  // Convert inches to cm
        } else if (unit === 'mm') {
            widthCm = width / 10;    // Convert mm to cm
        }
        
        if (unit === 'in') {
            heightCm = height * 2.54; // Convert inches to cm
        } else if (unit === 'mm') {
            heightCm = height / 10;   // Convert mm to cm
        }
        
        // Query database for matching price
        console.log('Smart query - Querying price with:', { category, system, code1, widthCm, heightCm });
        const priceRecord = await queryPriceWithCodes(category, system, code1, null, widthCm, heightCm, 'cm', 'cm');
        console.log('Smart query - Price query result:', priceRecord);
        
        if (priceRecord) {
            // Auto-fill CODE2
            if (document.getElementById('code2Display')) {
                document.getElementById('code2Display').textContent = priceRecord.code2 || 'N/A';
            }
            
            // Display price result
            if (document.getElementById('priceResult')) {
                document.getElementById('priceResult').textContent = `$${priceRecord.price.toFixed(2)}`;
                document.getElementById('priceResult').style.display = 'block';
            }
            
            // Store for quotation
            window.currentPriceRecord = priceRecord;
            
            return priceRecord;
        } else {
            showModal('查询结果', '未找到匹配的价格记录。请检查输入参数或联系管理员。');
            return null;
        }
        
    } catch (error) {
        console.error('Price query error:', error);
        showModal('查询错误', '查询价格时出错: ' + error.message);
        return null;
    }
}

// Auto-fill CODE2 when CODE1 changes
async function autoFillCode2() {
    const category = document.getElementById('categorySelect')?.value;
    const system = document.getElementById('systemSelect')?.value;
    const code1 = document.getElementById('code1Select')?.value;
    
    if (!category || !system || !code1) return;
    
    try {
        // Find matching CODE2 from database
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.getAll();
        request.onsuccess = () => {
            const records = request.result;
            const matchingRecord = records.find(record => 
                record.category === category &&
                record.system === system &&
                record.code1 === code1
            );
            
            if (matchingRecord && document.getElementById('code2Display')) {
                document.getElementById('code2Display').textContent = matchingRecord.code2 || 'N/A';
            }
        };
        
    } catch (error) {
        console.error('Error auto-filling CODE2:', error);
    }
}

// Debug: Check database data for a specific category
async function checkDatabaseDataForCategory(category) {
    try {
        if (!db) return;
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const records = request.result;
            const categoryRecords = records.filter(r => r.category === category);
            
            console.log(`Database data for category "${category}":`, {
                totalRecords: records.length,
                categoryRecords: categoryRecords.length,
                sampleRecords: categoryRecords.slice(0, 3),
                allCategories: [...new Set(records.map(r => r.category))],
                allSystems: [...new Set(categoryRecords.map(r => r.system))],
                allCode1s: [...new Set(categoryRecords.map(r => r.code1))]
            });
        };
        
    } catch (error) {
        console.error('Error checking database data:', error);
    }
}

// Debug: Check a specific record in database
async function checkSpecificRecord(category, system, code1) {
    try {
        if (!db) return;
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const records = request.result;
            const matchingRecord = records.find(record => 
                record.category === category &&
                record.system === system &&
                record.code1 === code1
            );
            
            if (matchingRecord) {
                console.log('Found specific record:', matchingRecord);
                console.log('Record price field:', matchingRecord.price, typeof matchingRecord.price);
                console.log('All record fields:', Object.keys(matchingRecord));
                console.log('Sample price values from database:', records.slice(0, 5).map(r => ({ price: r.price, type: typeof r.price })));
            } else {
                console.log('No matching record found for:', { category, system, code1 });
            }
        };
        
    } catch (error) {
        console.error('Error checking specific record:', error);
    }
}

// Save quotation to localStorage
function saveQuotation() {
    try {
        console.log('Saving quotation with items:', quotationItems);
        
        const quotationData = {
            id: Date.now(),
            date: new Date().toISOString(),
            items: [...quotationItems],
            total: quotationItems.reduce((sum, item) => {
                const itemTotal = (item.price || 0) * (item.quantity || 1);
                console.log(`Item: ${item.category}, Price: ${item.price}, Quantity: ${item.quantity}, Total: ${itemTotal}`);
                return sum + itemTotal;
            }, 0),
            user: currentUser ? currentUser.username : 'unknown'
        };
        
        console.log('Quotation data to save:', quotationData);
        
        // Get existing quotations
        const existingQuotations = JSON.parse(localStorage.getItem(`quotations_${currentUser.username}`) || '[]');
        existingQuotations.push(quotationData);
        
        // Save to localStorage
        localStorage.setItem(`quotations_${currentUser.username}`, JSON.stringify(existingQuotations));
        
        // Update global quotations array
        quotations = existingQuotations;
        
        // Update display
        updateQuotationsDisplay();
        
        showModal('报价已保存', `报价已成功保存！\n报价编号: ${quotationData.id}\n总金额: $${quotationData.total.toFixed(2)}`);
        
        // Clear current quotation items
        quotationItems = [];
        updateQuotationItemsDisplay();
        updateQuotationTotals();
        
        // Force refresh of quotations display
        setTimeout(() => {
            updateQuotationsDisplay();
        }, 100);
        
    } catch (error) {
        console.error('Error saving quotation:', error);
        showModal('保存错误', '保存报价时出错: ' + error.message);
    }
}

// Export quotation to PDF
function exportPDF() {
    try {
        console.log('Exporting PDF, quotationItems:', quotationItems);
        
        if (quotationItems.length === 0) {
            showModal('导出错误', '请先添加产品项目到报价单中。');
            return;
        }
        
        // Check if jsPDF is available
        if (typeof window.jspdf === 'undefined') {
            showModal('PDF导出错误', 'PDF导出功能需要jsPDF库。请确保已正确加载jsPDF库。');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add company header
        doc.setFontSize(20);
        doc.text('报价单', 105, 20, { align: 'center' });
        
        // Add date
        doc.setFontSize(12);
        doc.text(`日期: ${new Date().toLocaleDateString()}`, 20, 35);
        doc.text(`报价编号: ${Date.now()}`, 20, 45);
        
        // Add items table
        const tableData = quotationItems.map(item => [
            `${item.category} - ${item.system}`,
            `${item.code1}-${item.code2 || 'N/A'}`,
            `${item.width} × ${item.height} cm`,
            item.quantity.toString(),
            `$${item.price.toFixed(2)}`,
            `$${(item.price * item.quantity).toFixed(2)}`
        ]);
        
        doc.autoTable({
            head: [['产品', '代码', '尺寸', '数量', '单价', '小计']],
            body: tableData,
            startY: 60,
            headStyles: { fillColor: [66, 139, 202] }
        });
        
        // Add total
        const total = quotationItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text(`总计: $${total.toFixed(2)}`, 150, finalY);
        
        // Save PDF
        doc.save(`quotation_${Date.now()}.pdf`);
        
        showModal('PDF导出成功', '报价单已成功导出为PDF文件。');
        
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showModal('PDF导出错误', '导出PDF时出错: ' + error.message);
    }
}

// Print quotation
function printQuotation() {
    try {
        console.log('Printing quotation, quotationItems:', quotationItems);
        
        if (quotationItems.length === 0) {
            showModal('打印错误', '请先添加产品项目到报价单中。');
            return;
        }
        
        // Create print-friendly content
        const printContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h1 style="text-align: center;">报价单</h1>
                <p><strong>日期:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>报价编号:</strong> ${Date.now()}</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #f0f0f0;">
                            <th style="border: 1px solid #ddd; padding: 8px;">产品</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">代码</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">尺寸</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">数量</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">单价</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">小计</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${quotationItems.map(item => `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">${item.category} - ${item.system}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${item.code1}-${item.code2 || 'N/A'}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${item.width} × ${item.height} cm</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">$${item.price.toFixed(2)}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">$${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <p style="text-align: right; font-size: 18px; font-weight: bold;">
                    总计: $${quotationItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                </p>
            </div>
        `;
        
        // Create new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = function() {
            printWindow.print();
            printWindow.close();
        };
        
    } catch (error) {
        console.error('Error printing quotation:', error);
        showModal('打印错误', '打印报价单时出错: ' + error.message);
    }
}

// Load available options from database
async function loadOptionsFromDatabase() {
    try {
        if (!db) return;
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const records = request.result;
            
            // Load categories
            const categories = [...new Set(records.map(r => r.category))];
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect) {
                categorySelect.innerHTML = '<option value="">选择产品类别</option>' +
                    categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            }
            
            // Load systems for selected category
            if (categorySelect) {
                categorySelect.onchange = function() {
                    const selectedCategory = this.value;
                    const systems = [...new Set(records.filter(r => r.category === selectedCategory).map(r => r.system))];
                    const systemSelect = document.getElementById('systemSelect');
                    if (systemSelect) {
                        systemSelect.innerHTML = '<option value="">选择系统</option>' +
                            systems.map(sys => `<option value="${sys}">${sys}</option>`).join('');
                        systemSelect.disabled = false;
                    }
                };
            }
            
            // Load CODE1 for selected category and system
            const systemSelect = document.getElementById('systemSelect');
            if (systemSelect) {
                systemSelect.onchange = function() {
                    const selectedCategory = categorySelect.value;
                    const selectedSystem = this.value;
                    const code1s = [...new Set(records.filter(r => 
                        r.category === selectedCategory && r.system === selectedSystem
                    ).map(r => r.code1))];
                    
                    const code1Select = document.getElementById('code1Select');
                    if (code1Select) {
                        code1Select.innerHTML = '<option value="">选择CODE1</option>' +
                            code1s.map(code => `<option value="${code}">${code}</option>`).join('');
                        code1Select.disabled = false;
                    }
                };
            }
            
            // Load CODE2 when CODE1 changes
            const code1Select = document.getElementById('code1Select');
            if (code1Select) {
                code1Select.onchange = function() {
                    autoFillCode2();
                };
            }
        };
        
    } catch (error) {
        console.error('Error loading options from database:', error);
    }
}