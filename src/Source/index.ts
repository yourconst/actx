import { SubSource } from "./SubSource";
import { MediaSource, MediaSourceTypes } from "./MediaSource";
import { BufferSource, BufferSourceTypes } from "./BufferSource";

export { SubSource } from "./SubSource";

export type SourceTypes = MediaSourceTypes | BufferSourceTypes;

const possibleSources = [BufferSource, MediaSource];

export class Source extends SubSource<Source, SourceTypes> {
    ctx: AudioContext;
    targetNode: AudioDestinationNode;
    protected _source: SubSource<typeof possibleSources[number], SourceTypes> = null;

    get volume() { return this.source?.volume ?? null; }
    set volume(value) { if(this.source) this.source.volume = value; }

    get paused() { return this.source?.paused ?? true; }

    get duration() { return this.source?.duration ?? null; }

    get currentTime() { return this.source?.currentTime ?? null; }
    set currentTime(value) { if(this.source) this.source.currentTime = value; }

    get channelCount() {
        return this.source.channelCount ?? null;
    }

    play() {
        this.source?.play();
        return this;
    }
    pause() {
        this.source?.pause();
        return this;
    }

    get source() { return this._source; }
    protected set source(value) {
        this.source?.destructor();

        this._source = value;
    }

    changeTargetNode(targetNode: AudioDestinationNode) {
        this.source?.changeTargetNode(targetNode);
        this.targetNode = targetNode;
        return this;
    }

    async setSource(rawSource: SourceTypes) {
        for (const SomeSource of possibleSources) {
            if (SomeSource.isSupportedSource(rawSource)) {
                if (this.source instanceof SomeSource) {
                    await this.source.setSource(<any> rawSource);
                } else {
                    this.source = await new SomeSource(this.targetNode).setSource(<any> rawSource);
                }

                return this;
            }
        }

        throw new Error('Unsupported source');
    }

    destructor() {
        this.source?.destructor();
        delete this.source;
        
        super.destructor();
    }
};
