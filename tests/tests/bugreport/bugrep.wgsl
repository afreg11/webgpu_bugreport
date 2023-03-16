// ------------------------------------
// 1. use two Array<u32> buffers
// ------------------------------------

@group(0) @binding(0) var<storage, read_write> bins1: array<u32>;
@group(0) @binding(1) var<storage, read_write> bins2: array<u32>;

@compute @workgroup_size(__WORKGROUP_SIZE__)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>,
        @builtin(local_invocation_id) local_id : vec3<u32>,
        @builtin(workgroup_id) wg_id: vec3<u32>,
        @builtin(num_workgroups) wg_num: vec3<u32>) {

    var group_size: u32 = __WORKGROUP_SIZE__;
    var groups_num: u32 = wg_num.x;
    var threads_num: u32 = group_size * groups_num;
    var thread_id: u32 = global_id.x;

    // offset to detect this thread bin
    var thread_offset: u32 = thread_id * 256u;

    // bins can be represented as 256*threads_num table of u32

    // fill the table with 1
    // Result have to be as follows:
    //          |  0  |  1  |  2  |  3  | ... | 255  <- bin id
    //          | --- | --- | --- | --- |-----|----
    //      0   |  1  |  1  |  1  |  1  | ... |  1
    //      1   |  1  |  1  |  1  |  1  | ... |  1
    //    ...   | ... | ... | ... | ... | ... | ...
    //   4095   |  1  |  1  |  1  |  1  | ... |  1
    //     ^
    // thread id

    // Summ of all values in tabe is 256x4096 = 1048576


    // ------------------------------------
    // 2. in shader fill both buffers with ones (1u)
    // ------------------------------------
    for (var index: u32=thread_offset; index < thread_offset+256u; index++) {
        bins1[index] = 1u;
    }
    storageBarrier();
    for (var index: u32=thread_offset; index < thread_offset+256u; index++) {
        bins2[index] = 1u;
    }
    storageBarrier();

    // summ collumns of bin; each next value is sum of all previous ones
    // Result have to be as follows:
    //          |  0  |  1  |  2  |  3  | ... | 255 <- thread id = bin id
    //          | --- | --- | --- | --- |-----|----
    //      0   |  1  |  1  |  1  |  1  | ... |  1
    //      1   |  2  |  2  |  2  |  2  | ... |  2  
    //      2   |  3  |  3  |  3  |  3  | ... |  3  
    //    ...   | ... | ... | ... | ... | ... | ...
    //   4095   | 4096| 4096| 4096| 4096| ... | 4096
    

    // Summ of last line in table is 256x4096 = 1048576
    

    // ------------------------------------
    // 3. after storage barrier compute partial sums of second buffer
    // ------------------------------------
    
    if (thread_id < 256u) {
        var prevOffset: u32 = thread_id;
        var maxId = thread_id + 256u*(threads_num - 1u);
        for (var offset: u32 = thread_id + 256u; offset < threads_num * 256u; offset += 256u) {
            bins2[offset] += bins2[prevOffset];
            prevOffset = offset;
        }
    };
}