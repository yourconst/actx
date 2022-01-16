import { Utils } from '../Utils';
import { SubSource } from './SubSource';

export type BufferSourceTypes = ArrayBuffer | ReadableStream<Uint8Array | ArrayBuffer> | string;

export class BufferSource extends SubSource<BufferSource, BufferSourceTypes> {
    readonly minBufferLength = 2e5;

    loadId = 0;
    startOffset = 0;
    startTime = 0;

    protected loaded = false;

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
            this._startFrom();
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
            if (!this.loaded) {
                this.pause();
                return;
            }

            if(!this.node.loop) {
                this._paused = true;
            }

            this.startOffset = 0;
            this.emit(this.events.PAUSE, this);
            this.emit(this.events.END, this);
        };

        this._node = value;
    }

    protected _startFrom(offset = this.startOffset) {
        this.startOffset = offset;

        if (this.audioBuffer) {
            this.clearNode();

            this.startTime = this.ctx.currentTime;

            this.node = this.ctx.createBufferSource();
            this.node.buffer = this.audioBuffer;

            //this.node.loop = true;

            this.node.start(0, this.startOffset % this.duration);
            this.emit(this.events.PLAY, this);
        }

        this._paused = false;
    }

    play() {
        if (!this._paused) {
            return this;
        }

        this._startFrom();

        return this;
    }
    pause() {
        if (!this._paused) {
            this.clearNode();
            this.startOffset += this.ctx.currentTime - this.startTime;
            this._paused = true;

            this.emit(this.events.PAUSE, this);
        }

        return this;
    }

    protected async changeBuffer(buffer: ArrayBuffer, loadId: number, needRestart = false) {
        const audioBuffer = await this.ctx.decodeAudioData(buffer);

        if (this.loadId > loadId) {
            return false;
        }

        if (needRestart) {
            this.currentTime = 0;
        }

        const isPlaying = !this.paused;

        this.audioBuffer = audioBuffer;
        this.pause();

        if (isPlaying) {
            this._startFrom();
        }

        this.emit(this.events.DURATION_CHANGE, this);
        // this.emit(this.events.CHANGE, this);

        return true;
    }

    protected async setSourceBuffer(sourceBuffer: ArrayBuffer) {
        this.loaded = false;
        this.emit(this.events.LOAD_START, this);
        this.emit(this.events.CHANGE, this);

        const partLength = Math.min(this.minBufferLength, sourceBuffer.byteLength);
        const loadId = ++this.loadId;

        if (!await this.changeBuffer(sourceBuffer.slice(0, partLength), loadId, true)) {
            return this;
        }

        if (partLength === sourceBuffer.byteLength) {
            return this;
        }

        await this.changeBuffer(sourceBuffer, loadId);

        this.loaded = true;
        this.emit(this.events.LOAD, this);

        return this;
    }

    protected async setSourceStream(sourceStream: ReadableStream<Uint8Array | ArrayBuffer>) {
        this.loaded = false;
        this.emit(this.events.LOAD_START, this);
        this.emit(this.events.CHANGE, this);

        let buffer = new ArrayBuffer(0);
        const loadId = ++this.loadId;

        const reader = sourceStream.getReader();
        let isFirstPart = true;
        
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

                if ((buffer.byteLength >= this.minBufferLength) || done) {
                    try {
                        if (this.destructed || !await this.changeBuffer(buffer.slice(0), loadId, isFirstPart)) {
                            await reader.cancel();
                            // await sourceStream.cancel();
                            break;
                        }

                        isFirstPart = false;
                    } catch (error) {
                        console.warn({
                            message: 'Continue decoding',
                            error,
                        });
                    }
                }
            }
            
            if (done) {
                break;
            }

            await Utils.sleep(100);
        }

        this.loaded = true;
        this.emit(this.events.LOAD, this);

        return this;
    }

    async setSource(rawSource: BufferSourceTypes) {
        const paused = this._paused;
        this.pause();
        delete this.audioBuffer;
        this.currentTime = 0;
        this._paused = paused;

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
