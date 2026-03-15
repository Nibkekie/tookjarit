// server.js
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const Influencer = require('./Influencer');
const { ApifyClient } = require('apify-client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const neo4j = require('neo4j-driver');
const jwt = require('jsonwebtoken');
const User = require('./User');
const SearchHistory = require('./SearchHistory');
const Campaign = require('./Campaign');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// ✅ FIX: เพิ่ม fs

const JWT_SECRET = process.env.JWT_SECRET || 'tookjarit-secret-key-2024';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ✅ FIX: สร้างโฟลเดอร์ uploads/campaigns อัตโนมัติถ้ายังไม่มี
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'campaigns');
const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created uploads/campaigns folder');
}

// DEBUG log — ดูตอน restart server ว่า path ถูกไหม
console.log('📁 uploadDir  :', uploadDir);
console.log('📁 staticFrom :', uploadsRoot);

// ✅ Serve static + debug log ทุก request รูป
app.use('/uploads', (req, res, next) => {
    console.log('🖼️  Image request:', req.path, '→', path.join(uploadsRoot, req.path));
    next();
}, express.static(uploadsRoot));

// ── Multer config สำหรับอัปโหลดรูปแคมเปญ ──
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        // ลบ space + ตัวอักษรพิเศษออกจากชื่อไฟล์
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, Date.now() + '-' + safeName);
    }
});
const uploadCampaignImages = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },  // 5MB per file
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowed.test(file.mimetype);
        if (extOk && mimeOk) {
            cb(null, true);
        } else {
            cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ (jpg, png, gif, webp) เท่านั้น'), false);
        }
    }
}).array('images', 5);


