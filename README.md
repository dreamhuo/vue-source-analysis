
# vue-source-analysis
vue源码分析

最近在看vue源码，网上教程是很多，由于篇幅所限涉及细节太少。

这里是vue所有源码，每次提交针对一个问题去找实现代码，相对于网上大神的源码分析，我这里针对关键位置尽可能详细的注释，争取让小白也能看得懂。
大家可以结合：前滴滴前端负责人黄轶的Vue.js 技术揭秘

https://ustbhuangyi.github.io/vue-analysis/

对照着去看，定能让你收益非浅。欢迎加我QQ：631989611 一同探讨
这里前置知识：

**Vue.js 的源码都在 src 目录下，其目录结构如下。**

```javascript
    src
    ├── compiler        # 编译相关
    ├── core              # 核心代码
    ├── platforms       # 不同平台的支持
    ├── server           # 服务端渲染
    ├── sfc                # .vue 文件解析
    ├── shared          # 共享代码

```

```
**如果对你有帮助，欢迎打赏，感谢你对我的一点点肯定，将继续努力**
```

![微信捐助](https://github.com/dreamhuo/vue-source-analysis/blob/master/img/wx.jpg)


**Vue.js 生命周期**

![Vue.js 生命周期](https://github.com/dreamhuo/vue-source-analysis/blob/master/img/lifecycle.jpg)

**watch实现**

![watch实现](https://github.com/dreamhuo/vue-source-analysis/blob/master/img/observer.jpg)

**vuex实现**

![vuex实现](https://github.com/dreamhuo/vue-source-analysis/blob/master/img/vuex.jpg)



