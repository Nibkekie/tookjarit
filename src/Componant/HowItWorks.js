// Componant/HowItWorks.js
import React, { useEffect, useRef } from 'react';

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
    const cardRefs = useRef([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('hiw-visible');
                    }
                });
            },
            { threshold: 0.15 }
        );

        cardRefs.current.forEach((el) => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, []);

    return (
        <>
            {/* inject CSS once */}
            <style>{`
                .hiw-card {
                    opacity: 0;
                    transform: translateY(40px);
                    transition: opacity 0.6s ease, transform 0.6s ease, box-shadow 0.2s;
                }
                .hiw-card.hiw-visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                .hiw-card:nth-child(2) { transition-delay: 0.1s; }
                .hiw-card:nth-child(3) { transition-delay: 0.2s; }
                .hiw-card:hover {
                    transform: translateY(-6px) !important;
                    box-shadow: 0 12px 36px rgba(0,0,0,0.10) !important;
                }
            `}</style>

            <section style={styles.section}>
                {/* same gradient blob bg as hero */}
                <div style={styles.bgBlob1} />
                <div style={styles.bgBlob2} />

                <div style={styles.inner}>
                    <h2 style={styles.title}>ใช้งานยังไง? 🤔</h2>
                    <p style={styles.sub}>3 ขั้นตอนง่ายๆ ก็เจออินฟูในดวงใจแล้ว</p>

                    <div style={styles.grid}>
                        {STEPS.map((s, i) => (
                            <div
                                key={s.step}
                                className="hiw-card"
                                ref={(el) => (cardRefs.current[i] = el)}
                                style={styles.card}
                            >
                                <div style={styles.watermark}>{s.step}</div>
                                <div style={styles.icon}>{s.icon}</div>
                                <h3 style={styles.cardTitle}>{s.title}</h3>
                                <p style={styles.cardDesc}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}

const styles = {
    section: {
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 32px 100px',
        // gradient เหมือนส่วน hero
        background: 'linear-gradient(160deg, #f0fdf4 0%, #f8faff 50%, #fdf2f8 100%)',
        fontFamily: "'Prompt', sans-serif",
    },
    // blob ซ้ายบน (เขียวอ่อน)
    bgBlob1: {
        position: 'absolute',
        top: -80, left: -80,
        width: 340, height: 340,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(134,239,172,0.25) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    // blob ขวาล่าง (ชมพูอ่อน)
    bgBlob2: {
        position: 'absolute',
        bottom: -80, right: -60,
        width: 300, height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249,168,212,0.22) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    inner: {
        position: 'relative',
        maxWidth: 1000,
        margin: '0 auto',
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
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)',
        borderRadius: 20,
        padding: '32px 24px',
        textAlign: 'center',
        border: '1.5px solid rgba(255,255,255,0.9)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
    },
    watermark: {
        position: 'absolute',
        top: -10, right: 12,
        fontSize: '5rem', fontWeight: 700,
        color: '#f3f4f6', lineHeight: 1,
        userSelect: 'none', pointerEvents: 'none',
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