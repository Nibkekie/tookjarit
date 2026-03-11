// src/Componant/Jobboard/CampaignCard.js
import React from 'react';
import './Jobboard.css';

const JOB_TYPE_LABEL = {
    freelance: { text: 'ฟรีแลนซ์', color: '#6c5ce7', bg: '#f0eeff' },
    contract:  { text: 'สัญญาจ้าง', color: '#e17055', bg: '#fff3f0' },
    parttime:  { text: 'พาร์ทไทม์', color: '#00b894', bg: '#f0fff8' },
};

const CATEGORY_EMOJI = {
    'Fashion': '👗', 'Beauty & Personal Care': '💄', 'Health & Wellness': '💊',
    'Food & Beverage': '🍜', 'Mom & Kids': '👶', 'IT & Gadgets': '📱',
    'Home & Living': '🏠', 'Toys & Collectibles': '🧸', 'Pet': '🐾',
    'Automotive': '🚗', 'Lifestyle': '✨',
};

function CampaignCard({ campaign, onClick }) {
    const c = campaign;
    const jobInfo = JOB_TYPE_LABEL[c.jobType] || JOB_TYPE_LABEL.freelance;
    const hasImage = c.images && c.images.length > 0;

    return (
        <div className="campaign-card" onClick={onClick}>
            {hasImage && (
                <div className="campaign-card-image">
                    <img src={c.images[0]} alt={c.title} onError={e => { e.target.style.display = 'none'; }} />
                </div>
            )}
            <div className="campaign-card-body">
                <div className="campaign-card-tags">
                    <span className="campaign-tag" style={{ color: jobInfo.color, background: jobInfo.bg }}>
                        {jobInfo.text}
                    </span>
                    <span className="campaign-tag-category">
                        {CATEGORY_EMOJI[c.category]} {c.category}
                    </span>
                </div>
                <h3 className="campaign-card-title">{c.title}</h3>
                <p className="campaign-card-desc">
                    {c.description.length > 100 ? c.description.slice(0, 100) + '...' : c.description}
                </p>
                <div className="campaign-card-footer">
                    <div className="campaign-card-author">
                        <div className="campaign-card-avatar">
                            {c.author?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span>{c.author?.name || 'Unknown'}</span>
                    </div>
                    {c.budget > 0 && (
                        <span className="campaign-card-budget">฿{c.budget.toLocaleString()}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CampaignCard;
