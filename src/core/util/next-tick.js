/* @flow */
/* globals MessageChannel */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIOS, isNative } from './env'

const callbacks = []             // 回调函数数组
let pending = false              // pending状态，是否正在执行的flag

function flushCallbacks () {     // 执行下一个回调
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// microtasks 和 (macro) tasks 是异步延迟的包裹函数，2.4版本之前只用 microtasks，但因为其在一些
// 情况下优先级过高，且可能在一些连续事件中触发，甚至是同一事件的冒泡间触发。然而都用(macro)
// task在state在重绘前改变也会存在一些问题。所以默认使用microtask，但也会再需要时强制改变为
// (macro) task
let microTimerFunc
let macroTimerFunc
let useMacroTask = false

// 定义(macro) task的延迟实现，setImmediate是最优选，但只在IE中可用。所以在同一循环中所有DOM
// 事件触发后，要把回调推进同一队列中则使用MessageChannel
/* istanbul ignore if */
// 判断 浏览器是否支持 setImmediate
if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  macroTimerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else if (typeof MessageChannel !== 'undefined' && ( // 其次使用MessageChannel
  isNative(MessageChannel) ||
  // PhantomJS
  MessageChannel.toString() === '[object MessageChannelConstructor]'
)) {
  const channel = new MessageChannel()
  const port = channel.port2
  channel.port1.onmessage = flushCallbacks
  macroTimerFunc = () => {
    port.postMessage(1)
  }
} else { // 最后考虑使用setTimeout
  /* istanbul ignore next */
  macroTimerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

// Determine microtask defer implementation.
// 定义microtask延迟的实现
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  microTimerFunc = () => {
    p.then(flushCallbacks)
    // 在一些有问题的UIWebview中，Promise.then没有完全中断，但它可能卡在一个状态：我已经将回调
    // 推进队列中但这个队列并没有刷新。直到浏览器做一些其他工作，例如处理一个计时器。所以需要
    // 手动调用一个空的计数器来“强制”刷新队列
    if (isIOS) setTimeout(noop)
  }
} else { // 否则使用macroTimerFunc()
  // fallback to macro
  microTimerFunc = macroTimerFunc
}

/**
 * Wrap a function so that if any code inside triggers state change,
 * the changes are queued using a (macro) task instead of a microtask.
 */
export function withMacroTask (fn: Function): Function {
  return fn._withTask || (fn._withTask = function () {
    useMacroTask = true
    const res = fn.apply(null, arguments)
    useMacroTask = false
    return res
  })
}

// vue源码中的nexttick接收两个参数，要延迟执行的回调函数（callback），和执行该函数的指定上下文
// (context),如果没有上下文参数，则会默认为全局上下文。
export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  callbacks.push(() => { // 将回调函数转为数组来遍历执行
    if (cb) { // 有回调则执行
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  if (!pending) { // 如果当前没有执行回调则执行
    pending = true
    if (useMacroTask) { // 默认优先使用microTimerFunc()
      macroTimerFunc()
    } else {
      microTimerFunc()
    }
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    // 如果么有回调，且支持promise，返回promise的resolve函数
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
