// 生成 packaging/sidelight.ico：16/24/32/48 用 32bpp BMP DIB，256 用 PNG。
// 纯 PNG 的 ico 给 form.Icon 用会花屏或抛异常（第 2 轮 ship finder 实测），所以必须混合。
// 图形沿用 index.html 的内联标记：青绿圆点 #2b6d64，大尺寸加一道浅色内环。
// 用法：csc /out:.tmp\mkico.exe /codepage:65001 packaging\mkico.cs 后运行 mkico.exe packaging
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

static class Program
{
    static int[] Sizes = new int[] { 16, 24, 32, 48, 256 };

    static void Main(string[] args)
    {
        string outDir = args.Length > 0 ? args[0] : ".";
        Directory.CreateDirectory(outDir);

        List<byte[]> data = new List<byte[]>();
        foreach (int s in Sizes)
        {
            Bitmap bmp = Render(s);
            data.Add(s <= 48 ? ToDib(bmp) : ToPng(bmp));
            if (s == 256) bmp.Save(Path.Combine(outDir, "icon-256.png"), ImageFormat.Png);
            bmp.Dispose();
        }

        string path = Path.Combine(outDir, "sidelight.ico");
        WriteIco(path, Sizes, data);
        Console.WriteLine("ico=" + path + " " + new FileInfo(path).Length + " B entries=" + Sizes.Length);
    }

    static Bitmap Render(int size)
    {
        Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.CompositingQuality = CompositingQuality.HighQuality;
            g.Clear(Color.Transparent);
            float pad = size <= 16 ? 1.0f : (size <= 48 ? 1.5f : size * 0.04f);
            float d = size - pad * 2;
            using (Brush b = new SolidBrush(Color.FromArgb(0x2b, 0x6d, 0x64)))
            {
                g.FillEllipse(b, pad, pad, d, d);
            }
            if (size >= 48)
            {
                using (Pen p = new Pen(Color.FromArgb(60, 255, 255, 255), Math.Max(1f, size * 0.03f)))
                {
                    g.DrawEllipse(p, pad + d * 0.18f, pad + d * 0.18f, d * 0.64f, d * 0.64f);
                }
            }
        }
        return bmp;
    }

    static byte[] ToPng(Bitmap bmp)
    {
        using (MemoryStream ms = new MemoryStream())
        {
            bmp.Save(ms, ImageFormat.Png);
            return ms.ToArray();
        }
    }

    // 32bpp BMP DIB：BITMAPINFOHEADER + 自下而上的 XOR 位图 + 全 0 的 AND 掩码（透明靠 alpha）。
    static byte[] ToDib(Bitmap bmp)
    {
        int w = bmp.Width, h = bmp.Height;
        int xorStride = w * 4;
        int andStride = ((w + 31) / 32) * 4;
        int size = 40 + xorStride * h + andStride * h;
        byte[] bytes = new byte[size];
        using (MemoryStream ms = new MemoryStream(bytes))
        using (BinaryWriter bw = new BinaryWriter(ms))
        {
            bw.Write(40);
            bw.Write(w);
            bw.Write(h * 2);
            bw.Write((short)1);
            bw.Write((short)32);
            bw.Write(0);
            bw.Write(xorStride * h + andStride * h);
            bw.Write(0); bw.Write(0); bw.Write(0); bw.Write(0);
            for (int y = h - 1; y >= 0; y--)
            {
                for (int x = 0; x < w; x++)
                {
                    Color c = bmp.GetPixel(x, y);
                    bw.Write(c.B); bw.Write(c.G); bw.Write(c.R); bw.Write(c.A);
                }
            }
            for (int y = 0; y < h; y++) for (int x = 0; x < andStride; x++) bw.Write((byte)0);
        }
        return bytes;
    }

    static void WriteIco(string path, int[] sizes, List<byte[]> images)
    {
        using (FileStream fs = new FileStream(path, FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs))
        {
            bw.Write((short)0);
            bw.Write((short)1);
            bw.Write((short)sizes.Length);
            int offset = 6 + 16 * sizes.Length;
            for (int i = 0; i < sizes.Length; i++)
            {
                int s = sizes[i];
                bw.Write((byte)(s >= 256 ? 0 : s));
                bw.Write((byte)(s >= 256 ? 0 : s));
                bw.Write((byte)0);
                bw.Write((byte)0);
                bw.Write((short)1);
                bw.Write((short)32);
                bw.Write(images[i].Length);
                bw.Write(offset);
                offset += images[i].Length;
            }
            for (int i = 0; i < images.Count; i++) bw.Write(images[i]);
        }
    }
}
