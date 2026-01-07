// ========================================
// APPLICATION LOGIC
// ========================================

let trie_unminimized = new Trie();
let dafsa_minimized = new DAFSA();

let visualizer;
let visualizerMini;

// State now tracked via objects with nodes/edges sets
let emptyState = { nodes: new Set(), edges: new Set() };

window.onload = () => {
    visualizer = new DagVisualizer('viz-container', 'node-count-standard');
    visualizerMini = new DagVisualizer('viz-container-mini', 'node-count-mini');

    updateGraph();  // renders root node first hand
    resetView();
    
    document.getElementById('submitWordsBtn').addEventListener('click', submitWordBatch);
    document.getElementById('resetBtnTop').addEventListener('click', resetTrie);
    document.getElementById('resetViewBtn').addEventListener('click', resetView);
    document.getElementById('searchInput').addEventListener('input', handleInput);
};

function setUIState(state) {
    const isSubmitted = state === 'submitted';
    const hideOnSubmit = ['submitHeading', 'bulkWordsInput', 'submitWordsBtn'];
    const showOnSubmit = ['resetBtnTop', 'currentWordsSection', 'divider', 'autocompleteSection'];
    
    hideOnSubmit.forEach(id => document.getElementById(id).classList.toggle('hidden', isSubmitted));
    showOnSubmit.forEach(id => document.getElementById(id).classList.toggle('hidden', !isSubmitted));
}

function submitWordBatch() {
    const input = document.getElementById('bulkWordsInput');
    const raw = input.value;

    let words = raw
        .split(/[^a-zA-Z]+/)
        .map(w => w.trim().toLowerCase())
        .filter(Boolean);

    if (words.length === 0) {
        alert("Please enter at least one word.");
        return;
    }

    words = Array.from(new Set(words)).sort();
    words.forEach(w => {
        trie_unminimized.insert(w);
        dafsa_minimized.insert(w);
    });

    dafsa_minimized.finish();

    updateWordListUI();
    updateGraph();
    
    setUIState('submitted');
    document.getElementById('searchInput').focus();

    resetView();
}

window.selectMatch = function (word) {
    document.getElementById('searchInput').value = word;
    handleInput();
}

function handleInput() {
    const inputVal = document.getElementById('searchInput').value.trim();
    const matchEl = document.getElementById('matchesText');

    if (inputVal.length > 0) {
        // Returns { pathIds, activeEdges, isValid }
        const stdResult = trie_unminimized.getTraversalPath(inputVal);
        const miniResult = dafsa_minimized.getTraversalPath(inputVal);
        
        // Pass nodes and edges to visualizers
        visualizer.updateGraph(trie_unminimized, { nodes: stdResult.pathIds, edges: stdResult.activeEdges });
        visualizerMini.updateGraph(dafsa_minimized, { nodes: miniResult.pathIds, edges: miniResult.activeEdges });

        const completions = trie_unminimized.getCompletions(inputVal);
        if (completions.length > 0) {
            matchEl.innerHTML = completions.map(word =>
                `<span class="cursor-pointer hover:underline hover:text-indigo-800 font-bold transition-colors" onclick="selectMatch('${word}')">${word}</span>`
            ).join(', ');
        } else {
            matchEl.innerText = "No matches found";
        }
    } else {
        matchEl.innerText = "-";
        visualizer.updateGraph(trie_unminimized, emptyState);
        visualizerMini.updateGraph(dafsa_minimized, emptyState);
    }
}

function updateGraph() {
    visualizer.updateGraph(trie_unminimized, emptyState);
    visualizerMini.updateGraph(dafsa_minimized, emptyState);
}

function updateWordListUI() {
    const container = document.getElementById('wordList');
    container.innerHTML = '';
    const sorted = Array.from(trie_unminimized.words).sort();

    sorted.forEach(word => {
        const badge = document.createElement('span');
        badge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200";
        badge.innerText = word;
        container.appendChild(badge);
    });
}

function resetTrie() {
    visualizer.initD3();
    visualizerMini.initD3();

    if(document.getElementById('node-count-standard')) document.getElementById('node-count-standard').innerText = '0';
    if(document.getElementById('node-count-mini')) document.getElementById('node-count-mini').innerText = '0';

    trie_unminimized = new Trie();
    dafsa_minimized = new DAFSA();
    
    document.getElementById('bulkWordsInput').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('matchesText').innerText = '-';
    
    setUIState('initial');
    updateWordListUI();
    updateGraph();
    document.getElementById('bulkWordsInput').focus();
    resetView();
}

function resetView() {
    visualizer.resetZoom();
    visualizerMini.resetZoom();
}