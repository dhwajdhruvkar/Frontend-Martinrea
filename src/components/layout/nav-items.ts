import {
  LayoutDashboard,
  FileText,
  ScanLine,
  FileSearch,
  GitMerge,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Store,
  Search,
  BarChart3,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** True for the pages that exist today; false for "coming soon" placeholders. */
  available: boolean;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Workspace',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, available: true },
      { label: 'Invoice Processing', to: '/invoices', icon: FileText, available: true },
      { label: 'OCR Validation', to: '/ocr', icon: ScanLine, available: false },
      { label: 'Document Viewer', to: '/documents', icon: FileSearch, available: false },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: '2-Way / 3-Way Match', to: '/match', icon: GitMerge, available: false },
      { label: 'Approval Workflow', to: '/approvals', icon: CheckCircle2, available: false },
      { label: 'Exceptions', to: '/exceptions', icon: AlertTriangle, available: false },
      { label: 'Payment Packages', to: '/payments', icon: CreditCard, available: false },
    ],
  },
  {
    heading: 'Insight',
    items: [
      { label: 'Vendor Portal', to: '/vendors', icon: Store, available: false },
      { label: 'Repository Search', to: '/search', icon: Search, available: false },
      { label: 'Analytics', to: '/analytics', icon: BarChart3, available: false },
      { label: 'Audit Logs', to: '/audit', icon: ScrollText, available: false },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Admin Panel', to: '/admin', icon: Settings, available: false },
    ],
  },
];
