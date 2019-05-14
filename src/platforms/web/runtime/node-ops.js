/* @flow */

import { namespaceMap } from 'web/util/index'
// export const namespaceMap = {
//   svg: 'http://www.w3.org/2000/svg',
//   math: 'http://www.w3.org/1998/Math/MathML'
// }

// createElement() 方法通过指定名称创建一个元素
export function createElement (tagName: string, vnode: VNode): Element {
  const elm = document.createElement(tagName)
  // select 元素特殊处理，如果不是 select 则返回
  if (tagName !== 'select') {
    return elm
  }
  // 为 select 元素看是否可以 select 是否多选
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    // setAttribute() 方法创建或改变某个新属性
    elm.setAttribute('multiple', 'multiple')
  }
  return elm
}

// createElementNS() 方法可创建带有指定命名空间的元素节点。
// createElementNS() 方法与 createElement() 方法相似，
// 只是它创建的 Element 节点除了具有指定的名称外，还具有指定的命名空间。
// 只有使用命名空间的 XML 文档才会使用该方法。
export function createElementNS (namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName)
}

// createTextNode() 可创建文本节点。
export function createTextNode (text: string): Text {
  return document.createTextNode(text)
}

// createComment() 方法可创建注释节点
export function createComment (text: string): Comment {
  return document.createComment(text)
}

// insertBefore() 方法在您指定的已有子节点之前插入新的子节点。
// document.body.insertBefore(newp,second);
// 首先document.body是段落的父元素，insertBefore()里面有两个参数，
// 第一个参数表示要插入的节点，第二参数表示在哪个节点之前插入，
// 注意，第二个参数是可以为null 的，那么这个时候，只会在末尾插入节点了；
export function insertBefore (parentNode: Node, newNode: Node, referenceNode: Node) {
  parentNode.insertBefore(newNode, referenceNode)
}

// removeChild() 方法可从子节点列表中删除某个节点
// 如删除成功，此方法可返回被删除的节点，如失败，则返回 NULL。
export function removeChild (node: Node, child: Node) {
  node.removeChild(child)
}

// appendChild() 方法可向节点的子节点列表的末尾添加新的子节点。
// 如果文档树中已经存在了 newchild，它将从文档树中删除，然后重新插入它的新位置。
// 如果 newchild 是 DocumentFragment 节点，则不会直接插入它，而是把它的子节点按序插入当前节点的 childNodes[] 数组的末尾。
// 你可以使用 appendChild() 方法移除元素到另外一个元素。
export function appendChild (node: Node, child: Node) {
  node.appendChild(child)
}

// parentNode 属性可返回某节点的父节点。
// 如果指定的节点没有父节点则返回 null 。
export function parentNode (node: Node): ?Node {
  return node.parentNode
}

// nextSibling 属性可返回某个元素之后紧跟的节点（处于同一树层级中）。
// 返回节点以节点对象返回。
// 注意： 如果元素紧跟后面没有节点则返回 null.
export function nextSibling (node: Node): ?Node {
  return node.nextSibling
}

// tagName 属性返回元素的标签名。
// HTML 返回 tagName 属性的值是大写的。
export function tagName (node: Element): string {
  return node.tagName
}

// textContent 属性设置或返回指定节点的文本内容，以及它的所有后代。
// 如果您设置了 textContent 属性，会删除所有子节点，并被替换为包含指定字符串的一个单独的文本节点。
// 提示：有时，此属性可用于取代 nodeValue 属性，但是请记住此属性同时会返回所有子节点的文本。
export function setTextContent (node: Node, text: string) {
  node.textContent = text
}

// setAttribute() 方法创建或改变某个新属性
// 这里只创建一个占位属性，相当于一个命名空间
export function setStyleScope (node: Element, scopeId: string) {
  node.setAttribute(scopeId, '')
}
