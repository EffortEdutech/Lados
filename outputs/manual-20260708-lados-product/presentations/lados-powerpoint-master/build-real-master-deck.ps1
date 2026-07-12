$ErrorActionPreference = 'Stop'

$outDir = 'C:\Users\user\Documents\00 CIPAA contract work dairy\QS-WFUI\outputs\manual-20260708-lados-product\presentations\lados-product-presentation\output'
$out = Join-Path $outDir 'lados-product-presentation-real-master.pptx'

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function RgbLong([int]$r, [int]$g, [int]$b) {
  return $r + ($g * 256) + ($b * 65536)
}

function P([double]$px) {
  return $px * 0.75
}

$C = @{
  bg     = RgbLong 9 11 16
  panel  = RgbLong 17 24 39
  panel2 = RgbLong 23 32 51
  line   = RgbLong 43 52 72
  text   = RgbLong 244 247 251
  muted  = RgbLong 168 179 199
  dim    = RgbLong 101 112 137
  cyan   = RgbLong 77 216 255
  copper = RgbLong 255 184 107
  green  = RgbLong 110 231 183
  violet = RgbLong 191 167 255
  clear  = RgbLong 0 0 0
}

$msoFalse = 0
$msoTrue = -1
$msoShapeRectangle = 1
$ppLayoutBlank = 12
$ppSaveAsOpenXMLPresentation = 24

function Add-Rect($container, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fill, [int]$line = $null, [double]$lineWeight = 0) {
  $s = $container.Shapes.AddShape($msoShapeRectangle, (P $x), (P $y), (P $w), (P $h))
  $s.Fill.Visible = $msoTrue
  $s.Fill.ForeColor.RGB = $fill
  if ($line -eq $null -or $lineWeight -le 0) {
    $s.Line.Visible = $msoFalse
  } else {
    $s.Line.Visible = $msoTrue
    $s.Line.ForeColor.RGB = $line
    $s.Line.Weight = $lineWeight
  }
  return $s
}

function Add-Text($container, [string]$value, [double]$x, [double]$y, [double]$w, [double]$h, [double]$size, [int]$color, [bool]$bold = $false, [string]$align = 'left', [string]$font = 'Aptos') {
  $s = $container.Shapes.AddTextbox(1, (P $x), (P $y), (P $w), (P $h))
  $tf = $s.TextFrame
  $tf.MarginLeft = 0
  $tf.MarginRight = 0
  $tf.MarginTop = 0
  $tf.MarginBottom = 0
  $r = $tf.TextRange
  $r.Text = $value
  $r.Font.Name = $font
  $r.Font.Size = $size
  $r.Font.Color.RGB = $color
  $r.Font.Bold = if ($bold) { $msoTrue } else { $msoFalse }
  switch ($align) {
    'center' { $r.ParagraphFormat.Alignment = 2 }
    'right' { $r.ParagraphFormat.Alignment = 3 }
    default { $r.ParagraphFormat.Alignment = 1 }
  }
  return $s
}

function Add-Kicker($slide, [string]$label) {
  Add-Rect $slide 64 54 42 3 $C.cyan | Out-Null
  Add-Text $slide $label.ToUpperInvariant() 116 43 360 24 9 $C.muted $true 'left' 'Aptos Mono' | Out-Null
}

function Add-Title($slide, [string]$value, [double]$x = 64, [double]$y = 88, [double]$w = 760, [double]$h = 118, [double]$size = 32) {
  Add-Text $slide $value $x $y $w $h $size $C.text $true 'left' 'Aptos Display' | Out-Null
}

function Add-Box($slide, [double]$x, [double]$y, [double]$w, [double]$h, [string]$label, [string]$body, [int]$accent, [int]$fill = $null) {
  if ($fill -eq $null) { $fill = $C.panel }
  Add-Rect $slide $x $y $w $h $fill $accent 1 | Out-Null
  Add-Rect $slide $x $y 5 $h $accent | Out-Null
  Add-Text $slide $label ($x + 20) ($y + 15) ($w - 36) 24 12 $C.text $true 'left' 'Aptos Display' | Out-Null
  if ($body) {
    Add-Text $slide $body ($x + 20) ($y + 44) ($w - 36) ($h - 54) 9.5 $C.muted $false 'left' 'Aptos' | Out-Null
  }
}

