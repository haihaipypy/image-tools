import type { CutoutModelSpec } from '../types'

/**
 * 抠图模型注册表。
 *
 * 与放大模型不同，BiRefNet 的权重不随仓库发布 —— 单个体积在 94 MB 到 452 MB
 * 之间，远超静态托管能接受的范围。权重改为从 HuggingFace Hub 按固定 revision
 * 拉取，并由 Cache Storage 缓存（见 modelCache.ts）。
 *
 * 固定 revision 很重要：权重地址是可变的，钉住 commit 才能保证今天跑通的模型
 * 明天还是同一个。升级模型 = 改这里的 revision 常量。
 *
 * 中文/英文说明与标签不写在这里 —— 见 i18n 的 cutoutModels，按 model.id 取用。
 */
export const CUTOUT_MODELS: CutoutModelSpec[] = [
  {
    id: 'birefnet-lite-512',
    label: 'BiRefNet Lite',
    /** 有 fp16 WebGPU 能力时用半精度，否则 fp32。见 resolveCutoutModel。 */
    variants: {
      webgpu: {
        url: 'https://huggingface.co/studioludens/birefnet-lite-512/resolve/4a3c40c36c94093cc1e724d9ea428b8fa4b57dc7/onnx/model_fp16.onnx',
        approxBytes: 98_484_532,
        dtype: 'fp16',
      },
      wasm: {
        url: 'https://huggingface.co/studioludens/birefnet-lite-512/resolve/4a3c40c36c94093cc1e724d9ea428b8fa4b57dc7/onnx/model.onnx',
        approxBytes: 191_877_254,
        dtype: 'fp32',
      },
    },
    inputSize: 512,
    inputName: 'input_image',
    /**
     * 图的输出名。实测（onnxruntime-web 1.30.0 加载该 revision 的 fp16 权重）
     * 为 `output_image`，且只有这一个输出 —— 曾误以为叫 `logits`。
     */
    outputName: 'output_image',
    /**
     * 输出是否需要 sigmoid。这两个导出都是未激活的 logits，必须过一遍 sigmoid
     * 才能当 alpha 用；若某天换成已激活的导出版本，这里改 false。
     */
    outputIsLogits: true,
    license: 'MIT',
  },
  {
    id: 'birefnet-512',
    label: 'BiRefNet',
    variants: {
      webgpu: {
        url: 'https://huggingface.co/naddy24/birefnet-512-webgpu/resolve/main/onnx/model_fp16.onnx',
        approxBytes: 473_435_223,
        dtype: 'fp16',
      },
      wasm: {
        url: 'https://huggingface.co/naddy24/birefnet-512-webgpu/resolve/main/onnx/model_fp16.onnx',
        approxBytes: 473_435_223,
        dtype: 'fp16',
      },
    },
    inputSize: 512,
    inputName: 'input_image',
    /** 与 lite 版同为 `output_image`，只有这一个输出。 */
    outputName: 'output_image',
    outputIsLogits: true,
    license: 'MIT',
  },
]

export const DEFAULT_CUTOUT_MODEL_ID = CUTOUT_MODELS[0]!.id

export function getCutoutModel(id: string): CutoutModelSpec {
  return CUTOUT_MODELS.find((model) => model.id === id) ?? CUTOUT_MODELS[0]!
}

/**
 * BiRefNet 的官方预处理就两组常量：ImageNet 均值方差 + 缩放到 [0,1]。
 * 与大多数图不同，它**不做** letterbox —— 官方实现直接 resize 到 512×512，
 * 长宽比失真由网络自己吸收，还原时再拉回原尺寸。
 */
export const IMAGE_MEAN = [0.485, 0.456, 0.406] as const
export const IMAGE_STD = [0.229, 0.224, 0.225] as const
