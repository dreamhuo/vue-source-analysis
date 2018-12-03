/* @flow */

// node节点操作方法
import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
// baseModules返回一个数组   ref, directives更新操作工具方法
import baseModules from 'core/vdom/modules/index'
// platformModules返回一个数组， 定义了 attrs, klass, events, domProps, style, transition 的更新操作工具方法
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
// 合并所有DOM操作工具模块
const modules = platformModules.concat(baseModules)

// 函数createPatchFunction内会返回一个patch函数
// patch函数接收4个参数
// return function patch (oldVnode, vnode, hydrating, removeOnly)
export const patch: Function = createPatchFunction({ nodeOps, modules })
