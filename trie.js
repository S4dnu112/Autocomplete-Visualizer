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
        if (!word) return;
        word = word.toLowerCase();
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
        // FIX: Pass the edge label (key) down to the child
        const traverse = (node, edgeLabel) => {
            let children = Object.keys(node.children)
                .sort()
                .map(key => traverse(node.children[key], key));

            return {
                name: edgeLabel || 'ROOT', // Use the passed label, not a stored char
                id: node.id,
                isEnd: node.isEndOfWord,
                isRoot: edgeLabel === undefined,
                children: children.length > 0 ? children : null
            };
        };
        return traverse(this.root);
    }
}