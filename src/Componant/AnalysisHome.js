// Componant/AnalysisHome.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AnalysisHome() {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(null);

    return (
        <div style={styles.page}>
            <div style={styles.bgGrid} />
            <div style={styles.inner}>
                <p style={styles.eyebrow}>เลือก Platform ที่ต้องการวิเคราะห์</p>
                <h1 style={styles.title}>
                    วิเคราะห์เครือข่าย<br />
                    <span style={styles.accent}>Influencer</span>
                </h1>
                <p style={styles.subtitle}>
                    ค้นหาและแมปความสัมพันธ์ระหว่าง Influencer กับแบรนด์<br />
                    บน TikTok และ YouTube ในรูปแบบ Graph Network
                </p>

                <div style={styles.cards}>
                    {/* ── TikTok Card ── */}
                    <div
                        style={{ ...styles.card, ...styles.cardTiktok, ...(hovered === 'tiktok' ? styles.cardTiktokHover : {}) }}
                        onMouseEnter={() => setHovered('tiktok')}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => navigate('/analysis/tiktok')}
                    >
                        <span style={styles.cardIcon}>🎵</span>
                        <h2 style={styles.cardTitle}>TikTok</h2>
                        <p style={styles.cardDesc}>วิเคราะห์ Influencer และแบรนด์จากวิดีโอ TikTok</p>
                        <div style={styles.tagRow}>
                            <span style={styles.tagDark}>#Hashtag</span>
                            <span style={styles.tagDark}>@Username</span>
                        </div>
                        <div style={styles.cardStats}>
                            <div style={styles.statItem}><span style={styles.statNum}>∞</span><span style={styles.statLabel}>Short-form Videos</span></div>
                            <div style={styles.statDivider} />
                            <div style={styles.statItem}><span style={styles.statNum}>⭐</span><span style={styles.statLabel}>Favorite & Bookmark</span></div>
                        </div>
                        <button style={{ ...styles.cardBtn, ...(hovered === 'tiktok' ? styles.cardBtnHoverDark : styles.cardBtnDark) }}>
                            เริ่มวิเคราะห์ TikTok →
                        </button>
                    </div>

                    {/* ── YouTube Card ── */}
                    <div
                        style={{ ...styles.card, ...styles.cardYoutube, ...(hovered === 'youtube' ? styles.cardYoutubeHover : {}) }}
                        onMouseEnter={() => setHovered('youtube')}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => navigate('/analysis/youtube')}
                    >
                        <span style={styles.cardIcon}>▶️</span>
                        <h2 style={styles.cardTitle}>YouTube</h2>
                        <p style={styles.cardDesc}>วิเคราะห์ Influencer และแบรนด์จากคอนเทนต์ YouTube</p>
                        <div style={styles.tagRow}>
                            <span style={styles.tagRed}>Keyword</span>
                            <span style={styles.tagRed}>@Channel</span>
                        </div>
                        <div style={styles.cardStats}>
                            <div style={styles.statItem}><span style={styles.statNum}>∞</span><span style={styles.statLabel}>Long-form Videos</span></div>
                            <div style={styles.statDivider} />
                            <div style={styles.statItem}><span style={styles.statNum}>⭐</span><span style={styles.statLabel}>Favorite & Bookmark</span></div>
                        </div>
                        <button style={{ ...styles.cardBtn, ...(hovered === 'youtube' ? styles.cardBtnHoverRed : styles.cardBtnRed) }}>
                            เริ่มวิเคราะห์ YouTube →
                        </button>
                    </div>
                </div>

                <p style={styles.hint}>💡 ข้อมูลแต่ละ Platform แยกกันอิสระ ไม่ปะปนกัน</p>
            </div>
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', background: '#fafafa', fontFamily: "'Prompt', sans-serif", position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    bgGrid: { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#e0e0e0 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.6, pointerEvents: 'none' },
    inner: { position: 'relative', zIndex: 1, textAlign: 'center', padding: '60px 24px', maxWidth: '900px', width: '100%' },
    eyebrow: { fontSize: '12px', fontWeight: '600', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', margin: '0 0 16px' },
    title: { fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: '800', color: '#111', lineHeight: 1.2, margin: '0 0 16px' },
    accent: { color: '#ff4757' },
    subtitle: { fontSize: '1rem', color: '#777', lineHeight: 1.7, margin: '0 0 52px' },
    cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' },

    // ── Card Base ──
    card: { borderRadius: '24px', padding: '40px 32px', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'left', position: 'relative', overflow: 'hidden' },

    // ── TikTok Card ──
    cardTiktok: { background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)', color: '#fff', boxShadow: '0 8px 32px rgba(26,26,46,0.4)' },
    cardTiktokHover: { transform: 'translateY(-6px)', boxShadow: '0 16px 48px rgba(26,26,46,0.5)', border: '2px solid rgba(255,255,255,0.2)' },

    // ── YouTube Card ──
    cardYoutube: { background: 'linear-gradient(145deg, #FF0000 0%, #cc0000 60%, #990000 100%)', color: '#fff', boxShadow: '0 8px 32px rgba(255,0,0,0.3)' },
    cardYoutubeHover: { transform: 'translateY(-6px)', boxShadow: '0 16px 48px rgba(255,0,0,0.4)', border: '2px solid rgba(255,255,255,0.2)' },

    cardIcon: { fontSize: '2.8rem', display: 'block', marginBottom: '20px' },
    cardTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#fff', margin: '0 0 8px' },
    cardDesc: { fontSize: '14px', opacity: 0.8, lineHeight: 1.6, margin: '0 0 20px' },

    tagRow: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
    tagDark: { padding: '5px 14px', borderRadius: '999px', background: 'rgba(255,255,255,0.15)', fontSize: '12px', fontWeight: '600', backdropFilter: 'blur(4px)' },
    tagRed: { padding: '5px 14px', borderRadius: '999px', background: 'rgba(255,255,255,0.15)', fontSize: '12px', fontWeight: '600', backdropFilter: 'blur(4px)' },

    cardStats: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(4px)' },
    statItem: { flex: 1, textAlign: 'center' },
    statNum: { display: 'block', fontSize: '1.4rem', fontWeight: '800', color: '#fff' },
    statLabel: { display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' },
    statDivider: { width: '1px', height: '36px', background: 'rgba(255,255,255,0.2)' },

    cardBtn: { width: '100%', padding: '14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px', fontSize: '14px', fontWeight: '700', fontFamily: "'Prompt', sans-serif", cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.02em' },
    cardBtnDark:      { background: 'rgba(255,255,255,0.12)', color: '#fff' },
    cardBtnHoverDark: { background: 'rgba(255,255,255,0.25)', color: '#fff' },
    cardBtnRed:       { background: 'rgba(255,255,255,0.12)', color: '#fff' },
    cardBtnHoverRed:  { background: 'rgba(255,255,255,0.25)', color: '#fff' },

    hint: { fontSize: '13px', color: '#aaa', margin: 0 },
};

export default AnalysisHome;