// src/models/Influencer.js
const mongoose = require('mongoose');

const InfluencerSchema = new mongoose.Schema({
    // --- 👤 ข้อมูลส่วนตัว ---
    authorName: { type: String, required: true },
    authorAvatar: { type: String, default: '' },
    followers: { type: Number, default: 0 },
    platform: { type: String, default: 'tiktok' },

    // --- 📝 ข้อมูลคอนเทนต์ (เพิ่ม Caption & Link) ---
    videoId: { type: String },              // ✅ เพิ่ม: Video ID
    caption: { type: String, default: '' }, // ✅ เพิ่ม: Caption (สำคัญ!)
    videoUrl: { type: String, default: '' },// ✅ เพิ่ม: Video URL (เอาไว้กดดูคลิป)

    // --- 📊 Metrics (เพิ่ม Share/Comment) ---
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 }, // ✅ เพิ่ม: Comments
    totalShares: { type: Number, default: 0 },    // ✅ เพิ่ม: Shares
    
    // --- 🏷️ สินค้าและหมวดหมู่ ---
    brand: { type: String, default: '' },
    productType: { type: String, default: '' },   // ✅ เพิ่ม: Product Type
    category: { type: String, default: '' },      // (Main Category)
    
    // วันที่และอื่นๆ
    updatedAt: { type: Date, default: Date.now }
});

InfluencerSchema.index({ videoId: 1, platform: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Influencer', InfluencerSchema);