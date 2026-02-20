# Cotizador Inventu Agro

Sistema web para cotización de piezas y cuchillas con cálculo automático de costos, gestión de historial y exportación a PDF/Excel.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Tech](https://img.shields.io/badge/React-18-61dafb)
![Tech](https://img.shields.io/badge/TypeScript-5-3178c6)
![Tech](https://img.shields.io/badge/Vite-7-646cff)

## 🚀 Características

### Nueva Cotización
- 📏 Ingreso de dimensiones en mm (largo, ancho, espesor)
- ⚖️ Cálculo automático de peso basado en material
- 🔧 Selección de material (Acero 1045, Acero 15B30)
- 🔢 Especificación de cantidad
- ⚙️ Selección de operaciones (internas y tercerizadas)
- 💰 Cálculo automático de costos
- ✏️ Modificación manual de precio final
- 📄 Exportación directa a PDF
- 📊 Exportación a Excel con desglose detallado

### Historial de Cotizaciones
- 📋 Lista completa de cotizaciones guardadas
- 🔍 Búsqueda por ID o material
- 🏷️ Filtros por estado (Pendiente/Ganada/Perdida)
- 👁️ Vista detallada de cada cotización
- ✅ Marcar como ganada/perdida con motivo
- 📤 Exportación desde el historial

### Diseño
- 🎨 Interfaz moderna y profesional
- 📱 Totalmente responsive (Desktop, Tablet, Móvil)
- 🌙 Paleta de colores profesional
- ✨ Animaciones suaves
- 🖼️ Tipografía Google Fonts (Inter)

## 📦 Instalación

```bash
# Ya está instalado! Solo necesitas iniciar el servidor
npm run dev
```

La aplicación estará disponible en: **http://localhost:5173/**

## 🛠️ Tecnologías

- **React 18** - Framework UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool ultra-rápido
- **jsPDF** - Generación de PDF
- **xlsx** - Generación de Excel
- **date-fns** - Manejo de fechas
- **Lucide React** - Iconos modernos

## 💾 Almacenamiento

Actualmente usa **localStorage** para simplicidad:
- ✅ Sin necesidad de servidor
- ✅ Datos persisten en el navegador
- ⚠️ Solo disponible en el dispositivo actual

### Migración futura a Supabase

El código está preparado para migrar fácilmente:
1. Crear proyecto en Supabase
2. Configurar tablas según `src/types/index.ts`
3. Reemplazar funciones en `src/services/storage.ts`
4. Los componentes UI no requieren cambios

## 📖 Uso

### Crear Cotización

1. Ingresar las **dimensiones** de la pieza en mm
2. Seleccionar el **material** (Acero 1045 o 15B30)
3. Especificar la **cantidad** de piezas
4. Marcar las **operaciones** necesarias:
   - Internas (Inventu Lab): Corte, Plegado, Soldado, Pintura, Mecanizado
   - Tercerizadas: Tratamiento Térmico
5. Revisar el **cálculo automático** de costos
6. (Opcional) Modificar el **precio final**
7. Agregar **notas** si es necesario
8. **Guardar** o **exportar** directamente

### Ver Historial

1. Click en tab **"Historial"**
2. Usar **búsqueda** para encontrar cotizaciones
3. Filtrar por **estado** (Todas/Pendientes/Ganadas/Perdidas)
4. Click en 👁️ para ver **detalle completo**
5. Marcar estado y agregar **motivo**
6. **Exportar** PDF o Excel

## 💵 Costos Configurados

### Materiales
- **Acero 1045**: $1.70/kg
- **Acero 15B30**: $3.00/kg

### Operaciones Internas (Inventu Lab)
- Corte: $1.00/pza
- Plegado: $0.80/pza
- Soldado: $1.50/pza
- Pintura: $0.50/pza
- Mecanizado de filo: $1.00/pza

### Operaciones Tercerizadas
- Tratamiento Térmico: $1.50/kg

> 💡 Para modificar precios, editar `src/config/constants.ts`

## 📁 Estructura

```
src/
├── types/              # Interfaces TypeScript
├── config/             # Configuración (materiales, operaciones)
├── services/           # Lógica de negocio
│   ├── calculations.ts # Cálculos de peso y costos
│   ├── storage.ts      # Persistencia (localStorage)
│   └── export.ts       # Exportación PDF/Excel
├── components/         # Componentes React
│   ├── QuotationForm.tsx
│   ├── QuotationList.tsx
│   └── QuotationDetail.tsx
├── App.tsx            # Componente principal
├── main.tsx           # Entry point
└── index.css          # Estilos globales
```

## 🔄 Scripts

```bash
# Desarrollo (ya corriendo)
npm run dev

# Build para producción
npm run build

# Preview producción
npm run preview

# Linter
npm run lint
```

## 📱 App Móvil (Futuro)

Para convertir a app nativa:
- **PWA**: Agregar service worker y manifest
- **React Native**: Reutilizar lógica, UI nativa

## 🎯 Próximos Pasos

- [ ] Migrar a Supabase para multi-dispositivo
- [ ] Agregar gestión de clientes
- [ ] Templates de configuraciones frecuentes
- [ ] Analytics de conversión
- [ ] Autenticación de usuarios
- [ ] App móvil nativa

## 📄 Licencia

Proyecto privado - Inventu Agro

---

**Desarrollado con ❤️ para Inventu Agro**
