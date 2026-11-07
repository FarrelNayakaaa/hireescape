import Link from "next/link";
import type { ReactNode } from "react";
export function ManagerShell({children}:{children:ReactNode}) {return <><header className="he-site-header he-page-width"><Link href="/" className="he-brand">HireEscape</Link><nav aria-label="Manager"><Link href="/manager" className="he-chip">Assessments</Link></nav></header><main id="main-content" tabIndex={-1} className="he-page-width py-12">{children}</main><footer className="he-page-width py-10 he-muted he-small">Fictional candidates only. Evidence supports a human decision.</footer></>;}
