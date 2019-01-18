/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

// 全局变量定义
const queue: Array<Watcher> = []                            // watcher 数组
const activatedChildren: Array<Component> = []              // 激活的 children
let has: { [key: number]: ?true } = {}                      // 判断 watcher 是否重复添加
let circular: { [key: number]: number } = {}                // 循环更新用的
let waiting = false                                         // 标识位
let flushing = false                                        // 标识位 是否在刷队列
let index = 0                                               // 当前 watcher 的索引

/**
 * 重置 scheduler 的状态
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

/**
 * 遍历 queue 队列，执行 watcher
 */
function flushSchedulerQueue () {
  flushing = true
  let watcher, id

  // 1. 组件的更新是从父到子的，组件创建也先从父再到子；所以要保证父的 watcher 在前面，子的watcher在后面
  // 2. 当用户定义一个组件对象写一个 watcher 属性时，实际上就创建一个 user watcher
  //    或者在代码中执行 $watcher 时，与会创建一个 user watcher;
  //    user watcher 是在 渲染 watcher 之前的，所以要放前面
  // 3. 当我们的组件销毁是在我们父组件的 watcher 中回调中执行的时候，那子组件就不用再执行了应该被跳过，他也应该从小到大排列
  // 把 queue 从小到大排序
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (index = 0; index < queue.length; index++) {
    // 拿到每一个 watcher
    watcher = queue[index]
    // 执行 before 函数
    if (watcher.before) {
      watcher.before()
    }
    // 拿到 id, 把 has[id] 置为 null
    id = watcher.id
    has[id] = null
    // 执行 watcher.run() 执行 回调，之后会再执行 queueWatcher 所以，会可能产生无限循环的情况
    watcher.run()
    // 判断有没有无限循环更新的状况
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  resetSchedulerState()

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // 给开发工具用的
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

// Watcher.update会调用queueWatcher再调flushSchedulerQueue再调callUpdatedHooks
// 最终执行callHook(vm, 'updated')生命周期钩子
// vm._watcher 的回调执行完毕后，才会执行 updated 钩子函数。
function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    // 这里会判断 _watcher 是否是渲染 watcher, 并且 _isMounted 后 才执行 updated 钩子
    if (vm._watcher === watcher && vm._isMounted) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id                  // id 是自增的
  if (has[id] == null) {                 // has[id] 为 null, 表示不在这里面
    has[id] = true                       // 进去后标识为 true
    // 若不在刷队列，则 把 watcher push 进 queue
    if (!flushing) {
      queue.push(watcher)
    } else {
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }
    // 异步执行 waiting 才去执行 flushSchedulerQueue
    if (!waiting) {
      waiting = true
      if (process.env.NODE_ENV !== 'production' && !config.async) {
        flushSchedulerQueue()
        return
      }
      nextTick(flushSchedulerQueue)
    }
  }
}
