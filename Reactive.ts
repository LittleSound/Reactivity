function Reactive() {
  const targetMap:WeakMap<object, Map<PropertyKey, Set<() => any>>> = new WeakMap();
  // const targetMap = new WeakMap();
  /** effect 调用栈 */
  const effectStack: Array<() => any> = []
  /** 当前正在运行的 effect */
  let activeEffect: (() => any) | null = null
  /** 响应式对象标签 */
  const reactiveTag = Symbol('isReactive')
  /** ref 标签 */
  const refTag = Symbol('isRef')

  /** 检查对象是否有响应式标签 */
  const isSymbolTag = (key: PropertyKey) => key === reactiveTag || key === refTag
  /** 检查对象是否是数组 */
  const isArray = (item: any) => Array.isArray(item)
  /** 获取类型 */
  const toRawType = (value: any) => Object.prototype.toString.call(value).slice(8, -1)
  /** 导入一个逗号分隔的字符串列表, 返回一个方法用于判断一个值是否在这个列表中 */
  const makeMap = (str: string) => {
    const strSet = new Set(str.split(','))
    return (str: string) => strSet.has(str)
  }
  /** 数组键超出边界 */
  const arrayKeyIsOverflow = (target: object, key: PropertyKey) => typeof key !== 'symbol' && key >= ((target as any).length)

  /** 可以被观察的值类型 */
  // const isObservableType = makeMap('Object,Array,Map,Set,WeakMap,WeakSet')
  const isObservableType = makeMap('Object,Array')
  
  /** 是不是 Symbol 内置方法 */
  const isBasicSymbol = (() => {
    const symbolObjs: any = {}
    'iterator,match,replace,search,split,hasInstance,isConcatSpreadable,unscopables,species,toPrimitive,toStringTag'
        .split(',').forEach(item => symbolObjs[(Symbol as any)[item]] = true)
    return (key: PropertyKey) => !!symbolObjs[key]
  })()
  
  /** 数组遍历操作检测 */
  const arrayInstrumentations: Record<string, Function> = {}
  ;['includes', 'indexOf', 'lastIndexOf']
    .forEach(item => arrayInstrumentations[item] = (arr: any[]) => {
      for(let i = 0, l = arr.length; i < l; i++) track(arr, i + '')
    })
  
  const hasOwnProperty = Object.prototype.hasOwnProperty
  /** 是否拥有这个键 */
  const hasOwn = (
    val: object,
    key: PropertyKey
  ): key is keyof typeof val => hasOwnProperty.call(val, key)

  const hasChanged = (oldVal: any, newVal: any) => {
    if (typeof oldVal === 'number' && isNaN(oldVal) && isNaN(newVal)) return false
    return oldVal !== newVal
  }

  /**
   * 响应变更
   * @param eff 回调方法，其内部调用的响应式对象更新时会重新触发这个回调
   */
  function effect(eff: () => any) {
    // 判断 effectStack 中有没有 eff, 如果在则不处理
    if (effectStack.includes(eff)) return
    // 压入 Stack
    effectStack.push(eff)
    activeEffect = eff
    activeEffect()
    // 完成后将 effect 弹出
    effectStack.pop()
    // 重置 activeEffect
    activeEffect = effectStack[effectStack.length - 1]
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
    // 如果修改数组的 length，需要触发所有大于 length 的索引的响应 (effect)
    if (key === 'length' && isArray(target)) {
      depsMap.forEach((dep, key) => {
        if (key === 'length' || arrayKeyIsOverflow(target, key)) {
          dep.forEach((item: any) => activeEffect !== item && effect(item))
        }
      })
    }

    let dep = depsMap.get(key)
    if (dep) dep.forEach((item: any) => activeEffect !== item && effect(item))
  }

  const reactiveHandler = {
    /** 读取 */
    get (target: object, key: PropertyKey, receiver: any) {
      let result = Reflect.get(target, key, receiver)
      const targetIsArray = isArray(target)

      // 如果目标对象是数组并且 key 属于三个方法之一 ['includes', 'indexOf', 'lastIndexOf']，则追踪数组的每个元素
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        arrayInstrumentations[key](target)
      }
      else if (isBasicSymbol(key)) return result
      
      if (result instanceof Object && !result[reactiveTag]) {
        Reflect.set(target, key, result = reactive(result))
      }
      track(target, key)

      if (!targetIsArray && isRef(result)) return result.value
      return result
    },

    /** 写入 */
    set (target: any, key: PropertyKey, value: any, receiver: any) {
      const hadkey = hasOwn(target, key)
      const oldVal = (target as any)[key]
      const result = Reflect.set(target, key, value, receiver)

      if (result) {
        if (hasChanged(oldVal, value)) trigger(target, key)
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

  /** 响应式对象类型 */
  type reactiveType<T> = T & {
    [x: string]: any
  }
  
  /** 创建响应式对象 */
  function reactive<T extends object>(target: T): reactiveType<T> {
    // 已经是响应式对象了，则直接返回原始值
    if (target && (target as any)[reactiveTag]) return target
    // 不是可被观察的类型，则直接返回原始值
    if (!isObservableType(toRawType(target))) return target
    // 使用 reactiveHandler 创建响应式对象
    const res = new Proxy(target, reactiveHandler)
    res[reactiveTag] = true
    return res
  }

  /** 创建响应式引用 */
  function ref<T>(val?: T): { value: T } {
    const res = reactive({}) as any
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
