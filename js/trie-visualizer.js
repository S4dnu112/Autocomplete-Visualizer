class TrieVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.currentPathIds = new Set();
        this.hasCentered = false;
        this.initD3();
    }

    initD3() {
        d3.select(this.container).select("svg").remove();

        this.zoom = d3.zoom()
            .scaleExtent([0.1, 2])
            .on("zoom", (event) => {
                this.innerG.attr("transform", event.transform);
            });

        this.svg = d3.select(this.container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .call(this.zoom);

        this.innerG = this.svg.append("g");
        
        this.svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 20)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#cbd5e1");
            
        this.hasCentered = false;
    }

    updateGraph(trieStructure, pathIds) {
        this.currentPathIds = pathIds || new Set();

        if (!trieStructure || !trieStructure.root) {
            this.innerG.selectAll("*").remove();
            return;
        }

        const g = new dagre.graphlib.Graph()
            .setGraph({ 
                rankdir: 'TB', 
                nodesep: 30, 
                ranksep: 50, 
                marginx: 20, 
                marginy: 20 
            })
            .setDefaultEdgeLabel(() => ({}));

        const visited = new Set();
        const stack = [trieStructure.root];
        
        g.setNode(trieStructure.root.id.toString(), { 
            label: 'ROOT', 
            width: 40, 
            height: 40, 
            data: trieStructure.root 
        });
        visited.add(trieStructure.root.id);

        while (stack.length > 0) {
            const node = stack.pop();
            const nodeId = node.id.toString();

            if (node.children) {
                Object.keys(node.children).sort().forEach(char => {
                    const child = node.children[char];
                    const childId = child.id.toString();

                    if (!visited.has(child.id)) {
                        g.setNode(childId, { 
                            label: `Q${child.id}`, 
                            width: 40, 
                            height: 40, 
                            data: child 
                        });
                        visited.add(child.id);
                        stack.push(child);
                    }

                    const edgeName = `${nodeId}-${childId}-${char}`;
                    g.setEdge(nodeId, childId, { 
                        label: char,
                        curve: d3.curveBasis,
                        name: edgeName 
                    });
                });
            }
        }

        dagre.layout(g);

        // Edges
        const edges = g.edges();
        const linkSelection = this.innerG.selectAll(".link-group")
            .data(edges, d => {
                const edge = g.edge(d);
                return edge.name || `${d.v}-${d.w}`;
            });

        const linkEnter = linkSelection.enter().append("g")
            .attr("class", "link-group")
            .attr("opacity", 0);

        const lineGen = d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveBasis);

        linkEnter.append("path")
            .attr("class", "link")
            .attr("marker-end", "url(#arrowhead)")
            .attr("d", d => lineGen(g.edge(d).points));

        linkEnter.append("text")
            .attr("class", "edge-label")
            .attr("dy", "-3")
            .attr("text-anchor", "middle")
            .text(d => g.edge(d).label)
            .attr("x", d => {
                const points = g.edge(d).points;
                return points[Math.floor(points.length / 2)].x;
            })
            .attr("y", d => {
                const points = g.edge(d).points;
                return points[Math.floor(points.length / 2)].y;
            });

        const linkUpdate = linkEnter.merge(linkSelection);
        linkUpdate.transition().duration(500).attr("opacity", 1);
        
        linkUpdate.select("path")
            .transition().duration(500)
            .attr("d", d => lineGen(g.edge(d).points))
            .attr("class", d => {
                const isActive = this.currentPathIds.has(parseInt(d.v)) && this.currentPathIds.has(parseInt(d.w));
                return isActive ? "link active" : "link";
            });

        linkUpdate.select("text")
            .transition().duration(500)
            .attr("x", d => {
                const pts = g.edge(d).points;
                return pts[Math.floor(pts.length/2)].x;
            })
            .attr("y", d => {
                const pts = g.edge(d).points;
                return pts[Math.floor(pts.length/2)].y;
            });

        linkSelection.exit().transition().duration(200).attr("opacity", 0).remove();

        // Nodes
        const nodes = g.nodes();
        const nodeSelection = this.innerG.selectAll(".node")
            .data(nodes, d => d);

        const nodeEnter = nodeSelection.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => {
                const node = g.node(d);
                return `translate(${node.x},${node.y})`;
            })
            .style("opacity", 0);

        nodeEnter.append("circle").attr("class", "main-circle").attr("r", 18);
        nodeEnter.append("circle").attr("class", "inner-ring").attr("r", 0);
        nodeEnter.append("text")
            .attr("dy", "0.35em")
            .text(d => {
                const node = g.node(d);
                return node.label === 'ROOT' ? 'R' : node.label;
            });

        const nodeUpdate = nodeEnter.merge(nodeSelection);
        nodeUpdate.transition().duration(500)
            .attr("transform", d => {
                const node = g.node(d);
                return `translate(${node.x},${node.y})`;
            })
            .style("opacity", 1);

        nodeUpdate.each(function(d) {
            const nodeData = g.node(d).data;
            const el = d3.select(this);
            const isActive = pathIds ? pathIds.has(nodeData.id) : false;

            el.select(".main-circle").attr("r", isActive ? 22 : 18);
            
            el.select(".inner-ring").attr("r", () => {
                if (!nodeData.isEndOfWord) return 0;
                return isActive ? 18 : 14;
            });

            let classes = "node";
            if (nodeData.isEndOfWord) classes += " is-end";
            if (isActive) classes += " active";
            el.attr("class", classes);
        });

        nodeSelection.exit().transition().duration(200).attr("opacity", 0).remove();
        
        if(!this.hasCentered) {
            this.resetZoom();
            this.hasCentered = true;
        }
    }

    resetZoom() {
        try {
            const bbox = this.innerG.node().getBBox();
            
            // If empty or single root node (small bbox), center explicitly
            if (bbox.width < 50 && bbox.height < 50) {
                this.svg.transition().duration(750)
                    .call(this.zoom.transform, d3.zoomIdentity.translate(this.width / 2, 50).scale(1));
                return;
            }

            const scale = Math.min(this.width / bbox.width, this.height / bbox.height) * 0.8;
            const transform = d3.zoomIdentity
                .translate(this.width / 2, 50)
                .scale(Math.min(scale, 1)) 
                .translate(-bbox.x - bbox.width/2, 0);

            this.svg.transition().duration(750).call(this.zoom.transform, transform);
        } catch(e) {
            // Fallback
            this.svg.call(this.zoom.transform, d3.zoomIdentity.translate(this.width/2, 50).scale(1));
        }
    }
}