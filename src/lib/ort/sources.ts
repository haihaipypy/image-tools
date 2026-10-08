/**
 * 权重下载源的兜底。
 *
 * 抠图与点选抠图的权重全部挂在 huggingface.co 上，而这个域名在国内**直连不上**
 * —— DNS 拿回的是被污染的结果，连接在看到响应之前就断了，浏览器侧表现为
 * `fetch` 一直挂着直到超时。对一个中文用户为主的纯前端工具来说这是硬伤：图片
 * 处理本身完全在本机跑，却卡在第一步下不动模型，而用户看到的只是「下载失败」。
 *
 * 所以每个 huggingface.co 地址都配一份镜像地址，依次尝试。镜像站是反向代理，
 * 仓库路径与官方 1:1 对齐，**换域名即可**，不必为每个模型单独维护一份映射 ——
 * 也就不会出现「加了个新模型忘了配镜像」这种漏。
 *
 * 顺序上镜像在前：
 *   - 国内用户：镜像往往是唯一连得上的源，放前面直接命中；
 *   - 海外用户：镜像会 308 跳回 huggingface.co，只是多一次往返（fetch 默认
 *     跟随重定向），照样能下下来；
 *   - 镜像本身挂了：等一次超时后落到官方源，并把官方源记成「上次成功的源」，
 *     同一次会话里后面的文件不再重复踩这个坑。
 *
 * 只改写 huggingface.co 上的地址。仓库自带的模型（`/models/...`）原样返回 ——
 * 它们跟着站点一起部署，没有网络可达性问题。
 */
const OFFICIAL = 'https://huggingface.co'

/** 镜像站，按优先级排列。路径结构与官方一致，直接换域名。 */
const MIRRORS = ['https://hf-mirror.com']

/** 尝试顺序：镜像优先，官方兜底。 */
const HOSTS: readonly string[] = [...MIRRORS, OFFICIAL]

/** 记住上次成功用哪个源的 localStorage 键。 */
const PREF_KEY = 'image-tools:model-host'

/**
 * 上一次真正下成功的 host。
 *
 * 存在意义：点选抠图要下编码器和解码器两个文件，如果第一个文件是靠兜底成功
 * 的，第二个文件没必要再从那个连不上的源重来一遍。
 *
 * 跨会话落在 localStorage 里。这一步比听起来重要 —— 每个不可用源的代价不是
 * 一次失败往返，而是实打实等到 HEADER_TIMEOUT_MS 才放弃，一个源一轮就是
 * 十秒。回访用户不该每次都先替代码缴这笔学费。
 *
 * localStorage 在隐私模式下会直接抛异常，读写都包了 try；读不出来就当作没
 * 记过，回退到默认顺序。
 */
let lastGoodHost: string | null = readPreferredHost()

function readPreferredHost(): string | null {
  try {
    const saved = window.localStorage.getItem(PREF_KEY)
    // 只认自己列出的源：万一存储被人手改成别的域名，也不能拿来当候选。
    return saved && HOSTS.includes(saved) ? saved : null
  } catch {
    return null
  }
}

/** 展开成一个模型地址实际要依次尝试的地址列表。 */
export function modelSourceCandidates(url: string): string[] {
  if (!url.startsWith(`${OFFICIAL}/`)) return [url]

  const path = url.slice(OFFICIAL.length)
  const ordered = lastGoodHost
    ? [lastGoodHost, ...HOSTS.filter((host) => host !== lastGoodHost)]
    : HOSTS

  return ordered.map((host) => `${host}${path}`)
}

/** 记下这次是从哪个 host 下成功的，同一会话里后续文件优先走它。 */
export function rememberModelHost(url: string): void {
  let origin: string
  try {
    origin = new URL(url).origin
  } catch {
    return
  }
  // 只记我们自己列出来的源，别把某个 CDN 重定向后的域名当成候选。
  if (!HOSTS.includes(origin)) return
  if (lastGoodHost === origin) return

  lastGoodHost = origin
  try {
    window.localStorage.setItem(PREF_KEY, origin)
  } catch {
    // 隐私模式下写不进去。下次重按顺序试一遍而已，不影响正确性。
  }
}

/** 清掉「上次成功的源」。给调试和测试用。 */
export function resetModelHostPreference(): void {
  lastGoodHost = null
  try {
    window.localStorage.removeItem(PREF_KEY)
  } catch {
    // 同上。
  }
}
