Sidelight 便携版（Windows 11 / x64）
=====================================

这是免安装版。不写注册表，不建开始菜单，不做 .md 关联。装到系统的版本（setup.exe）可以在安装时选择把 Sidelight 加入「打开方式」。

装到系统里的版本（setup.exe，同样不需要管理员）见项目主页 README 的「下载」一节：https://github.com/XuJingye2022/SideLight

怎么用
------
1. 把整个压缩包解压到一个你有写权限的目录（例如 D:\Tools\Sidelight）。
   不要在压缩包里直接双击 exe，也不要解压到 Program Files。
2. 双击 Sidelight.exe。
3. 第一次运行 Windows 可能弹「Windows 已保护你的电脑」。
   点「更多信息」→「仍要运行」。这是因为 exe 没有代码签名，不是病毒。

需要什么
--------
- Windows 11（Windows 10 64 位也可以）
- Microsoft Edge WebView2 运行时。Windows 11 自带；没有的话从
  https://developer.microsoft.com/microsoft-edge/webview2/ 装 Evergreen Bootstrapper。

文件说明
--------
Sidelight.exe                     主程序
Sidelight.exe.config              运行时配置（长路径开关，删了会打不开 260 字符以上的路径）
sidelight.ico                     图标（窗口与任务栏）
www\                              前端资源，不要删
Microsoft.Web.WebView2.*.dll      WebView2 托管程序集
WebView2Loader.dll                WebView2 加载器

数据放在哪
----------
优先 %LOCALAPPDATA%\Sidelight\WebView2；不可写时依次退到 %TEMP%\Sidelight\WebView2
和程序同级的 webview2-data。窗口标题带「（便携数据目录）」说明用了最后一种。
这个目录会随使用变大（几十 MB），删除它等于重置设置与缓存。

出问题看日志
------------
程序同级的 host.log。启动失败时窗口会写明原因，日志里有完整堆栈。
常见原因：解压不完整（缺 www\index.html）、目录只读（换到可写目录）。

不做的事
--------
- 不写注册表，不做 .md 文件关联，不建开机项（安装器可在安装时把 Sidelight 加进右键「打开方式」，默认不勾且不改默认程序）。
- 没有自动更新、没有安装器、没有代码签名。
- 双击第二个 .md 会问一句是否替换当前未保存的文档；选「否」保留当前文档。
