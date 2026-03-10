// src/server/SearchHistory.js
const mongoose = require('mongoose');

const SearchHistorySchema = new mongoose.Schema({
    keyword:     { type: String, required: true },
    platform:    { type: String, required: true, enum: ['tiktok', 'youtube'] },
    lastSearched:{ type: Date,   default: Date.now },
});

// unique ต่อ keyword+platform
SearchHistorySchema.index({ keyword: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('SearchHistory', SearchHistorySchema);
