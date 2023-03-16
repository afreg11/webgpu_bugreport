Bugreport.

Detected incosistent behaviour while filling buffers. Way to reproduce:
	- We used 16 workgroups, 256 threads each, total 4096 threads.
	- Use two Array<u32> buffers, 1048576 elemets each. Consider this buffers tables 4096 rows x 256 columns. Element_index = row_index*256 + collumn_index.
	- FILL the first buffer, each of 4096 threads is filling the row, correspondong to its index;
	- FILL the second buffer in same way.
	- Wait untill buffers are filled by using storageBarrier.
	- Select first 256 threads and make OPERATIONS on the column of the second buffer. Collumn id correspondins to the thread id.
	- Results of operations are incosistant.
In our case we FILLed both buffers with ones (1u). For OPERATIONS we summed each collumn of second buffer and wrote results to the last row of this buffer.
We expect to get value 4096 in last 256 elements of second buffer. Summ of the last row have to be equal 1048576.
After running code several times we got lots of different summ results, such as 1048576, 2632624, 57875362, 3032305 etc with the same algorythm.
Result is correct if we do OPERATIONS on buffer that is FILLed first, instead of the second one.
Result is correct if we remove FILLing of first buffer, leaving only FILLing and OPERATIONS on second buffer.