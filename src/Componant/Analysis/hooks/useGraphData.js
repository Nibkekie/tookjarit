import { useState, useCallback } from 'react';

const API = 'http://localhost:5000';

export function useGraphData() {
    const [data, setData] = useState({ nodes: [], links: [] });

    const loadGraphData = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/graph-data`);
            const rawData = await res.json();

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
                    phantomLinks.push({ source: ids[i], target: ids[i + 1], isPhantom: true, weight: 1 });
                }
            });

            setData({ nodes: rawData.nodes, links: [...Object.values(linkMap), ...phantomLinks] });
        } catch (err) {
            console.error('❌ Error loading graph data:', err);
        }
    }, []);

    const searchTikTok = useCallback(async (keyword) => {
        await fetch(`${API}/api/search-tiktok`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword, limit: 5 })
        });
        await loadGraphData();
    }, [loadGraphData]);

    const syncDB = useCallback(async () => {
        await fetch(`${API}/api/sync-mongo-to-neo4j`);
        await loadGraphData();
    }, [loadGraphData]);

    return { data, loadGraphData, searchTikTok, syncDB };
}
