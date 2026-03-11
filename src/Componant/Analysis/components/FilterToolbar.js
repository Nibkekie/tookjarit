// src/Componant/Analysis/components/FilterToolbar.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ExportButton from './ExportButton';

const API = 'http://localhost:5000';
const STALE_DAYS = 7;

const TYPE_CONFIG = {
    influencer: { icon: '👤', color: '#2d3436', bg: '#f0f0f0' },
    brand:      { icon: '🏷️', color: '#0984e3', bg: '#e3f2fd' },
    category:   { icon: '📂', color: '#6c5ce7', bg: '#ede7f6' },
    product:    { icon: '🔖', color: '#00b894', bg: '#f0fff8' },
};

function daysSince(dateStr) {
    if (!dateStr) return Infinity;
    return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

function formatRelative(dateStr) {
    if (!dateStr) return 'ไม่ทราบ';
    const diff = Math.floor(daysSince(dateStr));
    if (diff === 0) return 'วันนี้';
    if (diff === 1) return 'เมื่อวาน';
    return `${diff} วันที่แล้ว`;
}

function FilterToolbar({ localFilter, setLocalFilter, onRefresh, platform = 'tiktok', onSelectCategory }){
    const [suggestions,  setSuggestions]  = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIdx,    setActiveIdx]    = useState(-1);
    const [lastUpdated,  setLastUpdated]  = useState(null);
    const [refreshing,   setRefreshing]   = useState(false);

    const inputRef    = useRef();
    const dropdownRef = useRef();

    const fetchLastUpdated = useCallback(async () => {
        try {
            const r = await fetch(`${API}/api/last-updated?platform=${platform || 'tiktok'}`);
            const d = await r.json();
            setLastUpdated(d.lastUpdated || null);
        } catch {}
    }, [platform]);

    useEffect(() => { fetchLastUpdated(); }, [fetchLastUpdated]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleInputChange = async (e) => {
        const val = e.target.value;
        setLocalFilter(val);
        setActiveIdx(-1);
        if (!val.trim()) { setSuggestions([]); setShowDropdown(false); return; }
        try {
            const r = await fetch(`${API}/api/suggestions?q=${encodeURIComponent(val)}&platform=${platform || 'tiktok'}`);
            const d = await r.json();
            setSuggestions(Array.isArray(d) ? d : []);
            setShowDropdown(Array.isArray(d) && d.length > 0);
        } catch { setSuggestions([]); }
    };

    const handleSelect = (item) => {
        if (item.type === 'category' && onSelectCategory) {
            onSelectCategory(item.label); // ← ส่งไปให้ parent
        } else {
            setLocalFilter(item.label);
        }
        setSuggestions([]);
        setShowDropdown(false);
        setActiveIdx(-1);
    };

    const handleKeyDown = (e) => {
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
        <div className="filter-toolbar">

            {/* ── ซ้าย: search + autocomplete ── */}
            <div className="left-filters ft-search-wrap">
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
                            className="ft-clear-btn"
                            onClick={() => { setLocalFilter(''); setSuggestions([]); setShowDropdown(false); }}
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* Autocomplete Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                    <div className="ft-dropdown" ref={dropdownRef}>
                        {suggestions.map((item, idx) => {
                            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.category;
                            return (
                                <div
                                    key={idx}
                                    className={`ft-dropdown__item${idx === activeIdx ? ' ft-dropdown__item--active' : ''}`}
                                    onMouseDown={() => handleSelect(item)}
                                    onMouseEnter={() => setActiveIdx(idx)}
                                >
                                    <span
                                        className="ft-dropdown__badge"
                                        style={{ color: cfg.color, background: cfg.bg }}
                                    >
                                        {cfg.icon} {item.type === 'influencer' ? 'Influencer' : item.type === 'brand' ? 'Brand' : item.type === 'category' ? 'Category' : 'สินค้า'}
                                    </span>
                                    <span className="ft-dropdown__label">{item.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── ขวา: ปุ่ม + วันที่ ── */}
            <div className="ft-right">
                <div className="ft-right__actions">
                    <button
                        className={`action-text${refreshing ? ' action-text--disabled' : ''}`}
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <i className={`fi fi-rr-refresh${refreshing ? ' ft-spin' : ''}`} />
                        {refreshing ? ' กำลังโหลด...' : ' รีเฟรช'}
                    </button>
                    <ExportButton currentPlatform={platform} />
                </div>

                <div className="ft-right__timestamp">
                    <i className="fi fi-rr-clock ft-clock-icon" />
                    {lastUpdated ? (
                        <>
                            <span>อัปเดตล่าสุด 🕐</span>
                            <strong className={isStale ? 'ft-timestamp--stale' : ''}>
                                {formatRelative(lastUpdated)}
                            </strong>
                            {isStale && (
                                <span title="ข้อมูลเก่ากว่า 7 วันแล้ว — แนะนำให้ค้นหาใหม่">⚠️</span>
                            )}
                        </>
                    ) : (
                        <span className="ft-timestamp--empty">ยังไม่มีข้อมูล</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FilterToolbar;