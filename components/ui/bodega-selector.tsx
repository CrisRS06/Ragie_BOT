'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface Bodega {
  id: string;
  codigo: string;
  nombre: string;
}

interface BodegaSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  name?: string;
}

export function BodegaSelector({
  value,
  onChange,
  disabled,
  required,
  error,
  label = 'Bodega',
  name = 'bodegaId',
}: BodegaSelectorProps) {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bodegas')
      .then(res => res.json())
      .then(data => {
        if (data.bodegas) {
          setBodegas(data.bodegas);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Label htmlFor={name} required={required}>{label}</Label>
      <Select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        error={error}
        className="mt-1"
      >
        <option value="">
          {loading ? 'Cargando bodegas...' : 'Seleccione bodega'}
        </option>
        {bodegas.map((bodega) => (
          <option key={bodega.id} value={bodega.id}>
            {bodega.codigo} - {bodega.nombre}
          </option>
        ))}
      </Select>
    </div>
  );
}
