// ========================================
// APPLICATION LOGIC
// ========================================

let trie = new Trie();
// Initialize DAFSA directly
let minimizedTrie = new DAFSA();

let visualizer;
let visualizerMini;
let currentPathIds = new Set();

window.onload = () => {
    visualizer = new TrieVisualizer('viz-container');
    visualizerMini = new TrieVisualizer('viz-container-mini');

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

    // ALGORITHM 1 REQUIREMENT: Input must be sorted [cite: 13, 200]
    // The standard trie doesn't care, but DAFSA does.
    words = Array.from(new Set(words)).sort();

    // Check if new words violate order regarding previously added words
    if (minimizedTrie.previousWord && words[0] < minimizedTrie.previousWord) {
         if(!confirm("Algorithm 1 requires sorted input. New words are alphabetically before existing ones, which may break the minimization. Reset and add all at once?")) return;
         resetTrie(); // Auto-reset if the user agrees
         // Re-process the words after reset
    }

    words.forEach(w => {
        trie.insert(w);
        minimizedTrie.insert(w);
    });

    // FINALIZATION: Must minimize the path of the last word added [cite: 226]
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
        // Trace path in Standard Trie
        const stdResult = trie.getTraversalPath(inputVal);
        
        // Trace path in Minimized Trie (should be logically identical)
        const miniResult = minimizedTrie.getTraversalPath(inputVal);
        
        // We use the union of IDs to highlight both graphs (though IDs are different counters)
        // Actually, we need to pass the specific path IDs to the specific visualizer
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
    // Initial draw without highlights
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
    trie = new Trie();
    minimizedTrie = new DAFSA();
    currentPathIds.clear();
    
    document.getElementById('bulkWordsInput').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('matchesText').innerText = '-';
    
    setUIState('initial');
    updateWordListUI();
    updateGraph();
    visualizer.resetZoom();
    visualizerMini.resetZoom();
    document.getElementById('bulkWordsInput').focus();
}

function resetView() {
    visualizer.resetZoom();
    visualizerMini.resetZoom();
}