// Analysis/components/FilterToolbar.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import ExportButton from './ExportButton';

const API = 'http://localhost:5000';
const STALE_DAYS = 7;

function formatRelative(dateStr) {
    if (!dateStr) return null;
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return 'เมื่อกี้นี้';
    if (diff < 3600)  return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    const days = Math.floor(diff / 86400);
    if (days < 30)    return `${days} วันที่แล้ว`;
    return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysSince(dateStr) {
    if (!dateStr) return 999;
    return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

const TYPE_CONFIG = {
    influencer: { icon: '👤', color: '#6c5ce7', bg: '#f0eeff' },
    brand:      { icon: '🛍️', color: '#e17055', bg: '#fff3f0' },
    category:   { icon: '📂', color: '#00b894', bg: '#f0fff8' },
};

function FilterToolbar({ localFilter, setLocalFilter, onRefresh, platform = 'tiktok' }) {
    const [lastUpdated,  setLastUpdated]  = useState(null);
    const [refreshing,   setRefreshing]   = useState(false);
    const [suggestions,  setSuggestions]  = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIdx,    setActiveIdx]    = useState(-1);

    const inputRef    = useRef(null);
    const dropdownRef = useRef(null);
    const debounceRef = useRef(null);

    const fetchLastUpdated = useCallback(() => {
        fetch(`${API}/api/last-updated?platform=${platform}`)
            .then(r => r.json())
            .then(d => setLastUpdated(d.lastUpdated || null))
            .catch(() => {});
    }, [platform]);

    useEffect(() => { fetchLastUpdated(); }, [fetchLastUpdated]);

    // close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                inputRef.current    && !inputRef.current.contains(e.target)
            ) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // fetch suggestions with debounce 250ms
    const fetchSuggestions = useCallback((q) => {
        clearTimeout(debounceRef.current);
        if (!q.trim()) { setSuggestions([]); setShowDropdown(false); return; }
        debounceRef.current = setTimeout(async () => {
            try {
                const res  = await fetch(`${API}/api/suggestions?q=${encodeURIComponent(q)}&platform=${platform}`);
                const data = await res.json();
                setSuggestions(data);
                setShowDropdown(data.length > 0);
                setActiveIdx(-1);
            } catch { setSuggestions([]); }
        }, 250);
    }, [platform]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setLocalFilter(val);
        fetchSuggestions(val);
    };

    const handleSelect = (item) => {
        setLocalFilter(item.label);
        setSuggestions([]);
        setShowDropdown(false);
        setActiveIdx(-1);
    };

    const handleKeyDown = (e) => {
        if (!showDropdown || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && activeIdx >= 0) {
            e.preventDefault();
            handleSelect(suggestions[activeIdx]);
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
            setActiveIdx(-1);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh();
        fetchLastUpdated();
        setRefreshing(false);
    };

    const isStale = daysSince(lastUpdated) >= STALE_DAYS;

    return (
        <div className="filter-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>

            {/* ── ซ้าย: search bar + dropdown ── */}
            <div className="left-filters" style={{ position: 'relative' }}>
                <div className="search-bar-wrapper">
                    <i className="fi fi-br-search search-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="ค้นหาภายในกราฟ..."
                        className="search-input-top"
                        value={localFilter}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                        autoComplete="off"
                    />
                    {localFilter && (
                        <button
                            onClick={() => { setLocalFilter(''); setSuggestions([]); setShowDropdown(false); }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '0 8px', color: '#999', fontSize: 16, lineHeight: 1,
                            }}
                        >×</button>
                    )}
                </div>

                {/* Autocomplete Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                            width: '100%', minWidth: 280,
                            background: '#fff',
                            borderRadius: 12,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                            border: '1px solid #eee',
                            zIndex: 9999,
                            overflow: 'hidden',
                            fontFamily: "'Prompt', sans-serif",
                        }}
                    >
                        {suggestions.map((item, idx) => {
                            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.category;
                            const isActive = idx === activeIdx;
                            return (
                                <div
                                    key={idx}
                                    onMouseDown={() => handleSelect(item)}
                                    onMouseEnter={() => setActiveIdx(idx)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '9px 14px', cursor: 'pointer',
                                        background: isActive ? '#f5f5f5' : '#fff',
                                        borderBottom: idx < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                                        transition: 'background 0.1s',
                                    }}
                                >
                                    <span style={{
                                        fontSize: 11, fontWeight: 600,
                                        color: cfg.color, background: cfg.bg,
                                        padding: '2px 7px', borderRadius: 6,
                                        whiteSpace: 'nowrap', flexShrink: 0,
                                    }}>
                                        {cfg.icon} {item.type === 'influencer' ? 'Influencer' : item.type === 'brand' ? 'Brand' : 'Category'}
                                    </span>
                                    <span style={{ fontSize: 13, color: '#2d3436', fontWeight: 500 }}>
                                        {item.display}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── ขวา: ปุ่ม + วันที่ ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        className="action-text"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{ opacity: refreshing ? 0.6 : 1 }}
                    >
                        <i className={`fi fi-rr-refresh${refreshing ? ' spin' : ''}`} />
                        {refreshing ? ' กำลังโหลด...' : ' รีเฟรช'}
                    </button>
                    <ExportButton />
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 13, color: 'rgba(0,0,0,0.38)',
                    fontFamily: "'Prompt', sans-serif",
                }}>
                    <i className="fi fi-rr-clock" style={{ fontSize: 10 }} />
                    {lastUpdated ? (
                        <>
                            <span>อัปเดตล่าสุด 🕐</span>
                            <strong style={{ color: isStale ? '#e65100' : '#1a1a1a' }}>
                                {formatRelative(lastUpdated)}
                            </strong>
                            {isStale && (
                                <span title="ข้อมูลเก่ากว่า 7 วันแล้ว — แนะนำให้ค้นหาใหม่" style={{ fontSize: 12, cursor: 'default' }}>⚠️</span>
                            )}
                        </>
                    ) : (
                        <span style={{ fontStyle: 'italic' }}>ยังไม่มีข้อมูล</span>
                    )}
                </div>
            </div>

            <style>{`
                .spin { animation: spinAnim 0.8s linear infinite; display: inline-block; }
                @keyframes spinAnim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default FilterToolbar;