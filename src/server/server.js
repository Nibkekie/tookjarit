// imports
const express = require('express');
const { ApifyClient } = require('apify-client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Airtable = require('airtable');
const cors = require('cors'); 
require('dotenv').config();

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
// ⚠️ เช็กชื่อตารางให้ตรงกับใน Airtable
const TABLE_NAME = 'TikTok_Raw_Data'; 

// --- 2. API ENDPOINT ---
app.post('/api/search-tiktok', async (req, res) => {
    const { keyword, limit = 10 } = req.body; 

    if (!keyword) return res.status(400).json({ error: "Keyword is required" });

    console.log(`🔎 กำลังค้นหา TikTok: ${keyword} ...`);

    try {
        // === STEP A: Apify ===
        
        let input; // สร้างตัวแปรมารอรับค่า

        // 🧠 Logic: เช็กว่ามี @ นำหน้าไหม?
        if (keyword.startsWith('@')) {
            // 👉 ถ้ามี @ ให้เป็นโหมด "ค้นหา User" (Profile Mode)
            const cleanUsername = keyword.replace('@', ''); // ตัด @ ออก
            console.log(`👤 ตรวจพบ User ID! กำลังดึงข้อมูลจากโปรไฟล์: ${cleanUsername}`);
            
            input = {
                "profiles": [cleanUsername],     // ใช้ profiles แทน hashtags
                "resultsPerPage": limit,
                "shouldDownloadCovers": false,
                "shouldDownloadSlideshowImages": false,
                "searchSection": ""
            };
        } else {
            // 👉 ถ้าไม่มี @ ให้เป็นโหมด "ค้นหา Hashtag" ตามปกติ
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

        // === STEP B: Gemini ===
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

        // 🔴 ใช้ gemini-2.5-flash ตามที่คุณสั่งเท่านั้นครับ
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiAnalysis = JSON.parse(cleanedJson);

        console.log("🤖 AI วิเคราะห์เสร็จแล้ว! กำลังเตรียมข้อมูลลง Airtable...");

        // === STEP C: จับคู่ข้อมูลลง Airtable (Mapping) ===
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
                    
                    // 👇👇👇 เพิ่มบรรทัดนี้เข้าไปครับ 👇👇👇
                    "Followers": tiktokItem.authorMeta?.fans || 0,
                    // 👆👆👆 เพิ่มบรรทัดนี้เข้าไปครับ 👆👆👆

                    "Likes": tiktokItem.diggCount || 0,
                    "Shares": tiktokItem.shareCount || 0,
                    "Comments": tiktokItem.commentCount || 0
                }
            };
        });

        // ตัดมาแค่ 10 รายการ
        const chunk = recordsToCreate.slice(0, 10);

        // 🟢🟢 [SHOW DATA] โชว์ข้อมูลใน Terminal ก่อนส่ง 🟢🟢
        console.log("\n👇👇👇 ============ [DATA PREVIEW] ============ 👇👇👇");
        console.log(JSON.stringify(chunk, null, 2)); 
        console.log("👆👆👆 ========================================== 👆👆👆\n");

        // === STEP D: ส่งขึ้น Airtable ===
        if (chunk.length > 0) {
            console.log(`🚀 กำลังส่ง ${chunk.length} รายการ ไปที่ Airtable...`);
            await base(TABLE_NAME).create(chunk);
        }

        console.log("🎉 เสร็จสิ้น! บันทึกลง Airtable เรียบร้อย");
        
        res.json({ 
            status: "success", 
            message: `Saved ${chunk.length} items to Airtable`,
            data: chunk.map(r => r.fields) 
        });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));