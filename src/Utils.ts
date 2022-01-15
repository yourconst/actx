export class Utils {
    static sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    static concatBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
        const ui8a = new Uint8Array(
            buffers.reduce((acc, buffer) => acc + buffer.byteLength, 0),
        );

        let offset = 0;

        for (const buffer of buffers) {
            ui8a.set(new Uint8Array(buffer), offset);

            offset += buffer.byteLength;
        }
        
        return ui8a.buffer;
    }
};
