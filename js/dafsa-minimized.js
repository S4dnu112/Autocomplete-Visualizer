// ========================================
// MINIMIZED TRIE (DAFSA) - Algorithm 1
// ========================================

class DAFSANode {
    constructor(id) {
        this.id = id;
        this.children = {}; // Map<char, DAFSANode>
        this.isEndOfWord = false;
    }

    getSignature() {
        const edges = Object.keys(this.children)
            .sort()
            .map(char => `${char}:${this.children[char].id}`)
            .join('|');
        return `${this.isEndOfWord ? '1' : '0'}_${edges}`;
    }
}

class DAFSA {
    constructor() {
        this.nodeIdCounter = 0;
        this.root = new DAFSANode(this.nodeIdCounter++);
        this.register = new Map();
        this.previousWord = "";
    }

    insert(word) {
        const commonPrefixLen = this.getCommonPrefixLength(word, this.previousWord);
        this.minimize(commonPrefixLen);

        let node = this.getLastNodeOnPath(commonPrefixLen);
        for (let i = commonPrefixLen; i < word.length; i++) {
            const char = word[i];
            const newNode = new DAFSANode(this.nodeIdCounter++);
            node.children[char] = newNode;
            node = newNode;
        }
        node.isEndOfWord = true;
        this.previousWord = word;
    }

    finish() {
        this.minimize(0);
    }

    minimize(downTo) {
        let length = this.previousWord.length;
        while (length > downTo) {
            const parent = this.getLastNodeOnPath(length - 1);
            const char = this.previousWord[length - 1];
            const child = parent.children[char];

            if (!child) break;

            const signature = child.getSignature();

            if (this.register.has(signature)) {
                parent.children[char] = this.register.get(signature);
            } else {
                this.register.set(signature, child);
            }
            length--;
        }
    }

    getCommonPrefixLength(word1, word2) {
        let i = 0;
        while (i < word1.length && i < word2.length && word1[i] === word2[i]) {
            i++;
        }
        return i;
    }

    getLastNodeOnPath(length) {
        let node = this.root;
        for (let i = 0; i < length; i++) {
            node = node.children[this.previousWord[i]];
        }
        return node;
    }

    toHierarchy() {
        const traverse = (node, edgeLabel) => {
            let children = Object.keys(node.children)
                .sort()
                .map(key => traverse(node.children[key], key));

            return {
                name: edgeLabel || 'ROOT',
                id: node.id,
                isEnd: node.isEndOfWord,
                isRoot: edgeLabel === undefined,
                children: children.length > 0 ? children : null
            };
        };
        return traverse(this.root);
    }

    getTraversalPath(prefix) {
        prefix = prefix.toLowerCase();
        let node = this.root;
        
        let pathNodes = new Set([node.id]);
        let pathEdges = new Set(); 
        
        let valid = true;

        // 1. Trace ONLY the typed prefix
        for (let char of prefix) {
            if (node.children[char]) {
                const child = node.children[char];
                
                // Add this edge to pathEdges because the user actually typed it
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

    _collectSubtreeIds(node, nodeSet) {
        if (!node) return;

        Object.keys(node.children).forEach(char => {
            const child = node.children[char];

            // If we haven't visited this child node yet, add it and recurse
            if (!nodeSet.has(child.id)) {
                nodeSet.add(child.id);
                this._collectSubtreeIds(child, nodeSet);
            }
        });
    }
}