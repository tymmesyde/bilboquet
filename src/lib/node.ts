import Protocol from 'devtools-protocol';
import { splitIntoChunks } from '../shared/utils';

class Node {
    private content: Protocol.DOM.Node;
    
    constructor(content: Protocol.DOM.Node) {
        this.content = content;
    }

    get attributes() {
        if (Array.isArray(this.content.attributes)) {
            const splittedAttributes = splitIntoChunks(this.content.attributes, 2);            
            if (splittedAttributes)
                return Object.fromEntries(splittedAttributes.map(([key, value]) => [key, value]))

            return null;
        }

        return null;
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