// --- Setup Clients ---
const apifyClient = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const apifyRefreshClient = new ApifyClient({ token: process.env.APIFY_REFRESH_TOKEN || process.env.APIFY_API_TOKEN });
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
// Auth Middleware (ย้ายขึ้นมาก่อน routes ที่ใช้)
// ─────────────────────────────────────────
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' }); }
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
                textLanguage: item.textLanguage || '',
                totalViews: item.playCount || 0, totalLikes: item.diggCount || 0,
                totalComments: item.commentCount || 0, totalShares: item.shareCount || 0,
                brand: analysis.brand || "Unknown", productType: analysis.product_type || "Unknown",
                category: analysis.main_category || "Lifestyle"
            };
        });

        try { await Influencer.insertMany(processedData, { ordered: false }); } catch (e) { if (e.code !== 11000) console.error(e); }

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
        const fromHistory = await SearchHistory.findOne({ platform }).sort({ lastSearched: -1 }).lean();
        if (fromHistory) return res.json({ lastUpdated: fromHistory.lastSearched });
        const fromInfluencer = await Influencer.findOne({ platform }).sort({ updatedAt: -1 }).select('updatedAt').lean();
        res.json({ lastUpdated: fromInfluencer?.updatedAt || null });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
        const [influencers, brands, productTypes] = await Promise.all([
            Influencer.distinct('authorName', { platform, authorName: regex }),
            Influencer.distinct('brand', { platform, brand: regex }),
            Influencer.distinct('productType', { platform, productType: regex }),
        ]);

        const SKIP_BRANDS = ['Unknown', 'No Brand', 'No Brand Name'];
        const filteredBrands = brands.filter(b => b && !CATEGORY_LIST.includes(b) && !SKIP_BRANDS.includes(b));
        const matchedCategories = CATEGORY_LIST.filter(c => regex.test(c));
        const filteredProductTypes = productTypes.filter(p => p && !['Unknown', 'unknown', ''].includes(p));

        const results = [
            ...influencers.slice(0, 5).map(v => ({ type: 'influencer', label: v, display: `@${v}` })),
            ...filteredBrands.slice(0, 4).map(v => ({ type: 'brand', label: v, display: v })),
            ...matchedCategories.slice(0, 3).map(v => ({ type: 'category', label: v, display: v })),
            ...filteredProductTypes.slice(0, 3).map(v => ({ type: 'product', label: v, display: v })),
        ];
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// API: Graph Data
// ─────────────────────────────────────────
app.get('/api/graph-data', async (req, res) => {
    const platform = req.query.platform || 'tiktok';
    const thaiOnly = req.query.thaiOnly === 'true';
    const session = driver.session();
    try {
        // ✅ ถ้า thaiOnly → หา influencer ที่มีโพสต์ภาษาไทยจาก MongoDB ก่อน
        let thaiInfluencerNames = null;
        if (thaiOnly) {
            const thaiRegex = /[\u0E00-\u0E7F]/;  // ตัวอักษรไทย ก-๙
            const allInfluencers = await Influencer.find({ platform }).select('authorName textLanguage caption').lean();
            const thaiNames = allInfluencers
                .filter(inf => inf.textLanguage === 'th' || thaiRegex.test(inf.caption || ''))
                .map(inf => inf.authorName);
            thaiInfluencerNames = new Set(thaiNames);
        }

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

            // ✅ thaiOnly → ข้ามถ้า influencer ไม่มีโพสต์ไทย
            if (thaiInfluencerNames && !thaiInfluencerNames.has(i.properties.name)) return;

            const rViews = r.properties.totalViews?.low ?? r.properties.totalViews ?? 0;
            const rLikes = r.properties.totalLikes?.low ?? r.properties.totalLikes ?? 0;
            const rComments = r.properties.totalComments?.low ?? r.properties.totalComments ?? 0;
            const rShares = r.properties.totalShares?.low ?? r.properties.totalShares ?? 0;

            if (!influencerStats[iId]) influencerStats[iId] = { totalLikes: 0, totalViews: 0 };
            influencerStats[iId].totalLikes += rLikes;
            influencerStats[iId].totalViews += rViews;

            if (!seen.has(iId)) {
                nodes.push({
                    id: iId, name: i.properties.name, type: 'Influencer',
                    followers: i.properties.followers?.low || i.properties.followers || 0,
                    authorAvatar: i.properties.authorAvatar || '',
                    platform: i.properties.platform || platform,
                    profileLikes: i.properties.profileLikes?.low || i.properties.profileLikes || 0,
                });
                seen.add(iId);
            }
            if (!seen.has(b.elementId)) {
                nodes.push({ id: b.elementId, name: b.properties.name, type: 'Brand', category: b.properties.category });
                seen.add(b.elementId);
            }

            links.push({
                source: iId, target: b.elementId,
                weight: r.properties.weight?.low ?? 1,
                totalViews: rViews, totalLikes: rLikes, totalComments: rComments, totalShares: rShares,
            });
        });

        nodes.forEach(node => {
            if (node.type === 'Influencer' && influencerStats[node.id]) {
                node.totalLikes = influencerStats[node.id].totalLikes;
                node.totalViews = influencerStats[node.id].totalViews;
            }
        });

        res.json({ nodes, links });
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { await session.close(); }
});

// ─────────────────────────────────────────
// API: Sync MongoDB → Neo4j
// ─────────────────────────────────────────
app.get('/api/sync-mongo-to-neo4j', async (req, res) => {
    try {
        const influencers = await Influencer.find({});
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
                SET r.totalViews = row.totalViews, r.totalLikes = row.totalLikes,
                    r.totalComments = row.totalComments, r.totalShares = row.totalShares
            `, {
                batch: influencers.map(inf => ({
                    authorName: inf.authorName, authorAvatar: inf.authorAvatar || "",
                    followers: inf.followers || 0, profileLikes: inf.profileLikes || 0,
                    platform: inf.platform || 'tiktok',
                    totalViews: inf.totalViews || 0, totalLikes: inf.totalLikes || 0,
                    totalComments: inf.totalComments || 0, totalShares: inf.totalShares || 0,
                    finalBrand: getDisplayBrand(inf.brand, inf.productType), category: inf.category,
                }))
            });
            res.json({ status: "success", count: influencers.length });
        } finally { await session.close(); }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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
// API: Campaign — CRUD
// ─────────────────────────────────────────

app.get('/api/debug-uploads', (req, res) => {
    const root = path.join(__dirname, '..', '..', 'uploads');
    const campaigns = path.join(root, 'campaigns');
    let files = [];
    try { if (fs.existsSync(campaigns)) files = fs.readdirSync(campaigns); }
    catch (e) { files = ['ERROR: ' + e.message]; }

    res.json({
        __dirname,
        uploadsRoot: root,
        campaignsDir: campaigns,
        uploadsExists: fs.existsSync(root),
        campaignsDirExists: fs.existsSync(campaigns),
        files,
        sampleUrl: files[0] ? `http://localhost:5000/uploads/campaigns/${files[0]}` : 'no files'
    });
});

