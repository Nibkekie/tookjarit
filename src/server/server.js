// server.js (Final Integration: User's Logic + Neo4j Graph Features)
require('dotenv').config();
const express = require('express');
const { ApifyClient } = require('apify-client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Airtable = require('airtable');
const cors = require('cors'); 
const neo4j = require('neo4j-driver'); // ✅ เพิ่ม Neo4j Driver


const app = express();
app.use(cors()); 
app.use(express.json());

// --- 1. SETUP CLIENTS ---
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔍 Debug: เช็ก Key
if (!process.env.AIRTABLE_API_KEY2) console.error("❌ ไม่พบ AIRTABLE_API_KEY2 ใน .env");

// เชื่อม Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY2 }).base(process.env.AIRTABLE_BASE_ID2);
const TABLE_NAME = 'TikTok_Raw_Data'; 

// ✅ เชื่อม Neo4j (เพิ่มส่วนนี้)
const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// ✅ Helper Function: แก้ปัญหา No Brand (เพิ่มส่วนนี้)
const getDisplayBrand = (brand, productType) => {
    if (!brand || ['Unknown', 'No Brand', 'No Brand Name'].includes(brand)) {
        return productType || "General Product";
    }
    return brand;
};

// --- 2. API ENDPOINT ---
app.post('/api/search-tiktok', async (req, res) => {
    const { keyword, limit = 10 } = req.body; 

    if (!keyword) return res.status(400).json({ error: "Keyword is required" });

    console.log(`🔎 กำลังค้นหา TikTok: ${keyword} ...`);

    try {
        // === STEP A: Apify (Logic ของคุณ 100%) ===
        let input; 

        if (keyword.startsWith('@')) {
            const cleanUsername = keyword.replace('@', ''); 
            console.log(`👤 ตรวจพบ User ID! กำลังดึงข้อมูลจากโปรไฟล์: ${cleanUsername}`);
            input = { "profiles": [cleanUsername], "resultsPerPage": limit, "shouldDownloadCovers": false, "shouldDownloadSlideshowImages": false, "searchSection": "" };
        } else {
            console.log(`Hashtag Mode: กำลังค้นหาแท็ก #${keyword}`);
            input = { "hashtags": [keyword.replace('#', '')], "resultsPerPage": limit, "shouldDownloadCovers": false, "shouldDownloadSlideshowImages": false, "searchSection": "" };
        }

        const run = await apifyClient.actor("clockworks/free-tiktok-scraper").call(input);
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) return res.status(404).json({ message: "ไม่พบข้อมูลจาก TikTok" });

        console.log(`✅ ได้ข้อมูลมา ${items.length} รายการ. ส่งต่อ AI...`);

        // === STEP B: Gemini (Prompt ของคุณ 100%) ===
        const dataForAI = items.map(item => ({
            id: item.id, text: item.text, author_name: item.authorMeta?.name || "Unknown", shop_name: item.authorMeta?.nickName || "Unknown"
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

        console.log("🤖 AI วิเคราะห์เสร็จแล้ว! กำลังเตรียมข้อมูลลง Airtable...");

        // === STEP C: Mapping (Logic ของคุณ 100%) ===
        const recordsToCreate = items.map(tiktokItem => {
            const analysis = aiAnalysis.find(a => a.id === tiktokItem.id) || {};
            return {
                fields: {
                    "Video ID": tiktokItem.id,
                    "Brand": analysis.brand || "Unknown",
                    "Product Type": analysis.product_type || "Unknown",
                    "Main Category": analysis.main_category || "Lifestyle",
                    "Caption": tiktokItem.text ? tiktokItem.text.substring(0, 5000) : "", 
                    "Video URL": tiktokItem.webVideoUrl,
                    "Views": tiktokItem.playCount || 0,
                    "Author Name": tiktokItem.authorMeta?.name || "Unknown",
                    "Followers": tiktokItem.authorMeta?.fans || 0,
                    "Likes": tiktokItem.diggCount || 0,
                    "Shares": tiktokItem.shareCount || 0,
                    "Comments": tiktokItem.commentCount || 0
                }
            };
        });

        const chunk = recordsToCreate.slice(0, 10);

        // === STEP D: ส่งขึ้น Airtable ===
        if (chunk.length > 0) {
            console.log(`🚀 กำลังส่ง ${chunk.length} รายการ ไปที่ Airtable...`);
            await base(TABLE_NAME).create(chunk);
        }

        // === ✅ STEP E: Neo4j (แทรกส่วนนี้เพิ่ม เพื่อให้กราฟทำงาน) ===
        // ต้องแทรกตรงนี้เพื่อใช้ข้อมูล chunk ชุดเดียวกัน
        const session = driver.session();
        try {
            await session.run(`
                UNWIND $batch AS row
                MERGE (i:Influencer {name: row.authorName})
                ON CREATE SET i.followers = row.followers
                ON MATCH SET i.followers = row.followers
                
                MERGE (b:Brand {name: row.finalBrand})
                SET b.category = row.category

                MERGE (i)-[r:POSTED_ABOUT]->(b)
                // 👇👇👇 จุดที่แก้คือ 2 บรรทัดล่างนี้ครับ 👇👇👇
                ON CREATE SET r.weight = 1, r.totalViews = row.views, r.totalLikes = row.likes
                ON MATCH SET r.weight = r.weight + 1, 
                             r.totalViews = COALESCE(r.totalViews, 0) + row.views, 
                             r.totalLikes = COALESCE(r.totalLikes, 0) + row.likes
            `, {
                batch: chunk.map(item => ({
                    authorName: item.fields["Author Name"],
                    followers: item.fields["Followers"],
                    views: item.fields["Views"],
                    likes: item.fields["Likes"],
                    // ใช้ Helper แก้ชื่อ Brand
                    finalBrand: getDisplayBrand(item.fields["Brand"], item.fields["Product Type"]),
                    category: item.fields["Main Category"]
                }))
            });
            console.log("✨ [Neo4j] Graph Updated with Views/Likes!");
        } catch (neoErr) {
            console.error("❌ Neo4j Error:", neoErr.message);
        } finally {
            await session.close();
        }
        // =========================================================

        console.log("🎉 เสร็จสิ้น! บันทึกลง Airtable เรียบร้อย");
        res.json({ status: "success", message: `Saved ${chunk.length} items`, data: chunk.map(r => r.fields) });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ API 2: Get Graph Data (สำหรับ Frontend)
app.get('/api/graph-data', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (i:Influencer)-[r:POSTED_ABOUT]->(b:Brand)
            RETURN i, r, b LIMIT 500
        `);
        
        const nodes = [], links = [], seen = new Set();
        result.records.forEach(rec => {
            const i = rec.get('i'), b = rec.get('b'), r = rec.get('r');
            
            if (!seen.has(i.elementId)) { nodes.push({ id: i.elementId, name: i.properties.name, type: 'Influencer', followers: i.properties.followers, val: 30 }); seen.add(i.elementId); }
            if (!seen.has(b.elementId)) { nodes.push({ id: b.elementId, name: b.properties.name, type: 'Brand', category: b.properties.category, val: 10 }); seen.add(b.elementId); }
            
            links.push({
                source: i.elementId, target: b.elementId,
                weight: r.properties.weight?.low || 1,
                totalViews: r.properties.totalViews?.low || 0, // ส่งยอดวิว
                totalLikes: r.properties.totalLikes?.low || 0  // ส่งยอดไลค์
            });
        });
        res.json({ nodes, links });
    } catch (e) { res.status(500).json({ error: e.message }); } finally { await session.close(); }
});

// ✅ API 3: Sync Old Data 
app.get('/api/sync-airtable-to-neo4j', async (req, res) => {
    try {
        const records = await base(TABLE_NAME).select({ maxRecords: 1000 }).all();
        const session = driver.session();
        try {
            await session.run(`
                UNWIND $batch AS row
                MERGE (i:Influencer {name: row.authorName})
                ON CREATE SET i.followers = row.followers
                MERGE (b:Brand {name: row.finalBrand})
                SET b.category = row.category
                MERGE (i)-[r:POSTED_ABOUT]->(b)
                ON CREATE SET r.weight = 1, r.totalViews = row.views, r.totalLikes = row.likes
                ON MATCH SET r.weight = r.weight + 1, 
                             r.totalViews = COALESCE(r.totalViews, 0) + row.views, 
                             r.totalLikes = COALESCE(r.totalLikes, 0) + row.likes
            `, {
                batch: records.map(r => ({
                    authorName: r.get('Author Name'), followers: r.get('Followers') || 0,
                    views: r.get('Views') || 0, likes: r.get('Likes') || 0,
                    finalBrand: getDisplayBrand(r.get('Brand'), r.get('Product Type')),
                    category: r.get('Main Category')
                }))
            });
            res.json({ status: "success", count: records.length });
        } finally { await session.close(); }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));