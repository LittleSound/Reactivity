// const testFuncs = [] as {name: string, func: () => void }[]
let activeTestFuncName = ''
let counter = { index: 0, count: 0}
let targetTest = ''
let funcSet: Set<() => any> = new Set()
let failureCount = 0
export function expect (val: any) {
  return {
    toBe(item: any) {
      const res = val === item
      counter.index += +res
      failureCount += +!res
      counter.count++
      console.log('test:', res ? '🟢' : '🔴', res)
    }
  }
}

export function it(name: string, func: () => void) {
  funcSet.add(() => {
    if (targetTest && targetTest !== name) return
    activeTestFuncName = name
    counter = { index: 0, count: 0}
    console.log(`⏯ start: ${activeTestFuncName}`)
    func()
    console.log(`⏹ end, complete: ${counter.index}/${counter.count}\n`)
    activeTestFuncName = ''
  })
}

export function specify(name: string) {
  targetTest = name
}

export function startTest() {
  failureCount = 0
  funcSet.forEach(func => func())
  console.log(`Failure Count: ${failureCount ? '🔴' : '🟢'} ${failureCount}`)
}