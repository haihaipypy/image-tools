/**
 * 抠图模型的缓存入口。
 *
 * 必须在这里把 `cacheName` 绑死，不能把共享的 `fetchModelBuffer` 直接再导出：
 * 那一版的默认桶是 upscale 的，直接导出会让三个工具的权重挤进同一个桶 ——
 * 「清理放大模型」顺手抹掉抠图和点选抠图的上百 MB 权重，而本文件的
 * clearCutoutModelCache() 反倒去清一个从没写入过的空桶。
 *
 * 改到这里之后，老用户第一次会重新下一次权重（原先的位置在 upscale 那个桶
 * 里，不属于本工具，不去动它）。一次性代价，换来清理边界是清晰的。
 */
import { clearModelCache as clearShared, fetchModelBuffer as fetchShared } from '../ort/modelCache'

export type FetchModelOptions = import('../ort/modelCache').FetchModelOptions

/** 抠图模型独立一个桶，清理放大模型时不会误伤。 */
export const CACHE_NAME = 'cutout-models-v1'

export function fetchModelBuffer(
  url: string,
  options: FetchModelOptions = {},
): Promise<ArrayBuffer> {
  return fetchShared(url, { ...options, cacheName: CACHE_NAME })
}

export function clearModelCache(): Promise<void> {
  return clearShared(CACHE_NAME)
}
