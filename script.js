// 全局变量
let currentUser = null;
let priceTable = [];
let products = [];
let users = [];
let systemSettings = {};
let currentLanguage = 'zh'; // 默认中文

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing system...'); // 调试信息
    initializeSystem();
    loadData();
    showLoginPage();
    
    // 测试localStorage是否工作
    console.log('Testing localStorage...'); // 调试信息
    try {
        localStorage.setItem('test', 'test');
        const testValue = localStorage.getItem('test');
        console.log('localStorage test:', testValue === 'test' ? 'PASSED' : 'FAILED'); // 调试信息
        localStorage.removeItem('test');
    } catch (e) {
        console.error('localStorage test failed:', e); // 调试信息
    }
});

// 系统初始化
function initializeSystem() {
    // 初始化默认用户（管理员）
    if (!localStorage.getItem('users')) {
        const defaultUsers = [
            {
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                realName: '系统管理员',
                phone: '13800138000',
                email: 'admin@company.com'
            },
            {
                username: 'sales1',
                password: 'sales123',
                role: 'sales',
                realName: '销售员1',
                phone: '13800138001',
                email: 'sales1@company.com'
            }
        ];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
        console.log('Default users created:', defaultUsers); // 调试信息
    } else {
        console.log('Users already exist in localStorage'); // 调试信息
    }
    
    // 初始化默认价格表
    if (!localStorage.getItem('priceTable')) {
        const defaultPriceTable = [
            // 基于您提供的图片数据
            { category: "标准产品", widthMin: 30.5, widthMax: 55.8, heightMin: 35.6, heightMax: 63.5, price: 18.19 },
            { category: "标准产品", widthMin: 58.5, widthMax: 86.4, heightMin: 35.6, heightMax: 63.5, price: 22.89 },
            { category: "标准产品", widthMin: 88.9, widthMax: 116.8, heightMin: 35.6, heightMax: 63.5, price: 28.10 },
            { category: "标准产品", widthMin: 119.5, widthMax: 147.3, heightMin: 35.6, heightMax: 63.5, price: 33.06 },
            { category: "标准产品", widthMin: 149.8, widthMax: 175.3, heightMin: 35.6, heightMax: 63.5, price: 37.41 },
            { category: "标准产品", widthMin: 177.8, widthMax: 195.6, heightMin: 35.6, heightMax: 63.5, price: 42.96 },
            { category: "标准产品", widthMin: 198.1, widthMax: 213.4, heightMin: 35.6, heightMax: 63.5, price: 46.16 },
            { category: "标准产品", widthMin: 215.9, widthMax: 231.1, heightMin: 35.6, heightMax: 63.5, price: 49.12 },
            { category: "标准产品", widthMin: 234, widthMax: 262, heightMin: 35.6, heightMax: 63.5, price: 54.82 },
            { category: "标准产品", widthMin: 30.5, widthMax: 55.8, heightMin: 66, heightMax: 94, price: 19.26 },
            { category: "标准产品", widthMin: 58.5, widthMax: 86.4, heightMin: 66, heightMax: 94, price: 24.55 },
            { category: "标准产品", widthMin: 88.9, widthMax: 116.8, heightMin: 66, heightMax: 94, price: 30.34 },
            { category: "标准产品", widthMin: 119.5, widthMax: 147.3, heightMin: 66, heightMax: 94, price: 35.88 },
            { category: "标准产品", widthMin: 149.8, widthMax: 175.3, heightMin: 66, heightMax: 94, price: 40.77 },
            { category: "标准产品", widthMin: 177.8, widthMax: 195.6, heightMin: 66, heightMax: 94, price: 46.71 },
            { category: "标准产品", widthMin: 198.1, widthMax: 213.4, heightMin: 66, heightMax: 94, price: 50.26 },
            { category: "标准产品", widthMin: 215.9, widthMax: 231.1, heightMin: 66, heightMax: 94, price: 53.55 },
            { category: "标准产品", widthMin: 234, widthMax: 262, heightMin: 66, heightMax: 94, price: 59.84 }
        ];
        localStorage.setItem('priceTable', JSON.stringify(defaultPriceTable));
    }
    
    // 初始化默认产品
    if (!localStorage.getItem('products')) {
        const defaultProducts = [
            { category: "标准产品", system: "标准系统", code1: "STD001", code2: "A001" },
            { category: "标准产品", system: "标准系统", code1: "STD002", code2: "A002" },
            { category: "标准产品", system: "标准系统", code1: "STD003", code2: "A003" },
            { category: "定制产品", system: "定制系统", code1: "CUS001", code2: "B001" },
            { category: "定制产品", system: "定制系统", code1: "CUS002", code2: "B002" },
            { category: "高端产品", system: "高端系统", code1: "PRE001", code2: "C001" },
            { category: "高端产品", system: "高端系统", code1: "PRE002", code2: "C002" },
            { category: "经济产品", system: "经济系统", code1: "ECO001", code2: "D001" },
            { category: "经济产品", system: "经济系统", code1: "ECO002", code2: "D002" }
        ];
        localStorage.setItem('products', JSON.stringify(defaultProducts));
    }
    
    // 初始化系统设置
    if (!localStorage.getItem('systemSettings')) {
        const defaultSettings = {
            companyName: "示例公司",
            companyAddress: "公司地址",
            companyPhone: "公司电话",
            companyEmail: "company@example.com",
            paymentTerms: "付款条款",
            bankName: "银行名称",
            accountName: "账户名",
            accountNumber: "账号",
            routingNumber: "路由号",
            zelleInfo: "Zelle信息",
            swiftCode: "SWIFT代码"
        };
        localStorage.setItem('systemSettings', JSON.stringify(defaultSettings));
    }
    
    // 初始化其他数据
    if (!localStorage.getItem('quotations')) {
        localStorage.setItem('quotations', JSON.stringify([]));
    }
    if (!localStorage.getItem('customers')) {
        localStorage.setItem('customers', JSON.stringify([]));
    }
}

