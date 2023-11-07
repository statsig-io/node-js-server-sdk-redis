import zlib from 'zlib';

export function compressData(data: string): string {
  return zlib.deflateSync(data).toString('base64');
}

export function decompressData(data: string): string {
  return zlib.inflateSync(Buffer.from(data, 'base64')).toString();
}