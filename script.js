// 全局变量
let currentUser = null;
let priceTable = [];
let products = [];
let users = [];
let systemSettings = {};
let currentLanguage = 'zh'; // 默认中文

// 自定义确认对话框函数
function showCustomConfirm(title, message, onConfirm, onCancel) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    
    // 设置内容
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;
    
    // 显示模态框
    modal.style.display = 'flex';
    
    // 绑定事件
    const handleConfirm = () => {
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
        // 清理事件监听器
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = () => {
        modal.style.display = 'none';
        if (onCancel) onCancel();
        // 清理事件监听器
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    
    // 点击背景关闭模态框
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            handleCancel();
        }
    });
}

// 数据库配置
let dbConfig = {
    type: 'sqlite', // 'sqlite', 'api', 'indexeddb'
    apiBase: 'http://localhost:3000/api',
    localDbName: 'priceSystemDB',
    version: 1
};

// 数据源配置
let dataSourceConfig = {
    currentSource: 'local', // 'local', 'remote'
    localPath: '', // 用户需要配置实际的文件路径
    remoteUrl: 'http://localhost:3000/api/prices',
    syncInterval: 3600000, // 1小时同步一次
    lastSync: null
};

// SQLite数据库实例
let db = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing all features...');
    
    try {
        // 初始化事件监听器
        initializeEventListeners();
        
        // 初始化系统
        initializeSystem();
        loadData();
        showLoginPage();
        
        // 测试localStorage是否工作
        console.log('Testing localStorage...');
        try {
            localStorage.setItem('test', 'test');
            const testValue = localStorage.getItem('test');
            console.log('localStorage test:', testValue === 'test' ? 'PASSED' : 'FAILED');
            localStorage.removeItem('test');
        } catch (e) {
            console.error('localStorage test failed:', e);
        }
        
        // 加载配置到界面
        if (localStorage.getItem('dbConfig')) {
            const savedDbConfig = JSON.parse(localStorage.getItem('dbConfig'));
            const dbTypeElement = safeGetElement('dbType');
            if (dbTypeElement) {
                dbTypeElement.value = savedDbConfig.type;
            }
            
            const apiBaseElement = safeGetElement('apiBaseUrl');
            if (apiBaseElement && savedDbConfig.apiBase) {
                apiBaseElement.value = savedDbConfig.apiBase;
            }
        }
        
        if (localStorage.getItem('dataSourceConfig')) {
            const savedDataSourceConfig = JSON.parse(localStorage.getItem('dataSourceConfig'));
            const dataSourceTypeElement = safeGetElement('dataSourceType');
            if (dataSourceTypeElement) {
                dataSourceTypeElement.value = savedDataSourceConfig.currentSource;
            }
            
            // 如果有保存的远程URL，设置到输入框
            const remoteUrlElement = safeGetElement('remoteUrl');
            if (remoteUrlElement && savedDataSourceConfig.remoteUrl) {
                remoteUrlElement.value = savedDataSourceConfig.remoteUrl;
            }
        }
        
        // 延迟执行，确保DOM完全加载
        setTimeout(() => {
            setDefaultDates();
        }, 100);
        
        // 延迟执行配置切换，确保DOM完全加载
        setTimeout(() => {
            try {
                toggleDatabaseConfig();
                toggleDataSourceConfig();
            } catch (error) {
                console.warn('Configuration toggles not ready yet:', error);
            }
        }, 500);
        
        // 延迟加载系统设置，确保DOM完全加载
        setTimeout(() => {
            try {
                loadSystemSettings();
            } catch (error) {
                console.warn('System settings not ready yet:', error);
            }
        }, 1000);
        
        // 初始化数据库状态 - 等待数据库初始化完成
        setTimeout(refreshDatabaseStatus, 2000);
        
        console.log('All features initialized successfully');
        
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// 设置默认日期
function setDefaultDates() {
    const today = new Date();
    const validUntil = new Date();
    validUntil.setDate(today.getDate() + 30); // 30天后有效
    
    const todayStr = today.toISOString().split('T')[0];
    const validUntilStr = validUntil.toISOString().split('T')[0];
    
    const quotationDateInput = document.getElementById('quotationDate');
    const validUntilInput = document.getElementById('validUntil');
    
    if (quotationDateInput) {
        quotationDateInput.value = todayStr;
    }
    if (validUntilInput) {
        validUntilInput.value = validUntilStr;
    }
}

// 安全DOM访问函数
function safeGetElement(id, fallback = null) {
    try {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
            return fallback;
        }
        return element;
    } catch (error) {
        console.error(`Error getting element '${id}':`, error);
        return fallback;
    }
}

// 初始化事件监听器
function initializeEventListeners() {
    try {
        const taxRateElement = safeGetElement('taxRate');
        const shippingFeeElement = safeGetElement('shippingFee');
        
        if (taxRateElement) {
            taxRateElement.addEventListener('input', updateQuotationSummary);
            console.log('Tax rate listener initialized');
        } else {
            console.warn('Tax rate element not found');
        }
        
        if (shippingFeeElement) {
            shippingFeeElement.addEventListener('input', updateQuotationSummary);
            console.log('Shipping fee listener initialized');
        } else {
            console.warn('Shipping fee element not found');
        }
        
    } catch (error) {
        console.error('Error initializing event listeners:', error);
    }
}

// 系统初始化
function initializeSystem() {
    try {
        console.log('Initializing system...');
        
        // 清理旧的localStorage数据
        clearOldData();
        
        // 初始化数据库
        initializeDatabase();
        
        // 加载必要数据
        loadData();
        
        console.log('System initialized successfully');
        
    } catch (error) {
        console.error('Error initializing system:', error);
    }
}

// 清理旧的localStorage数据
function clearOldData() {
    try {
        console.log('Cleaning up old localStorage data...');
        
        // 清理旧的价格表数据
        if (localStorage.getItem('priceTable')) {
            const oldPriceData = JSON.parse(localStorage.getItem('priceTable'));
            console.log(`Found ${oldPriceData.length} old price entries, clearing...`);
            localStorage.removeItem('priceTable');
        }
        
        // 清理旧的产品数据
        if (localStorage.getItem('products')) {
            const oldProducts = JSON.parse(localStorage.getItem('products'));
            console.log(`Found ${oldProducts.length} old product entries, clearing...`);
            localStorage.removeItem('products');
        }
        
        // 清理旧的价目表显示
        const priceTableDisplay = document.getElementById('priceTableDisplay');
        if (priceTableDisplay) {
            priceTableDisplay.innerHTML = `
                <div class="info-message" style="text-align: center; padding: 20px; color: #666;">
                    <h4>🔄 数据迁移完成</h4>
                    <p>旧的价格数据已迁移到SQLite数据库</p>
                    <p>请使用"数据源配置"功能导入新的价格数据</p>
                    <p style="font-size: 12px; color: #999;">系统将自动清理旧的localStorage数据</p>
                </div>
            `;
        }
        
        // 清理其他可能存在的旧数据
        const oldDataKeys = [
            'priceReaderConfig',
            'oldPriceData',
            'tempPriceData'
        ];
        
        oldDataKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                console.log(`Clearing old data key: ${key}`);
                localStorage.removeItem(key);
            }
        });
        
        console.log('Old data cleanup completed');
        
    } catch (error) {
        console.error('Error during old data cleanup:', error);
    }
}

// 数据库管理函数
async function initializeDatabase() {
    try {
        console.log('Initializing SQLite database...');
        
        // 检查SQL.js是否已加载
        if (typeof initSqlJs === 'undefined') {
            console.error('SQL.js library not found');
            return false;
        }
        
        // 尝试从IndexedDB加载已保存的数据库
        const databaseData = await loadDatabaseFromIndexedDB();
        
        if (databaseData) {
            console.log('Found saved database, loading...');
        } else {
            console.log('No saved database found, creating new one');
        }
        
        // 初始化SQL.js
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        
        // 创建数据库实例
        if (databaseData) {
            try {
                db = new SQL.Database(databaseData);
                console.log('Database loaded from saved data');
                
                // 验证数据库是否有效
                const isValid = validateDatabase(db);
                if (!isValid) {
                    console.warn('Loaded database is invalid, creating new one');
                    db.close();
                    db = new SQL.Database();
                    console.log('New database created after validation failure');
                }
            } catch (error) {
                console.error('Error loading saved database:', error);
                console.log('Creating new database due to load error');
                db = new SQL.Database();
            }
        } else {
            db = new SQL.Database();
            console.log('New database created');
        }
        
        // 创建表结构
        createDatabaseTables();
        
        // 检查是否有现有数据需要导入
        console.log('=== Before checkAndImportExistingData ===');
        const importResult = await checkAndImportExistingData();
        console.log('=== After checkAndImportExistingData ===', 'Import result:', importResult);
        
        // 检查数据库中是否有数据
        const currentCount = db.exec('SELECT COUNT(*) as count FROM price_table');
        const hasData = currentCount && currentCount[0] && currentCount[0].values && currentCount[0].values[0][0] > 0;
        console.log('Current database has data:', hasData);
        
        // 检查是否已经创建过样本数据（防止重复创建）
        const sampleDataCreated = localStorage.getItem('sampleDataCreated') === 'true';
        
        // 只有在没有数据且从未创建过样本数据时才创建默认样本数据
        if (!hasData && !sampleDataCreated) {
            console.log('=== Before createDefaultSampleData ===');
            console.log('No data found in database after import attempts, creating sample data...');
            console.log('WARNING: This will overwrite any existing data!');
            
            // 询问用户是否真的要创建样本数据
            showCustomConfirm(
                '首次设置确认',
                '数据库中没有找到价格数据。<br><br><span class="warning-text"><span class="warning-icon">!</span>这是首次设置，将创建默认样本数据。</span><br><br>样本数据包含：<br>• 3个产品类别（定制产品、标准产品、特殊产品）<br>• 6条示例价格记录<br>• 基础系统配置<br><br>创建后，您可以通过管理员界面导入真实数据。<br><br>是否继续创建样本数据？',
                async () => {
                    await createDefaultSampleData();
                    console.log('=== After createDefaultSampleData ===');
                    
                    // 标记样本数据已创建，防止重复创建
                    localStorage.setItem('sampleDataCreated', 'true');
                    
                    // 保存数据库到IndexedDB
                    try {
                        await saveDatabaseToIndexedDB();
                        console.log('Database saved after creating sample data');
                    } catch (error) {
                        console.error('Error saving database after sample data creation:', error);
                    }
                },
                () => {
                    console.log('User cancelled sample data creation');
                    // 即使用户取消，也标记为已处理，避免重复询问
                    localStorage.setItem('sampleDataCreated', 'true');
                }
            );
        } else if (hasData) {
            console.log('Database already has data, skipping sample data creation');
        } else if (sampleDataCreated) {
            console.log('Sample data creation was previously handled, skipping');
        }
        
        console.log('Database initialized successfully');
        
        // 设置自动保存数据库
        setupAutoSaveDatabase();
        
        return true;
        
    } catch (error) {
        console.error('Error initializing database:', error);
        return false;
    }
}

// 验证数据库是否有效
function validateDatabase(database) {
    try {
        // 尝试执行基本查询来验证数据库
        const result = database.exec('SELECT name FROM sqlite_master WHERE type="table"');
        console.log('Database validation: found tables', result.length > 0 ? result[0].values : 'none');
        return true;
    } catch (error) {
        console.error('Database validation failed:', error);
        return false;
    }
}

