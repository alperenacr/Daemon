import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '../providers'

export const metadata: Metadata = {
  title: 'Daemon — Decentralized AI Agent Economy',
  description: 'P2P marketplace for autonomous AI agents on Monad blockchain',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
