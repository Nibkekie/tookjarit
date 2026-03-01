// User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    favorites: [
        {
            influencerName: { type: String, required: true },
            platform: { type: String, enum: ['tiktok', 'youtube'], default: 'tiktok' }, // ✅ เพิ่ม platform
            addedAt: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

// ✅ ไม่ใช้ next() — mongoose รองรับ async/await โดยตรง
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);