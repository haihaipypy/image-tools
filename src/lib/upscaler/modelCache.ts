/**
 * 放大模型的缓存入口。
 *
 * 实现已提到 `lib/ort/modelCache.ts` —— 抠图要复用同一套「下载 + 计时器兜底」
 * 逻辑，而它比放大的权重体积大一个数量级（94 MB vs 4.8 MB），所以下载路径
 * 必须只有一份，改一次两边都受益。这里只保留名字与转发。
 */
import { clearModelCache as clearShared, fetchModelBuffer as fetchShared } from '../ort/modelCache'

const CACHE_NAME = 'upscale-models-v1'

export type FetchModelOptions = import('../ort/modelCache').FetchModelOptions

export function fetchModelBuffer(
  url: string,
  options: FetchModelOptions = {},
): Promise<ArrayBuffer> {
  return fetchShared(url, { ...options, cacheName: CACHE_NAME })
}

export function clearModelCache(): Promise<void> {
  return clearShared(CACHE_NAME)
}

