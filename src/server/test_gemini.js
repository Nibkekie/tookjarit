// imports
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// 👇👇 แก้ชื่อโมเดลที่ "เพื่อนแนะนำ" ตรงนี้ได้เลยครับ 👇👇
// เราจะลองหลายๆ ชื่อ เพื่อดูว่าอันไหนใช้ได้
const CANDIDATE_MODELS = [
  "gemini-3.0-flash",
  "gemini-3.0-flash-001",
  "gemini-2.0-flash-exp",
  "gemini-2.5-flash",
  "gemini-2.5-flash-001",
  "gemini-2.5-pro"
];

async function testGeminiConnection() {
  console.log("==========================================");
  console.log(`🚀 กำลังทดสอบหา Model ที่ใช้งานได้...`);
  console.log("==========================================\n");

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ไม่พบ GEMINI_API_KEY ในไฟล์ .env");
    return;
  }

  console.log(`🔑 API Key ที่อ่านได้: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + "..." : "ไม่พบ"}`);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const prompt = "ขอ 1 ประโยคสั้นๆ ทักทายชาวโลกหน่อย";

  for (const modelName of CANDIDATE_MODELS) {
    console.log(`👉 กำลังลองเชื่อมต่อ: "${modelName}" ...`);
    
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log(`\n✅ สำเร็จ! โมเดลที่ใช้ได้คือ: "${modelName}"`);
      console.log("🤖 AI ตอบกลับมาว่า:", text.trim());
      console.log("------------------------------------------");
      console.log(`💡 คำแนะนำ: ให้ไปแก้ใน server.js เป็น: "${modelName}"`);
      return; // เจอแล้ว จบการทำงานเลย

    } catch (error) {
      console.log(`❌ "${modelName}" ใช้ไม่ได้`);
      console.log(`   💥 Error: ${error.message}`);
      
      if (error.message.includes("API key")) {
          console.error("   🔴 API Key ผิดพลาด หรือ Key นี้ไม่มีสิทธิ์ใช้โมเดลนี้");
      } else if (error.message.includes("suspended")) {
          console.error("   🔴 Account Suspended: API Key นี้ถูกระงับ");
          break; // ถ้าโดนระงับ ไม่ต้องลองตัวอื่นแล้ว
      }
    }
    console.log("------------------------------------------");
  }

  console.log("\n❌ ไม่พบโมเดลที่ใช้งานได้เลย กรุณาเช็ก API Key หรือสร้างใหม่");
}

testGeminiConnection();