import React from 'react';

function FilterToolbar({ localFilter, setLocalFilter, onRefresh, onSync }) {
    return (
        <div className="filter-toolbar">
            <div className="left-filters">
                <div className="search-bar-wrapper">
                    <i className="fi fi-br-search search-icon"></i>
                    <input
                        type="text"
                        placeholder="ค้นหาภายในกราฟ..."
                        className="search-input-top"
                        value={localFilter}
                        onChange={(e) => setLocalFilter(e.target.value)}
                    />
                </div>
            </div>
            <div className="right-actions">
                <button className="action-text" onClick={onSync} style={{ marginRight: '8px' }}>
                    <i className="fi fi-rr-database"></i> Sync DB
                </button>
                <button className="action-text" onClick={onRefresh}>
                    <i className="fi fi-rr-refresh"></i> รีเฟรช
                </button>
            </div>
        </div>
    );
}

export default FilterToolbar;
