import { Utils } from '../Utils';
import { SubSource } from './SubSource';

export type BufferSourceTypes = ArrayBuffer | ReadableStream<Uint8Array | ArrayBuffer> | string;

export class BufferSource extends SubSource<BufferSource, BufferSourceTypes> {
    loadId = 0;
    startOffset = 0;
    startTime = 0;

    protected _paused = true;
    _node: AudioBufferSourceNode;
    audioBuffer: AudioBuffer;

    get volume() { return 1; }
    set volume(value) {  }

    get duration() { return this.audioBuffer?.duration ?? 0; }

    get currentTime() {
        let playing = this.paused ? 0 : this.ctx.currentTime - this.startTime;

        return (this.startOffset + playing) % this.duration;
    }
    set currentTime(value) {
        this.startOffset = value;

        if (!this.paused) {
            this.play();
        }
    }

    get channelCount() {
        return this.node.channelCount;
    }

    get paused() {
        return this._paused;
    }
    
    clearNode() {
        if(this.node) {
            this.node.onended = null;
            this.node.disconnect();
            delete this.node;
        }
    }

    get node() { return this._node; }
    set node(value) {
        this.clearNode();

        value.connect(this.targetNode);

        value.onended = () =>  {
            if(!value.loop)
                this._paused = true;
            this.startOffset = 0;
            this.emit(this.events.END, this);
        };

        this._node = value;
    }

    play() {
        if (!this._paused) {
            return this;
        }

        this.clearNode();

        this.startTime = this.ctx.currentTime;

        this.node = this.ctx.createBufferSource();
        this.node.buffer = this.audioBuffer;

        //this.node.loop = true;

        this.node.start(0, this.startOffset % this.duration);

        this._paused = false;

        return this;
    }
    pause() {
        if (!this._paused) {
            this.clearNode();
            this.startOffset += this.ctx.currentTime - this.startTime;
            this._paused = true;
        }

        return this;
    }

    protected async changeBuffer(buffer: ArrayBuffer, loadId: number) {
        const audioBuffer = await this.ctx.decodeAudioData(buffer);

        if (this.loadId > loadId) {
            return false;
        }

        const isPlaying = !this.paused;

        this.audioBuffer = audioBuffer;
        this.pause();

        if (isPlaying) {
            this.play();
        }

        this.emit(this.events.DURATION_CHANGE, this);
        this.emit(this.events.CHANGE, this);

        return true;
    }

    protected async setSourceBuffer(sourceBuffer: ArrayBuffer) {
        const partLength = Math.min(100000, sourceBuffer.byteLength);
        const loadId = ++this.loadId;

        if (!this.changeBuffer(sourceBuffer.slice(0, partLength), loadId)) {
            return this;
        }

        if (partLength === sourceBuffer.byteLength) {
            return this;
        }

        await this.changeBuffer(sourceBuffer, loadId);

        return this;
    }

    protected async setSourceStream(sourceStream: ReadableStream<Uint8Array | ArrayBuffer>) {
        let buffer = new ArrayBuffer(0);
        const loadId = ++this.loadId;

        const reader = sourceStream.getReader();
        
        while (true) {
            const { done, value } = await reader.read();

            const partBuffer =
                value instanceof Uint8Array ?
                value.buffer :
                value instanceof ArrayBuffer ?
                value :
                null;

            if (partBuffer?.byteLength) {
                buffer = Utils.concatBuffers(buffer, partBuffer);

                if (!await this.changeBuffer(buffer, loadId)) {
                    await reader.cancel();
                    await sourceStream.cancel();
                    break;
                }
            }
            
            if (done) {
                break;
            }

            await Utils.sleep(100);
        }

        return this;
    }

    async setSource(rawSource: BufferSourceTypes) {
        this.pause();

        if (rawSource instanceof ArrayBuffer) {
            return this.setSourceBuffer(rawSource);
        }

        if (rawSource instanceof ReadableStream) {
            return this.setSourceStream(rawSource);
        }

        if (typeof rawSource === 'string') {
            const response = await fetch(rawSource);
            return this.setSourceStream(response.body);
            
        }

        throw new Error('Bad source');
    }

    changeTargetNode(targetNode: AudioNode) {
        if (this.targetNode) {
            this.node.disconnect();
        }
        this.node.connect(targetNode);
        this.targetNode = targetNode;
        return this;
    }

    destructor() {
        this.clearNode();
        delete this.audioBuffer;
        
        super.destructor();
    }

    static isSupportedSource<T>(rawSource: T): T extends BufferSourceTypes ? true : false {
        return <any>
            (rawSource instanceof ArrayBuffer) ||
            (rawSource instanceof ReadableStream) ||
            (typeof rawSource === 'string' && !rawSource.startsWith('data:'));
    };
}
