class MediaSource {
    get duration() { return this.element.duration; }

    get currentTime() { return this.element.currentTime; }
    set currentTime(value) { this.element.currentTime = value; }

    get paused() { return this.element.paused; }

    play() { this.element.play(); }
    pause() { this.element.pause(); }

    connect(node) { this.node.connect(node); }
    disconnect(node) { this.node.disconnect(node); }
    
    constructor(ctx, output, elem) {
        this.output = output;
        this.element = elem;
        this.node = ctx.createMediaElementSource(elem);

        this.onchange = (a) => {};
        this.onended = (e) => {};

        this.node.connect(output);
        this.node.onchange = (e) => this.onchange(e);
        this.node.onended = (e) => this.onended(e);
        
        elem.onchange = (e) => this.onchange(e);
        elem.ondurationchange = (e) => this.onchange(e);
        elem.onended = (e) => this.onended(e);
    }
}

class BufferSource {
    get duration() { return this.abuf ? this.abuf.duration : 0; }

    get currentTime() {
        let playing = this.paused ? 0 : this.ctx.currentTime - this.startTime;

        return (this.startOffset + playing) % this.duration;
    }
    set currentTime(value) { 
        this.play(value);
    }
    
    clearNode() {
        if(this.node) {
            this.node.disconnect();
            this.node.onended = null;
            delete this.node;
        }
    }

    get node() { return this._node; }
    set node(bnode) {
        this.clearNode();

        bnode.connect(this.output);

        bnode.onended = (e) =>  {
            if(!bnode.loop)
                this.paused = true;
            this.startOffset = 0;
            this.onended(e);
        };

        this._node = bnode;
    }

    play(offset = this.startOffset) {
        this.startOffset = offset;
        this.startTime = this.ctx.currentTime;

        this.node = this.ctx.createBufferSource();
        this.node.buffer = this.abuf;

        //this.node.loop = true;

        this.node.start(0, offset % this.duration);

        this.paused = false;
    }
    pause() {
        this.startOffset += this.ctx.currentTime - this.startTime;
        this.paused = true;
        this.clearNode();
    }

    connect(node) { this.node.connect(node); }
    disconnect(node) { this.node.disconnect(node); }

    decode(buf) {
        const slen = Math.trunc(0.05 * buf.byteLength), curDate = Date.now();

        this.loadDate = curDate;
        
        this.ctx.decodeAudioData(buf.slice(0, slen), abuf => {
            if(this.loadDate > curDate)
                return;
            this.abuf = abuf;
            this.paused = true;

            this.onchange(this);
        }, err => console.log(`Something went wrong. Error: ${err}`));
        
        this.ctx.decodeAudioData(buf, abuf => {
            if(this.loadDate > curDate)
                return;
            const ctime = this.currentTime;

            this.abuf = abuf;

            this.currentTime = ctime;
        }, err => console.log(`Something went wrong. Error: ${err}`));
    }
    
    constructor(ctx, output, buf) {
        this.loadDate = 0;

        this.startOffset = 0;
        this.startTime = 0;

        this.paused = true;

        this.output = output;
        this.ctx = ctx;
        this.abuf;
        this._node;

        this.onchange = (a) => {};
        this.onended = (e) => {};

        this.decode(buf);
    }
};

class Source {
    get paused() { return this.src ? this.src.paused : true; }

    get duration() { return this.src ? this.src.duration : 0; }

    get currentTime() { return this.src ? this.src.currentTime : 0; }
    set currentTime(value) { if(this.src) this.src.currentTime = value; }

    play() { if(this.src) this.src.play(); }
    pause() { if(this.src) this.src.pause(); }

    connect(node) { if(this.src) this.src.connect(node); }
    disconnect(node) { if(this.src) this.src.disconnect(node); }

    get channelCount() {
        return this._src ? this._src.node.channelCount : 2;
    }

    get output() { return this._output; }
    set output(value) {
        if(this._output)
            this.disconnect(this._output);

        this._output = value;
        this.connect(this._output);
    }

    get src() { return this._src; }
    set src(value) {
        if(this._output)
            this.disconnect(this._output);

        this._src = value;

        this._src.onended = this.onended;
        this._src.onchange = (a) => { this.onchange(a); };
    }

