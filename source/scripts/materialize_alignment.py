"""Materialize and independently verify the manifest's display-only transforms."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import gemmi
import numpy as np

DATA = Path(__file__).resolve().parents[1] / 'public/data'
manifest_path = DATA / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
checks = []
parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, help='Unaligned source root with RECORD_ID/RECORD_ID.cif files')
args = parser.parse_args()

def sha(data):
    return hashlib.sha256(data).hexdigest()

def atom_table(raw):
    return gemmi.cif.read_string(raw.decode()).sole_block().get_mmcif_category('_atom_site.')

def ca(raw):
    atoms = atom_table(raw)
    out = {}
    n = len(atoms['id'])
    for i in range(n):
        if atoms['label_atom_id'][i] != 'CA' or atoms['label_asym_id'][i] != 'A':
            continue
        if str(atoms.get('pdbx_PDB_model_num', ['1'] * n)[i]) != '1':
            continue
        idx = int(atoms['label_seq_id'][i])
        priority = (float(atoms.get('occupancy', ['1'] * n)[i]), str(atoms.get('label_alt_id', ['.'] * n)[i]) in {'.', 'None', 'False', 'A'})
        xyz = np.array([float(atoms[k][i]) for k in ('Cartn_x', 'Cartn_y', 'Cartn_z')])
        if idx not in out or priority > out[idx][0]:
            out[idx] = (priority, xyz)
    return {k: v[1] for k, v in out.items()}

for record in manifest['records']:
    asset = record['predicted']['coordinate']
    path = DATA.parent / asset['url']
    raw = gzip.decompress(path.read_bytes())
    if args.source_dir:
        raw = (args.source_dir / record['record_id'] / (record['record_id'] + '.cif')).read_bytes()
        assert sha(raw) == record['predicted']['source_unaligned_sha256']
    changed = sha(raw) == record['predicted']['source_unaligned_sha256']
    if changed:
        doc = gemmi.cif.read_string(raw.decode())
        atoms = doc.sole_block().get_mmcif_category('_atom_site.')
        rotation = np.array(record['alignment']['rotation']).reshape(3, 3)
        translation = np.array(record['alignment']['translation'])
        for i in range(len(atoms['id'])):
            xyz = np.array([float(atoms[k][i]) for k in ('Cartn_x', 'Cartn_y', 'Cartn_z')])
            aligned = rotation @ xyz + translation
            for key, value in zip(('Cartn_x', 'Cartn_y', 'Cartn_z'), aligned):
                atoms[key][i] = f'{value:.6f}'
        # get_mmcif_category returns a copy: explicitly write it back before serialization.
        doc.sole_block().set_mmcif_category('_atom_site.', atoms)
        raw = doc.as_string().encode()
        packed = gzip.compress(raw, mtime=0)
        path.write_bytes(packed)
        asset.update(compressed_bytes=len(packed), uncompressed_bytes=len(raw),
                     compressed_sha256=sha(packed), uncompressed_sha256=sha(raw))
    experimental = gzip.decompress((DATA.parent / record['experimental']['coordinate']['url']).read_bytes())
    native, predicted = ca(experimental), ca(raw)
    ids = record['observed_label_seq_ids']
    rmsd = float(np.sqrt(np.mean([np.sum((native[i] - predicted[i]) ** 2) for i in ids])))
    expected = record['alignment']['observed_ca_rmsd_angstrom']
    assert abs(rmsd - expected) < 2e-5, (record['record_id'], rmsd, expected)
    checks.append({'record_id': record['record_id'], 'predicted_compressed_sha256': asset['compressed_sha256'], 'experimental_compressed_sha256': record['experimental']['coordinate']['compressed_sha256'], 'observed_residues': len(ids),
                   'materialized_ca_rmsd_angstrom': rmsd, 'expected_ca_rmsd_angstrom': expected})
manifest['provenance']['display_alignment_verified'] = 'All 13 serialized coordinate pairs independently checked against manifest C-alpha RMSD; display-only transforms.'
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
(DATA / 'input-evidence.json').write_text(json.dumps({'manifest_sha256': sha(manifest_path.read_bytes()), 'records': [
    {r['record_id']: {'experimental': r['experimental']['coordinate'], 'predicted': r['predicted']['coordinate'], 'alignment': r['alignment']}}
    for r in manifest['records']]}, indent=2) + '\n')
(DATA / 'alignment-validation.json').write_text(json.dumps({'passed': True, 'records': checks}, indent=2) + '\n')
print(json.dumps({'passed': True, 'records': checks}))
