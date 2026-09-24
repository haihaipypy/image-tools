/**
 * 放大流水线的 ORT 入口。
 *
 * 运行时准备逻辑已提到 `lib/ort/` 下与抠图共用 —— 两个工具跑在同一份 wasm
 * 运行时上，准备两次意味着重复下载并解压 26 MB。这里只做转发，好让放大侧的
 * 调用点保持原样，也让 `prepareOrtRuntime()` 的 memo 落在真正唯一的地方。
 *
 * 注意 `LocalBackend` 现在从共享层导出：类型必须来自同一声明，否则放大与抠图
 * 各自声明一份结构相同的联合类型，将来加后端时会悄悄分叉。
 */
export {
  configureThreads,
  ort,
  prepareOrtRuntime,
  type LocalBackend,
} from '../ort'

export { RuntimeError } from '../ort'
