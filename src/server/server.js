// server.js (Fixed Version - แก้ปัญหา Avatar ไม่ขึ้น)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Influencer = require('./Influencer');
const { ApifyClient } = require('apify-client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// --- Setup Clients ---
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Neo4j Connection
const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// MongoDB Connection
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || "mongodb+srv://tookjaritdev:113333555555@tookjarit-cluster.ve5cpue.mongodb.net/tookjarit?appName=TookJaRit-Cluster";
        await mongoose.connect(uri);
        console.log('✅ MongoDB Connected Successfully!');
    } catch (err) {
        console.error('❌ MongoDB Connection Failed:', err.message);
        process.exit(1);
    }
};
connectDB();

// --- Helper Function ---
const getDisplayBrand = (brand, productType) => {
    if (!brand || ['Unknown', 'No Brand', 'No Brand Name'].includes(brand)) {
        return productType || "General Product";
    }
    return brand;
};

// --- API 1: Search TikTok ---
app.post('/api/search-tiktok', async (req, res) => {
    const { keyword, limit = 10 } = req.body;

    if (!keyword) return res.status(400).json({ error: "Keyword is required" });

    console.log(`🔎 กำลังค้นหา TikTok: ${keyword} ...`);

    try {
        // Step A: Apify Scraping
        let input;

        if (keyword.startsWith('@')) {
            const cleanUsername = keyword.replace('@', '');
            console.log(`👤 ตรวจพบ User ID! กำลังดึงข้อมูลจากโปรไฟล์: ${cleanUsername}`);
            input = {
                "profiles": [cleanUsername],
                "resultsPerPage": limit,
                "shouldDownloadCovers": false,
                "shouldDownloadSlideshowImages": false,
                "searchSection": ""
            };
        } else {
            console.log(`Hashtag Mode: กำลังค้นหาแท็ก #${keyword}`);
            input = {
                "hashtags": [keyword.replace('#', '')],
                "resultsPerPage": limit,
                "shouldDownloadCovers": false,
                "shouldDownloadSlideshowImages": false,
                "searchSection": ""
            };
        }

        const run = await apifyClient.actor("clockworks/free-tiktok-scraper").call(input);
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            return res.status(404).json({ message: "ไม่พบข้อมูลจาก TikTok" });
        }

        console.log(`✅ ได้ข้อมูลมา ${items.length} รายการ. ส่งต่อ AI...`);

        // Step B: Gemini AI Analysis
        const dataForAI = items.map(item => ({
            id: item.id,
            text: item.text,
            author_name: item.authorMeta?.name || "Unknown",
            shop_name: item.authorMeta?.nickName || "Unknown"
        }));

        const prompt = `
        Analyze TikTok captions. Input: ${JSON.stringify(dataForAI)}
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
        Structure: [{ "id": "...", "brand": "...", "product_type": "...", "main_category": "..." }]
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const aiAnalysis = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

        console.log("🤖 AI วิเคราะห์เสร็จแล้ว! กำลังเตรียมข้อมูล...");

        // Step C: Prepare Data
        const processedData = items.map(tiktokItem => {
            const analysis = aiAnalysis.find(a => a.id === tiktokItem.id) || {};
            return {
                videoId: tiktokItem.id,
                authorName: tiktokItem.authorMeta?.name || "Unknown",
                authorAvatar: tiktokItem.authorMeta?.avatar || "",
                followers: tiktokItem.authorMeta?.fans || 0,
                platform: 'tiktok',
                caption: tiktokItem.text || "",
                videoUrl: tiktokItem.webVideoUrl || "",
                totalViews: tiktokItem.playCount || 0,
                totalLikes: tiktokItem.diggCount || 0,
                totalComments: tiktokItem.commentCount || 0,
                totalShares: tiktokItem.shareCount || 0,
                brand: analysis.brand || "Unknown",
                productType: analysis.product_type || "Unknown",
                category: analysis.main_category || "Lifestyle"
            };
        });

        // Step D: Save to MongoDB
        try {
            await Influencer.insertMany(processedData, { ordered: false });
            console.log("✅ [MongoDB] Saved new data.");
        } catch (e) {
            if (e.code !== 11000) console.error("MongoDB Error:", e);
        }

        // Step E: Update Neo4j (✅ แก้ไขตรงนี้)
        const session = driver.session();
        try {
            await session.run(`
                UNWIND $batch AS row
                MERGE (i:Influencer {name: row.authorName})
                ON CREATE SET 
                    i.followers = row.followers, 
                    i.authorAvatar = row.authorAvatar,
                    i.platform = row.platform
                ON MATCH SET 
                    i.followers = row.followers,
                    i.authorAvatar = row.authorAvatar,
                    i.platform = row.platform
                
                MERGE (b:Brand {name: row.finalBrand})
                ON CREATE SET b.category = row.category
                ON MATCH SET b.category = row.category

                MERGE (i)-[r:POSTED_ABOUT]->(b)
                ON CREATE SET 
                    r.weight = 1, 
                    r.totalViews = row.totalViews, 
                    r.totalLikes = row.totalLikes
                ON MATCH SET 
                    r.weight = r.weight + 1, 
                    r.totalViews = COALESCE(r.totalViews, 0) + row.totalViews, 
                    r.totalLikes = COALESCE(r.totalLikes, 0) + row.totalLikes
            `, {
                batch: processedData.map(d => ({
                    authorName: d.authorName,
                    authorAvatar: d.authorAvatar,
                    followers: d.followers,
                    platform: d.platform,
                    totalViews: d.totalViews,
                    totalLikes: d.totalLikes,
                    finalBrand: getDisplayBrand(d.brand, d.productType),
                    category: d.category
                }))
            });
            console.log("✅ [Neo4j] Graph Updated with Avatar!");
        } finally {
            await session.close();
        }

        res.json({ status: "success", count: processedData.length, data: processedData });
    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- API 2: Get Graph Data 
app.get('/api/graph-data', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (i:Influencer)-[r:POSTED_ABOUT]->(b:Brand)
            RETURN i, r, b LIMIT 1000
        `);

        const nodes = [], links = [], seen = new Set();
        result.records.forEach(rec => {
            const i = rec.get('i'), b = rec.get('b'), r = rec.get('r');

            if (!seen.has(i.elementId)) {
                nodes.push({
                    id: i.elementId,
                    name: i.properties.name,
                    type: 'Influencer',
                    followers: i.properties.followers,
                    authorAvatar: i.properties.authorAvatar || "",  
                    platform: i.properties.platform || 'tiktok'     
                });
                seen.add(i.elementId);
            }

            if (!seen.has(b.elementId)) {
                nodes.push({
                    id: b.elementId,
                    name: b.properties.name,
                    type: 'Brand',
                    category: b.properties.category
                });
                seen.add(b.elementId);
            }

            links.push({
                source: i.elementId,
                target: b.elementId,
                weight: r.properties.weight?.low || 1,
                totalViews: r.properties.totalViews?.low || 0,
                totalLikes: r.properties.totalLikes?.low || 0
            });
        });

        res.json({ nodes, links });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        await session.close();
    }
});

