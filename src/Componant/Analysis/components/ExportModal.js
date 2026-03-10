// src/Componant/Analysis/components/ExportModal.js
import React, { useState } from 'react';

const CATEGORIES = [
    'Fashion', 'Beauty & Personal Care', 'Health & Wellness',
    'Food & Beverage', 'Mom & Kids', 'IT & Gadgets',
    'Home & Living', 'Toys & Collectibles', 'Pet', 'Automotive', 'Lifestyle'
];

function ExportModal({ isOpen, onClose, currentPlatform }) {
    const [categories, setCategories] = useState([]);
    const [keyword,    setKeyword]    = useState('');
    const [loading,    setLoading]    = useState(false);

    if (!isOpen) return null;

    const toggleCategory = (cat) => {
        setCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('platform', currentPlatform || 'tiktok');
            params.set('dataType', 'both');
            if (categories.length > 0) params.set('categories', categories.join(','));

            const kwPart = keyword.trim() ? `&keyword=${keyword.trim()}` : '';
            const res = await fetch(
                `http://localhost:5000/api/export-excel?${params.toString().replace(/%2C/g, ',')}${kwPart}`
            );
            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            const blob = await res.blob();
            const url  = window.URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `TookJaRit_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            onClose();
        } catch (err) {
            alert(`Export ล้มเหลว: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const platformLabel = currentPlatform === 'youtube' ? 'YouTube' : 'TikTok';
    const platformEmoji = currentPlatform === 'youtube' ? '▶️' : '🎵';

    return (
        <>
            <div onClick={onClose} style={s.backdrop} />
            <div style={s.modal}>
                {/* Header */}
                <div style={s.header}>
                    <div style={s.headerLeft}>
                        <div style={s.headerIcon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                stroke="#1D6F42" strokeWidth="2.5">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </div>
                        <div>
                            <h2 style={s.title}>Export ข้อมูล</h2>
                            <p style={s.subtitle}>{platformEmoji} {platformLabel} · เลือก filter ที่ต้องการ</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={s.closeBtn}>✕</button>
                </div>

                <div style={s.body}>
                    {/* Keyword */}
                    <div style={s.section}>
                        <p style={s.sectionLabel}>🔍 กรองตาม Keyword (ชื่อ Influencer / Brand)</p>
                        <input
                            type="text"
                            placeholder="เช่น nike, soundtiss — คั่นด้วย , หรือ เว้นวรรค"
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            style={s.input}
                        />
                    </div>

                    {/* Category */}
                    <div style={s.section}>
                        <p style={s.sectionLabel}>🎨 Category (ไม่เลือก = ทุก Category)</p>
                        <div style={s.catGrid}>
                            {CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => toggleCategory(cat)} style={{
                                    padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                                    border: `2px solid ${categories.includes(cat) ? '#e17055' : '#e0e0e0'}`,
                                    background: categories.includes(cat) ? '#e1705518' : '#fafafa',
                                    color: categories.includes(cat) ? '#e17055' : '#666',
                                    fontWeight: categories.includes(cat) ? 700 : 500,
                                    fontSize: 12, fontFamily: "'Prompt', sans-serif",
                                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                                }}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                        {categories.length > 0 && (
                            <button onClick={() => setCategories([])} style={s.clearBtn}>
                                ✕ ล้าง Category ที่เลือก ({categories.length})
                            </button>
                        )}
                    </div>

                    {/* Summary */}
                    <div style={s.summary}>
                        <span>📊</span>
                        <span style={{ fontSize: 13, color: '#555' }}>
                            จะ Export: <b>{platformEmoji} {platformLabel}</b>
                            {categories.length > 0 && <> · <b>{categories.length} Categories</b></>}
                            {keyword.trim() && <> · keyword "<b>{keyword.trim()}</b>"</>}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div style={s.footer}>
                    <button onClick={onClose} style={s.cancelBtn}>ยกเลิก</button>
                    <button onClick={handleExport} disabled={loading} style={loading ? { ...s.exportBtn, opacity: 0.7, cursor: 'not-allowed' } : s.exportBtn}>
                        {loading ? (
                            <><Spinner /> กำลัง Export...</>
                        ) : (
                            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>Export Excel</>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

function Spinner() {
    // inject keyframe once
    if (typeof document !== 'undefined' && !document.getElementById('modal-spin')) {
        const st = document.createElement('style');
        st.id = 'modal-spin';
        st.textContent = '@keyframes mspin { to { transform: rotate(360deg); } }';
        document.head.appendChild(st);
    }
    return (
        <span style={{
            display: 'inline-block', width: 15, height: 15,
            border: '2px solid rgba(255,255,255,0.4)',
            borderTop: '2px solid #fff', borderRadius: '50%',
            animation: 'mspin 0.7s linear infinite', marginRight: 8, verticalAlign: 'middle'
        }} />
    );
}

const s = {
    backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 99998 },
    modal: {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(520px, 95vw)', maxHeight: '88vh', overflowY: 'auto',
        background: '#fff', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        zIndex: 99999, fontFamily: "'Prompt', sans-serif",
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0',
        position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '20px 20px 0 0',
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    headerIcon: { width: 44, height: 44, borderRadius: 12, background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title:    { fontSize: 18, fontWeight: 800, color: '#111', margin: 0 },
    subtitle: { fontSize: 12, color: '#999', margin: '2px 0 0' },
    closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#aaa', padding: 4 },
    body:     { padding: '20px 24px' },
    section:  { marginBottom: 20 },
    sectionLabel: { fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 10, fontFamily: "'Prompt', sans-serif" },
    catGrid:  { display: 'flex', flexWrap: 'wrap', gap: 7 },
    input: {
        width: '100%', padding: '10px 14px', border: '2px solid #e8e8e8', borderRadius: 10,
        fontSize: 13, fontFamily: "'Prompt', sans-serif", color: '#333', outline: 'none', boxSizing: 'border-box',
    },
    clearBtn: { marginTop: 8, background: 'none', border: 'none', color: '#e17055', fontSize: 12, cursor: 'pointer', fontFamily: "'Prompt', sans-serif", fontWeight: 600, padding: 0 },
    summary: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
        background: '#f8f9ff', borderRadius: 12, border: '1px solid #e8eaff',
    },
    footer: {
        display: 'flex', justifyContent: 'flex-end', gap: 10,
        padding: '16px 24px', borderTop: '1px solid #f0f0f0',
        position: 'sticky', bottom: 0,
        background: '#fff', borderRadius: '0 0 20px 20px',
    },
    cancelBtn: {
        padding: '10px 20px', borderRadius: 10, border: '2px solid #e0e0e0',
        background: '#fff', color: '#666', fontWeight: 600, fontSize: 14,
        cursor: 'pointer', fontFamily: "'Prompt', sans-serif",
    },
    exportBtn: {
        display: 'inline-flex', alignItems: 'center', padding: '10px 24px',
        borderRadius: 10, border: 'none',
        background: 'linear-gradient(135deg, #1D6F42 0%, #217346 100%)',
        color: '#fff', fontWeight: 700, fontSize: 14,
        cursor: 'pointer', fontFamily: "'Prompt', sans-serif",
        boxShadow: '0 4px 12px rgba(29,111,66,0.3)',
    },
};

export default ExportModal;