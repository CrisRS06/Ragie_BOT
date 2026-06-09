'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  descripcionSIGAF: string | null;
  codigoSIGAF: string | null;
  unidadMedida: string;
  ivaPercent: number | null;
  stockMinimo: number | null;
  marca: string | null;
  stockTotal: number;
  lotesActivos: number;
}

interface ArticuloSelectorProps {
  value: string;
  onChange: (articulo: Articulo | null) => void;
  bodegaId?: string;
  soloConStock?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  placeholder?: string;
  label?: string;
  /**
   * Artículos que ya están en OTRAS líneas del mismo pedido (con su número de
   * línea). Aparecen deshabilitados en el buscador para que no se puedan agregar
   * dos veces: el backend rechaza el pedido entero si un artículo se repite.
   */
  yaSeleccionados?: { id: string; linea: number }[];
}

export function ArticuloSelector({
  value,
  onChange,
  bodegaId,
  soloConStock = false,
  disabled = false,
  required = false,
  error,
  placeholder = 'Buscar por SKU, nombre, codigo SIGAF, marca...',
  label = 'Articulo',
  yaSeleccionados = [],
}: ArticuloSelectorProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<Articulo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar artículo seleccionado si viene un value inicial
  useEffect(() => {
    if (value && !selected) {
      // Buscar el artículo por ID para mostrar su información
      fetchArticuloById(value);
    } else if (!value && selected) {
      setSelected(null);
      setSearch('');
    }
  }, [value]);

  // Limpiar selección cuando cambia bodegaId
  useEffect(() => {
    if (bodegaId !== undefined) {
      // Si cambia la bodega, limpiar la selección actual
      if (selected) {
        setSelected(null);
        setSearch('');
        onChange(null);
      }
    }
  }, [bodegaId]);

  const fetchArticuloById = async (id: string) => {
    try {
      const params = new URLSearchParams();
      if (bodegaId) params.append('bodegaId', bodegaId);

      const res = await fetch(`/api/articulos?${params}`);
      const data = await res.json();

      if (data.success && data.data) {
        const articulo = data.data.find((a: Articulo) => a.id === id);
        if (articulo) {
          setSelected(articulo);
          setSearch(articulo.nombre);
        }
      }
    } catch (err) {
      console.error('Error al cargar articulo:', err);
    }
  };

  // Función de búsqueda con debounce
  const searchArticulos = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setFetchError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams({
          q: query,
          limite: '20',
        });

        if (soloConStock) {
          params.append('soloConStock', 'true');
        }

        if (bodegaId) {
          params.append('bodegaId', bodegaId);
        }

        const res = await fetch(`/api/articulos?${params}`);
        const data = await res.json();

        if (data.success) {
          setResults(data.data || []);
        } else {
          setFetchError(data.error || 'Error al buscar');
          setResults([]);
        }
      } catch (err) {
        console.error('Error buscando articulos:', err);
        setFetchError('Error de conexion');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [bodegaId, soloConStock]);

  useEffect(() => {
    if (!selected) {
      searchArticulos(search);
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, searchArticulos, selected]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // articuloId -> número de línea donde ya está agregado (en otra línea del pedido)
  const bloqueados = new Map(yaSeleccionados.map((x) => [x.id, x.linea]));

  const handleSelect = (articulo: Articulo) => {
    // No permitir agregar un artículo que ya está en otra línea.
    if (bloqueados.has(articulo.id)) return;
    setSelected(articulo);
    setSearch(articulo.nombre);
    setShowResults(false);
    setResults([]);
    onChange(articulo);
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
      // Si el usuario empieza a escribir algo diferente, limpiar selección
      if (newValue !== selected.nombre) {
        setSelected(null);
        onChange(null);
      }
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Label htmlFor="articulo-selector" required={required}>
        {label}
      </Label>
      <div className="relative mt-1">
        {/* Icono de búsqueda */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <Input
          id="articulo-selector"
          type="text"
          placeholder={disabled ? 'Seleccion deshabilitada' : placeholder}
          value={search}
          onChange={handleInputChange}
          onFocus={() => {
            if (!selected) setShowResults(true);
          }}
          disabled={disabled}
          error={error}
          className="pl-10 pr-10"
        />

        {/* Spinner de carga o botón de limpiar */}
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

      {/* Resultados de búsqueda */}
      {showResults && !selected && search.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-72 overflow-auto">
          {loading && (
            <div className="px-4 py-3 text-center text-sm text-gray-500">
              Buscando...
            </div>
          )}

          {!loading && fetchError && (
            <div className="px-4 py-3 text-center text-sm text-red-500">
              {fetchError}
            </div>
          )}

          {!loading && !fetchError && results.length === 0 && (
            <div className="px-4 py-3 text-center text-sm text-gray-500">
              {soloConStock
                ? 'No hay productos con stock disponible'
                : 'No se encontraron articulos'}
            </div>
          )}

          {!loading && results.length > 0 && (
            results.map((articulo) => {
              const lineaBloqueo = bloqueados.get(articulo.id);
              // Ya está en otra línea del pedido: mostrarlo deshabilitado para
              // que el usuario vea que lo tiene (y dónde), pero no lo pueda repetir.
              if (lineaBloqueo !== undefined) {
                return (
                  <div
                    key={articulo.id}
                    aria-disabled="true"
                    title={`Este artículo ya está en la línea #${lineaBloqueo} del pedido`}
                    className="px-4 py-3 cursor-not-allowed opacity-60 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="font-medium text-sm text-gray-500 dark:text-gray-400">
                      {articulo.sku} - {truncateText(articulo.nombre, 40)}
                    </div>
                    <div className="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Ya en el pedido — línea #{lineaBloqueo}
                      </span>
                      {articulo.codigoSIGAF && (
                        <span className="text-gray-400">SIGAF: {articulo.codigoSIGAF}</span>
                      )}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={articulo.id}
                  onClick={() => handleSelect(articulo)}
                  className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {articulo.sku} - {truncateText(articulo.nombre, 40)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          Stock: {articulo.stockTotal} {articulo.unidadMedida}
                        </span>
                        {articulo.codigoSIGAF && (
                          <span>SIGAF: {articulo.codigoSIGAF}</span>
                        )}
                        {articulo.marca && (
                          <span>Marca: {articulo.marca}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Artículo seleccionado - Preview */}
      {selected && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-blue-900 dark:text-blue-100">
                {selected.sku} - {selected.nombre}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <span className="font-semibold">
                  Stock: {selected.stockTotal} {selected.unidadMedida}
                </span>
                {selected.lotesActivos > 0 && (
                  <span>{selected.lotesActivos} lote(s) activo(s)</span>
                )}
                {selected.codigoSIGAF && (
                  <span>SIGAF: {selected.codigoSIGAF}</span>
                )}
              </div>
              {selected.descripcionSIGAF && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {truncateText(selected.descripcionSIGAF, 100)}
                </p>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-2 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200"
                title="Limpiar seleccion"
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
