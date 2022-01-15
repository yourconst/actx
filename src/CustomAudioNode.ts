export abstract class CustomAudioNode extends AudioNode {
    abstract getNodeIn: () => AudioNode;
    abstract getNodeOut: () => AudioNode;

    connect(destinationNode: AudioNode, output?: number, input?: number): AudioNode;
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
};
