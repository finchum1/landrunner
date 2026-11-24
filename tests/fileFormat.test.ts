import assert from 'node:assert/strict';
import { formatBytes, safeStorageName } from '../src/lib/fileFormat.ts';
assert.equal(formatBytes(500), '500 B'); assert.equal(formatBytes(2048), '2.0 KB'); assert.equal(formatBytes(50 * 1024), '50 KB'); assert.equal(formatBytes(3.5 * 1024 * 1024), '3.5 MB');
assert.equal(safeStorageName('Division Order (signed) 11-20.pdf'), 'Division_Order_signed_11-20.pdf');
assert.equal(safeStorageName('résumé.final.docx'), 'resume_final.docx');
assert.equal(safeStorageName('???.pdf'), 'file.pdf');
assert.equal(safeStorageName('noext'), 'noext');
console.log('FILES OK');
