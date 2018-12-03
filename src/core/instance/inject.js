/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

export function initInjections (vm: Component) {
  // 获取依赖注入的方法对象，key对应函数或方法或属性
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    // toggleObserving只是加一个shouldObserve = value的标识
    toggleObserving(false)
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}

// 处理Inject
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    // 判断浏览器是否支持Symbol和Reflect，如果支持，则用Reflect.ownKeys获取key, 返回enumerable为true的key组成的数组
    // 否则通过Object.keys获取的key组成的数组
    const keys = hasSymbol
      ? Reflect.ownKeys(inject).filter(key => {
        /* istanbul ignore next */
        return Object.getOwnPropertyDescriptor(inject, key).enumerable
      })
      : Object.keys(inject)
    // 遍历 注入keys，
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // 注入的from指向依赖的key
      const provideKey = inject[key].from
      let source = vm
      while (source) {
        // 在_provided依赖中搜索注入的key.如果存在，则把依赖函数或方法或属于，绑定到注入上
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }
      // 没有$parent，即没有父级依赖
      // 这时从inject[key].default获取函数或方法或属于，再绑定到result[key]
      // 还是没有找到，则报一个错误提示
      if (!source) {
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