// 创建数据库表结构
function createDatabaseTables() {
    try {
        // 创建价目表
        db.run(`
            CREATE TABLE IF NOT EXISTS price_table (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                system TEXT,
                code1 TEXT,
                code2 TEXT,
                width_min REAL NOT NULL,
                width_max REAL NOT NULL,
                height_min REAL NOT NULL,
                height_max REAL NOT NULL,
                price REAL NOT NULL,
                effective_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 创建数据源配置表
        db.run(`
            CREATE TABLE IF NOT EXISTS data_sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                path TEXT NOT NULL,
                last_sync DATETIME,
                is_active BOOLEAN DEFAULT 1
            )
        `);
        
        // 创建索引以提高查询性能
        db.run('CREATE INDEX IF NOT EXISTS idx_category ON price_table(category)');
        db.run('CREATE INDEX IF NOT EXISTS idx_dimensions ON price_table(width_min, width_max, height_min, height_max)');
        db.run('CREATE INDEX IF NOT EXISTS idx_price ON price_table(price)');
        
        console.log('Database tables created successfully');
        
    } catch (error) {
        console.error('Error creating database tables:', error);
    }
}

// 检查并导入现有数据
async function checkAndImportExistingData() {
    try {
        console.log('=== Starting checkAndImportExistingData ===');
        let importSuccessful = false;
        
        // 检查localStorage中是否有价目表数据
        const existingPriceTable = localStorage.getItem('priceTable');
        console.log('Existing priceTable in localStorage:', existingPriceTable ? 'EXISTS' : 'NOT FOUND');
        
        if (existingPriceTable) {
            const priceData = JSON.parse(existingPriceTable);
            console.log('Parsed priceData length:', priceData.length);
            console.log('Sample priceData item:', priceData[0]);
            
            if (priceData.length > 0) {
                console.log('Importing existing price data to database...');
                const importResult = await importPriceDataToDatabase(priceData);
                console.log('Import result:', importResult);
                
                if (importResult) {
                    // 导入成功后清除localStorage中的数据
                    localStorage.removeItem('priceTable');
                    console.log('Existing price data imported to database and cleared from localStorage');
                    importSuccessful = true;
                } else {
                    console.log('Import failed, keeping data in localStorage');
                }
            } else {
                console.log('Price data array is empty, skipping import');
            }
        } else {
            console.log('No priceTable found in localStorage');
        }
        
        // 对于SQLite数据库配置，不需要从外部文件导入数据
        // SQLite数据库本身就是数据源，管理员通过界面管理数据
        if (dbConfig.type === 'sqlite') {
            console.log('SQLite database is configured as data source - no external file import needed');
            console.log('Data should be managed through admin interface, not imported from files');
        } else {
            // 对于其他数据库类型，可能需要检查文件导入
            if (dataSourceConfig.currentSource === 'local' && dataSourceConfig.localPath && dataSourceConfig.localPath.trim() !== '') {
                console.log('Attempting to import from configured local file:', dataSourceConfig.localPath);
                const fileImportResult = await importDataFromFile(dataSourceConfig.localPath);
                console.log('File import result:', fileImportResult);
                if (fileImportResult) {
                    importSuccessful = true;
                }
            } else {
                console.log('No local file path configured, skipping file import');
            }
        }
        
        console.log('=== Finished checkAndImportExistingData ===');
        return importSuccessful;
        
    } catch (error) {
        console.error('Error importing existing data:', error);
        return false;
    }
}

// 将价目表数据导入数据库
async function importPriceDataToDatabase(priceData) {
    try {
        if (!db) {
            console.error('Database not initialized');
            return false;
        }
        
        // 开始事务
        db.run('BEGIN TRANSACTION');
        
        // 清空现有数据
        db.run('DELETE FROM price_table');
        
        // 插入新数据
        const stmt = db.prepare(`
            INSERT INTO price_table (category, system, code1, code2, width_min, width_max, height_min, height_max, price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        let successCount = 0;
        priceData.forEach(item => {
            try {
                // 支持新旧字段名格式
                const category = item.category;
                const width_min = item.width_min || item.widthMin;
                const width_max = item.width_max || item.widthMax;
                const height_min = item.height_min || item.heightMin;
                const height_max = item.height_max || item.heightMax;
                const price = item.price;
                const system = item.system || '';
                const code1 = item.code1 || '';
                const code2 = item.code2 || '';
                
                console.log('Processing item:', { category, width_min, width_max, height_min, height_max, price, system, code1, code2 });
                
                if (category && width_min !== undefined && width_max !== undefined && height_min !== undefined && height_max !== undefined && price !== undefined) {
                    stmt.run([
                        category,
                        system,
                        code1,
                        code2,
                        width_min,
                        width_max,
                        height_min,
                        height_max,
                        price
                    ]);
                    successCount++;
                    console.log('Successfully inserted item:', item);
                } else {
                    console.warn('Skipping invalid item - missing required fields:', { category, width_min, width_max, height_min, height_max, price });
                    console.warn('Original item:', item);
                }
            } catch (rowError) {
                console.warn('Error inserting row:', rowError, item);
            }
        });
        
        stmt.free();
        
        // 提交事务
        db.run('COMMIT');
        
        console.log(`Database import summary:`);
        console.log(`   - Total items to import: ${priceData.length}`);
        console.log(`   - Successfully imported: ${successCount}`);
        console.log(`   - Failed to import: ${priceData.length - successCount}`);
        
        console.log(`Successfully imported ${successCount} price entries to database`);
        return true;
        
    } catch (error) {
        console.error('Error importing price data to database:', error);
        
        // 回滚事务
        try {
            if (db) {
                db.run('ROLLBACK');
            }
        } catch (rollbackError) {
            console.error('Error rolling back transaction:', rollbackError);
        }
        
        // 如果是数据库损坏错误，尝试重新初始化
        if (error.message && error.message.includes('file is not a database')) {
            console.warn('Database corruption detected, attempting to reinitialize...');
            showCustomConfirm(
                '数据库损坏检测',
                '检测到数据库损坏。<br><br><span class="warning-text"><span class="warning-icon">!</span>需要重新初始化数据库</span><br><br>这将清除当前数据库并创建新的数据库。<br><br>是否继续重新初始化？',
                async () => {
                    try {
                        // 清除损坏的IndexedDB数据
                        const dbName = 'PromoteAppDB';
                        const request = indexedDB.deleteDatabase(dbName);
                        request.onsuccess = async () => {
                            console.log('Corrupted IndexedDB database deleted');
                            // 重新加载页面来重新初始化
                            location.reload();
                        };
                        request.onerror = () => {
                            console.error('Error deleting corrupted database');
                            location.reload();
                        };
                    } catch (reinitError) {
                        console.error('Error reinitializing database:', reinitError);
                        location.reload();
                    }
                },
                () => {
                    console.log('User cancelled database reinitialization');
                }
            );
        }
        
        return false;
    }
}

// 创建默认样本数据
async function createDefaultSampleData() {
    try {
        console.log('=== Starting createDefaultSampleData ===');
        
        if (!db) {
            console.log('Database not initialized in createDefaultSampleData');
            return false;
        }
        
        // 检查数据库中是否已有数据
        const result = db.exec('SELECT COUNT(*) as count FROM price_table');
        console.log('Current database count result:', result);
        
        if (result && result[0] && result[0].values && result[0].values[0][0] > 0) {
            console.log('Database already has data, skipping default sample creation');
            console.log('Using existing data from SQLite database as configured by admin');
            return true;
        }
        
        console.log('Database is empty, creating default sample data for initial setup...');
        console.log('Note: Admin can replace this data through the management interface');
        
        const defaultPriceData = [
            { category: "标准产品", system: "Standard System", code1: "STD001", code2: "A", width_min: 30.5, width_max: 55.8, height_min: 35.6, height_max: 63.5, price: 18.19 },
            { category: "标准产品", system: "Standard System", code1: "STD002", code2: "B", width_min: 58.5, width_max: 86.4, height_min: 35.6, height_max: 63.5, price: 22.89 },
            { category: "标准产品", system: "Standard System", code1: "STD003", code2: "C", width_min: 88.9, width_max: 116.8, height_min: 35.6, height_max: 63.5, price: 28.10 },
            { category: "定制产品", system: "Premium System", code1: "CUS001", code2: "X", width_min: 119.5, width_max: 147.3, height_min: 35.6, height_max: 63.5, price: 33.06 },
            { category: "定制产品", system: "Premium System", code1: "CUS002", code2: "Y", width_min: 149.8, width_max: 175.3, height_min: 35.6, height_max: 63.5, price: 37.41 },
            { category: "特殊产品", system: "Special System", code1: "SPC001", code2: "Z", width_min: 180.0, width_max: 220.0, height_min: 80.0, height_max: 120.0, price: 45.00 }
        ];
        
        // 开始事务
        db.run('BEGIN TRANSACTION');
        
        // 插入默认数据
        const stmt = db.prepare(`
            INSERT INTO price_table (category, system, code1, code2, width_min, width_max, height_min, height_max, price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        let successCount = 0;
        defaultPriceData.forEach(item => {
            try {
                stmt.run([
                    item.category,
                    item.system,
                    item.code1,
                    item.code2,
                    item.width_min,
                    item.width_max,
                    item.height_min,
                    item.height_max,
                    item.price
                ]);
                successCount++;
            } catch (rowError) {
                console.warn('Error inserting default row:', rowError, item);
            }
        });
        
        stmt.free();
        
        // 提交事务
        db.run('COMMIT');
        
        console.log(`Default sample data created successfully: ${successCount} entries`);
        console.log('Categories available:', [...new Set(defaultPriceData.map(item => item.category))]);
        console.log('Systems available:', [...new Set(defaultPriceData.map(item => item.system))]);
        
        // 保存数据库到IndexedDB
        try {
            await saveDatabaseToIndexedDB();
            console.log('Database saved after creating default sample data');
        } catch (error) {
            console.error('Error saving database after default sample data creation:', error);
        }
        
        return true;
        
    } catch (error) {
        console.error('Error creating default sample data:', error);
        // 回滚事务
        if (db) {
            db.run('ROLLBACK');
        }
        return false;
    }
}

// 设置自动保存数据库
function setupAutoSaveDatabase() {
    try {
        // 每5分钟自动保存一次数据库
        setInterval(async () => {
            if (db) {
                try {
                    await saveDatabaseToIndexedDB();
                    console.log('Database auto-saved to IndexedDB');
                } catch (error) {
                    console.error('Error auto-saving database:', error);
                }
            }
        }, 5 * 60 * 1000); // 5分钟
        
        // 页面卸载前保存数据库
        window.addEventListener('beforeunload', async () => {
            if (db) {
                try {
                    await saveDatabaseToIndexedDB();
                    console.log('Database saved before page unload');
                } catch (error) {
                    console.error('Error saving database before unload:', error);
                }
            }
        });
        
        console.log('Auto-save database functionality enabled');
        
    } catch (error) {
        console.error('Error setting up auto-save database:', error);
    }
}

// 加载数据
function loadData() {
    console.log('=== Starting loadData ===');
    
    // 检查localStorage中的所有键
    console.log('All localStorage keys:', Object.keys(localStorage));
    
    const existingPriceTable = localStorage.getItem('priceTable');
    console.log('Raw priceTable from localStorage:', existingPriceTable);
    
    priceTable = JSON.parse(existingPriceTable || '[]');
    products = JSON.parse(localStorage.getItem('products') || '[]');
    users = JSON.parse(localStorage.getItem('users') || '[]');
    systemSettings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    
    console.log('Data loaded - Users:', users.length, 'entries'); // 调试信息
    console.log('Data loaded - PriceTable:', priceTable.length, 'entries'); // 调试信息
    console.log('Data loaded - Products:', products.length, 'entries'); // 调试信息
    
    if (priceTable.length > 0) {
        console.log('Sample priceTable item:', priceTable[0]);
    }
    
    console.log('=== Finished loadData ===');
}

// 显示登录页面
function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('salesFrontend').style.display = 'none';
    document.getElementById('adminBackend').style.display = 'none';
    
    // 检查是否需要创建默认用户
    initializeDefaultUsers();
}

// 初始化默认用户
function initializeDefaultUsers() {
    // 检查是否已有用户
    if (!users || users.length === 0) {
        console.log('No users found, creating default users...');
        
        // 创建默认管理员用户
        const adminUser = {
            id: Date.now(),
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            realName: '系统管理员',
            phone: '',
            email: ''
        };
        
        // 创建默认销售员用户
        const salesUser = {
            id: Date.now() + 1,
            username: 'sales1',
            password: 'sales123',
            role: 'sales',
            realName: '销售员1',
            phone: '',
            email: ''
        };
        
        users = [adminUser, salesUser];
        localStorage.setItem('users', JSON.stringify(users));
        
        console.log('Default users created:', users);
        console.log('Admin login: admin / admin123');
        console.log('Sales login: sales1 / sales123');
    } else {
        console.log('Users already exist:', users.length, 'users found');
    }
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
    
    // 加载用户数据
    loadUserData();
    
    // 加载系统设置
    loadSystemSettings();
    
    // 初始化价格查询界面
    initializePriceQuery();
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
    showCustomConfirm(
        '系统重置确认',
        '确定要重置系统吗？这将清除所有数据并重新初始化。',
        async () => {
            try {
                // 清除localStorage
                localStorage.clear();
                
                // 清除IndexedDB中的数据库
                const dbName = 'PromoteAppDB';
                const request = indexedDB.deleteDatabase(dbName);
                request.onsuccess = () => {
                    console.log('IndexedDB database deleted successfully');
                    location.reload();
                };
                request.onerror = () => {
                    console.error('Error deleting IndexedDB database:', request.error);
                    location.reload();
                };
            } catch (error) {
                console.error('Error during system reset:', error);
                location.reload();
            }
        },
        () => {
            console.log('User cancelled system reset');
        }
    );
}

// 初始化快速查价行 - 已废弃，使用新的产品列表系统
function initializePricingRows() {
    console.log('initializePricingRows called - using new product list system');
    // 这个函数已废弃，现在使用 addProductItem() 来添加产品行
}

// 添加查价行 - 已废弃，使用新的产品列表系统
function addPricingRow() {
    console.log('addPricingRow called - using new product list system');
    // 这个函数已废弃，现在使用 addProductItem() 来添加产品行
}

// 删除查价行 - 已废弃，使用新的产品列表系统
function removePricingRow(rowId) {
    console.log('removePricingRow called - using new product list system');
    // 这个函数已废弃，现在使用 removeProductItem() 来删除产品行
}

// 初始化价格查询界面
function initializePriceQuery() {
    try {
        console.log('Initializing price query interface...');
        
        const categorySelect = document.getElementById('priceCategorySelect');
        if (!categorySelect) {
            console.log('priceCategorySelect element not found - Price Query section was removed, skipping initialization');
            return;
        }
        
        // 清空现有选项
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        
        // 检查数据库是否准备好
        if (!db) {
            console.log('Database not ready yet, waiting...');
            setTimeout(initializePriceQuery, 100); // 100ms后重试
            return;
        }
        
        // 从数据库获取类别
        const categories = getAllCategoriesFromDatabase();
        console.log('Retrieved categories from database:', categories);
        
        if (categories && categories.length > 0) {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
            console.log('Price query interface initialized with categories:', categories);
        } else {
            console.log('No categories found in database');
            // 添加一个默认选项
            const option = document.createElement('option');
            option.value = 'No categories available';
            option.textContent = 'No categories available';
            option.disabled = true;
            categorySelect.appendChild(option);
        }
        
        // 设置默认日期
        const today = new Date();
        const validUntil = new Date();
        validUntil.setDate(today.getDate() + 7); // 7天后过期
        
        const quotationDateInput = document.getElementById('quotationDate');
        const validUntilInput = document.getElementById('validUntil');
        
        if (quotationDateInput) {
            quotationDateInput.value = today.toISOString().split('T')[0];
        }
        if (validUntilInput) {
            validUntilInput.value = validUntil.toISOString().split('T')[0];
        }
        
        // 生成报价单号
        const quotationNumberInput = document.getElementById('quotationNumber');
        if (quotationNumberInput) {
            const timestamp = Date.now();
            const randomNum = Math.floor(Math.random() * 1000);
            quotationNumberInput.value = `QUO-${timestamp}-${randomNum}`;
        }
        
        console.log('Price query interface initialization completed');
        
    } catch (error) {
        console.error('Error initializing price query interface:', error);
    }
}

// 从数据库搜索价格
function searchPriceFromDatabase() {
    try {
        const category = document.getElementById('priceCategorySelect').value;
        const width = parseFloat(document.getElementById('priceWidthInput').value);
        const height = parseFloat(document.getElementById('priceHeightInput').value);
        const widthUnit = document.getElementById('priceWidthUnit').value;
        const heightUnit = document.getElementById('priceHeightUnit').value;
        
        if (!category || !width || !height) {
            alert('Please fill in all required fields');
            return;
        }
        
        // 查询数据库
        const priceData = queryPriceFromDatabase(category, width, height, widthUnit, heightUnit);
        
        if (priceData) {
            // 显示结果
            document.getElementById('resultCategory').textContent = category;
            document.getElementById('resultDimensions').textContent = 
                `${width}${widthUnit} × ${height}${heightUnit}`;
            document.getElementById('resultPrice').textContent = `$${priceData.price.toFixed(2)}`;
            document.getElementById('priceQueryResult').style.display = 'block';
            
            console.log('Price found:', priceData);
        } else {
            // 隐藏结果
            document.getElementById('priceQueryResult').style.display = 'none';
            alert('No matching price found for the specified dimensions. Please check the category and dimension range.');
        }
    } catch (error) {
        console.error('Error searching price from database:', error);
        alert('Error searching price: ' + error.message);
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

// 从数据库获取所有产品信息
function getAllProductsFromDatabase() {
    try {
        if (!db) {
            console.warn('Database not ready');
            return [];
        }
        
        const result = db.exec(`
            SELECT DISTINCT category, system, code1, code2 
            FROM price_table 
            WHERE code1 IS NOT NULL AND code1 != '' 
            AND code2 IS NOT NULL AND code2 != ''
            ORDER BY category, system, code1, code2
        `);
        
        if (result && result.length > 0 && result[0].values) {
            const products = result[0].values.map(row => ({
                category: row[0],
                system: row[1],
                code1: row[2],
                code2: row[3]
            }));
            
            console.log('=== Database Products Debug ===');
            console.log('Total products found:', products.length);
            console.log('Sample products:', products.slice(0, 5));
            
            // 检查特定组合是否存在
            const testCategory = '拉珠卷帘';
            const testSystem = '全封闭系统（不包布，目前只有白色）';
            const testCode1 = 'JL1490';
            
            const testProducts = products.filter(p => 
                p.category === testCategory && 
                p.system === testSystem && 
                p.code1 === testCode1
            );
            
            console.log(`Test combination [${testCategory}] + [${testSystem}] + [${testCode1}]:`, testProducts);
            
            return products;
        }
        
        console.log('No products found in database');
        return [];
    } catch (error) {
        console.error('Error getting products from database:', error);
        return [];
    }
}

// 更新产品选项
function updateProductOptions(rowId, fieldType) {
    const row = document.getElementById(`item-${rowId}`);
    if (!row) {
        console.error(`Row with id item-${rowId} not found`);
        return;
    }
    
    const categorySelect = row.querySelector('td:nth-child(1) select');
    const systemSelect = row.querySelector('td:nth-child(2) select');
    const code1Select = row.querySelector('td:nth-child(3) select');
    const code2Select = row.querySelector('td:nth-child(4) select');
    
    if (!categorySelect || !systemSelect || !code1Select || !code2Select) {
        console.error('One or more select elements not found in row');
        return;
    }
    
    const selectedCategory = categorySelect.value;
    const selectedSystem = systemSelect.value;
    
    // 调试信息
    console.log('updateProductOptions called:', { fieldType, selectedCategory, selectedSystem });
    
    // 根据选择的品类和系统过滤产品编号
    if (fieldType === 'category' || fieldType === 'system') {
        let filteredProducts = getAllProductsFromDatabase();
        
        if (selectedCategory) {
            filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
        }
        if (selectedSystem) {
            filteredProducts = filteredProducts.filter(p => p.system === selectedSystem);
        }
        
        // 更新产品编号选项 - 保持code1和code2的对应关系
        // 先更新code1选项
        const uniqueCode1 = [...new Set(filteredProducts.map(p => p.code1))];
        code1Select.innerHTML = '<option value="">Select Product Code 1</option>' +
            uniqueCode1.map(code => `<option value="${code}">${code}</option>`).join('');
        
        // code2选项保持为空，等待用户选择code1后再填充
        code2Select.innerHTML = '<option value="">Select Product Code 2</option>';
        
        // 清空已选择的产品编号
        code1Select.value = '';
        code2Select.value = '';
    }
    
    // 当选择code1时，自动填充对应的code2
    if (fieldType === 'code1') {
        const selectedCode1 = code1Select.value;
        console.log('=== CODE1 Selection Debug ===');
        console.log('Code1 selected:', selectedCode1);
        console.log('Current category:', selectedCategory);
        console.log('Current system:', selectedSystem);
        
        if (selectedCode1) {
            let filteredProducts = getAllProductsFromDatabase();
            console.log('All products from database:', filteredProducts);
            
            if (selectedCategory) {
                filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
                console.log('After category filter:', filteredProducts);
            }
            if (selectedSystem) {
                filteredProducts = filteredProducts.filter(p => p.system === selectedSystem);
                console.log('After system filter:', filteredProducts);
            }
            
            console.log('Final filtered products for code1 matching:', filteredProducts);
            
            // 找到匹配的code1对应的code2
            const matchedProduct = filteredProducts.find(p => p.code1 === selectedCode1);
            console.log('Matched product:', matchedProduct);
            
            if (matchedProduct) {
                code2Select.value = matchedProduct.code2;
                console.log('Successfully set code2 to:', matchedProduct.code2);
                
                // 触发change事件，确保UI更新
                const event = new Event('change', { bubbles: true });
                code2Select.dispatchEvent(event);
            } else {
                console.warn('No matching product found for code1:', selectedCode1);
                console.warn('Available code1 values:', filteredProducts.map(p => p.code1));
            }
        }
    }
    
    // 当所有必要字段都选择后，自动填充产品信息
    if (selectedCategory && selectedSystem) {
        calculateItemPrice(rowId);
    }
}

// 更新查价行
function updatePricingRow(rowId) {
    const row = document.getElementById(`pricing-row-${rowId}`);
    const inputs = row.querySelectorAll('input');
    const selects = row.querySelectorAll('select');
    
    const category = selects[1].value; // 品类下拉菜单（调整索引，因为移除了系统和产品编号）
    const width = parseFloat(inputs[1].value);  // 宽度输入框
    const widthUnit = selects[2].value;  // 宽度单位
    const height = parseFloat(inputs[2].value); // 高度输入框
    const heightUnit = selects[3].value; // 高度单位
    const quantity = parseInt(inputs[3].value); // 数量输入框
    
    if (category && width && height && quantity && !isNaN(quantity) && quantity > 0) {
        // 使用数据库查询价格
        const priceData = queryPriceFromDatabase(category, width, height, widthUnit, heightUnit);
        
        if (priceData) {
            const unitPrice = priceData.price;
            const subtotal = unitPrice * quantity;
            
            inputs[4].value = formatCurrency(unitPrice);  // 单价
            inputs[5].value = formatCurrency(subtotal);   // 小计
            inputs[6].value = formatCurrency(subtotal);   // 合计（单行时等于小计）
            
            // 如果总计显示区域存在，重新计算总计
            if (document.getElementById('totalAmountDisplay')) {
                calculateTotalAmount();
            }
        } else {
            // 没有匹配的价格，清空价格字段
            inputs[4].value = '';  // 单价
            inputs[5].value = '';  // 小计
            inputs[6].value = '';  // 合计
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
                <strong style="color: #27ae60; font-size: 18px;">Total: ${formatCurrency(totalAmount)}</strong>
            </div>
        `;
        pricingHeader.appendChild(totalDiv);
    } else {
        totalDisplay.innerHTML = `
            <div style="background: #e8f5e8; padding: 10px; border-radius: 6px; margin-top: 10px; text-align: center;">
                <strong style="color: #27ae60; font-size: 18px;">Total: ${formatCurrency(totalAmount)}</strong>
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
        alert('Please fill in at least one complete product information row');
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
                    <th>No.</th>
                    <th>Category</th>
                    <th>System</th>
                    <th>Product Code 1</th>
                    <th>Product Code 2</th>
                    <th>Dimensions</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                    <th>Total</th>
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
                    <td>${width}×${height}${widthUnit === 'in' ? 'inches' : 'cm'}</td>
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
    if (rows.length === 0) {
        alert('Please fill in at least one complete product information row');
        return;
    }
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
                <h4>Product ${productList.children.length + 1}</h4>
                <button class="remove-product" onclick="removeProductItem(${itemId})">Delete</button>
            </div>
            <div class="product-item-content">
                <div class="form-group">
                    <label>Product Code 1:</label>
                    <input type="text" value="${data.code1}" readonly>
                </div>
                <div class="form-group">
                    <label>Product Code 2:</label>
                    <input type="text" value="${data.code2}" readonly>
                </div>
                <div class="form-group">
                    <label>Product Category:</label>
                    <input type="text" value="${data.category}" readonly>
                </div>
                <div class="form-group">
                    <label>Product Name:</label>
                    <input type="text" value="${data.system}" readonly>
                </div>
                <div class="form-group">
                    <label>Dimensions:</label>
                    <input type="text" value="${data.width}×${data.height}${data.widthUnit === 'in' ? 'inches' : 'cm'}" readonly>
                </div>
                <div class="form-group">
                    <label>Quantity:</label>
                    <input type="number" value="${data.quantity}" min="1" onchange="calculateItemPrice(${itemId})">
                </div>
                <div class="form-group">
                    <label>Unit Price:</label>
                    <input type="text" value="${data.unitPrice}" readonly class="currency">
                </div>
                <div class="form-group">
                    <label>Subtotal:</label>
                    <input type="text" value="${data.subtotal}" readonly class="currency">
                </div>
                <div class="form-group">
                    <label>Total:</label>
                    <input type="text" value="${data.total}" readonly class="currency">
                </div>
                <div class="form-group">
                    <label>Notes:</label>
                    <input type="text" placeholder="Optional">
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
    
    // 如果切换到推广设计页面，自动加载产品选项
    if (tabName === 'promotions') {
        loadPromotionProductOptions();
    }
}

// 更新产品类别选择器
function updateCategorySelect() {
    const select = document.getElementById('categorySelect');
    select.innerHTML = '<option value="">Select Category</option>';
    
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
        widthCm >= (item.width_min || item.widthMin) && widthCm <= (item.width_max || item.widthMax) &&
        heightCm >= (item.height_min || item.heightMin) && heightCm <= (item.height_max || item.heightMax)
    );
    
    if (matchedPrice) {
        document.getElementById('resultCategory').textContent = category;
        document.getElementById('resultDimensions').textContent = 
            `${widthCm.toFixed(1)}cm × ${heightCm.toFixed(1)}cm`;
        document.getElementById('resultPrice').textContent = matchedPrice.price.toFixed(2);
        document.getElementById('priceResult').style.display = 'block';
    } else {
        alert('No matching price found, please check dimension range');
        document.getElementById('priceResult').style.display = 'none';
    }
}

// 添加产品项
function addProductItem() {
    try {
        const productList = document.getElementById('productList');
        if (!productList) {
            console.error('productList element not found');
            return;
        }
        
        const itemId = Date.now();
        
        // 从数据库获取类别选项
        if (!db) {
            console.log('Database not ready yet, waiting...');
            setTimeout(addProductItem, 100); // 100ms后重试
            return;
        }
        
        const categories = getAllCategoriesFromDatabase();
        const systems = getAllSystemsFromDatabase();
        
        const itemHtml = `
        <tr class="product-item" id="item-${itemId}">
            <td>
                <select onchange="updateProductOptions(${itemId}, 'category')" style="width: 100%; border: none; background: transparent;">
                    <option value="">Select Category</option>
                    ${categories.map(cat => 
                        `<option value="${cat}">${cat}</option>`
                    ).join('')}
                </select>
            </td>
            <td>
                <select onchange="updateProductOptions(${itemId}, 'system')" style="width: 100%; border: none; background: transparent;">
                    <option value="">Select System</option>
                    ${systems.map(sys => 
                        `<option value="${sys}">${sys}</option>`
                    ).join('')}
                </select>
            </td>
            <td>
                <select onchange="updateProductOptions(${itemId}, 'code1')" style="width: 100%; border: none; background: transparent;">
                    <option value="">Select Product Code 1</option>

                </select>
            </td>
            <td>
                <select onchange="updateProductOptions(${itemId}, 'code2')" style="width: 100%; border: none; background: transparent;">
                    <option value="">Select Product Code 2</option>

                </select>
            </td>
            <td>
                <input type="number" step="0.01" placeholder="Width" onchange="calculateItemPrice(${itemId})" style="width: 80%; border: none; background: transparent; text-align: center;">
                <select onchange="calculateItemPrice(${itemId})" style="width: 20%; border: none; background: transparent; font-size: 12px;">
                    <option value="in">in</option>
                    <option value="cm">cm</option>
                </select>
            </td>
            <td>
                <input type="number" step="0.01" placeholder="Length" onchange="calculateItemPrice(${itemId})" style="width: 80%; border: none; background: transparent; text-align: center;">
                <select onchange="calculateItemPrice(${itemId})" style="width: 20%; border: none; background: transparent; font-size: 12px;">
                    <option value="in">in</option>
                    <option value="cm">cm</option>
                </select>
            </td>
            <td>
                <input type="number" min="1" value="1" onchange="calculateItemPrice(${itemId})" style="width: 100%; border: none; background: transparent; text-align: center;">
            </td>
            <td>
                <input type="text" readonly style="width: 100%; border: none; background: transparent; text-align: right; color: #007bff; font-weight: 600;">
            </td>
            <td>
                <input type="text" readonly style="width: 100%; border: none; background: transparent; text-align: right; color: #28a745; font-weight: 600;">
            </td>
            <td>
                <button class="remove-product" onclick="removeProductItem(${itemId})" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;">Delete</button>
            </td>
        </tr>
    `;
    
            productList.insertAdjacentHTML('beforeend', itemHtml);
        console.log('Product item added successfully');
        
    } catch (error) {
        console.error('Error adding product item:', error);
    }
}

// 更新产品名称选择器
function updateProductNames(categorySelect, itemId) {
    const productNameSelect = document.getElementById(`product-name-${itemId}`);
    const category = categorySelect.value;
    
    productNameSelect.innerHTML = '<option value="">Select Product</option>';
    
    if (category) {
        const categoryProducts = getAllProductsFromDatabase().filter(p => p.category === category);
        categoryProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.code1; // Use code1 instead of name since that's what we have
            option.textContent = `${product.code1} (${product.code2})`; // Use code1 and code2 instead of name and model
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
    
    // 获取所有select元素，按正确顺序
    const selects = item.querySelectorAll('select');
    const inputs = item.querySelectorAll('input');
    
    const category = selects[0].value;    // 第1个select: category
    const system = selects[1].value;      // 第2个select: system  
    const code1 = selects[2].value;       // 第3个select: code1
    const code2 = selects[3].value;       // 第4个select: code2
    const widthUnit = selects[4].value;   // 第5个select: width unit
    const heightUnit = selects[5].value;  // 第6个select: height unit
    
    const width = parseFloat(inputs[0].value);      // 第1个input: width
    const height = parseFloat(inputs[1].value);     // 第2个input: height  
    const quantity = parseInt(inputs[2].value);     // 第3个input: quantity
    
    console.log('=== Calculate Item Price Debug ===');
    console.log('Item ID:', itemId);
    console.log('Selected values:', {
        category, system, code1, code2, 
        width, height, widthUnit, heightUnit, quantity
    });
    
    if (!category || !system || !code1 || !code2 || !width || !height || !quantity) {
        console.log('Missing required fields for price calculation');
        return;
    }
    
    // 转换为厘米
    const widthCm = widthUnit === 'in' ? width * 2.54 : width;
    const heightCm = heightUnit === 'in' ? height * 2.54 : height;
    
    // 使用更精确的价格查询，包含所有产品信息
    const matchedPrice = queryPriceFromDatabaseWithProduct(category, system, code1, code2, widthCm, heightCm, 'cm', 'cm');
    
    if (matchedPrice) {
        const unitPrice = matchedPrice.price;
        const subtotal = unitPrice * quantity;
        
        // 更新单价和总价，使用formatCurrency格式化
        item.querySelectorAll('input')[3].value = formatCurrency(unitPrice);  // 单价
        item.querySelectorAll('input')[4].value = formatCurrency(subtotal);   // 总价
        
        updateQuotationSummary();
    }
}

// 更新报价汇总
function updateQuotationSummary() {
    try {
        let subtotal = 0;
        
        document.querySelectorAll('.product-item').forEach(item => {
            const subtotalInput = item.querySelectorAll('input')[4];  // 总价输入框
            if (subtotalInput && subtotalInput.value && subtotalInput.value !== '$0.00' && subtotalInput.value !== '') {
                // 提取数字部分
                const subtotalValue = parseFloat(subtotalInput.value.replace(/[$,]/g, ''));
                if (!isNaN(subtotalValue) && subtotalValue > 0) {
                    subtotal += subtotalValue;
                }
            }
        });
        
        const taxRateElement = safeGetElement('taxRate');
        const shippingFeeElement = safeGetElement('shippingFee');
        const subtotalElement = safeGetElement('subtotal');
        const taxAmountElement = safeGetElement('taxAmount');
        const totalAmountElement = safeGetElement('totalAmount');
        
        if (!taxRateElement || !shippingFeeElement || !subtotalElement || !taxAmountElement || !totalAmountElement) {
            console.warn('Required elements not found for quotation summary update');
            return;
        }
        
        const taxRate = parseFloat(taxRateElement.value) || 0;
        const shippingFee = parseFloat(shippingFeeElement.value) || 0;
        
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount + shippingFee;
        
        subtotalElement.textContent = formatCurrency(subtotal);
        taxAmountElement.textContent = formatCurrency(taxAmount);
        totalAmountElement.textContent = formatCurrency(totalAmount);
        
    } catch (error) {
        console.error('Error updating quotation summary:', error);
    }
}

// 保存报价单
function saveQuotation() {
    try {
        const customerNameElement = safeGetElement('customerName');
        const customerPhoneElement = safeGetElement('customerPhone');
        const customerAddressElement = safeGetElement('customerAddress');
        const customerCityElement = safeGetElement('customerCity');
        const customerStateElement = safeGetElement('customerState');
        const customerZipElement = safeGetElement('customerZip');
        
        if (!customerNameElement || !customerPhoneElement || !customerAddressElement) {
            console.warn('Required customer elements not found');
            return;
        }
        
        const customerName = customerNameElement.value;
        const customerPhone = customerPhoneElement.value;
        const customerAddress = customerAddressElement.value;
        const customerCity = customerCityElement ? customerCityElement.value : '';
        const customerState = customerStateElement ? customerStateElement.value : '';
        const customerZip = customerZipElement ? customerZipElement.value : '';
        
        if (!customerName) {
            alert('Please fill in customer name');
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
            
            // 从格式化的货币字符串中提取数字
            const unitPriceText = item.querySelectorAll('input')[3].value;
            const subtotalText = item.querySelectorAll('input')[4].value;
            const unitPrice = parseFloat(unitPriceText.replace(/[$,]/g, '')) || 0;
            const subtotal = parseFloat(subtotalText.replace(/[$,]/g, '')) || 0;
            
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
            alert('Please add at least one product');
            return;
        }
        
        // 获取其他必要元素
        const subtotalElement = safeGetElement('subtotal');
        const taxRateElement = safeGetElement('taxRate');
        const taxAmountElement = safeGetElement('taxAmount');
        const shippingFeeElement = safeGetElement('shippingFee');
        const totalAmountElement = safeGetElement('totalAmount');
        
        if (!subtotalElement || !taxRateElement || !taxAmountElement || !shippingFeeElement || !totalAmountElement) {
            console.warn('Required summary elements not found');
            return;
        }
        
        // 创建报价单
        const quotation = {
            id: Date.now(),
            quoteNumber: generateQuoteNumber(),
            customer: {
                name: customerName,
                phone: customerPhone,
                address: customerAddress,
                city: customerCity,
                state: customerState,
                zip: customerZip
            },
            items: items,
            subtotal: parseFloat(subtotalElement.textContent.replace(/[$,]/g, '')) || 0,
            taxRate: parseFloat(taxRateElement.value) || 0,
            taxAmount: parseFloat(taxAmountElement.textContent.replace(/[$,]/g, '')) || 0,
            shippingFee: parseFloat(shippingFeeElement.value) || 0,
            totalAmount: parseFloat(totalAmountElement.textContent.replace(/[$,]/g, '')) || 0,
            createDate: new Date().toLocaleString('zh-CN'),
            status: 'draft',
            userId: currentUser.id // 添加销售员ID
        };
        
        // 保存到本地存储
        const quotations = JSON.parse(localStorage.getItem('quotations') || '[]');
        quotations.push(quotation);
        localStorage.setItem('quotations', JSON.stringify(quotations));
        
        alert(`Quotation saved successfully! Quote number: ${quotation.quoteNumber}`);
        
    } catch (error) {
        console.error('Error saving quotation:', error);
        alert('Error saving quotation: ' + error.message);
    }

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
    // 清空公司信息 - 从系统设置加载
    loadSystemSettings();
    
    // 清空报价详情
    document.getElementById('quotationNumber').value = '';
    document.getElementById('quotationDate').value = '';
    document.getElementById('validUntil').value = '';
    
    // 清空客户信息
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('customerCity').value = '';
    document.getElementById('customerState').value = '';
    document.getElementById('customerZip').value = '';
    
    // 清空产品列表
    document.getElementById('productList').innerHTML = '';
    
    // 清空特殊说明
    document.getElementById('specialInstructions').value = '';
    
    // 重置支付信息
    document.getElementById('taxRate').value = '8';
    document.getElementById('shippingFee').value = '10';
    
    // 清空支付方式
    document.getElementById('paymentMethod').value = '';
    document.getElementById('billingAddress').value = '';
    
    // 清空银行信息
    document.getElementById('accountName').value = '';
    document.getElementById('accountNumber').value = '';
    document.getElementById('bankName').value = '';
    document.getElementById('routingNumber').value = '';
    document.getElementById('zelleInfo').value = '';
    document.getElementById('swiftCode').value = '';
    
    updateQuotationSummary();
}

// 导出PDF
function exportPDF() {
    try {
        console.log('Starting PDF export...');
        
        // 验证必填字段
        const customerName = document.getElementById('customerName').value;
        if (!customerName) {
            alert('Please fill in customer name before exporting PDF');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert('jsPDF library not loaded. Please refresh the page and try again.');
            return;
        }
        const doc = new jsPDF();
        
        // 尝试加载中文字体，如果失败则使用默认字体
        try {
            // 使用Google Fonts的Noto Sans SC
            doc.addFont('https://fonts.gstatic.com/s/notosanssc/v26/k3kIo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9bHkhp3B7zry8NSvk0uClv20bjOdUl64lJZ4aDz8AiU0EVu0Y3c.woff2', 'NotoSansSC', 'normal');
            doc.addFont('https://fonts.gstatic.com/s/notosanssc/v26/k3kIo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9bHkhp3B7zry8NSvk0uClv20bjOdUl64lJZ4aDz8AiU0EVu0Y3c.woff2', 'NotoSansSC', 'bold');
        } catch (error) {
            console.warn('Failed to load Chinese fonts, using default fonts:', error);
        }
    
    let y = 20;
    const leftMargin = 20;
    const rightMargin = 190;
    const pageHeight = 280; // A4页面高度限制
    const lineHeight = 6; // 标准行高
    const sectionSpacing = 15; // 段落间距
    
    // 检查并添加新页面的辅助函数
    function checkAndAddPage(requiredSpace) {
        if (y + requiredSpace > pageHeight) {
            console.log('Adding new page. Current y:', y, 'Required space:', requiredSpace, 'Page height:', pageHeight);
            doc.addPage();
            y = 20;
            return true;
        }
        return false;
    }
    
    // 标题
    doc.setFontSize(24);
    try {
        doc.setFont('NotoSansSC', 'bold');
        doc.text('报价单', 105, y, { align: 'center' });
    } catch (error) {
        doc.setFont(undefined, 'bold');
        doc.text('QUOTATION', 105, y, { align: 'center' });
    }
    y += 20;
    
    // 公司信息
    checkAndAddPage(40); // 检查是否需要新页面
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    try {
        doc.setFont('NotoSansSC', 'bold');
        doc.text('公司信息', leftMargin, y);
    } catch (error) {
        doc.setFont(undefined, 'bold');
        doc.text('Company Information', leftMargin, y);
    }
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // 从系统设置获取公司信息，如果没有则使用默认值
    const companyName = systemSettings.companyName || document.getElementById('companyName').value || 'Home Decorators Collection';
    const companyAddress = systemSettings.companyAddress || document.getElementById('companyAddress').value || '123 Blinds Street, Window City, WS 45678';
    const companyPhone = systemSettings.companyPhone || document.getElementById('companyPhone').value || '(123) 456-7890';
    const companyEmail = systemSettings.companyEmail || document.getElementById('companyEmail').value || 'support@homedecorators.com';
    
    try {
        doc.setFont('NotoSansSC', 'normal');
        doc.text(`公司名称: ${companyName}`, leftMargin, y);
        y += 6;
        doc.text(`地址: ${companyAddress}`, leftMargin, y);
        y += 6;
        doc.text(`电话号码: ${companyPhone}`, leftMargin, y);
        y += 6;
        doc.text(`邮箱: ${companyEmail}`, leftMargin, y);
    } catch (error) {
        doc.setFont(undefined, 'normal');
        doc.text(`Company Name: ${companyName}`, leftMargin, y);
        y += 6;
        doc.text(`Address: ${companyAddress}`, leftMargin, y);
        y += 6;
        doc.text(`Phone: ${companyPhone}`, leftMargin, y);
        y += 6;
        doc.text(`Email: ${companyEmail}`, leftMargin, y);
    }
    y += 15;
    
    // 报价详情
    checkAndAddPage(30); // 检查是否需要新页面
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    try {
        doc.setFont('NotoSansSC', 'bold');
        doc.text('报价详情', leftMargin, y);
    } catch (error) {
        doc.setFont(undefined, 'bold');
        doc.text('Quotation Details', leftMargin, y);
    }
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Quote Number: ${document.getElementById('quotationNumber').value || 'QUO-00123'}`, leftMargin, y);
    y += 6;
    doc.text(`Quote Date: ${document.getElementById('quotationDate').value || new Date().toLocaleDateString('en-US')}`, leftMargin, y);
    y += 6;
    doc.text(`Valid Until: ${document.getElementById('validUntil').value || ''}`, leftMargin, y);
    y += 15;
    
    // 客户信息
    checkAndAddPage(50); // 检查是否需要新页面
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    try {
        doc.setFont('NotoSansSC', 'bold');
        doc.text('客户信息', leftMargin, y);
    } catch (error) {
        doc.setFont(undefined, 'bold');
        doc.text('Customer Information', leftMargin, y);
    }
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Name: ${document.getElementById('customerName').value || '[Customer Name]'}`, leftMargin, y);
    y += 6;
    doc.text(`Phone: ${document.getElementById('customerPhone').value || '[Customer Phone]'}`, leftMargin, y);
    y += 6;
    doc.text(`Email: ${document.getElementById('customerEmail').value || '[Customer Email]'}`, leftMargin, y);
    y += 6;
    doc.text(`Delivery Address:`, leftMargin, y);
    y += 6;
    doc.text(`  ${document.getElementById('customerAddress').value || '[Street Address]'}`, leftMargin + 5, y);
    y += 6;
    doc.text(`  ${document.getElementById('customerCity').value || '[City]'}, ${document.getElementById('customerState').value || '[State]'} ${document.getElementById('customerZip').value || '[ZIP]'}`, leftMargin + 5, y);
    y += 15;
    
    // 订单汇总表格
    checkAndAddPage(100); // 检查是否需要新页面，表格需要更多空间
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    try {
        doc.setFont('NotoSansSC', 'bold');
        doc.text('订单汇总', leftMargin, y);
    } catch (error) {
        doc.setFont(undefined, 'bold');
        doc.text('Order Summary', leftMargin, y);
    }
    y += 10;
    
    // 表格头部
    const tableHeaders = ['Item Description', 'Width (in)', 'Length (in)', 'Quantity', 'Unit Price', 'Total Price'];
    const colWidths = [60, 25, 25, 20, 25, 25];
    let x = leftMargin;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    tableHeaders.forEach((header, index) => {
        doc.text(header, x, y);
        x += colWidths[index];
    });
    y += 8;
    
    // 表格内容
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    let rowCount = 0;
    document.querySelectorAll('.product-item').forEach((item, index) => {
        // 动态计算每页可以容纳的行数，而不是固定限制
        const availableSpace = pageHeight - y;
        const rowsPerPage = Math.floor(availableSpace / 6);
        
        if (rowCount >= rowsPerPage && availableSpace < 20) {
            console.log('Table row limit reached for current page. Adding new page.');
            doc.addPage();
            y = 20;
            rowCount = 0;
            
            // 在新页面上重复表格头部
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            x = leftMargin;
            tableHeaders.forEach((header, index) => {
                doc.text(header, x, y);
                x += colWidths[index];
            });
            y += 8;
        }
        
        // 检查是否需要新页面
        if (y + 10 > pageHeight) {
            console.log('Adding new page for table row. Current y:', y, 'Page height:', pageHeight);
            doc.addPage();
            y = 20;
        }
        
        const category = item.querySelector('select').value;
        const productName = item.querySelectorAll('select')[1].value;
        const width = item.querySelectorAll('input')[0].value;
        const height = item.querySelectorAll('input')[1].value;
        const quantity = item.querySelectorAll('input')[2].value;
        const unitPrice = item.querySelectorAll('input')[3].value;
        const totalPrice = item.querySelectorAll('input')[4].value;
        
        if (category && productName) {
            x = leftMargin;
            
            // Item Description
            const description = `${category}, ${productName}`;
            doc.text(description.substring(0, 25), x, y);
            x += colWidths[0];
            
            // Width
            doc.text(width || '0', x, y);
            x += colWidths[1];
            
            // Length
            doc.text(height || '0', x, y);
            x += colWidths[2];
            
            // Quantity
            doc.text(quantity || '0', x, y);
            x += colWidths[3];
            
            // Unit Price
            doc.text(unitPrice || '$0.00', x, y);
            x += colWidths[4];
            
            // Total Price
            doc.text(totalPrice || '$0.00', x, y);
            
            y += 6;
            rowCount++;
        }
    });
    
    // 添加空行
    for (let i = rowCount; i < 3; i++) {
        x = leftMargin;
        tableHeaders.forEach((header, index) => {
            x += colWidths[index];
        });
        y += 6;
    }
    y += 10;
    
    // 特殊说明
    const specialInstructions = document.getElementById('specialInstructions').value;
    if (specialInstructions) {
        checkAndAddPage(30); // 检查是否需要新页面
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Special Instructions', leftMargin, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`• ${specialInstructions}`, leftMargin, y);
        y += 15;
    }
    
    // 支付信息
    checkAndAddPage(50); // 检查是否需要新页面
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Payment Information', leftMargin, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    const subtotal = document.getElementById('subtotal').textContent || '$0.00';
    const taxRate = document.getElementById('taxRate').value || '8';
    const taxAmount = document.getElementById('taxAmount').textContent || '$0.00';
    const shipping = document.getElementById('shippingFee').value || '10';
    const total = document.getElementById('totalAmount').textContent || '$0.00';
    
    doc.text(`Subtotal: ${subtotal}`, leftMargin, y);
    doc.text(subtotal, rightMargin, y, { align: 'right' });
    y += 6;
    
    doc.text(`Tax (${taxRate}%): ${taxAmount}`, leftMargin, y);
    doc.text(taxAmount, rightMargin, y, { align: 'right' });
    y += 6;
    
    doc.text(`Shipping: $${shipping}`, leftMargin, y);
    doc.text(`$${shipping}`, rightMargin, y, { align: 'right' });
    y += 6;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Amount Due: ${total}`, leftMargin, y);
    doc.text(total, rightMargin, y, { align: 'right' });
    y += 15;
    
    // 附加信息
    const additionalInfo = systemSettings.additionalInfo;
    if (additionalInfo) {
        checkAndAddPage(30);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Additional Information', leftMargin, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(additionalInfo, leftMargin, y);
        y += 15;
    }
    
    // 重要注意事项
    const importantNotes = systemSettings.importantNotes;
    if (importantNotes) {
        checkAndAddPage(30);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Important Notes', leftMargin, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(importantNotes, leftMargin, y);
        y += 15;
    }
    
    // 支付方式
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (paymentMethod) {
        checkAndAddPage(40); // 检查是否需要新页面
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Payment Method', leftMargin, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Payment Method: ${paymentMethod}`, leftMargin, y);
        y += 6;
        
        const billingAddress = document.getElementById('billingAddress').value;
        if (billingAddress) {
            doc.text(`Billing Address: ${billingAddress}`, leftMargin, y);
            y += 6;
        }
        y += 10;
    }
    
    // 条款和条件
    checkAndAddPage(60); // 检查是否需要新页面
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Terms and Conditions', leftMargin, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const terms = [
        'All sales are final.',
        'Products are covered under a one-year warranty for manufacturing defects.',
        'Please refer to our return policy for more information.',
        'Payment is due within 30 days of quotation date.',
        'Prices are subject to change without prior notice.'
    ];
    
    terms.forEach(term => {
        doc.text(`• ${term}`, leftMargin, y);
        y += 6;
    });
    y += 10;
    
    // 备注
    checkAndAddPage(50); // 检查是否需要新页面
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Notes', leftMargin, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const notes = [
        'Please make the payment by the due date to avoid any late fees.',
        'If you have any questions about this quotation, please contact us at the phone number or email above.',
        'This quotation is valid for 30 days from the date of issue.'
    ];
    
    notes.forEach(note => {
        doc.text(`• ${note}`, leftMargin, y);
        y += 6;
    });
    y += 15;
    
    // 结束语
    checkAndAddPage(30); // 检查是否需要新页面
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Thank you for your business!', 105, y, { align: 'center' });
    
    // 保存PDF
    const fileName = `Quotation_${document.getElementById('quotationNumber').value || 'QUO-00123'}_${new Date().toISOString().split('T')[0]}.pdf`;
    console.log('PDF export completed. Final y position:', y, 'Pages:', doc.getNumberOfPages());
    console.log('PDF content summary: Company info, Quotation details, Customer info, Order summary table, Payment info, Terms, Notes, Closing statement');
    doc.save(fileName);
    } catch (error) {
        console.error('Error during PDF export:', error);
        alert('Error generating PDF: ' + error.message);
    }
}

