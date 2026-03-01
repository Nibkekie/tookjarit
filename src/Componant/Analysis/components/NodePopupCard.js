import React from 'react';
import { CATEGORY_COLOR_MAP } from '../constants/categories';

function getNodeColor(node) {
    if (node.type === 'Influencer') return '#2d3436';
    return CATEGORY_COLOR_MAP[node.category] || '#BDC3C7';
}

function NodePopupCard({ node, onClose }) {
    if (!node) return null;
    const color = getNodeColor(node);

    return (
        <div className="node-popup-card">
            <button className="popup-close-btn" onClick={onClose}>✖</button>
            <div className="popup-avatar" style={{ background: color, boxShadow: `0 4px 15px ${color}40` }}>
                {node.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <h3 className="popup-name">{node.name}</h3>
                <span className="popup-type-badge" style={{ background: node.type === 'Influencer' ? '#000' : '#888' }}>
                    {node.type}
                </span>
            </div>
            <div className="popup-divider"></div>
            {node.type === 'Brand' ? (
                <div style={{ marginBottom: '10px' }}>
                    <span style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '4px' }}>Category</span>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color, background: `${color}15`, padding: '6px 15px', borderRadius: '8px' }}>
                        {node.category || '-'}
                    </span>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', width: '100%' }}>
                        <div className="popup-stat-box">
                            <div className="popup-stat-label"><i className="fi fi-rr-users-alt"></i> Followers</div>
                            <span className="popup-stat-value">{node.followers ? node.followers.toLocaleString() : '-'}</span>
                        </div>
                        <div className="popup-stat-box">
                            <div className="popup-stat-label" style={{ color: '#ff4757' }}><i className="fi fi-rr-heart"></i> Likes</div>
                            <span className="popup-stat-value">{node.totalLikes ? node.totalLikes.toLocaleString() : '-'}</span>
                        </div>
                    </div>
                    <a href={`https://www.tiktok.com/@${node.name}`} target="_blank" rel="noreferrer" className="popup-view-btn">
                        View Full Profile <i className="fi fi-rr-arrow-small-right"></i>
                    </a>
                </>
            )}
        </div>
    );
}

export default NodePopupCard;
