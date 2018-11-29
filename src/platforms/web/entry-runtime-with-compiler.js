/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

// 这里是把innerHTML做了缓存到 query(id) 上
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
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
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
