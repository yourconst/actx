import { LinkedList } from './LinkedList';
import { Source, SourceTypes } from './Source';

import { CustomAudioNode, PossibleAudioNode } from './CustomAudioNode';
import { CustomAnalyserNode } from './customNodes';

export class ACTX {
    readonly ctx = new AudioContext();
    readonly gainInput = this.ctx.createGain();
    // gainOutput = this.ctx.createGain();
    readonly nodesList = new LinkedList<PossibleAudioNode>();
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


    createCustomAnalyserNode() {
        return new CustomAnalyserNode(this.ctx);
    }


    getSources() {
        return Array.from(this.sources);
    }

    addEmptySource() {
        const source = new Source(this.gainInput);

        source.addListener(source.events.DESCTRUCT, (source) => {
            this.sources.delete(source);
        });
        
        this.sources.add(source);

        return source;
    }

    async addSource(rawSource: SourceTypes) {
        const source = this.addEmptySource();
        
        await source.setSource(rawSource);

        return source;
    }

    deleteSource(source: Source) {
        source.destructor();
    }

    constructor() {
        this.gainInput.connect(this.ctx.destination);
        // this.gainOutput.connect(this.ctx.destination);

        this.nodesList.onChange = (changes) => {
            if (changes.type === 'insert') {
                if (changes.prev) {
                    CustomAudioNode.disconnect(changes.prev, changes.next || this.ctx.destination);
                    CustomAudioNode.connect(changes.prev, changes.value);
                } else {
                    CustomAudioNode.disconnect(this.gainInput, changes.next || this.ctx.destination);
                    CustomAudioNode.connect(this.gainInput, changes.value);
                }

                if (changes.next) {
                    if (changes.prev) {
                        CustomAudioNode.disconnect(changes.prev, changes.next);
                        CustomAudioNode.connect(changes.prev, changes.value);
                    } else {
                        CustomAudioNode.disconnect(this.gainInput, changes.next);
                        CustomAudioNode.connect(this.gainInput, changes.value);
                    }
                } else {
                    if (changes.prev) {
                        CustomAudioNode.disconnect(changes.prev, this.ctx.destination);
                    }
                    CustomAudioNode.connect(changes.value, this.ctx.destination);
                }
            } else {
                if (changes.prev) {
                    CustomAudioNode.disconnect(changes.prev, changes.value);
                    CustomAudioNode.connect(changes.prev, changes.next || this.ctx.destination);
                } else {
                    CustomAudioNode.disconnect(this.gainInput, changes.value);
                    CustomAudioNode.connect(this.gainInput, changes.next || this.ctx.destination);
                }

                if (changes.next) {
                    if (changes.prev) {
                        CustomAudioNode.disconnect(changes.prev, changes.value);
                        CustomAudioNode.connect(changes.prev, changes.next);
                    } else {
                        CustomAudioNode.disconnect(this.gainInput, changes.value);
                        // this.gainInput.connect(changes.next.in);
                    }
                }
            }
        };
    }
};


/*
if (changes.type === 'insert') {
    if (changes.prev) {
        changes.prev.out.disconnect(changes.next?.in || this.ctx.destination);
        changes.prev.out.connect(changes.value.in);
    } else {
        this.gainInput.disconnect(changes.next?.in || this.ctx.destination);
        this.gainInput.connect(changes.value.in);
    }

    if (changes.next) {
        if (changes.prev) {
            changes.prev.out.disconnect(changes.next.in);
            changes.prev.out.connect(changes.value.in);
        } else {
            this.gainInput.disconnect(changes.next.in);
            this.gainInput.connect(changes.value.in);
        }
    } else {
        if (changes.prev) {
            changes.prev.out.disconnect(this.ctx.destination);
        }
        changes.value.out.connect(this.ctx.destination);
    }
} else {
    if (changes.prev) {
        changes.prev.out.disconnect(changes.value.in);
        changes.prev.out.connect(changes.next?.in || this.ctx.destination);
    } else {
        this.gainInput.disconnect(changes.value.in);
        this.gainInput.connect(changes.next?.out || this.ctx.destination);
    }

    if (changes.next) {
        if (changes.prev) {
            changes.prev.out.disconnect(changes.value.in);
            changes.prev.out.connect(changes.next.in);
        } else {
            this.gainInput.disconnect(changes.value.in);
            // this.gainInput.connect(changes.next.in);
        }
    }
}
*/
