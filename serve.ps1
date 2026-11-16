# Server static pentru ie personal finances.
# Ascultă pe toată rețeaua locală, ca aplicația să meargă și de pe telefon (aceeași rețea Wi-Fi).
# Pornire: powershell -ExecutionPolicy Bypass -File serve.ps1
param([int]$Port = 5173)

$root = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\') + '\'
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.ico' = 'image/x-icon'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$listener.Start()

$ips = @(Get-NetIPConfiguration -ErrorAction SilentlyContinue |
  Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
  ForEach-Object { $_.IPv4Address.IPAddress })
Write-Host "Server pornit."
Write-Host "  Pe calculator: http://localhost:$Port/"
foreach ($ip in $ips) { Write-Host "  Pe telefon (aceeasi retea Wi-Fi): http://${ip}:$Port/" }

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 5000
    $stream = $client.GetStream()
    $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::ASCII, $false, 4096, $true)
    $line = $reader.ReadLine()
    if (-not $line) { continue }
    while ($true) { $h = $reader.ReadLine(); if ($null -eq $h -or $h -eq '') { break } }

    $target = ($line.Split(' ')[1] -split '[?#]')[0]
    $path = [Uri]::UnescapeDataString($target.TrimStart('/'))
    if ($path -eq '') { $path = 'index.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $root $path))

    if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path $full -PathType Leaf)) {
      $body = [IO.File]::ReadAllBytes($full)
      $ct = $types[[IO.Path]::GetExtension($full).ToLower()]
      if (-not $ct) { $ct = 'application/octet-stream' }
      $status = '200 OK'
    } else {
      $body = [Text.Encoding]::UTF8.GetBytes('Not found')
      $ct = 'text/plain; charset=utf-8'
      $status = '404 Not Found'
    }
    $head = "HTTP/1.1 $status`r`nContent-Type: $ct`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
    $hb = [Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    $stream.Write($body, 0, $body.Length)
    $stream.Flush()
  } catch {
  } finally {
    $client.Close()
  }
}