function Add-Page($slide, [int]$n) {
  Add-Text $slide ([string]::Format('{0:d2}', $n)) 1186 670 40 20 8 $C.dim $false 'right' 'Aptos Mono' | Out-Null
}

function Add-LineRect($slide, [double]$x, [double]$y, [double]$w, [double]$h, [int]$color) {
  Add-Rect $slide $x $y $w $h $color | Out-Null
}

$ppt = $null
$pres = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $ppt.Visible = $msoTrue
  $pres = $ppt.Presentations.Add()
  $pres.PageSetup.SlideWidth = P 1280
  $pres.PageSetup.SlideHeight = P 720

  # This is the actual editable master. Change this in View > Slide Master.
  $master = $pres.SlideMaster
  $master.Name = 'Lados Dark Master'
  $master.Background.Fill.Visible = $msoTrue
  $master.Background.Fill.ForeColor.RGB = $C.bg
  Add-Rect $master 0 0 1280 720 $C.bg | Out-Null
  Add-Rect $master 64 680 760 1 $C.line | Out-Null
  Add-Text $master 'Source: project docs, Graphify findings, and inspected repo structure' 66 684 760 14 7.5 $C.dim $false 'left' 'Aptos' | Out-Null

  # Keep the default blank layout, but name it so it is obvious in Master View.
  $blankLayout = $master.CustomLayouts.Item($master.CustomLayouts.Count)
  $blankLayout.Name = 'Lados Content Layout'

  $slide = $pres.Slides.Add(1, $ppLayoutBlank)
  Add-Kicker $slide 'Product Presentation'
  Add-Title $slide 'Lados is the operating layer for governed business workflows.' 64 112 790 150 39
  Add-Text $slide 'A pack-based platform where workflows, humans, AI, resources, and audit trails execute through one shared engine.' 68 285 650 72 16.5 $C.muted | Out-Null
  Add-Rect $slide 820 96 330 330 $C.panel $C.line 1 | Out-Null
  Add-Rect $slide 867 143 236 236 $C.panel2 $C.cyan 2 | Out-Null
  Add-Rect $slide 914 190 142 142 (RgbLong 21 35 56) $C.copper 2 | Out-Null
  Add-Rect $slide 955 231 60 60 $C.cyan | Out-Null
  Add-Text $slide 'LADOS' 884 432 210 34 21 $C.text $true 'center' 'Aptos Display' | Out-Null
  Add-Text $slide 'Universal workflow engine' 832 468 316 22 10.5 $C.muted $false 'center' 'Aptos Mono' | Out-Null
  @(@('21+', 'official capability packs', $C.cyan), @('5/5', 'Phase 22 sprints complete', $C.green), @('1', 'engine for every domain', $C.cyan)) | ForEach-Object -Begin { $i = 0 } -Process {
    $x = 68 + ($i * 218)
    Add-Text $slide $_[0] $x 500 180 46 27 $_[2] $true 'left' 'Aptos Display' | Out-Null
    Add-Text $slide $_[1] $x 548 178 34 9.75 $C.muted | Out-Null
    $i++
  }
  Add-Text $slide 'Built from project documentation and Graphify code navigation; no unverified logo or screenshot assets used.' 66 620 740 24 9 $C.dim | Out-Null
  Add-Page $slide 1

  $slide = $pres.Slides.Add(2, $ppLayoutBlank)
  Add-Kicker $slide 'System Model'
  Add-Title $slide 'The platform separates workflow logic from industry capability.' 64 88 790 118 31.5
  $layers = @(
    @('Experience layer', 'Next.js app: canvas, approvals, resources, marketplace, operations dashboard', $C.violet),
    @('API orchestration', 'NestJS modules: workflow, execution, approvals, pack registry, analytics, retention', $C.cyan),
    @('Execution core', 'Runner, queue fallback, port-aware input resolution, state, event, audit, security', $C.green),
    @('Capability packs', 'Official L0/L1/L2 packs: foundation, human work, document, finance, QS, procurement, asset, payroll', $C.copper),
    @('Data foundation', 'Supabase resources, workflow versions, runs, tasks, rollups, storage, knowledge/catalogue data', $C.muted)
  )
  for ($i = 0; $i -lt $layers.Count; $i++) {
    Add-Box $slide (95 + $i * 18) (210 + $i * 72) (770 - $i * 36) 60 $layers[$i][0] $layers[$i][1] $layers[$i][2] $(if ($i % 2) { RgbLong 14 22 37 } else { $C.panel })
  }
  Add-Rect $slide 900 220 280 238 (RgbLong 14 20 33) $C.line 1 | Out-Null
  Add-Text $slide 'Why it matters' 928 248 210 28 16.5 $C.text $true 'left' 'Aptos Display' | Out-Null
  Add-Text $slide 'A construction workflow, a procurement workflow, and a payroll workflow all inherit the same execution, audit, approval, resource, and retention mechanics.' 928 296 220 100 11.25 $C.muted | Out-Null
  Add-Rect $slide 926 405 226 42 (RgbLong 18 32 52) $C.cyan 1 | Out-Null
  Add-Text $slide 'Foundation first; domain packs second.' 944 418 190 16 9.75 $C.cyan $true 'center' | Out-Null
  Add-Page $slide 2

  $slide = $pres.Slides.Add(3, $ppLayoutBlank)
  Add-Kicker $slide 'Pack Ecosystem'
  Add-Title $slide 'Packs turn domain expertise into installable execution capability.' 64 88 830 92 28.5
  Add-Rect $slide 540 305 200 110 (RgbLong 18 32 52) $C.cyan 2 | Out-Null
  Add-Text $slide "Lados`nEngine" 575 330 130 54 22.5 $C.text $true 'center' 'Aptos Display' | Out-Null
  $packs = @(
    @('Workflow foundation', 250, 205, $C.cyan), @('Human work', 520, 185, $C.green), @('Document intelligence', 790, 205, $C.violet),
    @('Procurement', 210, 380, $C.copper), @('QS commercial', 500, 495, $C.copper), @('Asset & fleet', 805, 380, $C.green)
  )
  foreach ($pack in $packs) {
    $label = $pack[0]; $x = [double]$pack[1]; $y = [double]$pack[2]; $color = [int]$pack[3]
    Add-Rect $slide $x $y 190 64 (RgbLong 15 23 39) $color 1 | Out-Null
    Add-Text $slide $label ($x + 14) ($y + 17) 162 28 12 $C.text $true 'center' | Out-Null
    if (($x + 190) -le 540) { Add-LineRect $slide ($x + 190) ($y + 31) 110 2 $color }
    elseif ($x -ge 740) { Add-LineRect $slide 740 ($y + 31) ($x - 740) 2 $color }
    else { Add-LineRect $slide ($x + 95) ($y + 64) 2 56 $color }
  }
  Add-Text $slide 'Capability packs are not just palette items. They define manifests, nodes, ports, events, config fields, and runtime executors that the engine can govern.' 140 600 1000 40 14.25 $C.muted $false 'center' | Out-Null
  Add-Page $slide 3

  $slide = $pres.Slides.Add(4, $ppLayoutBlank)
  Add-Kicker $slide 'Execution Path'
  Add-Title $slide 'Every run follows one auditable path from trigger to outcome.' 64 88 780 118 31.5
  $steps = @(
    @('Trigger', "manual, schedule,`nwebhook, event", $C.violet), @('Resolve', "bindings, inputs,`npack executors", $C.cyan), @('Execute', "port-aware`nnode runner", $C.green),
    @('Pause', "approval or`nrequest_input", $C.copper), @('Record', "logs, events,`naudit, rollups", $C.cyan), @('Outcome', "resource update`nor artifact", $C.green)
  )
  for ($i = 0; $i -lt $steps.Count; $i++) {
    $x = 70 + ($i * 195); $accent = $steps[$i][2]
    Add-Rect $slide $x 268 150 150 (RgbLong 16 24 39) $accent 1 | Out-Null
    Add-Text $slide ([string]::Format('{0:d2}', $i + 1)) ($x + 16) 296 42 24 11.25 $accent $true 'left' 'Aptos Mono' | Out-Null
    Add-Text $slide $steps[$i][0] ($x + 16) 327 118 29 16.5 $C.text $true 'left' 'Aptos Display' | Out-Null
    Add-Text $slide $steps[$i][1] ($x + 16) 365 118 32 8.25 $C.muted | Out-Null
    if ($i -lt 5) { Add-LineRect $slide ($x + 150) 338 45 3 $C.line }
  }
  Add-Rect $slide 220 470 840 76 (RgbLong 14 20 33) $C.line 1 | Out-Null
  Add-Text $slide 'The queue can fall back to in-process execution, while the watchdog, analytics, and retention services keep operational state visible after the run starts.' 250 493 780 28 13.5 $C.muted $false 'center' | Out-Null
  Add-Page $slide 4

  $slide = $pres.Slides.Add(5, $ppLayoutBlank)
  Add-Kicker $slide 'Human Governance'
  Add-Title $slide 'Human input is a workflow primitive, not a side channel.' 64 88 760 118 31.5
  Add-Box $slide 95 245 260 120 'request_approval' 'A human decision gates commercial facts. AI remains advisory.' $C.copper
  Add-Box $slide 510 245 260 120 'request_input' 'Structured data can be inserted or corrected mid-run with an auditable task.' $C.green
  Add-Box $slide 925 245 260 120 'delegation / escalation' 'Named users, role inboxes, admin override, watchdog escalation.' $C.cyan
  Add-LineRect $slide 355 302 155 3 $C.line
  Add-LineRect $slide 770 302 155 3 $C.line
  Add-Rect $slide 226 420 828 82 (RgbLong 13 21 36) $C.violet 1 | Out-Null
  Add-Text $slide 'One task table, two task types' 312 441 270 24 16.5 $C.text $true 'center' 'Aptos Display' | Out-Null
  Add-Text $slide 'approval_tasks now carries approval and input lifecycles: pending -> resolved, with assignment, delegation, escalation, audit log, and resume.' 595 438 390 40 11.25 $C.muted | Out-Null
  Add-Page $slide 5

  $slide = $pres.Slides.Add(6, $ppLayoutBlank)
  Add-Kicker $slide 'Resource Model'
  Add-Title $slide 'Workspace Resources anchor workflows to real business objects.' 64 88 780 118 31.5
  $res = @('Job','Invoice','Vehicle','BOQ','Claim','Variation','Defect','Task')
  for ($i = 0; $i -lt $res.Count; $i++) {
    $x = 100 + (($i % 4) * 135); $y = 245 + ([math]::Floor($i / 4) * 78)
    Add-Rect $slide $x $y 108 48 $C.panel $C.copper 1 | Out-Null
    Add-Text $slide $res[$i] ($x + 10) ($y + 14) 88 20 11.25 $C.text $true 'center' | Out-Null
  }
  Add-Text $slide 'Workspace Resources' 165 210 320 26 16.5 $C.copper $true 'center' 'Aptos Display' | Out-Null
  Add-Rect $slide 650 215 230 170 (RgbLong 15 23 39) $C.cyan 2 | Out-Null
  Add-Text $slide 'Resource Binding' 685 244 160 28 16.5 $C.text $true 'center' 'Aptos Display' | Out-Null
  Add-Text $slide "field key`nresource id`nresolved at run time" 692 292 150 68 9 $C.muted $false 'center' 'Aptos Mono' | Out-Null
  Add-LineRect $slide 575 303 75 3 $C.line
  Add-LineRect $slide 880 303 80 3 $C.line
  Add-Rect $slide 960 240 220 120 (RgbLong 18 32 52) $C.green 1 | Out-Null
  Add-Text $slide 'Execution context' 990 264 160 24 15 $C.text $true 'center' 'Aptos Display' | Out-Null
  Add-Text $slide 'Nodes receive validated business objects instead of loose IDs.' 990 302 160 42 10.5 $C.muted $false 'center' | Out-Null
  Add-Text $slide 'This is the difference between automation that moves text around and automation that safely touches the actual business record.' 210 505 860 50 16.5 $C.muted $false 'center' | Out-Null
  Add-Page $slide 6

  $slide = $pres.Slides.Add(7, $ppLayoutBlank)
  Add-Kicker $slide 'Maturity'
  Add-Title $slide 'Phase 21/22 moved Lados from prototype to enterprise foundation.' 64 88 850 118 31.5
  $stages = @(
    @('Prototype freeze','Archived old packs; official assets become the product line.', $C.dim),
    @('Official runtime','Manifest loader, validator, real executors, node registry.', $C.cyan),
    @('Engine hardening','Queue fallback, watchdog, SSE node status, publish regression tests.', $C.green),
    @('Enterprise foundation','Departments, idempotency, HITL upgrade, analytics, branching.', $C.copper),
    @('Retention live','Export-before-disposal archival service with audit summaries.', $C.violet)
  )
  Add-LineRect $slide 130 350 1010 4 $C.line
  for ($i = 0; $i -lt $stages.Count; $i++) {
    $x = 120 + ($i * 245); $accent = $stages[$i][2]
    Add-Rect $slide $x 324 56 56 $accent | Out-Null
    Add-Text $slide ([string]($i + 1)) $x 337 56 24 16.5 $C.bg $true 'center' 'Aptos Display' | Out-Null
    Add-Text $slide $stages[$i][0] ($x - 45) 410 150 36 13.5 $C.text $true 'center' 'Aptos Display' | Out-Null
    Add-Text $slide $stages[$i][1] ($x - 64) 455 188 80 9.75 $C.muted $false 'center' | Out-Null
  }
  Add-Text $slide 'Current standing: Phase 22 handover notes mark S22.1-S22.5 complete/live; remaining items are productization and operational launch readiness.' 160 590 960 40 14.25 $C.green $false 'center' | Out-Null
  Add-Page $slide 7

  $slide = $pres.Slides.Add(8, $ppLayoutBlank)
  Add-Kicker $slide 'Commercial Logic'
  Add-Title $slide 'The engine compounds value through efficiency, quality, and expansion.' 64 88 830 118 31.5
  $nodes = @(
    @('Workflow templates',130,250,$C.cyan), @('Faster implementation',420,230,$C.green), @('More trusted runs',730,250,$C.copper),
    @('Marketplace packs',730,445,$C.violet), @('Reusable evidence',420,528,$C.green), @('Lower delivery cost',130,445,$C.copper)
  )
  foreach ($node in $nodes) {
    Add-Rect $slide $node[1] $node[2] 190 72 (RgbLong 16 24 39) $node[3] 1 | Out-Null
    Add-Text $slide $node[0] ($node[1] + 18) ($node[2] + 20) 154 28 13.5 $C.text $true 'center' 'Aptos Display' | Out-Null
  }
  foreach ($l in @(@(320,286,420,286),@(610,266,730,286),@(825,322,825,445),@(730,546,610,546),@(225,445,225,322),@(320,481,420,481))) {
    if ($l[0] -eq $l[2]) { Add-LineRect $slide $l[0] ([math]::Min($l[1],$l[3])) 3 ([math]::Abs($l[3]-$l[1])) (RgbLong 57 69 95) }
    else { Add-LineRect $slide ([math]::Min($l[0],$l[2])) $l[1] ([math]::Abs($l[2]-$l[0])) 3 (RgbLong 57 69 95) }
  }
  Add-Rect $slide 505 324 270 92 (RgbLong 18 32 52) $C.cyan 2 | Out-Null
  Add-Text $slide 'Expansion loop' 552 348 176 26 18 $C.text $true 'center' 'Aptos Display' | Out-Null
  Add-Text $slide "more packs -> more workflows -> more`ngoverned outcomes" 530 384 220 24 9 $C.muted $false 'center' 'Aptos Mono' | Out-Null
  Add-Page $slide 8

  $slide = $pres.Slides.Add(9, $ppLayoutBlank)
  Add-Kicker $slide 'Readiness'
  Add-Title $slide 'Lados is foundation-ready; launch readiness now depends on operational gates.' 64 88 880 118 31.5
  Add-Rect $slide 118 224 1044 330 (RgbLong 13 20 34) $C.line 1 | Out-Null
  $rows = @(
    @('Official packs','runtime packs built and validated','LIVE',$C.green), @('Enterprise foundation','departments, analytics, HITL, branching, retention','LIVE',$C.green),
    @('Queue infrastructure','fallback works; live Upstash credential verification remains a known watch item','NEXT',$C.copper),
    @('Product templates','first official template set and browser E2E remain the next productization gate','NEXT',$C.copper),
    @('Production launch','staging, observability, load/chaos drills, go-live runbook','NEXT',$C.copper)
  )
  for ($i = 0; $i -lt $rows.Count; $i++) {
    $y = 246 + ($i * 58)
    if ($i -gt 0) { Add-LineRect $slide 142 ($y - 12) 996 1 $C.line }
    Add-Text $slide $rows[$i][0] 154 $y 250 24 13.5 $C.text $true 'left' 'Aptos Display' | Out-Null
    Add-Text $slide $rows[$i][1] 420 $y 560 24 11.25 $C.muted | Out-Null
    Add-Rect $slide 1020 ($y - 2) 86 28 $rows[$i][3] | Out-Null
    Add-Text $slide $rows[$i][2] 1020 ($y + 5) 86 14 8.25 $C.bg $true 'center' 'Aptos Mono' | Out-Null
  }
  Add-Text $slide 'Positioning: strong product foundation, not yet a polished public launch package.' 202 600 876 30 16.5 $C.cyan $true 'center' | Out-Null
  Add-Page $slide 9

  $slide = $pres.Slides.Add(10, $ppLayoutBlank)
  Add-Kicker $slide 'Next Moves'
  Add-Title $slide 'The next product step is packaging the engine into repeatable, sellable workflows.' 64 88 900 118 31.5
  $lanes = @(
    @('Template productization','Ship first official workflow templates with browser E2E: invoice, document review, RFQ, BOQ, progress claim.', $C.cyan),
    @('Marketplace layer','Surface Knowledge Packs and Catalogue Providers without renaming technical data-pack identifiers.', $C.violet),
    @('Operational launch','Staging, observability, Redis verification, queue drills, Sentry, runbook, production smoke tests.', $C.green),
    @('Commercial edition','Contractor/QS workflows become the first proof market, while the engine remains universal.', $C.copper)
  )
  for ($i = 0; $i -lt $lanes.Count; $i++) {
    Add-Box $slide (100 + (($i % 2) * 545)) (220 + ([math]::Floor($i / 2) * 150)) 470 104 $lanes[$i][0] $lanes[$i][1] $lanes[$i][2] (RgbLong 15 23 39)
  }
  Add-Rect $slide 295 558 690 54 (RgbLong 18 32 52) $C.cyan 1 | Out-Null
  Add-Text $slide 'Decision frame: build the launch package around one excellent workflow story, then expand the pack catalogue around proven use.' 325 574 630 22 12.75 $C.text $true 'center' | Out-Null
  Add-Page $slide 10

  if (Test-Path -LiteralPath $out) {
    Remove-Item -LiteralPath $out -Force
  }
  $pres.SaveAs($out, $ppSaveAsOpenXMLPresentation)
} finally {
  if ($pres -ne $null) {
    try { $pres.Close() | Out-Null } catch {}
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null } catch {}
  }
  if ($ppt -ne $null) {
    try { $ppt.Quit() | Out-Null } catch {}
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null } catch {}
  }
}

Write-Output $out
