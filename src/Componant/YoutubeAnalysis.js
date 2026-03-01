// Componant/YoutubeAnalysis.js
// 🚧 SKELETON — รอเชื่อม YouTube API ในอนาคต
// ตอนนี้ไฟล์นี้ไม่ได้ถูกใช้ใน App.js
// การแสดงผลกราฟ YouTube ถูก handle โดย Analysis/index.js (platform="youtube") แล้ว

import React from 'react';
import { useNavigate } from 'react-router-dom';

function YoutubeAnalysis() {
    const navigate = useNavigate();

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.badge}>▶️ YouTube Analysis</div>
                <h1 style={styles.title}>กำลังพัฒนา 🚧</h1>
                <p style={styles.desc}>
                    ระบบ YouTube Analysis กำลังอยู่ในระหว่างพัฒนา<br />
                    เร็วๆ นี้จะสามารถค้นหาด้วย Keyword และ @Channel ได้
                </p>

                {/* Feature Preview */}
                <div style={styles.featureList}>
                    {[
                        { icon: '🔍', text: 'ค้นหาด้วย Keyword หรือ @Channel' },
                        { icon: '🕸️', text: 'Graph Network Influencer — Brand' },
                        { icon: '⭐', text: 'บันทึก Favorite YouTube Influencer' },
                        { icon: '🎨', text: 'Filter ตามหมวดหมู่สินค้า' },
                    ].map((f, i) => (
                        <div key={i} style={styles.featureItem}>
                            <span style={styles.featureIcon}>{f.icon}</span>
                            <span style={styles.featureText}>{f.text}</span>
                            <span style={styles.comingSoon}>Coming Soon</span>
                        </div>
                    ))}
                </div>

                <button style={styles.backBtn} onClick={() => navigate('/analysis')}>
                    ← กลับเลือก Platform
                </button>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Prompt', sans-serif",
        padding: '40px 20px',
    },
    card: {
        background: '#fff',
        borderRadius: 24,
        padding: '48px 40px',
        maxWidth: 520,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        border: '1.5px solid #e5e7eb',
    },
    badge: {
        display: 'inline-block',
        background: '#FF0000',
        color: '#fff',
        padding: '6px 20px',
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 700,
        marginBottom: 20,
    },
    title: {
        fontSize: '2rem',
        fontWeight: 800,
        color: '#1f2937',
        margin: '0 0 12px',
    },
    desc: {
        fontSize: 15,
        color: '#9ca3af',
        lineHeight: 1.7,
        margin: '0 0 32px',
    },
    featureList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 36,
        textAlign: 'left',
    },
    featureItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: '#f9fafb',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
    },
    featureIcon: { fontSize: 20, flexShrink: 0 },
    featureText: { flex: 1, fontSize: 14, color: '#374151', fontWeight: 500 },
    comingSoon: {
        fontSize: 11,
        fontWeight: 700,
        color: '#FF0000',
        background: '#fff0f0',
        padding: '3px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
    },
    backBtn: {
        width: '100%',
        padding: '14px',
        background: '#1a1a2e',
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        fontSize: 15,
        fontWeight: 600,
        fontFamily: "'Prompt', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

export default YoutubeAnalysis;