    changeBuf(source) {
        if(this.src instanceof BufferSource)
            this.src.decode(source);
        else
            this.src = new BufferSource(this.ctx, this.output, source);
    }

    changeSrc(source) {
        if(typeof source == "string") {
            //alert(source.substring(0, 111));

            if(source.indexOf("data:") == 0) {
                try {
                    if(this.src instanceof MediaSource) {
                        this.src.element.src = source;
                        this.onchange(this.src);
                    } else {
                        this.src = new MediaSource(this.ctx, this.output, new Audio(source));
                    }
                } catch(e) {alert(e);}
            } else {
                let xhr = new XMLHttpRequest();

                xhr.open("GET", source, true);
                xhr.responseType = "arraybuffer";

                xhr.onload = () => {
                    this.changeBuf(xhr.response);
                }
            }
        } else if(source instanceof ArrayBuffer) {
            this.changeBuf(source);
        } else if(source instanceof HTMLMediaElement) {
            this.src = new MediaSource(this.ctx, this.output, source);
        }
    }

    constructor(ctx, output, source) {
        this._src; this.src;
        this.ctx = ctx;
        this._output;
        this.output = output;

        this.onchange = src => {};
        this.onended = e => {};

        this.changeSrc(source);
    }
};

class ACTX {
    get paused() { return this.src.paused; }

    get sourceChannelCount() { return this.src.channelCount; }

    get duration() { return this.src.duration; }

    get currentTime() { return this.src.currentTime; }
    set currentTime(value) { this.src.currentTime = value; }

    get volume() { return this._volume; }
    set volume(value) {
        this._volume = value;
        this.preGain.gain.value = this._volume2 * this._volume;
    }

    get volume2() { return this._volume2; }
    set volume2(value) {
        this._volume2 = value;
        this.preGain.gain.value = this._volume * this._volume2;
    }

    get postVolume() { return this.postGain.gain.value; }
    set postVolume(value) { this.postGain.gain.value = value; }

    changeSource(source) {
        this.src.changeSrc(source);
    }

    dataPropChange() {
        let fbcnt = this.monoAnalyser.frequencyBinCount,
            cnt = this.analysers.length;

        this._data.length = 0;

        for(let i=0; i<cnt; ++i)
            this._data[i] = new Uint8Array(fbcnt);
    }

    get fCount() { return Math.log2(this.monoAnalyser.fftSize / 32); }
    set fCount(value) {
        let v = 32 << Math.trunc(value);

        if(v == this.fCount)
            return;

        for(let i=0;i<this.stereoAnalysers.length; ++i)
            this.stereoAnalysers[i].fftSize = v;

        this.monoAnalyser.fftSize = v;

        this.dataPropChange();
    }

    get updTime() { return this.monoAnalyser.smoothingTimeConstant; }
    set updTime(value) {
        for(let i=0;i<this.stereoAnalysers.length; ++i)
            this.stereoAnalysers[i].smoothingTimeConstant = value;

        this.monoAnalyser.smoothingTimeConstant = value;
    }

    get currentData() {
        for(let i=0;i<this.analysers.length; ++i)
            this.analysers[i].getByteFrequencyData(this._data[i]);

        return this._data;
    }

    get currentMainData() {
        this.mainAnalyser.getByteFrequencyData(this._mainData[0]);
        this.mainAnalyser.getByteTimeDomainData(this._mainData[1]);

        return this._mainData;
    }

    pause() {
        this.src.pause();
        this.onplaychange();
    }
    
    play() {
        this.src.play();
        this.onplaychange();
    }

    splitClear() {
        if(this.splitter && this.stereoAnalysers) {
            this.postGain.disconnect(this.splitter);

            for(let i=0;i<this.stereoAnalysers.length; ++i)
                this.splitter.disconnect(this.stereoAnalysers[i]);
        }
    }

    fewSplit(cnt) {
        this.stereoAnalysers = new Array(cnt);
        this.splitter = this.ctx.createChannelSplitter(cnt);

        this.postGain.connect(this.splitter);

        for(let i=0;i<cnt; ++i) {
            let a = this.ctx.createAnalyser();

            this.splitter.connect(a, i);
            this.stereoAnalysers[i] = a;
        }
    }
    
