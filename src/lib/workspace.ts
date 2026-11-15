export type WorkspaceFileNode = {
  kind: 'file'
  name: string
  /** 相对工作区根目录的路径，用 / 分隔 */
  path: string
  handle: FileSystemFileHandle | null
}

export type WorkspaceDirNode = {
  kind: 'dir'
  name: string
  /** 相对工作区根目录的路径，用 / 分隔 */
  path: string
  handle: FileSystemDirectoryHandle | null
  children: WorkspaceNode[]
}

export type WorkspaceNode = WorkspaceFileNode | WorkspaceDirNode

export type Workspace = {
  name: string
  root: WorkspaceNode | null
  /** 用户选中的文件夹句柄，示例工作区没有 */
  rootHandle: FileSystemDirectoryHandle | null
  demo: boolean
}

// TS 的 DOM 类型里没有这两个选择器函数，这里补本地声明，再用 typeof 收窄
type DirectoryPicker = (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>

type FilePicker = (options?: {
  multiple?: boolean
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}) => Promise<FileSystemFileHandle[]>

type PickerWindow = Window & {
  showDirectoryPicker?: DirectoryPicker
  showOpenFilePicker?: FilePicker
  showSaveFilePicker?: SaveFilePicker
}

type SaveFilePicker = (options?: {
  suggestedName?: string
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}) => Promise<FileSystemFileHandle>

/** 保存落点：选中的文件句柄与文件名 */
export type FileWriteTarget = {
  handle: FileSystemFileHandle
  name: string
}

/** 另存为的结果：拿到落点 / 浏览器不支持 / 用户取消 */
export type SaveAsResult = FileWriteTarget | 'unsupported' | null

type PickedFile = {
  name: string
  text: string
  handle: FileSystemFileHandle | null
}

const MARKDOWN_SUFFIXES = ['.md', '.markdown']

// 目录与文件都按名字本地化排序，数字按数值比，第 2 章排在第 10 章前面
const collator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' })

// 示例文件没有句柄，正文放在这张表里，readNode 按 path 取回
const demoTexts = new Map<string, string>()

function pickerWindow(): PickerWindow {
  return window
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function isMarkdown(name: string): boolean {
  const lower = name.toLowerCase()
  return MARKDOWN_SUFFIXES.some((suffix) => lower.endsWith(suffix))
}

function joinPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name
}

async function readDirectory(handle: FileSystemDirectoryHandle, parentPath: string): Promise<WorkspaceDirNode> {
  const path = joinPath(parentPath, handle.name)
  const dirs: WorkspaceDirNode[] = []
  const files: WorkspaceFileNode[] = []

  for await (const [name, entry] of handle.entries()) {
    // 跳过 .git、.obsidian 这类隐藏项
    if (name.startsWith('.')) continue

    if (entry.kind === 'directory') {
      dirs.push(await readDirectory(entry, path))
    } else if (isMarkdown(name)) {
      files.push({ kind: 'file', name, path: joinPath(path, name), handle: entry })
    }
  }

  dirs.sort((a, b) => collator.compare(a.name, b.name))
  files.sort((a, b) => collator.compare(a.name, b.name))

  return { kind: 'dir', name: handle.name, path, handle, children: [...dirs, ...files] }
}

/**
 * 让用户挑一个文件夹，递归读出其中的 Markdown 文件。
 * 用户取消时返回 null；浏览器不支持 File System Access API 时抛错。
 */
export async function pickWorkspace(): Promise<Workspace | null> {
  const picker = pickerWindow().showDirectoryPicker
  if (typeof picker !== 'function') {
    throw new Error('当前浏览器不能读取文件夹，请改用 Chrome 或 Edge。')
  }

  let handle: FileSystemDirectoryHandle
  try {
    handle = await picker({ mode: 'readwrite' })
  } catch (error) {
    if (isAbortError(error)) return null
    throw error
  }

  const root = await readDirectory(handle, '')
  return { name: handle.name, root, rootHandle: handle, demo: false }
}

/**
 * 找文件所在的目录句柄，图片要存到它旁边的 assets/ 里。
 * 路径首段是工作区名，跳过；逐级 getDirectoryHandle，任一级不存在就返回 null。
 */
export async function parentDirectory(
  workspace: Workspace,
  filePath: string,
): Promise<FileSystemDirectoryHandle | null> {
  const root = workspace.rootHandle
  if (!root) return null

  // 末段是文件名，中间才是要逐级进入的目录
  let dir = root
  for (const name of filePath.split('/').slice(1, -1)) {
    try {
      dir = await dir.getDirectoryHandle(name)
    } catch {
      return null
    }
  }

  return dir
}

/**
 * 让用户挑一个 Markdown 文件并读出正文。
 * 优先用 File System Access API；浏览器没有时退回隐藏的 input，此时拿不到句柄。
 */
export async function pickFile(): Promise<PickedFile | null> {
  const picker = pickerWindow().showOpenFilePicker
  if (typeof picker === 'function') {
    try {
      const [handle] = await picker({
        multiple: false,
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown'] } }],
      })
      if (!handle) return null
      const file = await handle.getFile()
      return { name: file.name, text: await file.text(), handle }
    } catch (error) {
      if (isAbortError(error)) return null
      throw error
    }
  }

  return pickFileWithInput()
}

function pickFileWithInput(): Promise<PickedFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,text/markdown'
    input.hidden = true

    const cleanup = () => {
      input.remove()
    }

    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0]
        cleanup()
        if (!file) {
          resolve(null)
          return
        }
        file.text().then(
          (text) => resolve({ name: file.name, text, handle: null }),
          (error: unknown) => reject(error),
        )
      },
      { once: true },
    )

    // 有的浏览器在用户点「取消」时补发 cancel，避免 Promise 一直悬着
    input.addEventListener(
      'cancel',
      () => {
        cleanup()
        resolve(null)
      },
      { once: true },
    )

    document.body.append(input)
    input.click()
  })
}

