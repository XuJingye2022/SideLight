/** 示例态已改成「打开文件夹…」：验收脚本注入一个同内容的假文件夹，代替旧的示例入口 */
export async function installDemoFolder(page) {
  await page.addInitScript(() => {
    const FILES = {
      '开始写.md': ['# 开始写', '', '把光标放在这里，直接开始。', '', '写完选中一段，按 Ctrl + Enter，右边会给三条意见。'].join('\n'),
      '关于侧灯.md': ['## 侧灯是什么', '', '侧灯是桌子上的第二盏灯。主灯照你，侧灯照你写下的字。', '', '- 左边写', '- 右边补光'].join('\n'),
      '交稿前看一眼.md': ['# 交稿前看一眼', '', '1. 每段第一句，先把结论放出来。', '2. 并列超过三条，改成列表。', '3. 结尾回扣开头。'].join('\n'),
      '带元数据的笔记.md': [
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
      '参考与出处.md': ['# 参考与出处', '', '官方文档在 [Tiptap][tiptap]。', '', '[tiptap]: https://tiptap.dev'].join('\n'),
    }
    const fileHandle = (name) => ({
      kind: 'file',
      name,
      async getFile() {
        const text = FILES[name] ?? ''
        return new File([text], name, { type: 'text/markdown' })
      },
    })
    const root = {
      kind: 'directory',
      name: '示例文集',
      async *entries() {
        for (const name of Object.keys(FILES)) yield [name, fileHandle(name)]
      },
      async getFileHandle(name) {
        if (!(name in FILES)) throw new DOMException('不存在', 'NotFoundError')
        return fileHandle(name)
      },
      async getDirectoryHandle() {
        throw new DOMException('不存在', 'NotFoundError')
      },
    }
    window.showDirectoryPicker = async () => root
  })
}
