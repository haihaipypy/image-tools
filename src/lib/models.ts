import type { UpscaleModelSpec } from './types'

/**
 * 模型注册表。
 *
 * 权重以同源静态资源的形式随站点发布（public/models/），部署在 Cloudflare 上
 * 不额外计费。模型的中文/英文说明与标签不写在这里 —— 见 i18n 的 upscaleModels，
 * 按 model.id 取用。
 */
export const MODELS: UpscaleModelSpec[] = [
  {
    id: 'realesr-general-x4v3',
    label: 'Real-ESRGAN General x4 v3',
    url: '/models/realesr-general-x4v3.onnx',
    scale: 4,
    approxBytes: 4_839_000,
    inputRange: 'unit',
    inputName: 'image',
    outputName: 'upscaled_image',
    fixedInputSize: 128,
    license: 'BSD-3-Clause',
  },
]

export const DEFAULT_MODEL_ID = MODELS[0]!.id

export function getModel(id: string): UpscaleModelSpec {
  return MODELS.find((model) => model.id === id) ?? MODELS[0]!
}

/** UI 提供的放大倍率。4x 模型可以向下覆盖到任何小于 4 的倍率。 */
export const TARGET_SCALES = [2, 3, 4] as const
export type TargetScale = (typeof TARGET_SCALES)[number]
