// Componant/Search.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from './LoadingOverlay';

function Search() {
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading]       = useState(false);
    const navigate = useNavigate();

    const handleSearch = async () => {
        if (!inputValue.trim()) return alert('กรุณาพิมพ์คำค้นหาก่อนครับ');
        navigate('/analysis');
    };

    return (
        <section className="hero">
            <LoadingOverlay isLoading={loading} />

            {/* Blobs */}
            <div className="hero__blobs">
                <div className="hero__blob hero__blob--red" />
                <div className="hero__blob hero__blob--yellow" />
                <div className="hero__blob hero__blob--green" />
            </div>

            {/* Eyebrow */}
            <div className="hero__eyebrow">
                <span className="hero__eyebrow-dot" />
                Influencer Analytics Platform
            </div>

            {/* Title */}
            <h1 className="hero__title">
                หาอินฟู <span className="hero__highlight">#ถูกจริต</span><br />
                &amp; เพื่อธุรกิจที่ปังกว่า 🚀
            </h1>

            {/* Subtitle */}
            <p className="hero__sub">
                แมปความสัมพันธ์ระหว่าง Influencer กับแบรนด์ด้วย Graph Network ที่เข้าใจง่าย
            </p>

            {/* Search Box */}
            <div className="hero__search-box">
                <span className="hero__search-emoji">🔍</span>
                <input
                    type="text"
                    placeholder="#beauty หรือ @username..."
                    className="hero__search-input"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button
                    className="btn btn--dark btn--sm hero__search-btn"
                    onClick={handleSearch}
                    disabled={loading}
                >
                    {loading ? '...' : 'ค้นหา'}
                </button>
            </div>

            {/* Platform Pills */}
            <div className="hero__pills">
                <button
                    className="hero__pill hero__pill--tiktok"
                    onClick={() => navigate('/analysis/tiktok')}
                >
                    🎵 TikTok
                </button>
                <button
                    className="hero__pill hero__pill--youtube"
                    onClick={() => navigate('/analysis/youtube')}
                >
                    ▶️ YouTube
                </button>
            </div>

            {/* Stats Grid */}
            <div className="hero__stats-grid">
                {[
                    { num: '500+',      label: 'Influencers ในระบบ', color: 'var(--color-primary)'       },
                    { num: '11',        label: 'หมวดหมู่สินค้า',    color: 'var(--color-accent-green)'   },
                    { num: '2',         label: 'Platform ที่รองรับ', color: 'var(--color-accent-teal)'    },
                    { num: 'Real-time', label: 'Graph Network',       color: 'var(--color-accent-pink)'   },
                ].map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-card__num" style={{ color: s.color }}>{s.num}</div>
                        <div className="stat-card__label">{s.label}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default Search;