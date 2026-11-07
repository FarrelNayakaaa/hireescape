export function ReportPrintStyles(){return <style>{`
@page { size: A4; margin: 11mm; }
@media print {
 html, body, [data-he-application], .he-application, .he-shell { background: white !important; color: black !important; color-scheme: light !important; }
 .he-shell-tools, .skip-link, .he-theme-toolbar, .he-theme-selector, .he-toast-viewport, .he-skip-link, .he-viewport-blocker { display: none !important; }
 .he-report { --he-bg: white; --he-surface: white; --he-surface-2: white; --he-text: black; --he-muted: black; --he-border: black; color: black !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; font-family: Arial, sans-serif !important; font-size: 9pt !important; line-height: 1.25 !important; }
 .he-report [data-print-hide], .he-report button, .he-report header a { display: none !important; }
 .he-report main { display: block !important; }
 .he-report section, .he-report header, .he-report footer { margin: 0 0 4mm !important; padding-top: 0 !important; padding-bottom: 3mm !important; }
 .he-report h1 { font-size: 17pt !important; line-height: 1.2 !important; margin: 0 0 2mm !important; }
 .he-report h2 { font-size: 12pt !important; line-height: 1.2 !important; }
 .he-report h3 { font-size: 10pt !important; }
 .he-report p { margin-top: 1mm !important; margin-bottom: 1mm !important; }
 .he-report .he-card { box-shadow: none !important; background: white !important; color: black !important; padding: 2mm !important; break-inside: avoid; margin-top: 2mm !important; }
 .he-report .he-card-bar { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
 .he-report .he-chip { color: black !important; background: none !important; border: none !important; padding: 0 !important; box-shadow: none !important; font-size: 8pt !important; }
 .he-report [data-evidence] button { display: inline !important; }
 .he-report .he-number-badge { width: 7mm; height: 7mm; font-size: 9pt; }
 .he-report [data-report-objective] { display: grid !important; grid-template-columns: repeat(4,1fr) !important; gap: 2mm !important; }
 .he-report [data-report-competency] { display: grid !important; grid-template-columns: repeat(4,1fr) !important; gap: 2mm !important; }
 .he-report [data-report-claims] { display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 3mm !important; }
 .he-report [data-report-claims] > p { grid-column: 1 / -1; }
 .he-report [data-report-claims] section { break-inside: avoid; }
 .he-report [data-report-claims] svg, .he-report .he-agent-avatar { display: none !important; }
 .he-report textarea { width: 100%; min-height: 14mm; height: auto; border: 1px solid black; background: white !important; color: black !important; }
 .he-report footer { font-size: 8pt !important; }
}
`}</style>;}
