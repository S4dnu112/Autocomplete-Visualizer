// ========================================
// TRIE DATA STRUCTURE
// ========================================

class TrieNode {
    constructor(id, char = '') {
        this.id = id;
        this.char = char;
        this.children = {};
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.nodeIdCounter = 0;
        this.root = new TrieNode(this.nodeIdCounter++, 'ROOT');
        this.words = new Set();
    }

    insert(word) {
        if (!word) return;
        word = word.toLowerCase();
        if (this.words.has(word)) return;

        this.words.add(word);
        let node = this.root;

        for (let char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode(this.nodeIdCounter++, char);
            }
            node = node.children[char];
        }
        node.isEndOfWord = true;
    }

    getTraversalPath(prefix) {
        prefix = prefix.toLowerCase();
        let node = this.root;
        let path = new Set([node.id]);
        let valid = true;

        for (let char of prefix) {
            if (node.children[char]) {
                node = node.children[char];
                path.add(node.id);
            } else {
                valid = false;
                break;
            }
        }

        if (valid) {
            this._collectSubtreeIds(node, path);
        }

        return { pathIds: path, isValid: valid };
    }

    _collectSubtreeIds(node, set) {
        if (!node) return;
        set.add(node.id);
        Object.values(node.children).forEach(child => {
            this._collectSubtreeIds(child, set);
        });
    }

    getCompletions(prefix) {
        prefix = prefix.toLowerCase();
        let node = this.root;
        for (let char of prefix) {
            if (!node.children[char]) return [];
            node = node.children[char];
        }
        return this._collectWords(node, prefix);
    }

    _collectWords(node, currentWord) {
        let results = [];
        if (node.isEndOfWord) results.push(currentWord);

        let keys = Object.keys(node.children).sort();
        for (let char of keys) {
            results = results.concat(this._collectWords(node.children[char], currentWord + char));
        }
        return results;
    }

    toHierarchy() {
        const traverse = (node) => {
            let children = Object.values(node.children)
                .sort((a, b) => a.char.localeCompare(b.char))
                .map(child => traverse(child));

            return {
                name: node.char,
                id: node.id,
                isEnd: node.isEndOfWord,
                isRoot: node.char === 'ROOT',
                children: children.length > 0 ? children : null
            };
        };
        return traverse(this.root);
    }
}

// ========================================
// TRIE VISUALIZER (D3.js)
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

        this.treeLayout = d3.tree()
            .nodeSize([40, 60]);
    }

    updateGraph(trie, pathIds) {
        this.currentPathIds = pathIds || new Set();
        const rootData = trie.toHierarchy();
        const root = d3.hierarchy(rootData);

        this.treeLayout(root);

        // Links (Edges)
        const linksData = root.links();

        const linkGroups = this.g.selectAll(".link-group")
            .data(linksData, d => d.target.data.id);

        const linkEnter = linkGroups.enter().append("g")
            .attr("class", "link-group")
            .attr("opacity", 0);

        linkEnter.append("path")
            .attr("class", "link")
            .attr("d", d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y));

        linkEnter.append("text")
            .attr("class", "edge-label")
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => d.target.data.name)
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);

        const linkUpdate = linkEnter.merge(linkGroups);

        linkUpdate.transition().duration(500)
            .attr("opacity", 1);

        linkUpdate.select("path")
            .transition().duration(500)
            .attr("d", d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y))
            .attr("class", d => {
                const isActive = this.currentPathIds.has(d.source.data.id) && this.currentPathIds.has(d.target.data.id);
                return isActive ? "link active" : "link";
            });

        linkUpdate.select("text")
            .transition().duration(500)
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);

        linkGroups.exit().remove();

        // Nodes
        const nodes = this.g.selectAll(".node")
            .data(root.descendants(), d => d.data.id);

        const nodeEnter = nodes.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .style("opacity", 0);

        nodeEnter.append("circle")
            .attr("class", "main-circle")
            .attr("r", 18);

        nodeEnter.append("circle")
            .attr("class", "inner-ring")
            .attr("r", 0);

        nodeEnter.append("text")
            .attr("dy", "0.35em")
            .text(d => `Q${d.data.id}`);

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
        this.svg.transition().duration(750).call(this.zoom.transform, d3.zoomIdentity.translate(this.width / 2, 50).scale(1));
    }
}

// ========================================
// APPLICATION LOGIC
// ========================================

let trie = new Trie();
let visualizer;
let visualizerMini;
let currentPathIds = new Set();

const initialWords = ['ant', 'art', 'bat', 'bar', 'code', 'cob'];

window.onload = () => {
    visualizer = new TrieVisualizer('viz-container');
    visualizerMini = new TrieVisualizer('viz-container-mini');

    initialWords.forEach(w => trie.insert(w));

    updateWordListUI();
    updateGraph();
    visualizer.resetZoom();

    document.getElementById('newWordInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') addWord();
    });

    document.getElementById('addWordBtn').addEventListener('click', addWord);
    document.getElementById('resetBtn').addEventListener('click', resetTrie);
    document.getElementById('searchInput').addEventListener('input', handleInput);
};

function addWord() {
    const input = document.getElementById('newWordInput');
    const word = input.value.trim();

    if (word && /^[a-zA-Z]+$/.test(word)) {
        trie.insert(word);
        input.value = '';
        updateWordListUI();
        updateGraph();
    } else if (word) {
        alert("Letters only, please.");
    }
}

function resetTrie() {
    trie = new Trie();
    currentPathIds.clear();
    document.getElementById('searchInput').value = '';
    document.getElementById('matchesText').innerText = '-';
    updateWordListUI();
    updateGraph();
    visualizer.resetZoom();
    visualizerMini.resetZoom();
}

window.selectMatch = function (word) {
    document.getElementById('searchInput').value = word;
    handleInput();
}

function handleInput() {
    const inputVal = document.getElementById('searchInput').value.trim();
    const matchEl = document.getElementById('matchesText');

    if (inputVal.length > 0) {
        const { pathIds, isValid } = trie.getTraversalPath(inputVal);
        currentPathIds = pathIds;

        const completions = trie.getCompletions(inputVal);
        if (completions.length > 0) {
            matchEl.innerHTML = completions.map(word =>
                `<span class="cursor-pointer hover:underline hover:text-indigo-800 font-bold transition-colors" onclick="selectMatch('${word}')">${word}</span>`
            ).join(', ');
        } else {
            matchEl.innerText = "No matches found";
        }
    } else {
        currentPathIds.clear();
        matchEl.innerText = "-";
    }

    updateGraph();
}

function updateGraph() {
    visualizer.updateGraph(trie, currentPathIds);
    // TODO: Build and display minimized trie
    visualizerMini.updateGraph(trie, currentPathIds);
}

function updateWordListUI() {
    const container = document.getElementById('wordList');
    container.innerHTML = '';

    Array.from(trie.words).sort().forEach(word => {
        const badge = document.createElement('span');
        badge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200";
        badge.innerText = word;
        container.appendChild(badge);
    });
}
