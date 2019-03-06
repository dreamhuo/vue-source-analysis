/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  handleError,
  formatComponentName
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

// 初始化events，获取父级 listeners
export function initEvents (vm: Component) {
  // 清空 _events 数据
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  // 并初始化连接父级的事件
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: any

function add (event, fn, once) {
  if (once) {
    target.$once(event, fn)
  } else {
    target.$on(event, fn)
  }
}

function remove (event, fn) {
  target.$off(event, fn)
}

export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, vm)
  target = undefined
}

// events事件绑定
export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  // **监听当前实例上的自定义事件。事件可以由vm.$emit触发。回调函数会接收所有传入事件触发函数的额外参数。
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    // **如果 event 是数组则遍历执行 $on 方法
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        this.$on(event[i], fn)
      }
    } else {
      // **否则 向 vm._events[event] 中传递回调函数 fn，这里既然 vm._events[event] 是一个数组，那么我猜想一个 event 可以执行多个回调函数
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        // 如果是 event 字符串中有 hook:，修改 vm._hasHookEvent 的状态。如果 _hasHookEvent 为 true
        // 那么在触发各类生命周期钩子的时候会触发如 hook:created 事件
        vm._hasHookEvent = true
      }
    }
    return vm
  }
  // 监听一个自定义事件，但是只触发一次，在第一次触发之后移除监听器。
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    // 定义一个 $on 事件监听，回调函数中使用 $off 方法取消事件监听，并执行回调函数
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }
  // 移除自定义事件监听器。
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    // 如果没有提供参数，则移除所有的事件监听器；
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    // 如果只提供了事件，则移除该事件所有的监听器；
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        this.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    // 如果同时提供了事件与回调，则只移除这个回调的监听器。
    const cbs = vm._events[event]
    // 没有这个监听事件，直接返回vm
    if (!cbs) {
      return vm
    }
    // 没有 fn，将事件监听器变为null，返回vm
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // 有回调函数
    if (fn) {
      // specific handler
      let cb
      let i = cbs.length
      while (i--) {
        // cbs = vm._events[event] 是一个数组
        cb = cbs[i]
        if (cb === fn || cb.fn === fn) {
          // 移除 fn 这个事件监听器
          cbs.splice(i, 1)
          break
        }
      }
    }
    return vm
  }
  // 触发当前实例上的事件。附加参数都会传给监听器回调。
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    // **首先获取 vm._events[event] 数组
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      // arguments第0个参数为eventName，故从第1个参数转为数组，再通过apply传入
      const args = toArray(arguments, 1)
      // 从第二个参数开始获取作为触发方法的传参 args，遍历事件监听器数组传参执行回调函数
      for (let i = 0, l = cbs.length; i < l; i++) {
        try {
          cbs[i].apply(vm, args)
        } catch (e) {
          handleError(e, vm, `event handler for "${event}"`)
        }
      }
    }
    return vm
  }
}
