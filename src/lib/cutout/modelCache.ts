export {
  clearModelCache,
  fetchModelBuffer,
  type FetchModelOptions,
} from '../ort/modelCache'

import { clearModelCache } from '../ort/modelCache'

/** 抠图模型独立一个桶，清理放大模型时不会误伤。 */
export const CUTOUT_CACHE_NAME = 'cutout-models-v1'

export function clearCutoutModelCache(): Promise<void> {
  return clearModelCache(CUTOUT_CACHE_NAME)
}
