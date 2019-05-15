/* @flow */
// emptyNode创建一个空的 vnode
// export const emptyNode = new VNode('', {}, [])
import { emptyNode } from 'core/vdom/patch'
import { resolveAsset, handleError } from 'core/util/index'
import { mergeVNodeHook } from 'core/vdom/helpers/index'

// 这里 抛出指令 create、 update、 destroy方法
// 都统一调用 updateDirectives 方法
// 这里 destroy方法，通过 unbindDirectives 方法对 updateDirectives 方法又包了一层
// 这样让 destroy 只接一个参数
export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode: VNodeWithData) {
    updateDirectives(vnode, emptyNode)
  }
}

// updateDirectives方法封装了 _update 方法
// 使用Vue.directive(id,definition)注册全局自定义指令
function updateDirectives (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 这里有 directives 属性，调用 _update(oldVnode, vnode) 方法
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode)
  }
}

function _update (oldVnode, vnode) {
  // 老 vnode 为 emptyNode，则 isCreate 为 true 标识当前为创建节点
  const isCreate = oldVnode === emptyNode
  // 新 vnode 为 emptyNode, 则 isDestroy 为 true 标识当前销毁节点
  const isDestroy = vnode === emptyNode
  // normalizeDirectives 标准化指令，
// 主要把每个指令 name 初始化成 实际用的指令，并把修饰符加到 name 后面
  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context)
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)

  const dirsWithInsert = []
  const dirsWithPostpatch = []

  let key, oldDir, dir
  // 徇环新的 指令集，
  for (key in newDirs) {
    oldDir = oldDirs[key]
    dir = newDirs[key]
    // 是否有老的指令集，没有则是新增，有则是更新
    if (!oldDir) {
      // 如果老的指令没有，则调用 bind 钩子
      // new directive, bind
      callHook(dir, 'bind', vnode, oldVnode)
      // 在 指令上有 inserted 方法，push进 dirsWithInsert
      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir)
      }
    } else {
      // 调用 update 方法
      // existing directive, update
      dir.oldValue = oldDir.value
      callHook(dir, 'update', vnode, oldVnode)
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir)
      }
    }
  }

  // 插入事件方法在这里执行
  if (dirsWithInsert.length) {
    // 把所有的指令集的 inserted 钩子函数放到一个数组里
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    if (isCreate) {
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      callInsert()
    }
  }

  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }

  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}

const emptyModifiers = Object.create(null)

// normalizeDirectives 标准化指令，
// 主要把每个指令 name 初始化成 实际用的指令，并把修饰符加到 name 后面
// 第一个参数：指令数组
// 第二个参数：vm 实例
function normalizeDirectives (
  dirs: ?Array<VNodeDirective>,
  vm: Component
): { [key: string]: VNodeDirective } {
  // 创建一个空对象
  const res = Object.create(null)
  // 如果指令数组为空则直接返回空数组
  if (!dirs) {
    // $flow-disable-line
    return res
  }
  let i, dir
  // 循环指令数组
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i]
    // 判断是否有修饰符，没有则符一个空对象到修饰符上
    if (!dir.modifiers) {
      // $flow-disable-line
      dir.modifiers = emptyModifiers
    }
    res[getRawDirName(dir)] = dir
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true)
  }
  // 返回处理好的指令
  return res
}

// 获取新处理的指令名
function getRawDirName (dir: VNodeDirective): string {
  // 有 rawName 就直接返回，没有则用 name + '.' + 修饰符的形式返回
  return dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}`
}

function callHook (dir, hook, vnode, oldVnode, isDestroy) {
  const fn = dir.def && dir.def[hook]
  if (fn) {
    try {
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy)
    } catch (e) {
      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`)
    }
  }
}