    changeChanCnt(cnt) {
        if(cnt == 1)
            ++cnt;

        if(this.analysers.length == cnt)
            return;

        let fCount = this.fCount,
            updTime = this.updTime || 0.4;

        this.splitClear();
        this.fewSplit(cnt);

        this.fCount = fCount;
        this.updTime = updTime;

        this.dataPropChange();
    }

    get monoAnalysing() { return this._mono; }
    set monoAnalysing(value) {
        //if(this._mono != value) {
            this._mono = value;

            this.analysers.length = 0;

            if(value) {
                this.analysers.push(this.monoAnalyser);
            } else {
                for(let i=0; i<this.stereoAnalysers.length; ++i)
                    this.analysers.push(this.stereoAnalysers[i]);
            }

            this.dataPropChange();

            //let m = this.currentData;
        //}
    }

    addFilter(freq, type = 'peaking') {
        let prev = this.filters[this.filters.length-1] || this.preGain,
            f = this.ctx.createBiquadFilter();

        prev.disconnect();

        f.type = type;
        f.frequency.value = freq;
        f.Q.value = 1;
        f.gain.value = 0;

        this.filters.push(f);
        prev.connect(f);
        f.connect(this.postGain);

        return f;
    }

    removeFilter(fd) {
        let i = this.filters.lastIndexOf(fd);

        if(i >= 0 && i < this.filters.length) {
            let prev = i == 0 ? this.preGain : this.filters[i-1],
                next = i == this.filters.length-1 ? this.postGain : this.filters[i+1];

            prev.disconnect(fd);
            fd.disconnect(next);
            prev.connect(next);

            this.filters.splice(i, 1);
        }
    }

    setFiltersFrequencies(fs) {
        this.preGain.disconnect();

        if(this.filters.length)
            this.filters[this.filters.length-1].disconnect();

        this.filters = [];

        for(let freq of fs)
            this.addFilter(freq);
    }

    get mainDataSize() { return Math.log2(this.mainAnalyser.fftSize / 32); }
    set mainDataSize(value) {
        let v = 32 << value, size;

        if(v == this.mainDataSize)
            return;

        this.mainAnalyser.fftSize = v;
        size = this.mainAnalyser.frequencyBinCount;

        delete this._mainData;

        this._mainData = [new Uint8Array(size), new Uint8Array(size)];
    }

    constructor(source) {
        let AudioContext = window.AudioContext || window.webkitAudioContext;

        this._volume = 1;
        this._volume2 = 1;

        this.ctx = new AudioContext();
        this.preGain = this.ctx.createGain();
        this.postGain = this.ctx.createGain();
        //this.analysersDelay = this.ctx.createDelay();
        this.filters = [];
        this.stereoAnalysers = [];
        this.analysers = [];
        this.monoAnalyser = this.ctx.createAnalyser();
        this.mainAnalyser = this.ctx.createAnalyser();

        this._mono = false;
        this._data = [];
        this._mainData;

        this.src = new Source(this.ctx, this.preGain, source);
        
        this.onended = e => {};
        this.onchange = e => {};
        this.ondurationchange = e => {};
        this.onplaychange = e => {};

        this.src.onended = e => {
            this.onplaychange(e);
            this.onended(e);
        };

        this.src.onchange = src => {
            this.currentTime = 0;

            this.changeChanCnt(this.sourceChannelCount);
            this.onchange("changeSource");
            
            this.play();
        };
        
        this.update = () => {
            requestAnimationFrame(this.update.bind(this));
            this.ondurationchange(this);
        };

        this.changeChanCnt(this.sourceChannelCount);
        //this.fCount = 4;
        //this.updTime = 0.4;

        this.preGain.connect(this.postGain);
        this.postGain.connect(this.ctx.destination);
        
        this.postGain.connect(this.monoAnalyser);

        this.mainAnalyser.smoothingTimeConstant = 0.1;
        this.postGain.connect(this.mainAnalyser);
        this.mainDataSize = 7;

        this.monoAnalysing = true;

        this.changeSource(source);
    }
};

if(typeof module != 'undefined') {
    module.exports = ACTX;
}