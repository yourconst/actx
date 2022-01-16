export type PossibleAudioNode = CustomAudioNode | AudioNode;

export abstract class CustomAudioNode /* implements AudioNode */ {
    static getRealInOutNodes(node: PossibleAudioNode) {
        if (node instanceof CustomAudioNode) {
            return {
                in: node.getNodeIn(),
                out: node.getNodeOut(),
            };
        } else if (node) {
            return {
                in: node,
                out: node,
            };
        }

        return null;
    }

    static connect(left: PossibleAudioNode, right: PossibleAudioNode) {
        const ioLeft = this.getRealInOutNodes(left);
        const ioRight = this.getRealInOutNodes(right);

        ioLeft.out.connect(ioRight.in);
    }

    static disconnect(left: PossibleAudioNode, right: PossibleAudioNode) {
        const ioLeft = this.getRealInOutNodes(left);
        const ioRight = this.getRealInOutNodes(right);

        ioLeft.out.disconnect(ioRight.in);
    }


    // context: AudioContext;
    ctx: AudioContext;

    abstract getNodeIn(): AudioNode;
    abstract getNodeOut(): AudioNode;

    /* connect(destinationNode: AudioNode, output?: number, input?: number): AudioNode;
    connect(destinationParam: AudioParam, output?: number): void;
    connect(...args: [any, any]): void | AudioNode {
        return this.getNodeOut().connect(...args);
    }

    disconnect(): void;
    disconnect(output: number): void;
    disconnect(destinationNode: AudioNode): void;
    disconnect(destinationNode: AudioNode, output: number): void;
    disconnect(destinationNode: AudioNode, output: number, input: number): void;
    disconnect(destinationParam: AudioParam): void;
    disconnect(destinationParam: AudioParam, output: number): void;
    disconnect(...args: []): void {
        this.getNodeOut().disconnect(...args);
    }

    protected __connectFrom(source: AudioNode) {
        source.connect(this.getNodeIn());
    }

    protected __disconnectFrom(source: AudioNode) {
        source.disconnect(this.getNodeIn());
    }
    
    protected get inlet() {
        return this.getNodeIn();
    }
    
    protected get outlet() {
        return this.getNodeOut();
    } */
    
    abstract constructorAfter(): void;

    constructor(ctx: AudioContext) {
        this.ctx = ctx;

        this.constructorAfter();
    }
};
