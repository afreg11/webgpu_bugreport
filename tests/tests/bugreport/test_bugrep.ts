import { WebGPUUtils } from "../../../projects/webgpu_utils/webgpu_utils";
import bugrep from "./bugrep.wgsl";

const workgroupSize = 256;
const maxThreads = 4096;
const workgroups = 16;

describe('webgpu test', function () {
    it('test', async function () {
        async function main() {
            // micro-library for webgpu work
            let gpuUtils = new WebGPUUtils();
            await gpuUtils.init();

            let test = new BugReport(gpuUtils);
            let nElememnts = 1024*1024;
            let result = [];

            for (let i = 0; i < 20; i++) {
                let storage1 = new Uint32Array(maxThreads*256);
                let storage2 = new Uint32Array(nElememnts);

                await test.init({
                    storage2,
                    storage1,
                    result
                });
                
                await test.run({});
            }
            for (let i = 1; i < 20; i++) {
                for (let j = 0; j < 4; j++) {
                    if (result[i][j] !== result[i-1][j])
                        throw new Error("Inconsistent behaviour");
                }
            }
        }

        try {
            await main();
        } catch (e) {
            console.error(e);
            throw e;
        }
    });
})

export class BugReport {

    gpuUtils: WebGPUUtils;
    
    // cache for some webgpu objects
    pipelines: Map<string, GPUComputePipeline>;
    layouts: Map<string, GPUBindGroupLayout>;
    binding_groups: Map<string, GPUBindGroup>;
    buffers: Map<string, GPUBuffer>;

    // some global parameters
    threads: number;
    workgroups: number;
    workgroup_size: number;
    storage2: ArrayBuffer;
    storage1: ArrayBuffer;
    result: Array<Array<number>>;

    constructor(gpuUtils: WebGPUUtils) {
        this.gpuUtils = gpuUtils;
    }

    async init(data) {
        // INIT
        this.storage2 = data.storage2;
        this.storage1 = data.storage1;
        this.workgroup_size = workgroupSize;
        this.workgroups = workgroups;
        this.threads = maxThreads;
        this.result = data.result;

        // BUFFERS
        this.buffers = new Map();
        this.buffers.set("storage1", this.gpuUtils.device.createBuffer({
            size: this.storage1.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        }));
        this.buffers.set("readstorage1",  this.gpuUtils.device.createBuffer({
            size: this.storage1.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        }));
        this.buffers.set("storage2", this.gpuUtils.device.createBuffer({
            size: this.storage2.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        }));
        this.buffers.set("readstorage2",  this.gpuUtils.device.createBuffer({
            size: this.storage2.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        }));

        // creating compute pipeline


        // BINDING LAYOUTS
        this.layouts = new Map();
        this.layouts.set("temp", this.gpuUtils.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
            ]
        }));

        // BINDING GROUPS
        this.binding_groups = new Map();
        this.binding_groups.set("temp", this.gpuUtils.device.createBindGroup({
            layout: this.layouts.get("temp"),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.buffers.get("storage2"),
                        offset: 0,
                        size: this.storage2.byteLength,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.buffers.get("storage1"),
                        offset: 0,
                        size: this.storage1.byteLength,
                    },
                }
            ],
        }));

        // PIPELINES
        this.pipelines = new Map();
        let shader1 = bugrep.replaceAll("__WORKGROUP_SIZE__", this.workgroup_size);
        this.pipelines.set("bugrep", this.gpuUtils.device.createComputePipeline({
            layout: this.gpuUtils.device.createPipelineLayout({
                bindGroupLayouts: [
                    this.layouts.get("temp")
                ]
            }),
            compute: {
                module: this.gpuUtils.device.createShaderModule({
                    code: shader1,
                }),
                entryPoint: 'main',
            },
        }));
    }

    async run(data): Promise<void> {
        let command_encoder: GPUCommandEncoder = this.gpuUtils.device.createCommandEncoder();
        
        let pass_encoder: GPUComputePassEncoder = command_encoder.beginComputePass();

        pass_encoder.setPipeline(this.pipelines.get("bugrep"));
        pass_encoder.setBindGroup(0, this.binding_groups.get("temp"));
        pass_encoder.dispatchWorkgroups(this.workgroups, 1, 1);
        // pass_encoder.end();
        pass_encoder.endPass();

        command_encoder.copyBufferToBuffer(
            this.buffers.get("storage1"),
            0,
            this.buffers.get("readstorage1"),
            0,
            this.storage1.byteLength
        );
        command_encoder.copyBufferToBuffer(
            this.buffers.get("storage2"),
            0,
            this.buffers.get("readstorage2"),
            0,
            this.storage1.byteLength
        );

        this.gpuUtils.device.queue.submit([command_encoder.finish()]);

        await this.buffers.get("readstorage1").mapAsync(GPUMapMode.READ);
        let data_to_read1 = this.buffers.get("readstorage1").getMappedRange(0, this.storage1.byteLength);
        await this.buffers.get("readstorage2").mapAsync(GPUMapMode.READ);
        let data_to_read2 = this.buffers.get("readstorage2").getMappedRange(0, this.storage2.byteLength);

        // CHECK RESULTS
        let bins2 = new Uint32Array(data_to_read1);
        let bins1 = new Uint32Array(data_to_read2);
        let buf1_table = 0;
        for (let offs = 4095*256; offs<4096*256; offs++)
            buf1_table += bins1[offs];
        let buf1_last_row = 0;
        for (let offs = 4095*256; offs<4096*256; offs++)
            buf1_last_row += bins1[offs];
        let buf2_table = 0;
        for (let offs = 0; offs<4096*256; offs++)
            buf2_table += bins2[offs];
        let buf2_last_row = 0;
        for (let offs = 4095*256; offs<4096*256; offs++)
            buf2_last_row += bins2[offs];
        console.log("Buffer1 summ: ", buf1_table, "\t last row summ: ", buf1_last_row, "\t Buffer 2 summ: ", buf2_table, "\t Last row summ: ", buf2_last_row);
        this.result.push([buf1_table, buf1_last_row, buf2_table, buf2_last_row]);

        this.buffers.get("readstorage1").unmap();
        this.buffers.get("readstorage2").unmap();
    }
}