// 打印报价单
function printQuotation() {
    const printWindow = window.open('', '_blank');
    const printContent = `
        <html>
        <head>
            <title>Quotation</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 25px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; }
                .section h3 { border-bottom: 2px solid #007bff; padding-bottom: 8px; margin: 0 0 15px 0; color: #333; font-size: 18px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: center; }
                th { background: #f8f9fa; color: #333; font-weight: 600; }
                .total { font-weight: bold; font-size: 18px; color: #007bff; }
                .company-info { background: #f8f9fa; }
                .closing-statement { text-align: center; background: #f8f9fa; border: 2px solid #007bff; }
                .closing-statement h3 { color: #007bff; border: none; }
                .payment-summary { background: #f8f9fa; padding: 15px; border-radius: 6px; }
                .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; border-bottom: 1px solid #e0e0e0; }
                .summary-row.total { font-weight: 600; font-size: 16px; border-top: 2px solid #007bff; padding-top: 10px; margin-top: 10px; }
                .summary-row:last-child { border-bottom: none; }
                .terms-content ul, .notes-content ul { margin: 0; padding-left: 20px; }
                .terms-content li, .notes-content li { margin-bottom: 8px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>报价单</h1>
            </div>
            
            <div class="section company-info">
                <h3>公司信息</h3>
                <p><strong>公司名称:</strong> ${systemSettings.companyName || document.getElementById('companyName').value || 'Home Decorators Collection'}</p>
                <p><strong>地址:</strong> ${systemSettings.companyAddress || document.getElementById('companyAddress').value || '123 Blinds Street, Window City, WS 45678'}</p>
                <p><strong>电话号码:</strong> ${systemSettings.companyPhone || document.getElementById('companyPhone').value || '(123) 456-7890'}</p>
                <p><strong>邮箱:</strong> ${systemSettings.companyEmail || document.getElementById('companyEmail').value || 'support@homedecorators.com'}</p>
            </div>
            
            <div class="section">
                <h3>报价详情</h3>
                <p><strong>报价单号:</strong> ${document.getElementById('quotationNumber').value || 'QUO-00123'}</p>
                <p><strong>报价日期:</strong> ${document.getElementById('quotationDate').value || new Date().toLocaleDateString('zh-CN')}</p>
                <p><strong>有效期至:</strong> ${document.getElementById('validUntil').value || ''}</p>
            </div>
            
            <div class="section">
                <h3>客户信息</h3>
                <p><strong>姓名:</strong> ${document.getElementById('customerName').value || '[客户姓名]'}</p>
                <p><strong>电话号码:</strong> ${document.getElementById('customerPhone').value || '[客户电话号码]'}</p>
                <p><strong>邮箱地址:</strong> ${document.getElementById('customerEmail').value || '[客户邮箱地址]'}</p>
                <p><strong>送货地址:</strong></p>
                <p style="margin-left: 20px;">${document.getElementById('customerAddress').value || '[街道地址]'}</p>
                <p style="margin-left: 20px;">${document.getElementById('customerCity').value || '[城市]'}, ${document.getElementById('customerState').value || '[州]'} ${document.getElementById('customerZip').value || '[邮编]'}</p>
            </div>
            
            <div class="section">
                <h3>订单汇总</h3>
                <table>
                    <thead>
                        <tr>
                            <th>产品描述</th>
                            <th>宽度 (英寸)</th>
                            <th>长度 (英寸)</th>
                            <th>数量</th>
                            <th>单价</th>
                            <th>总价</th>
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
                            const totalPrice = item.querySelectorAll('input')[4].value;
                            
                            if (category && productName) {
                                return `
                                    <tr>
                                        <td style="text-align: left;">${category}, ${productName}</td>
                                        <td>${width || '0'}</td>
                                        <td>${height || '0'}</td>
                                        <td>${quantity || '0'}</td>
                                        <td style="text-align: right;">${unitPrice || '$0.00'}</td>
                                        <td style="text-align: right;">${totalPrice || '$0.00'}</td>
                                    </tr>
                                `;
                            }
                            return '';
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            ${document.getElementById('specialInstructions').value ? `
            <div class="section">
                <h3>特殊说明或要求</h3>
                <p>• ${document.getElementById('specialInstructions').value}</p>
            </div>
            ` : ''}
            
            <div class="section payment-summary">
                <h3>支付信息</h3>
                <div class="summary-row">
                    <span><strong>小计:</strong></span>
                    <span>${document.getElementById('subtotal').textContent || '$0.00'}</span>
                </div>
                <div class="summary-row">
                    <span><strong>税费 (${document.getElementById('taxRate').value || '8'}%):</strong></span>
                    <span>${document.getElementById('taxAmount').textContent || '$0.00'}</span>
                </div>
                <div class="summary-row">
                    <span><strong>运费:</strong></span>
                    <span>$${document.getElementById('shippingFee').value || '10'}</span>
                </div>
                <div class="summary-row total">
                    <span><strong>应付总额:</strong></span>
                    <span>${document.getElementById('totalAmount').textContent || '$0.00'}</span>
                </div>
            </div>
            
            ${systemSettings.additionalInfo ? `
            <div class="section">
                <h3>附加信息</h3>
                <p>${systemSettings.additionalInfo}</p>
            </div>
            ` : ''}
            
            ${systemSettings.importantNotes ? `
            <div class="section">
                <h3>重要注意事项</h3>
                <p>${systemSettings.importantNotes}</p>
            </div>
            ` : ''}
            
            ${document.getElementById('paymentMethod').value ? `
            <div class="section">
                <h3>支付方式</h3>
                <p><strong>支付方式:</strong> ${document.getElementById('paymentMethod').value}</p>
                ${document.getElementById('billingAddress').value ? `<p><strong>账单地址:</strong> ${document.getElementById('billingAddress').value}</p>` : ''}
            </div>
            ` : ''}
            
            <div class="section">
                <h3>条款和条件</h3>
                <div class="terms-content">
                    <ul>
                        <li>所有销售均为最终销售。</li>
                        <li>产品在制造缺陷方面享有一年保修。</li>
                        <li>请参考我们的退货政策了解更多信息。</li>
                        <li>付款应在报价单日期后30天内完成。</li>
                        <li>价格可能会在未经事先通知的情况下发生变化。</li>
                    </ul>
                </div>
            </div>
            
            <div class="section">
                <h3>备注</h3>
                <div class="notes-content">
                    <ul>
                        <li>请在到期日前付款以避免滞纳金。</li>
                        <li>如果您对此报价单有任何疑问，请通过上述电话号码或邮箱联系我们。</li>
                        <li>此报价单自签发之日起30天内有效。</li>
                    </ul>
                </div>
            </div>
            
            <div class="section closing-statement">
                <h3>感谢您的惠顾！</h3>
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
    // displayProductTable(); // 已移除产品管理页面
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
    
    alert('Product added successfully!');
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
    
    alert('User added successfully!');
}

// 保存系统设置
function saveSystemSettings() {
    const settings = {
        companyName: document.getElementById('companyName').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyPhone: document.getElementById('companyPhone').value,
        companyEmail: document.getElementById('companyEmail').value,
        paymentTerms: document.getElementById('paymentTerms').value,
        additionalInfo: document.getElementById('additionalInfo').value,
        importantNotes: document.getElementById('importantNotes').value
    };
    
    systemSettings = settings;
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    
    alert('系统设置保存成功！');
}

// 重置系统设置
function resetSystemSettings() {
    showCustomConfirm(
        '重置系统设置确认',
        '确定要重置系统设置吗？这将清除所有自定义的公司信息，恢复为默认设置。',
        () => {
            // 清除localStorage中的系统设置
            localStorage.removeItem('systemSettings');
            
            // 重置全局变量
            systemSettings = {};
            
            // 清空界面上的所有字段
            document.getElementById('companyName').value = '';
            document.getElementById('companyAddress').value = '';
            document.getElementById('companyPhone').value = '';
            document.getElementById('companyEmail').value = '';
            document.getElementById('paymentTerms').value = '';
            document.getElementById('additionalInfo').value = '';
            document.getElementById('importantNotes').value = '';
            
            alert('系统设置已重置为默认值！');
            
            console.log('System settings reset completed');
        },
        () => {
            console.log('User cancelled system settings reset');
        }
    );
}

// 加载系统设置
function loadSystemSettings() {
    console.log('=== Loading System Settings ===');
    console.log('Current systemSettings:', systemSettings);
    console.log('localStorage systemSettings:', localStorage.getItem('systemSettings'));
    
    const companyNameElement = document.getElementById('companyName');
    const companyAddressElement = document.getElementById('companyAddress');
    const companyPhoneElement = document.getElementById('companyPhone');
    const companyEmailElement = document.getElementById('companyEmail');
    const paymentTermsElement = document.getElementById('paymentTerms');
    const additionalInfoElement = document.getElementById('additionalInfo');
    const importantNotesElement = document.getElementById('importantNotes');
    
    console.log('Found elements:', {
        companyName: !!companyNameElement,
        companyAddress: !!companyAddressElement,
        companyPhone: !!companyPhoneElement,
        companyEmail: !!companyEmailElement,
        paymentTerms: !!paymentTermsElement,
        additionalInfo: !!additionalInfoElement,
        importantNotes: !!importantNotesElement
    });
    
    if (companyNameElement) {
        const oldValue = companyNameElement.value;
        companyNameElement.value = systemSettings.companyName || '';
        console.log(`Company name: "${oldValue}" -> "${companyNameElement.value}"`);
    } else {
        console.warn('companyName element not found');
    }
    
    if (companyAddressElement) {
        const oldValue = companyAddressElement.value;
        companyAddressElement.value = systemSettings.companyAddress || '';
        console.log(`Company address: "${oldValue}" -> "${companyAddressElement.value}"`);
    } else {
        console.warn('companyAddress element not found');
    }
    
    if (companyPhoneElement) {
        const oldValue = companyPhoneElement.value;
        companyPhoneElement.value = systemSettings.companyPhone || '';
        console.log(`Company phone: "${oldValue}" -> "${companyPhoneElement.value}"`);
    } else {
        console.warn('companyPhone element not found');
    }
    
    if (companyEmailElement) {
        const oldValue = companyEmailElement.value;
        companyEmailElement.value = systemSettings.companyEmail || '';
        console.log(`Company email: "${oldValue}" -> "${companyEmailElement.value}"`);
    } else {
        console.warn('companyEmail element not found');
    }
    
    if (paymentTermsElement) {
        const oldValue = paymentTermsElement.value;
        paymentTermsElement.value = systemSettings.paymentTerms || '';
        console.log(`Payment terms: "${oldValue}" -> "${paymentTermsElement.value}"`);
    } else {
        console.warn('paymentTerms element not found');
    }
    
    if (additionalInfoElement) {
        const oldValue = additionalInfoElement.value;
        additionalInfoElement.value = systemSettings.additionalInfo || '';
        console.log(`Additional info: "${oldValue}" -> "${additionalInfoElement.value}"`);
    } else {
        console.warn('additionalInfo element not found');
    }
    
    if (importantNotesElement) {
        const oldValue = importantNotesElement.value;
        importantNotesElement.value = systemSettings.importantNotes || '';
        console.log(`Important notes: "${oldValue}" -> "${importantNotesElement.value}"`);
    } else {
        console.warn('importantNotes element not found');
    }
    
    console.log('=== System Settings Load Complete ===');
}

// 显示产品表
function displayProductTable() {
    const container = document.getElementById('productTableDisplay');
    
    // 添加DOM元素存在性检查
    if (!container) {
        console.warn('Product table display container not found - skipping display');
        return;
    }
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p>No product data available</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Product Category</th>
                    <th>System</th>
                    <th>Product Code 1</th>
                    <th>Product Code 2</th>
                    <th>Actions</th>
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
                    <button onclick="deleteProduct(${product.id})" class="btn-danger">Delete</button>
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
        container.innerHTML = '<p>No user data available</p>';
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
                <td>${user.role === 'admin' ? 'Admin' : 'Salesperson'}</td>
                <td>${user.realName}</td>
                <td>${user.phone || ''}</td>
                <td>${user.email || ''}</td>
                <td>
                    <button onclick="deleteUser(${user.id})" class="btn-danger">Delete</button>
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
        container.innerHTML = '<p>No price data available</p>';
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
                <td>${(item.width_min || item.widthMin)}-${(item.width_max || item.widthMax)}</td>
                <td>${(item.height_min || item.heightMin)}-${(item.height_max || item.heightMax)}</td>
                <td>${formatCurrency(item.price)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// 删除产品
function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        products = products.filter(p => p.id !== productId);
        localStorage.setItem('products', JSON.stringify(products));
        displayProductTable();
    }
}

// 删除用户
function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
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

// 导入价格表 - 添加元素存在性检查
const priceFileElement = document.getElementById('priceFile');
if (priceFileElement) {
    priceFileElement.addEventListener('change', function(event) {
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
                        alert('Price list imported successfully!');
                    } else {
                        alert('File format error, please select a valid JSON file');
                    }
                } catch (error) {
                    alert('文件解析失败，请检查文件格式');
                }
            };
            reader.readAsText(file);
        }
    });
}

// 重置价格表
function resetPriceTable() {
    showCustomConfirm(
        '重置价格表确认',
        '确定要重置价格表吗？这将恢复默认价格数据。',
        async () => {
            try {
                // 清除localStorage中的价格表
                localStorage.removeItem('priceTable');
                
                // 清空数据库中的价格表
                if (db) {
                    db.run('DELETE FROM price_table');
                    console.log('Price table cleared from database');
                    
                    // 保存数据库到IndexedDB
                    try {
                        await saveDatabaseToIndexedDB();
                        console.log('Database saved after price table reset');
                    } catch (error) {
                        console.error('Error saving database after price table reset:', error);
                    }
                }
                
                location.reload();
            } catch (error) {
                console.error('Error during price table reset:', error);
                location.reload();
            }
        },
        () => {
            console.log('User cancelled price table reset');
        }
    );
}

// 加载我的报价单
function loadMyQuotations() {
    const quotations = JSON.parse(localStorage.getItem('quotations') || '[]');
    const myQuotations = quotations.filter(q => q.userId === currentUser.id);
    
    const container = document.getElementById('quotationsList');
    
    if (myQuotations.length === 0) {
        container.innerHTML = '<p>No quotations available</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Quote Number</th>
                    <th>Customer Name</th>
                    <th>Create Date</th>
                    <th>Status</th>
                    <th>Total Amount</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    myQuotations.forEach(quotation => {
        html += `
            <tr>
                <td>${quotation.quoteNumber || 'N/A'}</td>
                <td>${quotation.customer?.name || quotation.customerName || 'N/A'}</td>
                <td>${quotation.createDate || 'N/A'}</td>
                <td><span class="status-tag status-${quotation.status || 'pending'}">${getStatusText(quotation.status || 'pending')}</span></td>
                <td>${formatCurrency(quotation.totalAmount || 0)}</td>
                <td>
                    <button onclick="viewQuotation(${quotation.id})" class="btn-secondary">View</button>
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
        container.innerHTML = '<p>No customer data available</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Create Date</th>
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
        container.innerHTML = '<p>No quotations available</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Quote Number</th>
                    <th>Salesperson</th>
                    <th>Customer Name</th>
                    <th>Create Date</th>
                    <th>Status</th>
                    <th>Total Amount</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    quotations.forEach(quotation => {
        const salesUser = users.find(u => u.id === quotation.userId);
        html += `
            <tr>
                <td>${quotation.quoteNumber}</td>
                <td>${salesUser ? salesUser.realName : 'Unknown'}</td>
                <td>${quotation.customer.name}</td>
                <td>${quotation.createDate}</td>
                <td><span class="status-tag status-${quotation.status}">${getStatusText(quotation.status)}</span></td>
                <td>${formatCurrency(quotation.totalAmount)}</td>
                <td>
                    <button onclick="viewQuotation(${quotation.id})" class="btn-secondary">View</button>
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
        'draft': 'Draft',
        'sent': 'Sent',
        'confirmed': 'Confirmed',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

// 查看报价单
function viewQuotation(quotationId) {
    const quotations = JSON.parse(localStorage.getItem('quotations') || '[]');
    const quotation = quotations.find(q => q.id === quotationId);
    
    if (quotation) {
        // 这里可以实现查看报价单详情的功能
        alert(`Viewing quotation: ${quotation.quoteNumber}`);
    }
}

// 监听税率和运费变化 - 使用安全的DOM访问
// 这些监听器现在在initializeEventListeners函数中初始化

// 从文件导入数据到数据库
async function importDataFromFile(filePath) {
    try {
        console.log(`Attempting to import data from file: ${filePath}`);
        
        // 由于浏览器安全限制，无法直接读取本地文件系统的文件
        // 这个功能需要用户通过文件选择器手动选择文件
        console.warn(`Cannot directly read file from ${filePath} due to browser security restrictions`);
        console.log('To import data, please use the file upload feature in the admin panel');
        console.log('Note: The configured file path is for reference only and cannot be automatically accessed');
        
        return false; // 返回false表示没有成功导入数据
    } catch (error) {
        console.error('Error importing data from file:', error);
        return false;
    }
}

// 数据库价格查询函数
function queryPriceFromDatabase(category, width, height, widthUnit = 'cm', heightUnit = 'cm') {
    try {
        if (!db) {
            console.error('Database not initialized');
            return null;
        }
        
        // 转换单位到厘米
        const widthCm = widthUnit === 'in' ? width * 2.54 : width;
        const heightCm = heightUnit === 'in' ? height * 2.54 : height;
        
        // 构建查询SQL
        let sql = `
            SELECT * FROM price_table 
            WHERE category = ? 
            AND width_min <= ? AND width_max >= ?
            AND height_min <= ? AND height_max >= ?
            ORDER BY price ASC
            LIMIT 1
        `;
        
        const params = [category, widthCm, widthCm, heightCm, heightCm];
        
        // 执行查询
        const result = db.exec(sql, params);
        
        if (result && result.length > 0 && result[0].values.length > 0) {
            const row = result[0].values[0];
            const columns = result[0].columns;
            
            // 构建结果对象
            const priceData = {};
            columns.forEach((col, index) => {
                priceData[col] = row[index];
            });
            
            console.log('Price query result:', priceData);
            return priceData;
        }
        
        return null;
        
    } catch (error) {
        console.error('Error querying price from database:', error);
        return null;
    }
}

// 带产品信息的精确价格查询函数
function queryPriceFromDatabaseWithProduct(category, system, code1, code2, width, height, widthUnit = 'cm', heightUnit = 'cm') {
    try {
        if (!db) {
            console.error('Database not initialized');
            return null;
        }
        
        // 转换单位到厘米
        const widthCm = widthUnit === 'in' ? width * 2.54 : width;
        const heightCm = heightUnit === 'in' ? height * 2.54 : height;
        
        console.log('=== Querying Price with Product Info ===');
        console.log('Query parameters:', {
            category, system, code1, code2,
            width: widthCm, height: heightCm, unit: 'cm'
        });
        
        // 构建查询SQL - 优先匹配完整的产品信息
        let sql = `
            SELECT * FROM price_table 
            WHERE category = ? 
            AND system = ?
            AND code1 = ?
            AND code2 = ?
            AND width_min <= ? AND width_max >= ?
            AND height_min <= ? AND height_max >= ?
            ORDER BY price ASC
            LIMIT 1
        `;
        
        const params = [category, system, code1, code2, widthCm, widthCm, heightCm, heightCm];
        
        // 执行查询
        const result = db.exec(sql, params);
        
        if (result && result.length > 0 && result[0].values.length > 0) {
            const row = result[0].values[0];
            const columns = result[0].columns;
            
            // 构建结果对象
            const priceData = {};
            columns.forEach((col, index) => {
                priceData[col] = row[index];
            });
            
            console.log('Exact match found:', priceData);
            return priceData;
        } else {
            console.log('No exact match found, trying fallback query...');
            // 如果没有找到精确匹配，回退到只使用category和尺寸的查询
            return queryPriceFromDatabase(category, widthCm, heightCm, 'cm', 'cm');
        }
        
    } catch (error) {
        console.error('Error querying price with product info:', error);
        return null;
    }
}

// 批量价格查询
function batchQueryPrices(queries) {
    try {
        if (!db) {
            console.error('Database not initialized');
            return [];
        }
        
        const results = [];
        
        queries.forEach(query => {
            const result = queryPriceFromDatabase(
                query.category,
                query.width,
                query.height,
                query.widthUnit || 'cm',
                query.heightUnit || 'cm'
            );
            
            results.push({
                query: query,
                result: result,
                success: result !== null
            });
        });
        
        return results;
        
    } catch (error) {
        console.error('Error in batch price query:', error);
        return [];
    }
}

// 获取所有类别
function getAllCategoriesFromDatabase() {
    try {
        if (!db) {
            console.log('Database not initialized in getAllCategoriesFromDatabase');
            return [];
        }
        
        console.log('Executing database query for categories...');
        
        // 先检查表是否存在数据
        const countResult = db.exec('SELECT COUNT(*) as count FROM price_table');
        console.log('Total rows in price_table:', countResult);
        
        const result = db.exec('SELECT DISTINCT category FROM price_table ORDER BY category');
        console.log('Database query result:', result);
        
        if (result && result[0] && result[0].values) {
            const categories = result[0].values.map(row => row[0]);
            console.log('Extracted categories:', categories);
            return categories;
        }
        
        console.log('No categories found in database result');
        return [];
    } catch (error) {
        console.error('Error getting categories from database:', error);
        return [];
    }
}

// 获取所有系统
function getAllSystemsFromDatabase() {
    try {
        if (!db) {
            console.log('Database not initialized in getAllSystemsFromDatabase');
            return [];
        }
        
        console.log('Executing database query for systems...');
        
        // 先检查表是否存在数据
        const countResult = db.exec('SELECT COUNT(*) as count FROM price_table');
        console.log('Total rows in price_table for systems check:', countResult);
        
        const result = db.exec('SELECT DISTINCT system FROM price_table WHERE system IS NOT NULL AND system != "" ORDER BY system');
        console.log('Database query result for systems:', result);
        
        if (result && result[0] && result[0].values) {
            const systems = result[0].values.map(row => row[0]);
            console.log('Extracted systems:', systems);
            return systems;
        }
        
        console.log('No systems found in database result');
        return [];
    } catch (error) {
        console.error('Error getting systems from database:', error);
        return [];
    }
}

// 获取价格统计信息
function getPriceStatisticsFromDatabase() {
    try {
        if (!db) {
            console.error('Database not initialized');
            return null;
        }
        
        const result = db.exec(`
            SELECT 
                COUNT(*) as total_entries,
                COUNT(DISTINCT category) as total_categories,
                MIN(price) as min_price,
                MAX(price) as max_price,
                AVG(price) as avg_price
            FROM price_table
        `);
        
        if (result && result.length > 0 && result[0].values.length > 0) {
            const row = result[0].values[0];
            const columns = result[0].columns;
            
            const stats = {};
            columns.forEach((col, index) => {
                stats[col] = row[index];
            });
            
            return stats;
        }
        
        return null;
        
    } catch (error) {
        console.error('Error getting price statistics from database:', error);
        return null;
    }
}

// 数据库配置管理函数
function toggleDatabaseConfig() {
    try {
        const dbTypeElement = document.getElementById('dbType');
        const apiUrlGroup = document.getElementById('apiUrlGroup');
        const apiAuthGroup = document.getElementById('apiAuthGroup');
        
        if (!dbTypeElement) {
            console.warn('dbType element not found');
            return;
        }
        
        const dbType = dbTypeElement.value;
        
        if (dbType === 'api') {
            if (apiUrlGroup) apiUrlGroup.style.display = 'block';
            if (apiAuthGroup) apiAuthGroup.style.display = 'block';
        } else {
            if (apiUrlGroup) apiUrlGroup.style.display = 'none';
            if (apiAuthGroup) apiAuthGroup.style.display = 'none';
        }
    } catch (error) {
        console.error('Error toggling database config:', error);
    }
}

// 文件路径选择函数
function selectLocalFilePath() {
    try {
        // 触发隐藏的文件输入框
        const hiddenFileInput = document.getElementById('hiddenFileInput');
        hiddenFileInput.click();
    } catch (error) {
        console.error('Error selecting file path:', error);
        alert('Error selecting file path: ' + error.message);
    }
}

// 从选择的文件更新文件路径
function updateFilePathFromFile(fileInput) {
    try {
        const file = fileInput.files[0];
        if (file) {
            // 获取文件的完整路径（在浏览器环境中，这通常是文件名）
            const filePath = file.name;
            
            // 更新文件路径输入框
            document.getElementById('localFilePath').value = filePath;
            
            // 自动设置文件格式
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const fileFormatSelect = document.getElementById('fileFormat');
            
            if (fileExtension === 'xlsx') {
                fileFormatSelect.value = 'xlsx';
            } else if (fileExtension === 'xls') {
                fileFormatSelect.value = 'xls';
            } else if (fileExtension === 'csv') {
                fileFormatSelect.value = 'csv';
            }
            
            // 显示文件信息
            displayFileInfo(file);
            
            // 显示清除按钮
            const clearFileBtn = document.getElementById('clearFileBtn');
            if (clearFileBtn) {
                clearFileBtn.style.display = 'inline-block';
            }
            
            // 显示选择的文件信息
            console.log('Selected file:', file.name, 'Size:', file.size, 'bytes');
            
            // 可选：立即处理文件
            if (confirm('File selected successfully! Would you like to process it now?')) {
                processImportFileAsync(file);
            }
        }
    } catch (error) {
        console.error('Error updating file path from file:', error);
        alert('Error updating file path: ' + error.message);
    }
}

// 显示文件信息
function displayFileInfo(file) {
    try {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const fileType = document.getElementById('fileType');
        
        if (fileInfo && fileName && fileSize && fileType) {
            fileName.textContent = `File: ${file.name}`;
            fileSize.textContent = `Size: ${formatFileSize(file.size)}`;
            fileType.textContent = `Type: ${file.type || 'Unknown'}`;
            
            fileInfo.style.display = 'block';
        }
    } catch (error) {
        console.error('Error displaying file info:', error);
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function saveDatabaseConfig() {
    try {
        const dbType = document.getElementById('dbType').value;
        const apiBaseUrl = document.getElementById('apiBaseUrl').value;
        const apiKey = document.getElementById('apiKey').value;
        
        dbConfig.type = dbType;
        if (dbType === 'api') {
            dbConfig.apiBase = apiBaseUrl;
        }
        
        localStorage.setItem('dbConfig', JSON.stringify(dbConfig));
        console.log('Database configuration saved successfully');
        alert('Database configuration saved successfully!');
        
        // 重新初始化数据库
        if (dbType === 'sqlite') {
            initializeDatabase();
        }
        
    } catch (error) {
        console.error('Error saving database configuration:', error);
        alert('Error saving database configuration: ' + error.message);
    }
}

function testDatabaseConnection() {
    try {
        const dbType = document.getElementById('dbType').value;
        
        if (dbType === 'sqlite') {
            if (db) {
                alert('SQLite database connection successful!');
            } else {
                alert('SQLite database not initialized. Please check console for errors.');
            }
        } else if (dbType === 'api') {
            const apiBaseUrl = document.getElementById('apiBaseUrl').value;
            testApiConnection(apiBaseUrl);
        } else {
            alert('Database type not supported for testing.');
        }
        
    } catch (error) {
        console.error('Error testing database connection:', error);
        alert('Error testing database connection: ' + error.message);
    }
}

async function testApiConnection(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('API connection successful!');
        } else {
            alert(`API connection failed: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        alert('API connection error: ' + error.message);
    }
}

// 数据源配置管理函数
function toggleDataSourceConfig() {
    try {
        const dataSourceTypeElement = document.getElementById('dataSourceType');
        const localFileConfig = document.getElementById('localFileConfig');
        const remoteServerConfig = document.getElementById('remoteServerConfig');
        
        if (!dataSourceTypeElement) {
            console.warn('dataSourceType element not found');
            return;
        }
        
        const dataSourceType = dataSourceTypeElement.value;
        
        if (dataSourceType === 'local') {
            if (localFileConfig) localFileConfig.style.display = 'block';
            if (remoteServerConfig) remoteServerConfig.style.display = 'none';
        } else {
            if (localFileConfig) localFileConfig.style.display = 'none';
            if (remoteServerConfig) remoteServerConfig.style.display = 'block';
        }
    } catch (error) {
        console.error('Error toggling data source config:', error);
    }
}

// 处理文件选择
function handleFileSelection(fileInput) {
    try {
        const file = fileInput.files[0];
        if (file) {
            // 显示文件信息
            displayFileInfo(file);
            
            // 显示文件配置选项
            document.getElementById('fileConfigOptions').style.display = 'block';
            
            // 显示清除按钮
            document.getElementById('clearFileBtn').style.display = 'inline-block';
            
            // 自动设置文件格式
            autoSetFileFormat(file);
            
            // 启用导入按钮
            document.getElementById('importBtn').disabled = false;
            
            console.log('File selected:', file.name, 'Size:', file.size, 'bytes');
        }
    } catch (error) {
        console.error('Error handling file selection:', error);
        alert('文件选择错误: ' + error.message);
    }
}

// 显示文件信息
function displayFileInfo(file) {
    try {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const fileType = document.getElementById('fileType');
        
        if (fileInfo && fileName && fileSize && fileType) {
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            fileType.textContent = file.type || '未知类型';
            
            fileInfo.style.display = 'block';
        }
    } catch (error) {
        console.error('Error displaying file info:', error);
    }
}

// 自动设置文件格式
function autoSetFileFormat(file) {
    try {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const fileFormatSelect = document.getElementById('fileFormat');
        
        if (fileExtension === 'xlsx') {
            fileFormatSelect.value = 'xlsx';
        } else if (fileExtension === 'xls') {
            fileFormatSelect.value = 'xls';
        } else if (fileExtension === 'csv') {
            fileFormatSelect.value = 'csv';
        }
    } catch (error) {
        console.error('Error setting file format:', error);
    }
}

// 清除文件选择
function clearFileSelection() {
    try {
        // 清除文件输入
        const mainFileInput = document.getElementById('mainFileInput');
        mainFileInput.value = '';
        
        // 隐藏文件信息
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo) {
            fileInfo.style.display = 'none';
        }
        
        // 隐藏文件配置选项
        const fileConfigOptions = document.getElementById('fileConfigOptions');
        if (fileConfigOptions) {
            fileConfigOptions.style.display = 'none';
        }
        
        // 隐藏清除按钮
        const clearFileBtn = document.getElementById('clearFileBtn');
        if (clearFileBtn) {
            clearFileBtn.style.display = 'none';
        }
        
        // 禁用导入按钮
        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.disabled = true;
        }
        
        console.log('File selection cleared');
        
    } catch (error) {
        console.error('Error clearing file selection:', error);
        alert('清除文件选择错误: ' + error.message);
    }
}

