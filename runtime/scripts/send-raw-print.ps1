# Sends a raw byte file to a named Windows printer via winspool.drv.
# Used by windows-spooler.driver.ts instead of a native Node addon, so the
# runtime has zero native build dependencies (no node-gyp / Build Tools).
#
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File send-raw-print.ps1 -PrinterName "Name" -DataFile "path\to\bytes.bin"

param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$DataFile
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
}
"@

function Send-RawBytes {
  param([string]$PrinterName, [byte[]]$Bytes)

  $hPrinter = [IntPtr]::Zero
  if (-not [RawPrinterHelper]::OpenPrinter($PrinterName, [ref]$hPrinter, [IntPtr]::Zero)) {
    throw "OpenPrinter failed for '$PrinterName' (is that the exact Windows printer name?)"
  }

  try {
    $docInfo = New-Object RawPrinterHelper+DOCINFOA
    $docInfo.pDocName = 'PortixOne print job'
    $docInfo.pDataType = 'RAW'

    if (-not [RawPrinterHelper]::StartDocPrinter($hPrinter, 1, $docInfo)) {
      throw 'StartDocPrinter failed'
    }
    try {
      if (-not [RawPrinterHelper]::StartPagePrinter($hPrinter)) {
        throw 'StartPagePrinter failed'
      }
      try {
        $unmanaged = [System.Runtime.InteropServices.Marshal]::AllocCoTaskMem($Bytes.Length)
        try {
          [System.Runtime.InteropServices.Marshal]::Copy($Bytes, 0, $unmanaged, $Bytes.Length)
          $written = 0
          if (-not [RawPrinterHelper]::WritePrinter($hPrinter, $unmanaged, $Bytes.Length, [ref]$written)) {
            throw 'WritePrinter failed'
          }
          if ($written -ne $Bytes.Length) {
            throw "WritePrinter wrote $written of $($Bytes.Length) bytes"
          }
        } finally {
          [System.Runtime.InteropServices.Marshal]::FreeCoTaskMem($unmanaged)
        }
      } finally {
        [RawPrinterHelper]::EndPagePrinter($hPrinter) | Out-Null
      }
    } finally {
      [RawPrinterHelper]::EndDocPrinter($hPrinter) | Out-Null
    }
  } finally {
    [RawPrinterHelper]::ClosePrinter($hPrinter) | Out-Null
  }
}

$bytes = [System.IO.File]::ReadAllBytes($DataFile)
Send-RawBytes -PrinterName $PrinterName -Bytes $bytes
Write-Output 'OK'
