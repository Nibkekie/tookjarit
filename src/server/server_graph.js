require('dotenv').config();
const express = require('express');
const neo4j = require('neo4j-driver');
const app = express();
const port = 5000;

// 1. อนุญาตให้หน้าเว็บ (CORS) เข้าถึงได้แน่นอน 100%
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // ให้ทุกคนเข้าได้
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    console.log(`📡 มีการเรียกข้อมูลเข้ามาจาก: ${req.method} ${req.url}`); // โชว์ใน Terminal ว่ามีคนเรียก
    next();
});

// 2. เชื่อมต่อ Neo4j (รองรับทั้ง s และ ssc)
const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

app.get('/api/graph-data', async (req, res) => {
    const session = driver.session();
    try {
        console.log("🔍 กำลังค้นหาข้อมูลใน Neo4j...");
        
        // 3. Query ข้อมูล (เจาะจง Influencer และ Brand ตามที่คุณเพิ่งอัปโหลด)
        const result = await session.run(`
            MATCH (n)-[r]->(m)
            RETURN n, r, m
            LIMIT 300
        `);

        // แปลงข้อมูลให้ React เข้าใจง่ายๆ
        const nodes = [];
        const links = [];
        const seenNodes = new Set();

        result.records.forEach(record => {
            const n = record.get('n');
            const m = record.get('m');
            const r = record.get('r');

            // เก็บ Node ต้นทาง
            if (!seenNodes.has(n.elementId)) {
                nodes.push({
                    id: n.elementId,
                    name: n.properties.name || "Unknown",
                    category: n.labels.includes("Category") ? n.properties.name : (n.labels[0] || "Unknown"),
                    type: n.labels[0],
                    val: n.labels.includes("Influencer") ? 20 : 10 // Influencer วงใหญ่หน่อย
                });
                seenNodes.add(n.elementId);
            }

            // เก็บ Node ปลายทาง
            if (!seenNodes.has(m.elementId)) {
                nodes.push({
                    id: m.elementId,
                    name: m.properties.name || "Unknown",
                    category: m.labels.includes("Category") ? m.properties.name : (m.labels[0] || "Unknown"),
                    type: m.labels[0],
                    val: 10
                });
                seenNodes.add(m.elementId);
            }

            // เก็บเส้นเชื่อม
            links.push({
                source: n.elementId,
                target: m.elementId,
                type: r.type
            });
        });

        console.log(`✅ เจอข้อมูลทั้งหมด: ${nodes.length} Nodes, ${links.length} Links`);
        console.log("📤 กำลังส่งข้อมูลไปให้หน้าเว็บ...");
        
        res.json({ nodes, links });

    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาด:", error);
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

app.listen(port, () => {
    console.log(`🚀 Server พร้อมทำงานที่ http://localhost:${port}`);
    console.log(`📝 เชื่อมต่อ Database: ${process.env.NEO4J_URI}`);
});