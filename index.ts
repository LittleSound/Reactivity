import  { reactive, effect, ref, computed } from './Reactivity'

// specify('should observe symbol keyed properties')
function run () {
  // const obj = reactive({ a: { b: { c: { d: 20 } } } })
  // const b = ref(0)
  // effect(() => console.log('obj update1:', obj.a.b.c))
  // obj.a.b.c.d = 10
  const num1 = ref(1)
  const num2 = ref(1)
  const numAnd = computed(() => num1.value + num2.value)
  console.log('numAnd:', numAnd.value)
  num1.value = 2
  console.log('numAnd:', numAnd.value)
  num1.value = 10
  console.log('numAnd:', numAnd.value)
  const obj = reactive({ a: 1 as any })
  effect(() => console.log('obj.a:', obj.a))
  obj.a = 2
  obj.a = 3
  obj.a = 3

  // const remap = reactive(new Map()) as Map<string, number>
  // remap.set('a', 1)
  // effect(() => console.log('Map key a:', remap.get('a')))
  // remap.set('a', 2)

  const refunc = reactive({ func() {return this.a}, a: 1 })
  effect(() => console.log('func()', refunc.func()))
  refunc.a = 2
}
run()
