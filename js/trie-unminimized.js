// ========================================
// TRIE DATA STRUCTURE
// ========================================

class TrieNode {
    constructor(id) {
        this.id = id;
        this.children = {};
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.nodeIdCounter = 0;
        this.root = new TrieNode(this.nodeIdCounter++);
        this.words = new Set();
    }

    insert(word) {
        if (this.words.has(word)) return;

        this.words.add(word);
        let node = this.root;

        for (let char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode(this.nodeIdCounter++);
            }
            node = node.children[char];
        }
        node.isEndOfWord = true;
    }

    getTraversalPath(prefix) {
        prefix = prefix.toLowerCase();
        let node = this.root;
        
        let pathNodes = new Set([node.id]);
        let pathEdges = new Set();
        
        let valid = true;

        for (let char of prefix) {
            if (node.children[char]) {
                const child = node.children[char];
                // ex. "0-1-a"
                pathEdges.add(`${node.id}-${child.id}-${char}`);
                
                node = child;
                pathNodes.add(node.id);
            } else {
                valid = false;
                break;
            }
        }
        // highlight the subtree (node only) of matches
        if (valid) {
            this._collectSubtreeIds(node, pathNodes);
        }

        return { pathIds: pathNodes, activeEdges: pathEdges, isValid: valid };
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
}