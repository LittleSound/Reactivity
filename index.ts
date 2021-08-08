import  { reactive, effect, ref, computed } from './Reactive'
import { it, expect, specify } from './UnitTest'


specify('---')
function run () {
  const obj = reactive({ a: { b: { c: { d: 20 } } } })
  const b = ref(0)
  effect(() => console.log('obj update1:', obj.a.b.c))
  obj.a.b.c.d = 10
  const num1 = ref(1)
  const num2 = ref(1)
  const numAnd = computed(() => num1.value + num2.value)
  console.log('numAnd:', numAnd.value)
  num1.value = 2
  console.log('numAnd:', numAnd.value)
  num1.value = 10
  console.log('numAnd:', numAnd.value)
}
run()

it('deleteTest', () => {
  let dummy
  const obj = reactive({ prop: 'value' })
  effect(() => (dummy = 'prop' in obj))
  expect(dummy).toBe(true)
  delete obj.prop
  expect(dummy).toBe(false)
  obj.prop = 12
  expect(dummy).toBe(true)
})

it('prototypeTest', () => {
  let dummy
  const counter = reactive({ num: 0 })
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

it ('prototypeTest2', () => {
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

it('functionTest', () => {
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
  const obj = reactive({ [key]: 'value' })
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


