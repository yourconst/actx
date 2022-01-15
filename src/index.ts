import { LinkedList } from './LinkedList';
import { Source, SourceTypes } from './Source';

export { CustomAudioNode } from './CustomAudioNode';

export class ACTX {
    readonly ctx = new AudioContext();
    readonly gainInput = this.ctx.createGain();
    // gainOutput = this.ctx.createGain();
    readonly nodesList = new LinkedList<AudioNode>();
    // analyzers = new Set<AnalyserNode>();
    readonly sources = new Set<Source>();

    get volumeInput() { return this.gainInput.gain.value; }
    set volumeInput(value) { this.gainInput.gain.value = value; }

    // get volumeOutput() { return this.gainOutput.gain.value; }
    // set volumeOutput(value) { this.gainOutput.gain.value = value; }

    get paused() {
        return this.getSources().reduce((acc, source) => acc || source.paused, true);
    }

    play() {
        for (const source of this.sources) {
            source.play();
        }
        return this;
    }
    pause() {
        for (const source of this.sources) {
            source.pause();
        }
        return this;
    }

    getSources() {
        return Array.from(this.sources);
    }

    async addSource(rawSource: SourceTypes) {
        const source = await new Source(this.gainInput).setSource(rawSource);
        
        this.sources.add(source);

        return source;
    }

    deleteSource(source: Source) {
        this.sources.delete(source);
    }

    constructor() {
        this.gainInput.connect(this.ctx.destination);
        // this.gainOutput.connect(this.ctx.destination);

        this.nodesList.onChange = (node) => {
            if (node.type === 'insert') {
                if (node.prev) {
                    node.prev.disconnect(node.next || this.ctx.destination);
                    node.prev.connect(node.value);
                } else {
                    if (node.next) {
                        this.gainInput.disconnect(node.next);
                    }
                    this.gainInput.connect(node.value);
                }

                if (node.next) {
                    if (node.prev) {
                        node.prev.disconnect(node.next);
                        node.prev.connect(node.value);
                    } else {
                        this.gainInput.disconnect(node.next);
                        this.gainInput.connect(node.value);
                    }
                } else {
                    if (node.prev) {
                        node.prev.disconnect(this.ctx.destination);
                    }
                    node.value.connect(this.ctx.destination);
                }
            } else {
                if (node.prev) {
                    node.prev.disconnect(node.value);
                    node.prev.connect(node.next || this.ctx.destination);
                }

                if (node.next) {
                    if (node.prev) {
                        node.prev.disconnect(node.value);
                        node.prev.connect(node.next);
                    } else {
                        this.gainInput.disconnect(node.value);
                        this.gainInput.connect(node.next);
                    }
                }
            }
        };
    }
};
