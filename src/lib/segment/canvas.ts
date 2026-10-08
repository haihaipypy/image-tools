/**
 * 画布小工具。
 *
 * 抠图那边两份各自实现过一模一样的 makeCanvas，连带把同一个类型问题复制了
 * 两份 —— 详见 canvas2d 的注释。合到一处，两边共用。
 */
import { SegmentError } from './errors'

/**
 * 优先用 OffscreenCanvas：它不在 DOM 里，主线程不必为一张一次性中间画布走
 * 一遍布局。不支持时退回普通 canvas。
 */
export function makeCanvas(
  width: number,
  height: number,
): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/**
 * 取 2D 上下文。
 *
 * 不能对着 `OffscreenCanvas | HTMLCanvasElement` 这个联合直接调 getContext ——
 * TS 会把返回值解析成 `OffscreenCanvasRenderingContext2D | RenderingContext`，
 * 而 RenderingContext 是座空接口，后面每用一个方法都要报错一次。
 *
 * 两种 2D 上下文在我们用到的部分完全重合（读写像素、drawImage、合成模式、
 * 填充色），所以这里统一按 2D 上下文看待。
 */
export function canvas2d(
  canvas: OffscreenCanvas | HTMLCanvasElement,
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new SegmentError('canvas-context-failed')
  return ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
}
