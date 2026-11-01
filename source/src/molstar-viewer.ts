import 'molstar/build/viewer/molstar.css';
import { Viewer } from 'molstar/lib/apps/viewer/app';
import { SecondaryStructureType } from 'molstar/lib/mol-model/structure/model/types';
import { SecondaryStructureProvider } from 'molstar/lib/mol-model-props/computed/secondary-structure';
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { StateSelection, type StateObjectSelector } from 'molstar/lib/mol-state';
import { RuntimeContext } from 'molstar/lib/mol-task';
import { Color } from 'molstar/lib/mol-util/color';
import { ungzip } from 'pako';
import { firstValueFrom, skip, take, timeout } from 'rxjs';
import type { CoordinateAsset, SceneAudit, SiteManifest, TargetRecord, ViewMode } from './types';

type StructureSelector = StateObjectSelector<PluginStateObject.Molecule.Structure>;
function color(value:string):Color { return Color(Number.parseInt(value.replace('#',''),16)); }
async function digest(data:Uint8Array):Promise<string> { const view=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength); const d=await crypto.subtle.digest('SHA-256',view); return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function url(path:string):string { const base=new URL(import.meta.env.BASE_URL,window.location.origin); return new URL(path,base).href; }
async function fetchCoordinate(asset:CoordinateAsset,signal:AbortSignal):Promise<Uint8Array>{
  const response=await fetch(url(asset.url),{signal}); if(!response.ok) throw new Error(`Coordinate request failed (${response.status}) for ${asset.url}`);
  const delivered=new Uint8Array(await response.arrayBuffer());
  const isGzip=delivered[0]===0x1f&&delivered[1]===0x8b;
  const decoded=isGzip?ungzip(delivered):delivered;
  if(isGzip){if(delivered.byteLength!==asset.compressed_bytes || await digest(delivered)!==asset.compressed_sha256) throw new Error(`Compressed checksum mismatch for ${asset.url}`);}
  if(decoded.byteLength!==asset.uncompressed_bytes || await digest(decoded)!==asset.uncompressed_sha256) throw new Error(`Coordinate checksum mismatch for ${asset.url}`); return decoded;
}
export class ProteinScene {
  private viewer:Viewer|null=null; private abortController:AbortController|null=null; private generation=0; private pending:Promise<SceneAudit|null>=Promise.resolve(null);
  async initialize(element:HTMLElement,canvasColor:string):Promise<void>{
    this.viewer=await Viewer.create(element,{layoutIsExpanded:false,layoutShowControls:false,layoutShowSequence:false,layoutShowLog:false,layoutShowLeftPanel:false,viewportShowControls:false,viewportShowExpand:true,viewportShowSelectionMode:false,viewportShowAnimation:false,transparency:'wboit'});
    await PluginCommands.Canvas3D.SetSettings(this.viewer.plugin,{settings:(props)=>{props.renderer.backgroundColor=color(canvasColor);props.renderer.ambientIntensity=1.0;}});
  }
  async clear():Promise<void>{++this.generation;this.abortController?.abort();await this.pending.catch(()=>null);await this.viewer?.plugin.clear();}
  async load(record:TargetRecord,mode:ViewMode,semantics:SiteManifest['visual_semantics']):Promise<SceneAudit|null>{
    const request=++this.generation; this.abortController?.abort(); const prior=this.pending;
    this.pending=(async()=>{await prior.catch(()=>null);if(request!==this.generation)return null;return this.loadScene(record,mode,semantics);})(); return this.pending;
  }
  private async loadScene(record:TargetRecord,mode:ViewMode,semantics:SiteManifest['visual_semantics']):Promise<SceneAudit>{
    if(!this.viewer)throw new Error('Mol* viewer is not initialized.'); const plugin=this.viewer.plugin; await plugin.clear(); this.abortController=new AbortController(); const signal=this.abortController.signal;
    const items:Array<{asset:CoordinateAsset;label:string;paint:string;opacity:number}>=[];
    if(mode==='experimental'||mode==='overlay')items.push({asset:record.experimental.coordinate,label:'Experimental PDB',paint:semantics.experimental,opacity:semantics.experimental_opacity});
    if(mode==='predicted'||mode==='overlay')items.push({asset:record.predicted.coordinate,label:'Predicted · aligned offline',paint:semantics.predicted,opacity:semantics.predicted_opacity});
    const parsed=[] as Array<{structure:StructureSelector;method:'dssp'|'zhang-skolnick'|'none';count:number}>;
    for(const item of items){const data=await fetchCoordinate(item.asset,signal);const parsedStructure=await this.parse(data,item.label);parsed.push(parsedStructure);await this.addChain(parsedStructure.structure,item.label,item.paint,item.opacity,'A');}
    const canvas=plugin.canvas3d; if(!canvas)throw new Error('Mol* canvas is unavailable.'); canvas.commit(true); const draw=firstValueFrom(canvas.didDraw.pipe(skip(1),take(1),timeout(15000))); canvas.requestCameraReset({durationMs:0}); canvas.requestDraw(); await draw;
    const methods=new Set(parsed.map(x=>x.method)); return {representation:'cartoon',secondaryStructure:methods.size===1?parsed[0].method:'mixed',structuredResidueCount:parsed.reduce((n,x)=>n+x.count,0),representationCount:plugin.state.data.select(StateSelection.Generators.ofType(PluginStateObject.Molecule.Structure.Representation3D)).length};
  }
  private async parse(data:Uint8Array,label:string):Promise<{structure:StructureSelector;method:'dssp'|'zhang-skolnick'|'none';count:number}>{
    if(!this.viewer)throw new Error('Mol* viewer is not initialized.'); const plugin=this.viewer.plugin; const raw=await plugin.builders.data.rawData({data:new TextDecoder().decode(data),label},{state:{isGhost:true}}); const trajectory=await plugin.builders.structure.parseTrajectory(raw,'mmcif'); const model=await plugin.builders.structure.createModel(trajectory); const structure=await plugin.builders.structure.createStructure(model); if(!structure.obj)throw new Error(`Structure creation failed: ${label}`);
    await SecondaryStructureProvider.attach({runtime:RuntimeContext.Synchronous,assetManager:plugin.managers.asset,errorContext:plugin.errorContext},structure.obj.data,{type:{name:'dssp',params:{oldDefinition:true,oldOrdering:true}}},true); let assignments=SecondaryStructureProvider.get(structure.obj.data).value; if(!assignments)throw new Error(`DSSP failed: ${label}`); let method:'dssp'|'zhang-skolnick'|'none'='dssp'; let count=this.count(assignments);
    if(count===0){await SecondaryStructureProvider.attach({runtime:RuntimeContext.Synchronous,assetManager:plugin.managers.asset,errorContext:plugin.errorContext},structure.obj.data,{type:{name:'zhang-skolnick',params:{}}},true); assignments=SecondaryStructureProvider.get(structure.obj.data).value; if(!assignments)throw new Error(`Secondary structure failed: ${label}`); method='zhang-skolnick'; count=this.count(assignments);} if(count===0)method='none'; return {structure,method,count};
  }
  private count(assignments:NonNullable<ReturnType<typeof SecondaryStructureProvider.get>['value']>):number{let n=0;for(const ss of assignments.values())for(let i=0;i<ss.type.length;i++){const t=ss.type[i];if(SecondaryStructureType.is(t,SecondaryStructureType.Flag.Helix)||SecondaryStructureType.is(t,SecondaryStructureType.Flag.Beta))n++;}return n;}
  private async addChain(structure:StructureSelector,label:string,paint:string,opacity:number,chainId:string):Promise<void>{if(!this.viewer)throw new Error('Mol* viewer is not initialized.'); const component=await this.viewer.plugin.builders.structure.tryCreateComponentFromExpression(structure,MS.struct.generator.atomGroups({'chain-test':MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_asym_id(),chainId])}),label.toLowerCase().replace(/[^a-z0-9]+/g,'-'),{label}); if(!component)throw new Error(`Chain selection is empty: ${label}`); await this.viewer.plugin.builders.structure.representation.addRepresentation(component,{type:'cartoon',color:'uniform',colorParams:{value:color(paint)},typeParams:{alpha:opacity,quality:'high',sizeFactor:0.5,visuals:['polymer-trace','polymer-gap'],tubularHelices:false,helixProfile:'elliptical',aspectRatio:5,arrowFactor:1.5,doubleSided:true}});}
  dispose():void{this.abortController?.abort();this.viewer?.dispose();this.viewer=null;}
}
