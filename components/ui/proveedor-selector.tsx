'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
  ruc?: string | null;
  telefono?: string | null;
}

interface ProveedorSelectorProps {
  value: string;
  onChange: (proveedor: Proveedor | null) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
}

export function ProveedorSelector({
  value,
  onChange,
  disabled = false,
  error,
  label = 'Proveedor',
}: ProveedorSelectorProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<Proveedor | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load selected proveedor if value is passed
  useEffect(() => {
    if (value && !selected) {
      fetchProveedorById(value);
    } else if (!value && selected) {
      setSelected(null);
      setSearch('');
    }
  }, [value]);

  const fetchProveedorById = async (id: string) => {
    try {
      const res = await fetch('/api/proveedores');
      const data = await res.json();
      if (data.success && data.data) {
        const prov = data.data.find((p: Proveedor) => p.id === id);
        if (prov) {
          setSelected(prov);
          setSearch(`${prov.codigo} - ${prov.nombre}`);
        }
      }
    } catch (err) {
      console.error('Error al cargar proveedor:', err);
    }
  };

  const searchProveedores = useCallback((query: string) => {
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
        const params = new URLSearchParams({ q: query });
        const res = await fetch(`/api/proveedores?${params}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data || []);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Error buscando proveedores:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (!selected) {
      searchProveedores(search);
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, searchProveedores, selected]);

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

  const handleSelect = (proveedor: Proveedor) => {
    setSelected(proveedor);
    setSearch(`${proveedor.codigo} - ${proveedor.nombre}`);
    setShowResults(false);
    setResults([]);
    onChange(proveedor);
  };

  const handleClear = () => {
    setSelected(null);
    setSearch('');
    setResults([]);
    onChange(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setShowResults(true);
    if (!newValue) {
      setSelected(null);
      onChange(null);
    } else if (selected) {
      const selectedLabel = `${selected.codigo} - ${selected.nombre}`;
      if (newValue !== selectedLabel) {
        setSelected(null);
        onChange(null);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Label htmlFor="proveedor-selector">{label}</Label>
      <div className="relative mt-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <Input
          id="proveedor-selector"
          type="text"
          placeholder={disabled ? 'Selección deshabilitada' : 'Buscar por nombre o código...'}
          value={search}
          onChange={handleInputChange}
          onFocus={() => { if (!selected) setShowResults(true); }}
          disabled={disabled}
          error={error}
          className="pl-10 pr-10"
        />

        {loading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : search && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Search results dropdown */}
      {showResults && !selected && search.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading && (
            <div className="px-4 py-3 text-center text-sm text-gray-500">Buscando...</div>
          )}

          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-center text-sm text-gray-500">
              No se encontraron proveedores
            </div>
          )}

          {!loading && results.map((prov) => (
            <div
              key={prov.id}
              onClick={() => handleSelect(prov)}
              className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {prov.codigo} - {prov.nombre}
              </div>
              {prov.ruc && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  RUC: {prov.ruc}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected preview */}
      {selected && (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-900 dark:text-blue-100 font-medium">
              {selected.codigo} - {selected.nombre}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-2 text-blue-400 hover:text-blue-600"
                title="Limpiar selección"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
