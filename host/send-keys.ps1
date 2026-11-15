param([string]$Path, [string]$Log = '.tmp\send-keys.log')

# 驱动 WebView2 的原生文件夹选择框，不依赖前台焦点：
# Win32 EnumWindows 找 #32770（msedgewebview2 的窗口）→ GetDlgItem 拿「文件夹:」编辑框(1152) 与
# 「选择文件夹」按钮(IDOK=1) → WM_SETTEXT 填路径 → BM_CLICK 点按钮。
# 控件 ID 来自 .tmp 的 UIA 树 dump（Edit id=1152、Button id=1、class=Button）。
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class DlgWin {
    public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumProc cb, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder sb, int max);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr hDlg, int id);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern bool SetWindowText(IntPtr h, string text);
    [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
    public static IntPtr FindDialog(uint pidWanted) {
        IntPtr found = IntPtr.Zero;
        EnumWindows(delegate(IntPtr h, IntPtr l) {
            if (!IsWindowVisible(h)) return true;
            StringBuilder sb = new StringBuilder(64);
            GetClassName(h, sb, 64);
            if (sb.ToString() != "#32770") return true;
            uint pid;
            GetWindowThreadProcessId(h, out pid);
            if (pid != pidWanted) return true;
            found = h;
            return false;
        }, IntPtr.Zero);
        return found;
    }
    public static IntPtr FindChildByClass(IntPtr parent, string cls) {
        IntPtr found = IntPtr.Zero;
        EnumChildWindows(parent, delegate(IntPtr h, IntPtr l) {
            StringBuilder sb = new StringBuilder(64);
            GetClassName(h, sb, 64);
            if (sb.ToString() == cls && IsWindowVisible(h)) { found = h; return false; }
            return true;
        }, IntPtr.Zero);
        return found;
    }
}
"@

function Write-Log([string]$message) {
    $line = (Get-Date).ToString('HH:mm:ss.fff') + ' ' + $message
    Add-Content -Path $Log -Value $line -Encoding UTF8
}

$browserPids = @(Get-Process msedgewebview2 -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like '*EdgeWebView*' } | Select-Object -ExpandProperty Id)

$deadline = (Get-Date).AddSeconds(25)
$hwnd = [IntPtr]::Zero
while ((Get-Date) -lt $deadline -and $hwnd -eq [IntPtr]::Zero) {
    foreach ($p in $browserPids) {
        $h = [DlgWin]::FindDialog([uint32]$p)
        if ($h -ne [IntPtr]::Zero) { $hwnd = $h; break }
    }
    if ($hwnd -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 200 }
}
if ($hwnd -eq [IntPtr]::Zero) {
    Write-Log 'NO-DIALOG'
    exit 2
}
Write-Log ("hwnd=" + $hwnd)

$edit = [DlgWin]::GetDlgItem($hwnd, 1152)
if ($edit -eq [IntPtr]::Zero) {
    $edit = [DlgWin]::FindChildByClass($hwnd, 'Edit')
    Write-Log 'edit-by-class'
}
$ok = [DlgWin]::GetDlgItem($hwnd, 1)
if ($ok -eq [IntPtr]::Zero) {
    $ok = [DlgWin]::FindChildByClass($hwnd, 'Button')
    Write-Log 'button-by-class'
}
Write-Log ("edit=" + $edit + " ok=" + $ok)
if ($edit -eq [IntPtr]::Zero) {
    Write-Log 'NO-EDIT'
    exit 3
}

# WM_SETTEXT = 0x000C
[void][DlgWin]::SetWindowText($edit, $Path)
Write-Log 'path-set'
$sb = New-Object Text.StringBuilder 512
[void][DlgWin]::GetWindowText($edit, $sb, 512)
Write-Log ('edit-text=[' + $sb.ToString() + ']')
Start-Sleep -Milliseconds 500

# 用真实按键把路径打进「文件夹:」：SetWindowText 不触发目录导航，SendKeys 会。
[void][DlgWin]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 400
Write-Log ('foreground-is-dialog=' + ([DlgWin]::GetForegroundWindow() -eq $hwnd))
[void][DlgWin]::SetFocus($edit)
Start-Sleep -Milliseconds 300
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('^a')
Start-Sleep -Milliseconds 150
[System.Windows.Forms.SendKeys]::SendWait($Path)
Write-Log 'typed-path'
Start-Sleep -Milliseconds 500
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
Write-Log 'enter1'
Start-Sleep -Milliseconds 1600
if ([DlgWin]::IsWindowVisible($hwnd)) {
    [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
    Write-Log 'enter2'
    Start-Sleep -Milliseconds 1200
}

if (-not [DlgWin]::IsWindowVisible($hwnd)) {
    Write-Log 'dialog-closed-after-enter'
    exit 0
}
Write-Log 'dialog-still-open'

if ($ok -eq [IntPtr]::Zero) {
    Write-Log 'NO-BUTTON'
    exit 4
}
if (-not [DlgWin]::IsWindowEnabled($ok)) {
    Write-Log 'BUTTON-DISABLED'
    exit 5
}
# BM_CLICK = 0x00F5
[void][DlgWin]::SendMessage($ok, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)
Write-Log 'clicked-ok'
exit 0
