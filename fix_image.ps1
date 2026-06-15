Add-Type -AssemblyName System.Drawing
$imgPath = "C:\Users\estep\Matrix_app_resilient\web-app\android\app\src\main\res\drawable\ic_stat_lux.png"
$imgOut = "C:\Users\estep\Matrix_app_resilient\web-app\android\app\src\main\res\drawable\ic_stat_lux2.png"
$img = [System.Drawing.Image]::FromFile($imgPath)
$img.Save($imgOut, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Remove-Item $imgPath
Rename-Item $imgOut "ic_stat_lux.png"