// 加载数据
function loadData() {
    priceTable = JSON.parse(localStorage.getItem('priceTable') || '[]');
    products = JSON.parse(localStorage.getItem('products') || '[]');
    users = JSON.parse(localStorage.getItem('users') || '[]');
    systemSettings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    
    console.log('Data loaded - Users:', users); // 调试信息
    console.log('Data loaded - PriceTable:', priceTable.length, 'entries'); // 调试信息
    console.log('Data loaded - Products:', products.length, 'entries'); // 调试信息
}

// 显示登录页面
function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('salesFrontend').style.display = 'none';
    document.getElementById('adminBackend').style.display = 'none';
}

// 用户登录
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('请输入用户名和密码');
        return;
    }
    
    // 确保用户数据已加载
    if (!users || users.length === 0) {
        users = JSON.parse(localStorage.getItem('users') || '[]');
    }
    
    console.log('Available users:', users); // 调试信息
    console.log('Attempting login with:', username, password); // 调试信息
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        console.log('Login successful:', user); // 调试信息
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        if (user.role === 'admin') {
            showAdminBackend();
        } else {
            showSalesFrontend();
        }
    } else {
        console.log('Login failed - no matching user found'); // 调试信息
        alert('用户名或密码错误');
    }
}

// 显示销售员前台
function showSalesFrontend() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('salesFrontend').style.display = 'block';
    document.getElementById('adminBackend').style.display = 'none';
    
    document.getElementById('currentUser').textContent = `${currentUser.realName} (${currentUser.username})`;
    
    // 初始化快速查价
    initializePricingRows();
    
    // 加载用户数据
    loadUserData();
}

// 显示管理员后台
function showAdminBackend() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('salesFrontend').style.display = 'none';
    document.getElementById('adminBackend').style.display = 'block';
    
    document.getElementById('adminUser').textContent = `${currentUser.realName} (${currentUser.username})`;
    
    // 加载管理数据
    loadAdminData();
}

// 退出登录
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLoginPage();
}

// 重置系统（调试用）
function resetSystem() {
    if (confirm('确定要重置系统吗？这将清除所有数据并重新初始化。')) {
        localStorage.clear();
        location.reload();
    }
}

// 初始化快速查价行
function initializePricingRows() {
    const container = document.getElementById('pricingRows');
    container.innerHTML = '';
    addPricingRow(); // 添加第一行
}

