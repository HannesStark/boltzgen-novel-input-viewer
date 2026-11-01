import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
const root=new URL('../public/data/',import.meta.url); const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
if(manifest.record_count!==manifest.records.length||manifest.records.length!==13)throw new Error('manifest count mismatch');
const ids=new Set();
for(const r of manifest.records){if(ids.has(r.record_id))throw new Error(`duplicate ${r.record_id}`);ids.add(r.record_id);for(const asset of [r.experimental.coordinate,r.predicted.coordinate]){if(!asset.url.startsWith('data/structures/'))throw new Error('asset escaped site prefix');const bytes=readFileSync(new URL(asset.url.replace(/^data\//,''),root));if(bytes.length!==asset.compressed_bytes)throw new Error(`${r.record_id} compressed length`);if(createHash('sha256').update(bytes).digest('hex')!==asset.compressed_sha256)throw new Error(`${r.record_id} compressed sha`);const raw=gunzipSync(bytes);if(raw.length!==asset.uncompressed_bytes)throw new Error(`${r.record_id} raw length`);if(createHash('sha256').update(raw).digest('hex')!==asset.uncompressed_sha256)throw new Error(`${r.record_id} raw sha`);}}
console.log(`validated ${manifest.records.length} records and ${manifest.records.length*2} coordinate assets`);
