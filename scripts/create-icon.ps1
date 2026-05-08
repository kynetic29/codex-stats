Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$buildDir = Join-Path $root 'build'
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

$pngPath = Join-Path $buildDir 'icon.png'
$icoPath = Join-Path $buildDir 'icon.ico'

function New-CodexStatsBitmap {
  param([int] $Size)

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 6, 19, 26)), ([System.Drawing.Color]::FromArgb(255, 13, 37, 49)), 45
  $graphics.FillRectangle($bg, $rect)

  $pad = [int]($Size * 0.13)
  $panel = New-Object System.Drawing.Rectangle $pad, $pad, ($Size - 2 * $pad), ($Size - 2 * $pad)
  $panelPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $radius = [int]($Size * 0.12)
  $diameter = $radius * 2
  $panelPath.AddArc($panel.X, $panel.Y, $diameter, $diameter, 180, 90)
  $panelPath.AddArc($panel.Right - $diameter, $panel.Y, $diameter, $diameter, 270, 90)
  $panelPath.AddArc($panel.Right - $diameter, $panel.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $panelPath.AddArc($panel.X, $panel.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $panelPath.CloseFigure()

  $panelBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 10, 29, 39))
  $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 94, 200, 255)), ([Math]::Max(2, [int]($Size * 0.025)))
  $graphics.FillPath($panelBrush, $panelPath)
  $graphics.DrawPath($borderPen, $panelPath)

  $barWidth = [int]($Size * 0.085)
  $gap = [int]($Size * 0.055)
  $baseY = [int]($Size * 0.72)
  $startX = [int]($Size * 0.29)
  $heights = @([int]($Size * 0.20), [int]($Size * 0.33), [int]($Size * 0.47))
  $colors = @(
    [System.Drawing.Color]::FromArgb(255, 85, 224, 166),
    [System.Drawing.Color]::FromArgb(255, 94, 200, 255),
    [System.Drawing.Color]::FromArgb(255, 245, 185, 66)
  )

  for ($i = 0; $i -lt 3; $i++) {
    $x = $startX + $i * ($barWidth + $gap)
    $h = $heights[$i]
    $bar = New-Object System.Drawing.Rectangle $x, ($baseY - $h), $barWidth, $h
    $brush = New-Object System.Drawing.SolidBrush $colors[$i]
    $graphics.FillRectangle($brush, $bar)
    $brush.Dispose()
  }

  $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 229, 241, 247))
  $dotSize = [int]($Size * 0.105)
  $graphics.FillEllipse($dotBrush, ([int]($Size * 0.66)), ([int]($Size * 0.25)), $dotSize, $dotSize)

  $graphics.Dispose()
  $bitmap
}

$iconBitmap = New-CodexStatsBitmap 1024
$iconBitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$iconBitmap.Dispose()

$sizes = @(256, 128, 64, 48, 32, 16)
$images = @()
foreach ($size in $sizes) {
  $bitmap = New-CodexStatsBitmap $size
  $stream = New-Object System.IO.MemoryStream
  $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  $images += [PSCustomObject]@{ Size = $size; Bytes = $stream.ToArray() }
  $stream.Dispose()
  $bitmap.Dispose()
}

$file = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
$writer = New-Object System.IO.BinaryWriter $file
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]$images.Count)

$offset = 6 + (16 * $images.Count)
foreach ($image in $images) {
  $dimension = if ($image.Size -eq 256) { 0 } else { $image.Size }
  $writer.Write([byte]$dimension)
  $writer.Write([byte]$dimension)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$image.Bytes.Length)
  $writer.Write([UInt32]$offset)
  $offset += $image.Bytes.Length
}

foreach ($image in $images) {
  $writer.Write($image.Bytes)
}

$writer.Dispose()
$file.Dispose()

Write-Host "Created $pngPath"
Write-Host "Created $icoPath"
