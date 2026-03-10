// Analysis/components/FilterToolbar.js
import React, { useEffect, useState, useCallback } from 'react';
import ExportButton from './ExportButton';

const API = 'http://localhost:5000';
const STALE_DAYS = 7; // เปลี่ยนเป็น 9999 ตอน dev ถ้าไม่อยากเห็น ⚠️

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

function FilterToolbar({ localFilter, setLocalFilter, onRefresh, platform = 'tiktok' }) {
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshing, setRefreshing]   = useState(false);

    const fetchLastUpdated = useCallback(() => {
        fetch(`${API}/api/last-updated?platform=${platform}`)
            .then(r => r.json())
            .then(d => setLastUpdated(d.lastUpdated || null))
            .catch(() => {});
    }, [platform]);

    useEffect(() => { fetchLastUpdated(); }, [fetchLastUpdated]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh();
        fetchLastUpdated();
        setRefreshing(false);
    };

    const isStale = daysSince(lastUpdated) >= STALE_DAYS;

    return (
        <div className="filter-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
            {/* ── ซ้าย: ช่องค้นหา ── */}
            <div className="left-filters">
                <div className="search-bar-wrapper">
                    <i className="fi fi-br-search search-icon" />
                    <input
                        type="text"
                        placeholder="ค้นหาภายในกราฟ..."
                        className="search-input-top"
                        value={localFilter}
                        onChange={e => setLocalFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* ── ขวา: ปุ่ม + วันที่ใต้ปุ่ม ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>

                {/* แถวปุ่ม */}
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

                {/* วันที่ใต้ปุ่ม */}
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
                                <span
                                    title="ข้อมูลเก่ากว่า 7 วันแล้ว — แนะนำให้ค้นหาใหม่"
                                    style={{ fontSize: 12, cursor: 'default' }}
                                >
                                    ⚠️
                                </span>
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