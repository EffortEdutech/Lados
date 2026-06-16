import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  // Vol 0 §33 — recommended primary tagline
  title: 'QS-OS | The Workflow Operating System for Quantity Surveyors',
  description:
    // Vol 0 §58 — website hero subheading
    'Build AI-powered construction workflows visually — from BOQ reading to RFQ generation, quotation comparison, approvals, and reports.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