// 保存数据源配置
function saveDataSourceConfig() {
    try {
        const dataSourceType = document.getElementById('dataSourceType').value;
        const config = {
            currentSource: dataSourceType,
            lastUpdated: new Date().toISOString()
        };
        
        if (dataSourceType === 'local') {
            const mainFileInput = document.getElementById('mainFileInput');
            if (mainFileInput.files.length > 0) {
                const file = mainFileInput.files[0];
                config.localPath = file.name;
                config.fileFormat = document.getElementById('fileFormat').value;
                config.sheetName = document.getElementById('sheetName').value;
            }
        } else if (dataSourceType === 'remote') {
            config.remoteUrl = document.getElementById('remoteUrl').value;
        }
        
        localStorage.setItem('dataSourceConfig', JSON.stringify(config));
        alert('数据源配置已保存！');
        
        // 刷新数据库状态
        refreshDatabaseStatus();
        
    } catch (error) {
        console.error('Error saving data source config:', error);
        alert('保存配置错误: ' + error.message);
    }
}

// 从数据源导入数据
function importDataFromSource() {
    try {
        const dataSourceType = document.getElementById('dataSourceType').value;
        
        if (dataSourceType === 'local') {
            const mainFileInput = document.getElementById('mainFileInput');
            if (mainFileInput.files.length > 0) {
                const file = mainFileInput.files[0];
                processImportFileAsync(file);
            } else {
                alert('请先选择文件！');
            }
        } else {
            const remoteUrl = document.getElementById('remoteUrl').value;
            if (remoteUrl) {
                importDataFromRemote(remoteUrl);
            } else {
                alert('请输入远程服务器地址！');
            }

        }
        
    } catch (error) {
        console.error('Error importing data from source:', error);
        alert('导入数据错误: ' + error.message);
    }
}

