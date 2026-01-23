import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';

function Analysis() {
    const fgRef = useRef();
    const containerRef = useRef();

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

    // --- 🆕 Search States (เพิ่มใหม่) ---
    const [globalSearch, setGlobalSearch] = useState(''); // สำหรับช่องบน (ดึงข้อมูลใหม่)
    const [localFilter, setLocalFilter] = useState('');   // สำหรับช่องล่าง (ค้นหาในกราฟ)
    const [isLoading, setIsLoading] = useState(false);    // สถานะโหลดข้อมูล
    const [selectedCategory, setSelectedCategory] = useState(''); // สำหรับเก็บหมวดหมู่ที่เลือก
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // รายชื่อหมวดหมู่ (Categories List)
    const categories = [
        "Fashion", "Beauty & Personal Care", "Health & Wellness", "Food & Beverage",
        "Mom & Kids", "IT & Gadgets", "Home & Living", "Toys & Collectibles",
        "Pet", "Automotive", "Lifestyle"
    ];

    // --- 1. Color Logic (CODE เดิม) ---
    const getNodeColor = (node) => {
        if (node.type === 'Influencer') return '#FFFFFF';
        const map = {
            "Fashion": "#aa5763", "Beauty & Personal Care": "#ff6ba4",
            "Health & Wellness": "#3ad8ec", "Food & Beverage": "#502320",
            "Mom & Kids": "#ffb555", "IT & Gadgets": "#ab96ff",
            "Home & Living": "#ffc800", "Toys & Collectibles": "#30304b",
            "Pet": "#a17132", "Automotive": "#66281f", "Lifestyle": "#3fc974"
        };
        return map[node.category] || '#BDC3C7';
    };

    // --- 2. Link Width (CODE เดิม) ---
    const getLinkWidth = (link) => {
        if (link.isPhantom) return 0; // เส้นล่องหน

        const views = link.totalViews || 0;
        const likes = link.totalLikes || 0;

        // 👇 ดึงค่า Followers จาก Influencer (Node ต้นทาง) 👇
        let followers = 0;
        // เช็คว่า link.source เป็น Object หรือยัง (Graph process แล้วหรือยัง)
        if (link.source && typeof link.source === 'object' && link.source.followers) {
            followers = link.source.followers;
        } else if (data.nodes.length > 0) {
            // กรณีเป็น ID (ตอนโหลดครั้งแรก) ให้วิ่งไปหาใน nodes
            const sourceNode = data.nodes.find(n => n.id === link.source);
            if (sourceNode) followers = sourceNode.followers || 0;
        }

        // ให้ค่าน้ำหนัก Followers สัก 50% จะได้ช่วยดันให้เส้นหนาขึ้นสำหรับคนดัง
        const score = views + likes + (followers * 0.5);

        // ปรับสเกล
        const maxScore = 500000; // ลดเพดานลงหน่อย เส้นจะได้หนาง่ายขึ้น
        const minWidth = 2;
        const maxWidth = 12; // เพิ่มความหนาสูงสุดให้สะใจ

        const normalized = Math.min(score, maxScore) / maxScore;
        return minWidth + (normalized * (maxWidth - minWidth));
    };

    // --- 3. Fetch Data & Create Phantom Links (ปรับปรุงให้เรียกใช้ซ้ำได้) ---
    const loadGraphData = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/graph-data');
            const rawData = await res.json();

            // (Logic เดิม: จัดการ Link และ Phantom Links)
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

    // --- 🆕 Function: Global Search (ค้นหาข้อมูลใหม่) ---
    const handleGlobalSearch = async () => {
        if (!globalSearch.trim()) return;
        setIsLoading(true);
        try {
            console.log("🔍 Searching New Data:", globalSearch);
            // 1. เรียก API ค้นหา
            await fetch('http://localhost:5000/api/search-tiktok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: globalSearch, limit: 10 })
            });
            // 2. โหลดกราฟใหม่
            await loadGraphData();
            setGlobalSearch(''); // เคลียร์ช่องค้นหา
        } catch (err) {
            console.error("Search Error:", err);
            alert("เกิดข้อผิดพลาดในการค้นหา");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Initial Load (เรียกครั้งแรก) ---
    useEffect(() => {
        const init = async () => {
            // Sync รอบแรก
            await fetch('http://localhost:5000/api/sync-airtable-to-neo4j').catch(console.error);
            await loadGraphData();
        };
        init();
    }, [platform]);

    // --- 4. Helper: Update Highlights (CODE เดิม) ---
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

    // --- 5. Interaction Handlers (CODE เดิม) ---
    const handleNodeHover = (node) => {
        if (selectedNode || localFilter) return; // ถ้ามีการ Lock หรือ Filter อยู่ ไม่ต้องเปลี่ยนตามเมาส์
        setHoverNode(node || null);
        updateHighlights(node);
    };

    const handleNodeClick = (node) => {
        // 1. Toggle Logic: ถ้าคลิกตัวเดิมให้ยกเลิก (เป็น null), ถ้าตัวใหม่ให้เลือกตัวนั้น
        const newNode = node === selectedNode ? null : node;
        
        setSelectedNode(newNode);
        setHoverNode(newNode);
        updateHighlights(newNode);
        setLocalFilter(''); // เคลียร์ช่องค้นหา (เพื่อให้เห็นกราฟเต็มๆ)

        // 2. Camera Animation Logic
        if (fgRef.current) {
            if (newNode) {
                // ✅ กรณี "เลือก Node": ให้พุ่งเข้าไปหา
                // ปรับเวลาเป็น 1000ms (1 วิ) ทั้งคู่ เพื่อให้กล้องขยับสมูทพร้อมกัน
                fgRef.current.centerAt(node.x, node.y, 1000); 
                fgRef.current.zoom(1.75, 1000); // เลข 4 คือระดับความซูม (ยิ่งเยอะยิ่งใกล้)
            } else {
                // ❌ กรณี "ยกเลิก" (คลิกซ้ำตัวเดิม): ให้ถอยออกมาดูภาพรวม
                // เพิ่ม padding 50px เพื่อไม่ให้กราฟชิดขอบจอเกินไป
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

    // --- 🆕 Effect: Local Filter (ค้นหาในกราฟ) ---
    useEffect(() => {
        if (localFilter.trim() === '') {
            if (!selectedNode) {
                setHighlightNodes(new Set());
                setHoverNode(null);
            }
            return;
        }
        // หา Node ที่ชื่อตรงกับที่พิมพ์
        const matchedNode = data.nodes.find(n => n.name.toLowerCase().includes(localFilter.toLowerCase()));
        if (matchedNode) {
            setHoverNode(matchedNode);
            updateHighlights(matchedNode);
            // ซูมไปหา
            if (fgRef.current) {
                fgRef.current.centerAt(matchedNode.x, matchedNode.y, 1000);
                fgRef.current.zoom(3, 1000);
            }
        }
    }, [localFilter, data.nodes, updateHighlights, selectedNode]);

    // --- 6. Resize (CODE เดิม) ---
    useEffect(() => {
    const updateSize = () => {
      if (isFullScreen) {
        // ✅ ถ้าเต็มจอ: ให้ใช้ขนาด Window (หน้าจอ)
        setDimensions({ 
            width: window.innerWidth, 
            height: window.innerHeight 
        });
      } else if (containerRef.current) {
        // ✅ ถ้าปกติ: ให้ใช้ขนาดของกล่อง Div เดิม
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    // สั่งให้ทำทันทีเมื่อกดปุ่ม (รอ Animation นิดนึง 100ms)
    setTimeout(updateSize, 100);
    
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isFullScreen]);


  


    
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
                
                <button className="analyze-btn-small" onClick={handleGlobalSearch} disabled={isLoading} style={{marginRight: '15px'}}>
                    {isLoading ? 'Loading...' : 'ค้นหา'}
                </button>

                <div className={`toggle-container ${platform === 'youtube' ? 'youtube-active' : 'tiktok-active'}`}>
                     <div className="toggle-slider"></div>
                     <button className="toggle-btn-slide btn-tiktok" onClick={() => setPlatform('tiktok')}><i className="fi fi-brands-tik-tok"></i> TikTok</button>
                     <button className="toggle-btn-slide btn-youtube" onClick={() => setPlatform('youtube')}><i className="fi fi-brands-youtube"></i> YouTube</button>
                </div>
            </div>

            <div className="analysis-content">
                <div className="title-section">
                    <h1>Analysis Mode</h1>
                    <p>วิเคราะห์เครือข่ายความสัมพันธ์</p>
                </div>

                <div className="filter-toolbar">
                    <div className="left-filters">
                        
                        {/* Local Search */}
                        <div style={{position: 'relative'}}>
                            <i className="fi fi-rr-search" style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888'}}></i>
                            <input 
                                type="text" 
                                placeholder="🔍 ค้นหาในกราฟ..." 
                                style={{ padding: '8px 10px 8px 35px', borderRadius: '20px', border: '1px solid #ddd', fontSize: '14px', width: '200px', outline: 'none' }}
                                value={localFilter}
                                onChange={(e) => setLocalFilter(e.target.value)}
                            />
                        </div>

                        {/* ✅ Clean Custom Dropdown */}
                        <div className="custom-dropdown-container">
                            <div 
                                className={`dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span style={{color: selectedCategory ? '#000' : '#555', fontWeight: selectedCategory ? '500' : 'normal', display:'flex', alignItems:'center', gap:'8px', fontSize:'14px'}}>
                                    {selectedCategory ? (
                                        <><span style={{width:'10px', height:'10px', borderRadius:'50%', background: '#ff4757', display:'inline-block'}}></span> {selectedCategory}</>
                                    ) : (
                                        <><i className="fi fi-rr-apps"></i> ทุกหมวดหมู่ (All)</>
                                    )}
                                </span>
                                <i className={`fi fi-rr-angle-small-down`} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}></i>
                            </div>

                            {isDropdownOpen && (
                                <div className="dropdown-menu">
                                    <div 
                                        className={`dropdown-item ${selectedCategory === '' ? 'selected' : ''}`}
                                        onClick={() => { setSelectedCategory(''); setIsDropdownOpen(false); }}
                                    >
                                        <i className="fi fi-rr-apps"></i> ทั้งหมด (All Categories)
                                    </div>
                                    <div style={{height: '1px', background: '#eee', margin: '5px 0'}}></div>
                                    
                                    {categories.map((cat) => (
                                        <div 
                                            key={cat}
                                            className={`dropdown-item ${selectedCategory === cat ? 'selected' : ''}`}
                                            onClick={() => { setSelectedCategory(cat); setIsDropdownOpen(false); }}
                                        >
                                            <span style={{width:'6px', height:'6px', borderRadius:'50%', background: selectedCategory === cat ? '#ff4757' : '#ddd'}}></span>
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                    <div className="right-actions">
                        <button className="action-text" onClick={() => { loadGraphData(); setLocalFilter(''); setSelectedCategory(''); }}><i className="fi fi-rr-refresh"></i> รีเฟรช</button>
                        <button className="export-btn"><i className="fi fi-rr-download"></i> ดาวน์โหลด</button>
                    </div>
                </div>
                
                {/* Graph Container */}
                <div 
                    ref={containerRef} 
                    className={`graph-container ${isFullScreen ? 'fullscreen' : ''}`}
                    // ยังคง Inline Style ไว้เฉพาะส่วนนี้เพราะต้อง Dynamic ตาม State Fullscreen
                    style={{ 
                        position: isFullScreen ? 'fixed' : 'relative',
                        top: 0, left: 0,
                        width: isFullScreen ? '100vw' : '100%',
                        height: isFullScreen ? '100vh' : '600px',
                        zIndex: isFullScreen ? 99999 : 1,
                        backgroundColor: isFullScreen ? '#ffffff' : '#fafafa'
                    }}
                >
                    <button className="fullscreen-btn" onClick={() => setIsFullScreen(!isFullScreen)}>
                        {isFullScreen ? '✖️' : '⤢'}
                    </button>

                    {/* ✅ Clean Popup Card */}
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
                                <div style={{marginBottom: '10px'}}>
                                    <span style={{display:'block', fontSize:'12px', color:'#999', marginBottom:'4px'}}>Category</span>
                                    <span style={{ fontSize:'16px', fontWeight:'bold', color: getNodeColor(selectedNode), background: `${getNodeColor(selectedNode)}15`, padding: '6px 15px', borderRadius: '8px' }}>
                                        {selectedNode.category || '-'}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div style={{display:'flex', justifyContent:'center', gap:'20px', width:'100%'}}>
                                        <div className="popup-stat-box">
                                            <div className="popup-stat-label"><i className="fi fi-rr-users-alt"></i> Followers</div>
                                            <span className="popup-stat-value">{selectedNode.followers ? selectedNode.followers.toLocaleString() : '-'}</span>
                                        </div>
                                        <div className="popup-stat-box">
                                            <div className="popup-stat-label" style={{color:'#ff4757'}}><i className="fi fi-rr-heart"></i> Likes</div>
                                            <span className="popup-stat-value">{selectedNode.totalLikes ? selectedNode.totalLikes.toLocaleString() : '-'}</span>
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
                        backgroundColor={isFullScreen ? "#e6e6e6" : "#e6e6e6"}
                        
                        linkColor={link => {
                            if (link.isPhantom) return 'rgba(0,0,0,0)'; 
                            if (!hoverNode && !selectedNode && !localFilter && !selectedCategory) return 'rgba(180, 180, 180, 0.3)';
                            return highlightLinks.has(link) ? '#333' : 'rgba(200,200,200,0.1)';
                        }}
                        linkWidth={link => highlightLinks.has(link) ? getLinkWidth(link) : (link.isPhantom ? 0 : 1)}
                        
                        nodeCanvasObject={(node, ctx, globalScale) => {
                            // ... (Logic การวาด Canvas ปล่อยไว้ใน JS เหมือนเดิม เพราะมันต้องคำนวณตลอดเวลา)
                            const isHover = hoverNode === node;
                            const isSelected = selectedNode === node;
                            const isNeighbor = highlightNodes.has(node.id);
                            const isInfluencer = node.type === 'Influencer';
                            
                            let alpha = 1;
                            if (selectedCategory) {
                                const isMatch = node.category === selectedCategory || (isInfluencer && data.links.some(l => (l.source.id === node.id || l.target.id === node.id) && (l.source.category === selectedCategory || l.target.category === selectedCategory)));
                                alpha = isMatch ? 1 : 0.1;
                            } else if (hoverNode || selectedNode || localFilter) {
                                alpha = (isHover || isSelected || isNeighbor) ? 1 : 0.1;
                            }

                            const label = node.name;
                            const radius = isInfluencer ? 12 : 6;
                            const color = getNodeColor(node);

                            ctx.globalAlpha = alpha;
                            
                            // Shadow
                            ctx.shadowColor = (isHover || isSelected) ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.1)";
                            ctx.shadowBlur = (isHover || isSelected) ? 15 : 5;

                            // Draw Circle
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                            ctx.fillStyle = '#fff';
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                            ctx.fillStyle = color;
                            ctx.fill();

                            // Border
                            ctx.strokeStyle = '#fff';
                            ctx.lineWidth = 2; 
                            ctx.stroke();
                            ctx.shadowColor = null;

                            // Label
                            const showLabel = isHover || isSelected || (isNeighbor && (hoverNode || selectedNode));
                            if (showLabel) {
                                ctx.font = `${isInfluencer ? 'bold' : ''} 12px Prompt, sans-serif`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'top';
                                ctx.fillStyle = '#333';
                                ctx.lineWidth = 3;
                                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                                ctx.strokeText(label, node.x, node.y + radius + 4);
                                ctx.fillText(label, node.x, node.y + radius + 4);
                            }
                            ctx.globalAlpha = 1; 
                        }}
                        
                        onNodeHover={handleNodeHover}
                        onNodeClick={handleNodeClick}
                        onBackgroundClick={handleBackgroundClick}
                        d3Force={('charge', d3.forceManyBody().strength(-300))} 
                        d3Link={(link) => d3.forceLink().distance(link => link.isPhantom ? 20 : 100)} 
                    />
                </div>
            </div>
        </div>
    );
}

export default Analysis;