// 添加查价行
function addPricingRow() {
    const container = document.getElementById('pricingRows');
    const rowId = Date.now();
    const rowNumber = container.children.length + 1;
    
    // 调试信息
    console.log('Adding pricing row, products:', products);
    console.log('Unique categories:', getUniqueCategories());
    console.log('Unique systems:', getUniqueSystems());
    console.log('Unique codes1:', getUniqueCodes1());
    console.log('Unique codes2:', getUniqueCodes2());
    
    const rowHtml = `
        <div class="pricing-row" id="pricing-row-${rowId}">
            <div class="pricing-row-content">
                <div class="form-group">
                    <label>序号:</label>
                    <input type="text" value="${rowNumber}" readonly style="text-align: center; background: #f8f9fa;">
                </div>
                <div class="form-group">
                    <label>品类:</label>
                    <select onchange="updateProductOptions(${rowId}, 'category')">
                        <option value="">请选择品类</option>
                        ${getUniqueCategories().map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>系统:</label>
                    <select onchange="updateProductOptions(${rowId}, 'system')">
                        <option value="">请选择系统</option>
                        ${getUniqueSystems().map(sys => `<option value="${sys}">${sys}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>产品编号1:</label>
                    <select onchange="updateProductOptions(${rowId}, 'code1')">
                        <option value="">请选择产品编号1</option>
                        ${getUniqueCodes1().map(code => `<option value="${code}">${code}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>产品编号2:</label>
                    <select onchange="updateProductOptions(${rowId}, 'code2')">
                        <option value="">请选择产品编号2</option>
                        ${getUniqueCodes2().map(code => `<option value="${code}">${code}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>宽度:</label>
                    <input type="number" step="0.01" placeholder="宽度" onchange="updatePricingRow(${rowId})">
                </div>
                <div class="form-group">
                    <label>宽度单位:</label>
                    <select onchange="updatePricingRow(${rowId})">
                        <option value="cm">厘米</option>
                        <option value="in">英寸</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>高度:</label>
                    <input type="number" step="0.01" placeholder="高度" onchange="updatePricingRow(${rowId})">
                </div>
                <div class="form-group">
                    <label>高度单位:</label>
                    <select onchange="updatePricingRow(${rowId})">
                        <option value="cm">厘米</option>
                        <option value="in">英寸</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>数量:</label>
                    <input type="number" min="1" value="1" onchange="updatePricingRow(${rowId})">
                </div>
                <div class="form-group">
                    <label>单价:</label>
                    <input type="text" readonly class="currency">
                </div>
                <div class="form-group">
                    <label>小计:</label>
                    <input type="text" readonly class="currency">
                </div>
                <div class="form-group">
                    <label>合计:</label>
                    <input type="text" readonly class="currency">
                </div>
                <div class="form-group">
                    <button class="remove-pricing-row" onclick="removePricingRow(${rowId})" style="margin-top: 20px;">删除</button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', rowHtml);
}

// 删除查价行
function removePricingRow(rowId) {
    document.getElementById(`pricing-row-${rowId}`).remove();
    // 重新编号
    document.querySelectorAll('.pricing-row').forEach((row, index) => {
        const serialInput = row.querySelector('input[readonly]');
        if (serialInput) {
            serialInput.value = index + 1;
        }
    });
    // 重新计算总计
    if (document.getElementById('totalAmountDisplay')) {
        calculateTotalAmount();
    }
}

// 获取唯一品类
function getUniqueCategories() {
    return [...new Set(products.map(p => p.category))];
}

// 获取唯一系统
function getUniqueSystems() {
    return [...new Set(products.map(p => p.system))];
}

// 获取唯一产品编号1
function getUniqueCodes1() {
    return [...new Set(products.map(p => p.code1))];
}

// 获取唯一产品编号2
function getUniqueCodes2() {
    return [...new Set(products.map(p => p.code2))];
}

// 更新产品选项
function updateProductOptions(rowId, fieldType) {
    const row = document.getElementById(`pricing-row-${rowId}`);
    const categorySelect = row.querySelector('select[onchange*="category"]');
    const systemSelect = row.querySelector('select[onchange*="system"]');
    const code1Select = row.querySelector('select[onchange*="code1"]');
    const code2Select = row.querySelector('select[onchange*="code2"]');
    
    const selectedCategory = categorySelect.value;
    const selectedSystem = systemSelect.value;
    
    // 调试信息
    console.log('updateProductOptions called:', { fieldType, selectedCategory, selectedSystem });
    
    // 根据选择的品类和系统过滤产品编号
    if (fieldType === 'category' || fieldType === 'system') {
        let filteredProducts = products;
        
        if (selectedCategory) {
            filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
        }
        if (selectedSystem) {
            filteredProducts = filteredProducts.filter(p => p.system === selectedSystem);
        }
        
        // 更新产品编号选项
        const uniqueCodes1 = [...new Set(filteredProducts.map(p => p.code1))];
        const uniqueCodes2 = [...new Set(filteredProducts.map(p => p.code2))];
        
        console.log('Filtered products:', filteredProducts);
        console.log('Unique codes1:', uniqueCodes1);
        console.log('Unique codes2:', uniqueCodes2);
        
        // 更新产品编号1下拉菜单
        code1Select.innerHTML = '<option value="">请选择产品编号1</option>' + 
            uniqueCodes1.map(code => `<option value="${code}">${code}</option>`).join('');
        
        // 更新产品编号2下拉菜单
        code2Select.innerHTML = '<option value="">请选择产品编号2</option>' + 
            uniqueCodes2.map(code => `<option value="${code}">${code}</option>`).join('');
        
        // 清空已选择的产品编号
        code1Select.value = '';
        code2Select.value = '';
    }
    
    // 当所有必要字段都选择后，自动填充产品信息
    if (selectedCategory && selectedSystem) {
        updatePricingRow(rowId);
    }
}

// 更新查价行
function updatePricingRow(rowId) {
    const row = document.getElementById(`pricing-row-${rowId}`);
    const inputs = row.querySelectorAll('input');
    const selects = row.querySelectorAll('select');
    
    const category = selects[0].value; // 品类下拉菜单
    const system = selects[1].value;   // 系统下拉菜单
    const code1 = selects[2].value;    // 产品编号1下拉菜单
    const code2 = selects[3].value;    // 产品编号2下拉菜单
    const width = parseFloat(inputs[1].value);  // 宽度输入框（索引1）
    const widthUnit = selects[4].value;  // 宽度单位
    const height = parseFloat(inputs[2].value); // 高度输入框（索引2）
    const heightUnit = selects[5].value; // 高度单位
    const quantity = parseInt(inputs[3].value); // 数量输入框（索引3）
    
    if (category && system && code1 && code2 && width && height && quantity && !isNaN(quantity) && quantity > 0) {
        // 转换为厘米
        const widthCm = widthUnit === 'in' ? width * 2.54 : width;
        const heightCm = heightUnit === 'in' ? height * 2.54 : height;
        
        // 查找匹配的价格
        const matchedPrice = priceTable.find(item => 
            item.category === category &&
            widthCm >= item.widthMin && widthCm <= item.widthMax &&
            heightCm >= item.heightMin && heightCm <= item.heightMax
        );
        
        if (matchedPrice) {
            const unitPrice = matchedPrice.price;
            const subtotal = unitPrice * quantity;
            
            inputs[4].value = formatCurrency(unitPrice);  // 单价（索引4）
            inputs[5].value = formatCurrency(subtotal);   // 小计（索引5）
            inputs[6].value = formatCurrency(subtotal);   // 合计（单行时等于小计）
            
            // 如果总计显示区域存在，重新计算总计
            if (document.getElementById('totalAmountDisplay')) {
                calculateTotalAmount();
            }
        }
    } else {
        // 如果条件不满足，清空价格相关字段
        inputs[4].value = '';  // 单价
        inputs[5].value = '';  // 小计
        inputs[6].value = '';  // 合计
    }
}

// 计算所有行的总计
function calculateTotalAmount() {
    const rows = document.querySelectorAll('.pricing-row');
    let totalAmount = 0;
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const subtotalInput = inputs[5]; // 小计输入框（索引5）
        
        if (subtotalInput && subtotalInput.value && subtotalInput.value !== '$0.00' && subtotalInput.value !== '') {
            // 提取数字部分
            const subtotalValue = parseFloat(subtotalInput.value.replace(/[$,]/g, ''));
            if (!isNaN(subtotalValue) && subtotalValue > 0) {
                totalAmount += subtotalValue;
            }
        }
    });
    
    // 在页面顶部显示总计
    const totalDisplay = document.getElementById('totalAmountDisplay');
    if (!totalDisplay) {
        // 如果总计显示区域不存在，创建一个
        const pricingHeader = document.querySelector('.pricing-header');
        const totalDiv = document.createElement('div');
        totalDiv.id = 'totalAmountDisplay';
        totalDiv.innerHTML = `
            <div style="background: #e8f5e8; padding: 10px; border-radius: 6px; margin-top: 10px; text-align: center;">
                <strong style="color: #27ae60; font-size: 18px;">总计: ${formatCurrency(totalAmount)}</strong>
            </div>
        `;
        pricingHeader.appendChild(totalDiv);
    } else {
        totalDisplay.innerHTML = `
            <div style="background: #e8f5e8; padding: 10px; border-radius: 6px; margin-top: 10px; text-align: center;">
                <strong style="color: #27ae60; font-size: 18px;">总计: ${formatCurrency(totalAmount)}</strong>
            </div>
        `;
    }
}

