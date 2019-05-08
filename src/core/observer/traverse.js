/* @flow */

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

// seenObjects 对象做为一个深层依赖收集的临时存储
// 标识是否经过依赖收集
const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
export function traverse (val: any) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}

function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  const isA = Array.isArray(val)
  // 如果不是数组、不是对象、不可扩展、或是 vnode 直接 return
  // Object.isFrozen()方法判断一个对象是否被冻结。
  // 一个对象是冻结的是指它不可扩展，所有属性都是不可配置的，且所有数据属性（即没有getter或setter组件的访问器的属性）都是不可写的
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  // 如果有 __ob__ 属性，则表示是一个响应式对象
  if (val.__ob__) {
    // 获取到 depId 判断 seenObjects 就否 has, 有则直接返回，没有则 add 进去
    const depId = val.__ob__.dep.id
    // 已经经过依赖收集就不再进行依赖收集
    if (seen.has(depId)) {
      return
    }
    // 没有经过依赖收集再进行依赖收集
    seen.add(depId)
  }
  // 如果是数组循环数组，若是对象遍历对象
  // 再调用 _traverse 获取到 depId add进 seenObjects
  if (isA) {
    i = val.length
    // 这里调用 val[i] 其实触发了对象的 get 方法
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    // 这里调用 val[i] 其实触发了对象的 get 方法
    while (i--) _traverse(val[keys[i]], seen)
  }
}
