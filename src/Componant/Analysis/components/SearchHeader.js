import React from 'react';

function SearchHeader({ globalSearch, setGlobalSearch, onSearch, isLoading, platform, setPlatform }) {
    return (
        <div className="analysis-header-container">
            <div className="search-bar-wrapper">
                <i className="fi fi-br-search search-icon"></i>
                <input
                    type="text"
                    placeholder="ค้นหา #Hashtag หรือชื่อ Influencer"
                    className="search-input-top"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                />
            </div>
            <button className="analyze-btn-small" onClick={onSearch} disabled={isLoading} style={{ marginRight: '15px' }}>
                {isLoading ? 'Loading...' : 'ค้นหา'}
            </button>
            <div className={`toggle-container ${platform === 'youtube' ? 'youtube-active' : 'tiktok-active'}`}>
                <div className="toggle-slider"></div>
                <button className="toggle-btn-slide btn-tiktok" onClick={() => setPlatform('tiktok')}>
                    <i className="fi fi-brands-tik-tok"></i> TikTok
                </button>
                <button className="toggle-btn-slide btn-youtube" onClick={() => setPlatform('youtube')}>
                    <i className="fi fi-brands-youtube"></i> YouTube
                </button>
            </div>
        </div>
    );
}

export default SearchHeader;
