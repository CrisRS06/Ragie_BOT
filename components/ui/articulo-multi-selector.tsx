'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
}

interface ArticuloMultiSelectorProps {
  values: string[];
  onChange: (articulos: Articulo[]) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
}

export function ArticuloMultiSelector({
  values,
  onChange,
  disabled = false,
  error,
  label = 'Artículos',
}: ArticuloMultiSelectorProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedArticulos, setSelectedArticulos] = useState<Articulo[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial selected articles from values
  useEffect(() => {
    if (values.length > 0 && selectedArticulos.length === 0) {
      fetchArticulosByIds(values);
    } else if (values.length === 0 && selectedArticulos.length > 0) {
      setSelectedArticulos([]);
    }
  }, [values]);

  const fetchArticulosByIds = async (ids: string[]) => {
    try {
      const res = await fetch('/api/articulos');
      const data = await res.json();
      if (data.success && data.data) {
        const found = data.data.filter((a: Articulo) => ids.includes(a.id));
        setSelectedArticulos(found);
      }
    } catch (err) {
      console.error('Error al cargar artículos:', err);
    }
  };

  const searchArticulos = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query, limite: '20' });
        const res = await fetch(`/api/articulos?${params}`);
        const data = await res.json();
        if (data.success) {
          // Filter out already selected
          const selectedIds = new Set(selectedArticulos.map(a => a.id));
          setResults((data.data || []).filter((a: Articulo) => !selectedIds.has(a.id)));
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Error buscando artículos:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [selectedArticulos]);

  useEffect(() => {
    searchArticulos(search);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, searchArticulos]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (articulo: Articulo) => {
    const updated = [...selectedArticulos, articulo];
    setSelectedArticulos(updated);
    onChange(updated);
    setSearch('');
    setResults([]);
    setShowResults(false);
  };

  const handleRemove = (id: string) => {
    const updated = selectedArticulos.filter(a => a.id !== id);
    setSelectedArticulos(updated);
    onChange(updated);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Label htmlFor="articulo-multi-selector">{label}</Label>

      {/* Selected chips */}
      {selectedArticulos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 mb-2">
          {selectedArticulos.map((art) => (
            <span
              key={art.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {art.sku} - {art.nombre.length > 30 ? art.nombre.substring(0, 30) + '...' : art.nombre}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(art.id)}
                  className="ml-0.5 hover:text-blue-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative mt-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Input
          id="articulo-multi-selector"
          type="text"
          placeholder={disabled ? 'Deshabilitado' : 'Buscar artículos por SKU o nombre...'}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          disabled={disabled}
          error={error}
          className="pl-10"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && search.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading && (
            <div className="px-4 py-3 text-center text-sm text-gray-500">Buscando...</div>
          )}

          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-center text-sm text-gray-500">
              No se encontraron artículos
            </div>
          )}

          {!loading && results.map((art) => (
            <div
              key={art.id}
              onClick={() => handleSelect(art)}
              className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {art.sku} - {art.nombre}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {art.unidadMedida}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
