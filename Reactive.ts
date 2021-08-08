function Reactive() {
  const targetMap = new WeakMap();
  let activeEffect: (() => any) | null = null
  const reactiveTag = Symbol('isReactive')
  const refTag = Symbol('isRef')

  const isSymbolTag = (key: PropertyKey) => key === reactiveTag || key === refTag
  const isArray = (item: any) => Array.isArray(item)

  const hasOwnProperty = Object.prototype.hasOwnProperty

  /** 是否拥有这个键 */
  const hasOwn = (
    val: object,
    key: PropertyKey
  ): key is keyof typeof val => hasOwnProperty.call(val, key)

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
    if (!activeEffect || isSymbolTag(key)) return
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
    if (isSymbolTag(key)) return
    let depsMap = targetMap.get(target)
    if (!depsMap) return

    let dep = depsMap.get(key)
    if (dep) dep.forEach((item: any) => effect(item))
  }

  const reactiveHandler = {
    /** 读取 */
    get (target: object, key: PropertyKey, receiver: any) {
      let result = Reflect.get(target, key, receiver)

      if (isRef(result)) return result.value

      if (result instanceof Object && !result[reactiveTag]) {
        Reflect.set(target, key, result = reactive(result))
      }
      // console.log('get key:', key, ':', result)
      track(target, key)
      return result
    },

    /** 写入 */
    set (target: any, key: PropertyKey, value: any, receiver: any) {
      const hadkey = hasOwn(target, key)
      const oldVal = (target as any)[key]
      const result = Reflect.set(target, key, value, receiver)

      // console.log('set key:', key, '=', value, '/', oldVal)
      if (result) {
        if (oldVal !== value) trigger(target, key)
        // 如果创建了新字段，需要触发与迭代器相关联的响应 (effect)
        if (!hadkey) {
          trigger(target, 'length')
          trigger(target, Symbol.iterator)
        }
      }

      return result
    },

    /** 删除 */
    deleteProperty (target: any, key: PropertyKey) {
      const hadkey = hasOwn(target, key)
      const result = Reflect.deleteProperty(target, key)
      if (result && hadkey) trigger(target, key)
      return result
    },

    /** in 运算符 */
    has (target: any, key: PropertyKey) {
      const result = Reflect.has(target, key)
      track(target, key)
      return result
    },

    /** 迭代器 */
    ownKeys (target: any) {
      track(target, Symbol.iterator)
      return Reflect.ownKeys(target)
    }
  }
  
  /** 创建响应式对象 */
  function reactive<T extends object>(target: T): any {
    if (target && (target as any)[reactiveTag]) return target
    if (target instanceof Function) return target
    const res = new Proxy(target, reactiveHandler)
    res[reactiveTag] = true
    return res
  }

  /** 创建响应式引用 */
  function ref(val?: unknown): { value: any } {
    const res = reactive({})
    res[refTag] = true
    res.value = val
    return res
  }

  /** 计算函数 */
  function computed(getter: () => unknown) {
    const result = ref();
    effect(() => result.value = getter())
    return result
  }

  /** 判断一个对象是不是 reactive 创建的 */
  function isReactive(obj: any) {
    return obj && obj instanceof Object && !!obj[reactiveTag]
  }

  /** 判断一个对象是不是 ref 创建的 */
  function isRef(obj: any) {
    return obj && obj instanceof Object && !!obj[refTag]
  }

  return {
    effect,
    reactive,
    ref,
    computed,
    isReactive,
    isRef,
  }
}
const newReactive = Reactive()
export default newReactive
export const effect = newReactive.effect
export const reactive = newReactive.reactive
export const ref = newReactive.ref
export const computed = newReactive.computed
export const isReactive = newReactive.isReactive
export const isRef = newReactive.isRef
