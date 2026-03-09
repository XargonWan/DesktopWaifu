$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $root 'static\\assets\\desktopwaifu-icon.png'
$size = 1024

$bitmap = New-Object System.Drawing.Bitmap $size, $size
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.Clear([System.Drawing.Color]::Transparent)

try {
  $bgRect = New-Object System.Drawing.RectangleF(64, 96, 896, 864)
  $bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $radius = 168.0
  $diameter = $radius * 2
  $bgPath.AddArc($bgRect.X, $bgRect.Y, $diameter, $diameter, 180, 90)
  $bgPath.AddArc($bgRect.Right - $diameter, $bgRect.Y, $diameter, $diameter, 270, 90)
  $bgPath.AddArc($bgRect.Right - $diameter, $bgRect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $bgPath.AddArc($bgRect.X, $bgRect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $bgPath.CloseFigure()

  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    ([System.Drawing.Point]::new(64, 96)),
    ([System.Drawing.Point]::new(960, 960)),
    ([System.Drawing.Color]::FromArgb(255, 4, 9, 19)),
    ([System.Drawing.Color]::FromArgb(255, 18, 37, 62))
  )
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend
  $blend.Colors = @(
    [System.Drawing.Color]::FromArgb(255, 4, 9, 19),
    [System.Drawing.Color]::FromArgb(255, 9, 23, 38),
    [System.Drawing.Color]::FromArgb(255, 18, 37, 62)
  )
  $blend.Positions = @(0.0, 0.58, 1.0)
  $bgBrush.InterpolationColors = $blend
  $graphics.FillPath($bgBrush, $bgPath)

  $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($bgPath)
  $glowBrush.CenterPoint = [System.Drawing.PointF]::new(512, 420)
  $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(72, 69, 216, 255)
  $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 69, 216, 255))
  $graphics.FillPath($glowBrush, $bgPath)

  $points = @(
    [System.Drawing.Point]::new(230, 112),
    [System.Drawing.Point]::new(334, 210),
    [System.Drawing.Point]::new(690, 210),
    [System.Drawing.Point]::new(794, 112),
    [System.Drawing.Point]::new(848, 210),
    [System.Drawing.Point]::new(920, 282),
    [System.Drawing.Point]::new(920, 774),
    [System.Drawing.Point]::new(848, 846),
    [System.Drawing.Point]::new(794, 944),
    [System.Drawing.Point]::new(690, 846),
    [System.Drawing.Point]::new(334, 846),
    [System.Drawing.Point]::new(230, 944),
    [System.Drawing.Point]::new(176, 846),
    [System.Drawing.Point]::new(104, 774),
    [System.Drawing.Point]::new(104, 282),
    [System.Drawing.Point]::new(176, 210)
  )
  $framePath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $framePath.AddPolygon($points)
  $frameBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    ([System.Drawing.Point]::new(120, 120)),
    ([System.Drawing.Point]::new(920, 920)),
    ([System.Drawing.Color]::FromArgb(255, 101, 247, 255)),
    ([System.Drawing.Color]::FromArgb(255, 78, 133, 255))
  )
  $framePen = New-Object System.Drawing.Pen($frameBrush, 26)
  $framePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawPath($framePen, $framePath)

  $accentPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 127, 232, 255), 16)
  $accentPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLines($accentPen, @(
    [System.Drawing.Point]::new(286,168),
    [System.Drawing.Point]::new(372,246),
    [System.Drawing.Point]::new(652,246),
    [System.Drawing.Point]::new(738,168)
  ))

  $monitorPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $monitorPath.AddPolygon(@(
    [System.Drawing.Point]::new(304, 288),
    [System.Drawing.Point]::new(384, 352),
    [System.Drawing.Point]::new(640, 352),
    [System.Drawing.Point]::new(720, 288),
    [System.Drawing.Point]::new(786, 362),
    [System.Drawing.Point]::new(786, 608),
    [System.Drawing.Point]::new(708, 686),
    [System.Drawing.Point]::new(316, 686),
    [System.Drawing.Point]::new(238, 608),
    [System.Drawing.Point]::new(238, 362)
  ))
  $monitorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 7, 19, 33))
  $monitorPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 117, 231, 255), 18)
  $monitorPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.FillPath($monitorBrush, $monitorPath)
  $graphics.DrawPath($monitorPen, $monitorPath)

  $linePenStrong = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 75, 197, 255), 16)
  $linePenStrong.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePenStrong.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($linePenStrong, 358, 406, 666, 406)

  $linePenMid = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 75, 197, 255), 12)
  $linePenMid.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePenMid.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($linePenMid, 358, 474, 568, 474)

  $linePenLow = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(72, 75, 197, 255), 12)
  $linePenLow.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePenLow.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($linePenLow, 358, 524, 524, 524)

  $eyeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 125, 244, 255))
  $graphics.FillEllipse($eyeBrush, 364, 552, 36, 36)
  $graphics.FillEllipse($eyeBrush, 434, 552, 36, 36)

  $mouthPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 125, 244, 255), 14)
  $mouthPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mouthPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mouthRect = New-Object System.Drawing.Rectangle 390, 594, 58, 34
  $graphics.DrawArc($mouthPen, $mouthRect, 15, 150)

  $arrowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 121, 216, 255), 22)
  $arrowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $arrowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $arrowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLines($arrowPen, @(
    [System.Drawing.Point]::new(590, 518),
    [System.Drawing.Point]::new(640, 562),
    [System.Drawing.Point]::new(590, 606)
  ))

  $chipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $chipPath.AddPolygon(@(
    [System.Drawing.Point]::new(650, 742),
    [System.Drawing.Point]::new(710, 700),
    [System.Drawing.Point]::new(838, 700),
    [System.Drawing.Point]::new(898, 742),
    [System.Drawing.Point]::new(898, 834),
    [System.Drawing.Point]::new(838, 876),
    [System.Drawing.Point]::new(710, 876),
    [System.Drawing.Point]::new(650, 834)
  ))
  $chipBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 12, 23, 39))
  $chipPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 102, 228, 255), 14)
  $graphics.FillPath($chipBrush, $chipPath)
  $graphics.DrawPath($chipPen, $chipPath)
  $graphics.FillEllipse($eyeBrush, 692, 770, 36, 36)
  $chipLinePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 125, 207, 255), 12)
  $chipLinePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $chipLinePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($chipLinePen, 744, 788, 824, 788)

  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output \"Wrote $outputPath\"
}
finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}
