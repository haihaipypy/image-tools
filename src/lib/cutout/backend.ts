/**
 * 抠图侧的设备能力探测入口。
 *
 * 复用放大流水线的 `probeCapabilities` —— WebGPU 有没有、WASM 能不能多线程，
 * 是**设备**的属性而不是模型的属性，两个工具各探一次只会让结果可能不一致
 * （比如用户在放大页拿到 webgpu=true，切到抠图页又变 false）。
 * 那边已经是 memo 的，这里转发即可。
 */
export { probeCapabilities } from '../upscaler/backend'
