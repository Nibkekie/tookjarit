// Componant/Analysis/index.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';
import './Analysis.css';
import LoadingOverlay from '../LoadingOverlay';
import { CATEGORIES, CATEGORY_COLOR_MAP } from './constants/categories';
// เพิ่มบรรทัดนี้ต่อจาก import อื่นๆ
import ExportButton from './components/ExportButton';

const API = 'http://localhost:5000';

// ─── Node Helpers ─────────────────────────────
function getNodeColor(node) {
    if (node.type === 'Influencer') return '#2d3436';
    return CATEGORY_COLOR_MAP[node.category] || '#BDC3C7';
}
function getNodeSize(node) {
    if (node.type === 'Brand') return 30;
    if (!node.followers) return 25;
    return Math.min(Math.max(Math.log(node.followers) * 4 + 10, 25), 80);
}
function getLinkWidth(link) {
    if (link.isPhantom) return 0;
    const score = (link.totalViews || 0) + (link.totalLikes || 0) + ((link.source?.followers || 0) * 0.5);
    return 2 + (Math.min(score, 500000) / 500000) * 10;
}

// ─── Main Component ───────────────────────────
function Analysis({ platform }) {
    const location  = useLocation();
    const navigate  = useNavigate();
    const fgRef     = useRef();
    const containerRef = useRef();
    const imgCache  = useRef({});
    const avatarFetching = useRef({});

    // Data
    const [data, setData]               = useState({ nodes: [], links: [] });
    const [dimensions, setDimensions]   = useState({ width: 800, height: 600 });
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Interaction
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode]     = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);

    // Search & Filter
    const [globalSearch, setGlobalSearch]   = useState('');
    const [localFilter, setLocalFilter]     = useState('');
    const [isLoading, setIsLoading]         = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');

    // Favorites
    const [favorites, setFavorites]   = useState(new Set());
    const [favLoading, setFavLoading] = useState(false);

    // Easter Egg 🎉
    const [konamiProgress, setKonamiProgress] = useState(0);
    const [easterEggActive, setEasterEggActive] = useState(false);
    const konamiCode = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

    // ── Config ตาม platform ────────────────────
    const platformConfig = {
        tiktok: {
            label: '🎵 TikTok',
            color: '#1a1a2e',
            btnColor: '#1a1a2e',
            searchEndpoint: `${API}/api/search-tiktok`,
            profileUrl: (name) => `https://www.tiktok.com/@${name}`,
            placeholder: 'ค้นหา #Hashtag หรือ @username บน TikTok',
        },
        youtube: {
            label: '▶️ YouTube',
            color: '#FF0000',
            btnColor: '#cc0000',
            searchEndpoint: `${API}/api/search-youtube`,
            profileUrl: (name) => `https://www.youtube.com/@${name}`,
            placeholder: 'ค้นหา Keyword หรือ @Channel บน YouTube',
        }
    };
    const cfg = platformConfig[platform] || platformConfig.tiktok;

    // ── Load Favorites ─────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        fetch(`${API}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => {
                if (d.favorites) setFavorites(new Set(d.favorites.map(f => f.influencerName)));
            }).catch(() => {});
    }, []);

    // ── Toggle Favorite ────────────────────────
    const handleToggleFavorite = async (influencerName) => {
        const token = localStorage.getItem('token');
        if (!token) { alert('กรุณาเข้าสู่ระบบก่อน'); return; }
        setFavLoading(true);
        try {
            const res = await fetch(`${API}/api/favorites/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ influencerName, platform }) // ✅ ส่ง platform
            });
            const d = await res.json();
            setFavorites(prev => {
                const next = new Set(prev);
                d.favorited ? next.add(influencerName) : next.delete(influencerName);
                return next;
            });
        } catch { alert('เกิดข้อผิดพลาด'); }
        finally { setFavLoading(false); }
    };

    // ── Load Graph Data ────────────────────────
    const loadGraphData = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/graph-data?platform=${platform}`); // ✅ ส่ง platform
            const rawData = await res.json();
            const linkMap = {};
            rawData.links.forEach(link => {
                const s = typeof link.source === 'object' ? link.source.id : link.source;
                const t = typeof link.target === 'object' ? link.target.id : link.target;
                if (rawData.nodes.find(n => n.id === s) && rawData.nodes.find(n => n.id === t)) {
                    const key = `${s}__${t}`;
                    linkMap[key] = linkMap[key] || { ...link, source: s, target: t };
                }
            });
            const categoryGroups = {};
            rawData.nodes.forEach(node => {
                if (node.type === 'Brand' && node.category) {
                    if (!categoryGroups[node.category]) categoryGroups[node.category] = [];
                    categoryGroups[node.category].push(node.id);
                }
            });
            const phantomLinks = [];
            Object.values(categoryGroups).forEach(ids => {
                for (let i = 0; i < ids.length - 1; i++) {
                    phantomLinks.push({ source: ids[i], target: ids[i+1], isPhantom: true, weight: 1 });
                }
            });
            setData({ nodes: rawData.nodes, links: [...Object.values(linkMap), ...phantomLinks] });
        } catch (err) { console.error('❌ Graph error:', err); }
    }, [platform]); // ✅ re-load เมื่อ platform เปลี่ยน

    useEffect(() => { loadGraphData(); }, [loadGraphData]);

    // ── Global Search ──────────────────────────
    const handleGlobalSearch = async () => {
        if (!globalSearch.trim()) return;
        setIsLoading(true);
        try {
            await fetch(cfg.searchEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: globalSearch, limit: 5 })
            });
            await loadGraphData();
            setGlobalSearch('');
        } catch { alert('เกิดข้อผิดพลาดในการค้นหา'); }
        finally { setIsLoading(false); }
    };

    // ── Easter Egg ─────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e) => {
            const newProg = e.key === konamiCode[konamiProgress] ? konamiProgress + 1 : 0;
            setKonamiProgress(newProg);
            if (newProg === konamiCode.length) {
                setEasterEggActive(true);
                setKonamiProgress(0);
                setTimeout(() => setEasterEggActive(false), 5000);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [konamiProgress]);

    // ── Physics ────────────────────────────────
    useEffect(() => {
        if (!fgRef.current) return;
        fgRef.current.d3Force('charge', d3.forceManyBody().strength(-300));
        fgRef.current.d3Force('collide', d3.forceCollide().radius(n => getNodeSize(n) + 15).iterations(3));
        fgRef.current.d3Force('link').distance(l => l.isPhantom ? 50 : 150);
        fgRef.current.d3ReheatSimulation();
    }, [data, dimensions]);

    // ── Resize ─────────────────────────────────
    useEffect(() => {
        const update = () => {
            if (isFullScreen) {
                setDimensions({ width: window.innerWidth, height: window.innerHeight });
            } else if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };
        setTimeout(update, 150);
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [isFullScreen]);

    // ── Auto Zoom Fit ──────────────────────────
    useEffect(() => {
        if (fgRef.current) setTimeout(() => fgRef.current.zoomToFit(1000, 50), 800);
    }, [data]);

    // ── Highlights ─────────────────────────────
    const updateHighlights = useCallback((node) => {
        const hNodes = new Set(), hLinks = new Set();
        if (node) {
            hNodes.add(node.id);
            data.links.forEach(link => {
                if (link.isPhantom) return;
                const s = typeof link.source === 'object' ? link.source.id : link.source;
                const t = typeof link.target === 'object' ? link.target.id : link.target;
                if (s === node.id || t === node.id) { hLinks.add(link); hNodes.add(s); hNodes.add(t); }
            });
        }
        setHighlightNodes(hNodes);
        setHighlightLinks(hLinks);
    }, [data.links]);

    // ── Auto Zoom to Category ──────────────────
    useEffect(() => {
        if (!selectedCategory || !fgRef.current || !data.nodes.length) return;
        const catNodes = data.nodes.filter(node => {
            if (node.category === selectedCategory) return true;
            if (node.type === 'Influencer') {
                return data.links.some(l => {
                    const src = typeof l.source === 'object' ? l.source : data.nodes.find(n => n.id === l.source);
                    const tgt = typeof l.target === 'object' ? l.target : data.nodes.find(n => n.id === l.target);
                    return (src?.id === node.id && tgt?.category === selectedCategory) || (tgt?.id === node.id && src?.category === selectedCategory);
                });
            }
            return false;
        });
        if (!catNodes.length) return;
        const avgX = catNodes.reduce((s, n) => s + (n.x || 0), 0) / catNodes.length;
        const avgY = catNodes.reduce((s, n) => s + (n.y || 0), 0) / catNodes.length;
        let maxD = 0;
        catNodes.forEach(n => { const d = Math.sqrt((n.x-avgX)**2 + (n.y-avgY)**2); if (d > maxD) maxD = d; });
        setTimeout(() => { fgRef.current.centerAt(avgX, avgY, 1000); fgRef.current.zoom(Math.min(3, Math.max(1.2, 400 / (maxD + 100))), 400); }, 100);
    }, [selectedCategory, data]);

    // ── ?highlight= from Favorites ─────────────
    useEffect(() => {
        const name = new URLSearchParams(location.search).get('highlight');
        if (!name || !data.nodes.length || !fgRef.current) return;
        const target = data.nodes.find(n => n.name === name);
        if (!target) return;
        const hNodes = new Set(), hLinks = new Set();
        hNodes.add(target.id);
        data.links.forEach(link => {
            if (link.isPhantom) return;
            const s = typeof link.source === 'object' ? link.source.id : link.source;
            const t = typeof link.target === 'object' ? link.target.id : link.target;
            if (s === target.id || t === target.id) { hLinks.add(link); hNodes.add(s); hNodes.add(t); }
        });
        setLocalFilter(name); setSelectedNode(target); setHoverNode(target);
        setHighlightNodes(hNodes); setHighlightLinks(hLinks);
        setTimeout(() => { if (fgRef.current && target.x != null) { fgRef.current.centerAt(target.x, target.y, 1000); fgRef.current.zoom(3, 1000); } }, 800);
    }, [location.search, data.nodes, data.links]);

    // ── Local Filter ───────────────────────────
    useEffect(() => {
        if (!localFilter.trim()) { if (!selectedNode) { setHighlightNodes(new Set()); setHoverNode(null); } return; }
        const match = data.nodes.find(n => n.name.toLowerCase().includes(localFilter.toLowerCase()));
        if (match && fgRef.current) {
            setHoverNode(match); updateHighlights(match);
            fgRef.current.centerAt(match.x, match.y, 1000); fgRef.current.zoom(3, 1000);
        }
    }, [localFilter, data.nodes, updateHighlights, selectedNode]);

    // ── Interaction Handlers ───────────────────
    const handleNodeHover = (node) => { if (selectedNode || localFilter) return; setHoverNode(node || null); updateHighlights(node); };
    const handleNodeClick = (node) => {
        const n = node === selectedNode ? null : node;
        setSelectedNode(n); setHoverNode(n); updateHighlights(n); setLocalFilter('');
        if (fgRef.current) {
            if (n) { fgRef.current.centerAt(node.x, node.y, 1000); fgRef.current.zoom(1.75, 1000); }
            else fgRef.current.zoomToFit(1000, 50);
        }
    };
    const handleBackgroundClick = () => {
        setSelectedNode(null); setHoverNode(null); setLocalFilter('');
        setHighlightNodes(new Set()); setHighlightLinks(new Set());
        if (fgRef.current) fgRef.current.zoomToFit(1000);
    };

    // ── Avatar Lazy Load ───────────────────────
    const loadAvatarForNode = useCallback((node) => {
        const name = node.name;
        if (imgCache.current[name] || avatarFetching.current[name]) return;
        avatarFetching.current[name] = true;
        fetch(`${API}/api/avatar/${encodeURIComponent(name)}`)
            .then(r => r.json())
            .then(({ avatar }) => {
                const img = new Image();
                img.src = avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
                img.onload = () => {
                    imgCache.current[name] = img;
                    if (fgRef.current) { fgRef.current.pauseAnimation(); fgRef.current.resumeAnimation(); }
                };
                img.onerror = () => { const fb = new Image(); fb.src = 'https://cdn-icons-png.flaticon.com/512/847/847969.png'; imgCache.current[name] = fb; };
            }).catch(() => { avatarFetching.current[name] = false; });
    }, []);

    // ── Paint Node ─────────────────────────────
    const paintNode = useCallback((node, ctx, globalScale) => {
        const isHover    = hoverNode === node;
        const isSelected = selectedNode === node;
        const isNeighbor = highlightNodes.has(node.id);
        const isInf      = node.type === 'Influencer';
        const radius     = getNodeSize(node);
        const color      = getNodeColor(node);

        let alpha = 1;
        if (selectedCategory) {
            const match = node.category === selectedCategory || (isInf && data.links.some(l => (l.source?.id === node.id || l.target?.id === node.id) && (l.source?.category === selectedCategory || l.target?.category === selectedCategory)));
            alpha = match ? 1 : 0.1;
        } else if (hoverNode || selectedNode || localFilter) {
            alpha = (isHover || isSelected || isNeighbor) ? 1 : 0.1;
        }
        ctx.globalAlpha = alpha;

        if (easterEggActive && isInf) { ctx.shadowBlur = Math.sin(Date.now() / 200) * 10 + 10; ctx.shadowColor = '#ff00ff'; }

        ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff'; ctx.fill();

        if (isInf) {
            const cached = imgCache.current[node.name];
            if (cached?.complete && cached.naturalHeight !== 0) {
                ctx.save(); ctx.beginPath(); ctx.arc(node.x, node.y, radius - 2, 0, 2 * Math.PI); ctx.clip();
                ctx.drawImage(cached, node.x - radius, node.y - radius, radius * 2, radius * 2); ctx.restore();
            } else {
                ctx.fillStyle = '#dfe6e9'; ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = '#2d3436'; ctx.font = `bold ${radius * 0.6}px Arial`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(node.name.charAt(0).toUpperCase(), node.x, node.y);
                loadAvatarForNode(node);
            }
        } else {
            ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = (isHover || isSelected) ? '#ff5757' : (isInf ? '#b2bec3' : '#fff');
        ctx.lineWidth = (isHover || isSelected) ? 4 : 2; ctx.stroke();

        const fs = (isInf ? 14 : 12) / globalScale;
        if (globalScale > 0.8 || isHover || isSelected || (isInf && node.followers > 500000)) {
            ctx.font = `${isHover ? 'bold ' : ''}${fs}px Prompt, sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const ly = node.y + radius + 10;
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.strokeText(node.name, node.x, ly);
            ctx.fillStyle = '#2d3436'; ctx.fillText(node.name, node.x, ly);
        }
        ctx.globalAlpha = 1;
    }, [hoverNode, selectedNode, highlightNodes, selectedCategory, data.links, localFilter, easterEggActive, loadAvatarForNode]);

    // ── Render ─────────────────────────────────
    return (
        <div className="analysis-page">
            <LoadingOverlay isLoading={isLoading} />

            {/* ── Header Bar ── */}
            <div className="analysis-header-container">
                {/* Back button */}
                <button className="back-to-platform-btn" onClick={() => navigate('/analysis')}>
                    ← เลือก Platform
                </button>

                {/* Platform Badge */}
                <div className="platform-badge-display" style={{ background: cfg.color }}>
                    {cfg.label}
                </div>

                {/* Search */}
                <div className="search-bar-wrapper">
                    <i className="fi fi-br-search search-icon"></i>
                    <input
                        type="text"
                        placeholder={cfg.placeholder}
                        className="search-input-top"
                        value={globalSearch}
                        onChange={e => setGlobalSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
                    />
                </div>
                <button
                    className="analyze-btn-small"
                    onClick={handleGlobalSearch}
                    disabled={isLoading}
                    style={{ background: cfg.btnColor }}
                >
                    {isLoading ? 'Loading...' : 'ค้นหา'}
                </button>
            </div>

            <div className="analysis-content">
                {/* ── Color Legend (Horizontal Pills) ── */}
                <div className="legend-section">
                    <div className="legend-title">
                        🎨 COLOR LEGEND — คลิกเพื่อกรอง
                    </div>
                    <div className="legend-pills">
                        {/* All pill */}
                        <div
                            className={`legend-pill ${selectedCategory === '' ? 'selected' : ''}`}
                            onClick={() => { setSelectedCategory(''); fgRef.current?.zoomToFit(1000, 50); }}
                        >
                            <div className="legend-dot" style={{ background: '#f0f0f0', border: '1.5px solid #ccc' }} />
                            All
                        </div>
                        {/* Category pills */}
                        {CATEGORIES.map((cat, i) => (
                            <div
                                key={i}
                                className={`legend-pill ${selectedCategory === cat.name ? 'selected' : ''}`}
                                onClick={() => {
                                    if (selectedCategory === cat.name) {
                                        setSelectedCategory('');
                                        fgRef.current?.zoomToFit(1000, 50);
                                    } else {
                                        setSelectedCategory(cat.name);
                                    }
                                }}
                            >
                                <div className="legend-dot" style={{ background: cat.color }} />
                                {cat.name}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Filter Toolbar ── */}
                <div className="graph-wrapper">
                <div className="filter-toolbar">
                    <div className="left-filters">
                        <div className="search-bar-wrapper">
                            <i className="fi fi-br-search search-icon"></i>
                            <input type="text" placeholder="ค้นหาภายในกราฟ..." className="search-input-top" value={localFilter} onChange={e => setLocalFilter(e.target.value)} />
                        </div>
                    </div>
                    <div className="right-actions">
                        <button className="action-text" onClick={() => fetch(`${API}/api/sync-mongo-to-neo4j`).then(() => loadGraphData())}>
                            <i className="fi fi-rr-database"></i> Sync DB
                        </button>
                        <button className="action-text" onClick={() => { loadGraphData(); setLocalFilter(''); setSelectedCategory(''); }}>
                            <i className="fi fi-rr-refresh"></i> รีเฟรช
                        </button>
                        <ExportButton />
                    </div>
                </div>

                {/* ── Graph Outer wrapper ── */}
                <div className="graph-outer">

                    {/* ── Node Popup — อยู่นอก graph-container เพื่อไม่โดน overflow:hidden ตัด ── */}
                    {selectedNode && (
                        <div className="node-popup-card" style={{ zIndex: 1000 }}>
                            <button className="popup-close-btn" onClick={handleBackgroundClick}>✖</button>
                            <div className="popup-avatar" style={{ background: getNodeColor(selectedNode), boxShadow: `0 4px 15px ${getNodeColor(selectedNode)}40`, overflow: 'hidden', padding: 0 }}>
                                {imgCache.current[selectedNode.name]?.src
                                    ? <img src={imgCache.current[selectedNode.name].src} alt={selectedNode.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    : selectedNode.name.charAt(0).toUpperCase()
                                }
                            </div>
                            <div>
                                <h3 className="popup-name">{selectedNode.name}</h3>
                                <span className="popup-type-badge" style={{ background: selectedNode.type === 'Influencer' ? cfg.color : '#888' }}>
                                    {selectedNode.type}
                                </span>
                            </div>
                            <div className="popup-divider"></div>
                            {selectedNode.type === 'Brand' ? (
                                <div style={{ marginBottom: '10px' }}>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '4px' }}>Category</span>
                                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: getNodeColor(selectedNode), background: `${getNodeColor(selectedNode)}15`, padding: '6px 15px', borderRadius: '8px' }}>
                                        {selectedNode.category || '-'}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', width: '100%' }}>
                                        <div className="popup-stat-box">
                                            <div className="popup-stat-label"><i className="fi fi-rr-users-alt"></i> Followers</div>
                                            <span className="popup-stat-value">{selectedNode.followers?.toLocaleString() || '-'}</span>
                                        </div>
                                        <div className="popup-stat-box">
                                            <div className="popup-stat-label" style={{ color: '#ff4757' }}><i className="fi fi-rr-heart"></i> Likes</div>
                                            <span className="popup-stat-value">{selectedNode.totalLikes?.toLocaleString() || '-'}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                        <a href={cfg.profileUrl(selectedNode.name)} target="_blank" rel="noreferrer" className="popup-view-btn" style={{ flex: 1, textAlign: 'center', background: cfg.btnColor }}>
                                            View Profile <i className="fi fi-rr-arrow-small-right"></i>
                                        </a>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleToggleFavorite(selectedNode.name); }}
                                            disabled={favLoading}
                                            style={{ padding: '10px 14px', borderRadius: '10px', border: favorites.has(selectedNode.name) ? '2px solid #ffc800' : '2px solid #e0e0e0', background: favorites.has(selectedNode.name) ? '#fff9e6' : '#fff', cursor: 'pointer', fontSize: '18px', transition: 'all 0.2s', flexShrink: 0 }}
                                            title={favorites.has(selectedNode.name) ? 'ลบออกจาก Favorites' : 'เพิ่มใน Favorites'}
                                        >
                                            {favorites.has(selectedNode.name) ? '⭐' : '☆'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── Graph Canvas ── */}
                    <div ref={containerRef}
                        className={`graph-container ${isFullScreen ? 'fullscreen' : ''}`}
                        style={{
                            position: isFullScreen ? 'fixed' : 'relative',
                            top: 0, left: 0,
                            width: isFullScreen ? '100vw' : '100%',
                            zIndex: isFullScreen ? 99999 : 1,
                            backgroundColor: '#f8f9fa'
                        }}
                    >
                        <button className="fullscreen-btn" onClick={() => setIsFullScreen(!isFullScreen)}>
                            {isFullScreen ? '✖️' : '⤢'}
                        </button>

                        <ForceGraph2D ref={fgRef} graphData={data} width={dimensions.width} height={dimensions.height} backgroundColor="#e6e6e6"
                            linkColor={link => {
                                if (link.isPhantom) return 'rgba(0,0,0,0)';
                                if (!hoverNode && !selectedNode && !localFilter && !selectedCategory) return 'rgba(66,66,66,0.3)';
                                if (selectedCategory) return (link.source?.category === selectedCategory || link.target?.category === selectedCategory) ? '#a5a5a5' : 'rgba(200,200,200,0.1)';
                                return highlightLinks.has(link) ? '#333' : 'rgba(200,200,200,0.1)';
                            }}
                            linkWidth={link => highlightLinks.has(link) ? getLinkWidth(link) : (link.isPhantom ? 0 : 1.25)}
                            nodeCanvasObject={paintNode}
                            nodePointerAreaPaint={(node, color, ctx) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(node.x, node.y, getNodeSize(node) + 5, 0, 2 * Math.PI); ctx.fill(); }}
                            onNodeHover={handleNodeHover} onNodeClick={handleNodeClick} onBackgroundClick={handleBackgroundClick}
                        />
                    </div>

                </div>
                </div>
            </div>
        </div>
    );
}

export default Analysis;