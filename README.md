# Reactive 响应式

> 借鉴 vue3 响应式 api 实现。

## 如何使用？

将 `Reactive.ts` 文件复制到你需要的项目中。



## 示例：

### reactive 和 effect 方法:

#### object:

```typescript
import  { reactive, effect } from './Reactive'

const counter = reactive({ num1: 1, num2: 2 })
effect(() => {
    console.log(counter.num1 + counter.num2)
}) // echo: 3

counter.num1 = 10 // echo: 12

counter.num2 = 5 // echo: 15

```

#### array:

```typescript
import  { reactive, effect } from './Reactive'

let dummy
const list = reactive(['Hello'])
effect(() => (dummy = list.join(' ')))

console.log(dummy) // echo: Hello

list.push('World!')
console.log(dummy) // echo: Hello World!

list.shift()
console.log(dummy) // echo: World!

```

### ref 和 computed 方法：

```typescript
const num1 = ref(1)
const num2 = ref(1)
const numAnd = computed(() => num1.value + num2.value)
console.log('numAnd:', numAnd.value) // echo: numAnd: 2
num1.value = 2
console.log('numAnd:', numAnd.value) // echo: numAnd: 3
num1.value = 10
console.log('numAnd:', numAnd.value) // echo: numAnd: 11
```



*可以使用 isReactive 和 isRef 判断对象是否为响应式对象*

