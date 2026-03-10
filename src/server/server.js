// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Influencer = require('./Influencer');
const { ApifyClient } = require('apify-client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const neo4j = require('neo4j-driver');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./User');
const SearchHistory = require('./SearchHistory');

const JWT_SECRET = process.env.JWT_SECRET || 'tookjarit-secret-key-2024';

const app = express();
app.use(cors());
app.use(express.json());

// --- Setup Clients ---
const apifyClient = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// MongoDB Connection
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || "mongodb+srv://tookjaritdev:113333555555@tookjarit-cluster.ve5cpue.mongodb.net/tookjarit?appName=TookJaRit-Cluster";
        await mongoose.connect(uri);
        console.log('✅ MongoDB Connected!');
    } catch (err) {
        console.error('❌ MongoDB Failed:', err.message);
        process.exit(1);
    }
};
connectDB();

// --- Helper ---
const getDisplayBrand = (brand, productType) => {
    if (!brand || ['Unknown', 'No Brand', 'No Brand Name'].includes(brand)) {
        return productType || "General Product";
    }
    return brand;
};

// ─────────────────────────────────────────
// API: Search TikTok
// ─────────────────────────────────────────
app.post('/api/search-tiktok', async (req, res) => {
    const { keyword, limit = 10 } = req.body;
    if (!keyword) return res.status(400).json({ error: "Keyword is required" });
    console.log(`🔎 TikTok Search: ${keyword}`);
    try {
        let input;
        if (keyword.startsWith('@')) {
            input = { profiles: [keyword.replace('@', '')], resultsPerPage: limit, shouldDownloadCovers: false, shouldDownloadSlideshowImages: false, searchSection: "" };
        } else {
            input = { hashtags: [keyword.replace('#', '')], resultsPerPage: limit, shouldDownloadCovers: false, shouldDownloadSlideshowImages: false, searchSection: "" };
        }
        const run = await apifyClient.actor("clockworks/free-tiktok-scraper").call(input);
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        if (!items || items.length === 0) return res.status(404).json({ message: "ไม่พบข้อมูลจาก TikTok" });

        const dataForAI = items.map(item => ({ id: item.id, text: item.text, author_name: item.authorMeta?.name || "Unknown" }));
        const prompt = `Analyze TikTok captions. Input: ${JSON.stringify(dataForAI)}
        Tasks:
        1. brand: Extract Brand Name (if specific brand is not found, use "No Brand").
        2. product_type: Identify the specific object (e.g., "Art Toy", "Serum", "Baby Stroller") and **Translate to Thai**.
        3. main_category: Choose ONE best category from this list based on these definitions: 
           - Fashion (Clothing, Vintage, Oversize, Streetwear, Watches, Jewelry)
           - Beauty & Personal Care (Skincare, Makeup, Perfume, Shampoo, Soap, Toothpaste)
           - Health & Wellness (Supplements, Vitamins, Fitness Equipment, Medicine)
           - Food & Beverage (Snacks, Coffee, Tea, Dried Food, Fresh Fruit, Clean Food)
           - Mom & Kids (Baby Products, Baby Toys, Maternity items)
           - IT & Gadgets (Phone Accessories, Bluetooth Headphones, Chargers, Smart Home)
           - Home & Living (Furniture, Minimalist Decor, Kitchenware, Air Fryer, Eco-friendly items)
           - Toys & Collectibles (Art Toy, Blind Box, Figures, Board Games)
           - Pet (Pet Food, Pet Toys, Pet Care)
           - Automotive (Car Accessories, Care products)
           - Lifestyle (DIY, Handmade, Travel, Vlog, Daily Life, Random stuff)
        Output: JSON Array ONLY. No markdown. Preserve "id".
        Structure: [{ "id": "...", "brand": "...", "product_type": "...", "main_category": "..." }]`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const aiAnalysis = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

        const processedData = items.map(item => {
            const analysis = aiAnalysis.find(a => a.id === item.id) || {};
            return {
                videoId: item.id, authorName: item.authorMeta?.name || "Unknown",
                authorAvatar: item.authorMeta?.avatar || "", followers: item.authorMeta?.fans || 0,
                profileLikes: item.authorMeta?.heart || 0,
                platform: 'tiktok', caption: item.text || "", videoUrl: item.webVideoUrl || "",
                totalViews: item.playCount || 0, totalLikes: item.diggCount || 0,
                totalComments: item.commentCount || 0, totalShares: item.shareCount || 0,
                brand: analysis.brand || "Unknown", productType: analysis.product_type || "Unknown",
                category: analysis.main_category || "Lifestyle"
            };
        });

        try { await Influencer.insertMany(processedData, { ordered: false }); } catch (e) { if (e.code !== 11000) console.error(e); }

        // ✅ FIX 1: search-tiktok — เพิ่ม totalComments + totalShares ใน Neo4j MERGE
        const session = driver.session();
        try {
            await session.run(`
                UNWIND $batch AS row
                MERGE (i:Influencer {name: row.authorName})
                ON CREATE SET i.followers = row.followers, i.authorAvatar = row.authorAvatar, i.platform = row.platform, i.profileLikes = row.profileLikes
                ON MATCH SET  i.followers = row.followers, i.authorAvatar = row.authorAvatar, i.platform = row.platform, i.profileLikes = row.profileLikes
                MERGE (b:Brand {name: row.finalBrand})
                ON CREATE SET b.category = row.category
                ON MATCH SET  b.category = row.category
                MERGE (i)-[r:POSTED_ABOUT]->(b)
                ON CREATE SET r.weight = 1,
                              r.totalViews    = row.totalViews,
                              r.totalLikes    = row.totalLikes,
                              r.totalComments = row.totalComments,
                              r.totalShares   = row.totalShares
                ON MATCH SET  r.weight        = r.weight + 1,
                              r.totalViews    = COALESCE(r.totalViews,0)    + row.totalViews,
                              r.totalLikes    = COALESCE(r.totalLikes,0)    + row.totalLikes,
                              r.totalComments = COALESCE(r.totalComments,0) + row.totalComments,
                              r.totalShares   = COALESCE(r.totalShares,0)   + row.totalShares
            `, { batch: processedData.map(d => ({ ...d, finalBrand: getDisplayBrand(d.brand, d.productType) })) });
        } finally { await session.close(); }

        await SearchHistory.findOneAndUpdate(
            { keyword, platform: 'tiktok' },
            { lastSearched: new Date() },
            { upsert: true, new: true }
        );

        res.json({ message: `บันทึก ${processedData.length} รายการเรียบร้อย` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// API: Last Updated
// ─────────────────────────────────────────
app.get('/api/last-updated', async (req, res) => {
    const platform = req.query.platform || 'tiktok';
    try {
        const fromHistory = await SearchHistory
            .findOne({ platform })
            .sort({ lastSearched: -1 })
            .lean();
        if (fromHistory) return res.json({ lastUpdated: fromHistory.lastSearched });

        const fromInfluencer = await Influencer
            .findOne({ platform })
            .sort({ updatedAt: -1 })
            .select('updatedAt')
            .lean();
        res.json({ lastUpdated: fromInfluencer?.updatedAt || null });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────
// API: Suggestions (Autocomplete)
// ─────────────────────────────────────────
app.get('/api/suggestions', async (req, res) => {
    const { q = '', platform = 'tiktok' } = req.query;
    if (!q.trim()) return res.json([]);
    const regex = new RegExp(q.trim(), 'i');

    const CATEGORY_LIST = [
        'Fashion', 'Beauty & Personal Care', 'Health & Wellness', 'Food & Beverage',
        'Mom & Kids', 'IT & Gadgets', 'Home & Living', 'Toys & Collectibles',
        'Pet', 'Automotive', 'Lifestyle',
    ];

    try {
        const [influencers, brands] = await Promise.all([
            Influencer.distinct('authorName', { platform, authorName: regex }),
            Influencer.distinct('brand',      { platform, brand:      regex }),
        ]);

        const filteredBrands = brands.filter(b =>
            b && !CATEGORY_LIST.includes(b) && !['Unknown', 'No Brand', 'No Brand Name'].includes(b)
        );

        const results = [
            ...influencers    .slice(0, 5).map(v => ({ type: 'influencer', label: v, display: `@${v}` })),
            ...filteredBrands .slice(0, 5).map(v => ({ type: 'brand',      label: v, display: v })),
        ];
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// API: Graph Data ✅ เพิ่ม totalComments + totalShares + profileLikes
// ─────────────────────────────────────────
app.get('/api/graph-data', async (req, res) => {
    const platform = req.query.platform || 'tiktok';
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (i:Influencer)-[r:POSTED_ABOUT]->(b:Brand)
            WHERE i.platform = $platform
            RETURN i, r, b
            LIMIT 1000
        `, { platform });

        const nodes = [], links = [], seen = new Set();
        const influencerStats = {};

        result.records.forEach(rec => {
            const i = rec.get('i');
            const b = rec.get('b');
            const r = rec.get('r');

            const iId = i.elementId;

            // ✅ FIX 2: graph-data — ดึง totalComments + totalShares จาก Neo4j
            const rViews    = r.properties.totalViews?.low    ?? r.properties.totalViews    ?? 0;
            const rLikes    = r.properties.totalLikes?.low    ?? r.properties.totalLikes    ?? 0;
            const rComments = r.properties.totalComments?.low ?? r.properties.totalComments ?? 0;
            const rShares   = r.properties.totalShares?.low   ?? r.properties.totalShares   ?? 0;

            if (!influencerStats[iId]) influencerStats[iId] = { totalLikes: 0, totalViews: 0 };
            influencerStats[iId].totalLikes += rLikes;
            influencerStats[iId].totalViews += rViews;

            if (!seen.has(iId)) {
                nodes.push({
                    id: iId,
                    name: i.properties.name,
                    type: 'Influencer',
                    followers: i.properties.followers?.low || i.properties.followers || 0,
                    authorAvatar: i.properties.authorAvatar || '',
                    platform: i.properties.platform || platform,
                    profileLikes: i.properties.profileLikes?.low || i.properties.profileLikes || 0,
                });
                seen.add(iId);
            }
            if (!seen.has(b.elementId)) {
                nodes.push({
                    id: b.elementId,
                    name: b.properties.name,
                    type: 'Brand',
                    category: b.properties.category,
                });
                seen.add(b.elementId);
            }

            links.push({
                source:        iId,
                target:        b.elementId,
                weight:        r.properties.weight?.low ?? 1,
                totalViews:    rViews,
                totalLikes:    rLikes,
                totalComments: rComments,  // ✅
                totalShares:   rShares,    // ✅
            });
        });

        nodes.forEach(node => {
            if (node.type === 'Influencer' && influencerStats[node.id]) {
                node.totalLikes = influencerStats[node.id].totalLikes;
                node.totalViews = influencerStats[node.id].totalViews;
            }
        });

        res.json({ nodes, links });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        await session.close();
    }
});

// ─────────────────────────────────────────
// API: Sync MongoDB → Neo4j ✅ เพิ่ม totalComments + totalShares + profileLikes
// ─────────────────────────────────────────
app.get('/api/sync-mongo-to-neo4j', async (req, res) => {
    try {
        const influencers = await Influencer.find({});
        const session = driver.session();
        try {
            // ✅ FIX 3: sync-mongo-to-neo4j — เพิ่ม totalComments + totalShares
            await session.run(`
                UNWIND $batch AS row
                MERGE (i:Influencer {name: row.authorName})
                ON CREATE SET i.followers = row.followers, i.authorAvatar = row.authorAvatar,
                              i.platform = row.platform, i.profileLikes = row.profileLikes
                ON MATCH SET  i.followers = row.followers, i.authorAvatar = row.authorAvatar,
                              i.platform = row.platform, i.profileLikes = row.profileLikes
                MERGE (b:Brand {name: row.finalBrand})
                ON CREATE SET b.category = row.category
                ON MATCH SET  b.category = row.category
                MERGE (i)-[r:POSTED_ABOUT]->(b)
                SET r.totalViews    = row.totalViews,
                    r.totalLikes    = row.totalLikes,
                    r.totalComments = row.totalComments,
                    r.totalShares   = row.totalShares
            `, {
                batch: influencers.map(inf => ({
                    authorName:    inf.authorName,
                    authorAvatar:  inf.authorAvatar  || "",
                    followers:     inf.followers     || 0,
                    profileLikes:  inf.profileLikes  || 0,
                    platform:      inf.platform      || 'tiktok',
                    totalViews:    inf.totalViews    || 0,
                    totalLikes:    inf.totalLikes    || 0,
                    totalComments: inf.totalComments || 0,  // ✅
                    totalShares:   inf.totalShares   || 0,  // ✅
                    finalBrand:    getDisplayBrand(inf.brand, inf.productType),
                    category:      inf.category,
                }))
            });
            res.json({ status: "success", count: influencers.length });
        } finally { await session.close(); }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// Auth Middleware
// ─────────────────────────────────────────
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' }); }
};

// ─────────────────────────────────────────
// API: Auth
// ─────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
        if (await User.findOne({ email })) return res.status(400).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });
        const user = await User.create({ name, email, password });
        const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'ไม่พบอีเมลนี้ในระบบ' });
        if (!(await user.comparePassword(password))) return res.status(400).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─────────────────────────────────────────
// API: Favorites
// ─────────────────────────────────────────
app.post('/api/favorites/toggle', authMiddleware, async (req, res) => {
    try {
        const { influencerName, platform = 'tiktok' } = req.body;
        const user = await User.findById(req.user.id);
        const idx = user.favorites.findIndex(f => f.influencerName === influencerName);
        if (idx === -1) {
            user.favorites.push({ influencerName, platform });
            await user.save();
            res.json({ favorited: true, message: `เพิ่ม ${influencerName} แล้ว` });
        } else {
            user.favorites.splice(idx, 1);
            await user.save();
            res.json({ favorited: false, message: `ลบ ${influencerName} แล้ว` });
        }
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/favorites', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('favorites name');
        res.json({ favorites: user.favorites, name: user.name });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─────────────────────────────────────────
// API: Avatar
// ─────────────────────────────────────────
app.get('/api/avatar/:name', async (req, res) => {
    try {
        const inf = await Influencer.findOne({ authorName: req.params.name }).select('authorAvatar').lean();
        res.json({ avatar: inf?.authorAvatar || null });
    } catch (e) { res.status(500).json({ avatar: null }); }
});

// ─────────────────────────────────────────
// API: Export to Excel
// ─────────────────────────────────────────
app.get('/api/export-excel', async (req, res) => {
    const ExcelJS = require('exceljs');
    const { platform = 'tiktok', dataType = 'both', categories = '', keyword = '' } = req.query;

    try {
        const buildQuery = (platformFilter) => {
            const q = { platform: platformFilter };
            if (categories) {
                const catList = categories.split(',').map(c => c.trim()).filter(Boolean);
                if (catList.length > 0) q.category = { $in: catList };
            }
            if (keyword.trim()) {
                const kwList = keyword.split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
                const regexList = kwList.map(kw => new RegExp(kw, 'i'));
                q.$or = [
                    { authorName: { $in: regexList } },
                    { brand: { $in: regexList } },
                    { productType: { $in: regexList } },
                ];
            }
            return q;
        };

        let tiktokData = [], youtubeData = [];
        if (platform === 'tiktok' || platform === 'both') tiktokData = await Influencer.find(buildQuery('tiktok')).lean();
        if (platform === 'youtube' || platform === 'both') youtubeData = await Influencer.find(buildQuery('youtube')).lean();

        // ✅ คำนวณ Per-Brand Rating /10 (เหมือน graph)
        const calcRawScore = (row) =>
            (row.totalViews    || 0) * 0.1 +
            (row.totalLikes    || 0) * 0.4 +
            (row.totalComments || 0) * 0.3 +
            (row.totalShares   || 0) * 0.2;

        const addRatings = (data) => {
            // group by brand → หา maxRaw ของแต่ละ brand
            const brandMax = {};
            data.forEach(row => {
                const brand = row.brand || 'Unknown';
                const raw = calcRawScore(row);
                if (!brandMax[brand] || raw > brandMax[brand]) brandMax[brand] = raw;
            });
            return data.map(row => {
                const brand = row.brand || 'Unknown';
                const raw = calcRawScore(row);
                const max = brandMax[brand] || 1;
                return { ...row, rating: parseFloat(((raw / max) * 10).toFixed(2)) };
            });
        };

        if (tiktokData.length)  tiktokData  = addRatings(tiktokData);
        if (youtubeData.length) youtubeData = addRatings(youtubeData);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'TookJaRit';
        workbook.created = new Date();

        const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3436' } };
        const HEADER_FONT = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        const BORDER_THIN = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
        const TIKTOK_ACCENT  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF010101' } };
        const YOUTUBE_ACCENT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };

        const COLUMNS = [
            { header: 'Author Name',    key: 'authorName',    width: 22 },
            { header: 'Followers',      key: 'followers',     width: 14 },
            { header: 'Brand',          key: 'brand',         width: 22 },
            { header: 'Rating /10',     key: 'rating',        width: 12 },
            { header: 'Product Type',   key: 'productType',   width: 24 },
            { header: 'Category',       key: 'category',      width: 20 },
            { header: 'Caption',        key: 'caption',       width: 50 },
            { header: 'Total Views',    key: 'totalViews',    width: 14 },
            { header: 'Total Likes',    key: 'totalLikes',    width: 14 },
            { header: 'Total Comments', key: 'totalComments', width: 16 },
            { header: 'Total Shares',   key: 'totalShares',   width: 14 },
            { header: 'Video URL',      key: 'videoUrl',      width: 40 },
            { header: 'Platform',       key: 'platform',      width: 12 },
        ];
        const NUMERIC_KEYS = ['followers', 'totalViews', 'totalLikes', 'totalComments', 'totalShares'];
        const RATING_COL_IDX = COLUMNS.findIndex(c => c.key === 'rating') + 1;

        const buildSheet = (name, data, accentFill) => {
            if (data.length === 0) return;
            const sheet = workbook.addWorksheet(name, {
                views: [{ state: 'frozen', ySplit: 2 }],
                properties: { defaultRowHeight: 18 },
            });
            sheet.mergeCells(1, 1, 1, COLUMNS.length);
            const titleCell = sheet.getCell('A1');
            const filterDesc = [keyword ? `keyword: "${keyword}"` : '', categories ? `categories: ${categories}` : ''].filter(Boolean).join(' | ');
            titleCell.value = `TookJaRit — ${name}${filterDesc ? `  [${filterDesc}]` : ''}  |  ${new Date().toLocaleString('th-TH')}`;
            titleCell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            titleCell.fill = accentFill;
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            sheet.getRow(1).height = 26;
            sheet.columns = COLUMNS;
            const headerRow = sheet.getRow(2);
            headerRow.values = COLUMNS.map(c => c.header);
            headerRow.eachCell(cell => {
                cell.font = HEADER_FONT; cell.fill = HEADER_FILL;
                cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = BORDER_THIN;
            });
            headerRow.height = 22;
            data.forEach((row, idx) => {
                const rowData = {};
                COLUMNS.forEach(col => { rowData[col.key] = row[col.key] ?? ''; });
                const r = sheet.addRow(rowData);
                const rowFill = idx % 2 === 0
                    ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
                    : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                r.eachCell({ includeEmpty: true }, cell => {
                    cell.fill = rowFill; cell.border = BORDER_THIN;
                    cell.font = { name: 'Arial', size: 10 }; cell.alignment = { vertical: 'middle' };
                });
                NUMERIC_KEYS.forEach(key => {
                    const colIdx = COLUMNS.findIndex(c => c.key === key);
                    if (colIdx === -1) return;
                    const cell = r.getCell(colIdx + 1);
                    cell.numFmt = '#,##0'; cell.alignment = { horizontal: 'right', vertical: 'middle' };
                });
                // ✅ Rating cell — color by score + center align
                const ratingCell = r.getCell(RATING_COL_IDX);
                const ratingVal = row.rating || 0;
                ratingCell.numFmt = '0.00';
                ratingCell.alignment = { horizontal: 'center', vertical: 'middle' };
                ratingCell.font = {
                    name: 'Arial', size: 10, bold: true,
                    color: { argb: ratingVal >= 7.5 ? 'FF00b894' : ratingVal >= 5 ? 'FFe17055' : 'FFb2bec3' },
                };
                r.height = 18;
            });
            sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: COLUMNS.length } };
        };

        buildSheet('TikTok', tiktokData, TIKTOK_ACCENT);
        buildSheet('YouTube', youtubeData, YOUTUBE_ACCENT);

        if (workbook.worksheets.length === 0) return res.status(404).json({ error: 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่เลือก' });

        const filename = `TookJaRit_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('Export Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────
// API: Top Videos by Brand ✅ เพิ่ม totalComments + totalShares
// ─────────────────────────────────────────
app.get('/api/top-videos-by-brand', async (req, res) => {
    const { authorName, platform = 'tiktok' } = req.query;
    if (!authorName) return res.status(400).json({ error: 'authorName is required' });
    try {
        const results = await Influencer.aggregate([
            { $match: { authorName, platform, videoUrl: { $exists: true, $ne: '' } } },
            { $sort: { totalLikes: -1 } },
            { $group: {
                _id:           '$brand',
                brand:         { $first: '$brand' },
                videoUrl:      { $first: '$videoUrl' },
                totalLikes:    { $first: '$totalLikes' },
                totalViews:    { $first: '$totalViews' },
                totalComments: { $first: '$totalComments' },  // ✅
                totalShares:   { $first: '$totalShares' },    // ✅
                caption:       { $first: '$caption' },
                category:      { $first: '$category' },
            }},
            { $sort: { totalLikes: -1 } },
            { $limit: 10 },
        ]);
        res.json(results);
    } catch (e) {
        console.error('❌ top-videos-by-brand error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));