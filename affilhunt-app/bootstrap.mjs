import fs from 'node:fs';
import zlib from 'node:zlib';

const packed = String(process.env.APP_GZ_B64 || '').trim();
if (!packed) throw new Error('APP_GZ_B64 missing');
const source = zlib.gunzipSync(Buffer.from(packed, 'base64'));
const target = '/tmp/affilhunt-standalone.mjs';
fs.writeFileSync(target, source);
await import('file://' + target);
