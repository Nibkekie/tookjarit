// Analysis/youtube/NodePopupCard.js
// Popup เฉพาะ YouTube: แสดง Subscribers, Views, ลิงก์ YouTube channel
import React from 'react';
import { CATEGORY_COLOR_MAP } from '../constants/categories';

const PLATFORM_COLOR = '#cc0000';

function getNodeColor(node) {
    if (node.type === 'Influencer') return '#2d3436';
    return CATEGORY_COLOR_MAP[node.category] || '#BDC3C7';
}

function NodePopupCard({ node, imgCache, favorites, favLoading, onClose, onToggleFavorite }) {
    if (!node) return null;
    const color = getNodeColor(node);

    return (
        <div className="node-popup-card" style={{ zIndex: 1000 }}>
            <button className="popup-close-btn" onClick={onClose}>✖</button>

            {/* Avatar */}
            <div className="popup-avatar" style={{
                background: color,
                boxShadow: `0 4px 15px ${color}40`,
                overflow: 'hidden',
                padding: 0,
            }}>
                {imgCache?.current?.[node.name]?.src
                    ? <img src={imgCache.current[node.name].src} alt={node.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : node.name.charAt(0).toUpperCase()
                }
            </div>

            {/* Name + Badge */}
            <div>
                <h3 className="popup-name">{node.name}</h3>
                <span className="popup-type-badge" style={{ background: node.type === 'Influencer' ? PLATFORM_COLOR : '#888' }}>
                    {node.type}
                </span>
            </div>

            <div className="popup-divider" />

            {/* Brand → แสดง category */}
            {node.type === 'Brand' ? (
                <div style={{ marginBottom: '10px' }}>
                    <span style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '4px' }}>Category</span>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color, background: `${color}15`, padding: '6px 15px', borderRadius: '8px' }}>
                        {node.category || '-'}
                    </span>
                </div>
            ) : (
                <>
                    {/* Stats: Subscribers + Views (ต่างจาก TikTok!) */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', width: '100%' }}>
                        <div className="popup-stat-box">
                            <div className="popup-stat-label">
                                <i className="fi fi-rr-users-alt" /> Subscribers
                            </div>
                            <span className="popup-stat-value">
                                {node.subscribers?.toLocaleString() || node.followers?.toLocaleString() || '-'}
                            </span>
                        </div>
                        <div className="popup-stat-box">
                            <div className="popup-stat-label" style={{ color: PLATFORM_COLOR }}>
                                <i className="fi fi-rr-play-alt" /> Views
                            </div>
                            <span className="popup-stat-value">
                                {node.totalViews?.toLocaleString() || '-'}
                            </span>
                        </div>
                    </div>

                    {/* Actions: View Channel + Favorite */}
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <a
                            href={`https://www.youtube.com/@${node.name}`}
                            target="_blank" rel="noreferrer"
                            className="popup-view-btn"
                            style={{ flex: 1, textAlign: 'center', background: PLATFORM_COLOR }}
                        >
                            View Channel <i className="fi fi-rr-arrow-small-right" />
                        </a>
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(node.name); }}
                            disabled={favLoading}
                            style={{
                                padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                                fontSize: '18px', transition: 'all 0.2s', flexShrink: 0,
                                border: favorites.has(node.name) ? '2px solid #ffc800' : '2px solid #e0e0e0',
                                background: favorites.has(node.name) ? '#fff9e6' : '#fff',
                            }}
                            title={favorites.has(node.name) ? 'ลบออกจาก Favorites' : 'เพิ่มใน Favorites'}
                        >
                            {favorites.has(node.name) ? '⭐' : '☆'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default NodePopupCard;
