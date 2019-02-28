import { inBrowser } from './env'
// inBrowser 通过判断是否存在 window 来判断是否在浏览器环境
// export const inBrowser = typeof window !== 'undefined'

export let mark
export let measure

// performance方法封装，mark创建性能标记点
// measure计算两个性能标记点的耗时
if (process.env.NODE_ENV !== 'production') {
  const perf = inBrowser && window.performance
  /* istanbul ignore if */
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    mark = tag => perf.mark(tag)                           // 记录时刻间隔的毫秒数
    measure = (name, startTag, endTag) => {
      perf.measure(name, startTag, endTag)                // 记录两个标记的时间间隔
      perf.clearMarks(startTag)                           // 清除开始标记和结束标记
      perf.clearMarks(endTag)
      perf.clearMeasures(name)                            // 清除指定记录间隔数据
    }
  }
}
