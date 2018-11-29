/* @flow */

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

/**
 * 如果传入的不是一个dom节点，则通过query查询
 * el是字符串或为dom节点
 */
export function query (el: string | Element): Element {
  // 如果传入的el为字符串，则通过document.querySelector找这个dom节点
  if (typeof el === 'string') {
    const selected = document.querySelector(el)
    // 如果没找到传入的dom节点，则抛出警告，并通过document.createElement创建一个DIV返回
    if (!selected) {
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      return document.createElement('div')
    }
    // 找到了就返回这个dom节点
    return selected
  } else {
    // 如果是dom节点，则直接返回
    return el
  }
}
