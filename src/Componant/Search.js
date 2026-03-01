// Componant/Search.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "./LoadingOverlay";

function Search() {
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSearch = async () => {
        if (!inputValue.trim()) return alert("กรุณาพิมพ์คำค้นหาก่อนครับ");
        navigate('/analysis');
    };

    return (
        <section style={styles.hero}>
            <LoadingOverlay isLoading={loading} />

            {/* Blobs */}
            <div style={styles.blobWrap}>
                <div style={{ ...styles.blob, ...styles.blob1 }} />
                <div style={{ ...styles.blob, ...styles.blob2 }} />
                <div style={{ ...styles.blob, ...styles.blob3 }} />
            </div>

            {/* Eyebrow Badge */}
            <div style={styles.eyebrow}>
                <span style={styles.eyebrowDot}></span>
                Influencer Analytics Platform
            </div>

            {/* Hero Title */}
            <h1 style={styles.title}>
                หาอินฟู <span style={styles.highlight}>#ถูกจริต</span><br />
                &amp; เพื่อธุรกิจที่ปังกว่า 🚀
            </h1>

            {/* Subtitle */}
            <p style={styles.sub}>
                แมปความสัมพันธ์ระหว่าง Influencer กับแบรนด์ด้วย Graph Network ที่เข้าใจง่าย
            </p>

            {/* Search Box */}
            <div style={styles.searchBox}>
                <span style={styles.searchEmoji}>🔍</span>
                <input
                    type="text"
                    placeholder="#beauty หรือ @username..."
                    style={styles.input}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button style={styles.searchBtn} onClick={handleSearch} disabled={loading}>
                    {loading ? '...' : 'ค้นหา'}
                </button>
            </div>

            {/* Platform Pills */}
            <div style={styles.pills}>
                <button style={styles.pillTiktok} onClick={() => navigate('/analysis/tiktok')}>
                    🎵 TikTok
                </button>
                <button style={styles.pillYoutube} onClick={() => navigate('/analysis/youtube')}>
                    ▶️ YouTube
                </button>
            </div>

            {/* Stats Section */}
            <div style={styles.statsGrid}>
                {[
                    { num: '500+', label: 'Influencers ในระบบ', color: '#FF4757' },
                    { num: '11',   label: 'หมวดหมู่สินค้า',    color: '#6BCB77' },
                    { num: '2',    label: 'Platform ที่รองรับ', color: '#4ECDC4' },
                    { num: 'Real-time', label: 'Graph Network', color: '#FF6B9D' },
                ].map((s, i) => (
                    <div key={i} style={styles.statCard}>
                        <div style={{ ...styles.statNum, color: s.color }}>{s.num}</div>
                        <div style={styles.statLabel}>{s.label}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

const styles = {
    hero: {
        position: 'relative',
        overflow: 'hidden',
        background: '#f9fafb',
        padding: '80px 32px 60px',
        textAlign: 'center',
        fontFamily: "'Prompt', sans-serif",
    },

    /* Blobs */
    blobWrap: { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' },
    blob: { position: 'absolute', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.2 },
    blob1: { width: 400, height: 400, background: '#FF4757', top: -100, left: -100 },
    blob2: { width: 300, height: 300, background: '#FFD93D', top: 50, right: -50 },
    blob3: { width: 250, height: 250, background: '#6BCB77', bottom: -50, left: '30%' },

    /* Eyebrow */
    eyebrow: {
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#fff', border: '1.5px solid #e5e7eb',
        borderRadius: 999, padding: '6px 16px',
        fontSize: 13, fontWeight: 500, color: '#6b7280',
        marginBottom: 24,
    },
    eyebrowDot: {
        width: 8, height: 8, borderRadius: '50%',
        background: '#6BCB77', display: 'inline-block',
        animation: 'pulse 2s infinite',
    },

    /* Title */
    title: {
        fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
        fontWeight: 700, lineHeight: 1.2,
        color: '#1f2937', margin: '0 0 20px',
    },
    highlight: {
        color: '#FF4757',
        borderBottom: '6px solid #FFD93D',
        paddingBottom: 2,
    },

    /* Sub */
    sub: {
        fontSize: '1.05rem', color: '#6b7280',
        maxWidth: 520, margin: '0 auto 40px',
        lineHeight: 1.7,
    },

    /* Search Box */
    searchBox: {
        display: 'flex', gap: 12,
        maxWidth: 560, margin: '0 auto 20px',
        background: '#fff',
        border: '2px solid #e5e7eb',
        borderRadius: 999,
        padding: '6px 6px 6px 20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        alignItems: 'center',
    },
    searchEmoji: { fontSize: 18 },
    input: {
        flex: 1, border: 'none', outline: 'none',
        fontSize: 15, fontFamily: "'Prompt', sans-serif",
        background: 'transparent', color: '#1f2937',
    },
    searchBtn: {
        padding: '12px 24px',
        background: '#1a1a2e', color: '#fff',
        border: 'none', borderRadius: 999,
        fontSize: 14, fontWeight: 600,
        fontFamily: "'Prompt', sans-serif",
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all 0.2s',
    },

    /* Platform Pills */
    pills: {
        display: 'flex', justifyContent: 'center',
        gap: 10, marginBottom: 60, flexWrap: 'wrap',
    },
    pillTiktok: {
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 999,
        background: '#1a1a2e', color: '#fff', border: 'none',
        fontSize: 14, fontWeight: 600,
        fontFamily: "'Prompt', sans-serif",
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(26,26,46,0.3)',
        transition: 'all 0.2s',
    },
    pillYoutube: {
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 999,
        background: '#FF0000', color: '#fff', border: 'none',
        fontSize: 14, fontWeight: 600,
        fontFamily: "'Prompt', sans-serif",
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(255,0,0,0.3)',
        transition: 'all 0.2s',
    },

    /* Stats */
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16, maxWidth: 800, margin: '0 auto',
    },
    statCard: {
        background: '#fff', borderRadius: 20,
        padding: '28px 24px', textAlign: 'center',
        border: '1.5px solid #e5e7eb',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        transition: 'transform 0.2s',
    },
    statNum: {
        fontSize: '2.2rem', fontWeight: 700,
        fontFamily: "'Prompt', sans-serif",
    },
    statLabel: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
};

export default Search;