function Reactive() {
  const targetMap = new WeakMap();
  let activeEffect: (() => any) | null = null
  const reactiveTag = Symbol('isReactive')

  /**
   * 响应变更
   * @param eff 回调方法，其内部调用的响应式对象更新时会重新触发这个回调
   */
  function effect(eff: () => any) {
    activeEffect = eff
    activeEffect()
    activeEffect = null
  }

  /** 
   * 追踪器
   * @param target - 目标对象
   * @param key - 对象内的索引
   */
  function track(target: object, key: PropertyKey) {
    if (!activeEffect) return
    // 通过传入的 target 对象，在 targetMap 中查找相应的响应式对象
    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, depsMap = new Map())
    // 获取响应式对象的属性监听列表
    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, dep = new Set())

    dep.add(activeEffect)
  }

  /**
   * 触发器
   * @param target - 目标对象
   * @param key - 对象内的索引
   */
  function trigger(target: object, key: PropertyKey) {
    let depsMap = targetMap.get(target)
    if (!depsMap) return

    let dep = depsMap.get(key)
    if (dep) dep.forEach((item: any) => effect(item))
  }

  const reactiveHandler = {
    get (target: object, key: PropertyKey, receiver: any) {
      console.log('get key:', key)
      let result = Reflect.get(target, key, receiver)
      if ((result instanceof Object) && (key !== reactiveTag) && !result[reactiveTag]) {
        result = reactive(result)
        Reflect.set(target, key, result)
      }
      track(target, key)
      return result
    },
    set (target: any, key: PropertyKey, value: any, receiver: any) {
      console.log('set key:', key)
      const oldVal = target[key]
      const result = Reflect.set(target, key, value, receiver)

      if (oldVal !== value) trigger(target, key)

      return result
    }
  }

  function reactive(target: object): any {
    const res = new Proxy(target, reactiveHandler)
    res[reactiveTag] = true
    return res
  }

  function ref(val: any): { value: any } {
    const res = reactive({})
    res.value = val
    return res
  }

  return {
    effect,
    reactive,
    ref
  }
}
const newReactive = Reactive()
export default newReactive
export const effect = newReactive.effect
export const reactive = newReactive.reactive
export const ref = newReactive.ref
