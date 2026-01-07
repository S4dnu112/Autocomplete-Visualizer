class DagVisualizer {
    constructor(containerId, countElementId) {
        this.container = document.getElementById(containerId);
        this.countElement = document.getElementById(countElementId);
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.activeData = { nodes: new Set(), edges: new Set() }; 
        this.hasCentered = false;
        // Store graph dimensions to avoid DOM timing issues
        this.graphDim = { width: 0, height: 0 }; 
        this.initD3();
    }

    initD3() {
        d3.select(this.container).select("svg").remove();

        this.zoom = d3.zoom()
            .scaleExtent([0.1, 2])
            .on("zoom", (event) => this.innerG.attr("transform", event.transform));

        this.svg = d3.select(this.container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .call(this.zoom);

        this.innerG = this.svg.append("g");
        
        this.svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 20).attr("refY", 0)
            .attr("markerWidth", 6).attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#cbd5e1");
    }

    updateGraph(dagStructure, activeData) {
        this.activeData = activeData || { nodes: new Set(), edges: new Set() };
        if (!dagStructure?.root) {
            this.innerG.selectAll("*").remove();
            if (this.countElement) this.countElement.innerText = "0";
            return;
        }

        const g = new dagre.graphlib.Graph({ multigraph: true })
            .setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 50, marginx: 20, marginy: 20 })
            .setDefaultEdgeLabel(() => ({}));

        const stack = [dagStructure.root];
        const visited = new Set([dagStructure.root.id]);
        
        g.setNode(dagStructure.root.id.toString(), { label: 'ROOT', width: 40, height: 40, data: dagStructure.root });

        while (stack.length) {
            const node = stack.pop();
            const nodeId = node.id.toString();

            if (node.children) {
                Object.keys(node.children).sort().forEach(char => {
                    const child = node.children[char];
                    const childId = child.id.toString();

                    if (!visited.has(child.id)) {
                        g.setNode(childId, { label: `Q${child.id}`, width: 40, height: 40, data: child });
                        visited.add(child.id);
                        stack.push(child);
                    }

                    const edgeName = `${nodeId}-${childId}-${char}`;
                    g.setEdge(nodeId, childId, { label: char, name: edgeName }, edgeName);
                });
            }
        }

        if (this.countElement) this.countElement.innerText = g.nodes().length;
        
        dagre.layout(g);
        
        // CAPTURE DIMENSIONS HERE (Dagre calculates this instantly)
        this.graphDim = g.graph();

        // Render Edges
        const lineGen = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveBasis);
        const edges = this.innerG.selectAll(".link-group").data(g.edges(), d => d.name);

        const edgesEnter = edges.enter().append("g").attr("class", "link-group").attr("opacity", 0);
        edgesEnter.append("path").attr("class", "link").attr("marker-end", "url(#arrowhead)");
        edgesEnter.append("text").attr("class", "edge-label").attr("dy", "-3").attr("text-anchor", "middle");

        const edgesMerge = edgesEnter.merge(edges);
        edgesMerge.transition().duration(500).attr("opacity", 1);
        
        edgesMerge.select("path")
            .transition().duration(500)
            .attr("d", d => lineGen(g.edge(d).points))
            .attr("class", d => this.activeData.edges.has(d.name) ? "link active" : "link");

        edgesMerge.select("text")
            .text(d => g.edge(d).label)
            .transition().duration(500)
            .attr("x", d => {
                const pts = g.edge(d).points;
                return pts[Math.floor(pts.length / 2)].x;
            })
            .attr("y", d => {
                const pts = g.edge(d).points;
                return pts[Math.floor(pts.length / 2)].y;
            });

        edges.exit().transition().duration(200).attr("opacity", 0).remove();

        // Render Nodes
        const nodes = this.innerG.selectAll(".node").data(g.nodes(), d => d);

        const nodesEnter = nodes.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${g.node(d).x},${g.node(d).y})`)
            .attr("opacity", 0);
            
        nodesEnter.append("circle").attr("class", "main-circle").attr("r", 18);
        nodesEnter.append("circle").attr("class", "inner-ring").attr("r", 0);
        nodesEnter.append("text").attr("dy", "0.35em");

        const nodesMerge = nodesEnter.merge(nodes);
        nodesMerge.transition().duration(500)
            .attr("transform", d => `translate(${g.node(d).x},${g.node(d).y})`)
            .attr("opacity", 1);

        nodesMerge.each(function(d) {
            const data = g.node(d).data;
            const el = d3.select(this);
            const isActive = activeData.nodes?.has(data.id);
            
            el.classed("is-end", data.isEndOfWord).classed("active", isActive);
            el.select("text").text(g.node(d).label === 'ROOT' ? 'R' : g.node(d).label);
            el.select(".main-circle").attr("r", isActive ? 22 : 18);
            el.select(".inner-ring").attr("r", (data.isEndOfWord && isActive) ? 18 : (data.isEndOfWord ? 14 : 0));
        });

        nodes.exit().transition().duration(200).attr("opacity", 0).remove();

        if (!this.hasCentered) {
            this.resetZoom();
            this.hasCentered = true;
        }
    }

    resetZoom() {
        // USE CAPTURED DIMENSIONS INSTEAD OF DOM
        // This avoids waiting for the 500ms transition to finish
        const width = this.graphDim.width || 50;
        const height = this.graphDim.height || 50;
        
        // Standard centering logic
        const scale = Math.min(this.width / width, this.height / height) * 0.8;
        
        // Dagre graphs typically start at (0,0), so we center based on width/height
        const transform = d3.zoomIdentity
            .translate(this.width / 2, 50)
            .scale(Math.min(scale, 1))
            .translate(-width / 2, 0);

        this.svg.transition().duration(750).call(this.zoom.transform, transform);
    }
}