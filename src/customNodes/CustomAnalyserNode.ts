import { CustomAudioNode } from "../CustomAudioNode";

export class CustomAnalyserNode extends CustomAudioNode {
    node: AnalyserNode;

    bytes: Uint8Array;
    floats: Float32Array;

    getNodeIn() {
        return this.node;
    }

    getNodeOut() {
        return this.node;
    }


    private updateResolution() {
        this.bytes = new Uint8Array(this.node.frequencyBinCount);
        this.floats = new Float32Array(this.node.frequencyBinCount);
    }


    get frequencyBinCount() {
        return this.node.frequencyBinCount;
    }

    get fftSize() {
        return this.node.fftSize;
    }
    set fftSize(value) {
        if (value === this.fftSize) {
            return;
        }

        this.node.fftSize = value;

        this.updateResolution();
    }

    get channelCount() {
        return this.node.channelCount;
    }
    set channelCount(value) {
        this.node.channelCount = value;
    }

    get smoothingTimeConstant() {
        return this.node.smoothingTimeConstant;
    }
    set smoothingTimeConstant(value) {
        this.node.smoothingTimeConstant = value;
    }


    getByteFrequencyData() {
        this.node.getByteFrequencyData(this.bytes);
        return this.bytes;
    }
    getByteTimeDomainData() {
        this.node.getByteTimeDomainData(this.bytes);
        return this.bytes;
    }

    getFloatFrequencyData() {
        this.node.getFloatFrequencyData(this.floats);
        return this.floats;
    }
    getFloatTimeDomainData() {
        this.node.getFloatTimeDomainData(this.floats);
        return this.floats;
    }


    constructorAfter() {
        this.node = this.ctx.createAnalyser();

        this.updateResolution();
    }
}
