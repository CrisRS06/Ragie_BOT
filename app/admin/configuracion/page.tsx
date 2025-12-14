'use client';

/**
 * Admin - Configuración del Sistema
 */

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

interface ConfigData {
  diasAlertaVencimiento: number;
  diasAlertaCritico: number;
  permitirStockNegativo: boolean;
  requiereFirmaDigital: boolean;
  formatoFecha: string;
  zonaHoraria: string;
  nombreOrganizacion: string;
  emailNotificaciones: string;
  maxRecepcionesDia: number;
  maxDespachosDia: number;
}

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ConfigData>({
    diasAlertaVencimiento: 30,
    diasAlertaCritico: 7,
    permitirStockNegativo: false,
    requiereFirmaDigital: false,
    formatoFecha: 'es-CR',
    zonaHoraria: 'America/Costa_Rica',
    nombreOrganizacion: 'PANI',
    emailNotificaciones: '',
    maxRecepcionesDia: 100,
    maxDespachosDia: 100,
  });

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const fetchConfiguracion = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/configuracion');
      const data = await response.json();

      if (data.success) {
        setFormData({
          diasAlertaVencimiento: data.data.diasAlertaVencimiento || 30,
          diasAlertaCritico: data.data.diasAlertaCritico || 7,
          permitirStockNegativo: data.data.permitirStockNegativo || false,
          requiereFirmaDigital: data.data.requiereFirmaDigital || false,
          formatoFecha: data.data.formatoFecha || 'es-CR',
          zonaHoraria: data.data.zonaHoraria || 'America/Costa_Rica',
          nombreOrganizacion: data.data.nombreOrganizacion || 'PANI',
          emailNotificaciones: data.data.emailNotificaciones || '',
          maxRecepcionesDia: data.data.maxRecepcionesDia || 100,
          maxDespachosDia: data.data.maxDespachosDia || 100,
        });
      } else {
        setError(data.error || 'Error al cargar configuración');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checkbox.checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const response = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar configuración');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Configuración del Sistema
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Ajuste los parámetros generales del sistema de inventario
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Success */}
          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="ml-3 text-sm text-green-800 dark:text-green-200">
                  Configuración guardada exitosamente
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Organización */}
          <Card className="mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Organización
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombreOrganizacion">Nombre de la Organización</Label>
                <Input
                  id="nombreOrganizacion"
                  name="nombreOrganizacion"
                  value={formData.nombreOrganizacion}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="emailNotificaciones">Email para Notificaciones</Label>
                <Input
                  id="emailNotificaciones"
                  name="emailNotificaciones"
                  type="email"
                  placeholder="notificaciones@ejemplo.com"
                  value={formData.emailNotificaciones}
                  onChange={handleChange}
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Opcional. Se usará para alertas de vencimiento y stock bajo.
                </p>
              </div>
            </div>
          </Card>

          {/* Alertas de Vencimiento */}
          <Card className="mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Alertas de Vencimiento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="diasAlertaVencimiento">Días para Alerta Normal</Label>
                <Input
                  id="diasAlertaVencimiento"
                  name="diasAlertaVencimiento"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.diasAlertaVencimiento}
                  onChange={handleChange}
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Productos próximos a vencer (1-365 días)
                </p>
              </div>
              <div>
                <Label htmlFor="diasAlertaCritico">Días para Alerta Crítica</Label>
                <Input
                  id="diasAlertaCritico"
                  name="diasAlertaCritico"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.diasAlertaCritico}
                  onChange={handleChange}
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Productos con vencimiento crítico (1-30 días)
                </p>
              </div>
            </div>
          </Card>

          {/* Límites Operativos */}
          <Card className="mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Límites Operativos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxRecepcionesDia">Máx. Recepciones por Día</Label>
                <Input
                  id="maxRecepcionesDia"
                  name="maxRecepcionesDia"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.maxRecepcionesDia}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="maxDespachosDia">Máx. Despachos por Día</Label>
                <Input
                  id="maxDespachosDia"
                  name="maxDespachosDia"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.maxDespachosDia}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
            </div>
          </Card>

          {/* Formato y Zona Horaria */}
          <Card className="mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Formato y Localización
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="formatoFecha">Formato de Fecha</Label>
                <Select
                  id="formatoFecha"
                  name="formatoFecha"
                  value={formData.formatoFecha}
                  onChange={handleChange}
                  disabled={saving}
                >
                  <option value="es-CR">Costa Rica (dd/mm/aaaa)</option>
                  <option value="es-ES">España (dd/mm/aaaa)</option>
                  <option value="en-US">Estados Unidos (mm/dd/aaaa)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="zonaHoraria">Zona Horaria</Label>
                <Select
                  id="zonaHoraria"
                  name="zonaHoraria"
                  value={formData.zonaHoraria}
                  onChange={handleChange}
                  disabled={saving}
                >
                  <option value="America/Costa_Rica">Costa Rica (UTC-6)</option>
                  <option value="America/Mexico_City">México Central (UTC-6)</option>
                  <option value="America/Panama">Panamá (UTC-5)</option>
                  <option value="America/Bogota">Colombia (UTC-5)</option>
                </Select>
              </div>
            </div>
          </Card>

          {/* Opciones Avanzadas */}
          <Card className="mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Opciones Avanzadas
            </h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="permitirStockNegativo"
                  name="permitirStockNegativo"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={formData.permitirStockNegativo}
                  onChange={handleChange}
                  disabled={saving}
                />
                <label
                  htmlFor="permitirStockNegativo"
                  className="ml-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  Permitir stock negativo
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">
                Permite despachar más cantidad de la disponible. No recomendado para producción.
              </p>

              <div className="flex items-center mt-4">
                <input
                  id="requiereFirmaDigital"
                  name="requiereFirmaDigital"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={formData.requiereFirmaDigital}
                  onChange={handleChange}
                  disabled={saving}
                />
                <label
                  htmlFor="requiereFirmaDigital"
                  className="ml-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  Requerir firma digital en despachos
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">
                Activa la captura de firma del receptor al momento del despacho.
              </p>
            </div>
          </Card>

          {/* Botón Guardar */}
          <div className="flex justify-end">
            <Button type="submit" isLoading={saving} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
