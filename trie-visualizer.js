// ========================================
// TRIE VISUALIZER (Handles Trees & DAGs)
// ========================================

class TrieVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.currentPathIds = new Set();
        this.initD3();
    }

    initD3() {
        // Clear previous SVG if any
        d3.select(this.container).select("svg").remove();

        this.zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {
                this.g.attr("transform", event.transform);
            });

        this.svg = d3.select(this.container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .call(this.zoom);

        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.width / 2}, 50)`);

        // Widen the separation to allow space for merging nodes
        this.treeLayout = d3.tree()
            .nodeSize([60, 80])
            .separation((a, b) => (a.parent == b.parent ? 1.2 : 1.5));
    }

    updateGraph(trie, pathIds) {
        this.currentPathIds = pathIds || new Set();
        const rootData = trie.toHierarchy();
        const root = d3.hierarchy(rootData);

        // 1. Run the standard Tree Layout calculation
        this.treeLayout(root);

        // 2. DAG MERGE LOGIC
        // D3 Tree creates a separate object for every path.
        // We need to group them by 'd.data.id' and merge their positions.
        const nodesById = new Map();

        root.descendants().forEach(d => {
            const id = d.data.id;
            if (!nodesById.has(id)) {
                nodesById.set(id, []);
            }
            nodesById.get(id).push(d);
        });

        // Compute the average X coordinate for every Node ID
        const finalNodes = [];
        nodesById.forEach((instances, id) => {
            // Average X
            const avgX = instances.reduce((sum, d) => sum + d.x, 0) / instances.length;
            const avgY = instances[0].y; // Y (depth) should be consistent

            // Update ALL instances to this new position so links follow
            instances.forEach(d => {
                d.x = avgX;
                d.y = avgY;
            });

            // Push just one representative for drawing the circle
            finalNodes.push(instances[0]);
        });

        // 3. Generate Links
        // We must draw links from the (now moved) source to the (now moved) target.
        // We use a Map to ensure we don't draw the same visual edge twice.
        const uniqueLinks = new Map();
        
        root.links().forEach(link => {
            const sourceId = link.source.data.id;
            const targetId = link.target.data.id;
            const label = link.target.data.name;
            const key = `${sourceId}-${targetId}-${label}`;

            if (!uniqueLinks.has(key)) {
                uniqueLinks.set(key, link);
            }
        });
        const finalLinks = Array.from(uniqueLinks.values());

        // --- DRAWING ---

        // Draw Links (Straight lines look better for merged graphs)
        const linkGroups = this.g.selectAll(".link-group")
            .data(finalLinks, d => `${d.source.data.id}-${d.target.data.id}-${d.target.data.name}`);

        const linkEnter = linkGroups.enter().append("g")
            .attr("class", "link-group")
            .attr("opacity", 0);

        linkEnter.append("path")
            .attr("class", "link")
            .attr("d", d => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`);

        linkEnter.append("text")
            .attr("class", "edge-label")
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => d.target.data.name)
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);

        const linkUpdate = linkEnter.merge(linkGroups);
        linkUpdate.transition().duration(500).attr("opacity", 1);
        
        linkUpdate.select("path")
            .transition().duration(500)
            .attr("d", d => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`)
            .attr("class", d => {
                const isActive = this.currentPathIds.has(d.source.data.id) && this.currentPathIds.has(d.target.data.id);
                return isActive ? "link active" : "link";
            });

        linkUpdate.select("text")
            .transition().duration(500)
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);

        linkGroups.exit().remove();

        // Draw Nodes
        const nodes = this.g.selectAll(".node")
            .data(finalNodes, d => d.data.id);

        const nodeEnter = nodes.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .style("opacity", 0);

        nodeEnter.append("circle").attr("class", "main-circle").attr("r", 18);
        nodeEnter.append("circle").attr("class", "inner-ring").attr("r", 0);
        nodeEnter.append("text").attr("dy", "0.35em").text(d => `Q${d.data.id}`);

        const nodeUpdate = nodeEnter.merge(nodes);
        nodeUpdate.transition().duration(500)
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .style("opacity", 1);

        nodeUpdate.select(".main-circle")
            .attr("r", d => this.currentPathIds.has(d.data.id) ? 22 : 18);

        nodeUpdate.select(".inner-ring")
            .attr("r", d => {
                if (!d.data.isEnd) return 0;
                return this.currentPathIds.has(d.data.id) ? 18 : 14;
            });

        nodeUpdate.attr("class", d => {
            let classes = ["node"];
            if (d.data.isEnd) classes.push("is-end");
            if (this.currentPathIds.has(d.data.id)) classes.push("active");
            return classes.join(" ");
        });

        nodes.exit().transition().duration(300).style("opacity", 0).remove();
    }

    resetZoom() {
        this.svg.transition().duration(750)
            .call(this.zoom.transform, d3.zoomIdentity.translate(this.width / 2, 50).scale(1));
    }
}