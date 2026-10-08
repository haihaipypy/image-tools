/**
 * 最小 ZIP 打包器（store 模式，不压缩）。
 *
 * 九宫格切片要一次给用户 9 个 PNG，逐个触发下载会被浏览器当成弹窗轰炸，
 * 所以打个包。这里没有引入 JSZip —— PNG 内部已经压过一轮，store 模式打出来
 * 的体积和压缩模式几乎一样，为这点收益多背一个依赖不划算。
 *
 * 只实现了写，不需要读。文件名按 UTF-8 写并置上 0x0800 标志位，
 * 否则中文名在不同解压工具里会变成乱码。
 */

export interface ZipEntry {
  name: string
  /**
   * 写成 `Uint8Array<ArrayBuffer>` 而不是裸的 `Uint8Array`。
   *
   * TS 5.7 起 TypedArray 带上了底层缓冲的类型参数，裸写等价于
   * `Uint8Array<ArrayBufferLike>` —— 里面还可能是由 SharedArrayBuffer 托管的，
   * 而 Blob 只接受 ArrayBuffer。调用方给的都是 `blob.arrayBuffer()` 现造的，
   * 收紧这里比在 Blob 那一步强转诚实。
   */
  data: Uint8Array<ArrayBuffer>
}

/** 同理，central 目录也是自己 new 出来的 ArrayBuffer 托管。 */
type Local = Uint8Array<ArrayBuffer>

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder()
  const now = new Date()
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | (Math.floor(now.getSeconds() / 2) & 0x1f)
  const dosDate =
    (((now.getFullYear() - 1980) & 0x7f) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

  const parts: BlobPart[] = []
  const central: Local[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const crc = crc32(entry.data)

    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true) // version needed
    lv.setUint16(6, 0x0800, true) // UTF-8 文件名
    lv.setUint16(8, 0, true) // store
    lv.setUint16(10, dosTime, true)
    lv.setUint16(12, dosDate, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, entry.data.length, true)
    lv.setUint32(22, entry.data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)

    parts.push(local, entry.data)

    const dir = new Uint8Array(46 + name.length)
    const dv = new DataView(dir.buffer)
    dv.setUint32(0, 0x02014b50, true)
    dv.setUint16(4, 20, true) // version made by
    dv.setUint16(6, 20, true) // version needed
    dv.setUint16(8, 0x0800, true)
    dv.setUint16(10, 0, true)
    dv.setUint16(12, dosTime, true)
    dv.setUint16(14, dosDate, true)
    dv.setUint32(16, crc, true)
    dv.setUint32(20, entry.data.length, true)
    dv.setUint32(24, entry.data.length, true)
    dv.setUint16(28, name.length, true)
    dv.setUint16(30, 0, true) // extra
    dv.setUint16(32, 0, true) // comment
    dv.setUint16(34, 0, true) // disk
    dv.setUint16(36, 0, true) // internal attrs
    dv.setUint32(38, 0, true) // external attrs
    dv.setUint32(42, offset, true)
    dir.set(name, 46)
    central.push(dir)

    offset += local.length + entry.data.length
  }

  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0)

  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  return new Blob([...parts, ...central, end], { type: 'application/zip' })
}
