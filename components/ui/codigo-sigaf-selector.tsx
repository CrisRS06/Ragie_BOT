'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface CodigoSigaf {
  id: string;
  codigo: string;
  descripcion: string;
  partida: string | null;
  precio_unitario: number | null;
}

interface Props {
  value: string;
  onChange: (codigo: string, descripcion?: string) => void;
  disabled?: boolean;
}

export function CodigoSigafSelector({ value, onChange, disabled }: Props) {
  const [search, setSearch] = useState(value || '');
  const [results, setResults] = useState<CodigoSigaf[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<CodigoSigaf | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const searchCodigos = useCallback((query: string) => {
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
        const res = await fetch(`/api/catalogo-sigaf?q=${encodeURIComponent(query)}&limite=10`);
        const data = await res.json();
        setResults(data.items || []);
      } catch (err) {
        console.error('Error buscando codigos SIGAF:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    searchCodigos(search);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, searchCodigos]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: CodigoSigaf) => {
    setSelected(item);
    setSearch(item.codigo);
    setShowResults(false);
    onChange(item.codigo, item.descripcion);
  };

  const handleClear = () => {
    setSelected(null);
    setSearch('');
    onChange('', '');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Label>Codigo SIGAF</Label>
      <div className="relative mt-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Input
          type="text"
          placeholder="Buscar por codigo o descripcion..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowResults(true);
            if (!e.target.value) {
              setSelected(null);
            }
          }}
          onFocus={() => setShowResults(true)}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {search && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Resultados */}
      {showResults && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white">{item.codigo}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.descripcion}</div>
              {item.partida && (
                <div className="text-xs text-gray-400 dark:text-gray-500">Partida: {item.partida}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && showResults && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-2 text-center text-sm text-gray-500">
          Buscando...
        </div>
      )}

      {showResults && !loading && search.length >= 2 && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-2 text-center text-sm text-gray-500">
          No se encontraron resultados
        </div>
      )}

      {/* Codigo seleccionado */}
      {selected && (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm border border-blue-200 dark:border-blue-800">
          <strong className="text-blue-800 dark:text-blue-300">{selected.codigo}</strong>
          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{selected.descripcion}</p>
        </div>
      )}
    </div>
  );
}
