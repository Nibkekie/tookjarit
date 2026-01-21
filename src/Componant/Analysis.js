import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';


function Analysis() {
  const navigate = useNavigate();
  const fgRef = useRef();
  const containerRef = useRef();
  
  // State
  const [data, setData] = useState({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // State สำหรับปุ่ม Toggle (TikTok / YouTube)
  const [platform, setPlatform] = useState('tiktok'); 

  // --- 1. Logic สีของ Node ---
  const getNodeColor = (node) => {
    const category = node.category || '';
    if (['ลิปทินท์', 'ลิปกลอส', 'บลัชออน', 'เครื่องสำอาง'].some(c => category.includes(c))) return '#EA2264';
    if (['เสื้อผ้า', 'แฟชั่น', 'กระเป๋า'].some(c => category.includes(c))) return '#F78D60';
    if (['คอนเสิร์ต', 'บันเทิง'].some(c => category.includes(c))) return '#640D5F';
    if (['ของใช้', 'น้ำหอม'].some(c => category.includes(c))) return '#0D1164';
    if (node.type === 'Influencer') return '#ffffff'; 
    return '#0F828C'; 
  };

  // --- 2. ดึงข้อมูล ---
  useEffect(() => {
    // ในอนาคตสามารถส่ง ?platform=${platform} ไปกับ API ได้
    fetch('http://localhost:5000/api/graph-data')
      .then(res => res.json())
      .then(rawData => {
        const linkMap = {};
        rawData.links.forEach(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          const sourceNode = rawData.nodes.find(n => n.id === sourceId);
          const targetNode = rawData.nodes.find(n => n.id === targetId);

          if (sourceNode && targetNode) {
            const key = `${sourceId}__${targetId}`;
            if (!linkMap[key]) {
              linkMap[key] = { ...link, source: sourceId, target: targetId, weight: link.weight || 1 };
            } else {
              linkMap[key].weight += link.weight || 1;
            }
          }
        });

        const aggregatedLinks = Object.values(linkMap);
        const brandGroups = {};
        aggregatedLinks.forEach(link => {
          const brandId = link.target;
          if (!brandGroups[brandId]) brandGroups[brandId] = [];
          brandGroups[brandId].push(link);
        });

        Object.values(brandGroups).forEach(links => {
          links.sort((a, b) => b.weight - a.weight).forEach((link, index) => {
            link.localRank = index;
          });
        });

        setData({ nodes: rawData.nodes, links: aggregatedLinks });
        setTimeout(() => setIsReady(true), 100);
      })
      .catch(err => console.error("Error fetching graph data:", err));
  }, [platform]); // โหลดใหม่เมื่อเปลี่ยน platform

  // --- 3. ฟิสิกส์กราฟ ---
  useEffect(() => {
    if (fgRef.current && isReady && data.nodes.length > 0) {
      const graph = fgRef.current;
      graph.d3Force('charge').strength(-120); 
      graph.d3Force('link').distance(80);     
      graph.d3Force('collision', d3.forceCollide().radius(node => (node.type === 'Influencer' ? 30 : 15)).strength(0.8));
      graph.d3Force('center').strength(0.2);
      graph.d3ReheatSimulation();
    }
  }, [data, isReady, isFullScreen]);

  // --- 4. ปรับขนาดจอ ---
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

  return (
    <div className="analysis-page">
      {/* Header */}
      <div className="analysis-header-container">
        <div className="search-bar-wrapper">
          <i className="fi fi-br-search search-icon"></i>
          <input type="text" placeholder="ค้นหา #Hashtag หรือชื่อ Influencer" className="search-input-top" />
        </div>

        {/* Sliding Toggle (ใช้ Class จาก App.css) */}
        <div className={`toggle-container ${platform === 'youtube' ? 'youtube-active' : 'tiktok-active'}`}>
             <div className="toggle-slider"></div>
             
             <button className="toggle-btn-slide btn-tiktok" onClick={() => setPlatform('tiktok')}>
                <i className="fi fi-brands-tik-tok"></i> TikTok
             </button>
             
             <button className="toggle-btn-slide btn-youtube" onClick={() => setPlatform('youtube')}>
                <i className="fi fi-brands-youtube"></i> YouTube
             </button>
        </div>

        <button className="analyze-btn-small">ค้นหา</button>
      </div>

      <div className="analysis-content">
        <div className="title-section">
            <h1>Analysis Mode</h1>
            <p>วิเคราะห์เครือข่ายความสัมพันธ์</p>
        </div>

        <div className="filter-toolbar">
            <div className="left-filters">
                <button className="filter-pill"><i className="fi fi-rr-filter"></i> กรองยอดไลค์</button>
                <button className="filter-pill">กรองผู้ติดตาม</button>
            </div>
            <div className="right-actions">
                <button className="action-text"><i className="fi fi-rr-refresh"></i> รีเฟรช</button>
                <button className="export-btn"><i className="fi fi-rr-download"></i> ดาวน์โหลดข้อมูล</button>
            </div>
        </div>

        {/* Graph Container (ใช้ Class จาก App.css) */}
        <div ref={containerRef} className={`graph-container ${isFullScreen ? 'fullscreen' : ''}`}>
            
            {/* ปุ่มกด Full Screen */}
            <button 
                className="fullscreen-btn"
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? "ปิด" : "เต็มจอ"}
            >
                {isFullScreen ? '✖️' : '⤢'}
            </button>

            {isFullScreen && (
                <div className="fullscreen-label">
                    🔍 มุมมองเต็มจอ (Full Screen)
                </div>
            )}

            <ForceGraph2D
                ref={fgRef}
                graphData={data}
                width={dimensions.width}
                height={dimensions.height}
                backgroundColor={isFullScreen ? "#ffffff" : "#fafafa"} 

                // Styling logic ยังคงอยู่ใน JS เพราะต้องคำนวณ data
                linkWidth={link => (link.localRank === 0 ? 3 : link.localRank === 1 ? 2 : 0.5)}
                linkColor={() => 'rgba(180, 180, 180, 0.3)'}
                
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const label = node.name;
                  const isInfluencer = node.type === 'Influencer';
                  const radius = isInfluencer ? 12 : 6; 
                  
                  // Shadow
                  ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
                  ctx.shadowBlur = 5;
                  
                  // BG Circle
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                  ctx.fillStyle = '#fff';
                  ctx.fill();

                  // Color Circle
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                  ctx.fillStyle = getNodeColor(node);
                  ctx.fill();
                  
                  // Stroke
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 2; 
                  ctx.stroke();
                  ctx.shadowColor = null;

                  // Text Label
                  const showLabel = isInfluencer || globalScale > 2.5;
                  if (showLabel) {
                    const fontSize = isInfluencer ? 14/globalScale : 10/globalScale;
                    ctx.font = `${isInfluencer ? 'bold' : ''} ${fontSize}px Prompt, sans-serif`; 
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top'; 
                    
                    ctx.lineJoin = "round";
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
                    ctx.strokeText(label, node.x, node.y + radius + 2); 
                    
                    ctx.fillStyle = '#333'; 
                    ctx.fillText(label, node.x, node.y + radius + 2); 
                  }
                }}
                onEngineStop={() => fgRef.current.zoomToFit(400, 50)}
            />
        </div>

        {/* Note ใต้กราฟ */}
        {!isFullScreen && (
            <div className="graph-note-bottom">
                <p>Interactive Network Graph Visualization powered by Neo4j </p>
                <p style={{fontSize: '0.8em', color: '#ccc'}}>ข้อมูลอัปเดตล่าสุด: แบบ Real-time</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default Analysis;