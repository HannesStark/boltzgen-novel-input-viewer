import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
const root=new URL('../public/data/',import.meta.url); const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
if(manifest.record_count!==manifest.records.length||manifest.records.length!==13)throw new Error('manifest count mismatch');
const ids=new Set();
for(const r of manifest.records){if(ids.has(r.record_id))throw new Error(`duplicate ${r.record_id}`);ids.add(r.record_id);for(const asset of [r.experimental.coordinate,r.predicted.coordinate]){if(!asset.url.startsWith('data/structures/'))throw new Error('asset escaped site prefix');const bytes=readFileSync(new URL(asset.url.replace(/^data\//,''),root));if(bytes.length!==asset.compressed_bytes)throw new Error(`${r.record_id} compressed length`);if(createHash('sha256').update(bytes).digest('hex')!==asset.compressed_sha256)throw new Error(`${r.record_id} compressed sha`);const raw=gunzipSync(bytes);if(raw.length!==asset.uncompressed_bytes)throw new Error(`${r.record_id} raw length`);if(createHash('sha256').update(raw).digest('hex')!==asset.uncompressed_sha256)throw new Error(`${r.record_id} raw sha`);}}
console.log(`validated ${manifest.records.length} records and ${manifest.records.length*2} coordinate assets`);
if(manifest.production_results.status==='complete'){
 const results=manifest.production_results;
 if(results.attempts_measured!==4000||results.cells_complete!==40||results.figures.length!==4)throw new Error('Incomplete production results');
 for(const [name,hash] of Object.entries(results.asset_sha256)){
  if(!/^[a-z_]+\.(png|pdf|csv|md|json)$/.test(name))throw new Error('Unexpected result path');
  const bytes=readFileSync(new URL('results/'+name,root));
  if(createHash('sha256').update(bytes).digest('hex')!==hash)throw new Error('Result checksum mismatch: '+name);
 }
 console.log('validated final result counts, four figure pairs, and all curated result checksums');
}

const alignment=JSON.parse(readFileSync(new URL('alignment-validation.json',root),'utf8'));
if(!alignment.passed || alignment.records.length!==manifest.records.length)throw new Error('Alignment audit missing');
for(const r of manifest.records){const a=alignment.records.find(x=>x.record_id===r.record_id);if(!a || a.predicted_compressed_sha256!==r.predicted.coordinate.compressed_sha256 || a.experimental_compressed_sha256!==r.experimental.coordinate.compressed_sha256 || Math.abs(a.materialized_ca_rmsd_angstrom-r.alignment.observed_ca_rmsd_angstrom)>2e-5)throw new Error('Serialized alignment audit mismatch: '+r.record_id);}
console.log('validated serialized alignment evidence for all 13 coordinate pairs');
