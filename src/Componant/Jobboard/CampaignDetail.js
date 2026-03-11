// src/Componant/Jobboard/CampaignDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Jobboard.css';

const API = 'http://localhost:5000';

const JOB_TYPE_LABEL = {
    freelance: { text: 'ฟรีแลนซ์', color: '#6c5ce7', bg: '#f0eeff', icon: '💼' },
    contract:  { text: 'สัญญาจ้าง', color: '#e17055', bg: '#fff3f0', icon: '📝' },
    parttime:  { text: 'พาร์ทไทม์', color: '#00b894', bg: '#f0fff8', icon: '⏰' },
};
const CATEGORY_EMOJI = {
    'Fashion': '👗', 'Beauty & Personal Care': '💄', 'Health & Wellness': '💊',
    'Food & Beverage': '🍜', 'Mom & Kids': '👶', 'IT & Gadgets': '📱',
    'Home & Living': '🏠', 'Toys & Collectibles': '🧸', 'Pet': '🐾',
    'Automotive': '🚗', 'Lifestyle': '✨',
};

function getTimeAgo(dateStr) {
    if (!dateStr) return '-';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'เมื่อกี้นี้';
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    const days = Math.floor(diff / 86400);
    if (days < 30) return `${days} วันที่แล้ว`;
    return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CampaignDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [message, setMessage] = useState('');
    const [applied, setApplied] = useState(false);
    const [currentImg, setCurrentImg] = useState(0);
    const isLoggedIn = !!localStorage.getItem('token');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API}/api/campaigns/${id}`);
                if (!res.ok) throw new Error();
                const data = await res.json();
                setCampaign(data);
                const token = localStorage.getItem('token');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        setApplied(data.applicants?.some(a => a.userId === payload.id));
                    } catch {}
                }
            } catch { setCampaign(null); }
            finally { setLoading(false); }
        })();
    }, [id]);

    const handleApply = async () => {
        if (!isLoggedIn) { navigate('/login'); return; }
        setApplying(true);
        try {
            const res = await fetch(`${API}/api/campaigns/${id}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ message }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setApplied(true);
            alert('สมัครเข้าร่วมแคมเปญเรียบร้อย! 🎉');
        } catch (err) { alert(err.message); }
        finally { setApplying(false); }
    };

    if (loading) return (
        <div className="jobboard-page">
            <div className="jobboard-loading"><div className="jobboard-spinner" /><p>กำลังโหลด...</p></div>
        </div>
    );
    if (!campaign) return (
        <div className="jobboard-page">
            <div className="jobboard-empty">
                <span style={{ fontSize: 48 }}>😕</span>
                <p>ไม่พบแคมเปญนี้</p>
                <button className="jobboard-back-btn" onClick={() => navigate('/jobboard')}>← กลับ Jobboard</button>
            </div>
        </div>
    );

    const c = campaign;
    const jobInfo = JOB_TYPE_LABEL[c.jobType] || JOB_TYPE_LABEL.freelance;
    const hasImages = c.images && c.images.length > 0;

    return (
        <div className="jobboard-page">
            <div className="detail-container">
                <button className="jobboard-back-btn" onClick={() => navigate('/jobboard')}>← กลับ Jobboard</button>
                <div className="detail-layout">
                    {/* Main */}
                    <div className="detail-main">
                        {hasImages && (
                            <div className="detail-gallery">
                                <img src={c.images[currentImg]} alt={c.title} className="detail-main-image" onError={e => { e.target.style.display = 'none'; }} />
                                {c.images.length > 1 && (
                                    <div className="detail-thumbs">
                                        {c.images.map((img, i) => (
                                            <img key={i} src={img} alt="" className={`detail-thumb ${i === currentImg ? 'active' : ''}`} onClick={() => setCurrentImg(i)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="detail-title-section">
                            <div className="campaign-card-tags">
                                <span className="campaign-tag" style={{ color: jobInfo.color, background: jobInfo.bg }}>{jobInfo.icon} {jobInfo.text}</span>
                                <span className="campaign-tag-category">{CATEGORY_EMOJI[c.category]} {c.category}</span>
                                <span className="detail-status-badge">{c.status === 'open' ? '🟢 เปิดรับ' : '🔴 ปิดแล้ว'}</span>
                            </div>
                            <h1 className="detail-title">{c.title}</h1>
                            <p className="detail-time">โพสต์เมื่อ {getTimeAgo(c.createdAt)}</p>
                        </div>
                        <div className="detail-desc-section">
                            <h3 className="detail-section-title">รายละเอียดงาน</h3>
                            <p className="detail-desc-text">{c.description}</p>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="detail-sidebar">
                        <div className="detail-side-card">
                            <div className="detail-author-row">
                                <div className="campaign-card-avatar">{c.author?.name?.[0]?.toUpperCase() || '?'}</div>
                                <div>
                                    <div className="detail-author-name">{c.author?.name}</div>
                                    <div className="detail-author-label">ผู้ประกาศ</div>
                                </div>
                            </div>
                        </div>
                        {c.budget > 0 && (
                            <div className="detail-side-card">
                                <div className="detail-budget-label">งบประมาณ</div>
                                <div className="detail-budget-value">฿{c.budget.toLocaleString()}</div>
                            </div>
                        )}
                        <div className="detail-side-card">
                            <div style={{ fontSize: 13, color: '#888' }}>👥 ผู้สนใจ {c.applicants?.length || 0} คน</div>
                        </div>
                        <div className="detail-side-card">
                            {applied ? (
                                <div className="detail-applied-badge">✅ คุณสมัครแล้ว</div>
                            ) : c.status !== 'open' ? (
                                <div style={{ color: '#999', textAlign: 'center', fontSize: 14 }}>แคมเปญนี้ปิดรับสมัครแล้ว</div>
                            ) : (
                                <>
                                    <textarea placeholder="แนะนำตัวสั้นๆ... (ไม่บังคับ)" value={message} onChange={e => setMessage(e.target.value)} className="detail-apply-textarea" rows={3} />
                                    <button className="detail-apply-btn" onClick={handleApply} disabled={applying}>
                                        {applying ? 'กำลังสมัคร...' : isLoggedIn ? '🚀 เสนองาน' : 'เข้าสู่ระบบเพื่อสมัคร'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CampaignDetail;
