/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

// 这里是把innerHTML做了缓存到 query(id) 上
// cached 是一个闭包函数，定义了一个 cache = Object.create(null) 对象用于缓存获取到的 innerHTML
// cached 接收一个箭头函数，箭头函数的参数为 id, 同时 cached 返回一个函数给 idToTemplate
// idToTemplate 也是一个函数，调用 idToTemplate 传入的值，就是 cached 返回的函数  cachedFn (str）的 str参数
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 这里先缓存 runtime 版本的$mount方法
// runtime的mount方法在import Vue from './runtime/index'中
const mount = Vue.prototype.$mount
// 重新定义$mount方法，为compiler版本使用
// $mount接收一个element参数
// hydrating用于服务器端渲染，默认为false
// 返回一个component组件
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 获取dom节点
  el = el && query(el)

  /* 判断dom节点不能挂载到body和html元素上，否则抛出警告信息 */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  // 缓存options对象
  const options = this.$options
  // 如果没有定义render函数，则通过解析 template/el 来生成render函数
  if (!options.render) {
    let template = options.template
    if (template) {
      if (typeof template === 'string') {
        // 若template为id，则通过调用idToTemplate获取html内容
        if (template.charAt(0) === '#') {
          // 如果 template 首字母 为 “#”号，那么以 template 为 dom id 去获取 innerHTML
          template = idToTemplate(template)
          /* istanbul ignore if */
          // 未获取到，则 template 为false, 这时报一个错误：
          // Template 元素未发现或者为空
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // 如果dom节点
        template = template.innerHTML
      } else {
        // 如果 template 即不是以 # 开头，又不是 dom 节点，提示 template 不合法
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 如果未定义 template，定义了 el, 则通过 getOuterHTML 拿到 dom 字符串
      // getOuterHTML 内做了兼容
      template = getOuterHTML(el)
    }
    // 获取到template开始编译
    if (template) {
      /* 编译性能锚点 */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      // 编译的入口
      const { render, staticRenderFns } = compileToFunctions(template, {
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      // 注意: 这里是通过template生成的render函数
      options.render = render
      // 注意：这里是静态render函数
      options.staticRenderFns = staticRenderFns

      /* 编译性能锚点 */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 开始挂载
  return mount.call(this, el, hydrating)
}

/**
 * 获取一个节点的DOM节点·
 * getOuterHTML 函数其实是对 outerHTML 函数做了兼容处理
 *
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
