<p align="center">
    <img height="300" src="https://user-images.githubusercontent.com/19204772/128877547-19a75852-ffda-4936-9322-88591d39ef33.jpg" />
</p>


# Reactive 响应式

> 借鉴 vue3 响应式 api 实现。

## 如何使用？

将 `Reactivity.ts` 文件复制到你需要的项目中。



## 示例：

### reactive 和 effect 方法:

#### object:

```typescript
import  { reactive, effect } from './Reactivity'

// 创建响应式对象
const counter = reactive({ num1: 1, num2: 2 })

// 注册响应方法，其内部引用的响应式对象值变化时会重新执行次方法
effect(() => {
    console.log(counter.num1 + counter.num2)
}) // echo: 3

counter.num1 = 10 // echo: 12

counter.num2 = 5 // echo: 15

```

#### array:

```typescript
import  { reactive, effect } from './Reactivity'

let dummy
// 创建响应式对象
const list = reactive(['Hello'])
// 注册响应方法，其内部引用的响应式对象值变化时会重新执行次方法
effect(() => (dummy = list.join(' ')))

console.log(dummy) // echo: Hello

list.push('World!')
console.log(dummy) // echo: Hello World!

list.shift()
console.log(dummy) // echo: World!

```

### ref 和 computed 方法：

```typescript
import  { ref, computed } from './Reactivity'
// 创建基础类型的响应式引用
const num1 = ref(1)
const num2 = ref(1)

// 创建计算函数。计算函数将像 effect 一样监听响应式对象的变化，并将方法返回值创建为响应式引用：“ref” 后传入一个变量中
const numAnd = computed(() => num1.value + num2.value)

console.log('numAnd:', numAnd.value) // echo: numAnd: 2

num1.value = 2
console.log('numAnd:', numAnd.value) // echo: numAnd: 3

num1.value = 10
console.log('numAnd:', numAnd.value) // echo: numAnd: 11
```



*可以使用 isReactive 和 isRef 判断对象是否为响应式对象*



> 暂不支持创建 Map, Set, WeakMap, WeakSet 类型的响应式对象