// ── LIST (public) ──
app.get('/api/campaigns', async (req, res) => {
    try {
        const { category, status = 'open', search, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (search) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [{ title: regex }, { description: regex }];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [campaigns, total] = await Promise.all([
            Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select('-applicants').lean(),
            Campaign.countDocuments(filter),
        ]);
        res.json({ campaigns, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (e) {
        console.error('❌ GET /api/campaigns error:', e.message);
        res.status(500).json({ message: e.message });
    }
});

// ── DETAIL (public) ──
app.get('/api/campaigns/:id', async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id).lean();
        if (!campaign) return res.status(404).json({ message: 'ไม่พบแคมเปญนี้' });
        res.json(campaign);
    } catch (e) {
        console.error('❌ GET /api/campaigns/:id error:', e.message);
        res.status(500).json({ message: e.message });
    }
});

// ── CREATE (ต้อง login + upload รูป) ──
app.post('/api/campaigns', authMiddleware, (req, res) => {
    uploadCampaignImages(req, res, async (uploadErr) => {
        if (uploadErr) {
            console.error('❌ Upload error:', uploadErr.message);
            return res.status(400).json({ message: uploadErr.message });
        }
        try {
            const { title, description, budget, category, jobType, contact } = req.body;

            console.log('📦 req.body:', JSON.stringify(req.body));
            console.log('📷 req.files:', req.files?.length || 0, 'files');

            if (!title || !description || !category) {
                return res.status(400).json({ message: 'กรุณากรอก ชื่องาน, รายละเอียด, และหมวดหมู่' });
            }
            if (!contact || !contact.trim()) {
                return res.status(400).json({ message: 'กรุณากรอกช่องทางการติดต่อ' });
            }

            const imageFiles = req.files ? req.files.map(f => `/uploads/campaigns/${f.filename}`) : [];

            const campaign = await Campaign.create({
                author: { userId: req.user.id, name: req.user.name, email: req.user.email },
                title: title.trim(),
                description: description.trim(),
                budget: parseInt(budget) || 0,
                category,
                jobType: jobType || 'freelance',
                contact: contact.trim(),
                images: imageFiles,
                status: 'open',
            });

            console.log('✅ Campaign created:', campaign.title, '| images:', imageFiles.length);
            res.status(201).json(campaign);
        } catch (e) {
            console.error('❌ POST /api/campaigns error:', e.message);
            res.status(500).json({ message: e.message });
        }
    });
});

// ── UPDATE (เจ้าของเท่านั้น) ──
app.put('/api/campaigns/:id', authMiddleware, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ message: 'ไม่พบแคมเปญนี้' });
        if (campaign.author.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขแคมเปญนี้' });
        }
        const allowed = ['title', 'description', 'budget', 'category', 'jobType', 'images', 'status', 'contact'];
        allowed.forEach(key => { if (req.body[key] !== undefined) campaign[key] = req.body[key]; });
        await campaign.save();
        res.json(campaign);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── UPLOAD IMAGES สำหรับ EditCampaign ──
