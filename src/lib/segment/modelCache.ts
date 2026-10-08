/**
 * 点选抠图模型的缓存入口。
 *
 * 与 cutout/modelCache.ts 同理：`fetchModelBuffer` 必须在这里绑好自己的桶名，
 * 不能直接把共享实现再导出。那一版的默认桶属于放大，三个工具混在一个桶里会
 * 让「清理某个工具」变成「清理所有工具」。
 */
import { clearModelCache as clearShared, fetchModelBuffer as fetchShared } from '../ort/modelCache'

export type FetchModelOptions = import('../ort/modelCache').FetchModelOptions

/**
 * 点选抠图的模型独立一个桶。
 *
 * 编码器和解码器加起来 45 MB —— 用户点「清理」时如果连它一起清掉，下次进来
 * 又要等十几秒，所以三个工具的权重各占一个桶。
 */
export const CACHE_NAME = 'segment-models-v1'

export function fetchModelBuffer(
  url: string,
  options: FetchModelOptions = {},
): Promise<ArrayBuffer> {
  return fetchShared(url, { ...options, cacheName: CACHE_NAME })
}

export function clearModelCache(): Promise<void> {
  return clearShared(CACHE_NAME)
}
