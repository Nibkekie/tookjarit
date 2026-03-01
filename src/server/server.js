// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Influencer = require('./Influencer');
const { ApifyClient } = require('apify-client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const neo4j = require('neo4j-driver');
const jwt  = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./User');

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
                platform: 'tiktok', caption: item.text || "", videoUrl: item.webVideoUrl || "",
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
                ON CREATE SET i.followers = row.followers, i.authorAvatar = row.authorAvatar, i.platform = row.platform
                ON MATCH SET  i.followers = row.followers, i.authorAvatar = row.authorAvatar, i.platform = row.platform
                MERGE (b:Brand {name: row.finalBrand})
                ON CREATE SET b.category = row.category
                ON MATCH SET  b.category = row.category
                MERGE (i)-[r:POSTED_ABOUT]->(b)
                ON CREATE SET r.weight = 1, r.totalViews = row.totalViews, r.totalLikes = row.totalLikes
                ON MATCH SET  r.weight = r.weight + 1, r.totalViews = COALESCE(r.totalViews,0) + row.totalViews, r.totalLikes = COALESCE(r.totalLikes,0) + row.totalLikes
            `, { batch: processedData.map(d => ({ ...d, finalBrand: getDisplayBrand(d.brand, d.productType) })) });
        } finally { await session.close(); }

        res.json({ message: `บันทึก ${processedData.length} รายการเรียบร้อย` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// API: Graph Data (รองรับ platform filter)
// ─────────────────────────────────────────
app.get('/api/graph-data', async (req, res) => {
    const platform = req.query.platform || 'tiktok'; // ✅ รับ platform param
    const session = driver.session();
    try {
        // ✅ filter ตาม platform ใน Neo4j
        const result = await session.run(`
            MATCH (i:Influencer)-[r:POSTED_ABOUT]->(b:Brand)
            WHERE i.platform = $platform
            RETURN i, r, b LIMIT 1000
        `, { platform });

        const nodes = [], links = [], seen = new Set();
        result.records.forEach(rec => {
            const i = rec.get('i'), b = rec.get('b'), r = rec.get('r');
            if (!seen.has(i.elementId)) {
                nodes.push({ id: i.elementId, name: i.properties.name, type: 'Influencer', followers: i.properties.followers, authorAvatar: i.properties.authorAvatar || "", platform: i.properties.platform || platform });
                seen.add(i.elementId);
            }
            if (!seen.has(b.elementId)) {
                nodes.push({ id: b.elementId, name: b.properties.name, type: 'Brand', category: b.properties.category });
                seen.add(b.elementId);
            }
            links.push({ source: i.elementId, target: b.elementId, weight: r.properties.weight?.low || 1, totalViews: r.properties.totalViews?.low || 0, totalLikes: r.properties.totalLikes?.low || 0 });
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
                ON CREATE SET i.followers = row.followers, i.authorAvatar = row.authorAvatar, i.platform = row.platform
                ON MATCH SET  i.followers = row.followers, i.authorAvatar = row.authorAvatar, i.platform = row.platform
                MERGE (b:Brand {name: row.finalBrand})
                ON CREATE SET b.category = row.category
                ON MATCH SET  b.category = row.category
                MERGE (i)-[r:POSTED_ABOUT]->(b)
                ON CREATE SET r.weight = 1, r.totalViews = row.totalViews, r.totalLikes = row.totalLikes
                ON MATCH SET  r.weight = r.weight + 1, r.totalViews = COALESCE(r.totalViews,0) + row.totalViews, r.totalLikes = COALESCE(r.totalLikes,0) + row.totalLikes
            `, { batch: influencers.map(inf => ({ authorName: inf.authorName, authorAvatar: inf.authorAvatar || "", followers: inf.followers || 0, platform: inf.platform || 'tiktok', totalViews: inf.totalViews || 0, totalLikes: inf.totalLikes || 0, finalBrand: getDisplayBrand(inf.brand, inf.productType), category: inf.category })) });
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
// API: Favorites — ✅ บันทึก platform ด้วย
// ─────────────────────────────────────────
app.post('/api/favorites/toggle', authMiddleware, async (req, res) => {
    try {
        const { influencerName, platform = 'tiktok' } = req.body; // ✅ รับ platform
        const user = await User.findById(req.user.id);
        const idx = user.favorites.findIndex(f => f.influencerName === influencerName);
        if (idx === -1) {
            user.favorites.push({ influencerName, platform }); // ✅ บันทึก platform
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

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));