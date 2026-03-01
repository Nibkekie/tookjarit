// Componant/Favorites.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Favorites() {
    const [favorites, setFavorites] = useState([]);
    const [avatars, setAvatars]     = useState({});
    const [loading, setLoading]     = useState(true);
    const [userName, setUserName]   = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        fetch('http://localhost:5000/api/favorites', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(async data => {
                if (data.message) { navigate('/login'); return; }
                const favs = data.favorites || [];
                setFavorites(favs);
                setUserName(data.name || '');
                // โหลด avatar ทุกคนพร้อมกัน
                const avatarMap = {};
                await Promise.all(favs.map(async fav => {
                    try {
                        const r = await fetch(`http://localhost:5000/api/avatar/${encodeURIComponent(fav.influencerName)}`);
                        const d = await r.json();
                        if (d.avatar) avatarMap[fav.influencerName] = d.avatar;
                    } catch {}
                }));
                setAvatars(avatarMap);
            })
            .catch(() => navigate('/login'))
            .finally(() => setLoading(false));
    }, [navigate]);

    const removeFavorite = async (influencerName) => {
        const token = localStorage.getItem('token');
        await fetch('http://localhost:5000/api/favorites/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ influencerName })
        });
        setFavorites(prev => prev.filter(f => f.influencerName !== influencerName));
    };

    // ✅ navigate ไปหน้าที่ถูก platform
    const viewInGraph = (fav) => {
        const platform = fav.platform || 'tiktok';
        navigate(`/analysis/${platform}?highlight=${fav.influencerName}`);
    };

    if (loading) return (
        <div style={styles.loadingWrap}>
            <div style={styles.spinner}></div>
            <p>กำลังโหลด...</p>
        </div>
    );

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>⭐ Favorites ของคุณ</h1>
                <p style={styles.sub}>สวัสดีคุณ <b>{userName}</b> — คุณมี {favorites.length} Influencer ที่บันทึกไว้</p>
            </div>

            {favorites.length === 0 ? (
                <div style={styles.empty}>
                    <div style={styles.emptyIcon}>⭐</div>
                    <p style={styles.emptyText}>ยังไม่มี Favorites</p>
                    <p style={styles.emptySub}>ไปที่หน้า Analysis แล้วกดดาวที่ Influencer ที่ชอบได้เลยครับ</p>
                    <button style={styles.goBtn} onClick={() => navigate('/analysis')}>ไปหน้า Analysis →</button>
                </div>
            ) : (
                <div style={styles.grid}>
                    {favorites.map((fav, i) => {
                        const isTikTok = (fav.platform || 'tiktok') === 'tiktok';
                        return (
                            <div key={i} style={styles.card}>
                                {/* ✅ Avatar สีตาม platform */}
                                <div style={{ ...styles.avatar, background: isTikTok ? 'linear-gradient(135deg, #1a1a2e, #4a4a6e)' : 'linear-gradient(135deg, #FF0000, #cc0000)', overflow: 'hidden', padding: 0 }}>
                                    {avatars[fav.influencerName]
                                        ? <img src={avatars[fav.influencerName]} alt={fav.influencerName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        : <span style={{ color: '#fff', fontSize: '20px', fontWeight: '700' }}>{fav.influencerName.charAt(0).toUpperCase()}</span>
                                    }
                                </div>
                                <div style={styles.cardInfo}>
                                    <p style={styles.cardName}>@{fav.influencerName}</p>
                                    <p style={styles.cardMeta}>
                                        {/* ✅ Platform badge */}
                                        <span style={{ ...styles.platformBadge, background: isTikTok ? '#1a1a2e' : '#FF0000' }}>
                                            {isTikTok ? '🎵 TikTok' : '▶️ YouTube'}
                                        </span>
                                        บันทึกเมื่อ {new Date(fav.addedAt).toLocaleDateString('th-TH')}
                                    </p>
                                </div>
                                <div style={styles.cardActions}>
                                    <button style={{ ...styles.viewBtn, background: isTikTok ? '#1a1a2e' : '#cc0000' }} onClick={() => viewInGraph(fav)}>
                                        ดูในกราฟ 🔍
                                    </button>
                                    <button style={styles.removeBtn} onClick={() => removeFavorite(fav.influencerName)}>ลบ</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', background: '#f8f9fa', padding: '40px 24px', fontFamily: "'Prompt', sans-serif" },
    header: { maxWidth: '900px', margin: '0 auto 32px' },
    title: { fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' },
    sub: { color: '#888', fontSize: '0.95rem', margin: 0 },
    loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', fontFamily: "'Prompt', sans-serif" },
    spinner: { width: '40px', height: '40px', border: '4px solid #f0f0f0', borderTop: '4px solid #ff4757', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    empty: { textAlign: 'center', padding: '80px 20px', maxWidth: '400px', margin: '0 auto' },
    emptyIcon: { fontSize: '64px', marginBottom: '16px' },
    emptyText: { fontSize: '1.3rem', fontWeight: '600', color: '#333', margin: '0 0 8px' },
    emptySub: { color: '#999', fontSize: '0.9rem', marginBottom: '24px' },
    goBtn: { background: '#ff4757', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '15px', fontFamily: "'Prompt', sans-serif", cursor: 'pointer', fontWeight: '600' },
    grid: { maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' },
    card: { background: '#fff', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' },
    avatar: { width: '48px', height: '48px', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', flexShrink: 0 },
    cardInfo: { flex: 1 },
    cardName: { fontSize: '1rem', fontWeight: '600', color: '#1a1a1a', margin: '0 0 6px' },
    cardMeta: { fontSize: '12px', color: '#aaa', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    platformBadge: { color: '#fff', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', display: 'inline-block' },
    cardActions: { display: 'flex', gap: '8px', alignItems: 'center' },
    viewBtn: { color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontFamily: "'Prompt', sans-serif", cursor: 'pointer', fontWeight: '500' },
    removeBtn: { background: 'transparent', color: '#ff4757', border: '1px solid #ff4757', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontFamily: "'Prompt', sans-serif", cursor: 'pointer', fontWeight: '500' },
};

export default Favorites;