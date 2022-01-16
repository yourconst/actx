import EventEmitter from 'eventemitter3';

enum SubSourceEvents {
    LOAD_START = 'loadstart',
    LOAD = 'load',
    CHANGE = 'change',
    END = 'end',
    DURATION_CHANGE = 'durationchange',
    PLAY = 'play',
    PAUSE = 'pause',
    DESCTRUCT = 'destruct',
};

export abstract class SubSource<ClassType extends SubSource<any, any>, SourceTypes> extends EventEmitter<{
    [SubSourceEvents.LOAD_START]: (src: ClassType) => void,
    [SubSourceEvents.LOAD]: (src: ClassType) => void,
    [SubSourceEvents.CHANGE]: (src: ClassType) => void,
    [SubSourceEvents.END]: (src: ClassType) => void,
    [SubSourceEvents.DURATION_CHANGE]: (src: ClassType) => void,
    [SubSourceEvents.PLAY]: (src: ClassType) => void,
    [SubSourceEvents.PAUSE]: (src: ClassType) => void,
    [SubSourceEvents.DESCTRUCT]: (src: ClassType) => void,
}> {
    readonly events = SubSourceEvents;

    ctx: AudioContext;
    targetNode: AudioNode;
    // node: MediaElementAudioSourceNode | AudioBufferSourceNode;

    abstract get volume(): number;
    abstract set volume(value: number);

    abstract get duration(): number;

    abstract get currentTime(): number;
    abstract set currentTime(value: number);

    abstract get channelCount(): number;

    abstract get paused(): boolean;

    abstract play(): this;
    abstract pause(): this;

    abstract changeTargetNode(targetNode: AudioNode): this;

    abstract setSource(rawSource: SourceTypes): this | Promise<this>;

    // static isSupportedSource<SourceTypes, T>(rawSource: T): T extends SourceTypes ? true : false {
    //     throw new Error('Abstract method `isSupportedSource` must be redefined');
    // };

    get destructed() {
        return !this.targetNode;
    }

    destructor() {
        console.log('Destruct: ', this.destructed, this);
        if (this.destructed) {
            return;
        }

        delete this.targetNode;
        delete this.ctx;

        this.emit(this.events.DESCTRUCT, <any> this);

        this.removeAllListeners();
    }
    
    constructor(targetNode: AudioNode) {
        super();

        this.ctx = <AudioContext> targetNode.context;
        this.targetNode = targetNode;
    }
}
