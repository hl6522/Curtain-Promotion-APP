const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // 服务前端文件

// 文件上传配置
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype.includes('spreadsheet') || 
            file.mimetype.includes('excel') || 
            file.originalname.endsWith('.xlsx') ||
            file.originalname.endsWith('.xls')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传Excel文件'));
        }
    }
});

// 数据库连接
const db = new sqlite3.Database('./promote_app.db', (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('成功连接到SQLite数据库');
        createTables();
    }
});

// 创建数据库表
function createTables() {
    const sql = `
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('创建表失败:', err.message);
        } else {
            console.log('数据库表创建成功或已存在');
        }
    });
}

// API路由

// 1. 导入Excel数据
app.post('/api/import-excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetNames = workbook.SheetNames;
        let totalImported = 0;
        let errors = [];

        // 开始事务
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            sheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                // 跳过标题行
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (row.length >= 9) {
                        const [category, system, code1, code2, widthMin, widthMax, heightMin, heightMax, price] = row;
                        
                        if (category && widthMin && widthMax && heightMin && heightMax && price) {
                            const sql = `
                                INSERT INTO price_table 
                                (category, system, code1, code2, width_min, width_max, height_min, height_max, price)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `;
                            
                            db.run(sql, [
                                category.toString(),
                                system ? system.toString() : null,
                                code1 ? code1.toString() : null,
                                code2 ? code2.toString() : null,
                                parseFloat(widthMin),
                                parseFloat(widthMax),
                                parseFloat(heightMin),
                                parseFloat(heightMax),
                                parseFloat(price)
                            ], function(err) {
                                if (err) {
                                    errors.push(`行 ${i+1}: ${err.message}`);
                                } else {
                                    totalImported++;
                                }
                            });
                        }
                    }
                }
            });

            // 提交事务
            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('提交事务失败:', err);
                    res.status(500).json({ error: '导入失败', details: err.message });
                } else {
                    res.json({ 
                        success: true, 
                        message: `成功导入 ${totalImported} 条记录`,
                        totalImported,
                        errors: errors.length > 0 ? errors : null
                    });
                }
            });
        });

    } catch (error) {
        console.error('导入Excel失败:', error);
        res.status(500).json({ error: '导入失败', details: error.message });
    }
});

// 2. 价格查询接口
app.get('/api/query-price', (req, res) => {
    const { category, system, code1, width, height, unit = 'cm' } = req.query;
    
    if (!category || !width || !height) {
        return res.status(400).json({ error: '缺少必要参数' });
    }

    // 单位转换
    let queryWidth = parseFloat(width);
    let queryHeight = parseFloat(height);
    
    if (unit === 'inch') {
        queryWidth = queryWidth * 2.54; // 英寸转厘米
        queryHeight = queryHeight * 2.54;
    }

    const sql = `
        SELECT * FROM price_table 
        WHERE category = ? 
        AND (? IS NULL OR system = ?)
        AND (? IS NULL OR code1 = ?)
        AND width_min <= ? AND width_max >= ?
        AND height_min <= ? AND height_max >= ?
        ORDER BY price ASC
        LIMIT 1
    `;

    db.get(sql, [category, system, system, code1, code1, queryWidth, queryWidth, queryHeight, queryHeight], (err, row) => {
        if (err) {
            console.error('查询失败:', err);
            res.status(500).json({ error: '查询失败', details: err.message });
        } else if (row) {
            // 转换回请求的单位
            let resultWidth = row.width_min;
            let resultHeight = row.height_min;
            
            if (unit === 'inch') {
                resultWidth = (resultWidth / 2.54).toFixed(2);
                resultHeight = (resultHeight / 2.54).toFixed(2);
            } else {
                resultWidth = resultWidth.toFixed(2);
                resultHeight = resultHeight.toFixed(2);
            }

            res.json({
                success: true,
                data: {
                    ...row,
                    price: parseFloat(row.price).toFixed(2),
                    width_min: resultWidth,
                    width_max: unit === 'inch' ? (row.width_max / 2.54).toFixed(2) : row.width_max.toFixed(2),
                    height_min: resultHeight,
                    height_max: unit === 'inch' ? (row.height_max / 2.54).toFixed(2) : row.height_max.toFixed(2)
                }
            });
        } else {
            res.json({ 
                success: false, 
                message: '未找到匹配的价格信息',
                query: { category, system, code1, width: queryWidth, height: queryHeight, unit }
            });
        }
    });
});

// 3. 获取所有类别
app.get('/api/categories', (req, res) => {
    const sql = 'SELECT DISTINCT category FROM price_table ORDER BY category';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: '获取类别失败', details: err.message });
        } else {
            res.json({ success: true, data: rows.map(row => row.category) });
        }
    });
});

// 4. 获取指定类别的系统
app.get('/api/systems/:category', (req, res) => {
    const { category } = req.params;
    const sql = 'SELECT DISTINCT system FROM price_table WHERE category = ? AND system IS NOT NULL ORDER BY system';
    
    db.all(sql, [category], (err, rows) => {
        if (err) {
            res.status(500).json({ error: '获取系统失败', details: err.message });
        } else {
            res.json({ success: true, data: rows.map(row => row.system) });
        }
    });
});

// 5. 获取指定类别和系统的代码
app.get('/api/codes/:category/:system', (req, res) => {
    const { category, system } = req.params;
    const sql = 'SELECT DISTINCT code1, code2 FROM price_table WHERE category = ? AND system = ? ORDER BY code1';
    
    db.all(sql, [category, system], (err, rows) => {
        if (err) {
            res.status(500).json({ error: '获取代码失败', details: err.message });
        } else {
            res.json({ success: true, data: rows });
        }
    });
});

// 6. 获取价格表统计
app.get('/api/price-table-stats', (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT category) as total_categories,
            COUNT(DISTINCT system) as total_systems,
            MIN(price) as min_price,
            MAX(price) as min_price
        FROM price_table
    `;
    
    db.get(sql, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: '获取统计失败', details: err.message });
        } else {
            res.json({ success: true, data: row });
        }
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 API文档: http://localhost:${PORT}/api`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    db.close((err) => {
        if (err) {
            console.error('关闭数据库失败:', err.message);
        } else {
            console.log('数据库连接已关闭');
        }
        process.exit(0);
    });
});
