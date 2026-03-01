// Componant/HowItWorks.js
import React from 'react';

const STEPS = [
    {
        icon: '🔎',
        step: '1',
        title: 'ค้นหา',
        desc: 'พิมพ์ #hashtag หรือ @username บน TikTok หรือ YouTube ที่สนใจ',
    },
    {
        icon: '🕸️',
        step: '2',
        title: 'วิเคราะห์กราฟ',
        desc: 'ดูเครือข่ายความสัมพันธ์ระหว่าง Influencer กับแบรนด์แบบ visual',
    },
    {
        icon: '⭐',
        step: '3',
        title: 'บันทึก Favorite',
        desc: 'กด ⭐ เพื่อบันทึกอินฟูที่ถูกใจไว้ ดูได้ทุกเมื่อในหน้า Favorites',
    },
];

function HowItWorks() {
    return (
        <section style={styles.section}>
            <h2 style={styles.title}>ใช้งานยังไง? 🤔</h2>
            <p style={styles.sub}>3 ขั้นตอนง่ายๆ ก็เจออินฟูในดวงใจแล้ว</p>

            <div style={styles.grid}>
                {STEPS.map((s) => (
                    <div key={s.step} style={styles.card} data-step={s.step}>
                        {/* Big number watermark */}
                        <div style={styles.watermark}>{s.step}</div>

                        <div style={styles.icon}>{s.icon}</div>
                        <h3 style={styles.cardTitle}>{s.title}</h3>
                        <p style={styles.cardDesc}>{s.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

const styles = {
    section: {
        padding: '60px 32px 80px',
        maxWidth: 1000,
        margin: '0 auto',
        fontFamily: "'Prompt', sans-serif",
    },
    title: {
        fontSize: '1.8rem', fontWeight: 700,
        textAlign: 'center', color: '#1f2937',
        margin: '0 0 8px',
    },
    sub: {
        textAlign: 'center', color: '#9ca3af',
        fontSize: 15, margin: '0 0 48px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 24,
    },
    card: {
        background: '#fff',
        borderRadius: 20,
        padding: '32px 24px',
        textAlign: 'center',
        border: '1.5px solid #e5e7eb',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    watermark: {
        position: 'absolute',
        top: -10, right: 12,
        fontSize: '5rem', fontWeight: 700,
        color: '#f3f4f6', lineHeight: 1,
        fontFamily: "'Prompt', sans-serif",
        userSelect: 'none',
        pointerEvents: 'none',
    },
    icon: { fontSize: '2.5rem', marginBottom: 16 },
    cardTitle: {
        fontSize: '1rem', fontWeight: 700,
        color: '#1f2937', margin: '0 0 8px',
    },
    cardDesc: {
        fontSize: 13, color: '#9ca3af',
        lineHeight: 1.6, margin: 0,
    },
};

export default HowItWorks;