/* @flow */

import { remove, isDef } from 'shared/util'

export default {
  create (_: any, vnode: VNodeWithData) {
    registerRef(vnode)
  },
  update (oldVnode: VNodeWithData, vnode: VNodeWithData) {
    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true)
      registerRef(vnode)
    }
  },
  destroy (vnode: VNodeWithData) {
    registerRef(vnode, true)
  }
}

export function registerRef (vnode: VNodeWithData, isRemoval: ?boolean) {
  // vnode 里没有 ref 直接 return 什么也不做
  const key = vnode.data.ref
  if (!isDef(key)) return
  // vm 实例
  const vm = vnode.context
  const ref = vnode.componentInstance || vnode.elm   // vnode.componentInstancef对应组件的真实 DOM 节点 ；  vnode.elm 当前 vnode 节点对应的真实DOM节点
  // 获取当前 vm.$refs
  const refs = vm.$refs
  // isRemoval 为 true 即在 vm.$refs 上移除
  if (isRemoval) {
    if (Array.isArray(refs[key])) {
      remove(refs[key], ref)
    } else if (refs[key] === ref) {
      refs[key] = undefined
    }
  } else {
    // refInFor 是编译时加上的
    // 将 ref 加到 vm.$refs 上
    if (vnode.data.refInFor) {
      if (!Array.isArray(refs[key])) {
        refs[key] = [ref]
      } else if (refs[key].indexOf(ref) < 0) {
        // $flow-disable-line
        refs[key].push(ref)
      }
    } else {
      refs[key] = ref
    }
  }
}
