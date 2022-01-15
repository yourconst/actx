import { SubSource } from './SubSource';

export type MediaSourceTypes = string | HTMLMediaElement;

export class MediaSource extends SubSource<MediaSource, MediaSourceTypes> {
    element: HTMLMediaElement;
    node: MediaElementAudioSourceNode;

    get volume() { return this.element.volume; }
    set volume(value) { this.element.volume = value; }

    get duration() { return this.element.duration; }

    get currentTime() { return this.element.currentTime; }
    set currentTime(value) { this.element.currentTime = value; }

    get channelCount() {
        return this.node.channelCount;
    }

    get paused() { return this.element.paused; }

    play() {
        this.element.play();
        return this;
    }
    pause() {
        this.element.pause();
        return this;
    }

    changeTargetNode(targetNode: AudioNode) {
        if (this.targetNode) {
            this.node.disconnect();
        }
        this.node.connect(targetNode);
        this.targetNode = targetNode;
        return this;
    }

    setSource(source: MediaSourceTypes) {
        if (source instanceof HTMLMediaElement) {
            this.element = source;
        } else {
            if (this.element) {
                this.element.src = source;
            } else {
                this.element = new Audio(source);
            }
        }

        this.element.volume = 1;

        this.element.onloadstart = () => this.emit(this.events.LOAD_START, this);
        this.element.load = () => this.emit(this.events.LOAD, this);
        this.element.onchange = () => this.emit(this.events.CHANGE, this);
        this.element.onended = () => this.emit(this.events.END, this);
        this.element.ondurationchange = () => this.emit(this.events.DURATION_CHANGE, this);

        return this;
    }

    destructor() {
        this.node?.disconnect();
        delete this.node;
        delete this.element;
        
        super.destructor();
    }

    static isSupportedSource<T>(rawSource: T): T extends MediaSourceTypes ? true : false {
        return <any>
            (rawSource instanceof HTMLMediaElement) ||
            (typeof rawSource === 'string' && !rawSource.startsWith('data:'));
    };
}
