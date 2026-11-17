import { Extension, InputRule } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'

/**
 * 段末的 `[ ] ` / `[x] `：只在普通无序列表项里生效（Typora 里单独打 `[ ] ` 不建任务项）。
 *
 * 末尾必须是**字面空格**，不能写 `\s`：Tiptap 的输入规则在 Enter 上也会跑一遍
 * （`@tiptap/core` 的 `inputRulesPlugin.handleKeyDown` 用 `text: "\n"` 调 runner），
 * `\s` 会把换行也当成空格，于是 `- [ ]` + Enter 会在当前项里触发转换、还把换行吃掉。
 */
const TASK_MARKER = /^\s*\[([ xX])\] $/

export const TaskListInput = Extension.create({
  name: 'taskListInput',
  // 先于 @tiptap/extension-task-item 自带的同名规则：那条要求 taskItem 能被 listItem 包住，
  // 而 taskItem 没有 group，在 listItem 里恒失败。放在前面跑一次不多花时间，行为也不随版本升级改变。
  priority: 1000,
  addInputRules() {
    return [
      new InputRule({
        find: TASK_MARKER,
        handler: ({ state, range, match }) => {
          const $from = state.selection.$from
          let itemDepth = -1
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            if ($from.node(depth).type.name === 'listItem') {
              itemDepth = depth
              break
            }
          }
          // 只在 bulletList 的 listItem 里转换；有序列表与普通段落保持字面（与 Typora 一致）
          if (itemDepth < 2) return null
          const list = $from.node(itemDepth - 1)
          if (list.type.name !== 'bulletList') return null
          const item = $from.node(itemDepth)
          const paragraph = item.firstChild
          if (item.childCount !== 1 || !paragraph || paragraph.type.name !== 'paragraph') return null

          // 只换**这一项**，兄弟项一个字节不动。不能走「liftListItem + toggleTaskList」：
          // lift 会把相邻的两个无序列表合成一个，随后的 toggleList 把整串兄弟项一起变成
          // 任务项（第 44 轮实测），普通列表项被改写成任务项是用户没要求的。
          // 做法：把当前 listItem 换成 taskList(taskItem(paragraph))，列表前后各留一段。
          const offset = range.from - $from.start(itemDepth + 1)
          const size = range.to - range.from
          if (offset < 0 || offset + size > paragraph.content.size) return null
          const checked = match[1].toLowerCase() === 'x'
          // 注意 Fragment.cut(from, to) 取的是「from 到 to 之间」的内容，不是「删掉这段：
          // cut(0, size) 会原样返回整段（内部有 from==0 && to==size 的短路）。要删掉匹配段
          // 就得拼左右两半。
          const kept = paragraph.content.cut(0, offset).append(paragraph.content.cut(offset + size))
          const taskItem = state.schema.nodes.taskItem.create(
            { checked },
            paragraph.type.create(paragraph.attrs, kept),
          )
          const taskList = state.schema.nodes.taskList.create(null, [taskItem])

          const index = $from.index(itemDepth - 1)
          const nodes = []
          if (index > 0) {
            const before = Array.from({ length: index }, (_, i) => list.child(i))
            nodes.push(list.type.create(list.attrs, Fragment.fromArray(before)))
          }
          nodes.push(taskList)
          const afterCount = list.childCount - index - 1
          if (afterCount > 0) {
            const after = Array.from({ length: afterCount }, (_, i) => list.child(index + 1 + i))
            nodes.push(list.type.create(list.attrs, Fragment.fromArray(after)))
          }

          const listPos = $from.before(itemDepth - 1)
          const tr = state.tr
          tr.replaceWith(listPos, listPos + list.nodeSize, nodes)
          // 光标落进新任务项的段落里；失败时保持原选区也不影响转换结果
          const caret = listPos + (index > 0 ? nodes[0].nodeSize : 0) + 3
          if (caret <= tr.doc.content.size) tr.setSelection(TextSelection.create(tr.doc, caret))
        },
      }),
    ]
  },
})