app.post('/api/campaigns/:id/upload-images', authMiddleware, (req, res) => {
    uploadCampaignImages(req, res, async (uploadErr) => {
        if (uploadErr) return res.status(400).json({ message: uploadErr.message });
        try {
            const campaign = await Campaign.findById(req.params.id);
            if (!campaign) return res.status(404).json({ message: 'ไม่พบแคมเปญนี้' });
            if (campaign.author.userId.toString() !== req.user.id) {
                return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขแคมเปญนี้' });
            }
            const paths = req.files ? req.files.map(f => `/uploads/campaigns/${f.filename}`) : [];
            res.json({ paths });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    });
});

// ── DELETE (เจ้าของเท่านั้น) ──
app.delete('/api/campaigns/:id', authMiddleware, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ message: 'ไม่พบแคมเปญนี้' });
        if (campaign.author.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบแคมเปญนี้' });
        }
        await Campaign.findByIdAndDelete(req.params.id);
        res.json({ message: 'ลบแคมเปญเรียบร้อย' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── APPLY (ต้อง login) ──
app.post('/api/campaigns/:id/apply', authMiddleware, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ message: 'ไม่พบแคมเปญนี้' });
        if (campaign.status !== 'open') return res.status(400).json({ message: 'แคมเปญนี้ปิดรับสมัครแล้ว' });
        const alreadyApplied = campaign.applicants.some(a => a.userId.toString() === req.user.id);
        if (alreadyApplied) return res.status(400).json({ message: 'คุณสมัครแคมเปญนี้แล้ว' });
        campaign.applicants.push({ userId: req.user.id, name: req.user.name, message: req.body.message || '' });
        await campaign.save();
        res.json({ message: 'สมัครเข้าร่วมแคมเปญเรียบร้อย', applicantCount: campaign.applicants.length });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── MY CAMPAIGNS (ต้อง login) ──
app.get('/api/my-campaigns', authMiddleware, async (req, res) => {
    try {
        const campaigns = await Campaign.find({ 'author.userId': req.user.id }).sort({ createdAt: -1 }).lean();
        res.json(campaigns);
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

        const calcRawScore = (row) =>
            (row.totalViews || 0) * 0.1 + (row.totalLikes || 0) * 0.4 +
            (row.totalComments || 0) * 0.3 + (row.totalShares || 0) * 0.2;

        const addRatings = (data) => {
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

        if (tiktokData.length) tiktokData = addRatings(tiktokData);
        if (youtubeData.length) youtubeData = addRatings(youtubeData);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'TookJaRit';
        workbook.created = new Date();

        const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3436' } };
        const HEADER_FONT = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        const BORDER_THIN = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }, right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
        const TIKTOK_ACCENT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF010101' } };
        const YOUTUBE_ACCENT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };

        const COLUMNS = [
            { header: 'Author Name', key: 'authorName', width: 22 },
            { header: 'Followers', key: 'followers', width: 14 },
            { header: 'Brand', key: 'brand', width: 22 },
            { header: 'Rating /10', key: 'rating', width: 12 },
            { header: 'Product Type', key: 'productType', width: 24 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Caption', key: 'caption', width: 50 },
            { header: 'Total Views', key: 'totalViews', width: 14 },
            { header: 'Total Likes', key: 'totalLikes', width: 14 },
            { header: 'Total Comments', key: 'totalComments', width: 16 },
            { header: 'Total Shares', key: 'totalShares', width: 14 },
            { header: 'Video URL', key: 'videoUrl', width: 40 },
            { header: 'Platform', key: 'platform', width: 12 },
        ];
        const NUMERIC_KEYS = ['followers', 'totalViews', 'totalLikes', 'totalComments', 'totalShares'];
        const RATING_COL_IDX = COLUMNS.findIndex(c => c.key === 'rating') + 1;

        const buildSheet = (name, data, accentFill) => {
            if (data.length === 0) return;
            const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 2 }], properties: { defaultRowHeight: 18 } });
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
            headerRow.eachCell(cell => { cell.font = HEADER_FONT; cell.fill = HEADER_FILL; cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = BORDER_THIN; });
            headerRow.height = 22;
            data.forEach((row, idx) => {
                const rowData = {};
                COLUMNS.forEach(col => { rowData[col.key] = row[col.key] ?? ''; });
                const r = sheet.addRow(rowData);
                const rowFill = idx % 2 === 0 ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } } : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                r.eachCell({ includeEmpty: true }, cell => { cell.fill = rowFill; cell.border = BORDER_THIN; cell.font = { name: 'Arial', size: 10 }; cell.alignment = { vertical: 'middle' }; });
                NUMERIC_KEYS.forEach(key => {
                    const colIdx = COLUMNS.findIndex(c => c.key === key);
                    if (colIdx === -1) return;
                    const cell = r.getCell(colIdx + 1);
                    cell.numFmt = '#,##0'; cell.alignment = { horizontal: 'right', vertical: 'middle' };
                });
                const ratingCell = r.getCell(RATING_COL_IDX);
                const ratingVal = row.rating || 0;
                ratingCell.numFmt = '0.00';
                ratingCell.alignment = { horizontal: 'center', vertical: 'middle' };
                ratingCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: ratingVal >= 7.5 ? 'FF00b894' : ratingVal >= 5 ? 'FFe17055' : 'FFb2bec3' } };
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
// API: Top Videos by Brand
// ─────────────────────────────────────────
app.get('/api/top-videos-by-brand', async (req, res) => {
    const { authorName, platform = 'tiktok' } = req.query;
    if (!authorName) return res.status(400).json({ error: 'authorName is required' });
    try {
        const results = await Influencer.aggregate([
            { $match: { authorName, platform, videoUrl: { $exists: true, $ne: '' } } },
            { $sort: { totalLikes: -1 } },
            {
                $group: {
                    _id: '$brand', brand: { $first: '$brand' }, videoUrl: { $first: '$videoUrl' },
                    totalLikes: { $first: '$totalLikes' }, totalViews: { $first: '$totalViews' },
                    totalComments: { $first: '$totalComments' }, totalShares: { $first: '$totalShares' },
                    caption: { $first: '$caption' }, category: { $first: '$category' },
                }
            },
            { $sort: { totalLikes: -1 } },
            { $limit: 10 },
        ]);
        res.json(results);
    } catch (e) {
        console.error('❌ top-videos-by-brand error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────
// API: Import TikTok JSON (จากไฟล์ Apify ที่โหลดไว้)
// ─────────────────────────────────────────
app.post('/api/import-tiktok-json', async (req, res) => {
    const { items: rawItems, thaiOnly = false } = req.body;
    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
        return res.status(400).json({ error: "กรุณาส่ง items array มาด้วย" });
    }
    console.log(`📥 Import TikTok JSON: ${rawItems.length} items | thaiOnly: ${thaiOnly}`);
    try {
        const items = thaiOnly ? rawItems.filter(item => item.textLanguage === 'th') : rawItems;
        if (items.length === 0) return res.status(404).json({ message: "ไม่พบโพสต์ภาษาไทยในไฟล์นี้" });

        const BATCH_SIZE = 15;
        let allAnalysis = [];
        for (let start = 0; start < items.length; start += BATCH_SIZE) {
            const batch = items.slice(start, start + BATCH_SIZE);
            const dataForAI = batch.map(item => ({ id: item.id, text: item.text, author_name: item.authorMeta?.name || "Unknown" }));
            const prompt = `Analyze TikTok captions. Input: ${JSON.stringify(dataForAI)}
            Tasks:
            1. brand: Extract Brand Name (if specific brand is not found, use "No Brand").
            2. product_type: Identify the specific object and **Translate to Thai**.
            3. main_category: Choose ONE best category from: Fashion, Beauty & Personal Care, Health & Wellness, Food & Beverage, Mom & Kids, IT & Gadgets, Home & Living, Toys & Collectibles, Pet, Automotive, Lifestyle
            Output: JSON Array ONLY. No markdown. Preserve "id".
            Structure: [{ "id": "...", "brand": "...", "product_type": "...", "main_category": "..." }]`;
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const parsed = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
            allAnalysis = allAnalysis.concat(parsed);
            console.log(`   🤖 Gemini batch ${Math.floor(start / BATCH_SIZE) + 1}: ${parsed.length} analyzed`);
        }

        const processedData = items.map(item => {
            const analysis = allAnalysis.find(a => a.id === item.id) || {};
            return {
                videoId: item.id, authorName: item.authorMeta?.name || "Unknown",
                authorAvatar: item.authorMeta?.avatar || "", followers: item.authorMeta?.fans || 0,
                profileLikes: item.authorMeta?.heart || 0,
                platform: 'tiktok', caption: item.text || "", videoUrl: item.webVideoUrl || "",
                textLanguage: item.textLanguage || '',
                totalViews: item.playCount || 0, totalLikes: item.diggCount || 0,
                totalComments: item.commentCount || 0, totalShares: item.shareCount || 0,
                brand: analysis.brand || "Unknown", productType: analysis.product_type || "Unknown",
                category: analysis.main_category || "Lifestyle"
            };
        });

        try { await Influencer.insertMany(processedData, { ordered: false }); }
        catch (e) { if (e.code !== 11000) console.error(e); }

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
                ON CREATE SET r.weight = 1, r.totalViews = row.totalViews, r.totalLikes = row.totalLikes, r.totalComments = row.totalComments, r.totalShares = row.totalShares
                ON MATCH SET  r.weight = r.weight + 1, r.totalViews = COALESCE(r.totalViews,0) + row.totalViews, r.totalLikes = COALESCE(r.totalLikes,0) + row.totalLikes, r.totalComments = COALESCE(r.totalComments,0) + row.totalComments, r.totalShares = COALESCE(r.totalShares,0) + row.totalShares
            `, { batch: processedData.map(d => ({ ...d, finalBrand: getDisplayBrand(d.brand, d.productType) })) });
        } finally { await session.close(); }

        console.log(`✅ Import done: ${processedData.length} items`);
        res.json({ message: `นำเข้า ${processedData.length} รายการสำเร็จ`, imported: processedData.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// API: Refresh Influencer Stats (อัพเดตยอด followers/likes/views จาก TikTok)
// ─────────────────────────────────────────
app.post('/api/refresh-stats', async (req, res) => {
    const { maxVideos = 100, staleDays = 30 } = req.body || {};
    const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
 
    console.log(`🔄 Refresh Stats | maxVideos: ${maxVideos} | staleDays: ${staleDays}`);
 
    try {
        // 1. หาคลิปที่ยังไม่เคย sync หรือ sync เกิน X วัน
        const staleVideos = await Influencer.find({
            platform: 'tiktok',
            videoUrl: { $exists: true, $ne: '' },
            $or: [
                { lastSynced: null },
                { lastSynced: { $lt: staleDate } },
            ]
        })
        .sort({ lastSynced: 1 })
        .limit(maxVideos)
        .select('videoUrl videoId authorName')
        .lean();
 
        if (staleVideos.length === 0) {
            return res.json({ message: 'ทุกคลิปอัพเดตแล้ว ไม่มีอะไรต้อง refresh', refreshed: 0 });
        }
 
        console.log(`   📋 พบ ${staleVideos.length} คลิปที่ต้องอัพเดต`);
 
        // 2. Scrape ด้วย postURLs — ตรง videoId 100%
        const BATCH_SIZE = 20;  // Apify รับ URL ได้หลายอันต่อ call
        let totalUpdated = 0;
 
        for (let i = 0; i < staleVideos.length; i += BATCH_SIZE) {
            const batch = staleVideos.slice(i, i + BATCH_SIZE);
            const postURLs = batch.map(v => v.videoUrl);
 
            console.log(`   🔎 Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} URLs`);
 
            try {
                const input = {
                    postURLs,
                    resultsPerPage: 1,
                    shouldDownloadCovers: false,
                    shouldDownloadSlideshowImages: false,
                    shouldDownloadSubtitles: false,
                    shouldDownloadVideos: false,
                };
                const run = await apifyRefreshClient.actor("clockworks/free-tiktok-scraper").call(input);
                const { items } = await apifyRefreshClient.dataset(run.defaultDatasetId).listItems();
 
                if (!items || items.length === 0) {
                    console.log(`   ⚠️ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ไม่ได้ data`);
                    continue;
                }
 
                // 3. อัพเดต MongoDB — ยอดคลิป + followers/avatar
                for (const item of items) {
                    const authorName = item.authorMeta?.name;
                    if (!authorName) continue;
 
                    // อัพเดต followers/avatar ทุก record ของ influencer นี้
                    await Influencer.updateMany(
                        { authorName, platform: 'tiktok' },
                        {
                            $set: {
                                followers: item.authorMeta?.fans || 0,
                                profileLikes: item.authorMeta?.heart || 0,
                                authorAvatar: item.authorMeta?.avatar || '',
                                lastSynced: new Date(),
                            }
                        }
                    );
 
                    // อัพเดตยอดคลิปตรง videoId
                    if (item.id) {
                        await Influencer.updateOne(
                            { videoId: item.id, platform: 'tiktok' },
                            {
                                $set: {
                                    totalViews: item.playCount || 0,
                                    totalLikes: item.diggCount || 0,
                                    totalComments: item.commentCount || 0,
                                    totalShares: item.shareCount || 0,
                                    textLanguage: item.textLanguage || '',
                                }
                            }
                        );
                        totalUpdated++;
                    }
                }
 
                console.log(`   ✅ Batch done: ${items.length} items updated`);
 
            } catch (batchErr) {
                console.error(`   ❌ Batch error:`, batchErr.message);
            }
        }
 
        // 4. Sync ไป Neo4j
        if (totalUpdated > 0) {
            const updatedNames = [...new Set(staleVideos.map(v => v.authorName))];
            const freshData = await Influencer.find({
                authorName: { $in: updatedNames },
                platform: 'tiktok',
            });
 
            const session = driver.session();
            try {
                await session.run(`
                    UNWIND $batch AS row
                    MERGE (i:Influencer {name: row.authorName})
                    SET i.followers = row.followers, i.authorAvatar = row.authorAvatar,
                        i.profileLikes = row.profileLikes
                    WITH i, row
                    MERGE (b:Brand {name: row.finalBrand})
                    MERGE (i)-[r:POSTED_ABOUT]->(b)
                    SET r.totalViews = row.totalViews, r.totalLikes = row.totalLikes,
                        r.totalComments = row.totalComments, r.totalShares = row.totalShares
                `, {
                    batch: freshData.map(inf => ({
                        authorName: inf.authorName,
                        authorAvatar: inf.authorAvatar || '',
                        followers: inf.followers || 0,
                        profileLikes: inf.profileLikes || 0,
                        totalViews: inf.totalViews || 0,
                        totalLikes: inf.totalLikes || 0,
                        totalComments: inf.totalComments || 0,
                        totalShares: inf.totalShares || 0,
                        finalBrand: getDisplayBrand(inf.brand, inf.productType),
                    }))
                });
            } finally { await session.close(); }
        }
 
        console.log(`🔄 Refresh done: ${totalUpdated}/${staleVideos.length} clips updated`);
        res.json({
            message: `อัพเดตสำเร็จ ${totalUpdated} คลิป`,
            refreshed: totalUpdated,
            total: staleVideos.length,
        });
 
    } catch (e) {
        console.error('❌ Refresh error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────
// API: Last Refreshed (วันที่อัพเดตยอดล่าสุด)
// ─────────────────────────────────────────
app.get('/api/last-refreshed', async (req, res) => {
    const platform = req.query.platform || 'tiktok';
    try {
        const latest = await Influencer.findOne({ platform, lastSynced: { $ne: null } })
            .sort({ lastSynced: -1 })
            .select('lastSynced')
            .lean();
        res.json({ lastRefreshed: latest?.lastSynced || null });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
 
const PORT = process.env.PORT || 5000;
// ── Serve React Build (Production) ──
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '..', '..', 'build');
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
            res.sendFile(path.join(buildPath, 'index.html'));
        }
    });
}
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));