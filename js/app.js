// ========================================
// APPLICATION LOGIC
// ========================================

let trie = new Trie();
let minimizedTrie = new DAFSA();

let visualizer;
let visualizerMini;
let currentPathIds = new Set();

window.onload = () => {
    // PASS THE ID FOR THE COUNT DISPLAY HERE
    visualizer = new TrieVisualizer('viz-container', 'node-count-standard');
    visualizerMini = new TrieVisualizer('viz-container-mini', 'node-count-mini');

    updateWordListUI();
    updateGraph();
    visualizer.resetZoom();

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

    if (minimizedTrie.previousWord && words[0] < minimizedTrie.previousWord) {
         if(!confirm("Algorithm 1 requires sorted input. New words are alphabetically before existing ones, which may break the minimization. Reset and add all at once?")) return;
         resetTrie();
    }

    words.forEach(w => {
        trie.insert(w);
        minimizedTrie.insert(w);
    });

    minimizedTrie.finish();

    updateWordListUI();
    updateGraph();
    
    setUIState('submitted');
    document.getElementById('searchInput').focus();
}

window.selectMatch = function (word) {
    document.getElementById('searchInput').value = word;
    handleInput();
}

function handleInput() {
    const inputVal = document.getElementById('searchInput').value.trim();
    const matchEl = document.getElementById('matchesText');

    if (inputVal.length > 0) {
        const stdResult = trie.getTraversalPath(inputVal);
        const miniResult = minimizedTrie.getTraversalPath(inputVal);
        
        visualizer.updateGraph(trie, stdResult.pathIds);
        visualizerMini.updateGraph(minimizedTrie, miniResult.pathIds);

        const completions = trie.getCompletions(inputVal);
        if (completions.length > 0) {
            matchEl.innerHTML = completions.map(word =>
                `<span class="cursor-pointer hover:underline hover:text-indigo-800 font-bold transition-colors" onclick="selectMatch('${word}')">${word}</span>`
            ).join(', ');
        } else {
            matchEl.innerText = "No matches found";
        }
    } else {
        matchEl.innerText = "-";
        visualizer.updateGraph(trie, new Set());
        visualizerMini.updateGraph(minimizedTrie, new Set());
    }
}

function updateGraph() {
    visualizer.updateGraph(trie, new Set());
    visualizerMini.updateGraph(minimizedTrie, new Set());
}

function updateWordListUI() {
    const container = document.getElementById('wordList');
    container.innerHTML = '';

    const sorted = Array.from(trie.words).sort();

    if (sorted.length === 0) {
        container.innerHTML = '<span class="text-gray-400 text-xs">No words submitted.</span>';
        return;
    }

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

    // Reset Count displays explicitly (optional, since initD3 doesn't clear them, but updateGraph will)
    if(document.getElementById('node-count-standard')) document.getElementById('node-count-standard').innerText = '0';
    if(document.getElementById('node-count-mini')) document.getElementById('node-count-mini').innerText = '0';

    trie = new Trie();
    minimizedTrie = new DAFSA();
    currentPathIds.clear();
    
    document.getElementById('bulkWordsInput').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('matchesText').innerText = '-';
    
    setUIState('initial');
    updateWordListUI();

    updateGraph();
    document.getElementById('bulkWordsInput').focus();
}

function resetView() {
    visualizer.resetZoom();
    visualizerMini.resetZoom();
}