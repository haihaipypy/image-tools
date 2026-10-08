import type { CutoutModelSpec } from '../types'

/**
 * BiRefNet 系列的归一化常量：ImageNet 均值方差。
 * 与大多数图不同，它**不做** letterbox —— 官方实现直接 resize 到固定正方形，
 * 长宽比失真由网络自己吸收，还原时再拉回原尺寸。
 */
export const IMAGE_MEAN = [0.485, 0.456, 0.406] as const
export const IMAGE_STD = [0.229, 0.224, 0.225] as const

/**
 * MODNet 的归一化常量：只做 (x/255 - 0.5) / 0.5，把像素映射到 [-1, 1]。
 * 抄自模型的 preprocessor_config.json（image_mean / image_std 均为 0.5）。
 */
export const MODNET_MEAN = [0.5, 0.5, 0.5] as const
export const MODNET_STD = [0.5, 0.5, 0.5] as const

/**
 * 抠图模型注册表。
 *
 * 与放大模型不同，抠图权重不随仓库发布 —— 单个体积在 24 MB 到 452 MB 之间，
 * 远超静态托管能接受的范围。权重改为从 HuggingFace Hub 按固定 revision 拉取，
 * 并由 Cache Storage 缓存（见 modelCache.ts）。
 *
 * 固定 revision 很重要：权重地址是可变的，钉住 commit 才能保证今天跑通的模型
 * 明天还是同一个。升级模型 = 改这里的 revision 常量。
 *
 * 默认档特意选了体积最小的 MODNet：94 MB 的下载量对新用户是很高的门槛，
 * 而人像又是最高频的使用场景。代价是它为人像训练，抠非人像主体时会退化 ——
 * 这一点由 `scope` 标出来，UI 会据此提示用户切到高清档。
 *
 * 中文/英文说明与标签不写在这里 —— 见 i18n 的 cutoutModels，按 model.id 取用。
 */
export const CUTOUT_MODELS: CutoutModelSpec[] = [
  {
    id: 'modnet-portrait',
    label: 'MODNet',
    /**
     * fp16 与 fp32 都实测过：人像上几乎无差，物体上也都能用。
     *
     * **这份 fp16 权重实际不会被选中。** 这个模型标了 webgpuSafe: false
     * （见文件末尾），而 fp16 只在 WebGPU 后端有意义 —— 于是永远是 WASM 那份
     * fp32 的 24.7 MB。留在这里只是因为 variants 的类型要求两个后端都有条目，
     * 顺便记下这个模型确实存在一个 fp16 导出版（哪天 ORT 的 WebGPU 精度问题
     * 修好了，把 webgpuSafe 摘掉即可启用，不用再去找权重）。
     *
     * WASM 侧取 fp32 而非 fp16 是刻意的：fp16 在 WASM 上要靠 ORT 插转换节点，
     * 算子覆盖不如 WebGPU 完整，多下 12 MB 换「在任何设备上都必定建得起会话」，
     * 这笔账划算。
     *
     * 特意没用 6.3 MB 的 quantized 版本：实测它在人像上无损（前景占比
     * 66.6% vs 65.9%），但在物体上会崩（前景占比掉到 4.4%，过渡带比例
     * 从 0.179 飙到 0.476，抠出来是碎片）。而且它在 CPU 上比 fp32 还慢
     * （470ms vs 262ms）。用一半体积换「非人像彻底不能用」，不值。
     */
    variants: {
      webgpu: {
        url: 'https://huggingface.co/Xenova/modnet/resolve/fa2fa546052fba4c08921230a26cc69a333fca12/onnx/model_fp16.onnx',
        approxBytes: 12_984_781,
        dtype: 'fp16',
      },
      wasm: {
        url: 'https://huggingface.co/Xenova/modnet/resolve/fa2fa546052fba4c08921230a26cc69a333fca12/onnx/model.onnx',
        approxBytes: 25_888_640,
        dtype: 'fp32',
      },
    },
    /**
     * 短边 512 + 32 对齐。这两个数都是从模型的 preprocessor_config.json 抄的
     * （size.shortest_edge=512、size_divisibility=32），并且实测验证过：
     * 672 / 544 这类 32 的倍数能跑通，516 / 656 / 528 全部在 Concat 节点报
     * 「Axis 3 has mismatched dimensions」—— 16 的倍数都不行。
     */
    preprocess: {
      mode: 'aspect',
      edge: 512,
      divisibility: 32,
      mean: MODNET_MEAN,
      std: MODNET_STD,
    },
    inputName: 'input',
    outputName: 'output',
    /** 导出里已经带了 sigmoid —— 实测输出值域就是 [0,1]，再激活一次会毁掉边缘。 */
    outputIsLogits: false,
    license: 'Apache-2.0',
    scope: 'portrait',
    /**
     * MODNet 不能交给 WebGPU。实测它在 WebGPU 上跑完不报错、张量形状也对，
     * 但前景占比只有 35.9%，而 WASM 是 47.4%（用 Python + CPU 复核同为
     * 47.4%）—— 主体边缘被啃掉一大片，背景纹理还会碎成斑块。
     *
     * 换 fp32 权重救不了：WebGPU 上跑 fp32 得到 35.90%，与 fp16 的 35.85%
     * 几乎相同，说明损失来自 WebGPU EP 的半精度执行路径，与权重精度无关。
     * 同一次实测里 BiRefNet 在两个后端都给出 47.08%，所以也不是 WebGPU
     * 整体不可用，而是这个模型踩到了精度敏感的算子。
     */
    webgpuSafe: false,
  },
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
    preprocess: {
      mode: 'square',
      edge: 512,
      divisibility: 1,
      mean: IMAGE_MEAN,
      std: IMAGE_STD,
    },
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
    scope: 'general',
  },
  {
    id: 'birefnet-512',
    label: 'BiRefNet',
    /**
     * 两个后端共用同一份权重：这个导出只有 fp16，且在 WASM 上也能跑（ORT 会
     * 插转换节点），只是慢。
     *
     * 这里用的是 **钉住的 commit** 而不是 `main`。理由写在文件头：HF 的地址是
     * 可变的，`main` 今天和明天可能指向两份不同的文件（也可能某天直接消失），
     * 而这一档只会在「设备没有 WebGPU」这种少见情况下被拉起来 —— 恰恰是最难
     * 复现的场景，更不能让它悄悄变。
     */
    variants: {
      webgpu: {
        url: 'https://huggingface.co/naddy24/birefnet-512-webgpu/resolve/ca02a86c094927479e2be583abe87f8ea73fcfda/onnx/model_fp16.onnx',
        approxBytes: 473_435_223,
        dtype: 'fp16',
      },
      wasm: {
        url: 'https://huggingface.co/naddy24/birefnet-512-webgpu/resolve/ca02a86c094927479e2be583abe87f8ea73fcfda/onnx/model_fp16.onnx',
        approxBytes: 473_435_223,
        dtype: 'fp16',
      },
    },
    preprocess: {
      mode: 'square',
      edge: 512,
      divisibility: 1,
      mean: IMAGE_MEAN,
      std: IMAGE_STD,
    },
    inputName: 'input_image',
    /** 与 lite 版同为 `output_image`，只有这一个输出。 */
    outputName: 'output_image',
    outputIsLogits: true,
    license: 'MIT',
    scope: 'general',
  },
]

export const DEFAULT_CUTOUT_MODEL_ID = CUTOUT_MODELS[0]!.id

export function getCutoutModel(id: string): CutoutModelSpec {
  return CUTOUT_MODELS.find((model) => model.id === id) ?? CUTOUT_MODELS[0]!
}

