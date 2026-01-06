// ========================================
// MINIMIZED TRIE (DAFSA) - Algorithm 1
// ========================================

class DAFSANode {
    constructor(id) {
        this.id = id;
        this.children = {}; // Map<char, DAFSANode>
        this.isEndOfWord = false;
    }

    /**
     * Generates a unique signature for the node.
     * Equivalent states must have the same isEndOfWord status and
     * identical outgoing edges leading to the same target node IDs.
     */
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
        
        // The Register: Maps Node Signatures -> Existing Node Instances
        this.register = new Map();
        
        this.previousWord = "";
    }

    /**
     * ALGORITHM 1: Construction from Sorted Data
     * Requires words to be inserted in alphabetical order.
     */
    insert(word) {
        if (!word) return;
        word = word.toLowerCase();

        // 1. Find the Common Prefix with the previously added word
        const commonPrefixLen = this.getCommonPrefixLength(word, this.previousWord);

        // 2. Minimize the finished suffix of the previous word
        this.minimize(commonPrefixLen);

        // 3. Add the suffix of the new word
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

    /**
     * Finalizes the automaton by minimizing the path of the very last word added.
     */
    finish() {
        this.minimize(0);
    }

    minimize(downTo) {
        // We traverse the path of the previous word backwards (Postorder)
        let length = this.previousWord.length;

        while (length > downTo) {
            const parent = this.getLastNodeOnPath(length - 1);
            const char = this.previousWord[length - 1];
            const child = parent.children[char];

            if (!child) break;

            const signature = child.getSignature();

            if (this.register.has(signature)) {
                // EQUIVALENCE FOUND: Replace the child with the existing node
                parent.children[char] = this.register.get(signature);
            } else {
                // UNIQUE STATE: Add to register
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

    // --- Traversal Methods for Visualization ---

    toHierarchy() {
        // FIX: Pass the edge label (key) down to the child
        // This ensures the visual edge is labeled 't' even if the node was originally created for 'e'
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
        return { pathIds: path, isValid: valid };
    }
}