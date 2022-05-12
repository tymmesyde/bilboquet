import Protocol from 'devtools-protocol';

class Node {
    private content: Protocol.DOM.Node;
    
    constructor(content: Protocol.DOM.Node) {
        this.content = content;
    }

    text({ removeWhitespaces }: { removeWhitespaces?: boolean } = {}) {
        if (this.content && this.content.children) {
            const textNode = this.content.children.find(({ nodeName }) => nodeName === '#text' || nodeName === '');
            if (textNode)
                return removeWhitespaces ?
                    textNode.nodeValue.replace(/\s/g, '') : textNode.nodeValue;
        }

        return null;
    }
}

export default Node;