/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    // remove 方法删除数组 this.subs 中 sub 元素
    remove(this.subs, sub)
  }
  // **在 depend 方法中，Dep.target 就是一个 Watcher 实例，
  // **它的 addDep 方法最终会调用到 Dep 的 addSubs 方法。subs 是 Watcher 数组。即将当前 watcher 存到 Dep 的 subs 数组中
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
  // 在 notify 方法中，将 Watcher 数组 subs 遍历，执行他们的 update 方法。update 最终会去执行 watcher 的回调函数。
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    // 遍历所有 watch 执行 watch 的 update 方法
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []      // targetStack 数组用于缓存 Watch 队列

// pushTarget 函数,将当前 Watch 缓存到 targetStack; 将即将要执行的 watch 附值到 Dep.target 上
export function pushTarget (_target: ?Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

// 将 上一个执行的 watch 从 targetStack 数组中拿出，置到 Dep.target 上
export function popTarget () {
  Dep.target = targetStack.pop()
}
