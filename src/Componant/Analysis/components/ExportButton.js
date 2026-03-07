// components/ExportButton.js
// วางปุ่มนี้ใน TikTok Analysis page หรือ YouTube Analysis page ได้เลย
// Props: platform = 'tiktok' | 'youtube' (optional — ถ้าไม่ส่งจะ export ทั้งคู่)

import React, { useState } from 'react';

function ExportButton({ platform }) {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/export-excel');
            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            const blob = await res.blob();
            const url  = window.URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `TookJaRit_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(`❌ Export ล้มเหลว: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            style={loading ? { ...styles.btn, ...styles.btnLoading } : styles.btn}
            title="Export ข้อมูล TikTok + YouTube ทั้งหมดเป็น Excel"
        >
            {loading ? (
                <>
                    <span style={styles.spinner} />
                    กำลัง Export...
                </>
            ) : (
                <>
                    <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export Excel
                </>
            )}
        </button>
    );
}

const styles = {
    btn: {
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '8px',
        padding:        '10px 20px',
        background:     'linear-gradient(135deg, #1D6F42 0%, #217346 100%)', // Excel green
        color:          '#fff',
        border:         'none',
        borderRadius:   '10px',
        fontSize:       '14px',
        fontWeight:     '700',
        fontFamily:     "'Prompt', sans-serif",
        cursor:         'pointer',
        boxShadow:      '0 4px 12px rgba(29,111,66,0.35)',
        transition:     'all 0.2s ease',
        letterSpacing:  '0.02em',
        whiteSpace:     'nowrap',
    },
    btnLoading: {
        opacity:  0.7,
        cursor:   'not-allowed',
    },
    icon: {
        width:  '18px',
        height: '18px',
        flexShrink: 0,
    },
    spinner: {
        display:      'inline-block',
        width:        '16px',
        height:       '16px',
        border:       '2px solid rgba(255,255,255,0.4)',
        borderTop:    '2px solid #fff',
        borderRadius: '50%',
        animation:    'spin 0.8s linear infinite',
        flexShrink:   0,
    },
};

// Inject keyframe animation (ทำครั้งเดียวตอน mount)
if (typeof document !== 'undefined' && !document.getElementById('export-btn-style')) {
    const style = document.createElement('style');
    style.id = 'export-btn-style';
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
}

export default ExportButton;