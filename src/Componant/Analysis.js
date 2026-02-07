import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';
import './Analysis.css';

function Analysis() {
    const fgRef = useRef();
    const containerRef = useRef();
    const imgCache = useRef({});

    // --- Data States ---
    const [data, setData] = useState({ nodes: [], links: [] });
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [isFullScreen, setIsFullScreen] = useState(false);

    // --- Interaction States ---
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [platform, setPlatform] = useState('tiktok');

    // --- Search States ---
    const [globalSearch, setGlobalSearch] = useState('');
    const [localFilter, setLocalFilter] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // 🎉 EASTER EGG STATE
    const [konamiProgress, setKonamiProgress] = useState(0);
    const [easterEggActive, setEasterEggActive] = useState(false);
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

    const categories = [
        "Fashion", "Beauty & Personal Care", "Health & Wellness", "Food & Beverage",
        "Mom & Kids", "IT & Gadgets", "Home & Living", "Toys & Collectibles",
        "Pet", "Automotive", "Lifestyle"
    ];

    // 🎉 EASTER EGG: Konami Code Detector
    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key;
            const expected = konamiCode[konamiProgress];

            if (key === expected) {
                const newProgress = konamiProgress + 1;
                setKonamiProgress(newProgress);

                if (newProgress === konamiCode.length) {
                    setEasterEggActive(true);
                    setKonamiProgress(0);
                    
                    // 🎊 Show celebration
                    setTimeout(() => setEasterEggActive(false), 5000);
                }
            } else {
                setKonamiProgress(0);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [konamiProgress]);

    // --- Node Size Calculation ---
    const getNodeSize = useCallback((node) => {
        if (node.type === 'Brand') return 30;
        if (!node.followers) return 25;
        const size = Math.log(node.followers) * 4 + 10;
        return Math.min(Math.max(size, 25), 80);
    }, []);

    // --- Color Logic ---
    const getNodeColor = (node) => {
        const map = {
            "Fashion": "#aa5763", "Beauty & Personal Care": "#ff6ba4",
            "Health & Wellness": "#3ad8ec", "Food & Beverage": "#502320",
            "Mom & Kids": "#ffb555", "IT & Gadgets": "#ab96ff",
            "Home & Living": "#ffc800", "Toys & Collectibles": "#30304b",
            "Pet": "#a17132", "Automotive": "#66281f", "Lifestyle": "#3fc974"
        };
        if (node.type === 'Influencer') return '#2d3436';
        return map[node.category] || '#BDC3C7';
    };

    // --- Link Width Calculation ---
    const getLinkWidth = (link) => {
        if (link.isPhantom) return 0;

        const views = link.totalViews || 0;
        const likes = link.totalLikes || 0;

        let followers = 0;
        if (link.source && typeof link.source === 'object' && link.source.followers) {
            followers = link.source.followers;
        } else if (data.nodes.length > 0) {
            const sourceNode = data.nodes.find(n => n.id === link.source);
            if (sourceNode) followers = sourceNode.followers || 0;
        }

        const score = views + likes + (followers * 0.5);
        const maxScore = 500000;
        const minWidth = 2;
        const maxWidth = 12;

        const normalized = Math.min(score, maxScore) / maxScore;
        return minWidth + (normalized * (maxWidth - minWidth));
    };

    // --- Fetch Data ---
    const loadGraphData = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/graph-data');
            const rawData = await res.json();

            console.log("📊 Sample Node:", rawData.nodes[0]); // ✅ Debug log

            const linkMap = {};
            rawData.links.forEach(link => {
                const s = typeof link.source === 'object' ? link.source.id : link.source;
                const t = typeof link.target === 'object' ? link.target.id : link.target;
                const exists = rawData.nodes.find(n => n.id === s) && rawData.nodes.find(n => n.id === t);
                if (exists) {
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
                    phantomLinks.push({
                        source: ids[i], target: ids[i + 1], isPhantom: true, weight: 1
                    });
                }
            });

            const allLinks = [...Object.values(linkMap), ...phantomLinks];
            setData({ nodes: rawData.nodes, links: allLinks });

        } catch (err) {
            console.error("❌ Error loading data:", err);
        }
    };

    // --- Global Search ---
    const handleGlobalSearch = async () => {
        if (!globalSearch.trim()) return;
        setIsLoading(true);
        try {
            await fetch('http://localhost:5000/api/search-tiktok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: globalSearch, limit: 5 })
            });
            await loadGraphData();
            setGlobalSearch('');
        } catch (err) {
            console.error("Search Error:", err);
            alert("เกิดข้อผิดพลาดในการค้นหา");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Initial Load ---
    useEffect(() => {
        const init = async () => {
            await fetch('http://localhost:5000/api/sync-mongo-to-neo4j').catch(console.error);
            await loadGraphData();
        };
        init();
    }, [platform]);

    // --- Physics Engine ---
    useEffect(() => {
        if (fgRef.current) {
            fgRef.current.d3Force('charge', d3.forceManyBody().strength(-300));
            fgRef.current.d3Force('collide', d3.forceCollide()
                .radius(node => getNodeSize(node) + 15)
                .iterations(3)
            );
            fgRef.current.d3Force('link').distance(link => link.isPhantom ? 50 : 150);
            fgRef.current.d3ReheatSimulation();
        }
    }, [data, dimensions, getNodeSize]);

    // --- Update Highlights ---
    const updateHighlights = useCallback((node) => {
        const hNodes = new Set();
        const hLinks = new Set();
        if (node) {
            hNodes.add(node.id);
            data.links.forEach(link => {
                if (link.isPhantom) return;
                const s = typeof link.source === 'object' ? link.source.id : link.source;
                const t = typeof link.target === 'object' ? link.target.id : link.target;
                if (s === node.id || t === node.id) {
                    hLinks.add(link);
                    hNodes.add(s);
                    hNodes.add(t);
                }
            });
        }
        setHighlightNodes(hNodes);
        setHighlightLinks(hLinks);
    }, [data.links]);

    // --- Interaction Handlers ---
    const handleNodeHover = (node) => {
        if (selectedNode || localFilter) return;
        setHoverNode(node || null);
        updateHighlights(node);
    };

    const handleNodeClick = (node) => {
        const newNode = node === selectedNode ? null : node;
        setSelectedNode(newNode);
        setHoverNode(newNode);
        updateHighlights(newNode);
        setLocalFilter('');

        if (fgRef.current) {
            if (newNode) {
                fgRef.current.centerAt(node.x, node.y, 1000);
                fgRef.current.zoom(1.75, 1000);
            } else {
                fgRef.current.zoomToFit(1000, 50);
            }
        }
    };

    const handleBackgroundClick = () => {
        setSelectedNode(null);
        setHoverNode(null);
        setLocalFilter('');
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
        if (fgRef.current) fgRef.current.zoomToFit(1000);
    };

    // --- Local Filter Effect ---
    useEffect(() => {
        if (localFilter.trim() === '') {
            if (!selectedNode) {
                setHighlightNodes(new Set());
                setHoverNode(null);
            }
            return;
        }
        const matchedNode = data.nodes.find(n => n.name.toLowerCase().includes(localFilter.toLowerCase()));
        if (matchedNode) {
            setHoverNode(matchedNode);
            updateHighlights(matchedNode);
            if (fgRef.current) {
                fgRef.current.centerAt(matchedNode.x, matchedNode.y, 1000);
                fgRef.current.zoom(3, 1000);
            }
        }
    }, [localFilter, data.nodes, updateHighlights, selectedNode]);

    // --- Resize Handler ---
    useEffect(() => {
        const updateSize = () => {
            if (isFullScreen) {
                setDimensions({ width: window.innerWidth, height: window.innerHeight });
            } else if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };
        setTimeout(updateSize, 100);
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [isFullScreen]);

    // --- Auto Zoom to Fit ---
    useEffect(() => {
        if (fgRef.current) {
            setTimeout(() => {
                fgRef.current.zoomToFit(1000, 50);
            }, 800);
        }
    }, [data]);

    // --- Custom Node Painting (✅ แก้ไขตรงนี้) ---
    const paintNode = useCallback((node, ctx, globalScale) => {
        const isHover = hoverNode === node;
        const isSelected = selectedNode === node;
        const isNeighbor = highlightNodes.has(node.id);
        const isInfluencer = node.type === 'Influencer';

        const radius = getNodeSize(node);
        const color = getNodeColor(node);

        // 🎉 Easter Egg Effect
        const glowIntensity = easterEggActive ? Math.sin(Date.now() / 200) * 10 + 10 : 0;

        // Dimming
        let alpha = 1;
        if (selectedCategory) {
            const isMatch = node.category === selectedCategory || 
                (isInfluencer && data.links.some(l => 
                    (l.source.id === node.id || l.target.id === node.id) && 
                    (l.source.category === selectedCategory || l.target.category === selectedCategory)
                ));
            alpha = isMatch ? 1 : 0.1;
        } else if (hoverNode || selectedNode || localFilter) {
            alpha = (isHover || isSelected || isNeighbor) ? 1 : 0.1;
        }
        ctx.globalAlpha = alpha;

        // 🎉 Easter Egg Glow
        if (easterEggActive && isInfluencer) {
            ctx.shadowBlur = glowIntensity;
            ctx.shadowColor = '#ff00ff';
        }

        // Draw background
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Draw Avatar (Influencer only) - ✅ แก้ไขตรงนี้
        if (isInfluencer) {
            const cacheKey = `${node.id}_${node.authorAvatar || 'placeholder'}`;
            let img = imgCache.current[cacheKey];

            if (!img) {
                img = new Image();
                img.crossOrigin = "anonymous"; // ✅ สำคัญมาก!
                
                // ✅ ลำดับความสำคัญในการเลือก URL
                const avatarUrl = node.authorAvatar || 
                                 node.avatar || 
                                 "https://cdn-icons-png.flaticon.com/512/847/847969.png";

                img.src = avatarUrl;
                imgCache.current[cacheKey] = img;

                img.onerror = () => {
                    console.warn(`⚠️ Failed to load avatar for ${node.name}, using placeholder`);
                    img.src = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
                };

                img.onload = () => {
                    console.log(`✅ Avatar loaded for ${node.name}`);
                };
            }

            // Draw image if loaded
            if (img.complete && img.naturalHeight !== 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius - 2, 0, 2 * Math.PI, false);
                ctx.clip();
                ctx.drawImage(img, node.x - radius, node.y - radius, radius * 2, radius * 2);
                ctx.restore();
            } else {
                // Fallback: show initials
                ctx.fillStyle = '#dfe6e9';
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                ctx.fill();

                ctx.fillStyle = '#2d3436';
                ctx.font = `bold ${radius * 0.6}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.name.charAt(0).toUpperCase(), node.x, node.y);
            }
        } else {
            // Draw Brand
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
        }

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw border
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.strokeStyle = (isHover || isSelected) ? '#ff5757' : (isInfluencer ? '#b2bec3' : '#fff');
        ctx.lineWidth = (isHover || isSelected) ? 4 : 2;
        ctx.stroke();

        // Draw label
        const fontSize = (isInfluencer ? 14 : 12) / globalScale;
        if (globalScale > 0.8 || isHover || isSelected || (isInfluencer && node.followers > 500000)) {
            ctx.font = `${isHover ? 'bold' : ''} ${fontSize}px Prompt, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelY = node.y + radius + 10;

            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.strokeText(node.name, node.x, labelY);

            ctx.fillStyle = '#2d3436';
            ctx.fillText(node.name, node.x, labelY);
        }

        ctx.globalAlpha = 1;
    }, [hoverNode, selectedNode, highlightNodes, selectedCategory, data.links, getNodeSize, localFilter, easterEggActive]);

    return (
        <div className="analysis-page">
            {/* Header */}
            <div className="analysis-header-container">
                <div className="search-bar-wrapper">
                    <i className="fi fi-br-search search-icon"></i>
                    <input
                        type="text"
                        placeholder="ค้นหา #Hashtag หรือชื่อ Influencer"
                        className="search-input-top"
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                    />
                </div>

                <button className="analyze-btn-small" onClick={handleGlobalSearch} disabled={isLoading} style={{ marginRight: '15px' }}>
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

            <div className="analysis-content">
                <div className="title-section">
                    <h1>Analysis Mode</h1>
                    <p>วิเคราะห์เครือข่ายความสัมพันธ์</p>
                </div>

                {/* ✨ Color Legend Section - อธิบายสีของหมวดหมู่ Brand */}
                <div className="color-legend-section">
                    <div className="legend-header">
                        <i className="fi fi-rr-palette"></i>
                        <span>คำอธิบายสี (Color Legend)</span>
                        <small style={{ marginLeft: '10px', color: '#999', fontSize: '12px' }}>
                            คลิกเพื่อกรองตามหมวดหมู่
                        </small>
                    </div>
                    <div className="legend-grid">
                        {[
                            { name: "Fashion", color: "#aa5763" },
                            { name: "Beauty & Personal Care", color: "#ff6ba4" },
                            { name: "Health & Wellness", color: "#3ad8ec" },
                            { name: "Food & Beverage", color: "#502320" },
                            { name: "Mom & Kids", color: "#ffb555" },
                            { name: "IT & Gadgets", color: "#ab96ff" },
                            { name: "Home & Living", color: "#ffc800" },
                            { name: "Toys & Collectibles", color: "#30304b" },
                            { name: "Pet", color: "#a17132" },
                            { name: "Automotive", color: "#66281f" },
                            { name: "Lifestyle", color: "#3fc974" }
                        ].map((category, index) => (
                            <div 
                                key={index} 
                                className="legend-item"
                                onClick={() => setSelectedCategory(category.name)}
                                style={{
                                    opacity: selectedCategory && selectedCategory !== category.name ? 0.4 : 1,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <div 
                                    className="legend-color-box" 
                                    style={{ 
                                        background: category.color,
                                        boxShadow: selectedCategory === category.name ? `0 0 12px ${category.color}80` : 'none',
                                        transform: selectedCategory === category.name ? 'scale(1.2)' : 'scale(1)',
                                        transition: 'all 0.3s ease',
                                        border: selectedCategory === category.name ? `2px solid ${category.color}` : '2px solid transparent'
                                    }}
                                ></div>
                                <span className="legend-label" style={{
                                    fontWeight: selectedCategory === category.name ? '600' : '400'
                                }}>
                                    {category.name}
                                </span>
                            </div>
                        ))}
                        <div 
                            className="legend-item"
                            onClick={() => setSelectedCategory('')}
                            style={{
                                opacity: selectedCategory === '' ? 1 : 0.4,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <div 
                                className="legend-color-box" 
                                style={{ 
                                    background: '#96C1C5',
                                    boxShadow: selectedCategory === '' ? '0 0 12px #2d2d3680' : 'none',
                                    transform: selectedCategory === '' ? 'scale(1.2)' : 'scale(1)',
                                    transition: 'all 0.3s ease',
                                    border: selectedCategory === '' ? '2px solid #96C1C5' : '2px solid transparent'
                                }}
                            ></div>
                            <span className="legend-label" style={{
                                fontWeight: selectedCategory === '' ? '600' : '400'
                            }}>
                                All Categories
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filter Toolbar */}
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
                        <button className="action-text" onClick={() => { loadGraphData(); setLocalFilter(''); setSelectedCategory(''); }}>
                            <i className="fi fi-rr-refresh"></i> รีเฟรช
                        </button>
                        
                        <div className="custom-dropdown-container">
                            <div
                                className={`dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span style={{ color: selectedCategory ? '#000' : '#555', fontWeight: selectedCategory ? '500' : 'normal', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                    {selectedCategory ? (
                                        <>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff4757', display: 'inline-block' }}></span>
                                            {selectedCategory}
                                        </>
                                    ) : (
                                        <>
                                            <i className="fi fi-rr-apps"></i> ทุกหมวดหมู่ (All)
                                        </>
                                    )}
                                </span>
                                <i className="fi fi-rr-angle-small-down" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}></i>
                            </div>

                            {isDropdownOpen && (
                                <div className="dropdown-menu">
                                    <div
                                        className={`dropdown-item ${selectedCategory === '' ? 'selected' : ''}`}
                                        onClick={() => { setSelectedCategory(''); setIsDropdownOpen(false); }}
                                    >
                                        <i className="fi fi-rr-apps"></i> ทั้งหมด (All Categories)
                                    </div>
                                    <div style={{ height: '1px', background: '#eee', margin: '5px 0' }}></div>

                                    {categories.map((cat) => (
                                        <div
                                            key={cat}
                                            className={`dropdown-item ${selectedCategory === cat ? 'selected' : ''}`}
                                            onClick={() => { setSelectedCategory(cat); setIsDropdownOpen(false); }}
                                        >
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedCategory === cat ? '#ff4757' : '#ddd' }}></span>
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Graph Container */}
                <div
                    ref={containerRef}
                    className={`graph-container ${isFullScreen ? 'fullscreen' : ''}`}
                    style={{
                        position: isFullScreen ? 'fixed' : 'relative',
                        top: 0,
                        left: 0,
                        width: isFullScreen ? '100vw' : '100%',
                        height: isFullScreen ? '100vh' : '600px',
                        zIndex: isFullScreen ? 99999 : 1,
                        backgroundColor: isFullScreen ? '#ffffff' : '#fafafa'
                    }}
                >
                    <button className="fullscreen-btn" onClick={() => setIsFullScreen(!isFullScreen)}>
                        {isFullScreen ? '✖️' : '⤢'}
                    </button>

                    {/* Popup Card */}
                    {selectedNode && (
                        <div className="node-popup-card">
                            <button className="popup-close-btn" onClick={handleBackgroundClick}>✖</button>

                            <div className="popup-avatar" style={{ background: getNodeColor(selectedNode), boxShadow: `0 4px 15px ${getNodeColor(selectedNode)}40` }}>
                                {selectedNode.name.charAt(0).toUpperCase()}
                            </div>

                            <div>
                                <h3 className="popup-name">{selectedNode.name}</h3>
                                <span className="popup-type-badge" style={{ background: selectedNode.type === 'Influencer' ? '#000' : '#888' }}>
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
                                            <div className="popup-stat-label">
                                                <i className="fi fi-rr-users-alt"></i> Followers
                                            </div>
                                            <span className="popup-stat-value">
                                                {selectedNode.followers ? selectedNode.followers.toLocaleString() : '-'}
                                            </span>
                                        </div>
                                        <div className="popup-stat-box">
                                            <div className="popup-stat-label" style={{ color: '#ff4757' }}>
                                                <i className="fi fi-rr-heart"></i> Likes
                                            </div>
                                            <span className="popup-stat-value">
                                                {selectedNode.totalLikes ? selectedNode.totalLikes.toLocaleString() : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <a href={`https://www.tiktok.com/@${selectedNode.name}`} target="_blank" rel="noreferrer" className="popup-view-btn">
                                        View Full Profile <i className="fi fi-rr-arrow-small-right"></i>
                                    </a>
                                </>
                            )}
                        </div>
                    )}

                    <ForceGraph2D
                        ref={fgRef}
                        graphData={data}
                        width={dimensions.width}
                        height={dimensions.height}
                        backgroundColor="#e6e6e6"
                        linkColor={link => {
                            if (link.isPhantom) return 'rgba(0,0,0,0)';
                            if (!hoverNode && !selectedNode && !localFilter && !selectedCategory) return 'rgba(66, 66, 66, 0.3)';
                            if (selectedCategory) {
                                const isMatch = (link.source.category === selectedCategory) || (link.target.category === selectedCategory);
                                return isMatch ? '#a5a5a5' : 'rgba(200,200,200,0.1)';
                            }
                            return highlightLinks.has(link) ? '#333' : 'rgba(200,200,200,0.1)';
                        }}
                        linkWidth={link => highlightLinks.has(link) ? getLinkWidth(link) : (link.isPhantom ? 0 : 1.25)}
                        nodeCanvasObject={paintNode}
                        nodePointerAreaPaint={(node, color, ctx) => {
                            const radius = getNodeSize(node);
                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI, false);
                            ctx.fill();
                        }}
                        onNodeHover={handleNodeHover}
                        onNodeClick={handleNodeClick}
                        onBackgroundClick={handleBackgroundClick}
                    />
                </div>
            </div>
        </div>
    );
}

export default Analysis;