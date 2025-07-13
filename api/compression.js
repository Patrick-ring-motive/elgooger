const gzipResponse = res =>{
	const newRes = new Response(res.clone().body.pipeThrough(new CompressionStream("gzip")),res);
	newRes.headers.set('content-encoding','gzip');
	return newRes;
};
const gzipStream = x =>  new Response(x).body.pipeThrough(new CompressionStream("gzip"));
const gzip = x =>  new Response(new Response(x).body.pipeThrough(new CompressionStream("gzip"))).arrayBuffer();


const gunzipResponse = res =>{
	const newRes = new Response(res.clone().body.pipeThrough(new DecompressionStream("gzip")),res);
	newRes.headers.delete('content-encoding');
	return newRes;
};
const gunzipStream = x =>  new Response(x).body.pipeThrough(new DecompressionStream("gzip"));
const gzip = x =>  new Response(new Response(x).body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
