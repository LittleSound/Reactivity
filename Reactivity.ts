/* Reactivity v0.1.0 by LittleSound, Origin: https://github.com/LittleSound/reactive/blob/main/Reactivity.ts */

/** 响应式对象类型 */
export type ReactiveType<T> = {
  [K in keyof T]: T[K]
}

export type RefType<T> = {
  value: T
}

export type ToRefsType<T> = {
  [K in keyof T]: RefType<T[K]>
}

type aa = {
  a:number,b:number
}
type aak = keyof aa

const aakv: aak = 'a'
console.log(aakv)

function reactivity() {
  const __DEV__ = true
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
  const rawTag = Symbol('raw')

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
  // 暂时屏蔽暂不支持代理的 Map, Set, WeakMap, WeakSet
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
    .forEach(key => arrayInstrumentations[key] = function (...args: any[]) {
      const arr = toRaw(this) as any
      for(let i = 0, l = (this as any).length; i < l; i++) track(arr, i + '')

      // 我们首先使用原始 args 运行该方法（可能是反应性的）
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        // 如果这不起作用，请使用原始值再次运行它
        return arr[key](...args.map(toRaw))
      } else return res
    })
  
  const hasOwnProperty = Object.prototype.hasOwnProperty
  /** 是否拥有这个键 */
  const hasOwn = (
    val: object,
    key: PropertyKey
  ): key is keyof typeof val => hasOwnProperty.call(val, key)
  
  /** 比较新旧值是否变化 */
  const hasChanged = (oldVal: any, newVal: any) => {
    if (typeof oldVal === 'number' && isNaN(oldVal) && isNaN(newVal)) return false
    return oldVal !== newVal
  }

  const toRaw = <T>(obj: T): T => {
    const raw = obj && (obj as any)[rawTag]
    return raw ? toRaw(raw) : obj
  }

  /** 给对象添加新的值 */
  // const def = (obj: object, key: string | symbol, value: any) => {
  //   Object.defineProperty(obj, key, {
  //     configurable: true,
  //     enumerable: false,
  //     value
  //   })
  // }

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
    if (!depsMap) {
      targetMap.set(target, depsMap = new Map())
    }
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
      if (key === rawTag) return target  // 如果key是raw 则直接返回目标对象
      if (key === reactiveTag) return true
      let result = Reflect.get(target, key, receiver)
      const targetIsArray = isArray(target)

      // 如果目标对象是数组并且 key 属于三个方法之一 ['includes', 'indexOf', 'lastIndexOf']，则追踪数组的每个元素
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }
      else if (isBasicSymbol(key)) return result
      
      if (result instanceof Object && isObservableType(toRawType(result)) && !result[reactiveTag]) {
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
  
  /** 创建响应式对象 */
  function reactive<T extends object>(target: T): ReactiveType<T> {
    // 已经是响应式对象了，则直接返回原始值
    if (target && (target as any)[reactiveTag]) return target
    // 不是可被观察的类型，则直接返回原始值
    if (!isObservableType(toRawType(target))) {
      if (__DEV__) console.warn(`value cannot be made reactive: ${String(target)}`)
      return target
    }
    // 使用 reactiveHandler 创建响应式对象
    const res = new Proxy(target, reactiveHandler)
    return res
  }

  /** 根据传入的 handler 创建响应式引用 */
  function createRef<T>(val: T | undefined, handler: any): RefType<T> {
    const res = new Proxy({}, handler) as any
    res[refTag] = true
    res.value = val
    return res
  }

  /** 创建响应式引用 */
  function ref<T>(val?: T): RefType<T> {
    return createRef(val, reactiveHandler)
  }

  /** 计算函数 */
  function computed<T>(getter: () => T, setter?: (value: any) => void): RefType<T> {
    // 是否允许写入原始值的开关
    let isWritable = true
    // 创建 ref，改写它的 set 陷阱
    const result = createRef<T>(undefined, {
      ...reactiveHandler,
      set (target: any, key: PropertyKey, value: any, receiver: any) {
        // 没有开启 isCanWrite 时，写入数据将会触发 setter（如果有的话）
        if (isWritable) return reactiveHandler.set(target, key, value, receiver)
        if (key !== 'value') return
        if (setter) setter(value)
        return true
      }
    })
    
    // getter 变化时更新 value 的值
    effect(() => {
      isWritable = true
      result.value = getter()
      isWritable = false
    })
    return result
  }

  /**
   * 根据传入的响应式对象创建指定键值对的 ref 副本，并互相绑定
   */
  function toRef<T extends Object, K extends keyof T>(object: T, key: K): RefType<T[K]> {
    if (isRef(object[key])) return (object as any)
    // 不是可被观察的类型，则直接返回原始值
    return computed(() => object[key], (val: T[K]) => object[key] = val)
  }
  /**
   * 遍历传入的响应式对象，创建 ref 副本，并互相绑定
   * @param object 响应式对象
   * @returns 键都被转换为 ref
   */
  function toRefs <T extends Object>(object: T): ToRefsType<T> {
    if (__DEV__ && !isReactive(object)) {
      console.warn(`toRefs() expects a reactive object but received a plain one.`)
    }
    const res = isArray(object) ? new Array((object as any).length) : {} as any
    for (const key in object) {
      res[key] = toRef(object, key as any)
    }
    return res
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
    toRef,
    toRefs,
  }
}
const Reactivity = reactivity()
export default Reactivity
export const effect = Reactivity.effect
export const reactive = Reactivity.reactive
export const ref = Reactivity.ref
export const computed = Reactivity.computed
export const isReactive = Reactivity.isReactive
export const isRef = Reactivity.isRef
export const toRef = Reactivity.toRef
export const toRefs = Reactivity.toRefs