app.get('/api/sync-mongo-to-neo4j', async (req, res) => {
    try {
        const influencers = await Influencer.find({});
        console.log(`🔄 Syncing ${influencers.length} records from MongoDB...`);

        const session = driver.session();
        try {
            await session.run(`
                UNWIND $batch AS row
                MERGE (i:Influencer {name: row.authorName})
                ON CREATE SET 
                    i.followers = row.followers, 
                    i.authorAvatar = row.authorAvatar,
                    i.platform = row.platform
                ON MATCH SET 
                    i.followers = row.followers,
                    i.authorAvatar = row.authorAvatar,
                    i.platform = row.platform
                
                MERGE (b:Brand {name: row.finalBrand})
                ON CREATE SET b.category = row.category
                ON MATCH SET b.category = row.category

                MERGE (i)-[r:POSTED_ABOUT]->(b)
                ON CREATE SET 
                    r.weight = 1, 
                    r.totalViews = row.totalViews, 
                    r.totalLikes = row.totalLikes
                ON MATCH SET 
                    r.weight = r.weight + 1, 
                    r.totalViews = COALESCE(r.totalViews, 0) + row.totalViews, 
                    r.totalLikes = COALESCE(r.totalLikes, 0) + row.totalLikes
            `, {
                batch: influencers.map(inf => ({
                    authorName: inf.authorName,
                    authorAvatar: inf.authorAvatar || "",
                    followers: inf.followers || 0,
                    platform: inf.platform || 'tiktok',
                    totalViews: inf.totalViews || 0,
                    totalLikes: inf.totalLikes || 0,
                    finalBrand: getDisplayBrand(inf.brand, inf.productType),
                    category: inf.category
                }))
            });
            console.log("✅ [Neo4j] Sync completed with Avatar!");
            res.json({ status: "success", count: influencers.length });
        } finally {
            await session.close();
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Start Server ---
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));