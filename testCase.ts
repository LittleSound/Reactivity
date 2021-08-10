import  { reactive, effect, ref, computed } from './Reactive'
import { it, expect, specify, startTest } from './UnitTest'

// specify('name')

// 在 effect 执行将 observe 对基本类型赋值，observe 进行改变时，将反应到基本类型上
it('should observe basic properties', () => {
    let dummy
    const counter = reactive({ num: 0 })
    effect(() => (dummy = counter.num))
  
    expect(dummy).toBe(0)
    counter.num = 7
    expect(dummy).toBe(7)
  })
  // 同上，不过我们从这个单测就能看出来effect 中是有 cache 存在的
  it('should observe multiple properties', () => {
    let dummy
    const counter = reactive({ num1: 0, num2: 0 })
    effect(() => (dummy = counter.num1 + counter.num1 + counter.num2))
  
    expect(dummy).toBe(0)
    counter.num1 = counter.num2 = 7
    expect(dummy).toBe(21)
  })
  // 在多个 effect 中处理 observe，当 observe 发生改变时，将同步到多个 effect
  it('should handle multiple effects', () => {
    let dummy1, dummy2
    const counter = reactive({ num: 0 })
    effect(() => (dummy1 = counter.num))
    effect(() => (dummy2 = counter.num))
  
    expect(dummy1).toBe(0)
    expect(dummy2).toBe(0)
    counter.num++
    expect(dummy1).toBe(1)
    expect(dummy2).toBe(1)
  })
  // 嵌套的 observe 做出改变时，也会产生响应
  it('should observe nested properties', () => {
    let dummy
    const counter = reactive({ nested: { num: 0 } })
    effect(() => (dummy = counter.nested.num))
  
    expect(dummy).toBe(0)
    counter.nested.num = 8
    expect(dummy).toBe(8)
  })
  // 在 effect 执行将 observe 对基本类型赋值，observe 进行删除操作时，将反应到基本类型上
  it('should observe delete operations', () => {
    let dummy
    const obj = reactive({ prop: 'value' as any })
    effect(() => (dummy = obj.prop))
  
    expect(dummy).toBe('value')
    delete obj.prop
    expect(dummy).toBe(undefined)
  })
  // 在 effect 执行将 observe in 操作，observe 进行删除操作时，将反应到基本类型上
  it('should observe has operations', () => {
    let dummy
    const obj = reactive<{ prop: string | number | undefined }>({ prop: 'value' })
    effect(() => (dummy = 'prop' in obj))
  
    expect(dummy).toBe(true)
    delete obj.prop
    expect(dummy).toBe(false)
    obj.prop = 12
    expect(dummy).toBe(true)
  })
  // 对 prototype 的操作也能响应
  it('should observe properties on the prototype chain', () => {
    let dummy
    const counter = reactive({ num: 0 as number | undefined })
    const parentCounter = reactive({ num: 2 })
    Object.setPrototypeOf(counter, parentCounter)
    effect(() => (dummy = counter.num))
  
    expect(dummy).toBe(0)
    delete counter.num
    expect(dummy).toBe(2)
    parentCounter.num = 4
    expect(dummy).toBe(4)
    counter.num = 3
    expect(dummy).toBe(3)
  })
  // prototype test 2
  it('should observe inherited property accessors', () => {
    let dummy, parentDummy, hiddenValue: any
    const obj = reactive<{ prop?: number }>({})
    const parent = reactive({
      set prop(value) {
        hiddenValue = value
      },
      get prop() {
        return hiddenValue
      }
    })
    Object.setPrototypeOf(obj, parent)
    effect(() => (dummy = obj.prop))
    effect(() => (parentDummy = parent.prop))
  
    expect(dummy).toBe(undefined)
    expect(parentDummy).toBe(undefined)
    obj.prop = 4
    expect(dummy).toBe(4)
    // this doesn't work, should it?
    // expect(parentDummy).toBe(4)
    parent.prop = 2
    expect(dummy).toBe(2)
    expect(parentDummy).toBe(2)
  })
  // 对 function 的操作也能响应
  it('should observe function call chains', () => {
    let dummy
    const counter = reactive({ num: 0 })
    effect(() => (dummy = getNum()))
  
    function getNum() {
      return counter.num
    }
  
    expect(dummy).toBe(0)
    counter.num = 2
    expect(dummy).toBe(2)
  })
  
  it('should observe iteration', () => {
    let dummy
    const list = reactive(['Hello'])
    effect(() => (dummy = list.join(' ')))
  
    expect(dummy).toBe('Hello')
    list.push('World!')
    expect(dummy).toBe('Hello World!')
    list.shift()
    expect(dummy).toBe('World!')
  })
  
  it('should observe implicit array length changes', () => {
    let dummy
    const list = reactive(['Hello'])
    effect(() => (dummy = list.join(' ')))
  
    expect(dummy).toBe('Hello')
    list[1] = 'World!'
    expect(dummy).toBe('Hello World!')
    list[3] = 'Hello!'
    expect(dummy).toBe('Hello World!  Hello!')
  })
  
  it('should observe sparse array mutations', () => {
    let dummy
    const list = reactive<string[]>([])
    list[1] = 'World!'
    effect(() => (dummy = list.join(' ')))
  
    expect(dummy).toBe(' World!')
    list[0] = 'Hello'
    expect(dummy).toBe('Hello World!')
    list.pop()
    expect(dummy).toBe('Hello')
  })
  
  it('should observe enumeration', () => {
    let dummy = 0
    const numbers = reactive<Record<string, number>>({ num1: 3 })
    effect(() => {
      dummy = 0
      for (let key in numbers) {
        dummy += numbers[key]
      }
    })
  
    expect(dummy).toBe(3)
    numbers.num2 = 4
    expect(dummy).toBe(7)
    delete numbers.num1
    expect(dummy).toBe(4)
  })
  
  it('should observe symbol keyed properties', () => {
    const key = Symbol('symbol keyed prop')
    let dummy, hasDummy
    const obj = reactive({ [key]: 'value' as string | undefined })
    effect(() => (dummy = obj[key]))
    effect(() => (hasDummy = key in obj))
  
    expect(dummy).toBe('value')
    expect(hasDummy).toBe(true)
    obj[key] = 'newValue'
    expect(dummy).toBe('newValue')
    delete obj[key]
    expect(dummy).toBe(undefined)
    expect(hasDummy).toBe(false)
  })
  
  it('should not observe well-known symbol keyed properties', () => {
    const key = Symbol.isConcatSpreadable
    let dummy
    const array: any = reactive([])
    effect(() => (dummy = array[key]))
  
    expect(array[key]).toBe(undefined)
    expect(dummy).toBe(undefined)
    array[key] = true
    expect(array[key]).toBe(true)
    expect(dummy).toBe(undefined)
  })
  
  it('should observe function valued properties', () => {
    const oldFunc = () => {}
    const newFunc = () => {}
  
    let dummy
    const obj = reactive({ func: oldFunc })
    effect(() => (dummy = obj.func))
  
    expect(dummy).toBe(oldFunc)
    obj.func = newFunc
    expect(dummy).toBe(newFunc)
  })
  
  it('should observe chained getters relying on this', () => {
    const obj = reactive({
      a: 1,
      get b() {
        return this.a
      }
    })
  
    let dummy
    effect(() => (dummy = obj.b))
    expect(dummy).toBe(1)
    obj.a++
    expect(dummy).toBe(2)
  })
  
  it('should observe methods relying on this', () => {
    const obj = reactive({
      a: 1,
      b() {
        return this.a
      }
    })
  
    let dummy
    effect(() => (dummy = obj.b()))
    expect(dummy).toBe(1)
    obj.a++
    expect(dummy).toBe(2)
  })
  
  it('includes test', () => {
    let dummy
    const arr = reactive([1,2,3])
    effect(() => dummy = arr.includes(1))
    expect(dummy).toBe(true)
    arr[0] = 0
    expect(dummy).toBe(false)
    arr.push(1)
    expect(dummy).toBe(true)
  })
  
  it('join test', () => {
    let dummy
    const arr = reactive([1,2,3])
    effect(() => dummy = arr.join(','))
    expect(dummy).toBe('1,2,3')
    arr[0] = 0
    expect(dummy).toBe('0,2,3')
    arr.push(1)
    expect(dummy).toBe('0,2,3,1')
  })
  
  // 可以避免隐性递归导致的无限循环
  it('should avoid implicit infinite recursive loops with itself', () => {
    const counter = reactive({ num: 0 })
  
    effect(() => counter.num++)
    expect(counter.num).toBe(1)
    counter.num = 4
    expect(counter.num).toBe(5)
  })
  // 可以避免隐性递归导致的无限循环 2
  it('should avoid infinite loops with other effects', () => {
    const nums = reactive({ num1: 0, num2: 1 })
  
    effect(() => (nums.num1 = nums.num2))
    effect(() => (nums.num2 = nums.num1))
    expect(nums.num1).toBe(1)
    expect(nums.num2).toBe(1)
    nums.num2 = 4
    expect(nums.num1).toBe(4)
    expect(nums.num2).toBe(4)
    nums.num1 = 10
    expect(nums.num1).toBe(10)
    expect(nums.num2).toBe(10)
  })
  
  it('should allow explicitly recursive raw function loops', () => {
    const counter = reactive({ num: 0 })
    const numSpy = () => {
      counter.num++
      if (counter.num < 10) {
        numSpy()
      }
    }
    effect(numSpy)
    expect(counter.num).toBe(10)
  })
  // JSON 方法可以响应
  it('should observe json methods', () => {
    let dummy = <Record<string, number>>{}
    const obj = reactive<Record<string, number>>({})
    effect(() => {
      dummy = JSON.parse(JSON.stringify(obj))
    })
    obj.a = 1
    expect(dummy.a).toBe(1)
  })
  // Class 方法调用可以观察
  it('should observe class method invocations', () => {
    class Model {
      count: number
      constructor() {
        this.count = 0
      }
      inc() {
        this.count++
      }
    }
    const model = reactive(new Model())
    let dummy
    effect(() => {
      dummy = model.count
    })
    expect(dummy).toBe(0)
    model.inc()
    expect(dummy).toBe(1)
  })
  // 当新值和旧值都是 NaN 时，不会 trigger
  it('should not be trigger when the value and the old value both are NaN', () => {
    const obj = reactive({
      foo: NaN
    })
    let count = 0
  
    effect(() => (obj.foo, ++count))
    expect(count).toBe(1)
    obj.foo = NaN
    expect(count).toBe(1)
  })
  
  it('should trigger all effects when array length is set 0', () => {
    const observed: any = reactive([1])
    let dummy, record
    effect(() => {
      dummy = observed.length
    })
    effect(() => {
      record = observed[0]
    })
    expect(dummy).toBe(1)
    expect(record).toBe(1)
  
    observed[1] = 2
    expect(observed[1]).toBe(2)
  
    observed.unshift(3)
    expect(dummy).toBe(3)
    expect(record).toBe(3)
  
    observed.length = 0
    expect(dummy).toBe(0)
    expect(record).toBe(undefined)
  })

  it('计算函数 setter', () => {
    const num1 = ref(1)
    const doubled = computed(
      () => num1.value * 2,
      val => num1.value = val
    )
    expect(num1.value).toBe(1)
    expect(doubled.value).toBe(2)

    doubled.value = 10
    expect(num1.value).toBe(10)
    expect(doubled.value).toBe(20)
  })

  startTest()