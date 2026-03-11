// src/Componant/Jobboard/CreateCampaign.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Jobboard.css';

const API = 'http://localhost:5000';

const CATEGORIES = [
    'Fashion', 'Beauty & Personal Care', 'Health & Wellness',
    'Food & Beverage', 'Mom & Kids', 'IT & Gadgets',
    'Home & Living', 'Toys & Collectibles', 'Pet', 'Automotive', 'Lifestyle',
];
const CATEGORY_EMOJI = {
    'Fashion': '👗', 'Beauty & Personal Care': '💄', 'Health & Wellness': '💊',
    'Food & Beverage': '🍜', 'Mom & Kids': '👶', 'IT & Gadgets': '📱',
    'Home & Living': '🏠', 'Toys & Collectibles': '🧸', 'Pet': '🐾',
    'Automotive': '🚗', 'Lifestyle': '✨',
};

function CreateCampaign() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [imageURLs, setImageURLs] = useState(['']);
    const [form, setForm] = useState({ title: '', description: '', budget: '', category: '', jobType: 'freelance' });

    useEffect(() => {
        if (!localStorage.getItem('token')) { alert('กรุณาเข้าสู่ระบบก่อนโพสต์แคมเปญ'); navigate('/login'); }
    }, [navigate]);

    const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
    const addImageField = () => { if (imageURLs.length < 5) setImageURLs(prev => [...prev, '']); };
    const updateImage = (idx, value) => setImageURLs(prev => { const c = [...prev]; c[idx] = value; return c; });
    const removeImage = (idx) => setImageURLs(prev => prev.filter((_, i) => i !== idx));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.description || !form.category) { alert('กรุณากรอก ชื่องาน, รายละเอียด, และหมวดหมู่'); return; }
        setLoading(true);
        try {
            const body = { ...form, budget: parseInt(form.budget) || 0, images: imageURLs.filter(u => u.trim()) };
            const res = await fetch(`${API}/api/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            alert('โพสต์แคมเปญเรียบร้อย! 🎉');
            navigate('/jobboard');
        } catch (err) { alert(err.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="jobboard-page">
            <div className="create-container">
                <button className="jobboard-back-btn" onClick={() => navigate('/jobboard')}>← กลับ Jobboard</button>
                <div className="create-form-card">
                    <h1 className="create-form-title">📝 สร้างแคมเปญใหม่</h1>
                    <p className="create-form-sub">โพสต์งานเพื่อหา Influencer โปรโมทสินค้าของคุณ</p>

                    <form onSubmit={handleSubmit}>
                        {/* ชื่องาน */}
                        <div className="create-field">
                            <label className="create-label">ชื่องาน *</label>
                            <input type="text" placeholder="เช่น หาคนรีวิวครีมกันแดด, ชวนปักตะกร้าใน TikTok" value={form.title} onChange={e => updateForm('title', e.target.value)} className="create-input" maxLength={120} />
                            <span className="create-char-count">{form.title.length}/120</span>
                        </div>

                        {/* รายละเอียด */}
                        <div className="create-field">
                            <label className="create-label">รายละเอียดงาน *</label>
                            <textarea placeholder={"อธิบายรายละเอียดแคมเปญ เช่น:\n• สิ่งที่คุณจะได้รับ\n• รูปแบบการรีวิว\n• เงื่อนไขการโพสต์\n• ช่องทางที่ต้องโพสต์ (IG / Reels / TikTok / Facebook)"} value={form.description} onChange={e => updateForm('description', e.target.value)} className="create-input create-textarea" maxLength={3000} />
                            <span className="create-char-count">{form.description.length}/3000</span>
                        </div>

                        {/* หมวดหมู่ */}
                        <div className="create-field">
                            <label className="create-label">หมวดหมู่สินค้า *</label>
                            <div className="create-category-grid">
                                {CATEGORIES.map(cat => (
                                    <button key={cat} type="button" className={`create-cat-option ${form.category === cat ? 'active' : ''}`} onClick={() => updateForm('category', cat)}>
                                        <span style={{ fontSize: 20 }}>{CATEGORY_EMOJI[cat]}</span>
                                        <span>{cat}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ลักษณะการจ้าง */}
                        <div className="create-field">
                            <label className="create-label">ลักษณะการจ้าง</label>
                            <div className="create-jobtype-row">
                                {[
                                    { value: 'freelance', label: '💼 ฟรีแลนซ์', desc: 'จ้างเป็นงานๆ' },
                                    { value: 'contract',  label: '📝 สัญญาจ้าง', desc: 'รายเดือน/รายปี' },
                                    { value: 'parttime',  label: '⏰ พาร์ทไทม์', desc: 'รายชั่วโมง/รายวัน' },
                                ].map(jt => (
                                    <button key={jt.value} type="button" className={`create-jobtype-card ${form.jobType === jt.value ? 'active' : ''}`} onClick={() => updateForm('jobType', jt.value)}>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{jt.label}</div>
                                        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{jt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* งบประมาณ */}
                        <div className="create-field">
                            <label className="create-label">งบประมาณ (บาท)</label>
                            <div className="create-budget-wrap">
                                <span className="create-budget-prefix">฿</span>
                                <input type="number" placeholder="0" value={form.budget} onChange={e => updateForm('budget', e.target.value)} className="create-budget-input" min={0} />
                            </div>
                        </div>

                        {/* รูปภาพ */}
                        <div className="create-field">
                            <label className="create-label">รูปภาพสินค้า / โปสเตอร์ (URL) <span className="create-label-hint">— สูงสุด 5 รูป</span></label>
                            {imageURLs.map((url, i) => (
                                <div key={i} className="create-image-row">
                                    <input type="url" placeholder="https://example.com/image.jpg" value={url} onChange={e => updateImage(i, e.target.value)} className="create-input" style={{ marginBottom: 0 }} />
                                    {imageURLs.length > 1 && <button type="button" className="create-remove-img-btn" onClick={() => removeImage(i)}>✕</button>}
                                </div>
                            ))}
                            {imageURLs.length < 5 && <button type="button" className="create-add-image-btn" onClick={addImageField}>＋ เพิ่มรูป</button>}
                            {imageURLs.some(u => u.trim()) && (
                                <div className="create-preview-row">
                                    {imageURLs.filter(u => u.trim()).map((url, i) => (
                                        <img key={i} src={url} alt="" className="create-preview-thumb" onError={e => { e.target.style.display = 'none'; }} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <button type="submit" className="create-submit-btn" disabled={loading}>
                            {loading ? 'กำลังโพสต์...' : '🚀 โพสต์แคมเปญ'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CreateCampaign;
