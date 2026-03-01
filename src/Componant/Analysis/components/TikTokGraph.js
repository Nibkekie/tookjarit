import React, { useRef, useEffect, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';
import { CATEGORY_COLOR_MAP } from '../constants/categories';
import { useAvatarCache } from '../hooks/useAvatarCache';
import NodePopupCard from './NodePopupCard';

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

function TikTokGraph({
    data, dimensions, isFullScreen, setIsFullScreen, containerRef,
    selectedNode, setSelectedNode, hoverNode, setHoverNode,
    highlightNodes, highlightLinks, updateHighlights, clearHighlights,
    selectedCategory, setSelectedCategory, localFilter, easterEggActive,
}) {
    const fgRef = useRef();
    const { imgCache, loadAvatarForNode } = useAvatarCache(fgRef);

    // Physics
    useEffect(() => {
        if (!fgRef.current) return;
        fgRef.current.d3Force('charge', d3.forceManyBody().strength(-300));
        fgRef.current.d3Force('collide', d3.forceCollide().radius(n => getNodeSize(n) + 15).iterations(3));
        fgRef.current.d3Force('link').distance(l => l.isPhantom ? 50 : 150);
        fgRef.current.d3ReheatSimulation();
    }, [data, dimensions]);

    // Auto zoom fit
    useEffect(() => {
        if (fgRef.current) setTimeout(() => fgRef.current.zoomToFit(1000, 50), 800);
    }, [data]);

    // Zoom to category
    useEffect(() => {
        if (!selectedCategory || !fgRef.current || !data.nodes.length) return;
        const catNodes = data.nodes.filter(node => {
            if (node.category === selectedCategory) return true;
            if (node.type === 'Influencer') {
                return data.links.some(l => {
                    const src = typeof l.source === 'object' ? l.source : data.nodes.find(n => n.id === l.source);
                    const tgt = typeof l.target === 'object' ? l.target : data.nodes.find(n => n.id === l.target);
                    return (src?.id === node.id && tgt?.category === selectedCategory) ||
                           (tgt?.id === node.id && src?.category === selectedCategory);
                });
            }
            return false;
        });
        if (!catNodes.length) return;
        const avgX = catNodes.reduce((s, n) => s + (n.x || 0), 0) / catNodes.length;
        const avgY = catNodes.reduce((s, n) => s + (n.y || 0), 0) / catNodes.length;
        let maxD = 0;
        catNodes.forEach(n => { const d = Math.sqrt((n.x - avgX) ** 2 + (n.y - avgY) ** 2); if (d > maxD) maxD = d; });
        setTimeout(() => {
            fgRef.current.centerAt(avgX, avgY, 1000);
            fgRef.current.zoom(Math.min(3, Math.max(1.2, 400 / (maxD + 100))), 400);
        }, 100);
    }, [selectedCategory, data]);

    // Local filter
    useEffect(() => {
        if (!localFilter.trim()) { if (!selectedNode) clearHighlights(); return; }
        const match = data.nodes.find(n => n.name.toLowerCase().includes(localFilter.toLowerCase()));
        if (match && fgRef.current) {
            setHoverNode(match);
            updateHighlights(match);
            fgRef.current.centerAt(match.x, match.y, 1000);
            fgRef.current.zoom(3, 1000);
        }
    }, [localFilter, data.nodes]);  // eslint-disable-line

    const handleNodeHover = (node) => {
        if (selectedNode || localFilter) return;
        setHoverNode(node || null);
        updateHighlights(node);
    };

    const handleNodeClick = (node) => {
        const n = node === selectedNode ? null : node;
        setSelectedNode(n); setHoverNode(n); updateHighlights(n);
        if (fgRef.current) {
            if (n) { fgRef.current.centerAt(node.x, node.y, 1000); fgRef.current.zoom(1.75, 1000); }
            else fgRef.current.zoomToFit(1000, 50);
        }
    };

    const handleBgClick = () => {
        setSelectedNode(null);
        clearHighlights();
        if (fgRef.current) fgRef.current.zoomToFit(1000);
    };

    const paintNode = useCallback((node, ctx, globalScale) => {
        const isHover    = hoverNode === node;
        const isSelected = selectedNode === node;
        const isNeighbor = highlightNodes.has(node.id);
        const isInf      = node.type === 'Influencer';
        const radius     = getNodeSize(node);
        const color      = getNodeColor(node);

        let alpha = 1;
        if (selectedCategory) {
            const match = node.category === selectedCategory || (isInf && data.links.some(l =>
                (l.source?.id === node.id || l.target?.id === node.id) &&
                (l.source?.category === selectedCategory || l.target?.category === selectedCategory)
            ));
            alpha = match ? 1 : 0.1;
        } else if (hoverNode || selectedNode || localFilter) {
            alpha = (isHover || isSelected || isNeighbor) ? 1 : 0.1;
        }
        ctx.globalAlpha = alpha;

        if (easterEggActive && isInf) {
            ctx.shadowBlur = Math.sin(Date.now() / 200) * 10 + 10;
            ctx.shadowColor = '#ff00ff';
        }

        // White bg
        ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff'; ctx.fill();

        if (isInf) {
            const cached = imgCache.current[node.name];
            if (cached?.complete && cached.naturalHeight !== 0) {
                ctx.save();
                ctx.beginPath(); ctx.arc(node.x, node.y, radius - 2, 0, 2 * Math.PI); ctx.clip();
                ctx.drawImage(cached, node.x - radius, node.y - radius, radius * 2, radius * 2);
                ctx.restore();
            } else {
                ctx.fillStyle = '#dfe6e9';
                ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = '#2d3436';
                ctx.font = `bold ${radius * 0.6}px Arial`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(node.name.charAt(0).toUpperCase(), node.x, node.y);
                loadAvatarForNode(node);
            }
        } else {
            ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color; ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = (isHover || isSelected) ? '#ff5757' : (isInf ? '#b2bec3' : '#fff');
        ctx.lineWidth = (isHover || isSelected) ? 4 : 2;
        ctx.stroke();

        const fs = (isInf ? 14 : 12) / globalScale;
        if (globalScale > 0.8 || isHover || isSelected || (isInf && node.followers > 500000)) {
            ctx.font = `${isHover ? 'bold ' : ''}${fs}px Prompt, sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const ly = node.y + radius + 10;
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.strokeText(node.name, node.x, ly);
            ctx.fillStyle = '#2d3436'; ctx.fillText(node.name, node.x, ly);
        }
        ctx.globalAlpha = 1;
    }, [hoverNode, selectedNode, highlightNodes, selectedCategory, data.links,
        localFilter, easterEggActive, loadAvatarForNode, imgCache]);

    return (
        <div ref={containerRef}
            className={`graph-container ${isFullScreen ? 'fullscreen' : ''}`}
            style={{
                position: isFullScreen ? 'fixed' : 'relative',
                top: 0, left: 0,
                width: isFullScreen ? '100vw' : '100%',
                height: isFullScreen ? '100vh' : '600px',
                zIndex: isFullScreen ? 99999 : 1,
                backgroundColor: isFullScreen ? '#fff' : '#fafafa'
            }}
        >
            <button className="fullscreen-btn" onClick={() => setIsFullScreen(!isFullScreen)}>
                {isFullScreen ? '✖️' : '⤢'}
            </button>

            <NodePopupCard node={selectedNode} onClose={handleBgClick} />

            <ForceGraph2D
                ref={fgRef}
                graphData={data}
                width={dimensions.width}
                height={dimensions.height}
                backgroundColor="#e6e6e6"
                linkColor={link => {
                    if (link.isPhantom) return 'rgba(0,0,0,0)';
                    if (!hoverNode && !selectedNode && !localFilter && !selectedCategory) return 'rgba(66,66,66,0.3)';
                    if (selectedCategory) return (link.source?.category === selectedCategory || link.target?.category === selectedCategory) ? '#a5a5a5' : 'rgba(200,200,200,0.1)';
                    return highlightLinks.has(link) ? '#333' : 'rgba(200,200,200,0.1)';
                }}
                linkWidth={link => highlightLinks.has(link) ? getLinkWidth(link) : (link.isPhantom ? 0 : 1.25)}
                nodeCanvasObject={paintNode}
                nodePointerAreaPaint={(node, color, ctx) => {
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(node.x, node.y, getNodeSize(node) + 5, 0, 2 * Math.PI); ctx.fill();
                }}
                onNodeHover={handleNodeHover}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBgClick}
            />
        </div>
    );
}

export default TikTokGraph;
