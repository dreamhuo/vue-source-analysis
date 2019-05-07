/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  computed: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  dep: Dep;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,                                     // vm实例
    expOrFn: string | Function,                        // 最终做为 watcher 的 getter    updateComponent
    cb: Function,                                      // 回调函数
    options?: ?Object,                                 // 配置对象 渲染函数时 有 before 函数
    isRenderWatcher?: boolean                          // 是否是渲染 watch
  ) {
    this.vm = vm
    // 若是 渲染 watcher 把 this 缓存在 vm._watcher 上
    if (isRenderWatcher) {
      vm._watcher = this
    }
    // push 进 _watchers 数组
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep                         // 用户定义 watch 深层遍历监听数据变化
      this.user = !!options.user                         // 是否是 user watch
      this.computed = !!options.computed                 // 是否是 computed watch
      this.sync = !!options.sync                         // 同步
      this.before = options.before                        // 这里是 before 函数，里面执行了 callHook(vm, 'beforeUpdate') 钩子
    } else {
      this.deep = this.user = this.computed = this.sync = false       // 如果没有转入，统一置为 false
    }
    this.cb = cb
    this.id = ++uid                                        // 这很重要，自增的，用于标识这个 watcher, 默认为 0，++在前面，第一个为1
    this.active = true                                     // 标识当前为 活动watch
    this.dirty = this.computed                             // 为 computed watchers 特有属性

    // Set对象是值的集合，你可以按照插入的顺序迭代它的元素, Set 中的元素是唯一的
    // Set.prototype.size         返回Set对象的值的个数
    // Set.prototype.add(value)   在Set对象尾部添加一个元素。返回该Set对象
    // Set.prototype.clear()      移除Set对象内的所有元素。
    // Set.prototype.has(value)   返回一个布尔值，表示该值在Set中存在与否
    // Set.prototype.delete(value) 移除Set的中与这个值相等的元素
    // 用forEach迭代
    // mySet.forEach(function(value) {
    //   console.log(value);
    // });
    this.depIds = new Set()              // 用于在更新时，缓存依赖ID
    this.deps = []

    this.newDepIds = new Set()
    this.newDeps = []

    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
      // 当是在render Watchers 时为     updateComponent = () => {
      //                                   vm._update(vm._render(), hydrating)
      //                               }
    } else {
      this.getter = parsePath(expOrFn)         // 当为 computed watchers 时，他通过 parsePath 转换为函数。传入字符串，通过parsePath获取data上的值
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    if (this.computed) {
      this.value = undefined
      this.dep = new Dep()
    } else {
      this.value = this.get()
    }
  }

  /**
   * Watcher的构造函数最终调用了 get 方法
   */
  get () {
    // 将当前 Watcher 实例传递给 Dep 的 Dep.target。
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 执行 Watcher 所监测的数据的 getter 方法。 也就是执行 updateComponent
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      // ** 将 Dep.target 恢复到上一个值
      popTarget()
      // 将当前 Watcher 从 Dep 的 subs 中去除
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * 清理依赖项集合
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.computed) {
      // A computed property watcher has two modes: lazy and activated.
      // It initializes as lazy by default, and only becomes activated when
      // it is depended on by at least one subscriber, which is typically
      // another computed property or a component's render function.
      if (this.dep.subs.length === 0) {
        // In lazy mode, we don't want to perform computations until necessary,
        // so we simply mark the watcher as dirty. The actual computation is
        // performed just-in-time in this.evaluate() when the computed property
        // is accessed.
        this.dirty = true
      } else {
        // In activated mode, we want to proactively perform the computation
        // but only notify our subscribers when the value has indeed changed.
        this.getAndInvoke(() => {
          this.dep.notify()
        })
      }
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    // 销毁 组件时，先把 active 置为 false,
    if (this.active) {
      // 把回调转给 getAndInvoke 执行
      this.getAndInvoke(this.cb)
    }
  }

  getAndInvoke (cb: Function) {
    // 先通过 get 方法求值
    // 如果求值不一样 或者 value 是一个对象 或者 deep watcher 的话
    const value = this.get()
    if (
      value !== this.value ||
      isObject(value) ||
      this.deep
    ) {
      // set new value
      const oldValue = this.value
      this.value = value
      this.dirty = false
      // 如果是 user watcher
      if (this.user) {
        try {
          cb.call(this.vm, value, oldValue)
        } catch (e) {
          handleError(e, this.vm, `callback for watcher "${this.expression}"`)
        }
      } else {
        // **这里的 cb 回调函数传递的参数就是 value 和 oldValue。
        cb.call(this.vm, value, oldValue)
      }
    }
  }

  /**
   * Evaluate and return the value of the watcher.
   * This only gets called for computed property watchers.
   */
  evaluate () {
    if (this.dirty) {
      this.value = this.get()
      this.dirty = false
    }
    return this.value
  }

  /**
   * Depend on this watcher. Only for computed property watchers.
   */
  depend () {
    if (this.dep && Dep.target) {
      this.dep.depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