// 查询所有价格
function searchAllPrices() {
    const rows = document.querySelectorAll('.pricing-row');
    let hasValidData = false;
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const selects = row.querySelectorAll('select');
        
        const category = selects[0].value; // 品类下拉菜单
        const system = selects[1].value;   // 系统下拉菜单
        const code1 = selects[2].value;    // 产品编号1下拉菜单
        const code2 = selects[3].value;    // 产品编号2下拉菜单
        const width = parseFloat(inputs[1].value);  // 宽度输入框（索引1）
        const height = parseFloat(inputs[2].value); // 高度输入框（索引2）
        const widthUnit = selects[4].value;  // 宽度单位
        const heightUnit = selects[5].value; // 高度单位
        const quantity = parseInt(inputs[3].value); // 数量输入框（索引3）
        
        if (category && system && code1 && code2 && width && height && quantity && !isNaN(quantity) && quantity > 0) {
            hasValidData = true;
            updatePricingRow(row.id.split('-')[2]);
        }
    });
    
    if (hasValidData) {
        document.getElementById('addToQuotationBtn').style.display = 'inline-block';
        // 计算所有行的总计
        calculateTotalAmount();
    } else {
        alert('请至少填写一行完整的产品信息');
    }
}

// 显示查价结果
function displayPricingResults() {
    const container = document.getElementById('resultsTable');
    const rows = document.querySelectorAll('.pricing-row');
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>序号</th>
                    <th>品类</th>
                    <th>系统</th>
                    <th>产品编号1</th>
                    <th>产品编号2</th>
                    <th>尺寸</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>小计</th>
                    <th>合计</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    rows.forEach((row, index) => {
        const inputs = row.querySelectorAll('input');
        const selects = row.querySelectorAll('select');
        
        const category = selects[0].value; // 品类下拉菜单
        const system = selects[1].value;   // 系统下拉菜单
        const code1 = selects[2].value;    // 产品编号1下拉菜单
        const code2 = selects[3].value;    // 产品编号2下拉菜单
        const width = inputs[1].value;     // 宽度输入框（索引1）
        const height = inputs[2].value;    // 高度输入框（索引2）
        const widthUnit = selects[4].value;  // 宽度单位
        const heightUnit = selects[5].value; // 高度单位
        const quantity = inputs[3].value;    // 数量输入框（索引3）
        const unitPrice = inputs[4].value;   // 单价（索引4）
        const subtotal = inputs[5].value;    // 小计（索引5）
        const total = inputs[6].value;       // 合计（索引6）
        
        if (category && system && code1 && code2 && width && height && quantity && !isNaN(parseInt(quantity)) && parseInt(quantity) > 0) {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${category}</td>
                    <td>${system}</td>
                    <td>${code1}</td>
                    <td>${code2}</td>
                    <td>${width}×${height}${widthUnit === 'in' ? '英寸' : '厘米'}</td>
                    <td>${quantity}</td>
                    <td>${unitPrice}</td>
                    <td>${subtotal}</td>
                    <td>${total}</td>
                </tr>
            `;
        }
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// 添加到报价单
function addToQuotation() {
    // 跳转到报价单页面
    showTab('quotation');
    
    // 清空现有产品明细
    document.getElementById('productList').innerHTML = '';
    
    // 添加查价结果到报价单
    const rows = document.querySelectorAll('.pricing-row');
    rows.forEach((row, index) => {
        const inputs = row.querySelectorAll('input');
        const selects = row.querySelectorAll('select');
        
        const category = selects[0].value; // 品类下拉菜单
        const system = selects[1].value;   // 系统下拉菜单
        const code1 = selects[2].value;    // 产品编号1下拉菜单
        const code2 = selects[3].value;    // 产品编号2下拉菜单
        const width = inputs[1].value;     // 宽度输入框（索引1）
        const height = inputs[2].value;    // 高度输入框（索引2）
        const widthUnit = selects[4].value;  // 宽度单位
        const heightUnit = selects[5].value; // 高度单位
        const quantity = inputs[3].value;    // 数量输入框（索引3）
        const unitPrice = inputs[4].value;   // 单价（索引4）
        const subtotal = inputs[5].value;    // 小计（索引5）
        const total = inputs[6].value;       // 合计（索引6）
        
        if (category && system && code1 && code2 && width && height && quantity && !isNaN(parseInt(quantity)) && parseInt(quantity) > 0) {
            addProductItemFromPricing({
                category, system, code1, code2, width, height, 
                widthUnit, heightUnit, quantity, unitPrice, subtotal, total
            });
        }
    });
    
    // 更新报价汇总
    updateQuotationSummary();
}

// 从查价结果添加产品项
function addProductItemFromPricing(data) {
    const productList = document.getElementById('productList');
    const itemId = Date.now();
    
    const itemHtml = `
        <div class="product-item" id="item-${itemId}">
            <div class="product-item-header">
                <h4>产品 ${productList.children.length + 1}</h4>
                <button class="remove-product" onclick="removeProductItem(${itemId})">删除</button>
            </div>
            <div class="product-item-content">
                <div class="form-group">
                    <label>品类:</label>
                    <input type="text" value="${data.category}" readonly>
                </div>
                <div class="form-group">
                    <label>系统:</label>
                    <input type="text" value="${data.system}" readonly>
                </div>
                <div class="form-group">
                    <label>产品编号1:</label>
                    <input type="text" value="${data.code1}" readonly>
                </div>
                <div class="form-group">
                    <label>产品编号2:</label>
                    <input type="text" value="${data.code2}" readonly>
                </div>
                <div class="form-group">
                    <label>尺寸:</label>
                    <input type="text" value="${data.width}×${data.height}${data.widthUnit === 'in' ? '英寸' : '厘米'}" readonly>
                </div>
                <div class="form-group">
                    <label>数量:</label>
                    <input type="number" value="${data.quantity}" min="1" onchange="calculateItemPrice(${itemId})">
                </div>
                <div class="form-group">
                    <label>单价:</label>
                    <input type="text" value="${data.unitPrice}" readonly class="currency">
                </div>
                <div class="form-group">
                    <label>小计:</label>
                    <input type="text" value="${data.subtotal}" readonly class="currency">
                </div>
                <div class="form-group">
                    <label>合计:</label>
                    <input type="text" value="${data.total}" readonly class="currency">
                </div>
                <div class="form-group">
                    <label>备注:</label>
                    <input type="text" placeholder="可选">
                </div>
            </div>
        </div>
    `;
    
    productList.insertAdjacentHTML('beforeend', itemHtml);
}

// 格式化货币显示
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// 标签页切换（销售员前台）
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// 标签页切换（管理员后台）
function showAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// 更新产品类别选择器
function updateCategorySelect() {
    const select = document.getElementById('categorySelect');
    select.innerHTML = '<option value="">请选择类别</option>';
    
    const categories = [...new Set(products.map(p => p.category))];
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

// 价格查询
function searchPrice() {
    const category = document.getElementById('categorySelect').value;
    const width = parseFloat(document.getElementById('widthInput').value);
    const height = parseFloat(document.getElementById('heightInput').value);
    const widthUnit = document.getElementById('widthUnit').value;
    const heightUnit = document.getElementById('heightUnit').value;
    
    if (!category || !width || !height) {
        alert('请填写完整信息');
        return;
    }
    
    // 转换为厘米
    const widthCm = widthUnit === 'in' ? width * 2.54 : width;
    const heightCm = heightUnit === 'in' ? height * 2.54 : height;
    
    // 查找匹配的价格
    const matchedPrice = priceTable.find(item => 
        item.category === category &&
        widthCm >= item.widthMin && widthCm <= item.widthMax &&
        heightCm >= item.heightMin && heightCm <= item.heightMax
    );
    
    if (matchedPrice) {
        document.getElementById('resultCategory').textContent = category;
        document.getElementById('resultDimensions').textContent = 
            `${widthCm.toFixed(1)}cm × ${heightCm.toFixed(1)}cm`;
        document.getElementById('resultPrice').textContent = matchedPrice.price.toFixed(2);
        document.getElementById('priceResult').style.display = 'block';
    } else {
        alert('未找到匹配的价格，请检查尺寸范围');
        document.getElementById('priceResult').style.display = 'none';
    }
}

// 添加产品项
function addProductItem() {
    const productList = document.getElementById('productList');
    const itemId = Date.now();
    
    const itemHtml = `
        <div class="product-item" id="item-${itemId}">
            <div class="product-item-header">
                <h4>产品 ${productList.children.length + 1}</h4>
                <button class="remove-product" onclick="removeProductItem(${itemId})">删除</button>
            </div>
            <div class="product-item-content">
                <div class="form-group">
                    <label>产品类别:</label>
                    <select onchange="updateProductNames(this, ${itemId})">
                        <option value="">请选择</option>
                        ${[...new Set(products.map(p => p.category))].map(cat => 
                            `<option value="${cat}">${cat}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>产品名称:</label>
                    <select id="product-name-${itemId}">
                        <option value="">请先选择类别</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>宽度:</label>
                    <input type="number" step="0.01" placeholder="宽度" onchange="calculateItemPrice(${itemId})">
                    <select onchange="calculateItemPrice(${itemId})">
                        <option value="cm">厘米</option>
                        <option value="in">英寸</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>高度:</label>
                    <input type="number" step="0.01" placeholder="高度" onchange="calculateItemPrice(${itemId})">
                    <select onchange="calculateItemPrice(${itemId})">
                        <option value="cm">厘米</option>
                        <option value="in">英寸</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>数量:</label>
                    <input type="number" min="1" value="1" onchange="calculateItemPrice(${itemId})">
                </div>
                <div class="form-group">
                    <label>单价:</label>
                    <input type="number" step="0.01" readonly>
                </div>
                <div class="form-group">
                    <label>小计:</label>
                    <input type="number" step="0.01" readonly>
                </div>
            </div>
        </div>
    `;
    
    productList.insertAdjacentHTML('beforeend', itemHtml);
}

// 更新产品名称选择器
function updateProductNames(categorySelect, itemId) {
    const productNameSelect = document.getElementById(`product-name-${itemId}`);
    const category = categorySelect.value;
    
    productNameSelect.innerHTML = '<option value="">请选择产品</option>';
    
    if (category) {
        const categoryProducts = products.filter(p => p.category === category);
        categoryProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.name;
            option.textContent = `${product.name} (${product.model})`;
            productNameSelect.appendChild(option);
        });
    }
}

// 删除产品项
function removeProductItem(itemId) {
    document.getElementById(`item-${itemId}`).remove();
    updateQuotationSummary();
}

// 计算产品项价格
function calculateItemPrice(itemId) {
    const item = document.getElementById(`item-${itemId}`);
    const category = item.querySelector('select').value;
    const width = parseFloat(item.querySelectorAll('input')[0].value);
    const height = parseFloat(item.querySelectorAll('input')[1].value);
    const widthUnit = item.querySelectorAll('select')[1].value;
    const heightUnit = item.querySelectorAll('select')[2].value;
    const quantity = parseInt(item.querySelectorAll('input')[2].value);
    
    if (!category || !width || !height || !quantity) {
        return;
    }
    
    // 转换为厘米
    const widthCm = widthUnit === 'in' ? width * 2.54 : width;
    const heightCm = heightUnit === 'in' ? height * 2.54 : height;
    
    // 查找匹配的价格
    const matchedPrice = priceTable.find(item => 
        item.category === category &&
        widthCm >= item.widthMin && widthCm <= item.widthMax &&
        heightCm >= item.heightMin && heightCm <= item.heightMax
    );
    
    if (matchedPrice) {
        const unitPrice = matchedPrice.price;
        const subtotal = unitPrice * quantity;
        
        item.querySelectorAll('input')[3].value = unitPrice.toFixed(2);
        item.querySelectorAll('input')[4].value = subtotal.toFixed(2);
        
        updateQuotationSummary();
    }
}

// 更新报价汇总
function updateQuotationSummary() {
    let subtotal = 0;
    
    document.querySelectorAll('.product-item').forEach(item => {
        const subtotalInput = item.querySelectorAll('input')[4];
        if (subtotalInput.value) {
            subtotal += parseFloat(subtotalInput.value);
        }
    });
    
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const shippingFee = parseFloat(document.getElementById('shippingFee').value) || 0;
    
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount + shippingFee;
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('taxAmount').textContent = taxAmount.toFixed(2);
    document.getElementById('totalAmount').textContent = totalAmount.toFixed(2);
}

// 保存报价单
function saveQuotation() {
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const customerAddress = document.getElementById('customerAddress').value;
    
    if (!customerName) {
        alert('请填写客户名称');
        return;
    }
    
    // 收集产品项
    const items = [];
    document.querySelectorAll('.product-item').forEach(item => {
        const category = item.querySelector('select').value;
        const productName = item.querySelectorAll('select')[1].value;
        const width = parseFloat(item.querySelectorAll('input')[0].value);
        const height = parseFloat(item.querySelectorAll('input')[1].value);
        const widthUnit = item.querySelectorAll('select')[1].value;
        const heightUnit = item.querySelectorAll('select')[2].value;
        const quantity = parseInt(item.querySelectorAll('input')[2].value);
        const unitPrice = parseFloat(item.querySelectorAll('input')[3].value);
        const subtotal = parseFloat(item.querySelectorAll('input')[4].value);
        
        if (category && productName && width && height && quantity) {
            items.push({
                category,
                productName,
                width,
                height,
                widthUnit,
                heightUnit,
                quantity,
                unitPrice,
                subtotal
            });
        }
    });
    
    if (items.length === 0) {
        alert('请至少添加一个产品');
        return;
    }
    
    // 创建报价单
    const quotation = {
        id: Date.now(),
        quoteNumber: generateQuoteNumber(),
        customer: {
            name: customerName,
            phone: customerPhone,
            address: customerAddress
        },
        items: items,
        subtotal: parseFloat(document.getElementById('subtotal').textContent),
        taxRate: parseFloat(document.getElementById('taxRate').value),
        taxAmount: parseFloat(document.getElementById('taxAmount').textContent),
        shippingFee: parseFloat(document.getElementById('shippingFee').value),
        totalAmount: parseFloat(document.getElementById('totalAmount').textContent),
        createDate: new Date().toLocaleString('zh-CN'),
        status: 'draft',
        userId: currentUser.id // 添加销售员ID
    };
    
    // 保存到本地存储
    const quotations = JSON.parse(localStorage.getItem('quotations') || '[]');
    quotations.push(quotation);
    localStorage.setItem('quotations', JSON.stringify(quotations));
    
    alert(`报价单已保存！报价号：${quotation.quoteNumber}`);
    
    // 清空表单
    clearQuotationForm();
}

// 生成报价号
function generateQuoteNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QT${year}${month}${day}${random}`;
}

// 清空报价单表单
function clearQuotationForm() {
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('productList').innerHTML = '';
    document.getElementById('taxRate').value = '13';
    document.getElementById('shippingFee').value = '0';
    updateQuotationSummary();
}

// 导出PDF
function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // 添加标题
    doc.setFontSize(20);
    doc.text('报价单', 105, 20, { align: 'center' });
    
    // 添加客户信息
    doc.setFontSize(12);
    doc.text('客户信息:', 20, 40);
    doc.text(`客户名称: ${document.getElementById('customerName').value || ''}`, 20, 50);
    doc.text(`联系电话: ${document.getElementById('customerPhone').value || ''}`, 20, 60);
    doc.text(`客户地址: ${document.getElementById('customerAddress').value || ''}`, 20, 70);
    
    // 添加产品明细
    doc.text('产品明细:', 20, 90);
    
    let y = 100;
    document.querySelectorAll('.product-item').forEach((item, index) => {
        const category = item.querySelector('select').value;
        const productName = item.querySelectorAll('select')[1].value;
        const width = item.querySelectorAll('input')[0].value;
        const height = item.querySelectorAll('input')[1].value;
        const quantity = item.querySelectorAll('input')[2].value;
        const unitPrice = item.querySelectorAll('input')[3].value;
        const subtotal = item.querySelectorAll('input')[4].value;
        
        if (category && productName) {
            doc.text(`${index + 1}. ${category} - ${productName}`, 20, y);
            doc.text(`尺寸: ${width}×${height}cm, 数量: ${quantity}, 单价: ¥${unitPrice}, 小计: ¥${subtotal}`, 30, y + 5);
            y += 15;
        }
    });
    
    // 添加汇总信息
    y += 10;
    doc.text('报价汇总:', 20, y);
    doc.text(`产品小计: ¥${document.getElementById('subtotal').textContent}`, 30, y + 10);
    doc.text(`税率: ${document.getElementById('taxRate').value}%`, 30, y + 20);
    doc.text(`税额: ¥${document.getElementById('taxAmount').textContent}`, 30, y + 30);
    doc.text(`运费: ¥${document.getElementById('shippingFee').value}`, 30, y + 40);
    doc.text(`总计: ¥${document.getElementById('totalAmount').textContent}`, 30, y + 50);
    
    // 保存PDF
    doc.save(`报价单_${new Date().toISOString().split('T')[0]}.pdf`);
}

// 打印报价单
function printQuotation() {
    const printWindow = window.open('', '_blank');
    const printContent = `
        <html>
        <head>
            <title>报价单</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 20px; }
                .section h3 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background: #f0f0f0; }
                .total { font-weight: bold; font-size: 18px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>报价单</h1>
                <p>报价日期: ${new Date().toLocaleDateString('zh-CN')}</p>
            </div>
            
            <div class="section">
                <h3>客户信息</h3>
                <p><strong>客户名称:</strong> ${document.getElementById('customerName').value || ''}</p>
                <p><strong>联系电话:</strong> ${document.getElementById('customerPhone').value || ''}</p>
                <p><strong>客户地址:</strong> ${document.getElementById('customerAddress').value || ''}</p>
            </div>
            
            <div class="section">
                <h3>产品明细</h3>
                <table>
                    <thead>
                        <tr>
                            <th>序号</th>
                            <th>产品类别</th>
                            <th>产品名称</th>
                            <th>尺寸</th>
                            <th>数量</th>
                            <th>单价</th>
                            <th>小计</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from(document.querySelectorAll('.product-item')).map((item, index) => {
                            const category = item.querySelector('select').value;
                            const productName = item.querySelectorAll('select')[1].value;
                            const width = item.querySelectorAll('input')[0].value;
                            const height = item.querySelectorAll('input')[1].value;
                            const quantity = item.querySelectorAll('input')[2].value;
                            const unitPrice = item.querySelectorAll('input')[3].value;
                            const subtotal = item.querySelectorAll('input')[4].value;
                            
                            if (category && productName) {
                                return `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${category}</td>
                                        <td>${productName}</td>
                                        <td>${width}×${height}cm</td>
                                        <td>${quantity}</td>
                                        <td>¥${unitPrice}</td>
                                        <td>¥${subtotal}</td>
                                    </tr>
                                `;
                            }
                            return '';
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h3>报价汇总</h3>
                <p><strong>产品小计:</strong> ¥${document.getElementById('subtotal').textContent}</p>
                <p><strong>税率:</strong> ${document.getElementById('taxRate').value}%</p>
                <p><strong>税额:</strong> ¥${document.getElementById('taxAmount').textContent}</p>
                <p><strong>运费:</strong> ¥${document.getElementById('shippingFee').value}</p>
                <p class="total"><strong>总计:</strong> ¥${document.getElementById('totalAmount').textContent}</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// 加载用户数据
function loadUserData() {
    loadMyQuotations();
    loadMyCustomers();
}

// 加载管理数据
function loadAdminData() {
    displayProductTable();
    displayPriceTable();
    displayUsersTable();
    loadAllQuotations();
    loadSystemSettings();
}

// 添加产品
function addProduct() {
    const category = document.getElementById('newCategory').value;
    const system = document.getElementById('newSystem').value;
    const code1 = document.getElementById('newProductCode1').value;
    const code2 = document.getElementById('newProductCode2').value;
    
    if (!category || !system || !code1 || !code2) {
        alert('请填写完整信息');
        return;
    }
    
    const product = {
        id: Date.now(),
        category: category,
        system: system,
        code1: code1,
        code2: code2
    };
    
    products.push(product);
    localStorage.setItem('products', JSON.stringify(products));
    
    displayProductTable();
    
    // 清空表单
    document.getElementById('newCategory').value = '';
    document.getElementById('newSystem').value = '';
    document.getElementById('newProductCode1').value = '';
    document.getElementById('newProductCode2').value = '';
    
    alert('产品添加成功！');
}

// 添加用户
function addUser() {
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newUserRole').value;
    const realName = document.getElementById('newUserRealName').value;
    const phone = document.getElementById('newUserPhone').value;
    const email = document.getElementById('newUserEmail').value;
    
    if (!username || !password || !realName) {
        alert('请填写必要信息');
        return;
    }
    
    // 检查用户名是否已存在
    if (users.find(u => u.username === username)) {
        alert('用户名已存在');
        return;
    }
    
    const user = {
        id: Date.now(),
        username: username,
        password: password,
        role: role,
        realName: realName,
        phone: phone,
        email: email
    };
    
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
    
    displayUsersTable();
    
    // 清空表单
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newUserRealName').value = '';
    document.getElementById('newUserPhone').value = '';
    document.getElementById('newUserEmail').value = '';
    
    alert('用户添加成功！');
}

// 保存系统设置
function saveSystemSettings() {
    const settings = {
        companyName: document.getElementById('companyName').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyPhone: document.getElementById('companyPhone').value,
        companyEmail: document.getElementById('companyEmail').value,
        paymentTerms: document.getElementById('paymentTerms').value,
        bankName: document.getElementById('bankName').value,
        accountName: document.getElementById('accountName').value,
        accountNumber: document.getElementById('accountNumber').value,
        routingNumber: document.getElementById('routingNumber').value,
        zelleInfo: document.getElementById('zelleInfo').value,
        swiftCode: document.getElementById('swiftCode').value
    };
    
    systemSettings = settings;
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    
    alert('系统设置已保存！');
}

// 加载系统设置
function loadSystemSettings() {
    document.getElementById('companyName').value = systemSettings.companyName || '';
    document.getElementById('companyAddress').value = systemSettings.companyAddress || '';
    document.getElementById('companyPhone').value = systemSettings.companyPhone || '';
    document.getElementById('companyEmail').value = systemSettings.companyEmail || '';
    document.getElementById('paymentTerms').value = systemSettings.paymentTerms || '';
    document.getElementById('bankName').value = systemSettings.bankName || '';
    document.getElementById('accountName').value = systemSettings.accountName || '';
    document.getElementById('accountNumber').value = systemSettings.accountNumber || '';
    document.getElementById('routingNumber').value = systemSettings.routingNumber || '';
    document.getElementById('zelleInfo').value = systemSettings.zelleInfo || '';
    document.getElementById('swiftCode').value = systemSettings.swiftCode || '';
}

// 显示产品表
function displayProductTable() {
    const container = document.getElementById('productTableDisplay');
    
    if (products.length === 0) {
        container.innerHTML = '<p>暂无产品数据</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>品类</th>
                    <th>系统</th>
                    <th>产品编号1</th>
                    <th>产品编号2</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    products.forEach(product => {
        html += `
            <tr>
                <td>${product.id}</td>
                <td>${product.category}</td>
                <td>${product.system}</td>
                <td>${product.code1}</td>
                <td>${product.code2}</td>
                <td>
                    <button onclick="deleteProduct(${product.id})" class="btn-danger">删除</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// 显示用户表
function displayUsersTable() {
    const container = document.getElementById('usersTableDisplay');
    
    if (users.length === 0) {
        container.innerHTML = '<p>暂无用户数据</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>用户名</th>
                    <th>角色</th>
                    <th>真实姓名</th>
                    <th>电话</th>
                    <th>邮箱</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        html += `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.role === 'admin' ? '管理员' : '销售员'}</td>
                <td>${user.realName}</td>
                <td>${user.phone || ''}</td>
                <td>${user.email || ''}</td>
                <td>
                    <button onclick="deleteUser(${user.id})" class="btn-danger">删除</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// 显示价格表
function displayPriceTable() {
    const container = document.getElementById('priceTableDisplay');
    
    if (priceTable.length === 0) {
        container.innerHTML = '<p>暂无价格数据</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>产品类别</th>
                    <th>宽度范围(cm)</th>
                    <th>高度范围(cm)</th>
                    <th>单价(USD)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    priceTable.forEach(item => {
        html += `
            <tr>
                <td>${item.category}</td>
                <td>${item.widthMin}-${item.widthMax}</td>
                <td>${item.heightMin}-${item.heightMax}</td>
                <td>${formatCurrency(item.price)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// 删除产品
function deleteProduct(productId) {
    if (confirm('确定要删除这个产品吗？')) {
        products = products.filter(p => p.id !== productId);
        localStorage.setItem('products', JSON.stringify(products));
        displayProductTable();
    }
}

// 删除用户
function deleteUser(userId) {
    if (confirm('确定要删除这个用户吗？')) {
        users = users.filter(u => u.id !== userId);
        localStorage.setItem('users', JSON.stringify(users));
        displayUsersTable();
    }
}

// 导出价格表
function exportPriceTable() {
    const dataStr = JSON.stringify(priceTable, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `价格表_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// 导入价格表
document.getElementById('priceFile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    priceTable = data;
                    localStorage.setItem('priceTable', JSON.stringify(priceTable));
                    displayPriceTable();
                    alert('价格表导入成功！');
                } else {
                    alert('文件格式错误，请选择正确的JSON文件');
                }
            } catch (error) {
                alert('文件解析失败，请检查文件格式');
            }
        };
        reader.readAsText(file);
    }
});

// 重置价格表
function resetPriceTable() {
    if (confirm('确定要重置价格表吗？这将恢复默认价格数据。')) {
        localStorage.removeItem('priceTable');
        location.reload();
    }
}

// 加载我的报价单
function loadMyQuotations() {
    const quotations = JSON.parse(localStorage.getItem('quotations') || '[]');
    const myQuotations = quotations.filter(q => q.userId === currentUser.id);
    
    const container = document.getElementById('quotationsList');
    
    if (myQuotations.length === 0) {
        container.innerHTML = '<p>暂无报价单</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>报价号</th>
                    <th>客户名称</th>
                    <th>创建日期</th>
                    <th>状态</th>
                    <th>总金额</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    myQuotations.forEach(quotation => {
        html += `
            <tr>
                <td>${quotation.quoteNumber}</td>
                <td>${quotation.customer.name}</td>
                <td>${quotation.createDate}</td>
                <td><span class="status-tag status-${quotation.status}">${getStatusText(quotation.status)}</span></td>
                <td>${formatCurrency(quotation.totalAmount)}</td>
                <td>
                    <button onclick="viewQuotation(${quotation.id})" class="btn-secondary">查看</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// 加载我的客户
function loadMyCustomers() {
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const myCustomers = customers.filter(c => c.userId === currentUser.id);
    
    const container = document.getElementById('customersList');
    
    if (myCustomers.length === 0) {
        container.innerHTML = '<p>暂无客户数据</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>客户名称</th>
                    <th>电话</th>
                    <th>邮箱</th>
                    <th>地址</th>
                    <th>创建日期</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    myCustomers.forEach(customer => {
        html += `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone || ''}</td>
                <td>${customer.email || ''}</td>
                <td>${customer.address || ''}</td>
                <td>${customer.createDate}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// 加载所有报价单（管理员）
function loadAllQuotations() {
    const quotations = JSON.parse(localStorage.getItem('quotations') || '[]');
    
    const container = document.getElementById('allQuotationsList');
    
    if (quotations.length === 0) {
        container.innerHTML = '<p>暂无报价单</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>报价号</th>
                    <th>销售员</th>
                    <th>客户名称</th>
                    <th>创建日期</th>
                    <th>状态</th>
                    <th>总金额</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    quotations.forEach(quotation => {
        const salesUser = users.find(u => u.id === quotation.userId);
        html += `
            <tr>
                <td>${quotation.quoteNumber}</td>
                <td>${salesUser ? salesUser.realName : '未知'}</td>
                <td>${quotation.customer.name}</td>
                <td>${quotation.createDate}</td>
                <td><span class="status-tag status-${quotation.status}">${getStatusText(quotation.status)}</span></td>
                <td>${formatCurrency(quotation.totalAmount)}</td>
                <td>
                    <button onclick="viewQuotation(${quotation.id})" class="btn-secondary">查看</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'draft': '草稿',
        'sent': '已发送',
        'confirmed': '已确认',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

// 查看报价单
function viewQuotation(quotationId) {
    const quotations = JSON.parse(localStorage.getItem('quotations') || '[]');
    const quotation = quotations.find(q => q.id === quotationId);
    
    if (quotation) {
        // 这里可以实现查看报价单详情的功能
        alert(`查看报价单：${quotation.quoteNumber}`);
    }
}

// 监听税率和运费变化
document.getElementById('taxRate').addEventListener('input', updateQuotationSummary);
document.getElementById('shippingFee').addEventListener('input', updateQuotationSummary);