/**
 * 读一个文件的正文。示例文件没有句柄，从内存表里取。
 */
export async function readNode(file: WorkspaceFileNode): Promise<string> {
  if (file.handle) {
    const blob = await file.handle.getFile()
    return blob.text()
  }

  const demo = demoTexts.get(file.path)
  if (demo !== undefined) return demo

  throw new Error(`「${file.name}」没有可以读取的位置。`)
}

/**
 * 把正文写回磁盘。示例文件与兜底打开的文件没有句柄，写不了。
 */
export async function writeNode(file: WorkspaceFileNode, text: string): Promise<void> {
  if (!file.handle) {
    throw new Error(`「${file.name}」没有磁盘句柄，无法保存。请先用「打开文件夹」打开它所在的文件夹。`)
  }

  const writable = await file.handle.createWritable()
  await writable.write(text)
  await writable.close()
}

/**
 * 让用户选一个保存位置并立刻写入。
 * 取消（AbortError）返回 null；浏览器没有 showSaveFilePicker 返回 'unsupported'，由调用方降级。
 */
export async function saveAsFile(name: string, text: string): Promise<SaveAsResult> {
  const picker = pickerWindow().showSaveFilePicker
  if (typeof picker !== 'function') return 'unsupported'

  let handle: FileSystemFileHandle
  try {
    handle = await picker({
      suggestedName: name,
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
    })
  } catch (error) {
    if (isAbortError(error)) return null
    throw error
  }
  if (!handle) return null

  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
  return { handle, name: handle.name || name }
}

const DEMO_NAME = '示例文集'

const DEMO_FILES: Array<{ name: string; text: string }> = [
  {
    name: '开始写.md',
    text: [
      '# 开始写',
      '',
      '把光标放在这里，直接开始。不问你标题，也不弹出模板。',
      '',
      '写完选中一段，按 Ctrl + Enter，右边会给三条意见。',
      '',
      '> 这个示例文件夹只活在内存里，改动不会写回磁盘。',
    ].join('\n'),
  },
  {
    name: '关于侧灯.md',
    text: [
      '## 侧灯是什么',
      '',
      '侧灯是桌子上的第二盏灯。主灯照你，侧灯照你写下的字。',
      '',
      '它只读正文，不改正文。你写，它看。',
      '',
      '- 左边写',
      '- 右边补光',
    ].join('\n'),
  },
  {
    name: '交稿前看一眼.md',
    text: [
      '# 交稿前看一眼',
      '',
      '1. 每段第一句，先把结论放出来。',
      '2. 并列超过三条，改成列表。',
      '3. 结尾回扣开头，读者才落得下心。',
      '',
      '这三条来自编辑的经验，不是规则。',
    ].join('\n'),
  },
  {
    name: '带元数据的笔记.md',
    text: [
      '---',
      'title: 周记',
      'tags: [随笔, 生活]',
      'created: 2026-11-10',
      '---',
      '',
      '# 周记',
      '',
      '这周读完了《长日将尽》。有三成的时间花在通勤上。',
      '',
      '按 <kbd>Ctrl</kbd> + Enter 就能让侧灯看这一段。',
      '',
      '脚注也属于 Markdown[^1]。',
      '',
      '[^1]: 第一条脚注。',
    ].join('\n'),
  },
  {
    name: '参考与出处.md',
    text: [
      '# 参考与出处',
      '',
      '这篇用了引用式链接。编辑器读不全，保存时会改写成行内链接。',
      '',
      '官方文档在 [Tiptap][tiptap]，内核是 [ProseMirror][pm]。',
      '',
      '[tiptap]: https://tiptap.dev',
      '[pm]: https://prosemirror.net',
    ].join('\n'),
  },
]

/**
 * 纯内存的示例文件夹。三个文件，没有句柄，正文存在模块里。
 */
export function demoWorkspace(): Workspace {
  const files: WorkspaceFileNode[] = DEMO_FILES.map((file) => {
    const path = joinPath(DEMO_NAME, file.name)
    demoTexts.set(path, file.text)
    return { kind: 'file', name: file.name, path, handle: null }
  })

  return {
    name: DEMO_NAME,
    root: { kind: 'dir', name: DEMO_NAME, path: DEMO_NAME, handle: null, children: files },
    rootHandle: null,
    demo: true,
  }
}

/**
 * 按树的显示顺序把文件拉平，「下一个文件」之类的顺序与左边看到的一致。
 */
export function flattenFiles(node: WorkspaceNode | null): WorkspaceFileNode[] {
  if (!node) return []
  if (node.kind === 'file') return [node]
  return node.children.flatMap((child) => flattenFiles(child))
}
