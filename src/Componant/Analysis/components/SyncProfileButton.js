// src/Componant/Analysis/components/SyncProfileButton.js
// ปุ่ม Sync Profile Stats — ดึง followers + profile likes จริงจาก TikTok/YouTube
// วางใน FilterToolbar ข้างๆ ปุ่ม Sync DB

import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000';

function SyncProfileButton({ platform, onSyncComplete }) {
    const [loading,   setLoading]   = useState(false);
    const [status,    setStatus]    = useState(null); // { lastSynced, syncedCount, totalInfluencers }
    const [progress,  setProgress]  = useState('');

    // โหลด sync status ตอน mount
    useEffect(() => {
        fetch(`${API}/api/sync-profile-stats/status?platform=${platform}`)
            .then(r => r.json())
            .then(setStatus)
            .catch(() => {});
    }, [platform]);

    const handleSync = async () => {
        if (!window.confirm(
            `จะ sync followers + profile likes จริงของทุก Influencer บน ${platform.toUpperCase()}\n` +
            `(อาจใช้เวลา 1-3 นาที ขึ้นกับจำนวน Influencer)\n\nดำเนินการต่อ?`
        )) return;

        setLoading(true);
        setProgress('กำลัง sync...');

        try {
            const res = await fetch(`${API}/api/sync-profile-stats`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ platform }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Sync failed');

            setProgress(`✅ อัพเดต ${data.updated}/${data.total} คน`);
            setStatus(prev => ({
                ...prev,
                lastSynced:  data.syncedAt,
                syncedCount: data.updated,
            }));

            // refresh graph
            if (onSyncComplete) onSyncComplete();

            setTimeout(() => setProgress(''), 4000);
        } catch (err) {
            setProgress(`❌ ${err.message}`);
            setTimeout(() => setProgress(''), 4000);
        } finally {
            setLoading(false);
        }
    };

    // แสดงเวลา sync ล่าสุด
    const lastSyncLabel = () => {
        if (!status?.lastSynced) return null;
        const d = new Date(status.lastSynced);
        const now = new Date();
        const diffH = Math.floor((now - d) / 3600000);
        if (diffH < 1) return 'เพิ่ง sync';
        if (diffH < 24) return `${diffH} ชั่วโมงที่แล้ว`;
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <button
                className="action-text"
                onClick={handleSync}
                disabled={loading}
                style={{
                    opacity: loading ? 0.6 : 1,
                    cursor:  loading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
                title="ดึง followers + total likes จริงจาก TikTok profile"
            >
                {loading ? (
                    <><Spinner /> {progress || 'Syncing...'}</>
                ) : (
                    <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5">
                            <path d="M23 4v6h-6"/>
                            <path d="M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                        </svg>
                        Sync Profile
                    </>
                )}
            </button>

            {/* Status line */}
            {progress ? (
                <span style={s.statusText}>{progress}</span>
            ) : status?.lastSynced ? (
                <span style={s.statusText}>
                    🕐 อัปเดตล่าสุด {lastSyncLabel()}
                    {status.syncedCount != null && status.totalInfluencers != null &&
                        ` · ${status.syncedCount}/${status.totalInfluencers} คน`
                    }
                </span>
            ) : (
                <span style={{ ...s.statusText, color: '#f0a500' }}>⚠️ ยังไม่เคย sync</span>
            )}
        </div>
    );
}

function Spinner() {
    if (typeof document !== 'undefined' && !document.getElementById('sync-spin')) {
        const st = document.createElement('style');
        st.id = 'sync-spin';
        st.textContent = '@keyframes sspin { to { transform: rotate(360deg); } }';
        document.head.appendChild(st);
    }
    return (
        <span style={{
            display: 'inline-block', width: 12, height: 12,
            border: '2px solid rgba(0,0,0,0.15)',
            borderTop: '2px solid #555', borderRadius: '50%',
            animation: 'sspin 0.7s linear infinite',
        }} />
    );
}

const s = {
    statusText: {
        fontSize: 10, color: '#aaa',
        fontFamily: "'Prompt', sans-serif",
        whiteSpace: 'nowrap',
    },
};

export default SyncProfileButton;
