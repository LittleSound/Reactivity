import  { reactive, effect, ref } from './Reactive'

function run () {
  const obj = reactive({ a: { b: { c: { d: 20 } } } })
  const b = ref(0)
  // const obj2 = reactive({ b: 0 })
  effect(() => console.log('obj update1:', b.value ? obj.a.b.c : 0))

  b.value = 20
  obj.a.b.c.d = 20
}
run()