async function importDataFromRemote(remoteUrl) {
    try {
        console.log(`Importing data from remote: ${remoteUrl}`);
        
        const response = await fetch(`${remoteUrl}/prices`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            await importPriceDataToDatabase(data);
            alert('Data imported successfully from remote source!');
            refreshDatabaseStatus();
        } else {
            alert(`Failed to import data: ${response.status} ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('Error importing data from remote:', error);
        alert('Error importing data from remote: ' + error.message);
    }

}

// 数据导入处理函数
function processImportFile() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file to import');
        return;
    }
    
    processImportFileAsync(file);
}

async function processImportFileAsync(file) {
    try {
        console.log(`Processing import file: ${file.name}`);
        
        const fileExtension = file.name.split('.').pop().toLowerCase();
        let priceData = [];
        
        if (fileExtension === 'csv') {
            priceData = await processCSVFile(file);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            priceData = await processExcelFile(file);
        } else {
            alert('Unsupported file format. Please use CSV, XLSX, or XLS files.');
            return;
        }
        
        if (priceData && priceData.data && priceData.data.length > 0) {
            await importPriceDataToDatabase(priceData.data);
            
            // 检查是否之前创建过样本数据，如果是，询问是否要清除
            const sampleDataCreated = localStorage.getItem('sampleDataCreated') === 'true';
            if (sampleDataCreated) {
                showCustomConfirm(
                    '数据导入成功',
                    `成功导入 ${priceData.data.length} 条价格记录！<br><br><span class="warning-text"><span class="warning-icon">!</span>检测到系统中存在样本数据</span><br><br>样本数据包含示例价格记录，可能与您导入的真实数据重复。<br><br>是否要清除样本数据？<br><br><strong>注意：</strong>清除后样本数据将无法恢复。`,
                    async () => {
                        // 清除样本数据
                        try {
                            // 清空价格表
                            db.run('DELETE FROM price_table');
                            
                            // 重新导入真实数据
                            await importPriceDataToDatabase(priceData.data);
                            
                            // 保存数据库
                            await saveDatabaseToIndexedDB();
                            
                            // 标记样本数据已清除
                            localStorage.setItem('sampleDataCleared', 'true');
                            
                            alert('样本数据已清除，真实数据导入完成！');
                        } catch (error) {
                            console.error('Error clearing sample data:', error);
                            alert('清除样本数据时出错：' + error.message);
                        }
                        
                        // 刷新数据库状态
                        setTimeout(() => {
                            refreshDatabaseStatus();
                        }, 500);
                    },
                    () => {
                        // 保留样本数据，只刷新状态
                        alert(`数据导入成功！保留了样本数据。`);
                        setTimeout(() => {
                            refreshDatabaseStatus();
                        }, 500);
                    }
                );
            } else {
                alert(`Successfully imported ${priceData.data.length} price entries!`);
                
                // 自动刷新数据库状态
                setTimeout(() => {
                    refreshDatabaseStatus();
                }, 500);
            }
        } else {
            alert('No valid price data found in the file.');
        }
        
    } catch (error) {
        console.error('Error processing import file:', error);
        alert('Error processing import file: ' + error.message);
    }
}

async function processCSVFile(file) {
    try {
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        console.log(`CSV headers: ${headers.join(', ')}`);
        
        const priceData = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                priceData.push(row);
            }
        }
        
        return validateAndConvertPriceData(priceData, headers);
        
    } catch (error) {
        console.error('Error processing CSV file:', error);
        throw error;
    }
}

async function processExcelFile(file) {
    try {
        if (typeof XLSX === 'undefined') {
            throw new Error('SheetJS library not found');
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const data = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: ''
        });
        
        if (data.length === 0) {
            throw new Error('Excel file is empty');
        }
        
        const headers = data[0];
        console.log(`Excel headers: ${headers.join(', ')}`);
        
        const priceData = [];
        let emptyRowCount = 0;
        for (let i = 1; i < data.length; i++) {
            // 只过滤完全空白的行，允许包含空字符串的行
            if (data[i].some(cell => cell !== '' && cell !== null && cell !== undefined)) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = data[i][index] || '';
                });
                priceData.push(row);
            } else {
                emptyRowCount++;
            }
        }
        
        console.log(`Excel processing summary:`);
        console.log(`   - Total rows in file: ${data.length}`);
        console.log(`   - Data rows: ${priceData.length}`);
        console.log(`   - Empty rows filtered: ${emptyRowCount}`);
        
        return validateAndConvertPriceData(priceData, headers);
        
    } catch (error) {
        console.error('Error processing Excel file:', error);
        throw error;
    }
}
function validateAndConvertPriceData(rawData, headers) {
    try {
        const processedData = [];
        let validCount = 0;
        let invalidCount = 0;
        
        // 添加详细的无效数据统计
        let missingFieldsCount = 0;
        let invalidNumericCount = 0;
        let invalidDimensionCount = 0;
        let emptyRowCount = 0;
        let processingErrorCount = 0; // 新增：处理错误统计
        
        console.log('Processing data with headers:', headers);
        console.log('First few rows for debugging:', rawData.slice(0, 3));
        
        // 添加数据流统计
        console.log(`📊 Data flow analysis:`);
        console.log(`   - Raw data received: ${rawData.length} rows`);
        console.log(`   - Expected total from Excel: 7561 rows`);
        console.log(`   - Difference: ${7561 - rawData.length} rows (filtered during Excel processing)`);
        
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) {
                emptyRowCount++;
                continue;
            }
            
            try {
                // 查找关键字段 - 匹配实际的Excel列头
                const category = findFieldValue(row, ['category_cn', 'category', '类别', '产品类别', 'Category', '分类']);
                const widthMin = findFieldValue(row, ['w_min_cm', 'widthMin', '最小宽度', 'Width Min', 'width_min', '宽度最小值']);
                const widthMax = findFieldValue(row, ['w_max_cm', 'widthMax', '最大宽度', 'Width Max', 'width_max', '宽度最大值']);
                const heightMin = findFieldValue(row, ['h_min_cm', 'heightMin', '最小高度', 'Height Min', 'height_min', '高度最小值']);
                const heightMax = findFieldValue(row, ['h_max_cm', 'heightMax', '最大高度', 'Height Max', 'height_max', '高度最大值']);
                const price = findFieldValue(row, ['unit_price', 'price', '价格', 'Price', '单价', '价钱']);
                const system = findFieldValue(row, ['system_cn', 'system', '系统', '产品系统', 'System']);
                const code1 = findFieldValue(row, ['product_code1', 'code1', '代码1', '编码1', 'Code1']);
                const code2 = findFieldValue(row, ['product_code2', 'code2', '代码2', '编码2', 'Code2']);
                
                // 调试信息 - 显示前几行的详细数据
                if (i < 5) {
                    console.log(`Row ${i + 1} data:`, {
                        category, widthMin, widthMax, heightMin, heightMax, price, system, code1, code2
                    });
                    console.log(`Row ${i + 1} field lookup results:`, {
                        category: category !== null ? `"${category}"` : 'NULL',
                        widthMin: widthMin !== null ? `"${widthMin}"` : 'NULL',
                        widthMax: widthMax !== null ? `"${widthMax}"` : 'NULL',
                        heightMin: heightMin !== null ? `"${heightMin}"` : 'NULL',
                        heightMax: heightMax !== null ? `"${heightMax}"` : 'NULL',
                        price: price !== null ? `"${price}"` : 'NULL'
                    });
                }
                
                // 验证必需字段（只验证真正必需的：类别、尺寸、价格）
                if (!category || widthMin === null || widthMax === null || 
                    heightMin === null || heightMax === null || price === null) {
                    if (i < 10) { // 只显示前10行的详细错误
                        console.warn(`Row ${i + 1}: Missing required fields`, {
                            category, widthMin, widthMax, heightMin, heightMax, price
                        });
                    }
                    missingFieldsCount++;
                    invalidCount++;
                    continue;
                }
                
                // 转换数值并验证
                const widthMinNum = parseFloat(widthMin);
                const widthMaxNum = parseFloat(widthMax);
                const heightMinNum = parseFloat(heightMin);
                const heightMaxNum = parseFloat(heightMax);
                const priceNum = parseFloat(price);
                
                // 验证数值有效性（放宽条件，允许0价格但必须是数字）
                if (isNaN(widthMinNum) || isNaN(widthMaxNum) || isNaN(heightMinNum) || 
                    isNaN(heightMaxNum) || isNaN(priceNum)) {
                    if (i < 10) {
                        console.warn(`Row ${i + 1}: Invalid numeric values`, {
                            widthMin: widthMinNum, widthMax: widthMaxNum, 
                            heightMin: heightMinNum, heightMax: heightMaxNum, price: priceNum
                        });
                    }
                    invalidNumericCount++;
                    invalidCount++;
                    continue;
                }
                
                // 验证尺寸逻辑（放宽条件，允许相等）
                if (widthMinNum > widthMaxNum || heightMinNum > heightMaxNum) {
                    if (i < 10) {
                        console.warn(`Row ${i + 1}: Invalid dimension ranges`, {
                            widthMin: widthMinNum, widthMax: widthMaxNum, 
                            heightMin: heightMinNum, heightMax: heightMaxNum
                        });
                    }
                    invalidDimensionCount++;
                    invalidCount++;
                    continue;
                }
                
                // 创建处理后的数据行 - 匹配数据库表结构
                const processedRow = {
                    category: (category || '').toString().trim(),
                    width_min: widthMinNum,
                    width_max: widthMaxNum,
                    height_min: heightMinNum,
                    height_max: heightMaxNum,
                    price: priceNum,
                    system: (system || '').toString().trim(),
                    code1: (code1 || '').toString().trim(),
                    code2: (code2 || '').toString().trim()
                };
                
                processedData.push(processedRow);
                validCount++;
                
            } catch (rowError) {
                // 显示所有处理错误的行，帮助调试
                console.error(`Row ${i + 1}: Processing error:`, rowError);
                console.error(`Row ${i + 1}: Raw data:`, row);
                console.error(`Row ${i + 1}: Field values:`, {
                    category: category,
                    widthMin: widthMin,
                    widthMax: widthMax,
                    heightMin: heightMin,
                    heightMax: heightMax,
                    price: price,
                    system: system,
                    code1: code1,
                    code2: code2
                });
                processingErrorCount++;
                invalidCount++;
            }
        }
        
        console.log(`Data processing completed:`, {
            total: rawData.length,
            valid: validCount,
            invalid: invalidCount
        });
        
        // 添加详细的统计信息
        if (invalidCount > 0) {
            console.log(`📊 Data validation summary:`);
            console.log(`   - Total rows: ${rawData.length}`);
            console.log(`   - Valid rows: ${validCount}`);
            console.log(`   - Invalid rows: ${invalidCount}`);
            console.log(`   - Success rate: ${((validCount / rawData.length) * 100).toFixed(2)}%`);
            console.log(`   - Check console warnings above for details on invalid rows`);
            
            // 详细的无效数据分类统计
            console.log(`🔍 Invalid data breakdown:`);
            console.log(`   - Empty rows: ${emptyRowCount}`);
            console.log(`   - Missing required fields: ${missingFieldsCount}`);
            console.log(`   - Invalid numeric values: ${invalidNumericCount}`);
            console.log(`   - Invalid dimension ranges: ${invalidDimensionCount}`);
            console.log(`   - Processing errors: ${processingErrorCount}`);
            
            // 显示前几个无效行的示例
            if (missingFieldsCount > 0 || invalidNumericCount > 0 || invalidDimensionCount > 0 || processingErrorCount > 0) {
                console.log(`💡 Tips: Check the console errors above for specific examples of invalid rows`);
            }
        }
        
        return {
            data: processedData,
            stats: {
                total: rawData.length,
                valid: validCount,
                invalid: invalidCount
            }
        };
        
    } catch (error) {
        console.error('Error validating and converting price data:', error);
        throw error;
    }
}

function findFieldValue(obj, possibleKeys) {
    for (const key of possibleKeys) {
        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
            return obj[key];
        }
    }
    return null;
}

// 数据库管理函数
function clearDatabase() {
    if (confirm('Are you sure you want to clear all data from the database? This action cannot be undone.')) {
        try {
            if (db) {
                db.run('DELETE FROM price_table');
                console.log('Database cleared successfully');
                alert('Database cleared successfully!');
                refreshDatabaseStatus();
            } else {
                alert('Database not initialized');
            }
        } catch (error) {
            console.error('Error clearing database:', error);
            alert('Error clearing database: ' + error.message);
        }
    }
}

function refreshDatabaseStatus() {
    try {
        if (!db) {
            document.getElementById('dbStatusType').textContent = 'Not Initialized';
            document.getElementById('dbRecordCount').textContent = '0';
            document.getElementById('dbCategoryCount').textContent = '0';
            document.getElementById('dbLastSync').textContent = 'Never';
            return;
        }
        
        // 获取数据库状态
        const stats = getPriceStatisticsFromDatabase();
        const categories = getAllCategoriesFromDatabase();
        
        document.getElementById('dbStatusType').textContent = 'SQLite (Local)';
        document.getElementById('dbRecordCount').textContent = stats ? stats.total_entries : '0';
        document.getElementById('dbCategoryCount').textContent = categories.length;
        document.getElementById('dbLastSync').textContent = dataSourceConfig.lastSync || 'Never';
        
    } catch (error) {
        console.error('Error refreshing database status:', error);
        document.getElementById('dbStatusType').textContent = 'Error';
    }
}

// 重新创建数据库表（用于修复表结构）
function recreateDatabaseTables() {
    if (confirm('This will delete all data and recreate the database tables. Are you sure?')) {
        try {
            if (db) {
                // 删除现有表
                db.run('DROP TABLE IF EXISTS price_table');
                db.run('DROP TABLE IF EXISTS data_sources');
                
                // 重新创建表
                createDatabaseTables();
                
                console.log('Database tables recreated successfully');
                alert('Database tables recreated successfully!');
                refreshDatabaseStatus();
            } else {
                alert('Database not initialized');
            }
        } catch (error) {
            console.error('Error recreating database tables:', error);
            alert('Error recreating database tables: ' + error.message);
        }
    }
}

// 显示推广设计页面
function showPromotionDesign() {
    try {
        // 隐藏其他页面
        hideAllPages();
        
        // 显示推广设计页面
        const promotionPage = document.getElementById('promotions');
        if (promotionPage) {
            promotionPage.style.display = 'block';
        }
        
        // 动态加载产品选项
        loadPromotionProductOptions();
        
    } catch (error) {
        console.error('Error showing promotion design:', error);
    }
}

// 从数据库加载推广设计的产品选项
async function loadPromotionProductOptions() {
    try {
        if (!db) {
            console.warn('Database not initialized, using default options');
            return;
        }
        
        // 加载产品类别
        const categories = getAllCategoriesFromDatabase();
        if (categories && categories.length > 0) {
            const categorySelect = document.getElementById('promotionCategory');
            if (categorySelect) {
                categorySelect.innerHTML = '<option value="">选择产品类别</option>';
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                });
            }
        }
        
        // 加载产品系统
        const systems = getUniqueSystemsFromDatabase();
        if (systems && systems.length > 0) {
            const systemSelect = document.getElementById('promotionSystem');
            if (systemSelect) {
                systemSelect.innerHTML = '<option value="">选择产品系统</option>';
                systems.forEach(system => {
                    if (system && system.trim()) {
                        const option = document.createElement('option');
                        option.value = system;
                        option.textContent = system;
                        systemSelect.appendChild(option);
                    }
                });
            }
        }
        
        // 加载产品代码1
        const codes1 = getUniqueCodes1FromDatabase();
        if (codes1 && codes1.length > 0) {
            const code1Input = document.getElementById('promotionCode');
            if (code1Input) {
                // 创建数据列表用于自动完成
                const datalist = document.createElement('datalist');
                datalist.id = 'productCodes';
                codes1.forEach(code => {
                    if (code && code.trim()) {
                        const option = document.createElement('option');
                        option.value = code;
                        datalist.appendChild(option);
                    }
                });
                
                // 如果数据列表不存在，则添加
                if (!document.getElementById('productCodes')) {
                    document.body.appendChild(datalist);
                }
                
                code1Input.setAttribute('list', 'productCodes');
                code1Input.placeholder = '输入或选择产品代码';
            }
        }
        
        console.log('Promotion product options loaded from database');
        
    } catch (error) {
        console.error('Error loading promotion product options:', error);
    }
}

// 从数据库获取唯一的产品系统
function getUniqueSystemsFromDatabase() {
    try {
        if (!db) return [];
        
        const result = db.exec('SELECT DISTINCT system FROM price_table WHERE system IS NOT NULL AND system != "" ORDER BY system');
        if (result && result[0] && result[0].values) {
            return result[0].values.map(row => row[0]);
        }
        return [];
    } catch (error) {
        console.error('Error getting systems from database:', error);
        return [];
    }
}

// 从数据库获取唯一的产品代码1
function getUniqueCodes1FromDatabase() {
    try {
        if (!db) return [];
        
        const result = db.exec('SELECT DISTINCT code1 FROM price_table WHERE code1 IS NOT NULL AND code1 != "" ORDER BY code1');
        if (result && result[0] && result[0].values) {
            return result[0].values.map(row => row[0]);
        }
        return [];
    } catch (error) {
        console.error('Error getting codes1 from database:', error);
        return [];
    }

}

// 从数据库获取唯一的产品代码2
function getUniqueCodes2FromDatabase() {
    try {
        if (!db) return [];
        
        const result = db.exec('SELECT DISTINCT code2 FROM price_table WHERE code2 IS NOT NULL AND code2 != "" ORDER BY code2');
        if (result && result[0] && result[0].values) {
            return result[0].values.map(row => row[0]);
        }
        return [];
    } catch (error) {
        console.error('Error getting codes2 from database:', error);
        return [];
    }
}

// ==================== 数据备份功能 ====================

// 创建完整的数据备份
async function createFullBackup() {
    try {
        console.log('Creating full backup...');
        
        const backupData = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            database: null,
            configuration: {},
            metadata: {}
        };
        
        // 备份数据库数据
        if (db) {
            try {
                // 导出所有价格数据
                const priceData = await exportAllPriceData();
                backupData.database = {
                    priceTable: priceData,
                    categories: getAllCategoriesFromDatabase(),
                    systems: getAllSystemsFromDatabase(),
                    statistics: getPriceStatisticsFromDatabase()
                };
                console.log('Database data backed up successfully');
            } catch (error) {
                console.error('Error backing up database:', error);
                backupData.database = { error: error.message };
            }
        }
        
        // 备份配置信息
        backupData.configuration = {
            dbConfig: JSON.parse(localStorage.getItem('dbConfig') || '{}'),
            dataSourceConfig: JSON.parse(localStorage.getItem('dataSourceConfig') || '{}'),
            systemSettings: JSON.parse(localStorage.getItem('systemSettings') || '{}')
        };
        
        // 备份其他重要数据
        backupData.metadata = {
            users: JSON.parse(localStorage.getItem('users') || '[]'),
            quotations: JSON.parse(localStorage.getItem('quotations') || '[]'),
            customers: JSON.parse(localStorage.getItem('customers') || '[]'),
            products: JSON.parse(localStorage.getItem('products') || '[]')
        };
        
        // 生成备份文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `price-system-backup-${timestamp}.json`;
        
        // 下载备份文件
        downloadBackupFile(backupData, filename);
        
        console.log('Full backup completed successfully');
        return true;
        
    } catch (error) {
        console.error('Error creating full backup:', error);
        alert('创建备份失败: ' + error.message);
        return false;
    }
}

// 导出所有价格数据
async function exportAllPriceData() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    
    try {
        const result = db.exec('SELECT * FROM price_table');
        if (result && result.length > 0 && result[0].values) {
            const columns = result[0].columns;
            const values = result[0].values;
            
            return values.map(row => {
                const obj = {};
                columns.forEach((col, index) => {
                    obj[col] = row[index];
                });
                return obj;
            });
        }
        return [];
    } catch (error) {
        console.error('Error exporting price data:', error);
        return [];
    }
}

// 下载备份文件
function downloadBackupFile(data, filename) {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        alert(`备份文件已下载: ${filename}`);
    } catch (error) {
        console.error('Error downloading backup file:', error);
        alert('下载备份文件失败: ' + error.message);
    }
}

// 从备份文件恢复数据
async function restoreFromBackup(file) {
    try {
        console.log('Restoring from backup file:', file.name);
        
        if (!confirm('恢复备份将覆盖当前所有数据！确定要继续吗？')) {
            return false;
        }
        
        const text = await file.text();
        const backupData = JSON.parse(text);
        
        // 验证备份文件格式
        if (!backupData.timestamp || !backupData.version) {
            throw new Error('无效的备份文件格式');
        }
        
        console.log('Backup file info:', {
            timestamp: backupData.timestamp,
            version: backupData.version
        });
        
        // 恢复数据库数据
        if (backupData.database && backupData.database.priceTable) {
            await restoreDatabaseData(backupData.database);
        }
        
        // 恢复配置信息
        if (backupData.configuration) {
            restoreConfiguration(backupData.configuration);
        }
        
        // 恢复其他数据
        if (backupData.metadata) {
            restoreMetadata(backupData.metadata);
        }
        
        alert('数据恢复成功！页面将重新加载以应用更改。');
        setTimeout(() => {
            location.reload();
        }, 1000);
        
        return true;
        
    } catch (error) {
        console.error('Error restoring from backup:', error);
        alert('恢复备份失败: ' + error.message);
        return false;
    }
}

// 恢复数据库数据
async function restoreDatabaseData(databaseData) {
    if (!db) {
        throw new Error('Database not initialized');
    }
    
    try {
        // 清空现有数据
        db.run('DELETE FROM price_table');
        
        // 恢复价格数据
        if (databaseData.priceTable && databaseData.priceTable.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO price_table (
                    category, system, width, height, width_unit, height_unit, 
                    price, currency, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            for (const item of databaseData.priceTable) {
                stmt.run([
                    item.category || '',
                    item.system || '',
                    item.width || 0,
                    item.height || 0,
                    item.width_unit || 'cm',
                    item.height_unit || 'cm',
                    item.price || 0,
                    item.currency || 'USD',
                    item.notes || '',
                    item.created_at || new Date().toISOString(),
                    item.updated_at || new Date().toISOString()
                ]);
            }
            
            stmt.free();
            console.log(`Restored ${databaseData.priceTable.length} price entries`);
        }
        
    } catch (error) {
        console.error('Error restoring database data:', error);
        throw error;
    }
}

// 恢复配置信息
function restoreConfiguration(config) {
    try {
        if (config.dbConfig) {
            localStorage.setItem('dbConfig', JSON.stringify(config.dbConfig));
        }
        if (config.dataSourceConfig) {
            localStorage.setItem('dataSourceConfig', JSON.stringify(config.dataSourceConfig));
        }
        if (config.systemSettings) {
            localStorage.setItem('systemSettings', JSON.stringify(config.systemSettings));
        }
        console.log('Configuration restored successfully');
    } catch (error) {
        console.error('Error restoring configuration:', error);
    }
}

// 恢复元数据
function restoreMetadata(metadata) {
    try {
        if (metadata.users) {
            localStorage.setItem('users', JSON.stringify(metadata.users));
        }
        if (metadata.quotations) {
            localStorage.setItem('quotations', JSON.stringify(metadata.quotations));
        }
        if (metadata.customers) {
            localStorage.setItem('customers', JSON.stringify(metadata.customers));
        }
        if (metadata.products) {
            localStorage.setItem('products', JSON.stringify(metadata.products));
        }
        console.log('Metadata restored successfully');
    } catch (error) {
        console.error('Error restoring metadata:', error);
    }
}

// 自动备份功能
function setupAutoBackup() {
    try {
        // 检查是否已设置自动备份
        const autoBackupConfig = localStorage.getItem('autoBackupConfig');
        if (autoBackupConfig) {
            const config = JSON.parse(autoBackupConfig);
            if (config.enabled) {
                scheduleNextBackup(config.interval);
                console.log('Auto backup scheduled:', config);
            }
        }
    } catch (error) {
        console.error('Error setting up auto backup:', error);
    }
}

// 配置自动备份
function configureAutoBackup() {
    try {
        const interval = prompt('请输入自动备份间隔（小时）:', '24');
        if (interval && !isNaN(interval)) {
            const config = {
                enabled: true,
                interval: parseInt(interval),
                lastBackup: null,
                nextBackup: null
            };
            
            localStorage.setItem('autoBackupConfig', JSON.stringify(config));
            scheduleNextBackup(config.interval);
            
            alert(`自动备份已配置：每${interval}小时备份一次`);
        }
    } catch (error) {
        console.error('Error configuring auto backup:', error);
        alert('配置自动备份失败: ' + error.message);
    }
}

// 安排下次备份
function scheduleNextBackup(intervalHours) {
    try {
        const now = new Date();
        const nextBackup = new Date(now.getTime() + (intervalHours * 60 * 60 * 1000));
        
        const config = JSON.parse(localStorage.getItem('autoBackupConfig') || '{}');
        config.nextBackup = nextBackup.toISOString();
        localStorage.setItem('autoBackupConfig', JSON.stringify(config));
        
        // 设置定时器
        const timeUntilNext = nextBackup.getTime() - now.getTime();
        setTimeout(() => {
            performAutoBackup();
        }, timeUntilNext);
        
        console.log(`Next auto backup scheduled for: ${nextBackup.toISOString()}`);
    } catch (error) {
        console.error('Error scheduling next backup:', error);
    }
}

// 执行自动备份
async function performAutoBackup() {
    try {
        console.log('Performing automatic backup...');
        
        const success = await createFullBackup();
        if (success) {
            // 更新备份配置
            const config = JSON.parse(localStorage.getItem('autoBackupConfig') || '{}');
            config.lastBackup = new Date().toISOString();
            localStorage.setItem('autoBackupConfig', JSON.stringify(config));
            
            // 安排下次备份
            scheduleNextBackup(config.interval);
            
            console.log('Automatic backup completed successfully');
        }
    } catch (error) {
        console.error('Error performing automatic backup:', error);
    }
}

// 显示备份管理界面
function showBackupManagement() {
    try {
        // 隐藏其他页面
        hideAllPages();
        
        // 显示备份管理页面
        const backupPage = document.getElementById('backupManagement');
        if (backupPage) {
            backupPage.style.display = 'block';
        }
        
        // 更新备份状态显示
        updateBackupStatus();
        
    } catch (error) {
        console.error('Error showing backup management:', error);
    }
}

// 更新备份状态显示
function updateBackupStatus() {
    try {
        const autoBackupConfig = JSON.parse(localStorage.getItem('autoBackupConfig') || '{}');
        
        if (autoBackupConfig.enabled) {
            document.getElementById('autoBackupStatus').textContent = '已启用';
            document.getElementById('autoBackupInterval').textContent = `每${autoBackupConfig.interval}小时`;
            document.getElementById('lastBackupTime').textContent = autoBackupConfig.lastBackup || '从未';
            document.getElementById('nextBackupTime').textContent = autoBackupConfig.nextBackup || '未设置';
        } else {
            document.getElementById('autoBackupStatus').textContent = '已禁用';
            document.getElementById('autoBackupInterval').textContent = '未设置';
            document.getElementById('lastBackupTime').textContent = '从未';
            document.getElementById('nextBackupTime').textContent = '未设置';
        }
        
    } catch (error) {
        console.error('Error updating backup status:', error);
    }
}

// 禁用自动备份
function disableAutoBackup() {
    try {
        const config = JSON.parse(localStorage.getItem('autoBackupConfig') || '{}');
        config.enabled = false;
        localStorage.setItem('autoBackupConfig', JSON.stringify(config));
        
        alert('自动备份已禁用');
        updateBackupStatus();
        
    } catch (error) {
        console.error('Error disabling auto backup:', error);
        alert('禁用自动备份失败: ' + error.message);
    }
}

// 处理恢复文件选择
function handleRestoreFile(fileInput) {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        restoreFromBackup(file);
        // 清空文件输入，允许重复选择同一文件
        fileInput.value = '';
    }
}

// 在页面加载时初始化自动备份
document.addEventListener('DOMContentLoaded', function() {
    // 延迟设置自动备份，确保其他功能已初始化
    setTimeout(setupAutoBackup, 3000);
});

// 保存数据库到IndexedDB
async function saveDatabaseToIndexedDB() {
    try {
        if (!db) {
            console.warn('Database not initialized, cannot save');
            return;
        }
        
        // 导出数据库
        const databaseData = db.export();
        
        // 压缩数据库数据（使用简单的压缩策略）
        const compressedData = compressDatabaseData(databaseData);
        
        console.log(`Database size: ${databaseData.length} bytes, Compressed: ${compressedData.length} bytes`);
        
        // 使用IndexedDB保存
        const dbName = 'PromoteAppDB';
        const storeName = 'sqliteDatabase';
        const version = 1;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, version);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                const saveRequest = store.put(compressedData, 'main');
                
                saveRequest.onsuccess = () => {
                    console.log('Database saved to IndexedDB successfully');
                    resolve();
                };
                
                saveRequest.onerror = () => {
                    console.error('Failed to save database to IndexedDB:', saveRequest.error);
                    reject(saveRequest.error);
                };
                
                transaction.oncomplete = () => {
                    db.close();
                };
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
        });
        
    } catch (error) {
        console.error('Error saving database to IndexedDB:', error);
        throw error;
    }
}

// 压缩数据库数据 - 暂时禁用压缩以避免数据损坏
function compressDatabaseData(data) {
    try {
        // 暂时返回原始数据，避免压缩算法导致的数据损坏
        // TODO: 实现更安全的压缩算法
        console.log('Database compression temporarily disabled for data safety');
        return data;
        
    } catch (error) {
        console.error('Error compressing database data:', error);
        return data; // 如果压缩失败，返回原始数据
    }
}

// 解压缩数据库数据 - 暂时禁用解压缩以避免数据损坏
function decompressDatabaseData(compressedData) {
    try {
        // 由于压缩已禁用，直接返回原始数据
        console.log('Database decompression disabled - returning raw data');
        return compressedData;
        
    } catch (error) {
        console.error('Error decompressing database data:', error);
        return compressedData; // 如果解压缩失败，返回原始数据
    }
}

// 从IndexedDB加载数据库
async function loadDatabaseFromIndexedDB() {
    try {
        const dbName = 'PromoteAppDB';
        const storeName = 'sqliteDatabase';
        const version = 1;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, version);
            
            request.onerror = () => {
                console.log('IndexedDB not available, creating new database');
                resolve(null);
            };
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                const loadRequest = store.get('main');
                
                loadRequest.onsuccess = () => {
                    if (loadRequest.result) {
                        console.log('Database loaded from IndexedDB successfully');
                        // 解压缩数据
                        const decompressedData = decompressDatabaseData(loadRequest.result);
                        resolve(decompressedData);
                    } else {
                        console.log('No saved database found in IndexedDB');
                        resolve(null);
                    }
                };
                
                loadRequest.onerror = () => {
                    console.error('Failed to load database from IndexedDB:', loadRequest.error);
                    resolve(null);
                };
                
                transaction.oncomplete = () => {
                    db.close();
                };
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
        });
        
    } catch (error) {
        console.error('Error loading database from IndexedDB:', error);
        return null;
    }
}
