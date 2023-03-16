export class WebGPUUtils {

    adapter: GPUAdapter;
    device: GPUDevice;

    async webgpu_info() {
        function mapLikeToTableRows(obj: object) {
            let entries: Array<any> = [];
            for (const key in obj) {
                entries.push([key, obj[key]]);
            }
        
            return Object.fromEntries(entries);
        }
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (adapter) {
            return {limits: mapLikeToTableRows(adapter.limits), features: mapLikeToTableRows(adapter.features)};
        }
        return null;
    }

    async init(pref?) {
        this.adapter = await navigator.gpu.requestAdapter({ powerPreference: pref ? pref : "high-performance" });
        this.device = await this.adapter.requestDevice();
    }

    
}