import Node from './node';
import Protocol from 'devtools-protocol';

class Document {
    private content: Protocol.DOM.Node;

    constructor(content: Protocol.DOM.Node) {
        this.content = content;
    }

    _find(node: Protocol.DOM.Node, id: Protocol.DOM.NodeId): Protocol.DOM.Node | null {
        if (node.nodeId === id)
            return node;

        if (node.children)
            for (const children of node.children) {
                const result = this._find(children, id);
                if (result !== null)
                    return result;
            }

        return null;
    }

    get nodeId() {
        return this.content.nodeId;
    }

    update({ parentId, nodes }: Protocol.DOM.SetChildNodesEvent) {
        const node = this._find(this.content, parentId);
        if (node)
            node.children = nodes;
    }

    get(nodeId: Protocol.DOM.NodeId) {
        const node = this._find(this.content, nodeId);
        if (node)
            return new Node(node);
        return null
    }
}

export default Document;