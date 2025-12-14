'use client';

/**
 * Navbar Global - Navegación principal del sistema
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  TrendingDown,
  ClipboardList,
  FileText,
  AlertCircle,
  Boxes,
  Menu,
  X,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Recepciones',
    href: '/recepciones',
    icon: Package,
  },
  {
    name: 'Despachos',
    href: '/despachos',
    icon: TrendingDown,
  },
  {
    name: 'Inventario',
    href: '/inventario',
    icon: Boxes,
  },
  {
    name: 'Cortes',
    href: '/cortes',
    icon: ClipboardList,
  },
  {
    name: 'Reportes',
    href: '/reportes',
    icon: FileText,
  },
  {
    name: 'Auditoría',
    href: '/auditoria',
    icon: AlertCircle,
  },
  {
    name: 'Admin',
    href: '/admin/articulos',
    icon: Settings,
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y nombre */}
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 hover:opacity-80 transition"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PEPS</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Sistema de Inventario
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">PANI Costa Rica</div>
              </div>
            </Link>
          </div>

          {/* Navegación Desktop */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href.split('/').slice(0, 2).join('/') + '/');

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Usuario y Tema */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Administrador
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">admin@pani.go.cr</div>
            </div>

            {/* Botón menú mobile */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Abrir menú principal</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href.split('/').slice(0, 2).join('/') + '/');

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Usuario en mobile */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="px-5">
              <div className="text-base font-medium text-gray-900">
                Administrador
              </div>
              <div className="text-sm text-gray-500">admin@pani.go.cr</div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
