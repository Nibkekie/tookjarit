// src/server/Campaign.js
const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
    // ── ผู้โพสต์ ──
    author: {
        userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name:     { type: String, required: true },
        email:    { type: String, default: '' },
    },

    // ── ข้อมูลแคมเปญ ──
    title:       { type: String, required: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 3000 },
    budget:      { type: Number, default: 0 },
    currency:    { type: String, default: 'THB' },

    // ── หมวดหมู่ ──
    category: {
        type: String,
        enum: [
            'Fashion', 'Beauty & Personal Care', 'Health & Wellness',
            'Food & Beverage', 'Mom & Kids', 'IT & Gadgets',
            'Home & Living', 'Toys & Collectibles', 'Pet',
            'Automotive', 'Lifestyle',
        ],
        required: true,
    },

    // ── ลักษณะการจ้าง ──
    jobType: {
        type: String,
        enum: ['freelance', 'contract', 'parttime'],
        default: 'freelance',
    },

    // ── รูปภาพ (URL) สูงสุด 5 รูป ──
    images: [{ type: String }],

    // ── สถานะ ──
    status: {
        type: String,
        enum: ['open', 'closed', 'draft'],
        default: 'open',
    },

    // ── ผู้สมัคร ──
    applicants: [{
        userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name:      { type: String },
        appliedAt: { type: Date, default: Date.now },
        message:   { type: String, default: '' },
    }],

}, { timestamps: true });

CampaignSchema.index({ status: 1, createdAt: -1 });
CampaignSchema.index({ category: 1 });
CampaignSchema.index({ 'author.userId': 1 });

module.exports = mongoose.model('Campaign', CampaignSchema);
